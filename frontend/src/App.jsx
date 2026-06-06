import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SearchResultsPage from './pages/SearchResultsPage';
import AIProcessingPage from './pages/AIProcessingPage';
import RecipeReviewPage from './pages/RecipeReviewPage';
import SmartCartPage from './pages/SmartCartPage';
import LocationSelectionPage from './pages/LocationSelectionPage';
import OrderSummaryPage from './pages/OrderSummaryPage';
import UserProfilePage from './pages/UserProfilePage';

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
          <Route path="/cart/:videoId" element={<SmartCartPage />} />
          <Route path="/location/:videoId" element={<LocationSelectionPage />} />
          <Route path="/order/:videoId" element={<OrderSummaryPage />} />
          <Route path="/profile" element={<UserProfilePage />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
