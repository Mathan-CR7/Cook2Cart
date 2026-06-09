import { useMemo } from 'react';
import ProductDropdown from './ProductDropdown';
import {
  calculateProductPricing,
  displayQty,
  formatBaseQuantity,
  getBrandName,
  getPackSize,
  getProductPrice,
  getProductImageUrl,
  isMarketProduct,
  money,
  vegetableOptions,
} from './cartMath';

const productKey = (product) => String(product?.id || product?.barcode || product?.productName || '');

export default function IngredientProductCard({
  ingredient,
  products,
  selectedProductKey,
  vegetableOption,
  accepted,
  atHome,
  onSelectProduct,
  onSelectVegetableOption,
  onAccept,
  onToggleAtHome,
  onRemove,
}) {
  const selectedProduct = useMemo(
    () => products.find((product) => productKey(product) === String(selectedProductKey)) || products[0],
    [products, selectedProductKey]
  );

  if (!products.length) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-black text-gray-900">{ingredient.ingredientName}</h3>
        <p className="mt-1 text-xs text-gray-500">No product suggestions found.</p>
      </section>
    );
  }

  const required = displayQty(ingredient);
  const packSize = getPackSize(selectedProduct);
  const packPrice = getProductPrice(selectedProduct);
  const marketProduct = isMarketProduct(selectedProduct);
  const selectedVegOption = vegetableOptions.find((option) => option.label === vegetableOption) || vegetableOptions[0];
  const pricing = calculateProductPricing(ingredient, selectedProduct, selectedVegOption);
  const requiredBaseText = pricing.required ? formatBaseQuantity(pricing.required.value, pricing.required.type) : required;
  const packBaseText = pricing.pack ? formatBaseQuantity(pricing.pack.value, pricing.pack.type) : packSize;
  const unusedText = pricing.unusedQuantity === null ? '-' : formatBaseQuantity(pricing.unusedQuantity, pricing.required?.type || pricing.pack?.type);

  return (
    <section className={`rounded-[18px] border bg-white p-3.5 shadow-[0_8px_24px_rgba(30,34,41,0.04)] transition hover:border-orange-200 ${
      atHome ? 'border-green-200 bg-green-50/30' : 'border-gray-200'
    }`}>
      <div className="mb-3 flex items-start justify-between gap-3 px-1">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-600">
            <span className="material-icon !text-xl">restaurant</span>
          </span>
          <div>
            <h3 className="text-lg font-black leading-tight text-gray-900">{ingredient.ingredientName}</h3>
            <p className="mt-0.5 text-sm font-medium text-gray-500">
              Required: <span className="font-black text-orange-600">{required || 'As needed'}</span>
            </p>
          </div>
        </div>
        <span className={`shrink-0 rounded-xl border px-3 py-1 text-xs font-black ${
          marketProduct ? 'border-green-100 bg-green-50 text-green-700' : 'border-orange-100 bg-orange-50 text-orange-600'
        }`}>
          {selectedProduct.source || 'INTERNAL'}
        </span>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-3">
        <div className="grid gap-4 lg:grid-cols-[150px_minmax(0,1fr)_140px_135px] lg:items-center">
          <div className="flex items-center justify-center rounded-xl border border-gray-100 bg-gray-50 p-2">
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-white">
              <img
                src={getProductImageUrl(selectedProduct, ingredient.ingredientName)}
                alt={selectedProduct.productName}
                className="h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.src = getProductImageUrl(null, ingredient.ingredientName);
                }}
              />
            </div>
          </div>

          <div className="min-w-0">
            <ProductDropdown
              value={productKey(selectedProduct)}
              products={products}
              onChange={onSelectProduct}
            />
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <p className="text-sm font-medium text-gray-500">Brand: <span className="font-bold text-gray-800">{getBrandName(selectedProduct)}</span></p>
              <p className="text-sm font-medium text-gray-500">Pack Size: <span className="font-bold text-gray-800">{packSize}</span></p>
            </div>
          </div>

          <div className="rounded-2xl bg-white px-2">
            <p className="text-xs font-semibold text-gray-500">{marketProduct ? 'Market Price' : 'Pack Price'}</p>
            <p className="mt-1 text-2xl font-black text-orange-600">{money(packPrice)}</p>
            {!marketProduct && pricing.pack?.value ? (
              <p className="mt-1 text-xs font-medium text-gray-500">Pack: {packBaseText}</p>
            ) : null}
          </div>

          <div className="rounded-2xl bg-green-50 px-4 py-3">
            <p className="text-xs font-semibold text-gray-600">Recipe Usage Cost</p>
            <p className="mt-1 text-lg font-black text-gray-900">{money(pricing.recipeUsageCost)}</p>
            <p className="mt-2 text-xs font-semibold text-gray-600">Purchase Cost</p>
            <p className="mt-0.5 text-sm font-black text-green-800">{money(pricing.purchaseCost)}</p>
          </div>
        </div>

        {!marketProduct && (
          <div className="mt-3 grid gap-2 rounded-2xl bg-gray-50 p-3 sm:grid-cols-3 lg:grid-cols-6">
            <div>
              <span className="block text-[10px] font-black uppercase text-gray-400">Required Quantity</span>
              <span className="text-xs font-black text-gray-900">{requiredBaseText}</span>
            </div>
            <div>
              <span className="block text-[10px] font-black uppercase text-gray-400">Pack Size</span>
              <span className="text-xs font-black text-gray-900">{packSize}</span>
            </div>
            <div>
              <span className="block text-[10px] font-black uppercase text-gray-400">Packs Needed</span>
              <span className="text-xs font-black text-gray-900">{pricing.packsNeeded}</span>
            </div>
            <div>
              <span className="block text-[10px] font-black uppercase text-gray-400">Purchase Cost</span>
              <span className="text-xs font-black text-gray-900">{money(pricing.purchaseCost)}</span>
            </div>
            <div>
              <span className="block text-[10px] font-black uppercase text-gray-400">Usage Cost</span>
              <span className="text-xs font-black text-green-700">{money(pricing.recipeUsageCost)}</span>
            </div>
            <div>
              <span className="block text-[10px] font-black uppercase text-gray-400">Unused Quantity</span>
              <span className="text-xs font-black text-orange-600">{unusedText}</span>
            </div>
          </div>
        )}
      </div>

      {atHome && (
        <div className="mt-3 rounded-2xl bg-green-50 px-3 py-2.5 text-xs font-black text-green-700">
          You marked this ingredient as available at home. It will not be added to purchase total.
        </div>
      )}

      {marketProduct ? (
        <div className="mt-3 flex flex-col gap-3 rounded-2xl bg-green-50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-bold text-green-800">
            Market price: {money(packPrice)} / {String(selectedProduct.priceUnit || 'kg').replace('INR/', '')}
          </p>
          <div className="flex flex-wrap gap-2">
            {vegetableOptions.map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => onSelectVegetableOption(option.label)}
                className={`rounded-xl px-3 py-1.5 text-[11px] font-black transition ${
                  selectedVegOption.label === option.label
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-green-700 hover:bg-green-100'
                }`}
              >
                {option.label.replace('Add ', '')}
              </button>
            ))}
          </div>
        </div>
      ) : pricing.warningType ? (
        <div className="mt-3 flex flex-col gap-2 rounded-2xl bg-orange-50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-xs font-bold text-blue-900">
            <span className="material-icon !text-base text-blue-600">info</span>
            {pricing.warningType === 'multi-pack'
              ? `This recipe requires ${requiredBaseText} ${ingredient.ingredientName}. One pack contains only ${packSize}. You need ${pricing.packsNeeded} packs.`
              : `Smallest available pack is ${packSize}. You will buy ${packSize} and use ${requiredBaseText}.`}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="rounded-xl border border-green-200 bg-white px-6 py-2 text-xs font-black text-green-700 transition hover:bg-green-50">
              Change
            </button>
            <button
              type="button"
              onClick={onAccept}
              className={`shrink-0 rounded-xl px-6 py-2 text-xs font-black transition ${
                accepted ? 'bg-green-700 text-white' : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              ✓ {accepted ? 'Accepted' : 'Accept'}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={onAccept}
            className={`rounded-xl px-3 py-1.5 text-[11px] font-black transition ${
              accepted ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-orange-50 hover:text-orange-600'
            }`}
          >
            {accepted ? 'Accepted' : 'Accept'}
          </button>
        </div>
      )}

      <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-3">
        <button
          type="button"
          onClick={onToggleAtHome}
          className={`rounded-xl px-4 py-2 text-xs font-black transition ${
            atHome
              ? 'bg-green-600 text-white'
              : 'border border-green-200 bg-white text-green-700 hover:bg-green-50'
          }`}
        >
          {atHome ? 'At Home' : 'I Have This'}
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-black text-red-600 transition hover:bg-red-50"
        >
          Remove
        </button>
      </div>
    </section>
  );
}
