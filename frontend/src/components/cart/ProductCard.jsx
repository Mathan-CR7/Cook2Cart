import { getBrandName, getPackSize, getProductPrice, isMarketProduct, money } from './cartMath';

export default function ProductCard({ product, selected }) {
  if (!product) return null;

  return (
    <div className={`rounded-2xl border bg-white p-4 transition ${selected ? 'border-orange-400 shadow-sm' : 'border-gray-200'}`}>
      <div className="flex gap-3">
        <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.productName} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-300">
              <span className="material-icon">shopping_basket</span>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="line-clamp-2 text-sm font-black text-gray-900">{product.productName}</h4>
              <p className="mt-1 text-xs font-semibold text-gray-500">{getBrandName(product)}</p>
            </div>
            <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-black text-orange-600">
              {product.source || 'STORE'}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl bg-gray-50 px-3 py-2">
              <span className="block text-gray-400">Pack Size</span>
              <span className="font-bold text-gray-800">{getPackSize(product)}</span>
            </div>
            <div className="rounded-xl bg-gray-50 px-3 py-2">
              <span className="block text-gray-400">{isMarketProduct(product) ? 'Market Price' : 'Pack Price'}</span>
              <span className="font-bold text-gray-800">{money(getProductPrice(product))}</span>
            </div>
          </div>

          {product.marketName && (
            <p className="mt-2 text-[11px] font-medium text-gray-400">Market: {product.marketName}</p>
          )}
        </div>
      </div>
    </div>
  );
}
