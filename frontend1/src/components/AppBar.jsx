import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import LogoIcon from './LogoIcon';

const NAV_ITEMS = [
  { path: '/', label: 'Home', icon: 'home' },
  { path: '/search', label: 'Search Videos', icon: 'search' },
  { path: '/cart', label: 'Shopping List', icon: 'shopping_cart' },
  { path: '/favorites', label: 'Saved Video', icon: 'bookmark' },
];

export default function AppBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { state, dispatch } = useApp();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 15);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    dispatch({ type: 'LOGOUT' });
    navigate('/');
    setMenuOpen(false);
  };

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled
            ? 'rgba(255, 255, 255, 0.85)'
            : 'rgba(255, 255, 255, 0.4)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: scrolled
            ? '1px solid rgba(255, 107, 53, 0.08)'
            : '1px solid rgba(255, 107, 53, 0.04)',
          boxShadow: scrolled ? '0 4px 30px rgba(0, 0, 0, 0.02)' : 'none',
        }}
      >
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <motion.div
                whileHover={{ scale: 1.08, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
                className="w-10 h-10 flex items-center justify-center relative"
              >
                <LogoIcon className="w-10 h-10" />
              </motion.div>
              <span
                className="font-display font-black text-xl tracking-tight text-[#1e2229]"
              >
                Cook2Cart
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1.5">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className="relative px-4 py-2 text-sm font-semibold transition-colors duration-200"
                    style={{
                      color: isActive ? '#ff6b35' : '#5a6270',
                    }}
                  >
                    <span className="relative z-10">{item.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="appBarActive"
                        className="absolute inset-0 bg-[#ff6b35]/8 border border-[#ff6b35]/12 rounded-xl -z-0"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                  </Link>
                );
              })}

              <div className="w-[1px] h-6 bg-gray-200 mx-2" />

              {state.isAuthenticated ? (
                <div className="flex items-center gap-3">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Link
                      to="/profile"
                      className="flex items-center gap-2.5 transition-all"
                    >
                      <div className="w-7 h-7 rounded-lg gradient-bg flex items-center justify-center text-white text-xs font-bold font-display shadow-[0_2px_8px_rgba(255,107,53,0.2)]">
                        {state.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <span className="text-sm font-semibold text-[#5a6270] hover:text-[#ff6b35] transition-colors truncate">{state.user?.name}</span>
                    </Link>
                  </motion.div>
                  <motion.button
                    whileHover={{ scale: 1.05, color: '#ef4444' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleLogout}
                    className="p-2 text-gray-400 hover:text-red-500 rounded-xl transition-all"
                    title="Log Out"
                  >
                    <span className="material-icon text-lg">logout</span>
                  </motion.button>
                </div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate('/login')}
                  className="font-display font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl border border-[#ff6b35]/20 text-[#ff6b35] hover:bg-[#ff6b35]/5 transition-all hover:border-[#ff6b35]"
                >
                  Sign In
                </motion.button>
              )}
            </div>

            {/* Mobile Menu Trigger */}
            <div className="md:hidden flex items-center gap-2">
              {state.isAuthenticated && (
                <Link
                  to="/profile"
                  className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-white text-sm font-bold font-display"
                >
                  {state.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </Link>
              )}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setMenuOpen(!menuOpen)}
                className="w-10 h-10 rounded-xl flex items-center justify-center border border-gray-100 text-gray-600 hover:text-[#ff6b35] hover:bg-gray-50 transition-all"
              >
                <span className="material-icon">{menuOpen ? 'close' : 'menu'}</span>
              </motion.button>
            </div>

          </div>
        </div>

        {/* Mobile Menu Panel */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-100 shadow-xl overflow-hidden"
            >
              <div className="px-4 py-3 flex flex-col gap-1 bg-white">
                {NAV_ITEMS.map((item) => {
                  const isActive = pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                        isActive ? 'bg-orange-50 text-[#ff6b35]' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span className={`material-icon ${isActive ? 'text-[#ff6b35] fill' : 'text-gray-400'}`}>{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
                
                <div className="h-px bg-gray-100 my-2" />

                {state.isAuthenticated ? (
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 transition-all text-left w-full"
                  >
                    <span className="material-icon text-red-500">logout</span>
                    <span>Log Out</span>
                  </button>
                ) : (
                  <button
                    onClick={() => { navigate('/login'); setMenuOpen(false); }}
                    className="gradient-bg text-white font-display font-bold text-center py-3.5 rounded-xl text-sm shadow-[0_4px_12px_rgba(255,107,53,0.2)]"
                  >
                    Sign In to Cook2Cart
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </>
  );
}

