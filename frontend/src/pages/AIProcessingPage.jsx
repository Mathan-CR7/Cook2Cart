import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import PremiumBackground from '../components/PremiumBackground';
import api, { videoService, aiService, videoCatalogService, recipeCatalogService } from '../utils/api';
import { simplifyRecipeTitle } from '../utils/recipeTitle';

const STEPS = [
  { icon: 'download', label: 'Video Downloading', desc: 'Downloading your recipe video' },
  { icon: 'music_note', label: 'Audio Extraction', desc: 'Extracting audio track' },
  { icon: 'memory', label: 'Recipe Understanding', desc: 'AI analyzing the recipe' },
  { icon: 'visibility', label: 'Ingredient Detection', desc: 'Detecting ingredients and quantities' },
  { icon: 'shopping_cart', label: 'Cart Generation', desc: 'Generating your smart cart' },
];



const toNumber = (value, fallback = 1) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildFallbackInstructions = (recipeTitle = 'recipe', ingredients = []) => {
  const ingredientNames = ingredients
    .map((ingredient) => ingredient.name || ingredient.ingredientName)
    .filter(Boolean)
    .slice(0, 6);
  const ingredientText = ingredientNames.length ? ingredientNames.join(', ') : 'the extracted ingredients';

  return [
    `Prepare all ingredients for ${recipeTitle}: ${ingredientText}.`,
    'Measure and arrange the ingredients according to the extracted quantities.',
    'Follow the cooking method shown in the video, adding ingredients in the same order.',
    'Cook, bake, mix, or simmer until the recipe reaches the expected texture and doneness.',
    'Taste, adjust seasoning or sweetness if needed, then garnish and serve.',
  ];
};

const mapIngredientForDb = (ingredient) => ({
  ingredientName: ingredient.name || ingredient.ingredientName || 'Ingredient',
  recipeQuantity: toNumber(ingredient.recipeQuantity ?? ingredient.quantity, 1),
  recipeUnit: ingredient.recipeUnit || ingredient.unit || 'pcs',
  quantity: toNumber(ingredient.quantity ?? ingredient.recipeQuantity, 1),
  unit: ingredient.unit || ingredient.recipeUnit || 'pcs',
  estimated: Boolean(ingredient.estimated),
  source: ingredient.source || 'ai',
  confidence: toNumber(ingredient.confidence, 0),
});

const mergeSavedIngredientIds = (ingredients = [], savedIngredients = []) => {
  const byName = new Map(
    savedIngredients
      .filter((item) => item.ingredientName && item.ingredientId)
      .map((item) => [item.ingredientName.toLowerCase(), item])
  );

  return ingredients.map((ingredient) => {
    const name = ingredient.name || ingredient.ingredientName || '';
    const saved = byName.get(name.toLowerCase());
    return saved
      ? { ...ingredient, ingredientId: saved.ingredientId, dbIngredientId: saved.ingredientId }
      : ingredient;
  });
};

