import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import AppBar from '../components/AppBar';
import BottomNav from '../components/BottomNav';
import PremiumBackground from '../components/PremiumBackground';
import FAB from '../components/FAB';
import CartGenerationPage from '../components/cart/CartGenerationPage';
import ServingsModal from '../components/cart/ServingsModal';
import {
  calculateProductPricing,
  getBrandName,
  getPackSize,
  isMarketProduct,
  vegetableOptions,
} from '../components/cart/cartMath';
import { cartCatalogService, getApiErrorMessage, productService, recipeCatalogService } from '../utils/api';

const normalizeName = (value = '') => String(value).trim().toLowerCase();

const getRecipeId = (state, videoId) => (
  state.selectedRecipe?.dbRecipeId
  || state.selectedRecipe?.recipeId
  || state.selectedRecipe?.id
  || state.cartObject?.recipeId
  || videoId
);

const getRecipeTitle = (state) => (
  state.selectedRecipe?.title
  || state.selectedRecipe?.recipeName
  || 'Cook2Cart Recipe'
);

const getRecipeThumbnail = (state, videoId) => (
  state.selectedRecipe?.thumbnailUrl
  || state.selectedRecipe?.thumbnail
  || (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null)
);

const getRecipeDuration = (state) => (
  state.selectedRecipe?.duration
  || state.selectedRecipe?.videoDuration
  || state.cartObject?.duration
  || null
);

const getIngredientQuantity = (suggestionGroup, extractedIngredients) => {
  const match = extractedIngredients.find((ingredient) => {
    const idMatch = String(ingredient.recipeIngredientId || ingredient.id || '') === String(suggestionGroup.recipeIngredientId || '');
    const nameMatch = normalizeName(ingredient.name || ingredient.ingredientName) === normalizeName(suggestionGroup.ingredientName);
    return idMatch || nameMatch;
  });

  return {
    recipeIngredientId: suggestionGroup.recipeIngredientId,
    ingredientName: match?.ingredientName || match?.name || suggestionGroup.ingredientName || 'Ingredient',
    recipeQuantity: match?.recipeQuantity ?? match?.quantity ?? suggestionGroup.recipeQuantity ?? '',
    recipeUnit: match?.recipeUnit ?? match?.unit ?? suggestionGroup.recipeUnit ?? '',
  };
};

const getProductKey = (product) => String(product?.id || product?.barcode || product?.productName || '');

const scaleIngredient = (ingredient, factor) => {
  const quantity = Number(ingredient.recipeQuantity ?? ingredient.quantity);
  if (!Number.isFinite(quantity)) return ingredient;
  const scaled = Math.round(quantity * factor * 100) / 100;
  return {
    ...ingredient,
    recipeQuantity: scaled,
    quantity: scaled,
  };
};

