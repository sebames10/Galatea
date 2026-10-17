// Genera los PNG de la PWA a partir de public/icons/icon.svg (npm run icons)
import sharp from 'sharp'

const svg = 'public/icons/icon.svg'
const out = (name) => `public/icons/${name}`

await sharp(svg).resize(192, 192).png().toFile(out('icon-192.png'))
await sharp(svg).resize(512, 512).png().toFile(out('icon-512.png'))
await sharp(svg).resize(180, 180).png().toFile(out('apple-touch-icon.png'))
// Maskable: el sistema puede recortar hasta un 20% en los bordes, así que se achica el dibujo
await sharp(svg)
  .resize(400, 400)
  .extend({ top: 56, bottom: 56, left: 56, right: 56, background: '#06162B' })
  .png()
  .toFile(out('icon-maskable-512.png'))
console.log('Íconos generados en public/icons')
