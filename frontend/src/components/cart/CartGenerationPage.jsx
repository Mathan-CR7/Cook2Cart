import RecipeSidebar from './RecipeSidebar';
import IngredientProductCard from './IngredientProductCard';
import CartSummary from './CartSummary';
import ConfirmCartModal from './ConfirmCartModal';

const steps = ['Video Processed', 'Ingredients Extracted', 'Location Selected', 'Cart Generated'];

export default function CartGenerationPage({
  recipeTitle,
  recipeId,
  thumbnail,
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
  return (
    <main className="relative z-10 mx-auto w-full max-w-[1780px] px-6 pt-28 sm:px-8 lg:px-10 2xl:px-14">
      <header className="mb-6 rounded-[22px] border border-orange-100 bg-white/85 px-4 py-4 shadow-sm backdrop-blur-xl">
        <div className="grid gap-4 xl:grid-cols-[1fr_300px] xl:items-center">
          <div className="hidden items-center justify-center md:flex">
          {steps.map((step, index) => {
            const done = index < steps.length - 1;
            const active = index === steps.length - 1;
            return (
              <div key={step} className="flex min-w-0 flex-1 items-center last:flex-none">
                <div className="flex min-w-[120px] flex-col items-center gap-1">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black text-white shadow-sm ${
                    active ? 'bg-orange-500' : done ? 'bg-green-700' : 'bg-gray-300'
                  }`}>
                    {done ? <span className="material-icon !text-lg">check</span> : index + 1}
                  </span>
                  <span className={`text-xs font-semibold ${active ? 'text-orange-600' : 'text-gray-700'}`}>{step}</span>
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

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(620px,1fr)_390px] xl:grid-cols-[390px_minmax(720px,1fr)_410px] 2xl:grid-cols-[420px_minmax(820px,1fr)_430px] lg:items-start">
        <RecipeSidebar
          thumbnail={thumbnail}
          recipeTitle={recipeTitle}
          recipeId={recipeId}
          ingredients={ingredients}
        />

        <section className="min-w-0">
          <div className="mb-4 flex items-center justify-between gap-3 rounded-[22px] border border-gray-200 bg-white px-6 py-5 shadow-sm">
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
            <div className="flex flex-col gap-3">
              {suggestionGroups.map((group) => (
                <IngredientProductCard
                  key={group.recipeIngredientId}
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
