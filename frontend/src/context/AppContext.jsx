import { createContext, useContext, useReducer, useEffect } from 'react';
import { addressService, authService, recipeCatalogService, videoCatalogService } from '../utils/api';

const AppContext = createContext();

const normalizeIngredient = (ingredient = {}) => {
  const ingredientName = ingredient.ingredientName || ingredient.name || 'Ingredient';

  return {
    ...ingredient,
    name: ingredient.name || ingredientName,
    ingredientName,
    recipeQuantity: ingredient.recipeQuantity ?? ingredient.quantity ?? '',
    recipeUnit: ingredient.recipeUnit ?? ingredient.unit ?? 'pcs',
    quantity: ingredient.quantity ?? ingredient.recipeQuantity ?? '',
    unit: ingredient.unit ?? ingredient.recipeUnit ?? 'pcs',
  };
};

const initialState = {
  user: null,
  isAuthenticated: false,
  authChecked: false,
  theme: localStorage.getItem('theme') || 'light',
  searchQuery: '',
  searchResults: [],
  selectedRecipe: JSON.parse(localStorage.getItem('selectedRecipe') || 'null'),
  aiProcessing: false,
  aiStep: 0,
  extractedIngredients: JSON.parse(localStorage.getItem('extractedIngredients') || '[]'),
  extractedInstructions: JSON.parse(localStorage.getItem('extractedInstructions') || '[]'),
  cart: JSON.parse(localStorage.getItem('cart') || '[]'),
  cartObject: JSON.parse(localStorage.getItem('cartObject') || 'null'),
  addresses: JSON.parse(localStorage.getItem('addresses') || '[]'),
  selectedAddress: JSON.parse(localStorage.getItem('selectedAddress') || 'null'),
  orderConfirmed: false,
  recentRecipes: JSON.parse(localStorage.getItem('recentRecipes') || '[]'),
  savedRecipes: JSON.parse(localStorage.getItem('savedRecipes') || '[]'),
  favoriteRecipes: JSON.parse(localStorage.getItem('favoriteRecipes') || '[]'),
  loading: false,
  budgetMode: false,
  budgetLimit: null,
  healthMode: false,
  healthFilter: null,
};

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_THEME':
      localStorage.setItem('theme', action.payload);
      return { ...state, theme: action.payload };

    case 'SET_USER':
      return { ...state, user: action.payload, isAuthenticated: !!action.payload, authChecked: true };

    case 'SET_AUTH_CHECKED':
      return { ...state, authChecked: true };

    case 'LOGOUT': {
      const keys = ['extractedIngredients', 'extractedInstructions', 'cart', 'cartObject',
        'selectedRecipe', 'savedRecipes', 'favoriteRecipes', 'recentRecipes',
        'addresses', 'selectedAddress'];
      keys.forEach(k => localStorage.removeItem(k));
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        authChecked: true,
        extractedIngredients: [],
        extractedInstructions: [],
        cart: [],
        cartObject: null,
        selectedRecipe: null,
        savedRecipes: [],
        favoriteRecipes: [],
        recentRecipes: [],
        addresses: [],
        selectedAddress: null,
      };
    }

    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };

    case 'SET_SEARCH_RESULTS':
      return { ...state, searchResults: action.payload, loading: false };

    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_SELECTED_RECIPE':
      return { ...state, selectedRecipe: action.payload };

    case 'START_AI_PROCESSING':
      return { ...state, aiProcessing: true, aiStep: 0, extractedIngredients: [], extractedInstructions: [] };

    case 'SET_AI_STEP':
      return { ...state, aiStep: action.payload };

    case 'FINISH_AI_PROCESSING': {
      const isObject = action.payload && !Array.isArray(action.payload);
      const rawIngredients = isObject ? action.payload.ingredients : action.payload;
      const instructions = isObject ? (action.payload.instructions || []) : [];
      
      // Deduplicate extracted ingredients
      const uniqueIngredients = [];
      const seenNames = new Set();
      if (Array.isArray(rawIngredients)) {
        for (const ing of rawIngredients) {
          const normalized = normalizeIngredient(ing);
          const name = (normalized.ingredientName || '').trim().toLowerCase();
          if (name && !seenNames.has(name)) {
            seenNames.add(name);
            uniqueIngredients.push(normalized);
          }
        }
      }

      return {
        ...state,
        aiProcessing: false,
        aiStep: 5,
        extractedIngredients: uniqueIngredients,
        extractedInstructions: instructions || [],
      };
    }

    case 'UPDATE_INGREDIENT': {
      const ingredients = [...state.extractedIngredients];
      ingredients[action.payload.index] = {
        ...ingredients[action.payload.index],
        ...action.payload.data,
      };
      return { ...state, extractedIngredients: ingredients };
    }

    case 'REMOVE_INGREDIENT':
      return {
        ...state,
        extractedIngredients: state.extractedIngredients.filter((_, i) => i !== action.payload),
      };

    case 'ADD_INGREDIENT': {
      const newIng = action.payload;
      const normalizedIngredient = normalizeIngredient(newIng);
      const normalizedName = (normalizedIngredient.ingredientName || '').trim().toLowerCase();
      const exists = state.extractedIngredients.some(
        (ing) => (ing.ingredientName || ing.name || '').trim().toLowerCase() === normalizedName
      );
      if (exists) {
        return state;
      }
      return {
        ...state,
        extractedIngredients: [...state.extractedIngredients, normalizedIngredient],
      };
    }

    case 'UPDATE_INSTRUCTION': {
      const instructions = [...state.extractedInstructions];
      instructions[action.payload.index] = action.payload.text;
      return { ...state, extractedInstructions: instructions };
    }

    case 'REMOVE_INSTRUCTION':
      return {
        ...state,
        extractedInstructions: state.extractedInstructions.filter((_, i) => i !== action.payload),
      };

    case 'ADD_INSTRUCTION':
      return {
        ...state,
        extractedInstructions: [...state.extractedInstructions, action.payload],
      };

    case 'SET_CART': {
      const payload = action.payload;
      let itemsList = [];
      let isObjectFormat = false;

      if (payload && payload.items) {
        itemsList = payload.items;
        isObjectFormat = true;
      } else if (Array.isArray(payload)) {
        itemsList = payload;
      }

      // Map quantities and preserve existing qty
      const mappedItems = itemsList.map((newItem) => {
        const existingItem = state.cart.find(
          (item) => item.ingredientName === newItem.ingredientName
        );
        return {
          ...newItem,
          qty: existingItem ? (existingItem.qty || 1) : 1,
        };
      });

      // Deduplicate items
      const uniqueItems = [];
      const seenCartNames = new Set();
      for (const item of mappedItems) {
        const name = (item.ingredientName || item.name || '').trim().toLowerCase();
        if (name && !seenCartNames.has(name)) {
          seenCartNames.add(name);
          uniqueItems.push(item);
        }
      }

      if (isObjectFormat) {
        return {
          ...state,
          cart: uniqueItems,
          cartObject: {
            ...payload,
            items: uniqueItems,
          },
        };
      }

      return {
        ...state,
        cart: uniqueItems,
        cartObject: payload ? { items: uniqueItems, originalServings: 4, targetServings: 4, totalPrice: 0 } : null,
      };
    }

    case 'UPDATE_CART_ITEM': {
      const cart = [...state.cart];
      cart[action.payload.index] = {
        ...cart[action.payload.index],
        ...action.payload.data,
      };
      return {
        ...state,
        cart,
        cartObject: state.cartObject ? { ...state.cartObject, items: cart } : null,
      };
    }

    case 'REMOVE_CART_ITEM': {
      const cart = state.cart.filter((_, i) => i !== action.payload);
      return {
        ...state,
        cart,
        cartObject: state.cartObject ? { ...state.cartObject, items: cart } : null,
      };
    }

    case 'SET_ADDRESSES':
      localStorage.setItem('addresses', JSON.stringify(action.payload || []));
      return { ...state, addresses: action.payload };

    case 'SET_SELECTED_ADDRESS':
      localStorage.setItem('selectedAddress', JSON.stringify(action.payload || null));
      return { ...state, selectedAddress: action.payload };

    case 'ADD_ADDRESS': {
      const nextAddresses = [action.payload, ...state.addresses.filter((item) => String(item.id) !== String(action.payload.id))];
      localStorage.setItem('addresses', JSON.stringify(nextAddresses));
      return { ...state, addresses: nextAddresses };
    }

    case 'CONFIRM_ORDER':
      return { ...state, orderConfirmed: true };

    case 'ADD_RECENT_RECIPE': {
      const recent = [action.payload, ...state.recentRecipes.filter(r => r.id !== action.payload.id)].slice(0, 20);
      localStorage.setItem('recentRecipes', JSON.stringify(recent));
      return { ...state, recentRecipes: recent };
    }

    case 'SET_RECENT_RECIPES':
      localStorage.setItem('recentRecipes', JSON.stringify(action.payload || []));
      return { ...state, recentRecipes: action.payload || [] };

    case 'SET_SAVED_RECIPES':
      localStorage.setItem('savedRecipes', JSON.stringify(action.payload || []));
      return { ...state, savedRecipes: action.payload || [] };

    case 'SET_FAVORITE_RECIPES':
      localStorage.setItem('favoriteRecipes', JSON.stringify(action.payload || []));
      return { ...state, favoriteRecipes: action.payload || [] };

    case 'SAVE_RECIPE': {
      const already = state.savedRecipes.some(r => String(r.id) === String(action.payload.id));
      if (already) {
        const saved = state.savedRecipes.map(r =>
          String(r.id) === String(action.payload.id) ? { ...r, ...action.payload } : r
        );
        localStorage.setItem('savedRecipes', JSON.stringify(saved));
        return { ...state, savedRecipes: saved };
      }
      const saved = [action.payload, ...state.savedRecipes];
      localStorage.setItem('savedRecipes', JSON.stringify(saved));
      return { ...state, savedRecipes: saved };
    }

    case 'REMOVE_SAVED_RECIPE': {
      const saved = state.savedRecipes.filter(r => String(r.id) !== String(action.payload));
      localStorage.setItem('savedRecipes', JSON.stringify(saved));
      return { ...state, savedRecipes: saved };
    }

    case 'ADD_FAVORITE_RECIPE': {
      const already = state.favoriteRecipes.some(r => String(r.id) === String(action.payload.id));
      if (already) {
        const favorites = state.favoriteRecipes.map(r =>
          String(r.id) === String(action.payload.id) ? { ...r, ...action.payload } : r
        );
        localStorage.setItem('favoriteRecipes', JSON.stringify(favorites));
        return { ...state, favoriteRecipes: favorites };
      }
      const favorites = [action.payload, ...state.favoriteRecipes];
      localStorage.setItem('favoriteRecipes', JSON.stringify(favorites));
      return { ...state, favoriteRecipes: favorites };
    }

    case 'REMOVE_FAVORITE_RECIPE': {
      const favorites = state.favoriteRecipes.filter(r => String(r.id) !== String(action.payload));
      localStorage.setItem('favoriteRecipes', JSON.stringify(favorites));
      return { ...state, favoriteRecipes: favorites };
    }

    case 'SET_BUDGET_MODE':
      return { ...state, budgetMode: action.payload };

    case 'SET_BUDGET_LIMIT':
      return { ...state, budgetLimit: action.payload };

    case 'SET_HEALTH_MODE':
      return { ...state, healthMode: action.payload };

    case 'SET_HEALTH_FILTER':
      return { ...state, healthFilter: action.payload };

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Clear stale localStorage data if no token on mount
  useEffect(() => {
    if (!localStorage.getItem('token')) {
      const keys = ['extractedIngredients', 'extractedInstructions', 'cart', 'cartObject',
        'selectedRecipe', 'savedRecipes', 'favoriteRecipes', 'recentRecipes',
        'addresses', 'selectedAddress'];
      keys.forEach(k => {
        try { localStorage.removeItem(k); } catch (_) { /* ignore */ }
      });
    }
  }, []);

  const hydrateAddresses = async () => {
    const res = await addressService.getAddresses();
    const addresses = Array.isArray(res.data) ? res.data : [];
    dispatch({ type: 'SET_ADDRESSES', payload: addresses });
  };

  const hydrateVideoActions = async (userId) => {
    const [history, saved, favorites, recipesResponse] = await Promise.all([
      videoCatalogService.getUserActions(userId, 'HISTORY'),
      videoCatalogService.getUserActions(userId, 'SAVED'),
      videoCatalogService.getUserActions(userId, 'FAVORITE'),
      recipeCatalogService.getRecipesByUser(userId).catch(() => ({ data: [] })),
    ]);

    const recipes = recipesResponse?.data || [];

    const mapAction = (action) => {
      const dbVideoId = action.video?.id;
      const matchingRecipe = recipes.find(r => r.videoId === dbVideoId);
      
      return {
        id: action.video?.youtubeVideoId || action.video?.id || action.id,
        videoId: action.video?.youtubeVideoId,
        dbVideoId: dbVideoId,
        title: action.video?.title || 'Recipe video',
        channelTitle: action.video?.channelName || 'Cook2Cart',
        thumbnailUrl: action.video?.thumbnailUrl,
        videoUrl: action.video?.videoUrl,
        duration: action.video?.duration,
        savedAt: action.createdAt,
        watchedAt: action.createdAt,
        ingredients: matchingRecipe ? matchingRecipe.ingredients.map(ing => ({
          name: ing.ingredientName || ing.name,
          recipeQuantity: ing.recipeQuantity,
          recipeUnit: ing.recipeUnit,
          quantity: ing.quantity,
          unit: ing.unit,
        })) : [],
        instructions: matchingRecipe ? matchingRecipe.instructions.map(inst => inst.instruction || inst.text || inst) : [],
      };
    };

    dispatch({ type: 'SET_RECENT_RECIPES', payload: history.data.map(mapAction) });
    dispatch({ type: 'SET_SAVED_RECIPES', payload: saved.data.map(mapAction) });
    dispatch({ type: 'SET_FAVORITE_RECIPES', payload: favorites.data.map(mapAction) });
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme);
  }, [state.theme]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      dispatch({ type: 'SET_AUTH_CHECKED' });
      return;
    }

    authService.getProfile()
      .then((res) => {
        dispatch({ type: 'SET_USER', payload: res.data });
        if (res.data?.id) {
          hydrateVideoActions(res.data.id).catch((err) => {
            console.error('Failed to load saved video actions:', err);
          });
        }
        hydrateAddresses().catch((err) => {
          console.error('Failed to load saved addresses:', err);
        });
      })
      .catch(() => {
        localStorage.removeItem('token');
        dispatch({ type: 'SET_AUTH_CHECKED' });
      });
  }, [dispatch]);

  useEffect(() => {
    localStorage.setItem('extractedIngredients', JSON.stringify(state.extractedIngredients));
    localStorage.setItem('extractedInstructions', JSON.stringify(state.extractedInstructions));
  }, [state.extractedIngredients, state.extractedInstructions]);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(state.cart));
    if (state.cartObject) {
      localStorage.setItem('cartObject', JSON.stringify(state.cartObject));
    } else {
      localStorage.removeItem('cartObject');
    }
  }, [state.cart, state.cartObject]);

  useEffect(() => {
    if (state.selectedRecipe) {
      localStorage.setItem('selectedRecipe', JSON.stringify(state.selectedRecipe));
    } else {
      localStorage.removeItem('selectedRecipe');
    }
  }, [state.selectedRecipe]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
