import { Lock } from 'lucide-react'

/**
 * Hack-portal teaser for Papaya Picks — blurred cards + lock overlay +
 * conversion CTA. Static copy + placeholder rows; the actual Papaya
 * Picks list never leaves the authenticated /products page.
 */
const PLACEHOLDER_PICKS = [
  {
    badge: '🔥 Hot Pick',
    score: 89,
    line: 'Producto de Beauty · 3,200 unidades esta semana · Solo 6 afiliadas',
  },
  {
    badge: '⭐ Good Pick',
    score: 71,
    line: 'Producto de Fashion · 1,800 unidades esta semana · Solo 11 afiliadas',
  },
  {
    badge: '🔥 Hot Pick',
    score: 84,
    line: 'Producto de Skincare · 2,100 unidades esta semana · Solo 4 afiliadas',
  },
]

export default function PapayaPicksTeaser({ joinUrl, loginUrl }: { joinUrl: string; loginUrl: string }) {
  return (
    <section className="mb-12">
      <div className="mb-6 text-center max-w-2xl mx-auto">
        <h2 className="font-playfair text-3xl text-brand-black mb-2">
          Papaya Picks — Antes que nadie
        </h2>
        <p className="font-dm-sans text-sm text-gray-600 leading-relaxed">
          Identificamos productos que están explotando en ventas con pocos afiliados aún. Las primeras en publicar son las que más ganan.
        </p>
      </div>

      <div className="relative rounded-3xl overflow-hidden">
        {/* Blurred placeholder cards */}
        <div
          aria-hidden="true"
          className="filter blur-sm pointer-events-none select-none grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          {PLACEHOLDER_PICKS.map((p, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-brand-pink/20 p-5 space-y-3"
            >
              <div className="flex items-baseline justify-between">
                <span className="font-dm-sans text-xs font-bold text-brand-pink">
                  {p.badge}
                </span>
                <span className="font-dm-sans text-xs font-bold text-gray-400">
                  Score {p.score}
                </span>
              </div>
              <p className="font-dm-sans text-sm text-brand-black leading-relaxed">
                {p.line}
              </p>
              <div className="h-20 rounded-xl bg-gradient-to-br from-brand-light-pink to-brand-pink/30" />
            </div>
          ))}
        </div>

        {/* Lock overlay + CTA */}
        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="bg-white border border-brand-pink/30 rounded-3xl px-6 py-7 text-center max-w-md mx-auto shadow-lg">
            <div className="w-12 h-12 rounded-full bg-brand-pink/15 flex items-center justify-center mx-auto mb-4">
              <Lock className="text-brand-pink" size={22} strokeWidth={1.75} />
            </div>
            <p className="font-dm-sans text-sm font-semibold text-brand-black mb-2">
              🔒 Solo para miembros de Papaya Social Club
            </p>
            <p className="font-dm-sans text-sm text-gray-600 leading-relaxed mb-5">
              Las creadoras de Papaya Social Club ven estos productos antes que nadie. ¿Quieres ser la primera?
            </p>
            <a
              href={joinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block font-dm-sans text-sm font-bold bg-brand-green text-white px-6 py-3 rounded-2xl hover:bg-brand-green/90 transition shadow"
            >
              Unirme a Papaya Social Club →
            </a>
            <p className="mt-4">
              <a
                href={loginUrl}
                className="font-dm-sans text-xs text-gray-500 hover:text-brand-green underline underline-offset-4 decoration-gray-300 hover:decoration-brand-green transition"
              >
                ¿Ya eres miembro? Inicia sesión →
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
