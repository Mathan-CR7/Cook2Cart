import { useEffect, useRef, useState } from 'react';
import RecipeSidebar from './RecipeSidebar';
import IngredientProductCard from './IngredientProductCard';
import CartSummary from './CartSummary';
import ConfirmCartModal from './ConfirmCartModal';

const steps = ['Video Processed', 'Ingredients Extracted', 'Location Selected', 'Cart Generated'];

const SOURCE_LABELS = {
  description: { label: 'Description', color: 'text-blue-600 bg-blue-50' },
  transcript:  { label: 'Transcript',  color: 'text-purple-600 bg-purple-50' },
  audio:       { label: 'Audio',       color: 'text-green-600 bg-green-50' },
  image:       { label: 'Video Frame', color: 'text-orange-600 bg-orange-50' },
};

const getExtractionSourceLabel = (ingredients) => {
  if (!ingredients || !ingredients.length) return null;
  const counts = {};
  ingredients.forEach((ing) => {
    const src = (ing.source || '').toLowerCase().replace(/_/g, '');
    for (const k of Object.keys(SOURCE_LABELS)) {
      if (src.includes(k)) { counts[k] = (counts[k] || 0) + 1; break; }
    }
  });
  if (!Object.keys(counts).length) return null;
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  return SOURCE_LABELS[top];
};

