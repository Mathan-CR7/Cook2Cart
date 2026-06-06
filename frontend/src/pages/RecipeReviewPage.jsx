import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import AppBar from '../components/AppBar';
import BottomNav from '../components/BottomNav';
import FAB from '../components/FAB';

export default function RecipeReviewPage() {
  const navigate = useNavigate();
  const { videoId } = useParams();
  const { state, dispatch } = useApp();
  const [editing, setEditing] = useState(null);
  const [newIng, setNewIng] = useState({ name: '', quantity: '' });

  const ingredients = state.extractedIngredients;

  const handleUpdate = (index, data) => dispatch({ type: 'UPDATE_INGREDIENT', payload: { index, data } });
  const handleRemove = (index) => dispatch({ type: 'REMOVE_INGREDIENT', payload: index });
  const handleAdd = () => {
    if (newIng.name && newIng.quantity) {
      dispatch({ type: 'ADD_INGREDIENT', payload: { ...newIng, confidence: 100, unit: 'pcs' } });
      setNewIng({ name: '', quantity: '' });
    }
  };

  const getConfidenceColor = (score) => {
    if (score >= 90) return 'text-green-600 bg-green-50';
    if (score >= 75) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  const handleContinue = () => {
    const cart = ingredients.map(ing => ({ name: ing.name, quantity: ing.quantity, unit: ing.unit || 'pcs', qty: 1, price: Math.floor(Math.random() * 80) + 20 }));
    dispatch({ type: 'SET_CART', payload: cart });
    navigate(`/cart/${videoId}`);
  };

  return (
    <div className="bg-white min-h-screen pb-16">
      <AppBar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Review Ingredients</h1>
            <p className="text-gray-500 text-sm mt-1">AI detected {ingredients.length} ingredients. Review and adjust below.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm font-semibold">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>
            AI Accuracy: 92%
          </span>
        </div>

        <div className="flex flex-col gap-2 mb-6">
          {ingredients.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-2xl">
              <span className="text-4xl block mb-3">🔍</span>
              <p className="text-gray-500">No ingredients detected yet.</p>
            </div>
          ) : (
            ingredients.map((ing, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-4 hover:border-orange-200 hover:shadow-md transition-all">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${getConfidenceColor(ing.confidence || 95)}`}>{ing.confidence || 95}%</span>

                {editing === i ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input type="text" value={ing.name} onChange={(e) => handleUpdate(i, { name: e.target.value })} className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 text-gray-900" />
                    <input type="text" value={ing.quantity} onChange={(e) => handleUpdate(i, { quantity: e.target.value })} className="w-20 px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 text-gray-900" />
                    <button onClick={() => setEditing(null)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-orange-600 font-bold text-sm min-w-[70px]">{ing.quantity}</span>
                    <span className="text-gray-900 text-sm">{ing.name}</span>
                  </div>
                )}

                <div className="flex items-center gap-1">
                  <button onClick={() => setEditing(editing === i ? null : i)} className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button onClick={() => handleRemove(i)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-4 flex items-center gap-3 mb-8">
          <input type="text" value={newIng.name} onChange={(e) => setNewIng({ ...newIng, name: e.target.value })} placeholder="Ingredient name" className="flex-1 px-3 py-2 border-b-2 border-gray-200 text-sm focus:border-orange-500 focus:outline-none text-gray-900 placeholder-gray-400" />
          <input type="text" value={newIng.quantity} onChange={(e) => setNewIng({ ...newIng, quantity: e.target.value })} placeholder="Qty" className="w-20 px-3 py-2 border-b-2 border-gray-200 text-sm focus:border-orange-500 focus:outline-none text-gray-900 placeholder-gray-400" />
          <button onClick={handleAdd} disabled={!newIng.name || !newIng.quantity} className="px-5 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium text-sm hover:bg-orange-100 hover:text-orange-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
            + Add
          </button>
        </div>

        <div className="flex justify-center pb-12">
          <button onClick={handleContinue} className="gradient-bg text-white py-4 px-10 rounded-2xl font-bold text-sm hover:opacity-90 active:scale-95 transition-all flex items-center gap-2 shadow-lg">
            Generate Shopping Cart
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
          </button>
        </div>
      </div>
      <BottomNav />
      <FAB />
    </div>
  );
}
