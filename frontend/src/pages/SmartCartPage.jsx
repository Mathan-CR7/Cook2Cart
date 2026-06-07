import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import AppBar from '../components/AppBar';
import BottomNav from '../components/BottomNav';
import FAB from '../components/FAB';
import { cartService } from '../utils/api';

const BUDGET_OPTIONS = [500, 1000, 1500, 2000];
const HEALTH_FILTERS = ['Diabetic', 'High Protein', 'Weight Loss', 'High BP'];

export default function SmartCartPage() {
  const navigate = useNavigate();
  const { videoId } = useParams();
  const { state, dispatch } = useApp();
  const [showIngredientsModal, setShowIngredientsModal] = useState(false);
  const cart = state.cart;
  const total = cart.reduce((sum, item) => sum + (item.availableAtHome ? 0 : (item.price || 0) * (item.qty || 1)), 0);

  const handleUpdate = (index, data) => dispatch({ type: 'UPDATE_CART_ITEM', payload: { index, data } });

  const handleRemove = async (index) => {
    if (state.cartObject && state.cartObject.id) {
      try {
        const response = await cartService.removeItem(state.cartObject, index);
        dispatch({ type: 'SET_CART', payload: response.data });
        return;
      } catch (err) {
        console.error('Failed to remove cart item on backend, falling back to local:', err);
      }
    }
    dispatch({ type: 'REMOVE_CART_ITEM', payload: index });
  };

  const handleBrandChange = async (index, brand) => {
    if (state.cartObject && state.cartObject.id) {
      try {
        const response = await cartService.updateItem(state.cartObject, index, { brand });
        dispatch({ type: 'SET_CART', payload: response.data });
        return;
      } catch (err) {
        console.error('Failed to update brand on backend, falling back to local:', err);
      }
    }
    // local fallback
    const item = cart[index];
    const size = item.selectedSize;
    if (item.availableProducts) {
      const newProduct = item.availableProducts.find(p => p.brand === brand && p.size === size) || 
                         item.availableProducts.find(p => p.brand === brand) || 
                         item.selectedProduct;
      const updatedSizes = item.availableProducts
        .filter(p => p.name === newProduct.name && p.brand === brand)
        .map(p => p.size);
      handleUpdate(index, {
        selectedBrand: brand,
        selectedProduct: newProduct,
        selectedSize: newProduct ? newProduct.size : size,
        availableSizes: updatedSizes.length > 0 ? updatedSizes : item.availableSizes,
        price: newProduct ? newProduct.price : item.price
      });
    } else {
      handleUpdate(index, { selectedBrand: brand });
    }
  };

  const handleSizeChange = async (index, size) => {
    if (state.cartObject && state.cartObject.id) {
      try {
        const response = await cartService.updateItem(state.cartObject, index, { size });
        dispatch({ type: 'SET_CART', payload: response.data });
        return;
      } catch (err) {
        console.error('Failed to update size on backend, falling back to local:', err);
      }
    }
    // local fallback
    const item = cart[index];
    const brand = item.selectedBrand;
    if (item.availableProducts) {
      const newProduct = item.availableProducts.find(p => p.brand === brand && p.size === size) || 
                         item.availableProducts.find(p => p.size === size) || 
                         item.selectedProduct;
      const updatedSizes = item.availableProducts
        .filter(p => p.name === newProduct.name && p.brand === newProduct.brand)
        .map(p => p.size);
      handleUpdate(index, {
        selectedSize: size,
        selectedProduct: newProduct,
        selectedBrand: newProduct ? newProduct.brand : brand,
        availableSizes: updatedSizes.length > 0 ? updatedSizes : item.availableSizes,
        price: newProduct ? newProduct.price : item.price
      });
    } else {
      handleUpdate(index, { selectedSize: size });
    }
  };

  const handleToggleAvailableAtHome = async (index) => {
    const item = cart[index];
    const newValue = !item.availableAtHome;
    if (state.cartObject && state.cartObject.id) {
      try {
        const response = await cartService.updateItem(state.cartObject, index, { availableAtHome: newValue });
        dispatch({ type: 'SET_CART', payload: response.data });
        return;
      } catch (err) {
        console.error('Failed to toggle availableAtHome on backend, falling back to local:', err);
      }
    }
    handleUpdate(index, { availableAtHome: newValue });
  };

  const finalVideoId = videoId || state.selectedRecipe?.videoId || state.selectedRecipe?.id || state.recentRecipes?.[0]?.videoId || state.recentRecipes?.[0]?.id || 'recipe';

  return (
    <div className="bg-white min-h-screen pb-16">
      <AppBar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">Smart Cart</h1>
        {state.selectedRecipe?.title && (
          <div className="mb-4 flex flex-col items-start">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Recipe</span>
            <button
              onClick={() => setShowIngredientsModal(true)}
              className="text-base font-semibold text-orange-500 hover:text-orange-600 hover:underline transition-all text-left flex items-center gap-1.5 focus:outline-none"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              {state.selectedRecipe.title}
            </button>
          </div>
        )}
        <p className="text-gray-500 text-sm mb-6">{cart.length} items · Estimated total: ₹{total}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <h3 className="font-semibold text-sm text-gray-700 flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
              Budget Mode
            </h3>
            <div className="flex flex-wrap gap-2">
              {BUDGET_OPTIONS.map(limit => (
                <button key={limit} onClick={() => { dispatch({ type: 'SET_BUDGET_MODE', payload: true }); dispatch({ type: 'SET_BUDGET_LIMIT', payload: limit }); }}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all ${state.budgetMode && state.budgetLimit === limit ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'}`}>
                  Under ₹{limit}
                </button>
              ))}
              {state.budgetMode && <button onClick={() => dispatch({ type: 'SET_BUDGET_MODE', payload: false })} className="px-4 py-1.5 rounded-full text-xs font-medium border border-red-200 text-red-500 hover:bg-red-50">Clear</button>}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <h3 className="font-semibold text-sm text-gray-700 flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" /></svg>
              Health Mode
            </h3>
            <div className="flex flex-wrap gap-2">
              {HEALTH_FILTERS.map(f => (
                <button key={f} onClick={() => { dispatch({ type: 'SET_HEALTH_MODE', payload: true }); dispatch({ type: 'SET_HEALTH_FILTER', payload: f }); }}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all ${state.healthMode && state.healthFilter === f ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'}`}>
                  {f}
                </button>
              ))}
              {state.healthMode && <button onClick={() => dispatch({ type: 'SET_HEALTH_MODE', payload: false })} className="px-4 py-1.5 rounded-full text-xs font-medium border border-red-200 text-red-500 hover:bg-red-50">Clear</button>}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 mb-8">
          {cart.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-2xl">
              <span className="text-4xl block mb-3">🛒</span>
              <h3 className="font-bold text-gray-700 mb-1">Your cart is empty</h3>
              <p className="text-gray-500 text-sm">Go back and process a recipe to get started.</p>
            </div>
          ) : (
            cart.map((item, i) => {
              const displayName = item.selectedProduct?.name || item.originalName || item.name;
              const displayPrice = item.availableAtHome ? 0 : (item.price || 0);

              return (
                <div key={i} className={`border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${item.availableAtHome ? 'bg-gray-50/70 border-gray-200 opacity-70' : 'bg-white border-gray-200 hover:border-orange-200 hover:shadow-md'}`}>
                  
                  {/* Left Section: Details */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${item.availableAtHome ? 'bg-gray-200 text-gray-400' : 'bg-gradient-to-br from-orange-100 to-red-100 text-orange-500'}`}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-sm text-gray-900 truncate">{displayName}</h4>
                        {item.availableAtHome && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200">
                            Available at Home
                          </span>
                        )}
                      </div>
                      
                      {/* Sub-info: Recipe quantity vs packages */}
                      <p className="text-xs text-gray-500 mt-0.5">
                        Recipe need: <span className="font-semibold text-gray-700">{item.recipeQuantity} {item.recipeUnit}</span>
                      </p>
                      
                      {/* Dropdowns Side-by-Side */}
                      <div className="flex items-center gap-2 mt-2">
                        {/* Brand Selector */}
                        {item.availableBrands && item.availableBrands.length > 0 && (
                          <div className="flex flex-col">
                            <select
                              value={item.selectedBrand || ''}
                              onChange={(e) => handleBrandChange(i, e.target.value)}
                              className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-orange-500 transition-colors cursor-pointer"
                            >
                              {item.availableBrands.map((brand) => (
                                <option key={brand} value={brand}>{brand}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        
                        {/* Size Selector */}
                        {item.availableSizes && item.availableSizes.length > 0 && (
                          <div className="flex flex-col">
                            <select
                              value={item.selectedSize || ''}
                              onChange={(e) => handleSizeChange(i, e.target.value)}
                              className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-orange-500 transition-colors cursor-pointer"
                            >
                              {item.availableSizes.map((size) => (
                                <option key={size} value={size}>{size}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      <p className="text-sm font-bold text-orange-600 mt-2">
                        {item.availableAtHome ? '₹0 (Free)' : `₹${displayPrice}`}
                      </p>
                    </div>
                  </div>

                  {/* Right Section: Qty Counter and Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-100">
                    {/* Toggle Available At Home */}
                    <button
                      onClick={() => handleToggleAvailableAtHome(i)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${item.availableAtHome ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-500 border-gray-200 hover:border-green-300 hover:text-green-600'}`}
                    >
                      {item.availableAtHome ? 'Add to Buy List' : 'I Have at Home'}
                    </button>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white">
                        <button onClick={() => handleUpdate(i, { qty: Math.max(1, (item.qty || 1) - 1) })} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-50 text-sm">−</button>
                        <span className="w-8 h-8 flex items-center justify-center text-sm font-semibold text-gray-900">{item.qty || 1}</span>
                        <button onClick={() => handleUpdate(i, { qty: (item.qty || 1) + 1 })} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-50 text-sm">+</button>
                      </div>
                      
                      <button onClick={() => handleRemove(i)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>

                </div>
              );
            })
          )}
        </div>

        {cart.length > 0 && (
          <div className="max-w-md mx-auto bg-white border border-gray-200 rounded-2xl p-6 shadow-lg mb-12">
            <div className="flex justify-between text-sm py-2 text-gray-600"><span>Subtotal</span><span>₹{total}</span></div>
            <div className="flex justify-between text-sm py-2 text-gray-600"><span>Delivery Fee</span><span className="text-green-600 font-semibold">FREE</span></div>
            <div className="flex justify-between font-bold text-lg py-3 mt-2 border-t border-gray-100 text-gray-900"><span>Total</span><span>₹{total}</span></div>
            <button onClick={() => navigate(`/location/${finalVideoId}`)} className="gradient-bg text-white py-3.5 rounded-2xl font-bold text-sm hover:opacity-90 active:scale-95 transition-all w-full mt-4 flex items-center justify-center gap-2 shadow-lg">
              Continue to Delivery
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </button>
          </div>
        )}
      </div>
      {showIngredientsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 transform transition-all animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="gradient-bg px-6 py-5 flex items-center justify-between text-white">
              <div>
                <h3 className="font-bold text-lg">Recipe Ingredients</h3>
                <p className="text-white/80 text-xs mt-0.5">{state.selectedRecipe?.title}</p>
              </div>
              <button
                onClick={() => setShowIngredientsModal(false)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Ingredients List */}
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
              {state.extractedIngredients && state.extractedIngredients.length > 0 ? (
                state.extractedIngredients.map((ing, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
                    <span className="text-gray-900 font-medium text-sm">{ing.name}</span>
                    <span className="text-orange-600 font-semibold text-sm">
                      {ing.recipeQuantity || ing.quantity || ''} {ing.recipeUnit || ing.unit || 'pcs'}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm text-center py-4">No recipe ingredients found.</p>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowIngredientsModal(false)}
                className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl text-sm transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      <BottomNav />
      <FAB />
    </div>
  );
}
