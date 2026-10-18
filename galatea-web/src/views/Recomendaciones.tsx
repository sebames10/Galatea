import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Send, Sparkles } from 'lucide-react'
import type { CategoriaMenu, Producto } from '../api'
import { buscarProducto, destacados, maridaje } from '../data/menu'
import { useApp } from '../store'
import { PageHeader } from '../components/PageHeader'
import { ProductoMini } from '../components/ProductoMini'
import { ErrorCarga } from '../components/ErrorCarga'

type ProductoCat = Producto & { categoria: string; sector: CategoriaMenu['sector'] }
type Mensaje = { de: 'gala' | 'yo'; texto: string; sugerencias?: Producto[] }

const SUGERENCIAS = ['Algo vegetariano', 'Un trago', 'Sin alcohol', 'Para compartir', 'Postre']

// Reglas simples por palabra clave hasta que las recomendaciones salgan de la IA (tabla Recomendacion de la API)
const REGLAS: { patron: RegExp; texto: string; filtro: (p: ProductoCat) => boolean }[] = [
  { patron: /veg|sin carne/, texto: 'Opciones vegetarianas que salen muy bien:', filtro: (p) => p.etiquetas.includes('Vegetariano') },
  { patron: /gluten|cel[ií]ac/, texto: 'Sin gluten:', filtro: (p) => p.etiquetas.includes('Sin gluten') },
  { patron: /sin alcohol|manejo|no tomo/, texto: 'Sin alcohol y con mucho sabor:', filtro: (p) => p.etiquetas.includes('Sin alcohol') },
  { patron: /dulce|postre/, texto: 'Para cerrar con algo dulce:', filtro: (p) => p.categoria === 'Postres' },
  { patron: /cerveza|birra/, texto: 'De las cervezas te recomiendo:', filtro: (p) => p.categoria === 'Cervezas' },
  { patron: /vino/, texto: 'Para acompañar con vino:', filtro: (p) => p.categoria === 'Vinos' },
  { patron: /trago|c[oó]ctel|tomar/, texto: 'De la barra te recomiendo:', filtro: (p) => p.categoria === 'Tragos' },
  { patron: /compartir|picar|picada/, texto: 'Para compartir en la mesa:', filtro: (p) => p.categoria === 'Para compartir' || p.categoria === 'Para picar' },
  { patron: /hamburg/, texto: 'Hamburguesas de la casa:', filtro: (p) => p.categoria === 'Hamburguesas' },
  { patron: /pizz/, texto: 'Pizzetas recién salidas:', filtro: (p) => p.categoria === 'Pizzetas' },
  { patron: /milanesa/, texto: 'Milanesas:', filtro: (p) => p.categoria === 'Milanesas' },
  { patron: /chivito|carne|hambre/, texto: 'Para mucha hambre:', filtro: (p) => p.categoria === 'Chivitos' || p.categoria === 'Milanesas' },
]

function responder(pregunta: string, productos: ProductoCat[], casa: Producto[]): Mensaje {
  const t = pregunta.toLowerCase()
  const regla = REGLAS.find((r) => r.patron.test(t))
  if (!regla) return { de: 'gala', texto: 'Te cuento lo que recomienda la casa:', sugerencias: casa.slice(0, 3) }
  const sugerencias = productos.filter((p) => regla.filtro(p) && !p.agotado).slice(0, 3)
  return sugerencias.length
    ? { de: 'gala', texto: regla.texto, sugerencias }
    : { de: 'gala', texto: 'Hoy no tengo nada de eso en la carta. ¿Probamos con otra cosa?' }
}

function Fila({ eyebrow, titulo, productos }: { eyebrow: string; titulo: string; productos: Producto[] }) {
  if (!productos.length) return null
  return (
    <section className="mt-8 first:mt-0">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mb-4 text-2xl">{titulo}</h2>
      <div className="scroll-row -mx-4 px-4 pb-2 md:mx-0 md:px-0">
        {productos.map((p) => (
          <ProductoMini key={p.id} producto={p} />
        ))}
      </div>
    </section>
  )
}

