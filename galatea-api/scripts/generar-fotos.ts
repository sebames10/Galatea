/**
 * Genera con FLUX (API de Black Forest Labs) las fotos de los productos
 * que no tienen foto real, las guarda en assets/menu como WebP 720x540
 * (igual que las reales) y las agrega a manifest.json. Después se suben
 * con "npm run fotos:subir".
 *
 * No vuelve a generar las que ya existen en assets/menu (cada imagen
 * cuesta créditos). Para regenerar alguna, borrá su .webp o usá --forzar.
 *
 *   npm run fotos:generar                 genera las que faltan
 *   npm run fotos:generar -- --forzar     regenera todas
 */
import 'dotenv/config';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';

interface FotoGenerada {
  categoria: string;
  producto: string;
  archivo: string;
  plato: string; // qué se ve en la foto, en inglés (FLUX entiende mejor el inglés)
}

// Mismo encuadre que las fotos reales: mesada de acero, pared de azulejos oscuros.
const ESTILO =
  'Professional restaurant menu photograph. Served on a brushed stainless steel counter, ' +
  'dark grey tiled wall softly blurred in the background, eye-level three-quarter view, ' +
  'warm soft lighting, shallow depth of field, photorealistic. No text, no logos, no readable labels, no people.';

const FOTOS: FotoGenerada[] = [
  // Para picar
  { categoria: 'Para picar', producto: 'Fritas salseadas con champi', archivo: 'para-picar--fritas-salseadas-con-champi.webp',
    plato: 'A black round bowl of french fries covered with creamy mushroom sauce and sauteed sliced champignon mushrooms.' },
  { categoria: 'Para picar', producto: 'Fritas salseadas con cheddar y bacon', archivo: 'para-picar--fritas-salseadas-con-cheddar-y-bacon.webp',
    plato: 'A black round bowl of french fries covered with melted cheddar cheese sauce and crispy bacon bits.' },
  { categoria: 'Para picar', producto: 'Gramajo para 2', archivo: 'para-picar--gramajo-para-2.webp',
    plato: 'A large white enamel plate with a black rim, generous portion for two of Uruguayan gramajo: fried potato sticks scrambled with eggs, diced ham and onion, chopped parsley, two lemon wedges.' },
  { categoria: 'Para picar', producto: 'Gramajo vegetariano', archivo: 'para-picar--gramajo-vegetariano.webp',
    plato: 'A white enamel plate with a black rim of vegetarian gramajo: fried potato sticks scrambled with eggs, sauteed onion, red bell pepper strips and green peas, chopped parsley, a lemon wedge. No meat.' },
  // Postres
  { categoria: 'Postres', producto: 'Bocha de helado', archivo: 'postres--bocha-de-helado.webp',
    plato: 'A single scoop of dulce de leche ice cream in a small glass dessert cup.' },
  { categoria: 'Postres', producto: 'Brownie', archivo: 'postres--brownie.webp',
    plato: 'A square fudgy chocolate brownie on a small white plate, dusted with a little powdered sugar.' },
  { categoria: 'Postres', producto: 'Brownie con helado', archivo: 'postres--brownie-con-helado.webp',
    plato: 'A warm chocolate brownie on a white plate topped with a scoop of vanilla ice cream starting to melt.' },
  { categoria: 'Postres', producto: 'Crumble con helado', archivo: 'postres--crumble-con-helado.webp',
    plato: 'Apple crumble with golden crunchy topping in a small ceramic dish, with a scoop of vanilla ice cream on top.' },
  { categoria: 'Postres', producto: 'Crumble de manzana', archivo: 'postres--crumble-de-manzana.webp',
    plato: 'Apple crumble with golden crunchy oat topping in a small round ceramic baking dish, cooked apple visible.' },
  { categoria: 'Postres', producto: 'Panqueque con dulce de leche', archivo: 'postres--panqueque-con-dulce-de-leche.webp',
    plato: 'A thin crepe rolled and filled with dulce de leche on a white plate, sprinkled with sugar, dulce de leche visible at the ends.' },
  // Tragos
  { categoria: 'Tragos', producto: 'Highball Blonde & Lemon', archivo: 'tragos--highball-blonde-lemon.webp',
    plato: 'A tall highball glass of light whisky mixed with lime soda, ice cubes and a lemon wedge.' },
  { categoria: 'Tragos', producto: 'Johnnie Walker Red & Cola', archivo: 'tragos--johnnie-walker-red-cola.webp',
    plato: 'A tall highball glass of whisky and cola with ice cubes and a lemon wedge.' },
  { categoria: 'Tragos', producto: 'Tanqueray & Tonic', archivo: 'tragos--tanqueray-tonic.webp',
    plato: 'A balloon copa glass of gin and tonic with lots of ice and a lemon slice.' },
  { categoria: 'Tragos', producto: 'Johnnie Walker® Black Label™', archivo: 'tragos--johnnie-walker-black-label.webp',
    plato: 'A heavy crystal rocks glass with a measure of deep amber scotch whisky and one large ice cube.' },
  { categoria: 'Tragos', producto: 'Johnnie Walker® Red Label™', archivo: 'tragos--johnnie-walker-red-label.webp',
    plato: 'A crystal rocks glass with golden scotch whisky on the rocks.' },
  { categoria: 'Tragos', producto: 'Negroni', archivo: 'tragos--negroni.webp',
    plato: 'A Negroni cocktail, deep red, in a rocks glass with a large ice cube and an orange peel twist.' },
  { categoria: 'Tragos', producto: 'Smirnoff & Pomelo', archivo: 'tragos--smirnoff-pomelo.webp',
    plato: 'A tall highball glass of vodka with pink grapefruit soda, ice and a pink grapefruit slice.' },
  { categoria: 'Tragos', producto: 'Mojito', archivo: 'tragos--mojito.webp',
    plato: 'A classic mojito in a tall glass with crushed ice, fresh mint leaves and lime wedges.' },
  { categoria: 'Tragos', producto: 'Cuba libre', archivo: 'tragos--cuba-libre.webp',
    plato: 'A Cuba libre: rum and cola in a highball glass with ice and a lime wedge.' },
  { categoria: 'Tragos', producto: 'Campari Tonic', archivo: 'tragos--campari-tonic.webp',
    plato: 'A tall glass of bright red Campari with tonic water, ice and an orange slice.' },
  { categoria: 'Tragos', producto: 'Tinto de verano', archivo: 'tragos--tinto-de-verano.webp',
    plato: 'Tinto de verano: red wine with lemon soda in a tall glass with ice and a lemon slice.' },
  { categoria: 'Tragos', producto: 'Jäger Bomb', archivo: 'tragos--jager-bomb.webp',
    plato: 'A shot glass of dark herbal liqueur next to a glass half filled with energy drink, ready to be dropped in.' },
  { categoria: 'Tragos', producto: 'Jäger Mojito', archivo: 'tragos--jager-mojito.webp',
    plato: 'A dark amber mojito made with herbal liqueur in a tall glass with crushed ice, mint and lime.' },
  { categoria: 'Tragos', producto: 'Fernet con coca', archivo: 'tragos--fernet-con-coca.webp',
    plato: 'Fernet with cola: a tall glass of very dark drink with ice and a thick creamy foam head.' },
  { categoria: 'Tragos', producto: 'Aperol spritz', archivo: 'tragos--aperol-spritz.webp',
    plato: 'An Aperol spritz, bright orange, in a large wine glass with ice and an orange slice.' },
  { categoria: 'Tragos', producto: 'Campari Orange', archivo: 'tragos--campari-orange.webp',
    plato: 'A tall glass of Campari with orange juice, red to orange gradient, ice and an orange slice.' },
  { categoria: 'Tragos', producto: 'Trago sugerencia', archivo: 'tragos--trago-sugerencia.webp',
    plato: "A bartender's signature cocktail in an elegant coupe glass, vibrant color, with an artful citrus and herb garnish." },
  // Cervezas
  { categoria: 'Cervezas', producto: 'Heineken', archivo: 'cervezas--heineken.webp',
    plato: 'A one liter green glass bottle of lager beer with a plain unbranded label, next to a full glass of golden beer with foam.' },
  { categoria: 'Cervezas', producto: 'Tirada Rubia', archivo: 'cervezas--tirada-rubia.webp',
    plato: 'A pint glass of freshly poured golden draft lager with a thick white foam head, condensation on the glass.' },
  { categoria: 'Cervezas', producto: 'Tirada IPA', archivo: 'cervezas--tirada-ipa.webp',
    plato: 'A pint glass of hazy amber-orange IPA draft beer with a creamy foam head.' },
  { categoria: 'Cervezas', producto: 'Tirada Maracuyá', archivo: 'cervezas--tirada-maracuya.webp',
    plato: 'A pint glass of golden orange passion fruit draft beer with foam, a halved passion fruit beside it.' },
  { categoria: 'Cervezas', producto: 'Estrella Galicia sin gluten', archivo: 'cervezas--estrella-galicia-sin-gluten.webp',
    plato: 'A brown glass beer bottle with a plain unbranded label next to a tall glass of pale golden lager with foam.' },
  { categoria: 'Cervezas', producto: 'Estrella Galicia sin alcohol', archivo: 'cervezas--estrella-galicia-sin-alcohol.webp',
    plato: 'A green glass beer bottle with a plain unbranded label next to a stemmed glass of light golden beer with foam.' },
  // Vinos
  { categoria: 'Vinos', producto: 'Trapiche', archivo: 'vinos--trapiche.webp',
    plato: 'A bottle of wine with a plain label next to a glass of red wine and a glass of white chardonnay wine.' },
  { categoria: 'Vinos', producto: 'Familia Gascón', archivo: 'vinos--familia-gascon.webp',
    plato: 'A dark bottle of Malbec red wine with a plain label next to a large wine glass of deep red wine.' },
];

