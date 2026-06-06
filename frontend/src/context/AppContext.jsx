import { createContext, useContext, useReducer, useEffect } from 'react';
import { authService } from '../utils/api';

const AppContext = createContext();

const initialState = {
  user: null,
  isAuthenticated: false,
  theme: localStorage.getItem('theme') || 'light',
  searchQuery: '',
  searchResults: [],
  selectedRecipe: null,
  aiProcessing: false,
  aiStep: 0,
  extractedIngredients: [],
  cart: [],
  addresses: [],
  selectedAddress: null,
  orderConfirmed: false,
  recentRecipes: JSON.parse(localStorage.getItem('recentRecipes') || '[]'),
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
      return { ...state, aiProcessing: true, aiStep: 0, extractedIngredients: [] };

    case 'SET_AI_STEP':
      return { ...state, aiStep: action.payload };

    case 'FINISH_AI_PROCESSING':
      return {
        ...state,
        aiProcessing: false,
        aiStep: 5,
        extractedIngredients: action.payload,
      };

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

    case 'SET_CART':
      return { ...state, cart: action.payload };

    case 'UPDATE_CART_ITEM': {
      const cart = [...state.cart];
      cart[action.payload.index] = {
        ...cart[action.payload.index],
        ...action.payload.data,
      };
      return { ...state, cart };
    }

    case 'REMOVE_CART_ITEM':
      return { ...state, cart: state.cart.filter((_, i) => i !== action.payload) };

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
