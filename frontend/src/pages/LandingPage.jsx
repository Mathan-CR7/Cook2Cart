import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import AppBar from '../components/AppBar';
import LogoIcon from '../components/LogoIcon';
import BottomNav from '../components/BottomNav';
import PremiumBackground from '../components/PremiumBackground';
import { videoService } from '../utils/api';
import { useApp } from '../context/AppContext';
import { simplifyRecipeTitle } from '../utils/recipeTitle';

const QUICK_TRY_RECIPES = [
  { label: 'Paneer Butter Masala', url: 'https://www.youtube.com/watch?v=hN711T0T55g' },
  { label: 'Chocolate Lava Cake', url: 'https://www.youtube.com/watch?v=F3_d48N3Cts' },
  { label: 'Crispy French Fries', url: 'https://www.youtube.com/watch?v=aG-80_B_gsw' },
];

const MOCK_TRANSCRIPTS = [
  'Heat 2 tbsp of unsalted butter in a hot pan...',
  'Add 3 cloves of finely chopped garlic and saute...',
  'Toss in 250g of penne pasta and mix thoroughly...',
];

const MOCK_INGREDIENTS = [
  { name: 'Penne Pasta', qty: '250g', confidence: '98%' },
  { name: 'Unsalted Butter', qty: '50g', confidence: '95%' },
  { name: 'Fresh Garlic', qty: '3 cloves', confidence: '92%' },
];

