import { getDisplayQuantityWithConversion } from '../../utils/nutritionEstimator';
import { formatQty, formatUnit } from '../../utils/quantityFormatter';

const getIngredientQuantityText = (ingredient) => {
  const ingredientName = ingredient.ingredientName || ingredient.name || 'Ingredient';
  const qty = formatQty(ingredient.recipeQuantity ?? ingredient.quantity ?? '');
  const unit = formatUnit(ingredient.recipeUnit || ingredient.unit || 'pcs', qty);
  return getDisplayQuantityWithConversion(ingredientName, qty, unit);
};

const formatDuration = (duration) => {
  if (!duration) return '';

  if (typeof duration === 'number') {
    const minutes = Math.max(1, Math.round(duration / 60));
    return `${minutes} mins`;
  }

  const value = String(duration).trim();
  if (!value) return '';
  if (/^\d+$/.test(value)) {
    const minutes = Math.max(1, Math.round(Number(value) / 60));
    return `${minutes} mins`;
  }
  if (/^PT/i.test(value)) {
    const hours = Number(value.match(/(\d+)H/i)?.[1] || 0);
    const minutes = Number(value.match(/(\d+)M/i)?.[1] || 0);
    const seconds = Number(value.match(/(\d+)S/i)?.[1] || 0);
    const totalMinutes = Math.max(1, Math.round(hours * 60 + minutes + seconds / 60));
    return `${totalMinutes} mins`;
  }
  return value;
};

const normalizeName = (value = '') => String(value).trim().toLowerCase();

export default function RecipeSidebar({
  thumbnail,
  recipeTitle,
  recipeId,
  ingredients,
  duration,
  servings,
  onSelectIngredient,
  activeIngredientId,
  activeIngredientName,
}) {
  const durationText = formatDuration(duration);
  const servingsText = servings ? `${servings} ${Number(servings) === 1 ? 'serving' : 'servings'}` : '';

  return (
    <aside className="flex h-full min-h-0 flex-col rounded-[22px] border border-gray-200 bg-white p-5 shadow-[0_10px_30px_rgba(30,34,41,0.05)]">
      <div className="relative shrink-0 overflow-hidden rounded-2xl bg-gray-100">
        {thumbnail ? (
          <img src={thumbnail} alt={recipeTitle} className="h-52 w-full object-cover" />
        ) : (
          <div className="flex h-52 items-center justify-center text-gray-300">
            <span className="material-icon text-5xl">restaurant_menu</span>
          </div>
        )}
        <span className="absolute right-3 top-3 rounded-xl bg-white px-3 py-1.5 text-xs font-black text-gray-900 shadow-sm">
          Recipe ID: {recipeId}
        </span>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/95 text-orange-500 shadow-lg">
            <span className="material-icon fill">play_arrow</span>
          </span>
        </div>
      </div>

      <div className="mt-4 shrink-0">
        <h2 className="line-clamp-2 text-xl font-black leading-tight text-gray-900">{recipeTitle}</h2>
        {(durationText || servingsText) && (
          <div className="mt-3 flex items-center gap-4 text-sm font-semibold text-gray-500">
            {durationText && (
              <span className="flex items-center gap-1.5"><span className="material-icon !text-base">schedule</span>{durationText}</span>
            )}
            {servingsText && (
              <span className="flex items-center gap-1.5"><span className="material-icon !text-base">group</span>{servingsText}</span>
            )}
          </div>
        )}
      </div>

      <div className="mt-5 flex min-h-0 flex-1 flex-col">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-black text-gray-900">Extracted Ingredients</h3>
          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700">
            {ingredients.length} Items
          </span>
        </div>

        <div className="min-h-0 overflow-hidden rounded-2xl border border-gray-100">
          {ingredients.length === 0 ? (
            <p className="rounded-2xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">No ingredients loaded.</p>
          ) : (
            <div className="max-h-full overflow-y-auto">
              {ingredients.map((ingredient) => {
                const ingredientId = ingredient.recipeIngredientId || ingredient.id;
                const ingredientName = ingredient.ingredientName || ingredient.name || 'Ingredient';
                const isActive =
                  String(ingredientId || '') === String(activeIngredientId || '') ||
                  normalizeName(ingredientName) === normalizeName(activeIngredientName);

                return (
              <button
                type="button"
                key={ingredient.recipeIngredientId || ingredient.id || ingredientName}
                onClick={() => onSelectIngredient?.(ingredient)}
                className={`flex w-full items-center justify-between gap-3 border-b border-gray-100 px-3 py-3 text-left transition last:border-0 hover:bg-orange-50 ${
                  isActive ? 'bg-orange-50 shadow-[inset_3px_0_0_#ff6b35]' : 'bg-white'
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-orange-500 shadow-sm">
                    <span className="material-icon !text-lg">restaurant</span>
                  </span>
                  <div className="min-w-0">
                    <span className="block truncate text-sm font-black text-gray-800">{ingredientName}</span>
                  </div>
                </div>
                <span className="shrink-0 text-xs font-black text-orange-600">
                  {getIngredientQuantityText(ingredient)}
                </span>
              </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 shrink-0 rounded-2xl bg-orange-50 px-4 py-4">
        <div className="flex gap-3">
          <span className="material-icon text-yellow-500">lightbulb</span>
          <div>
            <p className="text-sm font-black text-gray-900">Quantities are estimated.</p>
            <p className="mt-1 text-xs font-medium text-gray-600">You can adjust them in the cart.</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
