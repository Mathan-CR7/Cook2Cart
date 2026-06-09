import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import AppBar from '../components/AppBar';
import BottomNav from '../components/BottomNav';
import PremiumBackground from '../components/PremiumBackground';
import FAB from '../components/FAB';
import { cartService } from '../utils/api';

const BUDGET_OPTIONS = [500, 1000, 1500, 2000];
const HEALTH_FILTERS = ['Diabetic', 'High Protein', 'Weight Loss', 'High BP'];

export default function SmartCartPage() {
  const navigate = useNavigate();
  const { videoId } = useParams();
  const { state, dispatch } = useApp();
  const [showIngredientsModal, setShowIngredientsModal] = useState(false);
  const cart = state.cart || [];
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
    <div className="c2c-root min-h-screen pb-32 overflow-x-hidden relative bg-[white]">
      <PremiumBackground />
      <AppBar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 relative z-10 animate-fade-slide-up">
        
        {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display font-extrabold text-3xl md:text-4xl text-[#1e2229]">Smart Shopping Cart</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-gray-400 text-sm font-display">{cart.length} items detected</span>
              <span className="w-1.5 h-1.5 rounded-full bg-gray-200" />
              {state.selectedRecipe?.title ? (
                <button
                  onClick={() => setShowIngredientsModal(true)}
                  className="text-xs font-bold text-[#ff6b35] hover:underline flex items-center gap-1 font-display"
                >
                  <span className="material-icon text-xs">receipt_long</span>
                  <span>View Original Recipe</span>
                </button>
              ) : (
                <span className="text-xs text-gray-400 font-display">Custom checklist</span>
              )}
            </div>
          </div>
          <div className="glass px-5 py-3.5 rounded-2xl border border-white/60 flex items-center gap-3 shadow-sm">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider font-display">Est. Total</span>
            <span className="font-display font-black text-xl text-[#ff6b35]">₹{total}</span>
          </div>
        </div>

        {/* Budget & Dietary filter blocks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          
          {/* Budget block */}
          <div className="glass p-5 rounded-2xl border border-white/60 flex flex-col justify-between shadow-sm">
            <div>
              <h3 className="font-display font-bold text-sm text-[#1e2229] flex items-center gap-2 mb-1.5">
                <span className="material-icon text-base text-[#ff6b35]">sell</span>
                <span>Budget Optimization</span>
              </h3>
              <p className="text-xs text-gray-500 mb-3.5 font-display">Automatically swap product brands to fit your spending target.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {BUDGET_OPTIONS.map(limit => {
                const isActive = state.budgetMode && state.budgetLimit === limit;
                return (
                  <button 
                    key={limit} 
                    onClick={() => { dispatch({ type: 'SET_BUDGET_MODE', payload: true }); dispatch({ type: 'SET_BUDGET_LIMIT', payload: limit }); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold font-display border transition-all duration-300 ${
                      isActive 
                        ? 'gradient-bg text-white border-transparent shadow-[0_4px_12px_rgba(255,107,53,0.2)]' 
                        : 'bg-white/60 text-gray-500 border-gray-200 hover:border-[#ff6b35]/30 hover:bg-white'
                    }`}
                  >
                    Under ₹{limit}
                  </button>
                );
              })}
              {state.budgetMode && (
                <button 
                  onClick={() => dispatch({ type: 'SET_BUDGET_MODE', payload: false })} 
                  className="px-3 py-1.5 rounded-xl text-xs font-bold font-display border border-red-200 text-red-500 bg-red-50 hover:bg-red-100 transition-all"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Dietary block */}
          <div className="glass p-5 rounded-2xl border border-white/60 flex flex-col justify-between shadow-sm">
            <div>
              <h3 className="font-display font-bold text-sm text-[#1e2229] flex items-center gap-2 mb-1.5">
                <span className="material-icon text-base text-[#ff6b35]">favorite</span>
                <span>Dietary Health Mode</span>
              </h3>
              <p className="text-xs text-gray-500 mb-3.5 font-display">Filter grocery brands matching your health requirements.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {HEALTH_FILTERS.map(f => {
                const isActive = state.healthMode && state.healthFilter === f;
                return (
                  <button 
                    key={f} 
                    onClick={() => { dispatch({ type: 'SET_HEALTH_MODE', payload: true }); dispatch({ type: 'SET_HEALTH_FILTER', payload: f }); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold font-display border transition-all duration-300 ${
                      isActive 
                        ? 'gradient-bg text-white border-transparent shadow-[0_4px_12px_rgba(255,107,53,0.2)]' 
                        : 'bg-white/60 text-gray-500 border-gray-200 hover:border-[#ff6b35]/30 hover:bg-white'
                    }`}
                  >
                    {f}
                  </button>
                );
              })}
              {state.healthMode && (
                <button 
                  onClick={() => dispatch({ type: 'SET_HEALTH_MODE', payload: false })} 
                  className="px-3 py-1.5 rounded-xl text-xs font-bold font-display border border-red-200 text-red-500 bg-red-50 hover:bg-red-100 transition-all"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Cart Item Checklist */}
        <div className="flex flex-col gap-3.5 mb-10">
          <AnimatePresence initial={false}>
            {cart.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="glass text-center py-20 rounded-3xl border border-white/60 shadow-sm"
              >
                <span className="material-icon text-5xl text-gray-300 mb-4 animate-float">shopping_cart</span>
                <h3 className="font-display font-extrabold text-[#1e2229] text-xl mb-2">Your shopping cart is empty</h3>
                <p className="text-gray-400 text-xs max-w-sm mx-auto mb-6 font-display">Import a recipe video link or search items to populate your checklist.</p>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/')} 
                  className="gradient-bg text-white font-bold font-display px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
                >
                  Import Recipe
                </motion.button>
              </motion.div>
            ) : (
              cart.map((item, i) => {
                const displayName = item.selectedProduct?.name || item.originalName || item.name;
                const displayPrice = item.availableAtHome ? 0 : (item.price || 0);

                return (
                  <motion.div 
                    key={displayName + "_" + i}
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.25 }}
                    className={`glass p-4 sm:p-5 rounded-2xl border transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm ${
                      item.availableAtHome 
                        ? 'border-gray-200/50 bg-gray-50/50 opacity-60' 
                        : 'border-white/60 hover:border-[#ff6b35]/20 hover:bg-white'
                    }`}
                  >
                    
                    {/* Item Description */}
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div 
                        className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                          item.availableAtHome 
                            ? 'bg-gray-100 text-gray-400 border-gray-200/50' 
                            : 'bg-[#ff6b35]/5 text-[#ff6b35] border-[#ff6b35]/12'
                        }`}
                      >
                        <span className="material-icon text-lg">restaurant</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-display font-bold text-base text-[#1e2229] truncate leading-tight">{displayName}</h4>
                          {item.availableAtHome && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20">
                              At Home
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-gray-400 mt-1 font-display">
                          Recipe call: <span className="font-semibold text-gray-500">{item.recipeQuantity} {item.recipeUnit}</span>
                        </p>

                        {/* Selectors dropdown */}
                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                          {item.availableBrands && item.availableBrands.length > 0 && (
                            <div className="relative">
                              <select
                                value={item.selectedBrand || ''}
                                onChange={(e) => handleBrandChange(i, e.target.value)}
                                className="bg-white border border-gray-200 text-gray-500 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#ff6b35] transition-colors cursor-pointer pr-6 appearance-none font-display font-bold"
                              >
                                {item.availableBrands.map((brand) => (
                                  <option key={brand} value={brand}>{brand}</option>
                                ))}
                              </select>
                              <span className="material-icon text-xs text-gray-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none">expand_more</span>
                            </div>
                          )}

                          {item.availableSizes && item.availableSizes.length > 0 && (
                            <div className="relative">
                              <select
                                value={item.selectedSize || ''}
                                onChange={(e) => handleSizeChange(i, e.target.value)}
                                className="bg-white border border-gray-200 text-gray-500 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#ff6b35] transition-colors cursor-pointer pr-6 appearance-none font-display font-bold"
                              >
                                {item.availableSizes.map((size) => (
                                  <option key={size} value={size}>{size}</option>
                                ))}
                              </select>
                              <span className="material-icon text-xs text-gray-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none">expand_more</span>
                            </div>
                          )}
                        </div>

                        <div className="text-[#ff6b35] font-display font-black text-sm mt-3.5">
                          {item.availableAtHome ? '₹0' : `₹${displayPrice * (item.qty || 1)}`}
                        </div>
                      </div>
                    </div>

                    {/* Actions & counter */}
                    <div className="flex items-center justify-between sm:justify-end gap-3.5 border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-100">
                      
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleToggleAvailableAtHome(i)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold font-display border transition-all duration-300 cursor-pointer ${
                          item.availableAtHome 
                            ? 'bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20 hover:bg-[#10b981]/20' 
                            : 'bg-white text-gray-400 border-gray-200 hover:border-[#10b981]/30 hover:text-[#10b981]'
                        }`}
                      >
                        {item.availableAtHome ? 'Buy List' : 'I Have This'}
                      </motion.button>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white">
                          <button 
                            onClick={() => handleUpdate(i, { qty: Math.max(1, (item.qty || 1) - 1) })} 
                            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-[#ff6b35] hover:bg-gray-50 transition-all text-base font-bold cursor-pointer"
                          >
                            −
                          </button>
                          <span className="w-6 h-8 flex items-center justify-center text-xs font-bold text-gray-700 font-display">{item.qty || 1}</span>
                          <button 
                            onClick={() => handleUpdate(i, { qty: (item.qty || 1) + 1 })} 
                            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-[#ff6b35] hover:bg-gray-50 transition-all text-base font-bold cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                        
                        <motion.button 
                          whileHover={{ scale: 1.1, color: '#ef4444' }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleRemove(i)} 
                          className="p-2 text-gray-400 hover:bg-red-50 rounded-xl transition-all border border-transparent cursor-pointer"
                        >
                          <span className="material-icon text-lg">delete</span>
                        </motion.button>
                      </div>

                    </div>

                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>

        {/* Checkout summary container */}
        {cart.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 25, delay: 0.15 }}
            className="glass max-w-md mx-auto rounded-3xl p-6 border border-[#ff6b35]/25 shadow-[0_10px_30px_rgba(255,107,53,0.04)] mb-12"
          >
            <div className="flex justify-between text-xs py-2 text-gray-400 font-display font-medium">
              <span>Cart Subtotal</span>
              <span className="font-semibold text-gray-700">₹{total}</span>
            </div>
            <div className="flex justify-between text-xs py-2 text-gray-400 font-display font-medium">
              <span>Delivery Fee</span>
              <span className="text-[#10b981] font-black uppercase tracking-wider text-[10px]">Free</span>
            </div>
            <div className="flex justify-between font-display font-extrabold text-lg py-4 mt-3 border-t border-gray-100 text-[#1e2229]">
              <span>Final Total</span>
              <span className="text-[#10b981] font-black">₹{total}</span>
            </div>
            <div className="rounded-2xl bg-orange-50/80 border border-orange-100 px-4 py-3 mt-2 text-xs text-gray-600 font-display leading-relaxed">
              <div className="font-black text-[#ff6b35] mb-1">Platform preview</div>
              <p>Frontend shows Blinkit, Instamart, and Zepto as checkout options. Backend API calls to these platforms are not implemented yet; real-time grocery integration is future scope.</p>
            </div>
            <motion.button 
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => navigate(`/location/${finalVideoId}`)} 
              className="gradient-bg text-white font-display font-bold py-4 rounded-xl text-sm transition-all w-full mt-4 flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(255,107,53,0.2)] cursor-pointer"
            >
              <span>Continue to Checkout</span>
              <span className="material-icon text-base !text-white">arrow_forward</span>
            </motion.button>
          </motion.div>
        )}
      </div>

      {/* Recipe Ingredients Details Modal Overlay */}
      {showIngredientsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg glass rounded-3xl overflow-hidden border border-white/60 shadow-[0_12px_40px_rgba(0,0,0,0.15)] transform transition-all animate-scale-in">
            
            {/* Modal Header */}
            <div className="gradient-bg px-6 py-5 flex items-center justify-between text-white">
              <div>
                <h3 className="font-display font-black text-lg">Original Recipe</h3>
                <p className="text-white/80 text-xs mt-0.5 truncate max-w-[320px] font-display font-medium">{state.selectedRecipe?.title}</p>
              </div>
              <button
                onClick={() => setShowIngredientsModal(false)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                aria-label="Close"
              >
                <span className="material-icon text-base !text-white">close</span>
              </button>
            </div>

            {/* Ingredients items list */}
            <div className="p-6 max-h-[50vh] overflow-y-auto space-y-3 bg-white">
              {state.extractedIngredients && state.extractedIngredients.length > 0 ? (
                state.extractedIngredients.map((ing, idx) => (
                  <div key={idx} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 font-display">
                    <span className="text-gray-700 text-sm font-semibold">{ing.name}</span>
                    <span className="text-[#ff6b35] font-black text-sm">
                      {ing.recipeQuantity || ing.quantity || ''} {ing.recipeUnit || ing.unit || 'pcs'}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-sm text-center py-4 font-display font-medium">No recipe ingredients found.</p>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowIngredientsModal(false)}
                className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-600 font-bold font-display rounded-xl text-sm transition-all"
              >
                Close View
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
