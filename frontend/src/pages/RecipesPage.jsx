import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppBar from '../components/AppBar';
import BottomNav from '../components/BottomNav';
import PremiumBackground from '../components/PremiumBackground';
import DownloadButton from '../components/DownloadButton';
import { useApp } from '../context/AppContext';
import { recipeCatalogService } from '../utils/api';
import { formatQty, formatUnit } from '../utils/quantityFormatter';
import { getDisplayQuantityWithConversion } from '../utils/nutritionEstimator';

const getRecipeId = (recipe) => recipe.id || recipe.recipeId || recipe.dbRecipeId;

const getRecipeTitle = (recipe) =>
  recipe.recipeName || recipe.title || recipe.name || 'Cook2Cart Recipe';

const getRecipeThumbnail = (recipe) =>
  recipe.thumbnailUrl || recipe.thumbnail || recipe.video?.thumbnailUrl || null;

const getRecipeVideoId = (recipe) =>
  recipe.youtubeVideoId || recipe.videoId || recipe.video?.youtubeVideoId || recipe.id;

const getIngredientName = (ingredient) =>
  ingredient.ingredientName || ingredient.name || ingredient.masterIngredientName || 'Ingredient';

const getIngredientQuantity = (ingredient) => {
  const name = getIngredientName(ingredient);
  const qty = formatQty(ingredient.recipeQuantity ?? ingredient.quantity ?? '');
  const unit = formatUnit(ingredient.recipeUnit || ingredient.unit || 'pcs', qty);
  return getDisplayQuantityWithConversion(name, qty, unit);
};

const formatDate = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const mapRecipeForState = (recipe) => {
  const ingredients = (recipe.ingredients || []).map((ingredient) => ({
    id: ingredient.id,
    ingredientId: ingredient.ingredientId,
    dbIngredientId: ingredient.ingredientId,
    name: getIngredientName(ingredient),
    recipeQuantity: ingredient.recipeQuantity,
    recipeUnit: ingredient.recipeUnit,
    quantity: ingredient.quantity,
    unit: ingredient.unit,
    estimated: ingredient.estimated,
    source: ingredient.source,
    confidence: ingredient.confidence,
  }));

  const instructions = (recipe.instructions || []).map((item) =>
    item.instruction || item.text || item
  );

  return { ingredients, instructions };
};

const getRecipeDedupKey = (recipe) => {
  const videoId = recipe.videoId || recipe.dbVideoId || recipe.youtubeVideoId || recipe.video?.id;
  if (videoId) return `video:${videoId}`;

  return `name:${getRecipeTitle(recipe).trim().toLowerCase()}`;
};

const dedupeRecipes = (items = []) => {
  const unique = new Map();

  items.forEach((recipe) => {
    const key = getRecipeDedupKey(recipe);
    if (!unique.has(key)) {
      unique.set(key, recipe);
    }
  });

  return [...unique.values()];
};

