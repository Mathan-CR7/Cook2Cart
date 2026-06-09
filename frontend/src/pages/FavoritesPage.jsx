import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import AppBar from '../components/AppBar';
import BottomNav from '../components/BottomNav';
import PremiumBackground from '../components/PremiumBackground';
import DownloadButton from '../components/DownloadButton';
import { recipeCatalogService, videoCatalogService } from '../utils/api';
import { formatQty, formatUnit } from '../utils/quantityFormatter';
import { getDisplayQuantityWithConversion } from '../utils/nutritionEstimator';

export default function FavoritesPage() {
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const savedRecipes = state.savedRecipes || [];
  const [expandedId, setExpandedId] = useState(null);
  const [removingId, setRemovingId] = useState(null);

  const handleRemove = (recipe) => {
    setRemovingId(recipe.id);
    if (state.user?.id && recipe.dbVideoId) {
      videoCatalogService.deleteUserAction(state.user.id, recipe.dbVideoId, 'SAVED').catch((err) => {
        console.error('Failed to remove saved recipe from database:', err);
      });
    }
    setTimeout(() => {
      dispatch({ type: 'REMOVE_SAVED_RECIPE', payload: recipe.id });
      setRemovingId(null);
      if (expandedId === recipe.id) setExpandedId(null);
    }, 300);
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  const mapIngredient = (ingredient) => ({
    id: ingredient.id,
    ingredientId: ingredient.ingredientId,
    dbIngredientId: ingredient.ingredientId,
    name: ingredient.ingredientName,
    recipeQuantity: ingredient.recipeQuantity,
    recipeUnit: ingredient.recipeUnit,
    quantity: ingredient.quantity,
    unit: ingredient.unit,
    estimated: ingredient.estimated,
    source: ingredient.source,
    confidence: ingredient.confidence,
  });

  const openStoredRecipe = async (recipe) => {
    const recipeIngredients = recipe.ingredients || [];
    const recipeInstructions = recipe.instructions || [];

    if (recipeIngredients.length > 0 || recipeInstructions.length > 0) {
      dispatch({
        type: 'SET_SELECTED_RECIPE',
        payload: {
          ...recipe,
          id: recipe.videoId || recipe.id,
          videoId: recipe.videoId || recipe.id,
        },
      });
      dispatch({
        type: 'FINISH_AI_PROCESSING',
        payload: { ingredients: recipeIngredients, instructions: recipeInstructions },
      });
      navigate(`/review/${recipe.videoId || recipe.id}`);
      return;
    }

    if (recipe.dbVideoId) {
      try {
        const res = await recipeCatalogService.getLatestRecipeByVideo(recipe.dbVideoId);
        const savedRecipe = res.data;
        const ingredients = (savedRecipe.ingredients || []).map(mapIngredient);
        const instructions = (savedRecipe.instructions || []).map((item) => item.instruction);

        dispatch({
          type: 'SET_SELECTED_RECIPE',
          payload: {
            ...recipe,
            id: recipe.videoId || recipe.id,
            videoId: recipe.videoId || recipe.id,
            dbRecipeId: savedRecipe.id,
            dbVideoId: savedRecipe.videoId || recipe.dbVideoId,
            title: savedRecipe.recipeName || recipe.title,
            thumbnailUrl: savedRecipe.thumbnailUrl || recipe.thumbnailUrl,
          },
        });
        dispatch({ type: 'FINISH_AI_PROCESSING', payload: { ingredients, instructions } });
        navigate(`/review/${recipe.videoId || recipe.id}`);
        return;
      } catch (err) {
        console.error('Failed to load extracted recipe from database:', err);
      }
    }

    navigate(`/review/${recipe.videoId || recipe.id}`);
  };

  return (
    <div className="c2c-root min-h-screen pb-20 overflow-x-hidden relative bg-[white]">
      <PremiumBackground />
      <AppBar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">

        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Saved Recipes</h1>
            <p className="text-gray-500 text-sm mt-1">
              {savedRecipes.length === 0 ? 'No saved recipes yet' : `${savedRecipes.length} recipe${savedRecipes.length > 1 ? 's' : ''} saved`}
            </p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-red-100 rounded-2xl flex items-center justify-center">
            <svg className="w-6 h-6 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </div>
        </div>

        {/* Empty State */}
        {savedRecipes.length === 0 ? (
          <div className="text-center py-24 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-red-100 rounded-3xl flex items-center justify-center mx-auto mb-5">
              <svg className="w-9 h-9 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No Saved Recipes</h2>
            <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">
              Process a recipe video and click <span className="font-semibold text-orange-500">Save Recipe</span> on the review page to save it here.
            </p>
            <button
              onClick={() => navigate('/search')}
              className="gradient-bg text-white px-6 py-3 rounded-xl font-semibold text-sm hover:opacity-90 active:scale-95 transition-all inline-flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search Recipes
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {savedRecipes.map((recipe) => {
              const isExpanded = expandedId === recipe.id;
              const isRemoving = removingId === recipe.id;

              return (
                <div
                  key={recipe.id}
                  className={`bg-white border rounded-3xl shadow-sm overflow-hidden transition-all duration-300 ${
                    isRemoving ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                  } ${isExpanded ? 'border-orange-200 shadow-md' : 'border-gray-200 hover:border-orange-200 hover:shadow-md'}`}
                >
                  {/* Recipe Header Row */}
                  <div className="flex items-center gap-4 p-4">
                    {/* Thumbnail */}
                    <img
                      src={recipe.thumbnailUrl}
                      alt={recipe.title}
                      className="w-20 h-14 rounded-2xl object-cover flex-shrink-0 bg-gray-100"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 text-sm leading-snug truncate">{recipe.title}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-400">
                          {recipe.ingredients?.length || 0} ingredients
                        </span>
                        <span className="w-1 h-1 rounded-full bg-gray-300 inline-block" />
                        <span className="text-xs text-gray-400">
                          Saved {formatDate(recipe.savedAt)}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Expand toggle */}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : recipe.id)}
                        className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-orange-50 hover:text-orange-500 hover:border-orange-200 transition-all"
                        title={isExpanded ? 'Hide ingredients' : 'Show ingredients'}
                      >
                        <svg
                          className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      <button
                        onClick={() => openStoredRecipe(recipe)}
                        className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-orange-50 hover:text-orange-500 hover:border-orange-200 transition-all"
                        title="Open saved recipe"
                      >
                        <span className="material-icon !text-lg">visibility</span>
                      </button>

                      {/* Download */}
                      <DownloadButton size="sm" recipe={recipe} />

                      {/* Remove */}
                      <button
                        onClick={() => handleRemove(recipe)}
                        className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all"
                        title="Remove from saved"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Expandable Ingredients Panel */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50/60 px-5 py-4">
                      <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider mb-3">
                        Ingredients ({recipe.ingredients?.length || 0})
                      </p>
                      {recipe.ingredients && recipe.ingredients.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {recipe.ingredients.map((ing, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-3 py-2"
                            >
                              <span className="text-gray-800 text-sm font-medium truncate">{ing.name}</span>
                              <span className="text-orange-600 font-bold text-xs ml-2 flex-shrink-0">
                                {getDisplayQuantityWithConversion(ing.name || '', formatQty(ing.recipeQuantity || ing.quantity || ''), formatUnit(ing.recipeUnit || ing.unit || 'pcs', ing.recipeQuantity || ing.quantity))}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-400 text-sm text-center py-3">No ingredient data.</p>
                      )}

                      {recipe.instructions && recipe.instructions.length > 0 && (
                        <div className="mt-4">
                          <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider mb-3">
                            Instructions ({recipe.instructions.length} steps)
                          </p>
                          <div className="flex flex-col gap-2">
                            {recipe.instructions.map((step, idx) => (
                              <div key={idx} className="flex items-start gap-3 bg-white border border-gray-200 rounded-xl px-3 py-2.5">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-100 text-orange-600 font-bold text-[10px] flex items-center justify-center">
                                  {String(idx + 1).padStart(2, '0')}
                                </span>
                                <p className="text-gray-700 text-xs leading-relaxed">{step}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