const MOCK_CART_ITEMS = [
  { name: 'Disano Penne Pasta', size: '250g', price: '₹90' },
  { name: 'Amul Butter', size: '100g', price: '₹56' },
  { name: 'Local Farm Garlic', size: '250g', price: '₹40' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { state } = useApp();
  const [url, setUrl] = useState('');
  const [processing, setProcessing] = useState(false);
  const [downloadedVideo, setDownloadedVideo] = useState(null);
  const [error, setError] = useState('');

  // Live simulation loop states
  const [simStep, setSimStep] = useState(0);
  const [simText, setSimText] = useState('');

  // Simulator typing & step effect
  useEffect(() => {
    let textIdx = 0;
    let currentText = MOCK_TRANSCRIPTS[simStep];
    setSimText('');
    
    const typingInterval = setInterval(() => {
      if (textIdx < currentText.length) {
        setSimText((prev) => prev + currentText.charAt(textIdx));
        textIdx++;
      } else {
        clearInterval(typingInterval);
      }
    }, 35);

    const stepTimeout = setTimeout(() => {
      setSimStep((prev) => (prev + 1) % 3);
    }, 4500);

    return () => {
      clearInterval(typingInterval);
      clearTimeout(stepTimeout);
    };
  }, [simStep]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError('');
    if (!url.trim()) return;

    const match = url.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/);
    const videoId = match?.[1];
    if (!videoId) {
      setError('Invalid YouTube URL. Please enter a valid YouTube link.');
      return;
    }

    setProcessing(true);
    setDownloadedVideo(null);

    // Fetch video title from oEmbed API
    let videoTitle = 'My Recipe';
    try {
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      );
      if (oembedRes.ok) {
        const oembedData = await oembedRes.json();
        videoTitle = simplifyRecipeTitle(oembedData.title) || 'My Recipe';
      }
    } catch (titleErr) {
      console.warn('Could not fetch video title, using default:', titleErr);
    }

    try {
      await videoService.process(url);
      setDownloadedVideo({
        videoId,
        title: videoTitle,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        url,
      });
    } catch (err) {
      setError('Failed to process video. Make sure the backend is running.');
    } finally {
      setProcessing(false);
    }
  };

  const handleQuickTry = (recipeUrl) => {
    setUrl(recipeUrl);
    setError('');
    setDownloadedVideo(null);
  };

  const handleExtract = () => {
    if (!downloadedVideo) return;
    if (!state.isAuthenticated) {
      navigate(`/login?redirect=/process/${downloadedVideo.videoId}`);
    } else {
      navigate(`/process/${downloadedVideo.videoId}`, {
        state: {
          videoId: downloadedVideo.videoId,
          title: downloadedVideo.title || 'YouTube Recipe',
          channelTitle: 'YouTube',
          thumbnailUrl: downloadedVideo.thumbnailUrl,
        },
      });
    }
  };

  return (
    <div className="c2c-root min-h-screen pb-24 overflow-x-hidden relative bg-white">
      <AppBar />
      <PremiumBackground />
      {/* Hero Section */}
      <section className="relative pt-36 pb-12 z-10 px-4 sm:px-6 lg:px-8 max-w-[1400px] xl:px-12 mx-auto">
        
        {/* Left Side: YouTube Video Image (Absolute Floating on large screens) */}
        <motion.div 
          initial={{ opacity: 0, x: -50, y: '-50%' }}
          animate={{ 
            opacity: 1, 
            x: 0, 
            y: ['-58%', '-42%', '-58%'],
          }}
          transition={{ 
            initial: { duration: 0.8, ease: 'easeOut', delay: 0.15 },
            y: { repeat: Infinity, duration: 5, ease: 'easeInOut' }
          }}
          whileHover={{ scale: 1.04 }}
          className="absolute lg:left-[calc(50%-605px)] xl:left-[calc(50%-665px)] 2xl:left-[calc(50%-725px)] top-[55%] -translate-y-1/2 hidden lg:block w-[150px] lg:w-[160px] xl:w-[220px] 2xl:w-[280px] z-10 pointer-events-none"
        >
          <img
            src="/culinary_mockup.png"
            alt="YouTube Cooking Video Mockup"
            className="w-full h-auto object-contain drop-shadow-[0_20px_50px_rgba(255,107,53,0.06)] mix-blend-multiply"
          />
        </motion.div>

        {/* Right Side: Cart Image (Absolute Floating on large screens) */}
        <motion.div 
          initial={{ opacity: 0, x: 50, y: '-50%' }}
          animate={{ 
            opacity: 1, 
            x: 0, 
            y: ['-42%', '-58%', '-42%'],
          }}
          transition={{ 
            initial: { duration: 0.8, ease: 'easeOut', delay: 0.15 },
            y: { repeat: Infinity, duration: 5, ease: 'easeInOut' }
          }}
          whileHover={{ scale: 1.04 }}
          className="absolute lg:right-[calc(50%-605px)] xl:right-[calc(50%-665px)] 2xl:right-[calc(50%-725px)] top-[55%] -translate-y-1/2 hidden lg:block w-[150px] lg:w-[160px] xl:w-[220px] 2xl:w-[280px] z-10 pointer-events-none"
        >
          <img
            src="/shopping_cart_hero.png"
            alt="Grocery Shopping Cart Mockup"
            className="w-full h-auto object-contain drop-shadow-[0_20px_50px_rgba(255,107,53,0.06)] mix-blend-multiply"
          />
        </motion.div>

        {/* Center Content (Pristine original centered layout, with restricted widths on desktop to prevent overlap) */}
        <div className="max-w-5xl lg:max-w-[480px] xl:max-w-[580px] 2xl:max-w-[680px] mx-auto text-center font-display relative z-10">
          
          {/* Branded Icon Accent */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            whileHover={{ scale: 1.05 }}
            className="inline-flex items-center justify-center w-20 h-20 mb-8 cursor-pointer"
          >
            <LogoIcon className="w-18 h-18" />
          </motion.div>

          {/* Heading */}
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
            className="font-display font-black text-5xl md:text-7xl tracking-tight mb-8 leading-[1.05] text-[#1e2229]"
          >
            <span className="gradient-text-animated">Turn Culinary Videos</span>
            <br />
            <span className="relative inline-block z-10 pb-2">
              Into Shopping Carts
              {/* Elegant curved hand-drawn SVG line decoration */}
              <svg className="absolute left-0 bottom-0 w-full h-[12px] text-[#ff6b35] opacity-80 pointer-events-none" viewBox="0 0 100 10" preserveAspectRatio="none">
                <path 
                  d="M0,5 Q50,10 100,5" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="3.5" 
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
            className="text-base md:text-lg text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed font-medium"
          >
            Paste any YouTube recipe link. Our specialized neural network extracts the ingredients, scales the package quantities, and builds your local grocery cart automatically.
          </motion.p>

          {/* Input field */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: 'easeOut' }}
            className="w-full max-w-2xl mx-auto mb-12"
          >
            <form 
              onSubmit={handleSubmit} 
              className="glass gradient-border-brand p-3 rounded-[24px] shadow-[0_15px_45px_rgba(255,107,53,0.08)] hover:shadow-[0_20px_55px_rgba(255,107,53,0.12)] transition-shadow duration-300"
            >
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative flex items-center bg-white/50 rounded-xl border border-gray-150 focus-within:border-[#ff6b35]/40 transition-colors">
                  <span className="material-icon text-[#ff6b35] absolute left-4 text-xl">link</span>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => { setUrl(e.target.value); setError(''); setDownloadedVideo(null); }}
                    className="w-full bg-transparent pl-12 pr-4 py-3.5 rounded-xl text-base text-[#1e2229] placeholder-gray-400 focus:outline-none"
                    placeholder="Paste YouTube recipe URL here..."
                    disabled={processing}
                  />
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={processing}
                  className="gradient-bg text-white font-bold font-display px-8 py-3.5 rounded-xl transition-all duration-300 shadow-[0_4px_15px_rgba(255,107,53,0.25)] hover:shadow-[0_6px_22px_rgba(255,107,53,0.35)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  {processing ? (
                    <>
                    <svg className="animate-spin w-5 h-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                    <span className="material-icon text-xl fill !text-white animate-pulse">auto_awesome</span>
                    <span>Import Recipe</span>
                    </>
                  )}
                </motion.button>
              </div>
            </form>

            {/* Quick Try pills */}
            <div className="mt-4 flex items-center justify-center gap-2.5 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 font-display">Quick Try:</span>
              {QUICK_TRY_RECIPES.map((recipe, idx) => (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.4 + idx * 0.08 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  key={idx}
                  onClick={() => handleQuickTry(recipe.url)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold font-display transition-all border cursor-pointer ${
                    url === recipe.url 
                      ? 'bg-[#ff6b35]/15 border-[#ff6b35] text-[#ff6b35] shadow-sm' 
                      : 'bg-white border-gray-200 text-gray-500 hover:border-[#ff6b35]/30 hover:text-[#ff6b35] hover:bg-[#ff6b35]/5 shadow-[0_2px_4px_rgba(0,0,0,0.01)]'
                  }`}
                >
                  {recipe.label}
                </motion.button>
              ))}
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-4 p-4 rounded-xl border border-red-500/10 bg-red-55/5 text-[#ef4444] text-sm flex items-center gap-2 justify-center"
                >
                  <span className="material-icon text-sm fill">error</span>
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Video preview card */}
            <AnimatePresence>
              {downloadedVideo && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  className="mt-6 glass gradient-border-brand p-5 rounded-2xl flex flex-col sm:flex-row items-center gap-4 text-left shadow-lg"
                >
                  <img
                    src={downloadedVideo.thumbnailUrl}
                    alt="Video thumbnail"
                    className="w-32 h-20 rounded-xl object-cover border border-white/20"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-pulse" />
                      <span className="text-[#10b981] text-xs font-black uppercase tracking-wider font-display">Ready for extraction</span>
                    </div>
                    <h4 className="text-[#1e2229] font-extrabold text-sm truncate">{downloadedVideo.title}</h4>
                    <p className="text-gray-400 text-xs truncate mt-0.5">{downloadedVideo.url}</p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleExtract}
                    className="w-full sm:w-auto gradient-bg text-white px-6 py-3 rounded-xl font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_4px_12px_rgba(255,107,53,0.25)] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span className="material-icon text-base fill !text-white">auto_awesome</span>
                    <span>Extract Ingredients</span>
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Side-by-Side YouTube Video & Cart Showcase (Only visible on mobile/tablet < lg) */}
          <div className="block lg:hidden w-full mt-10">
            <div className="grid grid-cols-2 gap-6 items-center max-w-lg mx-auto px-4">
              <motion.img
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                src="/culinary_mockup.png"
                alt="YouTube Cooking Video Mockup"
                className="w-full h-auto object-contain drop-shadow-md mix-blend-multiply"
              />
              <motion.img
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.15 }}
                src="/shopping_cart_hero.png"
                alt="Grocery Shopping Cart Mockup"
                className="w-full h-auto object-contain drop-shadow-md mix-blend-multiply"
              />
            </div>
          </div>

        </div>
      </section>

      {/* Premium Live AI Simulator Demonstration Canvas */}
      <section className="py-20 relative z-10 px-4 sm:px-6 lg:px-8 border-t border-gray-150 bg-[white]/40 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#ff6b35]/5 border border-[#ff6b35]/12 text-[#ff6b35] mb-4">
              <span className="material-icon text-xs fill animate-pulse">bolt</span>
              <span className="text-[10px] font-black uppercase tracking-wider font-display">Live AI Simulation</span>
            </div>
            <h2 className="font-display font-black text-3xl md:text-5xl text-[#1e2229] mb-4 leading-tight">See the Transformation Magic</h2>
            <p className="text-sm md:text-base text-gray-500 max-w-2xl mx-auto font-medium">Watch how our pipeline automatically structures YouTube recipes in real-time.</p>
          </div>

          {/* Interactive Simulator Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative items-center">
            
            {/* Step 1: Video Player Mockup */}
            <motion.div 
              animate={{ 
                scale: simStep === 0 ? 1.03 : 1, 
                opacity: simStep === 0 ? 1 : 0.6,
                boxShadow: simStep === 0 ? '0 20px 40px rgba(255, 107, 53, 0.12)' : '0 4px 10px rgba(0,0,0,0.02)'
              }}
              transition={{ duration: 0.4 }}
              className={`glass rounded-[32px] p-6 relative flex flex-col justify-between h-[300px] border transition-colors ${
                simStep === 0 ? 'border-[#ff6b35]/35 bg-white animate-border-flow' : 'border-white/60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[9px] uppercase font-black tracking-wider text-gray-400">Step 01. Audio Stream</span>
                  {simStep === 0 && <span className="text-[9px] font-bold text-[#ff6b35] animate-pulse">Scanning Video...</span>}
                </div>
                <h4 className="font-display font-black text-[#1e2229] text-base">Tasty Garlic Butter Pasta</h4>
              </div>
              
              <div className="my-4 relative rounded-2xl overflow-hidden border border-gray-100 bg-[#ff6b35]/5 h-36">
                <img 
                  src="https://img.youtube.com/vi/aG-80_B_gsw/hqdefault.jpg" 
                  alt="mock thumbnail" 
                  className="w-full h-full object-cover"
                />
                
                {simStep === 0 ? (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[1.5px] flex flex-col items-center justify-center p-4 animate-fade-in">
                    <div className="flex items-end gap-1.5 h-12 mb-3">
                      <div className="w-1.5 h-5 bg-[#ff6b35] rounded-full animate-bounce [animation-duration:0.6s]" />
                      <div className="w-1.5 h-10 bg-[#ff6b35] rounded-full animate-bounce [animation-duration:0.75s]" />
                      <div className="w-1.5 h-7 bg-[#ff6b35] rounded-full animate-bounce [animation-duration:0.9s]" />
                      <div className="w-1.5 h-12 bg-[#ff8e53] rounded-full animate-bounce [animation-duration:0.65s]" />
                      <div className="w-1.5 h-8 bg-[#ff6b35] rounded-full animate-bounce [animation-duration:0.8s]" />
                      <div className="w-1.5 h-4 bg-[#ff6b35] rounded-full animate-bounce [animation-duration:0.7s]" />
                    </div>
                    <span className="text-[9px] text-white font-extrabold uppercase tracking-widest font-display bg-[#ff6b35] px-3 py-1 rounded-full shadow-[0_4px_12px_rgba(255,107,53,0.3)] animate-pulse-scale">Analyzing Audio Track</span>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                    <div className="w-11 h-11 rounded-full bg-gray-500/80 text-white flex items-center justify-center shadow-lg">
                      <span className="material-icon fill !text-white text-base">play_arrow</span>
                    </div>
                  </div>
                )}
                
                {/* Scanner laser overlay bar */}
                {simStep === 0 && (
                  <div 
                    className="absolute left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-[#ff6b35] to-transparent shadow-[0_0_10px_#ff6b35]"
                    style={{
                      top: '0px',
                      animation: 'scan 2.8s linear infinite'
                    }}
                  />
                )}
              </div>
              <p className="text-[10px] text-gray-500 leading-relaxed font-medium">Extracting clean audio track from recipe content.</p>
            </motion.div>

            {/* Step 2: AI Parsing Terminal */}
            <motion.div 
              animate={{ 
                scale: simStep === 1 ? 1.03 : 1, 
                opacity: simStep === 1 ? 1 : 0.6,
                boxShadow: simStep === 1 ? '0 20px 40px rgba(255, 107, 53, 0.12)' : '0 4px 10px rgba(0,0,0,0.02)'
              }}
              transition={{ duration: 0.4 }}
              className={`glass rounded-[32px] p-6 relative flex flex-col justify-between h-[300px] border transition-colors ${
                simStep === 1 ? 'border-[#ff6b35]/35 bg-white animate-border-flow' : 'border-white/60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[9px] uppercase font-black tracking-wider text-gray-400">Step 02. AI NLP Parsing</span>
                  {simStep === 1 && <span className="text-[9px] font-bold text-[#ff8e53] animate-pulse">Running NLP Models...</span>}
                </div>
                <h4 className="font-display font-black text-[#1e2229] text-base">Ingredient Detections</h4>
              </div>

              {/* Mock Terminal Console */}
              <div className="my-4 bg-[#14161d] rounded-2xl p-4 font-mono text-[9px] h-36 flex flex-col gap-1.5 overflow-hidden shadow-inner border border-white/5 relative">
                <div className="flex items-center justify-between border-b border-white/5 pb-1.5 text-gray-500 mb-1">
                  <span># transcription_stream</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ff8e53] animate-ping" />
                </div>
                <div className="text-gray-300 leading-relaxed min-h-[35px] max-h-[35px] overflow-hidden">
                  <span className="text-[#ff6b35] mr-1">&gt;</span>{simText || 'Listening...'}
                </div>
                
                {simStep >= 1 ? (
                  <div className="flex flex-col gap-1 mt-1 border-t border-white/5 pt-2 animate-fade-slide-up">
                    <div className="flex items-center justify-between">
                      <span className="text-yellow-400">pasta: <span className="text-orange-400">"250g"</span></span>
                      <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 rounded text-[8px]">98% match</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-yellow-400">butter: <span className="text-orange-400">"50g"</span></span>
                      <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 rounded text-[8px]">95% match</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-600 italic mt-3 text-center">Waiting for parsing stream...</div>
                )}
                
                <div className="absolute bottom-2 right-2 text-[8px] uppercase tracking-wider text-white/20 font-display font-bold">NLP Parser v2</div>
              </div>
              <p className="text-[10px] text-gray-500 leading-relaxed font-medium">Classifying measurements and cleaning descriptors.</p>
            </motion.div>

            {/* Step 3: Smart Grocery Cart */}
            <motion.div 
              animate={{ 
                scale: simStep === 2 ? 1.03 : 1, 
                opacity: simStep === 2 ? 1 : 0.6,
                boxShadow: simStep === 2 ? '0 20px 40px rgba(255, 107, 53, 0.12)' : '0 4px 10px rgba(0,0,0,0.02)'
              }}
              transition={{ duration: 0.4 }}
              className={`glass rounded-[32px] p-6 relative flex flex-col justify-between h-[300px] border transition-colors ${
                simStep === 2 ? 'border-[#ff6b35]/35 bg-white animate-border-flow' : 'border-white/60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[9px] uppercase font-black tracking-wider text-gray-400">Step 03. Grocery List</span>
                  {simStep === 2 && <span className="text-[9px] font-bold text-[#10b981] animate-bounce">Cart Prepared!</span>}
                </div>
                <h4 className="font-display font-black text-[#1e2229] text-base">Optimized Checkout</h4>
              </div>

              <div className="my-4 flex flex-col gap-2 bg-white/40 p-4 rounded-xl border border-gray-250/50 h-36 justify-center relative overflow-hidden">
                {MOCK_CART_ITEMS.map((item, idx) => {
                  const isChecked = simStep === 2 || (simStep === 1 && idx === 0);
                  return (
                    <div key={idx} className="flex items-center justify-between transition-all duration-300">
                      <div className="flex items-center gap-2">
                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                          isChecked ? 'bg-[#ff6b35] border-[#ff6b35] text-white scale-110 shadow-sm' : 'border-gray-300 bg-white'
                        }`}>
                          {isChecked && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <span className={`text-[10px] font-extrabold block transition-all ${isChecked ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{item.name}</span>
                          <span className="text-[8px] text-gray-400 block mt-0.5">{item.size} · {item.price}</span>
                        </div>
                      </div>
                      <span className={`text-[8px] font-bold font-display px-1.5 py-0.5 rounded ${isChecked ? 'bg-orange-55/10 text-[#ff6b35]' : 'bg-gray-100 text-gray-500'}`}>
                        {isChecked ? 'Ready' : 'Pending'}
                      </span>
                    </div>
                  );
                })}
                
                <AnimatePresence>
                  {simStep === 2 && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-[#fff3ec]/95 backdrop-blur-[1px] flex flex-col items-center justify-center p-3"
                    >
                      <span className="material-icon text-3xl text-[#ff6b35] fill animate-bounce">shopping_cart_checkout</span>
                      <span className="text-[10px] font-black uppercase text-[#ff6b35] tracking-widest mt-1">Ingredients Matched</span>
                      <span className="text-[8px] text-gray-500 mt-0.5">Ready to deliver to door</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <p className="text-[10px] text-gray-500 leading-relaxed font-medium">Swapping brands, setting units, and dispatching to door.</p>
            </motion.div>

          </div>
        </div>
      </section>

      {/* Metrics Bar */}
      <section className="py-12 border-t border-b border-gray-150 bg-white relative z-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto flex justify-center gap-8 md:gap-20 items-center flex-wrap">
          <div className="text-center font-display">
            <div className="font-black text-4xl text-[#ff6b35] mb-0.5">∞</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Recipes Supported</div>
          </div>
          <div className="w-[1px] h-8 bg-gray-200 hidden sm:block" />
          <div className="text-center font-display">
            <div className="font-black text-4xl text-[#ff6b35] mb-0.5">100%</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Ingredient Match</div>
          </div>
          <div className="w-[1px] h-8 bg-gray-200 hidden sm:block" />
          <div className="text-center font-display">
            <div className="font-black text-4xl text-[#ff6b35] mb-0.5">&lt; 10s</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Extraction Speed</div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 relative z-10 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[white]/20 to-[white]/80">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#ff6b35]/5 border border-[#ff6b35]/12 text-[#ff6b35] mb-4">
              <span className="material-icon text-xs fill">restaurant</span>
              <span className="text-[10px] font-black uppercase tracking-wider font-display">Product Features</span>
            </div>
            <h2 className="font-display font-extrabold text-3xl md:text-5xl text-[#1e2229] mb-4">AI Kitchen Intelligence</h2>
            <p className="text-sm md:text-base text-gray-500 max-w-2xl mx-auto font-medium">The simplest way to go from culinary content creator instructions to ingredients on your table.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: 'smartphone', title: 'YouTube Auto-Import', desc: 'Paste the cookery link and import instantly. No manually writing ingredients.', color: '#ff6b35' },
              { icon: 'psychology', title: 'Smart Extractor', desc: 'Our AI reads instructions and transcripts to isolate exact ingredient units.', color: '#ff8e53' },
              { icon: 'shopping_cart_checkout', title: 'Smart Lists', desc: 'Toggle budget goals, swap brands, or organize items by store layout.', color: '#ff6b35' },
              { icon: 'location_on', title: 'Direct Checkout', desc: 'Syncs automatically to send ingredient carts straight to your home address.', color: '#ff8e53' },
            ].map((feature, i) => (
              <div key={i} className="group glass p-8 rounded-2xl hover:border-[#ff6b35]/20 transition-all duration-300 hover:-translate-y-1 shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:shadow-lg">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"
                  style={{ background: `rgba(255,107,53,0.05)`, border: `1px solid rgba(255,107,53,0.1)` }}
                >
                  <span className="material-icon" style={{ color: feature.color }}>{feature.icon}</span>
                </div>
                <h3 className="font-display font-bold text-[#1e2229] text-lg mb-2">{feature.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 relative z-10 px-4 sm:px-6 lg:px-8 border-t border-gray-150">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-50 border border-[#ff6b35]/12 text-[#ff6b35] mb-4">
              <span className="text-[10px] font-black uppercase tracking-wider font-display">Workflow</span>
            </div>
            <h2 className="font-display font-extrabold text-3xl md:text-5xl text-[#1e2229] mb-4">Simple 3-Step Process</h2>
          </div>

          <div className="flex flex-col md:flex-row gap-8 relative">
            
            {/* Step 1 */}
            <div className="flex-1 glass p-8 rounded-3xl border border-white/60 relative overflow-hidden group hover:border-[#ff6b35]/30 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:shadow-lg">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#ff6b35]/5 to-transparent rounded-bl-3xl flex items-center justify-center font-display font-black text-[#ff6b35]/5 text-4xl">01</div>
              <div className="w-12 h-12 rounded-xl bg-orange-500/5 border border-orange-500/10 flex items-center justify-center mb-6">
                <span className="material-icon text-[#ff6b35]">content_paste</span>
              </div>
              <h3 className="font-display font-bold text-lg text-[#1e2229] mb-2 font-display">Paste Video Link</h3>
              <p className="text-gray-400 text-xs leading-relaxed">Copy the link of any YouTube cooking tutorial and paste it into our search bar.</p>
            </div>

            {/* Step 2 */}
            <div className="flex-1 glass p-8 rounded-3xl border border-white/60 relative overflow-hidden group hover:border-[#ff6b35]/30 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:shadow-lg">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#ff6b35]/5 to-transparent rounded-bl-3xl flex items-center justify-center font-display font-black text-[#ff6b35]/5 text-4xl">02</div>
              <div className="w-12 h-12 rounded-xl bg-orange-500/5 border border-orange-500/10 flex items-center justify-center mb-6">
                <span className="material-icon text-[#ff6b35]">auto_awesome</span>
              </div>
              <h3 className="font-display font-bold text-lg text-[#1e2229] mb-2 font-display">AI Extraction</h3>
              <p className="text-gray-400 text-xs leading-relaxed">Our AI parses transcripts to identify ingredient list metrics and step instructions.</p>
            </div>

            {/* Step 3 */}
            <div className="flex-1 glass p-8 rounded-3xl border border-white/60 relative overflow-hidden group hover:border-[#ff6b35]/30 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:shadow-lg">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#ff6b35]/5 to-transparent rounded-bl-3xl flex items-center justify-center font-display font-black text-[#ff6b35]/5 text-4xl">03</div>
              <div className="w-12 h-12 rounded-xl bg-orange-500/5 border border-orange-500/10 flex items-center justify-center mb-6">
                <span className="material-icon text-[#ff6b35]">shopping_bag</span>
              </div>
              <h3 className="font-display font-bold text-lg text-[#1e2229] mb-2 font-display">Checkout Delivery</h3>
              <p className="text-gray-400 text-xs leading-relaxed">Review the structured grocery checklist and preview checkout options like Blinkit, Instamart, and Zepto.</p>
            </div>

          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 relative z-10 px-4 sm:px-6 lg:px-8 border-t border-gray-150 bg-white/40">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display font-extrabold text-3xl md:text-5xl text-[#1e2229] mb-4">What Cooks Say</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: 'Priya S.', role: 'Home Chef', text: 'This is brilliant! I do not have to write down shopping lists anymore. I just paste the recipe link and my order is prepared.', stars: 5 },
              { name: 'Rahul M.', role: 'Fitness Planner', text: 'The budget features make meal planning a breeze. Easily swap high-cost items to stay under limits.', stars: 5 },
              { name: 'Anita K.', role: 'Working Mom', text: 'From finding the video to checkout took less than five minutes. An absolute lifesaver for busy weeknights.', stars: 5 },
            ].map((test, i) => (
              <div key={i} className="glass p-8 rounded-2xl border border-white/60 flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.01)]">
                <div>
                  <div className="flex gap-1 mb-6">
                    {[...Array(test.stars)].map((_, s) => (
                      <svg key={s} className="w-4 h-4 text-orange-400 fill-current" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-gray-500 italic text-xs leading-relaxed mb-6">"{test.text}"</p>
                </div>
                <div>
                  <div className="font-display font-bold text-[#1e2229] text-xs">{test.name}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{test.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 relative z-10 px-4 sm:px-6 lg:px-8 border-t border-gray-150">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display font-extrabold text-3xl md:text-5xl text-[#1e2229] mb-4">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-4">
            {[
              { q: 'How does the AI identify ingredients?', a: 'Our system analyzes cooking transcripts and details using machine learning to parse structured items and isolate kitchen measurements.' },
              { q: 'Can I custom-edit ingredients?', a: 'Absolutely. On the review page, you can scale quantities, swap active items, edit brand names, or manually add missing products.' },
              { q: 'Is there a cost for the service?', a: 'Analyzing and structuring recipes is free. Platform checkout options are currently frontend previews, not live third-party orders.' },
              { q: 'What delivery options are available?', a: 'The frontend shows Blinkit, Instamart, and Zepto as checkout choices. Backend API calls to those platforms are future scope.' },
            ].map((faq, i) => (
              <details key={i} className="group glass rounded-2xl overflow-hidden hover:border-[#ff6b35]/20 transition-all">
                <summary className="w-full px-6 py-5 flex items-center justify-between text-left cursor-pointer list-none select-none">
                  <span className="font-display font-bold text-[#1e2229] text-sm pr-4">{faq.q}</span>
                  <span className="material-icon text-gray-400 group-open:rotate-180 transition-transform">expand_more</span>
                </summary>
                <div className="px-6 pb-5 pt-1 text-xs text-gray-500 leading-relaxed border-t border-gray-100 font-display">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative z-10 px-4 sm:px-6 lg:px-8 border-t border-gray-150 bg-[#fff3ec]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-display font-black text-3xl md:text-5xl text-[#ff6b35] mb-6">Ready to Cook Smarter?</h2>
          <p className="text-gray-500 mb-10 max-w-lg mx-auto text-xs md:text-sm font-display font-medium">Experience the magic of AI ingredient extraction. Paste a cooking URL above to start.</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <span className="px-5 py-2.5 bg-white/80 backdrop-blur rounded-full text-gray-600 text-xs font-semibold uppercase tracking-wider border border-orange-200/50 shadow-sm font-display">Free Extraction</span>
            <span className="px-5 py-2.5 bg-white/80 backdrop-blur rounded-full text-gray-600 text-xs font-semibold uppercase tracking-wider border border-orange-200/50 shadow-sm font-display">AI-Powered</span>
            <span className="px-5 py-2.5 bg-white/80 backdrop-blur rounded-full text-gray-600 text-xs font-semibold uppercase tracking-wider border border-orange-200/50 shadow-sm font-display">Instant List</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-150 text-gray-400 py-16 relative z-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-10">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <LogoIcon className="w-9 h-9" />
                <span className="font-display font-bold text-lg text-[#1e2229] tracking-tight">Cook2Cart</span>
              </div>
              <p className="text-xs leading-relaxed text-gray-500 font-display">Turn cooking video recipes into local grocery checkouts instantly. Built with light premium aesthetics.</p>
            </div>
            <div>
              <h4 className="font-display font-semibold text-gray-700 text-xs mb-4 uppercase tracking-wider">Product</h4>
              <ul className="space-y-2 text-xs font-display">
                <li><Link to="/search" className="text-gray-400 hover:text-[#ff6b35] transition">Search Recipes</Link></li>
                <li><Link to="/" className="text-gray-400 hover:text-[#ff6b35] transition">Home Page</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-display font-semibold text-gray-700 text-xs mb-4 uppercase tracking-wider">Support</h4>
              <ul className="space-y-2 text-xs font-display">
                <li><span className="text-gray-400 hover:text-[#ff6b35] transition cursor-pointer">FAQs</span></li>
                <li><span className="text-gray-400 hover:text-[#ff6b35] transition cursor-pointer">Feedback</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-display font-semibold text-gray-700 text-xs mb-4 uppercase tracking-wider">Legal</h4>
              <ul className="space-y-2 text-xs font-display">
                <li><span className="text-gray-400 hover:text-[#ff6b35] transition cursor-pointer">Privacy Policy</span></li>
                <li><span className="text-gray-400 hover:text-[#ff6b35] transition cursor-pointer">Terms of Service</span></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-150 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-display text-gray-400">
            <p>&copy; 2026 Cook2Cart. All rights reserved.</p>
            <div className="flex gap-4">
              {['Twitter', 'GitHub', 'LinkedIn'].map((link, idx) => (
                <span key={idx} className="hover:text-[#ff6b35] transition cursor-pointer">{link}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>

      <BottomNav />
    </div>
  );
}

