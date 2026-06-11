import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SearchResultsPage from './pages/SearchResultsPage';
import AIProcessingPage from './pages/AIProcessingPage';
import RecipeReviewPage from './pages/RecipeReviewPage';
import SmartCartPage from './pages/SmartCartPage';
import LocationSelectionPage from './pages/LocationSelectionPage';
import OrderSummaryPage from './pages/OrderSummaryPage';
import UserProfilePage from './pages/UserProfilePage';
import FavoritesPage from './pages/FavoritesPage';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/search" element={<SearchResultsPage />} />
          <Route path="/process/:videoId" element={<AIProcessingPage />} />
          <Route path="/review/:videoId" element={<RecipeReviewPage />} />
          <Route path="/cart" element={<ProtectedRoute><SmartCartPage /></ProtectedRoute>} />
          <Route path="/cart/:videoId" element={<ProtectedRoute><SmartCartPage /></ProtectedRoute>} />
          <Route path="/location/:videoId" element={<ProtectedRoute><LocationSelectionPage /></ProtectedRoute>} />
          <Route path="/order/:videoId" element={<ProtectedRoute><OrderSummaryPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><UserProfilePage /></ProtectedRoute>} />
          <Route path="/favorites" element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
