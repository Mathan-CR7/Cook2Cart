import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import AppBar from '../components/AppBar';
import BottomNav from '../components/BottomNav';
import FAB from '../components/FAB';
import { cartService } from '../utils/api';
import DownloadButton from '../components/DownloadButton';

export default function RecipeReviewPage() {
  const navigate = useNavigate();
  const { videoId } = useParams();
  const { state, dispatch } = useApp();
  const [editing, setEditing] = useState(null);
  const [newIng, setNewIng] = useState({ name: '', quantity: '', unit: 'pcs' });
  const [editingInstruction, setEditingInstruction] = useState(null);
  const [newStep, setNewStep] = useState('');
  const [justSaved, setJustSaved] = useState(false);

  const ingredients = state.extractedIngredients;
  const instructions = state.extractedInstructions || [];
  const isSaved = state.savedRecipes?.some(r => r.id === (state.selectedRecipe?.id || videoId));

  const handleSaveRecipe = () => {
    const recipe = {
      id: state.selectedRecipe?.id || videoId,
      videoId: state.selectedRecipe?.videoId || videoId,
      title: state.selectedRecipe?.title || 'My Recipe',
      thumbnailUrl: state.selectedRecipe?.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      savedAt: new Date().toISOString(),
      ingredients: state.extractedIngredients,
      instructions: state.extractedInstructions || [],
    };
    dispatch({ type: 'SAVE_RECIPE', payload: recipe });
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  const handleUpdate = (index, data) => dispatch({ type: 'UPDATE_INGREDIENT', payload: { index, data } });
  const handleRemove = (index) => dispatch({ type: 'REMOVE_INGREDIENT', payload: index });
  const handleAdd = () => {
    if (newIng.name && newIng.quantity) {
      dispatch({ type: 'ADD_INGREDIENT', payload: { 
        name: newIng.name, 
        recipeQuantity: newIng.quantity, 
        recipeUnit: newIng.unit || 'pcs',
        quantity: newIng.quantity,
        unit: newIng.unit || 'pcs',
        confidence: 1.0 
      } });
      setNewIng({ name: '', quantity: '', unit: 'pcs' });
    }
  };

  const handleUpdateInstruction = (index, text) => dispatch({ type: 'UPDATE_INSTRUCTION', payload: { index, text } });
  const handleRemoveInstruction = (index) => dispatch({ type: 'REMOVE_INSTRUCTION', payload: index });
  const handleAddInstruction = () => {
    if (newStep.trim()) {
      dispatch({ type: 'ADD_INSTRUCTION', payload: newStep.trim() });
      setNewStep('');
    }
  };

  const getConfidenceColor = (score) => {
    if (score >= 90) return 'text-green-600 bg-green-50';
    if (score >= 75) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  const generateCartItem = (ing) => {
    const name = (ing.name || '').toLowerCase();
    const displayQty = ing.recipeQuantity !== undefined && ing.recipeQuantity !== null ? ing.recipeQuantity : (ing.quantity !== undefined && ing.quantity !== null ? ing.quantity : 1);
    const displayUnit = ing.recipeUnit !== undefined && ing.recipeUnit !== null ? ing.recipeUnit : (ing.unit !== undefined && ing.unit !== null ? ing.unit : 'pcs');
    
    let brands = ['India Gate', 'Aashirvaad', 'Daawat', 'Fortune'];
    let sizes = ['1kg', '5kg', '10kg'];
    let basePrice = 50;
    let productName = ing.name;

    if (name.includes('rice')) {
      brands = ['India Gate', 'Aashirvaad', 'Daawat', 'Fortune'];
      sizes = ['1kg', '5kg', '10kg'];
      productName = 'Basmati Rice';
      basePrice = 140;
    } else if (name.includes('pasta')) {
      brands = ['Disano', 'Bambino', 'Barilla', 'Weikfield'];
      sizes = ['250g', '500g', '1kg'];
      productName = 'Penne Pasta';
      basePrice = 90;
    } else if (name.includes('oil')) {
      brands = ['Fortune', 'Saffola', 'Gemini', 'Dhara'];
      sizes = ['1L', '2L', '5L'];
      productName = 'Refined Oil';
      basePrice = 160;
    } else if (name.includes('salt')) {
      brands = ['Tata Salt', 'Aashirvaad', 'Catch', 'Patanjali'];
      sizes = ['1kg', '2kg'];
      productName = 'Iodized Salt';
      basePrice = 28;
    } else if (name.includes('garlic') || name.includes('ginger') || name.includes('onion') || name.includes('carrot') || name.includes('peas')) {
      brands = ['Fresh Organics', 'Local Farms', 'VeggieFresh'];
      sizes = ['250g', '500g', '1kg'];
      productName = ing.name;
      basePrice = 40;
    } else if (name.includes('butter')) {
      brands = ['Amul', 'Mother Dairy', 'Britannia', 'Nandini'];
      sizes = ['100g', '200g', '500g'];
      productName = 'Table Butter';
      basePrice = 56;
    } else if (name.includes('maida') || name.includes('flour')) {
      brands = ['Aashirvaad', 'Fortune', 'Patanjali', 'Rajdhani'];
      sizes = ['1kg', '2kg', '5kg'];
      productName = ing.name;
      basePrice = 45;
    } else if (name.includes('milk')) {
      brands = ['Amul', 'Mother Dairy', 'Nandini', 'Aavin'];
      sizes = ['500ml', '1L'];
      productName = 'Pasteurized Milk';
      basePrice = 30;
    } else {
      brands = ['Catch', 'Everest', 'MTR', 'MDH'];
      sizes = ['100g', '250g', '500g'];
      productName = ing.name;
      basePrice = 45;
    }

    const availableProducts = [];
    brands.forEach(brand => {
      sizes.forEach(size => {
        let factor = 1.0;
        if (size.endsWith('kg') || size.endsWith('L')) {
          const val = parseFloat(size);
          factor = val === 1 ? 1.0 : val === 2 ? 1.9 : val === 5 ? 4.5 : val === 10 ? 8.5 : val;
        } else if (size.endsWith('g') || size.endsWith('ml')) {
          const val = parseFloat(size);
          factor = val === 100 ? 0.15 : val === 200 ? 0.28 : val === 250 ? 0.35 : val === 500 ? 0.65 : 1.0;
        }
        
        const priceVal = Math.round(basePrice * factor * (brand === brands[0] ? 1.0 : brand === brands[1] ? 0.95 : brand === brands[2] ? 0.9 : 0.85));

        availableProducts.push({
          id: `dyn_${name.replace(/\s+/g, '_')}_${brand.toLowerCase().replace(/\s+/g, '_')}_${size}`,
          name: brand === brands[0] ? productName : `${brand} ${productName}`,
          brand: brand,
          size: size,
          price: priceVal,
          category: productName
        });
      });
    });

    const selectedBrand = brands[0];
    const selectedSize = sizes[0];
    const selectedProduct = availableProducts.find(p => p.brand === selectedBrand && p.size === selectedSize) || availableProducts[0];

    return {
      ingredientName: name,
      originalName: ing.name,
      recipeQuantity: parseFloat(displayQty) || 1,
      recipeUnit: displayUnit,
      quantity: (parseFloat(displayQty) || 1) * (name.includes('rice') ? 400 : 100),
      unit: name.includes('oil') || name.includes('milk') ? 'ml' : 'g',
      baseQuantity: name.includes('rice') ? 400 : 100,
      availableProducts: availableProducts,
      selectedProduct: selectedProduct,
      availableBrands: brands,
      selectedBrand: selectedBrand,
      availableSizes: sizes,
      selectedSize: selectedSize,
      price: selectedProduct.price,
      qty: 1,
      availableAtHome: name.includes('salt') || name.includes('water') || name.includes('oil'),
      recommendedBrands: brands
    };
  };

  const handleContinue = async () => {
    try {
      const formattedIngredients = ingredients.map(ing => {
        const displayQty = ing.recipeQuantity !== undefined && ing.recipeQuantity !== null ? ing.recipeQuantity : (ing.quantity !== undefined && ing.quantity !== null ? ing.quantity : 1);
        const displayUnit = ing.recipeUnit !== undefined && ing.recipeUnit !== null ? ing.recipeUnit : (ing.unit !== undefined && ing.unit !== null ? ing.unit : 'pcs');
        return {
          name: ing.name,
          recipeQuantity: parseFloat(displayQty) || 1,
          recipeUnit: displayUnit,
          quantity: parseFloat(displayQty) || 1,
          unit: displayUnit,
          confidence: ing.confidence || 0.95
        };
      });
      const response = await cartService.initialize(formattedIngredients, 4);
      dispatch({ type: 'SET_CART', payload: response.data });
      navigate(`/cart/${videoId}`);
    } catch (err) {
      console.error('Failed to initialize cart on backend, falling back to local simulation:', err);
      const cart = ingredients.map(ing => generateCartItem(ing));
      dispatch({ type: 'SET_CART', payload: cart });
      navigate(`/cart/${videoId}`);
    }
  };

  return (
    <div className="bg-white min-h-screen pb-16">
      <AppBar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Review Ingredients & Instructions</h1>
            <p className="text-gray-500 text-sm mt-1">Review the AI extracted ingredients and preparation steps below.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm font-semibold self-start md:self-auto">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>
            AI Accuracy: 92%
          </span>
        </div>

        {/* Side-by-Side Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          
          {/* Left Column: Ingredients */}
          <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
            {state.selectedRecipe?.title && (
              <div className="mb-6 p-4 bg-white border border-gray-200 rounded-2xl shadow-sm flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-orange-600 block mb-1">Recipe Title</span>
                  <h3 className="font-bold text-gray-900 text-base">{state.selectedRecipe.title}</h3>
                </div>
                {/* Action buttons row */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <DownloadButton
                    size="sm"
                    recipe={{
                      title: state.selectedRecipe?.title,
                      ingredients: state.extractedIngredients,
                      instructions: state.extractedInstructions || [],
                    }}
                  />
                  <button
                    onClick={handleSaveRecipe}
                    disabled={isSaved}
                    title={isSaved ? 'Already saved' : 'Save this recipe'}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      isSaved || justSaved
                        ? 'bg-orange-500 text-white border-orange-500 cursor-default'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill={isSaved || justSaved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    {justSaved ? 'Saved!' : isSaved ? 'Saved' : 'Save'}
                  </button>
                </div>
              </div>
            )}
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-2 h-6 bg-orange-500 rounded-full inline-block"></span>
              Ingredients ({ingredients.length})
            </h2>

            <div className="flex flex-col gap-2 mb-6">
              {ingredients.length === 0 ? (
                <div className="text-center py-16 bg-white border border-gray-200 rounded-2xl">
                  <span className="text-4xl block mb-3">🔍</span>
                  <p className="text-gray-500">No ingredients detected yet.</p>
                </div>
              ) : (
                ingredients.map((ing, i) => {
                  const score = Math.round((ing.confidence || 0.95) <= 1 ? (ing.confidence || 0.95) * 100 : (ing.confidence || 0.95));
                  const displayQty = ing.recipeQuantity !== undefined && ing.recipeQuantity !== null ? ing.recipeQuantity : (ing.quantity !== undefined && ing.quantity !== null ? ing.quantity : '');
                  const displayUnit = ing.recipeUnit !== undefined && ing.recipeUnit !== null ? ing.recipeUnit : (ing.unit !== undefined && ing.unit !== null ? ing.unit : 'pcs');

                  return (
                    <div key={i} className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-4 hover:border-orange-200 hover:shadow-md transition-all">
                      <span className={`text-[10px] md:text-xs font-bold px-2.5 py-1 rounded-full ${getConfidenceColor(score)}`}>
                        {score}% Match
                      </span>

                      {editing === i ? (
                        <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <input 
                            type="text" 
                            value={ing.name || ''} 
                            onChange={(e) => handleUpdate(i, { name: e.target.value })} 
                            placeholder="Ingredient Name"
                            className="flex-1 px-3 py-1.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 text-gray-900" 
                          />
                          <div className="flex items-center gap-2">
                            <input 
                              type="text" 
                              value={displayQty} 
                              onChange={(e) => handleUpdate(i, { recipeQuantity: e.target.value, quantity: e.target.value })} 
                              placeholder="Qty"
                              className="w-16 px-3 py-1.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 text-gray-900" 
                            />
                            <input 
                              type="text" 
                              value={displayUnit} 
                              onChange={(e) => handleUpdate(i, { recipeUnit: e.target.value, unit: e.target.value })} 
                              placeholder="Unit"
                              className="w-16 px-3 py-1.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 text-gray-900" 
                            />
                          </div>
                          <button onClick={() => setEditing(null)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          </button>
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center gap-2 min-w-0">
                          <span className="text-orange-600 font-bold text-sm min-w-[70px] flex-shrink-0">
                            {displayQty} {displayUnit}
                          </span>
                          <span className="text-gray-900 text-sm truncate">{ing.name}</span>
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
                  );
                })
              )}
            </div>

            {/* Add Ingredient Form */}
            <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <input type="text" value={newIng.name} onChange={(e) => setNewIng({ ...newIng, name: e.target.value })} placeholder="Ingredient name" className="flex-1 px-3 py-2 border-b-2 border-gray-200 text-sm focus:border-orange-500 focus:outline-none text-gray-900 placeholder-gray-400" />
              <div className="flex items-center gap-2">
                <input type="text" value={newIng.quantity} onChange={(e) => setNewIng({ ...newIng, quantity: e.target.value })} placeholder="Qty" className="w-20 px-3 py-2 border-b-2 border-gray-200 text-sm focus:border-orange-500 focus:outline-none text-gray-900 placeholder-gray-400" />
                <input type="text" value={newIng.unit} onChange={(e) => setNewIng({ ...newIng, unit: e.target.value })} placeholder="Unit" className="w-20 px-3 py-2 border-b-2 border-gray-200 text-sm focus:border-orange-500 focus:outline-none text-gray-900 placeholder-gray-400" />
              </div>
              <button onClick={handleAdd} disabled={!newIng.name || !newIng.quantity} className="px-5 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium text-sm hover:bg-orange-100 hover:text-orange-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                + Add
              </button>
            </div>
          </div>

          {/* Right Column: Instructions */}
          <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-2 h-6 bg-orange-500 rounded-full inline-block"></span>
              Instructions ({instructions.length} steps)
            </h2>

            <div className="flex flex-col gap-3 mb-6">
              {instructions.length === 0 ? (
                <div className="text-center py-16 bg-white border border-gray-200 rounded-2xl">
                  <span className="text-4xl block mb-3">🍳</span>
                  <p className="text-gray-500">No instructions detected yet.</p>
                </div>
              ) : (
                instructions.map((step, idx) => {
                  const stepNum = String(idx + 1).padStart(2, '0');
                  
                  return (
                    <div key={idx} className="bg-white border border-gray-200 rounded-2xl p-4 flex items-start gap-3.5 hover:border-orange-200 hover:shadow-md transition-all">
                      {/* Step Number Badge */}
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 text-orange-600 font-bold text-xs flex items-center justify-center">
                        {stepNum}
                      </span>

                      {/* Step Content / Editor */}
                      {editingInstruction === idx ? (
                        <div className="flex-1 flex flex-col items-stretch gap-2">
                          <textarea
                            value={step}
                            onChange={(e) => handleUpdateInstruction(idx, e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 text-gray-900 resize-none"
                          />
                          <button
                            onClick={() => setEditingInstruction(null)}
                            className="self-end px-4 py-1.5 bg-green-500 text-white rounded-lg text-xs font-semibold hover:bg-green-600 transition-colors flex items-center gap-1"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            Save Step
                          </button>
                        </div>
                      ) : (
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">{step}</p>
                        </div>
                      )}

                      {/* Controls */}
                      {editingInstruction !== idx && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => setEditingInstruction(idx)}
                            className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button
                            onClick={() => handleRemoveInstruction(idx)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Add Step Form */}
            <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-4 flex items-stretch gap-3">
              <input
                type="text"
                value={newStep}
                onChange={(e) => setNewStep(e.target.value)}
                placeholder="Add next cooking step..."
                className="flex-1 px-3 py-2 border-b-2 border-gray-200 text-sm focus:border-orange-500 focus:outline-none text-gray-900 placeholder-gray-400"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddInstruction();
                  }
                }}
              />
              <button
                onClick={handleAddInstruction}
                disabled={!newStep.trim()}
                className="px-5 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium text-sm hover:bg-orange-100 hover:text-orange-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
              >
                + Step
              </button>
            </div>
          </div>

        </div>

        {/* Generate Shopping Cart Button */}
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

