import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';

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

export default function AIProcessingPage() {
  const navigate = useNavigate();
  const { videoId } = useParams();
  const { dispatch } = useApp();
  const [currentStep, setCurrentStep] = useState(-1);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    dispatch({ type: 'START_AI_PROCESSING' });

    let step = 0;
    const interval = setInterval(() => {
      if (step < STEPS.length) {
        setCurrentStep(step);
        dispatch({ type: 'SET_AI_STEP', payload: step });
        setProgress(((step + 1) / STEPS.length) * 100);

        if (step === STEPS.length - 1) {
          clearInterval(interval);
          dispatch({ type: 'FINISH_AI_PROCESSING', payload: SAMPLE_INGREDIENTS });
          setTimeout(() => navigate(`/review/${videoId}`), 1200);
        }
        step++;
      } else {
        clearInterval(interval);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [videoId]);

  return (
    <div className="bg-white min-h-screen flex items-center justify-center px-4 pb-16">
      <div className="w-full max-w-[560px] text-center">
        <div className="mb-10">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-orange-100 to-red-100 rounded-2xl flex items-center justify-center mb-5">
            <span className="material-icon fill !text-3xl text-orange-500 animate-pulse">auto_awesome</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">AI is Processing Your Recipe</h1>
          <p className="text-gray-500">Analyzing the video to extract ingredients</p>
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
