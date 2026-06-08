import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { videoCatalogService } from '../utils/api';
import { useApp } from '../context/AppContext';

export default function RecipeCard({ recipe, index = 0 }) {
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const [isPlaying, setIsPlaying] = useState(false);
  const isSaved = state.savedRecipes?.some((item) => String(item.id) === String(recipe.videoId));
  const isFavorite = state.favoriteRecipes?.some((item) => String(item.id) === String(recipe.videoId));

  const saveVideoMetadata = async () => {
    const response = await videoCatalogService.saveVideo({
      youtubeVideoId: recipe.videoId,
      title: recipe.title,
      channelName: recipe.channelTitle || recipe.channelName || 'Cook2Cart',
      thumbnailUrl: recipe.thumbnailUrl,
      videoUrl: recipe.videoUrl || `https://www.youtube.com/watch?v=${recipe.videoId}`,
      duration: recipe.duration || null,
    });

    return response.data.id;
  };

  const saveActionToDb = async (actionType) => {
    if (!state.user?.id) return;
    const dbVideoId = recipe.dbVideoId || await saveVideoMetadata();
    await videoCatalogService.saveUserAction({
      userId: state.user.id,
      videoId: dbVideoId,
      actionType,
    });
  };

  const deleteActionFromDb = async (actionType) => {
    if (!state.user?.id) return;
    const dbVideoId = recipe.dbVideoId || await saveVideoMetadata();
    await videoCatalogService.deleteUserAction(state.user.id, dbVideoId, actionType);
  };

  const handleProcess = async () => {
    let recipeState = recipe;

    try {
      const dbVideoId = await saveVideoMetadata();
      recipeState = { ...recipe, dbVideoId };
    } catch (err) {
      console.error('Failed to save video metadata, continuing with processing:', err);
    }

    navigate(`/process/${recipe.videoId}`, { state: recipeState });
  };

  const handleWatchVideo = () => {
    dispatch({
      type: 'ADD_RECENT_RECIPE',
      payload: {
        id: recipe.videoId,
        videoId: recipe.videoId,
        title: recipe.title,
        channelTitle: recipe.channelTitle || recipe.channelName || 'Cook2Cart',
        thumbnailUrl: recipe.thumbnailUrl,
        watchedAt: new Date().toISOString(),
      },
    });
    saveActionToDb('HISTORY').catch((err) => {
      console.error('Failed to save video history action to database:', err);
    });
    setIsPlaying(true);
  };

  const handleToggleSave = (event) => {
    event.stopPropagation();

    if (isSaved) {
      dispatch({ type: 'REMOVE_SAVED_RECIPE', payload: recipe.videoId });
      deleteActionFromDb('SAVED').catch((err) => {
        console.error('Failed to remove saved video action from database:', err);
      });
      return;
    }

    dispatch({
      type: 'SAVE_RECIPE',
      payload: {
        id: recipe.videoId,
        videoId: recipe.videoId,
        title: recipe.title,
        thumbnailUrl: recipe.thumbnailUrl,
        savedAt: new Date().toISOString(),
        ingredients: [],
        instructions: [],
      },
    });
    saveActionToDb('SAVED').catch((err) => {
      console.error('Failed to save video action to database:', err);
    });
  };

  const handleToggleFavorite = (event) => {
    event.stopPropagation();

    if (isFavorite) {
      dispatch({ type: 'REMOVE_FAVORITE_RECIPE', payload: recipe.videoId });
      deleteActionFromDb('FAVORITE').catch((err) => {
        console.error('Failed to remove favorite video action from database:', err);
      });
      return;
    }

    dispatch({
      type: 'ADD_FAVORITE_RECIPE',
      payload: {
        id: recipe.videoId,
        videoId: recipe.videoId,
        title: recipe.title,
        thumbnailUrl: recipe.thumbnailUrl,
        savedAt: new Date().toISOString(),
        ingredients: [],
        instructions: [],
      },
    });
    saveActionToDb('FAVORITE').catch((err) => {
      console.error('Failed to save favorite video action to database:', err);
    });
  };

  const embedUrl = `https://www.youtube.com/embed/${recipe.videoId}?autoplay=1&rel=0`;

  return (
    <article className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 overflow-hidden">
      <div className="relative aspect-video overflow-hidden bg-black">
        {isPlaying ? (
          <>
            <iframe
              title={recipe.title}
              src={embedUrl}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
            <button
              type="button"
              onClick={() => setIsPlaying(false)}
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black transition-colors z-10"
              aria-label="Close video"
            >
              <span className="material-icon !text-white !text-lg">close</span>
            </button>
          </>
        ) : (
          <button
            type="button"
            className="absolute inset-0 w-full h-full text-left cursor-pointer"
            onClick={handleWatchVideo}
            aria-label={`Play ${recipe.title}`}
          >
            <img
              alt={recipe.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              src={recipe.thumbnailUrl}
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
            {recipe.duration && (
              <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-black/70 rounded-md text-white text-[10px] font-medium tracking-wider">
                {recipe.duration}
              </div>
            )}
          </button>
        )}
        {!isPlaying && recipe.videoUrl && (
          <a
            href={recipe.videoUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition-colors"
            aria-label="Open on YouTube"
          >
            <span className="material-icon !text-white !text-lg">open_in_new</span>
          </a>
        )}
      </div>
      <div className="p-5">
        <h3 className="font-bold text-gray-900 group-hover:text-orange-600 transition-colors leading-snug mb-1.5 line-clamp-2">
          {recipe.title}
        </h3>
        <p className="text-gray-500 text-sm flex items-center gap-1.5 mb-4">
          <svg className="w-4 h-4 text-orange-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
          {recipe.channelTitle || 'Cook2Cart'}
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={handleProcess}
            className="flex-1 gradient-bg text-white py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-icon !text-white !text-lg fill">bolt</span>
            Process Recipe
          </button>
          <button
            type="button"
            onClick={handleToggleSave}
            title={isSaved ? 'Remove saved recipe' : 'Save recipe'}
            className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${
              isSaved
                ? 'bg-orange-500 text-white border-orange-500'
                : 'border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-orange-500'
            }`}
          >
            <svg className="w-5 h-5" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleToggleFavorite}
            title={isFavorite ? 'Remove favorite' : 'Add favorite'}
            className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${
              isFavorite
                ? 'bg-orange-500 text-white border-orange-500'
                : 'border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-orange-500'
            }`}
          >
            <span className={`material-icon !text-xl ${isFavorite ? 'fill !text-white' : ''}`}>favorite</span>
          </button>
        </div>
      </div>
    </article>
  );
}
