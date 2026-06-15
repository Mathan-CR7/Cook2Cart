import { useMemo } from 'react';
import ProductDropdown from './ProductDropdown';
import {
  calculateProductPricing,
  displayQty,
  formatBaseQuantity,
  getEffectivePackQuantity,
  getBrandName,
  getPackSize,
  getProductPrice,
  getProductImageUrl,
  isMarketProduct,
  money,
  vegetableOptions,
} from './cartMath';
import { getDisplayQuantityWithConversion, getIngredientNutrition } from '../../utils/nutritionEstimator';
import { formatQty, formatUnit } from '../../utils/quantityFormatter';

const productKey = (product) => String(product?.id || product?.barcode || product?.productName || '');

const hasWeightUnitText = (value = '') => /\b(kg|kilogram|kilograms|g|gram|grams)\b/i.test(String(value));

export default function IngredientProductCard({
  cardId,
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
    const ingredientName = ingredient.ingredientName || ingredient.name || 'Ingredient';
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-black text-gray-900">{ingredientName}</h3>
        <p className="mt-1 text-xs text-gray-500">No product suggestions found.</p>
      </section>
    );
  }

  const ingredientName = ingredient.ingredientName || ingredient.name || 'Ingredient';
  const required = displayQty(ingredient);
  const requiredQty = formatQty(ingredient.recipeQuantity ?? ingredient.quantity ?? '');
  const requiredUnit = formatUnit(ingredient.recipeUnit || ingredient.unit || 'pcs', requiredQty);
  const convertedRequired = getDisplayQuantityWithConversion(ingredientName, requiredQty, requiredUnit);
  const nutrition = getIngredientNutrition(ingredientName, requiredQty || 1, requiredUnit);
  const packSize = getPackSize(selectedProduct);
  const packPrice = getProductPrice(selectedProduct);
  const marketProduct = isMarketProduct(selectedProduct);
  const selectedVegOption = vegetableOptions.find((option) => option.label === vegetableOption) || vegetableOptions[0];
  const pricing = calculateProductPricing(ingredient, selectedProduct, selectedVegOption);
  const requiredBaseText = pricing.required ? formatBaseQuantity(pricing.required.value, pricing.required.type) : required;
  const effectivePack = getEffectivePackQuantity(selectedProduct, ingredientName);
  const effectivePackText = effectivePack ? formatBaseQuantity(effectivePack.value, effectivePack.type) : '';
  const packBaseText = pricing.pack ? formatBaseQuantity(pricing.pack.value, pricing.pack.type) : effectivePackText || packSize;
  const shouldShowConvertedPackOnly = pricing.pack?.type === 'volume' && hasWeightUnitText(packSize);
  const packDetailText = shouldShowConvertedPackOnly
    ? packBaseText
    : effectivePackText && effectivePackText !== packSize
      ? `${packSize} (${effectivePackText})`
      : packSize;
  const totalPackQuantity = pricing.pack?.value ? pricing.pack.value * (pricing.packsNeeded || 1) : 0;

  return (
    <section id={cardId} className={`scroll-mt-3 rounded-[18px] border bg-white p-3.5 shadow-[0_8px_24px_rgba(30,34,41,0.04)] transition hover:border-orange-200 ${
      atHome ? 'border-green-200 bg-green-50/30' : 'border-gray-200'
    }`}>
      <div className="mb-3 flex items-start justify-between gap-3 px-1">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-600">
            <span className="material-icon !text-xl">restaurant</span>
          </span>
          <div>
            <h3 className="text-lg font-black leading-tight text-gray-900">{ingredientName}</h3>
            <p className="mt-0.5 text-sm font-medium text-gray-500">
              Required: <span className="font-black text-orange-600">{required || 'As needed'}</span>
            </p>
            <p className="mt-1 text-xs font-bold text-gray-400">
              Converted: <span className="text-gray-700">{convertedRequired || 'As needed'}</span>
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
        <div className="grid gap-3 lg:grid-cols-[120px_minmax(0,1fr)_115px_125px] xl:grid-cols-[140px_minmax(0,1fr)_125px_130px] lg:items-center">
          <div className="flex items-center justify-center rounded-xl border border-gray-100 bg-gray-50 p-2">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-white xl:h-24 xl:w-24">
              <img
                src={getProductImageUrl(selectedProduct, ingredientName)}
                alt={selectedProduct.productName}
                className="h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.src = getProductImageUrl(null, ingredientName);
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
              <p className="text-sm font-medium text-gray-500">Pack Size: <span className="font-bold text-gray-800">{packDetailText}</span></p>
            </div>
          </div>

          <div className="rounded-2xl bg-white px-2">
            <p className="text-xs font-semibold text-gray-500">{marketProduct ? 'Market Price' : 'One Pack Price'}</p>
            <p className="mt-1 text-xl font-black text-orange-600 xl:text-2xl">{money(packPrice)}</p>
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
          <div className="mt-3 grid gap-2 rounded-2xl bg-gray-50 p-3 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <span className="block text-[10px] font-black uppercase text-gray-400">Required Quantity</span>
              <span className="text-xs font-black text-gray-900">{requiredBaseText}</span>
            </div>
            <div>
              <span className="block text-[10px] font-black uppercase text-gray-400">Pack Size</span>
              <span className="text-xs font-black text-gray-900">{packDetailText}</span>
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
          </div>
        )}

        {pricing.required?.value && pricing.pack?.value ? (
          <div className="mt-2 rounded-xl bg-blue-50 px-3 py-2 text-[11px] font-bold text-blue-800">
            Calculated from {requiredBaseText} used out of {formatBaseQuantity(totalPackQuantity, pricing.pack.type)} purchased.
          </div>
        ) : null}

        <div className="mt-3 grid gap-2 rounded-2xl border border-green-100 bg-green-50/70 p-3 sm:grid-cols-4">
          <div>
            <span className="block text-[10px] font-black uppercase text-green-700/70">Calories</span>
            <span className="text-xs font-black text-gray-900">{nutrition.calories} kcal</span>
          </div>
          <div>
            <span className="block text-[10px] font-black uppercase text-green-700/70">Protein</span>
            <span className="text-xs font-black text-gray-900">{nutrition.protein}g</span>
          </div>
          <div>
            <span className="block text-[10px] font-black uppercase text-green-700/70">Carbs</span>
            <span className="text-xs font-black text-gray-900">{nutrition.carbohydrates}g</span>
          </div>
          <div>
            <span className="block text-[10px] font-black uppercase text-green-700/70">Fat</span>
            <span className="text-xs font-black text-gray-900">{nutrition.fat}g</span>
          </div>
        </div>
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
            {pricing.warningType === 'unknown-pack'
              ? `Pack size is unclear for this product, so recipe usage cost cannot be estimated accurately. Choose another brand or pack.`
              : pricing.warningType === 'multi-pack'
              ? `This recipe requires ${requiredBaseText} ${ingredientName}. One pack contains only ${packSize}. You need ${pricing.packsNeeded} packs.`
              : `Smallest available pack is ${packDetailText}. You will buy ${packSize} and use ${requiredBaseText}.`}
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
