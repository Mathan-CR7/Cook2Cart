import { useMemo } from 'react';
import BrandDropdown from './BrandDropdown';
import ProductCard from './ProductCard';
import {
  displayQty,
  getBrandName,
  getPackSize,
  getProductPrice,
  getRequiredBase,
  getUsageCost,
  getVegetablePurchaseCost,
  isMarketProduct,
  money,
  parsePackQuantity,
  vegetableOptions,
} from './cartMath';

export default function IngredientSection({
  ingredient,
  products,
  selectedProductKey,
  vegetableOption,
  accepted,
  onSelectProduct,
  onSelectVegetableOption,
  onAccept,
}) {
  const selectedProduct = useMemo(
    () => products.find((product) => String(product.id || product.barcode || product.productName) === String(selectedProductKey)) || products[0],
    [products, selectedProductKey]
  );

  if (!products.length) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-5">
        <h3 className="font-black text-gray-900">{ingredient.ingredientName}</h3>
        <p className="mt-1 text-sm text-gray-500">No product suggestions found yet.</p>
      </div>
    );
  }

  const required = displayQty(ingredient);
  const packSize = getPackSize(selectedProduct);
  const recipeCost = getUsageCost(ingredient, selectedProduct);
  const packPrice = getProductPrice(selectedProduct);
  const requiredBase = getRequiredBase(ingredient);
  const packBase = parsePackQuantity(packSize);
  const hasPackWarning = !isMarketProduct(selectedProduct)
    && requiredBase
    && packBase
    && requiredBase.type === packBase.type
    && packBase.value > requiredBase.value;
  const selectedVegOption = vegetableOptions.find((option) => option.label === vegetableOption) || vegetableOptions[0];
  const vegetablePurchaseCost = getVegetablePurchaseCost(selectedProduct, selectedVegOption);

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-lg font-black text-gray-900">{ingredient.ingredientName}</h3>
          <p className="mt-1 text-sm font-medium text-gray-500">Required: <span className="text-orange-600">{required || 'As needed'}</span></p>
        </div>
        <div className="min-w-[190px]">
          <BrandDropdown
            value={String(selectedProduct.id || selectedProduct.barcode || selectedProduct.productName)}
            products={products}
            getLabel={getBrandName}
            onChange={onSelectProduct}
          />
        </div>
      </div>

      <div className="mt-4">
        <ProductCard product={selectedProduct} selected />
      </div>

      {isMarketProduct(selectedProduct) ? (
        <div className="mt-4 rounded-2xl bg-green-50 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-green-900">Vegetable purchase quantity</p>
              <p className="mt-1 text-xs text-green-700">Estimated recipe cost: {money(recipeCost)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {vegetableOptions.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => onSelectVegetableOption(option.label)}
                  className={`rounded-xl px-3 py-2 text-xs font-black transition ${
                    selectedVegOption.label === option.label
                      ? 'bg-green-600 text-white'
                      : 'bg-white text-green-700 hover:bg-green-100'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-3 text-sm font-semibold text-green-900">
            Purchase estimate: {selectedVegOption.label.replace('Add ', '')} for {money(vegetablePurchaseCost)}
          </p>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl bg-orange-50 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <span className="block text-xs font-bold uppercase text-orange-400">Required</span>
              <span className="text-sm font-black text-gray-900">{required || 'As needed'}</span>
            </div>
            <div>
              <span className="block text-xs font-bold uppercase text-orange-400">Available Pack</span>
              <span className="text-sm font-black text-gray-900">{packSize}</span>
            </div>
            <div>
              <span className="block text-xs font-bold uppercase text-orange-400">Estimated Usage Cost</span>
              <span className="text-sm font-black text-gray-900">{money(recipeCost)}</span>
            </div>
          </div>

          {hasPackWarning && (
            <div className="mt-4 rounded-2xl border border-orange-200 bg-white p-4">
              <p className="text-sm font-semibold text-gray-800">
                This recipe requires {required} {ingredient.ingredientName}. The smallest available pack is {packSize}.
              </p>
              <p className="mt-1 text-xs text-gray-500">You will purchase {packSize} but use only {required} for this recipe.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onAccept}
                  className={`rounded-xl px-4 py-2 text-xs font-black transition ${
                    accepted ? 'bg-green-600 text-white' : 'bg-orange-500 text-white hover:bg-orange-600'
                  }`}
                >
                  {accepted ? 'Pack Accepted' : 'Accept Pack'}
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-black text-gray-600 hover:border-orange-300"
                >
                  Choose Another Brand
                </button>
              </div>
            </div>
          )}

          <p className="mt-3 text-sm font-semibold text-gray-900">Pack price: {money(packPrice)}</p>
        </div>
      )}
    </section>
  );
}
