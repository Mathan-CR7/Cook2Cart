import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const NAV_ITEMS = [
  { path: '/', icon: 'home', label: 'Home' },
  { path: '/search', icon: 'search', label: 'Search' },
  { path: '/cart', icon: 'shopping_cart', label: 'Cart' },
  { path: '/favorites', icon: 'bookmark', label: 'Saved' },
  { path: '/profile', icon: 'person', label: 'Profile' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <div className="md:hidden fixed bottom-4 left-4 right-4 z-40">
      <div 
        className="glass-bright rounded-2xl flex items-center justify-around h-16 px-2 shadow-[0_10px_30px_rgba(0,0,0,0.06)] border border-white/40"
        style={{ background: 'rgba(255, 255, 255, 0.82)', backdropFilter: 'blur(20px)' }}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.path;
          return (
            <motion.button
              key={item.path}
              onClick={() => navigate(item.path)}
              whileTap={{ scale: 0.9 }}
              className="flex flex-col items-center justify-center flex-1 h-full relative py-1 focus:outline-none"
            >
              {/* Active Indicator Pill */}
              {isActive && (
                <motion.div 
                  layoutId="bottomNavActive"
                  className="absolute top-0.5 w-10 h-1.5 rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, #ff6b35, #ff4f11)',
                  }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}

              <motion.span 
                animate={{ scale: isActive ? 1.12 : 1 }}
                className={`material-icon transition-all duration-250 ${
                  isActive ? 'text-[#ff6b35] fill' : 'text-gray-400'
                }`}
                style={{ fontSize: '22px' }}
              >
                {item.icon}
              </motion.span>
              
              <span 
                className={`text-[9px] font-display font-bold uppercase tracking-wider mt-0.5 transition-colors ${
                  isActive ? 'text-[#ff6b35]' : 'text-gray-400'
                }`}
              >
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

