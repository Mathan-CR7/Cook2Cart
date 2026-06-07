import { createContext, useContext, useReducer, useEffect } from 'react';
import { authService } from '../utils/api';

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
  addresses: [],
  selectedAddress: null,
  orderConfirmed: false,
  recentRecipes: JSON.parse(localStorage.getItem('recentRecipes') || '[]'),
  savedRecipes: JSON.parse(localStorage.getItem('savedRecipes') || '[]'),
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
      return { ...state, addresses: action.payload };

    case 'SET_SELECTED_ADDRESS':
      return { ...state, selectedAddress: action.payload };

    case 'ADD_ADDRESS':
      return { ...state, addresses: [...state.addresses, action.payload] };

    case 'CONFIRM_ORDER':
      return { ...state, orderConfirmed: true };

    case 'ADD_RECENT_RECIPE': {
      const recent = [action.payload, ...state.recentRecipes.filter(r => r.id !== action.payload.id)].slice(0, 20);
      localStorage.setItem('recentRecipes', JSON.stringify(recent));
      return { ...state, recentRecipes: recent };
    }

    case 'SAVE_RECIPE': {
      const already = state.savedRecipes.some(r => r.id === action.payload.id);
      if (already) return state;
      const saved = [action.payload, ...state.savedRecipes];
      localStorage.setItem('savedRecipes', JSON.stringify(saved));
      return { ...state, savedRecipes: saved };
    }

    case 'REMOVE_SAVED_RECIPE': {
      const saved = state.savedRecipes.filter(r => r.id !== action.payload);
      localStorage.setItem('savedRecipes', JSON.stringify(saved));
      return { ...state, savedRecipes: saved };
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

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme);
  }, [state.theme]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authService.getProfile()
        .then((res) => {
          dispatch({ type: 'SET_USER', payload: res.data });
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