export default function RecipesPage() {
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const [recipes, setRecipes] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadRecipes = async () => {
      if (!state.user?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const cacheKey = `recipes:user:${state.user.id}`;
        const cachedRecipes = sessionStorage.getItem(cacheKey);

        if (cachedRecipes) {
          setRecipes(dedupeRecipes(JSON.parse(cachedRecipes)));
          setLoading(false);
          return;
        }

        const response = await recipeCatalogService.getRecipesByUser(state.user.id);
        const nextRecipes = dedupeRecipes(Array.isArray(response.data) ? response.data : []);

        sessionStorage.setItem(cacheKey, JSON.stringify(nextRecipes));
        if (mounted) setRecipes(nextRecipes);
      } catch (err) {
        console.error('Failed to load recipes:', err);
        if (mounted) setError('Could not load processed recipes.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadRecipes();

    return () => {
      mounted = false;
    };
  }, [state.user?.id]);

  const openRecipe = (recipe) => {
    const { ingredients, instructions } = mapRecipeForState(recipe);
    const videoId = getRecipeVideoId(recipe);

    dispatch({
      type: 'SET_SELECTED_RECIPE',
      payload: {
        ...recipe,
        id: videoId,
        videoId,
        dbRecipeId: getRecipeId(recipe),
        dbVideoId: recipe.videoId || recipe.dbVideoId,
        title: getRecipeTitle(recipe),
        thumbnailUrl: getRecipeThumbnail(recipe),
      },
    });
    dispatch({ type: 'FINISH_AI_PROCESSING', payload: { ingredients, instructions } });
    navigate(`/review/${videoId}`);
  };

  const createCart = (recipe) => {
    const { ingredients, instructions } = mapRecipeForState(recipe);
    const videoId = getRecipeVideoId(recipe);

    dispatch({
      type: 'SET_SELECTED_RECIPE',
      payload: {
        ...recipe,
        id: videoId,
        videoId,
        dbRecipeId: getRecipeId(recipe),
        dbVideoId: recipe.videoId || recipe.dbVideoId,
        title: getRecipeTitle(recipe),
        thumbnailUrl: getRecipeThumbnail(recipe),
      },
    });
    dispatch({ type: 'FINISH_AI_PROCESSING', payload: { ingredients, instructions } });
    navigate(`/cart/${getRecipeId(recipe)}`);
  };

  return (
    <div className="c2c-root relative min-h-screen overflow-x-hidden bg-white pb-24">
      <PremiumBackground />
      <AppBar />

      <main className="relative z-10 mx-auto max-w-5xl px-4 pt-28 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900 md:text-3xl">My Recipes</h1>
            <p className="mt-1 text-sm font-medium text-gray-500">
              {loading ? 'Loading processed recipes...' : `${recipes.length} processed recipe${recipes.length === 1 ? '' : 's'}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/search')}
            className="gradient-bg rounded-2xl px-5 py-3 text-sm font-black text-white shadow-md"
          >
            Process New Video
          </button>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl border border-gray-100 bg-white px-6 py-20 text-center shadow-sm">
            <span className="material-icon animate-spin text-4xl text-orange-500">progress_activity</span>
            <p className="mt-3 text-sm font-bold text-gray-600">Loading recipes...</p>
          </div>
        ) : recipes.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 py-24 text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-orange-100 text-orange-500">
              <span className="material-icon !text-4xl">restaurant_menu</span>
            </div>
            <h2 className="text-xl font-black text-gray-900">No Processed Recipes</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">
              Process a cooking video first. Extracted ingredients will appear here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {recipes.map((recipe) => {
              const recipeId = getRecipeId(recipe);
              const isExpanded = String(expandedId) === String(recipeId);
              const ingredients = recipe.ingredients || [];
              const instructions = recipe.instructions || [];
              const thumbnail = getRecipeThumbnail(recipe);
              const title = getRecipeTitle(recipe);

              return (
                <div
                  key={recipeId}
                  className={`overflow-hidden rounded-3xl border bg-white shadow-sm transition ${
                    isExpanded ? 'border-orange-200 shadow-md' : 'border-gray-200 hover:border-orange-200'
                  }`}
                >
                  <div className="flex items-center gap-4 p-4">
                    <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-2xl bg-gray-100">
                      {thumbnail ? (
                        <img src={thumbnail} alt={title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-300">
                          <span className="material-icon">restaurant</span>
                        </div>
                      )}
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-orange-500 shadow">
                          <span className="material-icon !text-xl">play_arrow</span>
                        </span>
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-black text-gray-900">{title}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-medium text-gray-400">
                        <span>Recipe ID: {recipeId}</span>
                        <span className="h-1 w-1 rounded-full bg-gray-300" />
                        <span>{ingredients.length} ingredients</span>
                        {recipe.createdAt && (
                          <>
                            <span className="h-1 w-1 rounded-full bg-gray-300" />
                            <span>Processed {formatDate(recipe.createdAt)}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : recipeId)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-500"
                        title={isExpanded ? 'Hide ingredients' : 'Show ingredients'}
                      >
                        <span className={`material-icon !text-xl transition ${isExpanded ? 'rotate-180' : ''}`}>keyboard_arrow_down</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openRecipe(recipe)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-500"
                        title="Open recipe"
                      >
                        <span className="material-icon !text-lg">visibility</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => createCart(recipe)}
                        className="rounded-xl border border-orange-200 px-4 py-2 text-xs font-black text-orange-600 transition hover:bg-orange-50"
                      >
                        Cart
                      </button>
                      <DownloadButton size="sm" recipe={{ ...recipe, title, ingredients, instructions }} />
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50/70 px-5 py-4">
                      <p className="mb-3 text-xs font-black uppercase tracking-wider text-orange-600">
                        Extracted Ingredients ({ingredients.length})
                      </p>
                      {ingredients.length > 0 ? (
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {ingredients.map((ingredient, index) => {
                            const name = getIngredientName(ingredient);
                            return (
                              <div
                                key={ingredient.id || ingredient.recipeIngredientId || `${name}-${index}`}
                                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2"
                              >
                                <span className="truncate text-sm font-bold text-gray-800">{name}</span>
                                <span className="ml-2 shrink-0 text-xs font-black text-orange-600">
                                  {getIngredientQuantity(ingredient)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="rounded-2xl bg-white px-4 py-5 text-center text-sm text-gray-400">
                          No ingredient data saved for this recipe.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
