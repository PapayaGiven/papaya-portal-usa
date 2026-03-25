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
            EXKLUSIV
          </span>
        )}
      </div>

      {/* Product name */}
      <h3 className="font-dm-sans font-semibold text-brand-black text-base leading-snug">
        {product.name}
      </h3>

      {/* Stats */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-dm-sans font-bold text-2xl text-brand-pink leading-none">
            {product.commission_rate}%
          </p>
          <p className="font-dm-sans text-xs text-gray-400 mt-0.5">Provision</p>
        </div>

        {product.conversion_rate !== null && (
          <div className="text-right">
            <p className="font-dm-sans font-semibold text-base text-gray-700 leading-none">
              {product.conversion_rate}%
            </p>
            <p className="font-dm-sans text-xs text-gray-400 mt-0.5">Conversion</p>
          </div>
        )}
      </div>
    </div>
  )
}