export function Recomendaciones() {
  const { carta, cargandoCarta, errorCarta, recargarCarta, carrito } = useApp()
  const productos = useMemo<ProductoCat[]>(
    () => carta.flatMap((c) => c.productos.map((p) => ({ ...p, categoria: c.nombre, sector: c.sector }))),
    [carta],
  )
  const casa = useMemo(() => destacados(carta), [carta])
  const enPedido = useMemo(() => new Set(carrito.map((l) => l.producto.id)), [carrito])
  // Desde el detalle de un producto (?para=id) se recomienda para ese producto; si no, para el pedido
  const [params] = useSearchParams()
  const para = useMemo(() => buscarProducto(carta, Number(params.get('para'))), [carta, params])
  const base = para ?? carrito[0]?.producto

  // "Combina bien": lo que le falta al pedido (algo de la barra, un postre o algo para compartir)
  const combina = useMemo(() => {
    if (para) return maridaje(carta, para)
    const pedidos = productos.filter((p) => enPedido.has(p.id))
    if (!pedidos.length) return []
    const objetivo = !pedidos.some((p) => p.sector === 'barra')
      ? ['Tragos']
      : !pedidos.some((p) => p.categoria === 'Postres')
        ? ['Postres']
        : ['Para compartir', 'Para picar']
    return productos.filter((p) => objetivo.includes(p.categoria) && !p.agotado && !enPedido.has(p.id)).slice(0, 6)
  }, [para, carta, productos, enPedido])

  const [mensajes, setMensajes] = useState<Mensaje[]>([{ de: 'gala', texto: '¡Hola! Soy Gala 🍷 Contame qué tenés ganas de comer o tomar.' }])
  const [pregunta, setPregunta] = useState('')
  const chat = useRef<HTMLDivElement>(null)

  // Solo scrollea la conversación, no la página
  useEffect(() => {
    chat.current?.scrollTo({ top: chat.current.scrollHeight, behavior: 'smooth' })
  }, [mensajes])

  const preguntar = (texto: string) => {
    if (!texto.trim()) return
    setMensajes((m) => [...m, { de: 'yo', texto }, responder(texto, productos, casa)])
    setPregunta('')
  }

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    preguntar(pregunta)
  }

  return (
    <div className="flex flex-col">
      <PageHeader eyebrow="Para vos" title="Recomendaciones" />

      {errorCarta && <ErrorCarga mensaje={errorCarta} onReintentar={recargarCarta} />}
      {cargandoCarta && !carta.length ? (
        <div className="flex gap-4 overflow-hidden" aria-busy="true" aria-label="Cargando">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-64 w-56 shrink-0 animate-pulse rounded-2xl bg-elevated/60" />
          ))}
        </div>
      ) : (
        <div>
          {base && <Fila eyebrow={`Por ${base.nombre}`} titulo={para ? `Combina bien con ${para.nombre}` : 'Combina bien con lo que elegiste'} productos={combina} />}
          <Fila eyebrow="La casa recomienda" titulo="Te puede gustar" productos={casa.filter((p) => !enPedido.has(p.id))} />
          <Fila
            eyebrow="Para la mesa"
            titulo="Para compartir"
            productos={productos.filter((p) => p.categoria === 'Para compartir' && !p.agotado)}
          />
        </div>
      )}

      <section aria-labelledby="gala" className="mt-10 overflow-hidden rounded-3xl border border-line/60 bg-surface">
        <div className="flex items-center gap-3 border-b border-line/60 p-4">
          <span className="grid size-10 place-items-center rounded-full bg-gold text-on-gold">
            <Sparkles size={20} aria-hidden="true" />
          </span>
          <div>
            <h2 id="gala" className="font-heading text-base font-semibold tracking-normal">
              Gala, tu asistente
            </h2>
            <p className="text-xs text-muted">Recomienda platos y tragos de la carta</p>
          </div>
        </div>

        <div ref={chat} className="app-scroll max-h-[420px] space-y-3 p-4" aria-live="polite">
          {mensajes.map((m, i) => (
            <div key={i} className={`flex flex-col ${m.de === 'yo' ? 'items-end' : 'items-start'}`}>
              <p className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${m.de === 'yo' ? 'bg-gold text-on-gold' : 'bg-elevated'}`}>{m.texto}</p>
              {m.sugerencias && (
                <div className="scroll-row mt-2 w-full pb-1">
                  {m.sugerencias.map((p) => (
                    <ProductoMini key={p.id} producto={p} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="scroll-row px-4">
          {SUGERENCIAS.map((s) => (
            <button key={s} type="button" className="chip" onClick={() => preguntar(s)}>
              {s}
            </button>
          ))}
        </div>

        <form onSubmit={enviar} className="flex gap-2 p-4">
          <input
            value={pregunta}
            onChange={(e) => setPregunta(e.target.value)}
            placeholder="Escribí lo que se te antoja…"
            aria-label="Mensaje para Gala"
            className="field h-11 min-h-11 flex-1 rounded-full text-sm"
          />
          <button type="submit" aria-label="Enviar" className="grid size-11 shrink-0 place-items-center rounded-full bg-gold text-on-gold transition-colors hover:bg-gold-soft">
            <Send size={16} aria-hidden="true" />
          </button>
        </form>
      </section>
    </div>
  )
}
