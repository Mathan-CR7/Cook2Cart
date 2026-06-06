import { useNavigate, Link } from 'react-router-dom';

export default function BottomNav() {
  const navigate = useNavigate();

  const isActive = (path) => window.location.pathname === path;

  return (
    <nav className="fixed bottom-0 w-full z-50 bg-white/90 backdrop-blur-2xl border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] flex justify-around items-center h-16 px-4 md:hidden">
      {[
        { path: '/', icon: 'home', label: 'Home' },
        { path: '/search', icon: 'search', label: 'Search' },
        { path: '/cart', icon: 'shopping_cart', label: 'Cart' },
        { path: '/profile', icon: 'person', label: 'Profile' },
      ].map((item) => {
        const active = isActive(item.path);
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center justify-center px-3 transition-all ${
              active ? 'text-orange-500' : 'text-gray-400'
            }`}
          >
            <span className={`material-icon !text-2xl ${active ? 'fill text-orange-500' : ''}`}>{item.icon}</span>
            <span className="text-[10px] font-medium mt-0.5">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