export default function CartGenerationPage({
  recipeTitle,
  recipeId,
  thumbnail,
  duration,
  servings,
  locationLabel,
  ingredients,
  suggestionGroups,
  selectedProducts,
  vegetableSelections,
  acceptedPacks,
  atHomeIngredients,
  summaryItems,
  recipeCost,
  purchaseCost,
  unusedInventoryValue,
  loading,
  saving,
  error,
  confirmOpen,
  getIngredientQuantity,
  onSelectProduct,
  onSelectVegetableOption,
  onAccept,
  onToggleAtHome,
  onRemoveIngredient,
  onOpenConfirm,
  onCancel,
  onCloseConfirm,
  onConfirm,
}) {
  const productsListRef = useRef(null);
  const [activeIngredientId, setActiveIngredientId] = useState(null);

  useEffect(() => {
    if (suggestionGroups.length > 0 && !activeIngredientId) {
      setActiveIngredientId(suggestionGroups[0].recipeIngredientId);
    }
  }, [suggestionGroups, activeIngredientId]);

  const updateActiveIngredientFromScroll = () => {
    const container = productsListRef.current;

    if (!container || suggestionGroups.length === 0) return;

    const containerTop = container.getBoundingClientRect().top;
    let nearestGroup = suggestionGroups[0];
    let nearestDistance = Number.POSITIVE_INFINITY;

    suggestionGroups.forEach((group) => {
      const card = document.getElementById(`product-card-${group.recipeIngredientId}`);
      if (!card) return;

      const distance = Math.abs(card.getBoundingClientRect().top - containerTop);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestGroup = group;
      }
    });

    setActiveIngredientId(nearestGroup.recipeIngredientId);
  };

  const handleFocusIngredient = (ingredient) => {
    const match = suggestionGroups.find((group) => {
      const ingredientId = ingredient.recipeIngredientId || ingredient.id;
      const idMatch = String(group.recipeIngredientId || '') === String(ingredientId || '');
      const nameMatch = String(group.ingredientName || '').trim().toLowerCase()
        === String(ingredient.ingredientName || ingredient.name || '').trim().toLowerCase();

      return idMatch || nameMatch;
    });
    const ingredientId = match?.recipeIngredientId || ingredient.recipeIngredientId || ingredient.id || ingredient.ingredientName;
    const target = document.getElementById(`product-card-${ingredientId}`);

    if (!target) return;

    setActiveIngredientId(ingredientId);
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const activeIngredient = suggestionGroups.find(
    (group) => String(group.recipeIngredientId) === String(activeIngredientId)
  );

  return (
    <main className="relative z-10 mx-auto w-full max-w-[1680px] px-4 pt-28 sm:px-6 lg:px-8 2xl:px-10">
      <header className="mb-6 rounded-[22px] border border-orange-100 bg-white/85 px-4 py-4 shadow-sm backdrop-blur-xl">
        <div className="grid gap-4 xl:grid-cols-[1fr_300px] xl:items-center">
          <div className="hidden items-center justify-center md:flex">
            {steps.map((step, index) => {
              const done = index < steps.length - 1;
              const active = index === steps.length - 1;
              const isExtractStep = index === 1;
              const srcLabel = isExtractStep ? getExtractionSourceLabel(ingredients) : null;
              return (
                <div key={step} className="flex min-w-0 flex-1 items-center last:flex-none">
                  <div className="flex min-w-[120px] flex-col items-center gap-1">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black text-white shadow-sm ${
                      active ? 'bg-orange-500' : done ? 'bg-green-700' : 'bg-gray-300'
                    }`}>
                      {done ? <span className="material-icon !text-lg">check</span> : index + 1}
                    </span>
                    <span className={`text-xs font-semibold ${active ? 'text-orange-600' : 'text-gray-700'}`}>{step}</span>
                    {srcLabel && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${srcLabel.color}`}>
                        {srcLabel.label}
                      </span>
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`mx-2 h-0.5 flex-1 ${index < steps.length - 2 ? 'bg-green-700' : 'bg-orange-500'}`} />
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-start xl:justify-end">
            <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <span className="material-icon !text-lg text-green-700">location_on</span>
              <span className="max-w-[190px] truncate text-sm font-black text-gray-800">{locationLabel}</span>
              <button type="button" className="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-black text-green-700">
                Change
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 md:hidden">
          {steps.map((step, index) => (
            <div key={step} className="flex items-center gap-3 rounded-2xl bg-orange-50 px-3 py-2.5">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${
                index === steps.length - 1 ? 'bg-orange-500 text-white' : 'bg-green-500 text-white'
              }`}>
                {index + 1}
              </span>
              <span className="text-xs font-black text-gray-800">{step}</span>
            </div>
          ))}
        </div>
      </header>

      {error && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-5 lg:h-[calc(100vh-190px)] lg:grid-cols-[300px_minmax(0,1fr)_320px] lg:items-stretch lg:overflow-hidden xl:grid-cols-[340px_minmax(0,1fr)_360px] 2xl:grid-cols-[390px_minmax(0,1fr)_410px]">
        <RecipeSidebar
          thumbnail={thumbnail}
          recipeTitle={recipeTitle}
          recipeId={recipeId}
          duration={duration}
          servings={servings}
          ingredients={ingredients}
          onSelectIngredient={handleFocusIngredient}
          activeIngredientId={activeIngredientId}
          activeIngredientName={activeIngredient?.ingredientName}
        />

        <section className="flex min-h-0 min-w-0 flex-col">
          <div className="mb-4 flex shrink-0 items-center justify-between gap-3 rounded-[22px] border border-gray-200 bg-white px-6 py-5 shadow-sm">
            <div>
              <h1 className="text-2xl font-black text-gray-900">Choose Products</h1>
              <p className="mt-1 text-sm font-medium text-gray-500">Select the best products for your recipe ingredients.</p>
            </div>
            <button type="button" className="hidden items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-5 py-3 text-sm font-black text-green-700 sm:flex">
              <span className="material-icon !text-lg">auto_awesome</span>
              Smart Picks
            </button>
          </div>

          {loading ? (
            <div className="rounded-[1.35rem] border border-gray-200 bg-white px-6 py-16 text-center shadow-sm">
              <span className="material-icon animate-spin text-4xl text-orange-500">progress_activity</span>
              <p className="mt-3 text-sm font-bold text-gray-600">Loading product suggestions...</p>
            </div>
          ) : (
            <div
              ref={productsListRef}
              onScroll={updateActiveIngredientFromScroll}
              className="min-h-0 flex-1 scroll-smooth space-y-3 overflow-y-auto pr-2"
            >
              {suggestionGroups.map((group) => (
                <IngredientProductCard
                  key={group.recipeIngredientId}
                  cardId={`product-card-${group.recipeIngredientId}`}
                  ingredient={getIngredientQuantity(group)}
                  products={group.suggestions || []}
                  selectedProductKey={selectedProducts[group.recipeIngredientId]}
                  vegetableOption={vegetableSelections[group.recipeIngredientId]}
                  accepted={acceptedPacks[group.recipeIngredientId]}
                  atHome={atHomeIngredients[group.recipeIngredientId]}
                  onSelectProduct={(productKey) => onSelectProduct(group.recipeIngredientId, productKey)}
                  onSelectVegetableOption={(option) => onSelectVegetableOption(group.recipeIngredientId, option)}
                  onAccept={() => onAccept(group.recipeIngredientId)}
                  onToggleAtHome={() => onToggleAtHome(group.recipeIngredientId)}
                  onRemove={() => onRemoveIngredient(group.recipeIngredientId)}
                />
              ))}
            </div>
          )}
        </section>

        <CartSummary
          items={summaryItems}
          recipeCost={recipeCost}
          purchaseCost={purchaseCost}
          unusedInventoryValue={unusedInventoryValue}
          onConfirm={onOpenConfirm}
          onCancel={onCancel}
          disabled={loading || saving}
        />
      </div>

      <ConfirmCartModal
        open={confirmOpen}
        items={summaryItems}
        total={purchaseCost}
        saving={saving}
        onCancel={onCloseConfirm}
        onConfirm={onConfirm}
      />
    </main>
  );
}
