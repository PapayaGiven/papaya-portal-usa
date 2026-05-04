import { Product } from '@/lib/types'

interface ProductCardProps {
  product: Product
}

function Stars({ rating }: { rating: number }) {
  const clamped = Math.max(0, Math.min(5, rating))
  return (
    <span aria-label={`${clamped.toFixed(1)} de 5 estrellas`} className="inline-flex items-center">
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, clamped - i))
        return (
          <span key={i} className="relative inline-block w-3.5 h-3.5 leading-none">
            <span className="absolute inset-0 text-gray-200">★</span>
            <span
              className="absolute inset-0 text-amber-400 overflow-hidden"
              style={{ width: `${fill * 100}%` }}
            >
              ★
            </span>
          </span>
        )
      })}
    </span>
  )
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-sm transition-shadow flex flex-col gap-3">
      {/* Top: niche + exclusive */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {product.niche && (
            <span className="font-dm-sans text-xs font-medium bg-brand-light-pink text-brand-green px-2.5 py-1 rounded-full">
              {product.niche}
            </span>
          )}
        </div>
        {product.is_exclusive && (
          <span className="font-dm-sans text-xs font-bold bg-brand-black text-white px-2.5 py-1 rounded-full tracking-wide">
            EXCLUSIVO
          </span>
        )}
      </div>

      {/* Product image */}
      {product.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.image_url}
          alt={product.name}
          className="w-full h-28 object-cover rounded-xl border border-gray-100"
        />
      )}

      {/* Product name */}
      <h3 className="font-dm-sans font-semibold text-brand-black text-base leading-snug">
        {product.name}
      </h3>

      {/* Rating */}
      {product.star_rating != null && (
        <div className="flex items-center gap-1.5">
          <Stars rating={product.star_rating} />
          <span className="font-dm-sans text-sm font-semibold text-brand-black">
            {product.star_rating.toFixed(1)}
          </span>
          {product.review_count != null && (
            <span className="font-dm-sans text-xs text-gray-400">
              ({product.review_count.toLocaleString('es-MX')} reseñas)
            </span>
          )}
        </div>
      )}

      {/* Commission + units */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="font-dm-sans font-bold text-2xl text-brand-pink leading-none">
            {product.commission_rate}%
          </p>
          <p className="font-dm-sans text-xs text-gray-400 mt-0.5">Comisión</p>
        </div>
        {product.units_sold != null && (
          <div className="text-right">
            <p className="font-dm-sans font-bold text-base text-brand-black leading-none">
              {product.units_sold.toLocaleString('es-MX')}
            </p>
            <p className="font-dm-sans text-xs text-gray-400 mt-0.5">vendidas</p>
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-3">
        {product.showcase_link && (
          <a href={product.showcase_link} target="_blank" rel="noopener noreferrer" className="flex-1 text-center py-2 rounded-xl font-dm-sans text-xs font-semibold text-white bg-brand-green hover:bg-brand-green/90 transition">
            Agregar a showcase →
          </a>
        )}
        {product.sample_link && (
          <a href={product.sample_link} target="_blank" rel="noopener noreferrer" className="flex-1 text-center py-2 rounded-xl font-dm-sans text-xs font-semibold text-brand-green bg-brand-green/10 hover:bg-brand-green/20 transition">
            Solicitar muestra →
          </a>
        )}
      </div>
    </div>
  )
}
