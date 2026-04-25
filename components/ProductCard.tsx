import { Product } from '@/lib/types'

interface ProductCardProps {
  product: Product
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

      {/* Commission */}
      <div>
        <p className="font-dm-sans font-bold text-2xl text-brand-pink leading-none">
          {product.commission_rate}%
        </p>
        <p className="font-dm-sans text-xs text-gray-400 mt-0.5">Comisión</p>
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