export default function AIProcessingPage() {
  const navigate = useNavigate();
  const { videoId } = useParams();
  const locationState = useLocation().state;
  const { state, dispatch } = useApp();
  const [currentStep, setCurrentStep] = useState(-1);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('Analyzing the video to extract ingredients');
  const [error, setError] = useState(null);
  const [videoDownloaded, setVideoDownloaded] = useState(false);
  const [audioExtracted, setAudioExtracted] = useState(false);

  useEffect(() => {
    let pollInterval = null;
    let finished = false;
    let mainFailed = false;
    let pollCount = 0;
    const maxPollsAfterFailure = 15;
    const absoluteMaxPolls = 60;

    async function processRecipe() {
      dispatch({ type: 'START_AI_PROCESSING' });

      const youtubeUrl = locationState?.videoUrl || locationState?.url || `https://www.youtube.com/watch?v=${videoId}`;
      const videoTitle = simplifyRecipeTitle(locationState?.title) || 'My Recipe';
      const userId = state.user?.id || null;
      let dbVideoId = locationState?.dbVideoId || null;
      let dbRecipeId = locationState?.dbRecipeId || null;

      const saveVideoMetadata = async () => {
        if (dbVideoId) return dbVideoId;

        const response = await videoCatalogService.saveVideo({
          youtubeVideoId: videoId,
          title: videoTitle,
          channelName: locationState?.channelTitle || locationState?.channelName || 'Cook2Cart',
          thumbnailUrl: locationState?.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          videoUrl: youtubeUrl,
          duration: locationState?.duration || null,
        });

        dbVideoId = response.data.id;
        return dbVideoId;
      };

      const saveRecipeToDb = async (ingredients, instructions = []) => {
        try {
          const savedVideoId = await saveVideoMetadata();
          const response = await recipeCatalogService.createRecipe({
            userId,
            videoId: savedVideoId,
            youtubeVideoId: videoId,
            recipeName: videoTitle,
            cuisine: null,
            thumbnailUrl: locationState?.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            ingredients: (ingredients || []).map(mapIngredientForDb),
            instructions,
          });
          dbRecipeId = response.data.id;
          return response.data;
        } catch (err) {
          console.error('Failed to save extracted recipe, continuing:', err);
          return null;
        }
      };

      const syncStoredRecipe = (ingredients, instructions = []) => {
        const storedRecipe = {
          id: videoId,
          videoId,
          dbVideoId,
          dbRecipeId,
          title: videoTitle,
          channelTitle: locationState?.channelTitle || locationState?.channelName || 'Cook2Cart',
          thumbnailUrl: locationState?.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          videoUrl: youtubeUrl,
          savedAt: new Date().toISOString(),
          ingredients,
          instructions,
        };

        const wasSaved = state.savedRecipes?.some((item) => String(item.id) === String(videoId));
        const wasFavorite = state.favoriteRecipes?.some((item) => String(item.id) === String(videoId));

        if (wasSaved) {
          dispatch({ type: 'SAVE_RECIPE', payload: storedRecipe });
        }

        if (wasFavorite) {
          dispatch({ type: 'ADD_FAVORITE_RECIPE', payload: storedRecipe });
        }
      };

      const handleFinalFailure = async (errorMsg) => {
        try {
          const failedVideoId = await saveVideoMetadata();
          await videoCatalogService.saveProcessedVideo({
            userId,
            videoId: failedVideoId,
            audioPath: null,
            videoPath: null,
            s3Url: null,
            status: 'FAILED',
          });
        } catch (saveErr) {
          console.error('Failed to save failed processed video metadata:', saveErr);
        }
        setStatusMsg(errorMsg);
        setError(errorMsg);
      };

      const checkRecipeAndNavigate = async (savedVideoId, isImmediate = false) => {
        if (finished) return true;
        try {
          const recipeResponse = await recipeCatalogService.getLatestRecipeByVideo(savedVideoId);
          if (recipeResponse && recipeResponse.data) {
            finished = true;
            if (pollInterval) clearInterval(pollInterval);
            
            const dbRecipe = recipeResponse.data;
            dbRecipeId = dbRecipe.id;
            
            const ingredientsResponse = await recipeCatalogService.getRecipeIngredients(dbRecipeId);
            const dbIngredients = ingredientsResponse.data || [];
            
            const formattedIngredients = dbIngredients.map(item => ({
              id: item.id,
              recipeIngredientId: item.id,
              name: item.ingredientName,
              recipeQuantity: item.recipeQuantity,
              recipeUnit: item.recipeUnit,
              quantity: item.quantity,
              unit: item.unit,
              estimated: item.estimated,
              source: item.source,
              confidence: item.confidence
            }));

            const formattedInstructions = (dbRecipe.instructions || []).map(item => item.instruction);

            dispatch({
              type: 'SET_SELECTED_RECIPE',
              payload: {
                id: videoId,
                videoId,
                dbVideoId: savedVideoId,
                dbRecipeId,
                title: videoTitle,
                thumbnailUrl: locationState?.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
              },
            });

            dispatch({ 
              type: 'FINISH_AI_PROCESSING', 
              payload: {
                ingredients: formattedIngredients,
                instructions: formattedInstructions
              }
            });
            
            syncStoredRecipe(formattedIngredients, formattedInstructions);
            
            const navigateTarget = () => {
              const addressSelected = state.selectedAddress || localStorage.getItem('selectedAddress');
              if (addressSelected) {
                navigate(`/cart/${videoId}`);
              } else {
                navigate(`/location/${dbRecipeId}`);
              }
            };

            if (isImmediate) {
              navigateTarget();
            } else {
              setProgress(100);
              setStatusMsg('Recipe successfully retrieved! Loading cart...');
              setTimeout(navigateTarget, 1200);
            }
            return true;
          }
        } catch (pollErr) {
          // Ignore and retry
        }
        return false;
      };

      dispatch({
        type: 'SET_SELECTED_RECIPE',
        payload: {
          id: videoId,
          videoId: videoId,
          dbVideoId,
          dbRecipeId,
          title: videoTitle,
          thumbnailUrl: locationState?.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
        }
      });

      try {
        setCurrentStep(2);
        dispatch({ type: 'SET_AI_STEP', payload: 2 });
        setProgress(15);
        setStatusMsg('Checking if recipe was already processed...');

        // FAST CHECK: Check by YouTube video ID directly (no need to save video first)
        try {
          const quickCheck = await recipeCatalogService.checkByYoutubeId(videoId);
          if (quickCheck.status === 200 && quickCheck.data) {
            finished = true;
            if (pollInterval) clearInterval(pollInterval);

            const dbRecipe = quickCheck.data;
            dbRecipeId = dbRecipe.id;
            const savedVideoId = dbRecipe.videoId || dbVideoId;

            const ingredientsResponse = await recipeCatalogService.getRecipeIngredients(dbRecipeId);
            const dbIngredients = ingredientsResponse.data || [];

            const formattedIngredients = dbIngredients.map(item => ({
              id: item.id,
              recipeIngredientId: item.id,
              name: item.ingredientName,
              recipeQuantity: item.recipeQuantity,
              recipeUnit: item.recipeUnit,
              quantity: item.quantity,
              unit: item.unit,
              estimated: item.estimated,
              source: item.source,
              confidence: item.confidence
            }));

            const formattedInstructions = (dbRecipe.instructions || []).map(item => item.instruction);

            dispatch({
              type: 'SET_SELECTED_RECIPE',
              payload: {
                id: videoId,
                videoId,
                dbVideoId: savedVideoId,
                dbRecipeId,
                title: videoTitle,
                thumbnailUrl: locationState?.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
              },
            });

            dispatch({
              type: 'FINISH_AI_PROCESSING',
              payload: {
                ingredients: formattedIngredients,
                instructions: formattedInstructions
              }
            });

            syncStoredRecipe(formattedIngredients, formattedInstructions);
            setProgress(100);
            setStatusMsg('Recipe loaded from cache! Redirecting...');

            const addressSelected = state.selectedAddress || localStorage.getItem('selectedAddress');
            setTimeout(() => {
              if (addressSelected) {
                navigate(`/cart/${videoId}`);
              } else {
                navigate(`/location/${dbRecipeId}`);
              }
            }, 600);
            return;
          }
        } catch (quickCheckErr) {
          // Not cached yet, proceed with normal flow
        }

        const savedVideoId = await saveVideoMetadata();

        // If we already know the dbRecipeId from navigation state, skip straight to cart
        if (dbRecipeId) {
          const alreadyExists = await checkRecipeAndNavigate(savedVideoId, true);
          if (alreadyExists) return;
        }

        // Check if already processed (from DB)
        const alreadyExists = await checkRecipeAndNavigate(savedVideoId, true);
        if (alreadyExists) return;

        // Start polling in background
        pollInterval = setInterval(async () => {
          pollCount++;
          if (finished) {
            clearInterval(pollInterval);
            return;
          }
          
          const found = await checkRecipeAndNavigate(savedVideoId, false);
          if (found) {
            clearInterval(pollInterval);
            return;
          }

          if (mainFailed && pollCount > maxPollsAfterFailure) {
            clearInterval(pollInterval);
            const errorMsg = 'Backend AI Service encountered an internal error. Please try again later.';
            handleFinalFailure(errorMsg);
            return;
          }

          if (pollCount > absoluteMaxPolls) {
            clearInterval(pollInterval);
            const errorMsg = 'AI processing timed out. Please try again later.';
            handleFinalFailure(errorMsg);
            return;
          }
        }, 2000);

        if (finished) return;
        const workflowResponse = await aiService.processWorkflow({
          videoId,
          youtubeUrl,
          dbVideoId: savedVideoId,
          userId,
          recipeName: videoTitle,
          thumbnailUrl: locationState?.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
        });

        if (finished) return;
        const { status, recipeId, cartId, recipe, cart } = workflowResponse.data || {};

        if (status === 'CART_GENERATED_FROM_DESCRIPTION' || status === 'CART_GENERATED_FROM_TRANSCRIPT' || status === 'CART_GENERATED_FROM_CACHE') {
          finished = true;
          if (pollInterval) clearInterval(pollInterval);

          dbRecipeId = recipeId;
          dispatch({
            type: 'SET_SELECTED_RECIPE',
            payload: {
              id: videoId,
              videoId,
              dbVideoId: savedVideoId,
              dbRecipeId: recipeId,
              title: videoTitle,
              thumbnailUrl: locationState?.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            },
          });

          const recipeIngredients = recipe?.ingredients || [];
          const recipeInstructions = recipe?.instructions || [];

          const formattedIngredients = recipeIngredients.map(item => ({
            id: item.id,
            recipeIngredientId: item.id,
            name: item.ingredientName,
            recipeQuantity: item.recipeQuantity,
            recipeUnit: item.recipeUnit,
            quantity: item.quantity,
            unit: item.unit,
            estimated: item.estimated,
            source: item.source,
            confidence: item.confidence
          }));

          const formattedInstructions = recipeInstructions.map(item => item.instruction);

          dispatch({
            type: 'FINISH_AI_PROCESSING',
            payload: {
              ingredients: formattedIngredients,
              instructions: formattedInstructions,
            },
          });

          if (cart) {
            dispatch({ type: 'SET_CART', payload: cart });
          }

          syncStoredRecipe(formattedIngredients, formattedInstructions);

          const navigateTarget = () => {
            const addressSelected = state.selectedAddress || localStorage.getItem('selectedAddress');
            if (addressSelected) {
              navigate(`/cart/${videoId}`);
            } else {
              navigate(`/location/${recipeId}`);
            }
          };

          if (status === 'CART_GENERATED_FROM_CACHE') {
            navigateTarget();
          } else {
            setCurrentStep(4);
            dispatch({ type: 'SET_AI_STEP', payload: 4 });
            setProgress(100);
            setStatusMsg(
              status === 'CART_GENERATED_FROM_DESCRIPTION'
                ? 'Ingredients found in description. Generating smart cart...'
                : 'Ingredients found in transcript. Generating smart cart...'
            );
            setTimeout(navigateTarget, 1200);
          }
          return;
        }

        if (finished) return;
        // Step 1: Downloading Video & Step 2: Extracting Audio
        setCurrentStep(0);
        dispatch({ type: 'SET_AI_STEP', payload: 0 });
        setProgress(20);
        setStatusMsg('Downloading video from YouTube...');
        try {
          await saveVideoMetadata();
        } catch (err) {
          console.error('Failed to save video metadata before processing, continuing:', err);
        }
        const videoResponse = await videoService.process(youtubeUrl);
        if (finished) return;
        setVideoDownloaded(true);
        const audioPathFromProcess = videoResponse.data ? videoResponse.data.audioPath : null;
        const videoPathFromProcess = videoResponse.data ? videoResponse.data.videoPath : null;

        if (dbVideoId) {
          videoCatalogService.saveProcessedVideo({
            userId,
            videoId: dbVideoId,
            audioPath: audioPathFromProcess,
            videoPath: videoPathFromProcess,
            s3Url: videoResponse.data?.s3Url || null,
            status: 'COMPLETED',
          }).catch((err) => {
            console.error('Failed to save processed video metadata, continuing:', err);
          });
        }

        if (finished) return;
        setCurrentStep(1);
        dispatch({ type: 'SET_AI_STEP', payload: 1 });
        setProgress(40);
        setStatusMsg('Extracting audio track...');
        const audioPath = audioPathFromProcess;
        const filename = audioPath ? audioPath.substring(Math.max(audioPath.lastIndexOf('/'), audioPath.lastIndexOf('\\')) + 1) : 'recipe.mp3';
        const audioResponse = await api.get('/video/download/audio', { params: { filename }, responseType: 'blob' });
        if (finished) return;
        setAudioExtracted(true);

        // Step 3: Understanding Recipe & Step 4: Detecting Ingredients
        if (finished) return;
        setCurrentStep(2);
        dispatch({ type: 'SET_AI_STEP', payload: 2 });
        setProgress(60);
        setStatusMsg('Sending audio to AI service for transcription...');

        const formData = new FormData();
        const sanitizedTitle = videoTitle.replace(/[^a-zA-Z0-9]/g, '_');
        formData.append('file', audioResponse.data, `${sanitizedTitle}.mp3`);

        if (finished) return;
        setCurrentStep(3);
        dispatch({ type: 'SET_AI_STEP', payload: 3 });
        setProgress(80);
        setStatusMsg('Detecting ingredients and quantities...');
        const aiResponse = await aiService.processAudio(formData, videoId);

        if (finished) return;
        setCurrentStep(4);
        dispatch({ type: 'SET_AI_STEP', payload: 4 });
        setProgress(100);
        setStatusMsg('Processing complete! Preparing ingredients review...');

        let instructions = aiResponse.data.instructions;
        if (!instructions || instructions.length === 0) {
          let detectedLang = 'en';
          const titleLower = videoTitle.toLowerCase();
          if (titleLower.includes('tamil') || /[\u0b80-\u0bff]/.test(videoTitle)) {
            detectedLang = 'ta';
          } else if (titleLower.includes('hindi') || /[\u0900-\u097f]/.test(videoTitle)) {
            detectedLang = 'hi';
          }
          instructions = buildFallbackInstructions(videoTitle, aiResponse.data.ingredients);
        }

        const savedRecipe = await saveRecipeToDb(aiResponse.data.ingredients, instructions);
        const dbIngredients = mergeSavedIngredientIds(aiResponse.data.ingredients, savedRecipe?.ingredients || []);

        if (finished) return;
        finished = true;
        if (pollInterval) clearInterval(pollInterval);

        dispatch({
          type: 'SET_SELECTED_RECIPE',
          payload: {
            id: videoId,
            videoId,
            dbVideoId,
            dbRecipeId,
            title: videoTitle,
            thumbnailUrl: locationState?.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          },
        });

        dispatch({ 
          type: 'FINISH_AI_PROCESSING', 
          payload: {
            ingredients: dbIngredients,
            instructions: instructions
          }
        });
        syncStoredRecipe(dbIngredients, instructions);
        setTimeout(() => {
          navigate(`/review/${videoId}`);
        }, 1200);

      } catch (err) {
        console.error('Error processing recipe through backend:', err);

        const isQuotaLimit = err.response && (
          err.response.status === 429 ||
          (err.response.status === 500 && (
            err.response.data?.message?.toLowerCase().includes('429') ||
            err.response.data?.message?.toLowerCase().includes('quota')
          ))
        );
        const isAuthError = err.response && (
          err.response.status === 401 ||
          err.response.status === 403 ||
          (err.response.status === 500 && (
            err.response.data?.message?.toLowerCase().includes('401') ||
            err.response.data?.message?.toLowerCase().includes('403') ||
            err.response.data?.message?.toLowerCase().includes('unauthorized') ||
            err.response.data?.message?.toLowerCase().includes('invalid')
          ))
        );

        if (isQuotaLimit || isAuthError) {
          finished = true;
          if (pollInterval) clearInterval(pollInterval);
          const errorMsg = isQuotaLimit 
            ? 'AI Quota Limit is reached. Please configure a valid API key or try again later.'
            : 'Gemini API key is invalid or unauthorized. Please configure a valid API key or try again later.';
          await handleFinalFailure(errorMsg);
          return;
        }

        // If it is any other error (such as a Gateway Timeout), the background consumer
        // is likely still processing the video. Let's poll the database to check.
        mainFailed = true;
        pollCount = 0;
        setStatusMsg('Checking background processing status...');
        setProgress(90);
      }
    }

    processRecipe();
    return () => {
      finished = true;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [videoId, locationState, dispatch, navigate]);

  return (
    <div className="c2c-root min-h-screen flex flex-col justify-center items-center px-4 py-20 relative overflow-hidden bg-white">
      <PremiumBackground />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-[540px] text-center z-10"
      >
        <div className="relative w-40 h-40 mx-auto mb-10">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
            className={`absolute inset-4 rounded-full border bg-white/80 backdrop-blur-xl flex items-center justify-center shadow-lg ${error ? 'border-red-200/40' : 'border-orange-200/40'}`}
          >
            <motion.span
              animate={{ opacity: [0.75, 1, 0.75] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className={`material-icon fill text-4xl ${error ? 'text-red-500' : 'text-[#ff6b35]'}`}
            >
              {error ? 'error_outline' : 'psychology'}
            </motion.span>
          </motion.div>

          <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="46"
              className={`fill-none ${error ? 'stroke-red-500/5' : 'stroke-[#ff6b35]/5'}`}
              strokeWidth="1.5"
            />
            <circle
              cx="50"
              cy="50"
              r="46"
              className="fill-none animate-spin-slow"
              stroke={error ? '#ef4444' : '#ff8e53'}
              strokeWidth="1.5"
              strokeDasharray="10 30"
              style={{ transformOrigin: '50% 50%' }}
            />
            <circle
              cx="50"
              cy="50"
              r="42"
              className="stroke-gray-200/40 fill-none"
              strokeWidth="3.5"
            />
            <circle
              cx="50"
              cy="50"
              r="42"
              className="fill-none"
              stroke={error ? 'url(#errorGlow)' : 'url(#aiGlow)'}
              strokeWidth="4"
              strokeDasharray="264"
              strokeDashoffset={error ? 0 : 264 - (264 * progress) / 100}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
            />
            <defs>
              <linearGradient id="aiGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff8e53" />
                <stop offset="60%" stopColor="#ff6b35" />
                <stop offset="100%" stopColor="#ff4f11" />
              </linearGradient>
              <linearGradient id="errorGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f87171" />
                <stop offset="60%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#b91c1c" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="mb-10">
          <h1 className={`font-display font-extrabold text-2xl md:text-3xl mb-2 tracking-tight ${error ? 'text-red-600' : 'text-[#1e2229]'}`}>
            {error ? 'AI Processing Failed' : 'AI Recipe Parsing Active'}
          </h1>
          <p className={`text-sm min-h-10 px-6 overflow-hidden text-ellipsis leading-relaxed font-display font-medium ${error ? 'text-red-500' : 'text-gray-500'}`}>
            {statusMsg}
          </p>
        </div>

        {error ? (
          <div className="flex flex-col items-center gap-4 mt-6">
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 rounded-xl bg-red-600 text-white font-semibold font-display shadow-md hover:bg-red-700 transition-colors"
            >
              Go to Home
            </button>
          </div>
        ) : (
          <>
            <div className="w-full h-2 bg-gray-200/40 rounded-full overflow-hidden mb-12 border border-white/90 shadow-inner">
              <motion.div
                className="h-full rounded-full gradient-bg"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>

            <div className="relative pl-12 flex flex-col gap-4 text-left">
              <div className="absolute left-[18px] top-6 bottom-6 w-[2px] bg-gray-200/60 z-0">
                <motion.div
                  className="w-full bg-gradient-to-b from-[#10b981] to-[#ff6b35]"
                  animate={{ height: `${currentStep >= 0 ? (currentStep / (STEPS.length - 1)) * 100 : 0}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>

              {STEPS.map((step, i) => {
                let isCompleted = false;
                if (i === 0) {
                  isCompleted = videoDownloaded;
                } else if (i === 1) {
                  isCompleted = audioExtracted;
                } else {
                  isCompleted = currentStep > i;
                }
                const isActive = currentStep === i;

                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -15 }}
                    animate={{
                      opacity: isActive ? 1 : isCompleted ? 0.75 : 0.4,
                      x: 0,
                      scale: isActive ? 1.01 : 1,
                      boxShadow: isActive ? '0 8px 30px rgba(255, 107, 53, 0.06)' : 'none'
                    }}
                    transition={{ duration: 0.45 }}
                    className={`glass p-4 rounded-2xl border flex items-center gap-4 relative z-10 transition-colors ${
                      isActive
                        ? 'border-[#ff6b35]/30 bg-white'
                        : isCompleted
                          ? 'border-gray-200/50'
                          : 'border-gray-200/20'
                    }`}
                  >
                    <motion.div
                      animate={{
                        scale: isActive ? [1, 1.08, 1] : 1,
                        rotate: isCompleted ? 360 : 0
                      }}
                      transition={{
                        scale: isActive ? { repeat: Infinity, duration: 1.8 } : { duration: 0.3 }
                      }}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 z-10 ${
                        isCompleted
                          ? 'bg-emerald-50 text-[#10b981] border border-[#10b981]/20'
                          : isActive
                            ? 'gradient-bg text-white shadow-md'
                            : 'bg-white text-gray-400 border border-gray-200/50'
                      }`}
                    >
                      <span className="material-icon !text-lg">{isCompleted ? 'check' : step.icon}</span>
                    </motion.div>
                    <div>
                      <h3 className={`font-display font-bold text-sm transition-colors ${isActive ? 'text-[#ff6b35]' : isCompleted ? 'text-gray-700' : 'text-gray-400'}`}>
                        {step.label}
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">{step.desc}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
