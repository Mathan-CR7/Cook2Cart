import { Navigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function ProtectedRoute({ children }) {
  const { state } = useApp();
  const location = useLocation();

  if (!state.authChecked && localStorage.getItem('token')) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fff7f2] text-sm font-bold text-gray-500">
        Restoring your session...
      </div>
    );
  }

  if (!state.isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  }

  return children;
}
