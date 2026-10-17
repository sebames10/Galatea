import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PoolClient } from 'pg';
import { CARGOS_POR_SECTOR } from '../auth/cargos';
import { UsuarioSesion } from '../auth/decoradores';
import { Db } from '../database/db.service';
import { ArchivoSubido, StorageService } from '../storage/storage.service';
import {
  CategoriaMenuDto,
  CrearProductoDto,
  EditarCategoriaMenuDto,
  EditarPresentacionDto,
  EditarProductoDto,
  FiltroMenuDto,
  PresentacionDto,
} from './menu.dto';

type Sector = 'cocina' | 'barra';

// Un producto con sus presentaciones y etiquetas, como lo consume el frontend.
// "agotado": ninguna presentación disponible ("Agotado por hoy").
const PRODUCTO_JSON = `
  json_build_object(
    'id', p.idProducto,
    'idCategoriaMenu', p.idCategoriaMenu,
    'nombre', p.nombre,
    'descripcion', p.descripcion,
    'foto', p.foto,
    'activo', p.activo,
    'agotado', NOT EXISTS (SELECT 1 FROM Presentacion x WHERE x.idProducto = p.idProducto AND x.disponible),
    'etiquetas', COALESCE((SELECT json_agg(e.nombre ORDER BY e.nombre)
                             FROM ProductoEtiqueta pe JOIN Etiqueta e ON e.idEtiqueta = pe.idEtiqueta
                            WHERE pe.idProducto = p.idProducto), '[]'::json),
    'presentaciones', (SELECT json_agg(json_build_object(
                                 'id', pr.idPresentacion, 'nombre', pr.nombre, 'precio', pr.precio,
                                 'orden', pr.orden, 'disponible', pr.disponible)
                               ORDER BY pr.orden, pr.idPresentacion)
                         FROM Presentacion pr WHERE pr.idProducto = p.idProducto)
  )`;

@Injectable()
export class MenuService {
  constructor(
    private readonly db: Db,
    private readonly storage: StorageService,
  ) {}

  // ------------------------------------------------------------------
  // Carta
  // ------------------------------------------------------------------

  /** La carta agrupada por categoría, en el orden de la carta. Solo lo activo. */
  async carta(filtro: FiltroMenuDto) {
    return this.db.query(
      `SELECT c.idCategoriaMenu AS id, c.nombre, c.sector, c.orden,
              COALESCE(json_agg(${PRODUCTO_JSON} ORDER BY p.idProducto) FILTER (WHERE p.idProducto IS NOT NULL), '[]'::json) AS productos
         FROM CategoriaMenu c
         LEFT JOIN Producto p ON p.idCategoriaMenu = c.idCategoriaMenu AND p.activo
              AND ($2::text IS NULL OR EXISTS (
                    SELECT 1 FROM ProductoEtiqueta pe JOIN Etiqueta e ON e.idEtiqueta = pe.idEtiqueta
                     WHERE pe.idProducto = p.idProducto AND lower(e.nombre) = lower($2)))
        WHERE c.activa AND ($1::text IS NULL OR c.sector = $1)
        GROUP BY c.idCategoriaMenu
        ORDER BY c.orden, c.idCategoriaMenu`,
      [filtro.sector ?? null, filtro.etiqueta ?? null],
    );
  }

  async producto(idProducto: number) {
    const fila = await this.db.uno(`SELECT ${PRODUCTO_JSON} AS producto FROM Producto p WHERE p.idProducto = $1`, [idProducto]);
    if (!fila) throw new NotFoundException('No existe ese producto.');
    return fila.producto;
  }

  // ------------------------------------------------------------------
  // Productos (Cocinero/Bartender según el sector, o Administrador)
  // ------------------------------------------------------------------

  async crearProducto(dto: CrearProductoDto, usuario: UsuarioSesion) {
    const sector = await this.sectorDeCategoria(dto.idCategoriaMenu);
    this.verificarSector(usuario, sector, 'crear productos');
    this.verificarNombresPresentaciones(dto.presentaciones);

    const id = await this.db.transaccion(async (tx) => {
      const { rows } = await tx.query(
        `INSERT INTO Producto (idCategoriaMenu, idCreador, nombre, descripcion)
         VALUES ($1, $2, $3, $4) RETURNING idProducto AS id`,
        [dto.idCategoriaMenu, usuario.idUsuarioInterno, dto.nombre.trim(), dto.descripcion?.trim() || null],
      );
      const idProducto: number = rows[0].id;
      for (const [i, pr] of dto.presentaciones.entries()) {
        await this.insertarPresentacion(tx, idProducto, pr, i + 1);
      }
      await this.reemplazarEtiquetas(tx, idProducto, dto.etiquetas ?? []);
      return idProducto;
    });
    return this.producto(id);
  }

