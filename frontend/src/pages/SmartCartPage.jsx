import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import AppBar from '../components/AppBar';
import BottomNav from '../components/BottomNav';
import FAB from '../components/FAB';

const BUDGET_OPTIONS = [500, 1000, 1500, 2000];
const HEALTH_FILTERS = ['Diabetic', 'High Protein', 'Weight Loss', 'High BP'];

export default function SmartCartPage() {
  const navigate = useNavigate();
  const { videoId } = useParams();
  const { state, dispatch } = useApp();
  const cart = state.cart;
  const total = cart.reduce((sum, item) => sum + (item.price || 0) * (item.qty || 1), 0);

  const handleUpdate = (index, data) => dispatch({ type: 'UPDATE_CART_ITEM', payload: { index, data } });
  const handleRemove = (index) => dispatch({ type: 'REMOVE_CART_ITEM', payload: index });

  return (
    <div className="bg-white min-h-screen pb-16">
      <AppBar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">Smart Cart</h1>
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

        <div className="flex flex-col gap-2 mb-8">
          {cart.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-2xl">
              <span className="text-4xl block mb-3">🛒</span>
              <h3 className="font-bold text-gray-700 mb-1">Your cart is empty</h3>
              <p className="text-gray-500 text-sm">Go back and process a recipe to get started.</p>
            </div>
          ) : (
            cart.map((item, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-4 hover:border-orange-200 hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm text-gray-900">{item.name}</h4>
                  <p className="text-xs text-gray-500">{item.quantity} {item.unit}</p>
                  <p className="text-sm font-bold text-orange-600 mt-0.5">₹{item.price || 20}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                    <button onClick={() => handleUpdate(i, { qty: Math.max(1, (item.qty || 1) - 1) })} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-50 text-sm">−</button>
                    <span className="w-8 h-8 flex items-center justify-center text-sm font-semibold text-gray-900">{item.qty || 1}</span>
                    <button onClick={() => handleUpdate(i, { qty: (item.qty || 1) + 1 })} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-50 text-sm">+</button>
                  </div>
                  <button onClick={() => handleRemove(i)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="max-w-md mx-auto bg-white border border-gray-200 rounded-2xl p-6 shadow-lg mb-12">
            <div className="flex justify-between text-sm py-2 text-gray-600"><span>Subtotal</span><span>₹{total}</span></div>
            <div className="flex justify-between text-sm py-2 text-gray-600"><span>Delivery Fee</span><span className="text-green-600 font-semibold">FREE</span></div>
            <div className="flex justify-between font-bold text-lg py-3 mt-2 border-t border-gray-100 text-gray-900"><span>Total</span><span>₹{total}</span></div>
            <button onClick={() => navigate(`/location/${videoId}`)} className="gradient-bg text-white py-3.5 rounded-2xl font-bold text-sm hover:opacity-90 active:scale-95 transition-all w-full mt-4 flex items-center justify-center gap-2 shadow-lg">
              Continue to Delivery
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </button>
          </div>
        )}
      </div>
      <BottomNav />
      <FAB />
    </div>
  );
}
