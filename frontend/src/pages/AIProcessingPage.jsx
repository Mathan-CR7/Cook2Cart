import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import api, { videoService, aiService, videoCatalogService, recipeCatalogService } from '../utils/api';
import { simplifyRecipeTitle } from '../utils/recipeTitle';

const STEPS = [
  { icon: 'download', label: 'Video Downloading', desc: 'Downloading your recipe video' },
  { icon: 'music_note', label: 'Audio Extraction', desc: 'Extracting audio track' },
  { icon: 'memory', label: 'Recipe Understanding', desc: 'AI analyzing the recipe' },
  { icon: 'visibility', label: 'Ingredient Detection', desc: 'Detecting ingredients and quantities' },
  { icon: 'shopping_cart', label: 'Cart Generation', desc: 'Generating your smart cart' },
];

const SAMPLE_INGREDIENTS = [
  { name: 'Rice', quantity: '2 cups', confidence: 97, unit: 'cups' },
  { name: 'Chicken', quantity: '500', confidence: 95, unit: 'g' },
  { name: 'Onion', quantity: '2', confidence: 92, unit: 'pieces' },
  { name: 'Oil', quantity: '3', confidence: 88, unit: 'tbsp' },
  { name: 'Garlic', quantity: '4', confidence: 90, unit: 'cloves' },
  { name: 'Ginger', quantity: '1', confidence: 85, unit: 'inch' },
];

const SAMPLE_INSTRUCTIONS_EN = [
  "Boil 4 cups of water and 1 teaspoon of salt in a large pan.",
  "Once the water has boiled, add 2 cups of pasta.",
  "Boil for 10 minutes or until pasta is cooked. Drain the pasta and set aside.",
  "In a frying pan, heat 2 tbsp oil and fry 3-4 garlic cloves.",
  "Add onion, 1 carrot, 1/4 cup peas and fry for a minute.",
  "To make the white sauce, heat 4 tbsp butter and add 4 tbsp maida.",
  "Add 2 cups milk and stir until the sauce thickens.",
  "Combine pasta, vegetables, and sauce, then serve."
];

const SAMPLE_INSTRUCTIONS_TA = [
  "ஒரு பெரிய பாத்திரத்தில் 4 கப் தண்ணீர் மற்றும் 1 தேக்கரண்டி உப்பு சேர்த்து கொதிக்க வைக்கவும்.",
  "தண்ணீர் கொதித்ததும், 2 கப் பாஸ்தா சேர்க்கவும்.",
  "பாஸ்தா வேகும் வரை 10 நிமிடங்கள் கொதிக்க வைக்கவும், பின் தண்ணீரை வடிகட்டி தனியாக வைக்கவும்.",
  "ஒரு வறுக்கப்படும் கடாயில் 2 மேஜைக்கரண்டி எண்ணெய் சூடாக்கி, 3-4 பூண்டு பற்களை வதக்கவும்.",
  "வெங்காயம், 1 கேரட், 1/4 கப் பட்டாணி சேர்த்து ஒரு நிமிடம் வதக்கவும்.",
  "வெள்ளை சாஸ் செய்ய, 4 மேஜைக்கரண்டி வெண்ணெய் சூடாக்கி, 4 மேஜைக்கரண்டி மைதா சேர்க்கவும்.",
  "2 கப் பால் சேர்த்து சாஸ் கெட்டியாகும் வரை கிளறவும்.",
  "பாஸ்தா, காய்கறிகள் மற்றும் சாஸ் ஆகியவற்றை ஒன்றாக கலந்து பரிமாறவும்."
];

const SAMPLE_INSTRUCTIONS_HI = [
  "एक बड़े बर्तन में 4 कप पानी और 1 चम्मच नमक डालकर उबालें।",
  "पानी उबलने के बाद, 2 कप पास्ता डालें।",
  "पास्ता पकने तक 10 मिनट तक उबालें, फिर पानी छानकर अलग रख दें।",
  "एक कढ़ाई में 2 चम्मच तेल गरम करें और 3-4 लहसुन की कलियाँ भूनें।",
  "प्याज, 1 गाजर, 1/4 कप मटर डालें और एक मिनट तक भूनें।",
  "व्हाइट सॉस बनाने के लिए, 4 चम्मच मक्खन गरम करें और 4 चम्मच मैदा डालें।",
  "2 कप दूध डालें और सॉस गाढ़ा होने तक चलाएं।",
  "पास्ता, सब्जियां और सॉस मिलाएं, फिर परोसें।"
];