  async editarProducto(idProducto: number, dto: EditarProductoDto, usuario: UsuarioSesion) {
    const actual = await this.cargarProducto(idProducto);
    this.verificarSector(usuario, actual.sector, 'editar este producto');
    if (dto.idCategoriaMenu && dto.idCategoriaMenu !== actual.idCategoriaMenu) {
      this.verificarSector(usuario, await this.sectorDeCategoria(dto.idCategoriaMenu), 'moverlo a esa categoría');
    }

    await this.db.transaccion(async (tx) => {
      await tx.query(
        `UPDATE Producto
            SET idCategoriaMenu = COALESCE($2, idCategoriaMenu),
                nombre          = COALESCE($3, nombre),
                descripcion     = CASE WHEN $4::boolean THEN $5 ELSE descripcion END,
                activo          = COALESCE($6, activo)
          WHERE idProducto = $1`,
        [
          idProducto,
          dto.idCategoriaMenu ?? null,
          dto.nombre?.trim() ?? null,
          dto.descripcion !== undefined,
          dto.descripcion?.trim() || null,
          dto.activo ?? null,
        ],
      );
      if (dto.etiquetas) await this.reemplazarEtiquetas(tx, idProducto, dto.etiquetas);
    });
    return this.producto(idProducto);
  }

  async agregarPresentacion(idProducto: number, dto: PresentacionDto, usuario: UsuarioSesion) {
    const actual = await this.cargarProducto(idProducto);
    this.verificarSector(usuario, actual.sector, 'editar este producto');
    await this.db.transaccion((tx) => this.insertarPresentacion(tx, idProducto, dto, dto.orden ?? 99));
    return this.producto(idProducto);
  }

  async editarPresentacion(idPresentacion: number, dto: EditarPresentacionDto, usuario: UsuarioSesion) {
    const pres = await this.db.uno<{ idProducto: number }>(
      `SELECT idProducto AS "idProducto" FROM Presentacion WHERE idPresentacion = $1`,
      [idPresentacion],
    );
    if (!pres) throw new NotFoundException('No existe esa presentación.');
    const actual = await this.cargarProducto(pres.idProducto);
    this.verificarSector(usuario, actual.sector, 'editar este producto');

    await this.db.query(
      `UPDATE Presentacion
          SET nombre     = COALESCE($2, nombre),
              precio     = COALESCE($3, precio),
              orden      = COALESCE($4, orden),
              disponible = COALESCE($5, disponible)
        WHERE idPresentacion = $1`,
      [idPresentacion, dto.nombre?.trim() ?? null, dto.precio ?? null, dto.orden ?? null, dto.disponible ?? null],
    );
    return this.producto(pres.idProducto);
  }

  /** "Agotado por hoy" (o disponible otra vez) para todas las presentaciones del producto. */
  async cambiarDisponibilidad(idProducto: number, disponible: boolean, usuario: UsuarioSesion) {
    const actual = await this.cargarProducto(idProducto);
    this.verificarSector(usuario, actual.sector, 'cambiar la disponibilidad de este producto');
    await this.db.query('UPDATE Presentacion SET disponible = $2 WHERE idProducto = $1', [idProducto, disponible]);
    return this.producto(idProducto);
  }

  async subirFoto(idProducto: number, archivo: ArchivoSubido | undefined, usuario: UsuarioSesion) {
    const actual = await this.cargarProducto(idProducto);
    this.verificarSector(usuario, actual.sector, 'cambiar la foto de este producto');
    const url = await this.storage.subirImagen('menu', `${actual.idProducto}-${actual.nombre}`, archivo);
    await this.db.query('UPDATE Producto SET foto = $2 WHERE idProducto = $1', [idProducto, url]);
    await this.storage.borrarPorUrl(actual.foto); // la anterior ya no se usa
    return this.producto(idProducto);
  }

  async quitarFoto(idProducto: number, usuario: UsuarioSesion) {
    const actual = await this.cargarProducto(idProducto);
    this.verificarSector(usuario, actual.sector, 'cambiar la foto de este producto');
    await this.db.query('UPDATE Producto SET foto = NULL WHERE idProducto = $1', [idProducto]);
    await this.storage.borrarPorUrl(actual.foto);
    return this.producto(idProducto);
  }

  // ------------------------------------------------------------------
  // Categorías y etiquetas (Administrador)
  // ------------------------------------------------------------------

