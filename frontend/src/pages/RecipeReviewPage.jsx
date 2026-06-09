import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import AppBar from '../components/AppBar';
import BottomNav from '../components/BottomNav';
import PremiumBackground from '../components/PremiumBackground';
import FAB from '../components/FAB';
import { cartCatalogService, cartService, recipeCatalogService, videoCatalogService } from '../utils/api';
import DownloadButton from '../components/DownloadButton';
import { formatQty, formatUnit } from '../utils/quantityFormatter';
import { getEstimatedNutrition, getIngredientNutrition, getDisplayQuantityWithConversion } from '../utils/nutritionEstimator';

const toNumber = (value, fallback = 1) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const mapIngredientForRecipeDb = (ingredient) => {
  const rawQty = ingredient.recipeQuantity ?? ingredient.quantity;
  const rawUnit = ingredient.recipeUnit || ingredient.unit || 'pcs';
  const cleanQty = formatQty(rawQty);
  const cleanUnit = formatUnit(rawUnit, cleanQty);

  return {
    ingredientName: ingredient.name || ingredient.ingredientName || 'Ingredient',
    recipeQuantity: toNumber(cleanQty, 1),
    recipeUnit: cleanUnit,
    quantity: toNumber(cleanQty, 1),
    unit: cleanUnit,
    estimated: Boolean(ingredient.estimated),
    source: ingredient.source || 'user',
    confidence: toNumber(ingredient.confidence, 1),
  };
};

const mapCartItemForDb = (item, recipeId = null) => {
  const rawQty = item.recipeQuantity ?? item.quantity;
  const rawUnit = item.recipeUnit || item.unit || 'pcs';
  const cleanQty = formatQty(rawQty);
  const cleanUnit = formatUnit(rawUnit, cleanQty);

  return {
    ingredientId: item.ingredientId || item.dbIngredientId || null,
    selectedProductId: item.selectedProductId || null,
    recipeId: recipeId || item.recipeId || null,
    ingredientName: item.originalName || item.ingredientName || item.name || item.selectedProduct?.name || 'Ingredient',
    recipeQuantity: toNumber(cleanQty, 1),
    recipeUnit: cleanUnit,
    quantity: toNumber(cleanQty, 1),
    unit: cleanUnit,
    price: toNumber(item.price, 0) * toNumber(item.qty, 1),
    estimatedPrice: toNumber(item.price, 0) * toNumber(item.qty, 1),
    availableAtHome: Boolean(item.availableAtHome),
    selectedProduct: item.selectedProduct ? {
      ingredientId: item.ingredientId || item.dbIngredientId || null,
      productName: item.selectedProduct.name || item.selectedProduct.productName || item.originalName || item.name || 'Product',
      brand: item.selectedProduct.brand || 'Generic',
      size: item.selectedProduct.size || `${cleanQty} ${cleanUnit}`,
      price: toNumber(item.selectedProduct.price ?? item.price, 0),
      imageUrl: item.selectedProduct.imageUrl || item.selectedProduct.image || null,
      source: item.selectedProduct.source || 'Cook2Cart',
      availability: item.selectedProduct.availability || 'AVAILABLE',
    } : null,
  };
};