const toNumber = (value, fallback = 1) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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

  useEffect(() => {
    async function processRecipe() {
      dispatch({ type: 'START_AI_PROCESSING' });

      const youtubeUrl = locationState?.videoUrl || locationState?.url || `https://www.youtube.com/watch?v=${videoId}`;
      const videoTitle = simplifyRecipeTitle(locationState?.title) || 'My Recipe';
      const userId = state.user?.id || null;
      let dbVideoId = locationState?.dbVideoId || null;
      let dbRecipeId = null;

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

        setCurrentStep(1);
        dispatch({ type: 'SET_AI_STEP', payload: 1 });
        setProgress(40);
        setStatusMsg('Extracting audio track...');
        const audioPath = audioPathFromProcess;
        const filename = audioPath ? audioPath.substring(Math.max(audioPath.lastIndexOf('/'), audioPath.lastIndexOf('\\')) + 1) : 'recipe.mp3';
        const audioResponse = await api.get('/video/download/audio', { params: { filename }, responseType: 'blob' });

        // Step 3: Understanding Recipe & Step 4: Detecting Ingredients
        setCurrentStep(2);
        dispatch({ type: 'SET_AI_STEP', payload: 2 });
        setProgress(60);
        setStatusMsg('Sending audio to AI service for transcription...');

        const formData = new FormData();
        const sanitizedTitle = videoTitle.replace(/[^a-zA-Z0-9]/g, '_');
        formData.append('file', audioResponse.data, `${sanitizedTitle}.mp3`);

        setCurrentStep(3);
        dispatch({ type: 'SET_AI_STEP', payload: 3 });
        setProgress(80);
        setStatusMsg('Detecting ingredients and quantities...');
        const aiResponse = await aiService.processAudio(formData, videoId);

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
          instructions = 
            detectedLang === 'ta' ? SAMPLE_INSTRUCTIONS_TA :
            detectedLang === 'hi' ? SAMPLE_INSTRUCTIONS_HI :
            SAMPLE_INSTRUCTIONS_EN;
        }

        const savedRecipe = await saveRecipeToDb(aiResponse.data.ingredients, instructions);
        const dbIngredients = mergeSavedIngredientIds(aiResponse.data.ingredients, savedRecipe?.ingredients || []);

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
        setTimeout(() => {
          navigate(`/review/${videoId}`);
        }, 1200);

      } catch (err) {
        console.error('Error processing recipe through backend:', err);

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
        
        let errorMsg = 'Failed to connect to backend AI service. Falling back to local simulation...';
        if (err.response) {
          if (err.response.status === 429) {
            errorMsg = 'AI API Rate Limit reached (Too Many Requests). Falling back to local simulation...';
          } else if (err.response.status === 500) {
            if (err.response.data && (err.response.data.message || '').includes('429')) {
              errorMsg = 'AI Service Quota Exceeded (429 Rate Limit). Falling back to local simulation...';
            } else {
              errorMsg = 'Backend AI Service encountered an internal error. Falling back to local simulation...';
            }
          } else if (err.response.status === 504 || err.response.status === 502) {
            errorMsg = 'Backend service connection timeout. Falling back to local simulation...';
          }
        } else if (err.message && err.message.includes('Network Error')) {
          errorMsg = 'Network connection failed to the backend services. Falling back to local simulation...';
        }
        
        setStatusMsg(errorMsg);
        
        // Graceful fallback animation
        let step = currentStep >= 0 ? currentStep : 0;
        const interval = setInterval(() => {
          if (step < STEPS.length) {
            setCurrentStep(step);
            dispatch({ type: 'SET_AI_STEP', payload: step });
            setProgress(((step + 1) / STEPS.length) * 100);

            if (step === STEPS.length - 1) {
              clearInterval(interval);
              
              let detectedLang = 'en';
              const titleLower = videoTitle.toLowerCase();
              if (titleLower.includes('tamil') || /[\u0b80-\u0bff]/.test(videoTitle)) {
                detectedLang = 'ta';
              } else if (titleLower.includes('hindi') || /[\u0900-\u097f]/.test(videoTitle)) {
                detectedLang = 'hi';
              }
              const fallbackInstructions = 
                detectedLang === 'ta' ? SAMPLE_INSTRUCTIONS_TA :
                detectedLang === 'hi' ? SAMPLE_INSTRUCTIONS_HI :
                SAMPLE_INSTRUCTIONS_EN;

              saveRecipeToDb(SAMPLE_INGREDIENTS, fallbackInstructions).then((savedRecipe) => {
                const dbIngredients = mergeSavedIngredientIds(SAMPLE_INGREDIENTS, savedRecipe?.ingredients || []);
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
                    instructions: fallbackInstructions
                  }
                });
              });
              setTimeout(() => {
                navigate(`/review/${videoId}`);
              }, 1200);
            }
            step++;
          } else {
            clearInterval(interval);
          }
        }, 1000);
      }
    }

    processRecipe();
  }, [videoId, locationState, dispatch, navigate]);

  return (
    <div className="bg-white min-h-screen flex items-center justify-center px-4 pb-16">
      <div className="w-full max-w-[560px] text-center">
        <div className="mb-10">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-orange-100 to-red-100 rounded-2xl flex items-center justify-center mb-5">
            <span className="material-icon fill !text-3xl text-orange-500 animate-pulse">auto_awesome</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">AI is Processing Your Recipe</h1>
          <p className="text-gray-500 text-sm">{statusMsg}</p>
        </div>

        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-12">
          <div className="h-full rounded-full transition-all duration-500 ease-out gradient-bg" style={{ width: `${progress}%` }} />
        </div>

        <div className="flex flex-col gap-2 text-left">
          {STEPS.map((step, i) => (
            <div
              key={i}
              className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-300 ${
                currentStep >= i ? 'border-orange-200 bg-orange-50/50' : 'border-gray-100 opacity-30'
              } ${currentStep > i ? 'border-green-200 bg-green-50/50' : ''}`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                currentStep > i ? 'bg-green-100 text-green-600' : currentStep === i ? 'bg-orange-100 text-orange-500 animate-pulse' : 'bg-gray-100 text-gray-400'
              }`}>
                <span className="material-icon !text-xl">{currentStep > i ? 'check' : step.icon}</span>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-gray-900">{step.label}</h3>
                <p className="text-xs text-gray-500">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