  categorias() {
    return this.db.query(
      `SELECT c.idCategoriaMenu AS id, c.nombre, c.sector, c.orden, c.activa,
              (SELECT count(*) FROM Producto p WHERE p.idCategoriaMenu = c.idCategoriaMenu) AS "cantidadProductos"
         FROM CategoriaMenu c ORDER BY c.orden, c.idCategoriaMenu`,
    );
  }

  async crearCategoria(dto: CategoriaMenuDto) {
    return this.db.uno(
      `INSERT INTO CategoriaMenu (nombre, sector, orden) VALUES ($1, $2, COALESCE($3, 0))
       RETURNING idCategoriaMenu AS id, nombre, sector, orden, activa`,
      [dto.nombre.trim(), dto.sector, dto.orden ?? null],
    );
  }

  async editarCategoria(id: number, dto: EditarCategoriaMenuDto) {
    const fila = await this.db.uno(
      `UPDATE CategoriaMenu
          SET nombre = COALESCE($2, nombre), sector = COALESCE($3, sector),
              orden = COALESCE($4, orden), activa = COALESCE($5, activa)
        WHERE idCategoriaMenu = $1
       RETURNING idCategoriaMenu AS id, nombre, sector, orden, activa`,
      [id, dto.nombre?.trim() ?? null, dto.sector ?? null, dto.orden ?? null, dto.activa ?? null],
    );
    if (!fila) throw new NotFoundException('No existe esa categoría.');
    return fila;
  }

  etiquetas() {
    return this.db.query('SELECT idEtiqueta AS id, nombre FROM Etiqueta ORDER BY nombre');
  }

  crearEtiqueta(nombre: string) {
    return this.db.uno('INSERT INTO Etiqueta (nombre) VALUES ($1) RETURNING idEtiqueta AS id, nombre', [nombre.trim()]);
  }

  // ------------------------------------------------------------------
  // Auxiliares
  // ------------------------------------------------------------------

  private async cargarProducto(idProducto: number) {
    const fila = await this.db.uno<{ idProducto: number; idCategoriaMenu: number; nombre: string; foto: string | null; sector: Sector }>(
      `SELECT p.idProducto AS "idProducto", p.idCategoriaMenu AS "idCategoriaMenu", p.nombre, p.foto, c.sector
         FROM Producto p JOIN CategoriaMenu c ON c.idCategoriaMenu = p.idCategoriaMenu
        WHERE p.idProducto = $1`,
      [idProducto],
    );
    if (!fila) throw new NotFoundException('No existe ese producto.');
    return fila;
  }

  private async sectorDeCategoria(idCategoriaMenu: number): Promise<Sector> {
    const fila = await this.db.uno<{ sector: Sector; activa: boolean }>(
      'SELECT sector, activa FROM CategoriaMenu WHERE idCategoriaMenu = $1',
      [idCategoriaMenu],
    );
    if (!fila) throw new BadRequestException('No existe esa categoría del menú.');
    if (!fila.activa) throw new BadRequestException('La categoría está desactivada.');
    return fila.sector;
  }

  /** Cocina: Cocinero o Administrador. Barra: Bartender o Administrador. */
  private verificarSector(usuario: UsuarioSesion, sector: Sector, accion: string) {
    if (!CARGOS_POR_SECTOR[sector].includes(usuario.cargo)) {
      throw new ForbiddenException(`Un ${usuario.cargo} no puede ${accion} de ${sector}.`);
    }
  }

  private verificarNombresPresentaciones(presentaciones: PresentacionDto[]) {
    const nombres = presentaciones.map((p) => (p.nombre?.trim() || 'Estándar').toLowerCase());
    if (new Set(nombres).size !== nombres.length) {
      throw new BadRequestException('Dos presentaciones no pueden tener el mismo nombre.');
    }
  }

  private async insertarPresentacion(tx: PoolClient, idProducto: number, pr: PresentacionDto, ordenPorDefecto: number) {
    await tx.query(
      `INSERT INTO Presentacion (idProducto, nombre, precio, orden, disponible)
       VALUES ($1, COALESCE($2, 'Estándar'), $3, $4, COALESCE($5, true))`,
      [idProducto, pr.nombre?.trim() || null, pr.precio, pr.orden ?? ordenPorDefecto, pr.disponible ?? null],
    );
  }

  private async reemplazarEtiquetas(tx: PoolClient, idProducto: number, etiquetas: number[]) {
    await tx.query('DELETE FROM ProductoEtiqueta WHERE idProducto = $1', [idProducto]);
    if (etiquetas.length) {
      await tx.query(
        `INSERT INTO ProductoEtiqueta (idProducto, idEtiqueta)
         SELECT $1, unnest($2::int[]) ON CONFLICT DO NOTHING`,
        [idProducto, etiquetas],
      );
    }
  }
}
