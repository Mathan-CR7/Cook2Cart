import { formatBaseQuantity, money } from './cartMath';
import { getDisplayQuantityWithConversion, getIngredientNutrition } from '../../utils/nutritionEstimator';
import { formatQty, formatUnit } from '../../utils/quantityFormatter';

export default function CartSummary({
  items,
  recipeCost,
  purchaseCost,
  unusedInventoryValue,
  onConfirm,
  onCancel,
  disabled,
}) {
  const itemNutrition = items.map((item) => {
    const ingredientName = item.ingredient?.ingredientName || item.name || '';
    const qty = formatQty(item.ingredient?.recipeQuantity || item.ingredient?.quantity || 1);
    const unit = formatUnit(item.ingredient?.recipeUnit || item.ingredient?.unit || 'pcs', qty);
    return {
      key: item.key,
      converted: getDisplayQuantityWithConversion(ingredientName, qty, unit),
      nutrition: getIngredientNutrition(ingredientName, qty, unit),
    };
  });

  const nutritionByKey = new Map(itemNutrition.map((item) => [item.key, item]));
  const totalNutrition = itemNutrition.reduce((total, item) => ({
    calories: total.calories + Number(item.nutrition.calories || 0),
    protein: total.protein + Number(item.nutrition.protein || 0),
    carbohydrates: total.carbohydrates + Number(item.nutrition.carbohydrates || 0),
    fat: total.fat + Number(item.nutrition.fat || 0),
  }), { calories: 0, protein: 0, carbohydrates: 0, fat: 0 });

  return (
    <aside className="rounded-[22px] border border-gray-200 bg-white p-6 shadow-[0_16px_40px_rgba(30,34,41,0.08)] lg:sticky lg:top-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-gray-900">Cart Summary</h2>
        <span className="rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-black text-green-700">
          {items.length} Items
        </span>
      </div>

      <div className="mt-5 max-h-[42vh] space-y-3 overflow-y-auto pr-1">
        {items.length === 0 ? (
          <p className="rounded-2xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">Select products to build your cart.</p>
        ) : (
          items.map((item) => (
            <div key={item.key} className="flex gap-3 border-b border-gray-100 pb-3 last:border-0">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
                {item.product?.imageUrl ? (
                  <img src={item.product.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-300">
                    <span className="material-icon">shopping_basket</span>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="line-clamp-1 text-sm font-black text-gray-900">{item.name}</p>
                    <p className="mt-1 text-xs font-medium text-gray-500">{item.packLabel}</p>
                  </div>
                  <span className="shrink-0 text-sm font-black text-gray-900">{money(item.purchaseCost)}</span>
                </div>
                <div className="mt-2 flex justify-between text-xs font-medium text-gray-500">
                  <span>Packs: {item.packsNeeded || 1}</span>
                  <span>Usage Cost: {money(item.recipeCost)}</span>
                </div>
                {nutritionByKey.get(item.key)?.converted ? (
                  <div className="mt-1 text-xs font-semibold text-gray-500">
                    Required: {nutritionByKey.get(item.key).converted}
                  </div>
                ) : null}
                <div className="mt-1 text-xs font-black text-green-700">
                  {nutritionByKey.get(item.key)?.nutrition.calories || 0} kcal
                </div>
                {item.unusedQuantity ? (
                  <div className="mt-1 text-xs font-medium text-orange-600">
                    Unused: {formatBaseQuantity(item.unusedQuantity, item.pricing?.required?.type)}
                  </div>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50 p-4">
        <h3 className="mb-3 text-sm font-black text-gray-900">Price Summary</h3>
        <div className="flex justify-between text-sm font-medium text-gray-600">
          <span>Total Purchase Cost</span>
          <span className="font-black text-gray-900">{money(purchaseCost)}</span>
        </div>
        <div className="mt-3 flex justify-between text-sm font-medium text-gray-600">
          <span>Total Recipe Usage Cost</span>
          <span className="font-black text-gray-900">{money(recipeCost)}</span>
        </div>
        <div className="mt-3 flex justify-between text-sm font-medium text-gray-600">
          <span>Total Unused Inventory Value</span>
          <span className="font-black text-orange-600">{money(unusedInventoryValue)}</span>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-green-100 bg-green-50 p-4">
        <h3 className="mb-3 text-sm font-black text-gray-900">Recipe Nutrition</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="block text-xs font-bold text-green-700/70">Calories</span>
            <span className="font-black text-gray-900">{Math.round(totalNutrition.calories)} kcal</span>
          </div>
          <div>
            <span className="block text-xs font-bold text-green-700/70">Protein</span>
            <span className="font-black text-gray-900">{Math.round(totalNutrition.protein * 10) / 10}g</span>
          </div>
          <div>
            <span className="block text-xs font-bold text-green-700/70">Carbs</span>
            <span className="font-black text-gray-900">{Math.round(totalNutrition.carbohydrates * 10) / 10}g</span>
          </div>
          <div>
            <span className="block text-xs font-bold text-green-700/70">Fat</span>
            <span className="font-black text-gray-900">{Math.round(totalNutrition.fat * 10) / 10}g</span>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-green-50 p-4">
        <div className="flex gap-3">
          <span className="material-icon text-green-700">inventory_2</span>
          <div>
            <p className="text-sm font-black text-gray-900">
              Remaining Inventory <span className="text-green-700">{money(unusedInventoryValue)}</span>
            </p>
            <p className="mt-1 text-xs font-medium leading-relaxed text-gray-600">
              You are purchasing ingredient packs larger than the recipe requirement. Remaining quantities can be used for future recipes.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <button
          type="button"
          disabled={disabled || items.length === 0}
          onClick={onConfirm}
          className="gradient-bg flex items-center justify-center gap-2 rounded-2xl py-4 text-sm font-black text-white shadow-lg transition hover:opacity-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="material-icon !text-lg">check</span>
          Confirm Cart
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-2xl border border-gray-200 py-4 text-sm font-black text-gray-800 transition hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>

      <p className="mt-4 flex items-center justify-center gap-2 text-xs font-medium text-gray-400">
        <span className="material-icon !text-sm">lock</span>
        Your location and cart are secure
      </p>
    </aside>
  );
}
