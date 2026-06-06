import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppBar from '../components/AppBar';
import BottomNav from '../components/BottomNav';
import RecipeCard from '../components/RecipeCard';
import { videoService } from '../utils/api';

export default function SearchResultsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [searchInput, setSearchInput] = useState(query);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const recognitionRef = useRef(null);

  useEffect(() => {
    setSearchInput(query);

    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      setError('');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    videoService.search(query)
      .then((res) => {
        if (cancelled) return;
        setResults(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => {
        if (cancelled) return;
        setResults([]);
        setError(err.response?.data?.message || err.response?.data || 'Failed to fetch videos. Make sure video-service is running.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [query]);

  const handleSearch = (e) => {
    e.preventDefault();
    const nextQuery = searchInput.trim();
    if (!nextQuery) return;
    navigate(`/search?q=${encodeURIComponent(nextQuery)}`);
  };

  const handleVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceSupported(false);
      setError('Voice search is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setError('');
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      if (!transcript) return;

      setSearchInput(transcript);
      navigate(`/search?q=${encodeURIComponent(transcript)}`);
    };

    recognition.onerror = (event) => {
      const message = event.error === 'not-allowed'
        ? 'Microphone permission was blocked. Allow microphone access and try again.'
        : 'Could not hear that clearly. Try speaking again.';

      setError(message);
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.start();
  };

  const stopVoiceSearch = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  };

  return (
    <div className="bg-white min-h-screen pb-16">
      <AppBar />
      {isListening && (
        <div className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 text-center border border-gray-100">
            <button
              type="button"
              onClick={stopVoiceSearch}
              className="ml-auto mb-4 w-9 h-9 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center transition-colors"
              aria-label="Close voice search"
            >
              <span className="material-icon !text-xl">close</span>
            </button>
            <div className="relative w-28 h-28 mx-auto mb-6 flex items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-red-100 animate-ping" />
              <span className="absolute inset-4 rounded-full bg-red-200 animate-pulse" />
              <div className="relative w-20 h-20 rounded-full bg-red-500 text-white flex items-center justify-center shadow-xl">
                <span className="material-icon fill !text-white !text-4xl">mic</span>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Listening...</h2>
            <p className="text-gray-500 text-sm mb-6">Speak your recipe search</p>
            <div className="flex items-center justify-center gap-1.5 h-8">
              <span className="w-1.5 h-3 rounded-full bg-orange-400 animate-pulse" />
              <span className="w-1.5 h-6 rounded-full bg-red-400 animate-pulse [animation-delay:120ms]" />
              <span className="w-1.5 h-4 rounded-full bg-orange-400 animate-pulse [animation-delay:240ms]" />
              <span className="w-1.5 h-7 rounded-full bg-red-400 animate-pulse [animation-delay:360ms]" />
              <span className="w-1.5 h-3 rounded-full bg-orange-400 animate-pulse [animation-delay:480ms]" />
            </div>
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        {/* Search Input */}
        <div className="mb-8">
          <form onSubmit={handleSearch} className="bg-white rounded-3xl shadow-lg p-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search recipes, cuisines, ingredients..."
                  className="w-full pl-12 pr-14 py-3.5 border-2 border-gray-200 rounded-2xl text-base focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all text-gray-900 placeholder-gray-400"
                />
                <button
                  type="button"
                  onClick={handleVoiceSearch}
                  disabled={isListening || !voiceSupported}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    isListening
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  aria-label={isListening ? 'Listening' : 'Voice search'}
                  title={isListening ? 'Listening...' : 'Voice search'}
                >
                  <span className={`material-icon !text-xl ${isListening ? '!text-white fill' : ''}`}>mic</span>
                </button>
              </div>
              <button type="submit" disabled={loading} className="gradient-bg text-white px-6 py-3.5 rounded-2xl font-semibold hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                <span className="material-icon !text-white !text-lg fill">auto_awesome</span>
                {loading ? 'Searching...' : 'Magic Search'}
              </button>
            </div>
          </form>

          {/* Filter Chips */}
          <div className="flex gap-2 overflow-x-auto py-4 no-scrollbar">
            {['All Results', 'Under 20 mins', 'Vegetarian', 'Gluten-Free', 'High Protein'].map((chip) => (
              <button
                key={chip}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap border transition-all ${
                  chip === 'All Results'
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-600'
                }`}
              >
                {chip}
              </button>
            ))}
          </div>

          <p className="text-gray-500 text-sm">
            {isListening && 'Listening... speak your recipe search'}
            {!isListening && !query && 'Search YouTube recipe videos'}
            {!isListening && query && (loading ? 'Searching...' : `${results.length} videos found`)}
            {query && <> for &ldquo;{query}&rdquo;</>}
          </p>
        </div>

        {/* Results Grid */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">
            {error}
          </div>
        )}

        {!query && !loading ? (
          <div className="text-center py-20 border border-dashed border-gray-200 rounded-3xl">
            <span className="material-icon !text-5xl text-orange-400 mb-3">youtube_searched_for</span>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Search for a recipe video</h2>
            <p className="text-gray-500 text-sm">Try pasta, biryani, dosa, chicken curry, or healthy breakfast.</p>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-lg animate-pulse">
                <div className="aspect-video bg-gray-200" />
                <div className="p-5 space-y-3">
                  <div className="h-5 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-10 bg-gray-200 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
            {results.map((recipe, i) => (
              <RecipeCard key={recipe.videoId} recipe={recipe} index={i} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 border border-dashed border-gray-200 rounded-3xl">
            <span className="material-icon !text-5xl text-gray-300 mb-3">search_off</span>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No videos found</h2>
            <p className="text-gray-500 text-sm">Try a different recipe or ingredient.</p>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