export default function RecipeReviewPage() {
  const navigate = useNavigate();
  const { videoId } = useParams();
  const { state, dispatch } = useApp();
  const [editing, setEditing] = useState(null);
  const [newIng, setNewIng] = useState({ name: '', quantity: '', unit: 'pcs' });
  const [editingInstruction, setEditingInstruction] = useState(null);
  const [newStep, setNewStep] = useState('');
  const [justSaved, setJustSaved] = useState(false);

  const ingredients = state.extractedIngredients || [];
  const instructions = state.extractedInstructions || [];
  const localRecipeId = state.selectedRecipe?.id || videoId;
  const isSaved = state.savedRecipes?.some(r => String(r.id) === String(localRecipeId));

  const handleSaveRecipe = async () => {
    const recipe = {
      id: localRecipeId,
      videoId: state.selectedRecipe?.videoId || videoId,
      dbRecipeId: state.selectedRecipe?.dbRecipeId || null,
      dbVideoId: state.selectedRecipe?.dbVideoId || null,
      title: state.selectedRecipe?.title || 'My Recipe',
      thumbnailUrl: state.selectedRecipe?.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      savedAt: new Date().toISOString(),
      ingredients: state.extractedIngredients,
      instructions: state.extractedInstructions || [],
    };
    dispatch({ type: 'SAVE_RECIPE', payload: recipe });
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);

    const saveVideoAction = async () => {
      if (!state.user?.id) return;
      let dbVideoId = state.selectedRecipe?.dbVideoId;

      if (!dbVideoId) {
        const response = await videoCatalogService.saveVideo({
          youtubeVideoId: recipe.videoId,
          title: recipe.title,
          channelName: state.selectedRecipe?.channelTitle || state.selectedRecipe?.channelName || 'Cook2Cart',
          thumbnailUrl: recipe.thumbnailUrl,
          videoUrl: state.selectedRecipe?.videoUrl || `https://www.youtube.com/watch?v=${recipe.videoId}`,
          duration: state.selectedRecipe?.duration || null,
        });
        dbVideoId = response.data.id;
      }

      await videoCatalogService.saveUserAction({
        userId: state.user.id,
        videoId: dbVideoId,
        actionType: 'SAVED',
      });
    };

    try {
      await saveVideoAction();
      let recipeId = state.selectedRecipe?.dbRecipeId;

      if (!recipeId) {
        const response = await recipeCatalogService.createRecipe({
          userId: state.user?.id || null,
          videoId: state.selectedRecipe?.dbVideoId || null,
          recipeName: recipe.title,
          cuisine: null,
          thumbnailUrl: recipe.thumbnailUrl,
          ingredients: state.extractedIngredients.map(mapIngredientForRecipeDb),
          instructions: state.extractedInstructions || [],
        });
        recipeId = response.data.id;
        recipe.dbRecipeId = recipeId;
        dispatch({ type: 'SAVE_RECIPE', payload: recipe });
        dispatch({
          type: 'SET_SELECTED_RECIPE',
          payload: { ...state.selectedRecipe, dbRecipeId: recipeId },
        });
      }

    } catch (err) {
      console.error('Failed to save recipe favorite to database, local save completed:', err);
    }
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

  const calculateTotalNutrition = (items) => {
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    const vitaminsSet = new Set();

    items.forEach(item => {
      const rawQty = item.recipeQuantity !== undefined && item.recipeQuantity !== null ? item.recipeQuantity : (item.quantity !== undefined && item.quantity !== null ? item.quantity : '');
      const rawUnit = item.recipeUnit !== undefined && item.recipeUnit !== null ? item.recipeUnit : (item.unit !== undefined && item.unit !== null ? item.unit : 'pcs');
      const qty = formatQty(rawQty);
      const unit = formatUnit(rawUnit, qty);
      
      const nutrition = getIngredientNutrition(item.name || '', qty, unit);
      totalCalories += nutrition.calories;
      totalProtein += nutrition.protein;
      totalCarbs += nutrition.carbohydrates;
      totalFat += nutrition.fat;
      
      if (nutrition.vitamins) {
        nutrition.vitamins.split(',').forEach(v => {
          const cleanV = v.trim();
          if (cleanV) vitaminsSet.add(cleanV);
        });
      }
    });
    
    const vitaminsList = vitaminsSet.size > 0 
      ? Array.from(vitaminsSet).slice(0, 4).join(', ')
      : 'Minerals';
    
    return {
      calories: `${totalCalories} kcal`,
      protein: `${totalProtein.toFixed(1)}g`,
      carbohydrates: `${totalCarbs.toFixed(1)}g`,
      fat: `${totalFat.toFixed(1)}g`,
      vitamins: vitaminsList
    };
  };

  const getConfidenceColor = (score) => {
    if (score >= 90) return 'text-[#10b981] bg-[#10b981]/10 border-[#10b981]/20';
    if (score >= 75) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    return 'text-[#ef4444] bg-[#ef4444]/10 border-[#ef4444]/20';
  };

  const generateCartItem = (ing) => {
    const name = (ing.name || '').toLowerCase();
    const rawQty = ing.recipeQuantity !== undefined && ing.recipeQuantity !== null ? ing.recipeQuantity : (ing.quantity !== undefined && ing.quantity !== null ? ing.quantity : 1);
    const rawUnit = ing.recipeUnit !== undefined && ing.recipeUnit !== null ? ing.recipeUnit : (ing.unit !== undefined && ing.unit !== null ? ing.unit : 'pcs');
    const displayQty = formatQty(rawQty);
    const displayUnit = formatUnit(rawUnit, displayQty);
    
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
      ingredientId: ing.ingredientId || ing.dbIngredientId || null,
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
    const recipeTitle = state.selectedRecipe?.title || 'My Recipe';
    const recipeThumbnail = state.selectedRecipe?.thumbnailUrl || '';

    try {
      const formattedIngredients = ingredients.map(ing => {
        const rawQty = ing.recipeQuantity !== undefined && ing.recipeQuantity !== null ? ing.recipeQuantity : (ing.quantity !== undefined && ing.quantity !== null ? ing.quantity : 1);
        const rawUnit = ing.recipeUnit !== undefined && ing.recipeUnit !== null ? ing.recipeUnit : (ing.unit !== undefined && ing.unit !== null ? ing.unit : 'pcs');
        const cleanQty = formatQty(rawQty);
        const cleanUnit = formatUnit(rawUnit, cleanQty);
        return {
          ingredientId: ing.ingredientId || ing.dbIngredientId || null,
          name: ing.name,
          recipeQuantity: toNumber(cleanQty, 1),
          recipeUnit: cleanUnit,
          quantity: toNumber(cleanQty, 1),
          unit: cleanUnit,
          confidence: ing.confidence || 0.95
        };
      });
      const response = await cartService.initialize(formattedIngredients, 4, recipeTitle);
      const cartData = response.data;
      if (cartData) {
        const items = Array.isArray(cartData) ? cartData : (cartData.items || []);
        items.forEach(item => {
          if (!item.recipeName) item.recipeName = recipeTitle;
          if (!item.recipeThumbnail) item.recipeThumbnail = recipeThumbnail;
        });
      }
      dispatch({ type: 'SET_CART', payload: cartData });
      const generatedItems = Array.isArray(cartData) ? cartData : (cartData?.items || []);
      const dbItems = generatedItems.map((item) => {
        const mapped = mapCartItemForDb(item, state.selectedRecipe?.dbRecipeId || null);
        mapped.recipeName = recipeTitle;
        mapped.recipeThumbnail = recipeThumbnail;
        return mapped;
      });
      if (dbItems.length > 0) {
        cartCatalogService.createCart({
          userId: state.user?.id || null,
          items: dbItems,
        }).catch((err) => {
          console.error('Failed to save generated cart to database, continuing:', err);
        });
      }
      navigate(`/cart/${videoId}`);
    } catch (err) {
      console.error('Failed to initialize cart on backend, falling back to local simulation:', err);
      const cart = ingredients.map(ing => {
        const item = generateCartItem(ing);
        item.recipeName = recipeTitle;
        item.recipeThumbnail = recipeThumbnail;
        return item;
      });
      dispatch({ type: 'SET_CART', payload: cart });
      cartCatalogService.createCart({
        userId: state.user?.id || null,
        items: cart.map((item) => {
          const mapped = mapCartItemForDb(item, state.selectedRecipe?.dbRecipeId || null);
          mapped.recipeName = recipeTitle;
          mapped.recipeThumbnail = recipeThumbnail;
          return mapped;
        }),
      }).catch((saveErr) => {
        console.error('Failed to save fallback cart to database, continuing:', saveErr);
      });
      navigate(`/cart/${videoId}`);
    }
  };

  return (
    <div className="c2c-root min-h-screen pb-32 overflow-x-hidden relative bg-[white]">
      <PremiumBackground />
      <AppBar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 relative z-10 animate-fade-slide-up font-display">
        
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="font-display font-black text-3xl md:text-4xl text-[#1e2229]">Review AI Ingredients</h1>
            <p className="text-gray-400 text-sm mt-1 font-display font-medium">Verify or adjust items and steps before generating your grocery cart.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#10b981]/10 border border-[#10b981]/20 text-[#10b981] text-xs font-bold uppercase tracking-wider">
              <span className="material-icon text-xs fill">auto_awesome</span>
              <span>AI confidence: 94%</span>
            </span>
          </div>
        </div>

        {/* Double-Panel Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
          
          {/* Left Panel: Ingredients (7 columns) */}
          <div className="lg:col-span-7 glass p-6 rounded-3xl border border-white/60 flex flex-col justify-between shadow-sm">
            <div>
              
              {/* Recipe card wrapper */}
              {state.selectedRecipe?.title && (
                <div className="mb-6 p-4 bg-white/40 border border-[#ff6b35]/8 rounded-2xl flex items-center justify-between gap-3 shadow-sm">
                  <div className="min-w-0">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-gray-400 block mb-0.5 font-display">Active Recipe</span>
                    <h3 className="font-display font-extrabold text-[#1e2229] text-sm truncate pr-2">{state.selectedRecipe.title}</h3>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <DownloadButton
                      size="sm"
                      recipe={{
                        title: state.selectedRecipe?.title,
                        ingredients: state.extractedIngredients,
                        instructions: state.extractedInstructions || [],
                      }}
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleSaveRecipe}
                      disabled={isSaved}
                      className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        isSaved || justSaved
                          ? 'bg-[#ff6b35]/10 text-[#ff6b35] border-[#ff6b35]/20'
                          : 'bg-white border-gray-200 text-gray-400 hover:border-[#ff6b35]/30 hover:text-[#ff6b35]'
                      }`}
                    >
                      <span className="material-icon text-xs">{isSaved || justSaved ? 'bookmark' : 'bookmark_border'}</span>
                      <span>{justSaved ? 'Saved!' : isSaved ? 'Saved' : 'Save'}</span>
                    </motion.button>
                  </div>
                </div>
              )}

              {state.selectedRecipe?.title && (
                (() => {
                  const nutrition = calculateTotalNutrition(ingredients);
                  return (
                    <div className="glass p-5 rounded-2xl border border-emerald-500/15 bg-emerald-55/5 shadow-sm mb-6 animate-fade-slide-up">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="material-icon text-emerald-600 text-lg">analytics</span>
                        <h4 className="font-display font-extrabold text-sm text-emerald-800">Estimated Nutritional Profile (Per Serving)</h4>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <div className="bg-white/60 rounded-xl p-3 border border-emerald-100/50 text-center">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-display">Calories</div>
                          <div className="font-display font-black text-base text-emerald-700 mt-0.5">{nutrition.calories}</div>
                        </div>
                        <div className="bg-white/60 rounded-xl p-3 border border-emerald-100/50 text-center">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-display">Protein</div>
                          <div className="font-display font-black text-base text-emerald-700 mt-0.5">{nutrition.protein}</div>
                        </div>
                        <div className="bg-white/60 rounded-xl p-3 border border-emerald-100/50 text-center">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-display">Carbs</div>
                          <div className="font-display font-black text-base text-emerald-700 mt-0.5">{nutrition.carbohydrates}</div>
                        </div>
                        <div className="bg-white/60 rounded-xl p-3 border border-emerald-100/50 text-center">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-display">Fat</div>
                          <div className="font-display font-black text-base text-emerald-700 mt-0.5">{nutrition.fat}</div>
                        </div>
                        <div className="bg-white/60 rounded-xl p-3 border border-emerald-100/50 text-center col-span-2 sm:col-span-1 flex flex-col justify-center">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-display">Vitamins</div>
                          <div className="font-display font-extrabold text-[10px] text-emerald-600 mt-1 line-clamp-2 leading-tight">
                            {nutrition.vitamins}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}

              <h2 className="font-display font-black text-xl text-[#1e2229] mb-6 flex items-center gap-2">
                <span className="w-1.5 h-5 bg-[#ff6b35] rounded-full" />
                <span>Extracted Ingredients ({ingredients.length})</span>
              </h2>

              {/* Ingredients List */}
              <div className="flex flex-col gap-2.5 mb-6">
                <AnimatePresence initial={false}>
                  {ingredients.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center py-16 bg-white/40 rounded-2xl border border-dashed border-gray-200 shadow-sm"
                    >
                      <span className="material-icon text-4xl text-gray-300 block mb-2">find_in_page</span>
                      <p className="text-gray-400 text-xs font-medium">No ingredients detected.</p>
                    </motion.div>
                  ) : (
                    ingredients.map((ing, i) => {
                      const score = Math.round((ing.confidence || 0.95) <= 1 ? (ing.confidence || 0.95) * 100 : (ing.confidence || 0.95));
                      const rawQty = ing.recipeQuantity !== undefined && ing.recipeQuantity !== null ? ing.recipeQuantity : (ing.quantity !== undefined && ing.quantity !== null ? ing.quantity : '');
                      const rawUnit = ing.recipeUnit !== undefined && ing.recipeUnit !== null ? ing.recipeUnit : (ing.unit !== undefined && ing.unit !== null ? ing.unit : 'pcs');
                      const displayQty = formatQty(rawQty);
                      const displayUnit = formatUnit(rawUnit, displayQty);

                      return (
                        <motion.div 
                          key={ing.name || i}
                          layout
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.25 }}
                          className="bg-white/40 border border-white/60 rounded-2xl p-4 flex items-center justify-between gap-4 hover:border-[#ff6b35]/20 transition-all duration-300 shadow-sm"
                        >
                          
                          {editing === i ? (
                            <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                              <input 
                                type="text" 
                                value={ing.name || ''} 
                                onChange={(e) => handleUpdate(i, { name: e.target.value })} 
                                placeholder="Name"
                                className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-[#1e2229] focus:outline-none focus:border-[#ff6b35]" 
                              />
                              <div className="flex items-center gap-2">
                                <input 
                                  type="text" 
                                  value={displayQty} 
                                  onChange={(e) => handleUpdate(i, { recipeQuantity: e.target.value, quantity: e.target.value })} 
                                  placeholder="Qty"
                                  className="w-16 bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-[#1e2229] focus:outline-none focus:border-[#ff6b35]" 
                                />
                                <input 
                                  type="text" 
                                  value={displayUnit} 
                                  onChange={(e) => handleUpdate(i, { recipeUnit: e.target.value, unit: e.target.value })} 
                                  placeholder="Unit"
                                  className="w-16 bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-[#1e2229] focus:outline-none focus:border-[#ff6b35]" 
                                />
                              </div>
                              <button 
                                onClick={() => setEditing(null)} 
                                className="p-1.5 bg-[#10b981]/10 border border-[#10b981]/20 text-[#10b981] rounded-lg hover:bg-[#10b981]/20 cursor-pointer"
                              >
                                <span className="material-icon text-sm">check</span>
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border flex-shrink-0 ${getConfidenceColor(score)}`}>
                                {score}% Match
                              </span>
                              <div className="flex-1 min-w-0 flex flex-col">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-[#ff6b35] font-display font-extrabold text-sm flex-shrink-0">{getDisplayQuantityWithConversion(ing.name || '', displayQty, displayUnit)}</span>
                                  <span className="text-gray-700 text-sm font-semibold truncate">{ing.name}</span>
                                </div>
                                {(() => {
                                  const ingNutrition = getIngredientNutrition(ing.name || '', displayQty, displayUnit);
                                  return (
                                    <p className="text-[10px] text-emerald-600 font-semibold mt-1 font-display flex items-center gap-2 flex-wrap">
                                      <span className="inline-flex items-center gap-0.5">
                                        <span className="material-icon text-[10px]">bolt</span>
                                        <span>{ingNutrition.calories} kcal</span>
                                      </span>
                                      <span>•</span>
                                      <span>P: {ingNutrition.protein}g</span>
                                      <span>•</span>
                                      <span>C: {ingNutrition.carbohydrates}g</span>
                                      <span>•</span>
                                      <span>F: {ingNutrition.fat}g</span>
                                      {ingNutrition.vitamins && (
                                        <>
                                          <span>•</span>
                                          <span className="text-gray-400 text-[9px] font-medium">{ingNutrition.vitamins.split(',')[0]}</span>
                                        </>
                                      )}
                                    </p>
                                  );
                                })()}
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button 
                              onClick={() => setEditing(editing === i ? null : i)} 
                              className="p-2 text-gray-400 hover:text-[#ff6b35] hover:bg-gray-50 rounded-xl transition-all border border-transparent hover:border-gray-200/50 cursor-pointer"
                            >
                              <span className="material-icon text-base">edit</span>
                            </button>
                            <button 
                              onClick={() => handleRemove(i)} 
                              className="p-2 text-gray-400 hover:text-[#ef4444] hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100/20 cursor-pointer"
                            >
                              <span className="material-icon text-base">delete</span>
                            </button>
                          </div>

                        </motion.div>
                      );
                    })
                  )}
                </AnimatePresence>
              </div>

            </div>

            {/* Add ingredient details form */}
            <div className="bg-white/50 border border-gray-200 border-dashed rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shadow-sm">
              <input 
                type="text" 
                value={newIng.name} 
                onChange={(e) => setNewIng({ ...newIng, name: e.target.value })} 
                placeholder="New Ingredient Name" 
                className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-[#ff6b35] placeholder-gray-450" 
              />
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newIng.quantity} 
                  onChange={(e) => setNewIng({ ...newIng, quantity: e.target.value })} 
                  placeholder="Qty" 
                  className="w-16 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-[#ff6b35] placeholder-gray-450" 
                />
                <input 
                  type="text" 
                  value={newIng.unit} 
                  onChange={(e) => setNewIng({ ...newIng, unit: e.target.value })} 
                  placeholder="Unit" 
                  className="w-16 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-[#ff6b35] placeholder-gray-450" 
                />
              </div>
              <button 
                onClick={handleAdd} 
                disabled={!newIng.name || !newIng.quantity} 
                className="px-4 py-2 gradient-bg text-white font-bold font-display rounded-xl text-xs hover:scale-[1.01] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0 flex items-center justify-center gap-1 shadow-sm"
              >
                <span className="material-icon text-xs !text-white">add</span>
                <span>Add Item</span>
              </button>
            </div>

          </div>

          {/* Right Panel: Preparation Steps Timeline (5 columns) */}
          <div className="lg:col-span-5 glass p-6 rounded-3xl border border-white/60 flex flex-col justify-between shadow-sm">
            <div>
              <h2 className="font-display font-black text-xl text-[#1e2229] mb-6 flex items-center gap-2">
                <span className="w-1.5 h-5 bg-[#ff6b35] rounded-full" />
                <span>Preparation Steps ({instructions.length})</span>
              </h2>

              <div className="flex flex-col gap-3 mb-6 relative">
                <AnimatePresence initial={false}>
                  {instructions.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center py-16 bg-white/40 rounded-2xl border border-dashed border-gray-200 shadow-sm"
                    >
                      <span className="material-icon text-4xl text-gray-300 block mb-2">receipt</span>
                      <p className="text-gray-400 text-xs font-medium">No instructions parsed.</p>
                    </motion.div>
                  ) : (
                    instructions.map((step, idx) => {
                      const stepNum = String(idx + 1).padStart(2, '0');
                      return (
                        <motion.div 
                          key={step.substring(0, 15) + "_" + idx}
                          layout
                          initial={{ opacity: 0, x: 15 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.25 }}
                          className="bg-white/40 border border-white/60 rounded-2xl p-4 flex items-start gap-3.5 hover:border-[#ff6b35]/20 transition-all duration-300 shadow-sm"
                        >
                          {/* Timeline bubble badge */}
                          <div className="w-7 h-7 rounded-full bg-[#ff6b35]/8 text-[#ff6b35] font-display font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5 border border-[#ff6b35]/20">
                            {stepNum}
                          </div>

                          {editingInstruction === idx ? (
                            <div className="flex-1 flex flex-col gap-2">
                              <textarea
                                value={step}
                                onChange={(e) => handleUpdateInstruction(idx, e.target.value)}
                                rows={3}
                                className="w-full bg-white border border-gray-200 rounded-xl p-3 text-xs text-gray-700 focus:outline-none focus:border-[#ff6b35] resize-none"
                              />
                              <button
                                onClick={() => setEditingInstruction(null)}
                                className="self-end px-3 py-1 bg-[#10b981]/10 border border-[#10b981]/20 text-[#10b981] rounded-lg text-xs font-bold hover:bg-[#10b981]/20 transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <span className="material-icon text-xs">check</span>
                                <span>Done</span>
                              </button>
                            </div>
                          ) : (
                            <div className="flex-1 min-w-0">
                              <p className="text-gray-650 text-xs leading-relaxed font-display whitespace-pre-wrap">{step}</p>
                            </div>
                          )}

                          {editingInstruction !== idx && (
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => setEditingInstruction(idx)}
                                className="p-1.5 text-gray-400 hover:text-[#ff6b35] hover:bg-gray-50 rounded-lg transition-all cursor-pointer"
                              >
                                <span className="material-icon text-sm">edit</span>
                              </button>
                              <button
                                onClick={() => handleRemoveInstruction(idx)}
                                className="p-1.5 text-gray-400 hover:text-[#ef4444] hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                              >
                                <span className="material-icon text-sm">delete</span>
                              </button>
                            </div>
                          )}

                        </motion.div>
                      );
                    })
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Add step form field */}
            <div className="bg-white/50 border border-gray-200 border-dashed rounded-2xl p-4 flex items-center gap-2 shadow-sm">
              <input
                type="text"
                value={newStep}
                onChange={(e) => setNewStep(e.target.value)}
                placeholder="Add next instruction step..."
                className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-[#ff6b35] placeholder-gray-500"
                onKeyDown={(e) => e.key === 'Enter' && handleAddInstruction()}
              />
              <button
                onClick={handleAddInstruction}
                disabled={!newStep.trim()}
                className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-500 border border-gray-200 rounded-xl font-bold font-display text-xs hover:scale-[1.01] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0 flex items-center justify-center gap-1"
              >
                <span className="material-icon text-xs !text-gray-500">add</span>
                <span>Add Step</span>
              </button>
            </div>

          </div>

        </div>

        {/* Generate Cart CTA */}
        <div className="flex justify-center pb-16">
          <motion.button 
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleContinue} 
            className="gradient-bg text-white font-display font-bold py-4.5 px-10 rounded-2xl text-sm flex items-center gap-2.5 shadow-[0_6px_25px_rgba(255,107,53,0.35)] cursor-pointer"
          >
            <span>Generate Shopping Cart</span>
            <span className="material-icon text-base !text-white animate-float">arrow_forward</span>
          </motion.button>
        </div>

      </div>

      <BottomNav />
      <FAB />
    </div>
  );
}