export default function SmartCartPage() {
  const navigate = useNavigate();
  const { videoId } = useParams();
  const { state, dispatch } = useApp();
  const [suggestionGroups, setSuggestionGroups] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState({});
  const [acceptedPacks, setAcceptedPacks] = useState({});
  const [vegetableSelections, setVegetableSelections] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dbIngredients, setDbIngredients] = useState([]);
  const [servingsConfirmed, setServingsConfirmed] = useState(false);
  const [targetServings, setTargetServings] = useState(2);
  const [atHomeIngredients, setAtHomeIngredients] = useState({});
  const [removedIngredients, setRemovedIngredients] = useState({});

  const recipeId = getRecipeId(state, videoId);
  const recipeTitle = getRecipeTitle(state);
  const thumbnail = getRecipeThumbnail(state, videoId);
  const duration = getRecipeDuration(state);
  const locationLabel = state.selectedAddress?.label
    || state.selectedAddress?.city
    || state.selectedAddress?.addressType
    || 'Selected location';

  useEffect(() => {
    let mounted = true;

    const loadSuggestions = async () => {
      setLoading(true);
      setError('');

      try {
        const [savedSuggestionsResponse, ingredientsResponse] = await Promise.allSettled([
          productService.getSuggestionsByRecipe(recipeId),
          recipeCatalogService.getRecipeIngredients(recipeId),
        ]);

        let groups = savedSuggestionsResponse.status === 'fulfilled' && Array.isArray(savedSuggestionsResponse.value.data)
          ? savedSuggestionsResponse.value.data
          : [];
        const savedIngredients = ingredientsResponse.status === 'fulfilled' && Array.isArray(ingredientsResponse.value.data)
          ? ingredientsResponse.value.data
          : [];

        if (groups.length === 0) {
          const generatedResponse = await productService.generateSuggestions(recipeId);
          groups = Array.isArray(generatedResponse.data) ? generatedResponse.data : [];
        }

        if (!mounted) return;

        setSuggestionGroups(groups);
        setDbIngredients(savedIngredients);
        const defaults = {};
        const accepted = {};
        const vegetables = {};
        groups.forEach((group) => {
          const firstProduct = group.suggestions?.[0];
          if (firstProduct) {
            defaults[group.recipeIngredientId] = getProductKey(firstProduct);
            accepted[group.recipeIngredientId] = false;
            vegetables[group.recipeIngredientId] = vegetableOptions[0].label;
          }
        });
        setSelectedProducts(defaults);
        setAcceptedPacks(accepted);
        setVegetableSelections(vegetables);
      } catch (err) {
        if (!mounted) return;
        setError(getApiErrorMessage(err, 'Could not load cart data.'));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (recipeId) {
      loadSuggestions();
    } else {
      setLoading(false);
      setError('Recipe id is missing. Save the extracted recipe before creating a cart.');
    }

    return () => {
      mounted = false;
    };
  }, [recipeId]);

  const hasIngredients = useMemo(() => {
    return (state.extractedIngredients?.length > 0) || dbIngredients.length > 0 || suggestionGroups.length > 0;
  }, [state.extractedIngredients, dbIngredients, suggestionGroups]);

  const ingredientSource = useMemo(() => {
    const localIngredients = state.extractedIngredients || [];
    return localIngredients.length > 0 ? localIngredients : dbIngredients;
  }, [state.extractedIngredients, dbIngredients]);

  const scaledIngredientSource = useMemo(() => {
    const factor = targetServings;
    return ingredientSource.map((ingredient) => scaleIngredient(ingredient, factor));
  }, [ingredientSource, targetServings]);

  const ingredients = useMemo(() => {
    if (suggestionGroups.length > 0) {
      return suggestionGroups
        .filter((group) => !removedIngredients[group.recipeIngredientId])
        .map((group) => getIngredientQuantity(group, ingredientSource));
    }

    return ingredientSource
      .filter((ingredient) => !removedIngredients[ingredient.recipeIngredientId || ingredient.id || ingredient.ingredientName])
      .map((ingredient) => ({
        recipeIngredientId: ingredient.recipeIngredientId || ingredient.id,
        ingredientName: ingredient.ingredientName || ingredient.name || 'Ingredient',
        recipeQuantity: ingredient.recipeQuantity ?? ingredient.quantity ?? '',
        recipeUnit: ingredient.recipeUnit ?? ingredient.unit ?? '',
      }));
  }, [suggestionGroups, ingredientSource, removedIngredients]);

  const summaryItems = useMemo(() => (
    suggestionGroups.flatMap((group) => {
      if (removedIngredients[group.recipeIngredientId] || atHomeIngredients[group.recipeIngredientId]) return [];
      const products = group.suggestions || [];
      const selected = products.find((product) => getProductKey(product) === selectedProducts[group.recipeIngredientId]) || products[0];
      if (!selected) return [];

      const ingredient = getIngredientQuantity(group, scaledIngredientSource);
      const isMarket = isMarketProduct(selected);
      const vegetableOption = vegetableOptions.find((option) => option.label === vegetableSelections[group.recipeIngredientId]) || vegetableOptions[0];
      const pricing = calculateProductPricing(ingredient, selected, vegetableOption);
      const purchaseCost = pricing.purchaseCost;
      const recipeCost = pricing.recipeUsageCost;
      const packLabel = isMarket ? vegetableOption.label.replace('Add ', '') : getPackSize(selected);

      return [{
        key: `${group.recipeIngredientId}-${getProductKey(selected)}`,
        recipeIngredientId: group.recipeIngredientId,
        ingredient,
        product: selected,
        name: `${ingredient.ingredientName} - ${getBrandName(selected)}`,
        packLabel,
        purchaseCost,
        recipeCost,
        unusedValue: pricing.unusedValue,
        unusedQuantity: pricing.unusedQuantity,
        packsNeeded: pricing.packsNeeded,
        pricing,
        quantity: isMarket ? vegetableOption.value : 1,
        unit: isMarket ? vegetableOption.unit : 'pack',
      }];
    })
  ), [suggestionGroups, selectedProducts, scaledIngredientSource, vegetableSelections, atHomeIngredients, removedIngredients]);

  const purchaseCost = summaryItems.reduce((sum, item) => sum + item.purchaseCost, 0);
  const recipeCost = summaryItems.reduce((sum, item) => sum + item.recipeCost, 0);
  const unusedInventoryValue = summaryItems.reduce((sum, item) => sum + (item.unusedValue || 0), 0);
  const displaySuggestionGroups = suggestionGroups.length > 0
    ? suggestionGroups.filter((group) => !removedIngredients[group.recipeIngredientId])
    : ingredients.map((ingredient) => ({
      recipeIngredientId: ingredient.recipeIngredientId || ingredient.ingredientName,
      ingredientName: ingredient.ingredientName,
      suggestions: [],
    }));

  const handleSelectProduct = (recipeIngredientId, productKey) => {
    setSelectedProducts((current) => ({ ...current, [recipeIngredientId]: productKey }));
    setAcceptedPacks((current) => ({ ...current, [recipeIngredientId]: false }));
  };

  const handleSelectVegetableOption = (recipeIngredientId, option) => {
    setVegetableSelections((current) => ({ ...current, [recipeIngredientId]: option }));
  };

  const handleAcceptPack = (recipeIngredientId) => {
    setAcceptedPacks((current) => ({ ...current, [recipeIngredientId]: true }));
  };

  const handleToggleAtHome = (recipeIngredientId) => {
    setAtHomeIngredients((current) => ({ ...current, [recipeIngredientId]: !current[recipeIngredientId] }));
  };

  const handleRemoveIngredient = (recipeIngredientId) => {
    setRemovedIngredients((current) => ({ ...current, [recipeIngredientId]: true }));
  };

  const handleCancel = () => {
    navigate(`/review/${state.selectedRecipe?.videoId || videoId || recipeId}`);
  };

  const handleSaveCart = async () => {
    setSaving(true);
    setError('');

    try {
      const savedItems = await Promise.all(summaryItems.map(async (item) => {
        const productResponse = await cartCatalogService.saveProduct({
          ingredientId: item.recipeIngredientId,
          productName: item.product.productName,
          brand: getBrandName(item.product),
          size: getPackSize(item.product),
          price: item.purchaseCost,
          imageUrl: item.product.imageUrl || null,
          source: item.product.source || 'PRODUCT_SERVICE',
          availability: item.product.availability || 'AVAILABLE',
        });

        return {
          ingredientId: item.recipeIngredientId,
          selectedProductId: productResponse.data.id,
          recipeId: Number(recipeId),
          ingredientName: item.ingredient.ingredientName,
          recipeQuantity: Number(item.ingredient.recipeQuantity || 0),
          recipeUnit: item.ingredient.recipeUnit || '',
          quantity: Number(item.quantity || 1),
          unit: item.unit,
          price: item.purchaseCost,
          estimatedPrice: item.recipeCost,
          availableAtHome: false,
          selectedProduct: {
            ingredientId: item.recipeIngredientId,
            productName: item.product.productName,
            brand: getBrandName(item.product),
            size: getPackSize(item.product),
            price: item.purchaseCost,
            imageUrl: item.product.imageUrl || null,
            source: item.product.source || 'PRODUCT_SERVICE',
            availability: item.product.availability || 'AVAILABLE',
          },
        };
      }));

      const response = await cartCatalogService.createCart({
        userId: state.user?.id || null,
        originalServings: 1,
        targetServings,
        items: savedItems,
      });

      dispatch({ type: 'SET_CART', payload: response.data });
      setConfirmOpen(false);
      navigate(`/order/${videoId || recipeId}`);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not create cart.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="c2c-root min-h-screen overflow-x-hidden bg-white pb-28">
      <PremiumBackground />
      <AppBar />

      <CartGenerationPage
        recipeTitle={recipeTitle}
        recipeId={recipeId}
        thumbnail={thumbnail}
        duration={duration}
        servings={targetServings}
        locationLabel={locationLabel}
        ingredients={ingredients}
        suggestionGroups={displaySuggestionGroups}
        selectedProducts={selectedProducts}
        vegetableSelections={vegetableSelections}
        acceptedPacks={acceptedPacks}
        atHomeIngredients={atHomeIngredients}
        summaryItems={summaryItems}
        recipeCost={recipeCost}
        purchaseCost={purchaseCost}
        unusedInventoryValue={unusedInventoryValue}
        loading={loading}
        saving={saving}
        error={error}
        confirmOpen={confirmOpen}
        getIngredientQuantity={(group) => getIngredientQuantity(group, scaledIngredientSource)}
        onSelectProduct={handleSelectProduct}
        onSelectVegetableOption={handleSelectVegetableOption}
        onAccept={handleAcceptPack}
        onToggleAtHome={handleToggleAtHome}
        onRemoveIngredient={handleRemoveIngredient}
        onOpenConfirm={() => setConfirmOpen(true)}
        onCancel={handleCancel}
        onCloseConfirm={() => setConfirmOpen(false)}
        onConfirm={handleSaveCart}
      />
      {!hasIngredients && !loading && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[24px] bg-white p-6 shadow-2xl text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
              <span className="material-icon !text-3xl">shopping_cart</span>
            </div>
            <h2 className="mt-4 text-xl font-black text-gray-900">No recipe data found</h2>
            <p className="mt-2 text-sm font-medium text-gray-500">
              Process a recipe first to generate a shopping cart.
            </p>
            <button onClick={() => navigate('/')} className="gradient-bg mt-6 w-full rounded-2xl py-4 text-sm font-black text-white shadow-lg">
              Go to Home
            </button>
          </div>
        </div>
      )}
      <ServingsModal
        open={!servingsConfirmed && hasIngredients}
        initialValue={targetServings}
        onConfirm={(persons) => {
          setTargetServings(persons);
          setServingsConfirmed(true);
        }}
      />
      <BottomNav />
      <FAB />
    </div>
  );
}
