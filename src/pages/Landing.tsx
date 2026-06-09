import { Hero } from '../components/Hero'
import { ComoFunciona } from '../components/ComoFunciona'
import { PremiosGenerales } from '../components/PremiosGenerales'
import { CtaFinal } from '../components/CtaFinal'

export function Landing() {
  return (
    <div className="min-h-screen bg-morado">
      <Hero />
      <ComoFunciona />
      <PremiosGenerales />
      <CtaFinal />
      <footer className="bg-morado px-6 py-8 text-center text-sm text-crema/50">
        © 2026 GrandBar Distribuciones — Mundial de Bebidas. Promo válida del 1
        al 30 de junio.
      </footer>
    </div>
  )
}
