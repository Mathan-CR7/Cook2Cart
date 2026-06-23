import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import AppBar from '../components/AppBar';
import BottomNav from '../components/BottomNav';
import FAB from '../components/FAB';
import { recipeCatalogService, videoCatalogService } from '../utils/api';
import DownloadButton from '../components/DownloadButton';

const toNumber = (value, fallback = 1) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const mapIngredientForRecipeDb = (ingredient) => ({
  ingredientName: ingredient.name || ingredient.ingredientName || 'Ingredient',
  recipeQuantity: toNumber(ingredient.recipeQuantity ?? ingredient.quantity, 1),
  recipeUnit: ingredient.recipeUnit || ingredient.unit || 'pcs',
  quantity: toNumber(ingredient.quantity ?? ingredient.recipeQuantity, 1),
  unit: ingredient.unit || ingredient.recipeUnit || 'pcs',
  estimated: Boolean(ingredient.estimated),
  source: ingredient.source || 'user',
  confidence: toNumber(ingredient.confidence, 1),
});

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
      if (!state.user?.id) return recipe.dbVideoId;
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

      recipe.dbVideoId = dbVideoId;
      await videoCatalogService.saveUserAction({
        userId: state.user.id,
        videoId: dbVideoId,
        actionType: 'SAVED',
      });
      return dbVideoId;
    };

    try {
      const savedDbVideoId = await saveVideoAction();
      let recipeId = state.selectedRecipe?.dbRecipeId;

      if (!recipeId) {
        const response = await recipeCatalogService.createRecipe({
          userId: state.user?.id || null,
          videoId: savedDbVideoId || recipe.dbVideoId || state.selectedRecipe?.dbVideoId || null,
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
          payload: { ...state.selectedRecipe, dbRecipeId: recipeId, dbVideoId: savedDbVideoId || recipe.dbVideoId },
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

  const getConfidenceColor = (score) => {
    if (score >= 90) return 'text-green-600 bg-green-50';
    if (score >= 75) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  const getSourceBadge = (source) => {
    if (!source) return null;
    const src = source.toLowerCase();
    if (src.includes('description') && src.includes('transcript')) {
      return (
        <span className="inline-flex items-center text-[10px] font-extrabold tracking-wide uppercase px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100/50 flex-shrink-0 shadow-[0_1px_2px_rgba(79,70,229,0.03)]">
          Desc + Transcript
        </span>
      );
    }
    if (src.includes('description')) {
      return (
        <span className="inline-flex items-center text-[10px] font-extrabold tracking-wide uppercase px-2.5 py-1 rounded-xl bg-blue-50 text-blue-600 border border-blue-100/50 flex-shrink-0 shadow-[0_1px_2px_rgba(37,99,235,0.03)]">
          Description
        </span>
      );
    }
    if (src.includes('transcript')) {
      return (
        <span className="inline-flex items-center text-[10px] font-extrabold tracking-wide uppercase px-2.5 py-1 rounded-xl bg-violet-50 text-violet-600 border border-violet-100/50 flex-shrink-0 shadow-[0_1px_2px_rgba(124,58,237,0.03)]">
          Transcript
        </span>
      );
    }
    if (src.includes('speech') || src.includes('audio')) {
      return (
        <span className="inline-flex items-center text-[10px] font-extrabold tracking-wide uppercase px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/50 flex-shrink-0 shadow-[0_1px_2px_rgba(5,150,105,0.03)]">
          Audio
        </span>
      );
    }
    if (src.includes('image')) {
      return (
        <span className="inline-flex items-center text-[10px] font-extrabold tracking-wide uppercase px-2.5 py-1 rounded-xl bg-amber-50 text-amber-600 border border-amber-100/50 flex-shrink-0 shadow-[0_1px_2px_rgba(217,119,6,0.03)]">
          Image
        </span>
      );
    }
    return (
      <span className="inline-flex items-center text-[10px] font-extrabold tracking-wide uppercase px-2.5 py-1 rounded-xl bg-gray-50 text-gray-500 border border-gray-150 flex-shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
        {source}
      </span>
    );
  };

  const handleContinue = async () => {
    try {
      let recipeId = state.selectedRecipe?.dbRecipeId;

      if (!recipeId) {
        const response = await recipeCatalogService.createRecipe({
          userId: state.user?.id || null,
          videoId: state.selectedRecipe?.dbVideoId || null,
          recipeName: state.selectedRecipe?.title || 'My Recipe',
          cuisine: null,
          thumbnailUrl: state.selectedRecipe?.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          ingredients: state.extractedIngredients.map(mapIngredientForRecipeDb),
          instructions: state.extractedInstructions || [],
        });
        recipeId = response.data.id;
        dispatch({
          type: 'SET_SELECTED_RECIPE',
          payload: { ...state.selectedRecipe, dbRecipeId: recipeId },
        });
      }

      navigate(`/location/${recipeId}`);
    } catch (err) {
      console.error('Failed to save recipe before cart generation:', err);
      navigate(`/location/${state.selectedRecipe?.dbRecipeId || videoId}`);
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
                        <div className="flex-1 flex items-center gap-2.5 min-w-0">
                          <span className="text-orange-600 font-bold text-sm min-w-[70px] flex-shrink-0">
                            {displayQty} {displayUnit}
                          </span>
                          <span className="text-gray-900 text-sm font-semibold truncate capitalize">{ing.name}</span>
                          {getSourceBadge(ing.source)}
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