const API = (process.env.BFL_API_URL ?? 'https://api.bfl.ai').replace(/\/+$/, '');
const MODELO = process.env.FLUX_MODEL ?? 'flux-pro-1.1';
const CLAVE = process.env.BFL_API_KEY;
const CARPETA = join(__dirname, '..', 'assets', 'menu');
const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function generar(foto: FotoGenerada): Promise<Buffer> {
  const pedido = await fetch(`${API}/v1/${MODELO}`, {
    method: 'POST',
    headers: { 'x-key': CLAVE!, 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ prompt: `${foto.plato} ${ESTILO}`, width: 1024, height: 768, output_format: 'jpeg' }),
  });
  if (!pedido.ok) throw new Error(`FLUX respondió ${pedido.status}: ${await pedido.text()}`);
  const { polling_url } = (await pedido.json()) as { polling_url: string };

  for (let intento = 0; intento < 120; intento++) {
    await esperar(1500);
    const r = await fetch(polling_url, { headers: { 'x-key': CLAVE!, accept: 'application/json' } });
    const estado = (await r.json()) as { status: string; result?: { sample: string } };
    if (estado.status === 'Ready') {
      const imagen = await fetch(estado.result!.sample); // la URL firmada vence en ~10 minutos
      return Buffer.from(await imagen.arrayBuffer());
    }
    if (estado.status !== 'Pending' && estado.status !== 'Processing') {
      throw new Error(`FLUX no generó la imagen (${estado.status}).`);
    }
  }
  throw new Error('FLUX tardó demasiado.');
}

