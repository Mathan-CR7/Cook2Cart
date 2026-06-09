import { createContext, useContext, useReducer, useEffect } from 'react';
import { addressService, authService, videoCatalogService } from '../utils/api';

const AppContext = createContext();

const initialState = {
  user: null,
  isAuthenticated: false,
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
      return { ...state, user: action.payload, isAuthenticated: !!action.payload };

    case 'LOGOUT':
      return { ...state, user: null, isAuthenticated: false };

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
      const ingredients = isObject ? action.payload.ingredients : action.payload;
      const instructions = isObject ? (action.payload.instructions || []) : [];
      return {
        ...state,
        aiProcessing: false,
        aiStep: 5,
        extractedIngredients: ingredients || [],
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

    case 'ADD_INGREDIENT':
      return {
        ...state,
        extractedIngredients: [...state.extractedIngredients, action.payload],
      };

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
      if (payload && payload.items) {
        const newItems = payload.items.map((newItem) => {
          const existingItem = state.cart.find(
            (item) => item.ingredientName === newItem.ingredientName
          );
          return {
            ...newItem,
            qty: existingItem ? (existingItem.qty || 1) : 1,
          };
        });
        return {
          ...state,
          cart: newItems,
          cartObject: {
            ...payload,
            items: newItems,
          },
        };
      }
      return {
        ...state,
        cart: payload || [],
        cartObject: payload ? { items: payload, originalServings: 4, targetServings: 4, totalPrice: 0 } : null,
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

  const mapVideoActionToRecipe = (action) => ({
    id: action.video?.youtubeVideoId || action.video?.id || action.id,
    videoId: action.video?.youtubeVideoId,
    dbVideoId: action.video?.id,
    title: action.video?.title || 'Recipe video',
    channelTitle: action.video?.channelName || 'Cook2Cart',
    thumbnailUrl: action.video?.thumbnailUrl,
    videoUrl: action.video?.videoUrl,
    duration: action.video?.duration,
    savedAt: action.createdAt,
    watchedAt: action.createdAt,
    ingredients: [],
    instructions: [],
  });

  const hydrateAddresses = async () => {
    const res = await addressService.getAddresses();
    const addresses = Array.isArray(res.data) ? res.data : [];
    dispatch({ type: 'SET_ADDRESSES', payload: addresses });
  };

  const hydrateVideoActions = async (userId) => {
    const [history, saved, favorites] = await Promise.all([
      videoCatalogService.getUserActions(userId, 'HISTORY'),
      videoCatalogService.getUserActions(userId, 'SAVED'),
      videoCatalogService.getUserActions(userId, 'FAVORITE'),
    ]);

    dispatch({ type: 'SET_RECENT_RECIPES', payload: history.data.map(mapVideoActionToRecipe) });
    dispatch({ type: 'SET_SAVED_RECIPES', payload: saved.data.map(mapVideoActionToRecipe) });
    dispatch({ type: 'SET_FAVORITE_RECIPES', payload: favorites.data.map(mapVideoActionToRecipe) });
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme);
  }, [state.theme]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
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
        });
    }
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
