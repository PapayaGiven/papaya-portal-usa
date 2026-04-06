import { Product } from '@/lib/types'

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-sm transition-shadow flex flex-col gap-3">
      {/* Top: niche badge + exclusive */}
      <div className="flex items-center justify-between gap-2">
        {product.niche && (
          <span className="font-dm-sans text-xs font-medium bg-brand-light-pink text-brand-green px-2.5 py-1 rounded-full">
            {product.niche}
          </span>
        )}
        {product.is_exclusive && (
          <span className="font-dm-sans text-xs font-bold bg-brand-black text-white px-2.5 py-1 rounded-full tracking-wide">
            EXCLUSIVO
          </span>
        )}
      </div>

      {/* Product image */}
      {product.image_url && (
        <img
          src={product.image_url}
          alt={product.name}
          className="w-full h-28 object-cover rounded-xl border border-gray-100"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
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
    </div>
  )
}