async function main() {
  if (!CLAVE) throw new Error('Falta BFL_API_KEY en el .env (dashboard.bfl.ai > API keys).');
  const forzar = process.argv.includes('--forzar');
  const rutaManifiesto = join(CARPETA, 'manifest.json');
  const manifiesto = JSON.parse(readFileSync(rutaManifiesto, 'utf8'));

  const pendientes = FOTOS.filter((f) => forzar || !existsSync(join(CARPETA, f.archivo)));
  console.log(`${pendientes.length} fotos para generar con ${MODELO}.`);

  // De a 4 a la vez: más rápido sin pasarse del límite de pedidos simultáneos.
  let fallidas = 0;
  for (let i = 0; i < pendientes.length; i += 4) {
    await Promise.all(
      pendientes.slice(i, i + 4).map(async (foto) => {
        try {
          const original = await generar(foto);
          await sharp(original).resize(720, 540, { fit: 'cover' }).webp({ quality: 80 }).toFile(join(CARPETA, foto.archivo));
          console.log(`✓ ${foto.categoria} / ${foto.producto}`);
        } catch (e) {
          fallidas++;
          console.error(`✗ ${foto.categoria} / ${foto.producto}: ${(e as Error).message}`);
        }
      }),
    );
  }

  // Agrega al manifiesto las que existen y todavía no están.
  for (const foto of FOTOS) {
    const ya = manifiesto.fotos.some((m: { archivo: string }) => m.archivo === foto.archivo);
    if (!ya && existsSync(join(CARPETA, foto.archivo))) {
      manifiesto.fotos.push({ categoria: foto.categoria, producto: foto.producto, archivo: foto.archivo, original: 'Generada con FLUX' });
    }
  }
  writeFileSync(rutaManifiesto, JSON.stringify(manifiesto, null, 2) + '\n');
  console.log(`\nListo. ${fallidas ? `${fallidas} fallaron: volvé a correrlo para reintentar.` : 'Ahora corré "npm run fotos:subir".'}`);
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
