import { ChefHat, HandPlatter, QrCode, ReceiptText } from 'lucide-react'

const pasos = [
  { icon: QrCode, titulo: 'Escaneá el QR', texto: 'La mesa queda identificada sola.' },
  { icon: ReceiptText, titulo: 'Armá tu pedido', texto: 'Platos y tragos, sin esperar al mozo.' },
  { icon: ChefHat, titulo: 'Cocina y barra', texto: 'Lo reciben al instante, ordenado por mesa.' },
  { icon: HandPlatter, titulo: 'Te lo llevan', texto: 'El mozo lo retira cuando está listo.' },
]

export function ComoFunciona() {
  return (
    <section aria-labelledby="como-funciona" className="flex flex-col gap-4">
      <h2 id="como-funciona" className="text-xl">
        Cómo funciona
      </h2>
      <ol className="flex flex-col gap-3">
        {pasos.map(({ icon: Icon, titulo, texto }, i) => (
          <li key={titulo} className="card flex items-start gap-3 p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
              <Icon size={20} aria-hidden="true" />
            </span>
            <div>
              <p className="font-heading font-semibold">
                {i + 1}. {titulo}
              </p>
              <p className="text-sm text-muted">{texto}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
