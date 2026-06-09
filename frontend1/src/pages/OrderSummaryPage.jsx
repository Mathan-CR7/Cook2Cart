import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import AppBar from '../components/AppBar';
import BottomNav from '../components/BottomNav';
import PremiumBackground from '../components/PremiumBackground';
import FAB from '../components/FAB';

export default function OrderSummaryPage() {
  const navigate = useNavigate();
  const { videoId } = useParams();
  const { state, dispatch } = useApp();
  const [confirmed, setConfirmed] = useState(false);

  const cart = state.cart || [];
  const address = state.selectedAddress;
  const total = cart.reduce((sum, item) => sum + (item.price || 0) * (item.qty || 1), 0);

  const handleConfirm = () => {
    dispatch({ type: 'CONFIRM_ORDER' });
    setConfirmed(true);
    setTimeout(() => navigate('/'), 3500);
  };

  // Generate confetti styling variables
  const confettiArray = Array.from({ length: 50 }).map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 2.5,
    size: Math.random() * 10 + 6,
    color: ['#ff6b35', '#ff8e53', '#fbbf24', '#10b981', '#3b82f6', '#ff5a5f'][
      Math.floor(Math.random() * 6)
    ],
  }));

  if (confirmed) {
    return (
      <div className="c2c-root min-h-screen flex items-center justify-center px-4 pb-16 relative overflow-hidden bg-[white]">
        <PremiumBackground />
        
        {/* Confetti Rain Overlay */}
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
          {confettiArray.map((particle) => (
            <div
              key={particle.id}
              className="absolute animate-confetti rounded-sm"
              style={{
                left: `${particle.left}%`,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                backgroundColor: particle.color,
                animationDelay: `${particle.delay}s`,
                top: '-20px',
              }}
            />
          ))}
        </div>

        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 25 }}
          className="text-center max-w-md z-10 p-8 glass rounded-[32px] border border-white/60 shadow-xl"
        >
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: 360 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.15 }}
            className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-6"
          >
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </motion.div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2 font-display">Order Confirmed!</h1>
          <p className="text-gray-500 mb-8 font-display text-sm">Your groceries are on the way. Estimated delivery in 30-45 minutes.</p>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/')} 
            className="gradient-bg text-white py-3.5 px-8 rounded-2xl font-bold font-display text-sm hover:opacity-95 transition-all shadow-lg cursor-pointer"
          >
            Back to Home
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="c2c-root min-h-screen pb-16 overflow-x-hidden relative bg-[white]">
      <PremiumBackground />
      <AppBar />
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-lg mx-auto px-4 sm:px-6 pt-24 z-10 relative font-display"
      >
        <h1 className="text-2xl font-bold text-gray-900 mb-1 font-display">Order Summary</h1>
        <p className="text-gray-500 text-sm mb-6 font-display">Review your order before confirming</p>

        <div className="bg-orange-50/80 border border-orange-100 rounded-2xl p-4 mb-6 shadow-sm">
          <h3 className="font-semibold text-sm text-orange-700 mb-1">Checkout platform status</h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            Current implementation: frontend shows Blinkit, Instamart, and Zepto. Backend API calls to those platforms are not implemented yet. Future scope: real-time grocery platform integration.
          </p>
        </div>

        {address && (
          <div className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center gap-4 mb-6 shadow-sm">
            <svg className="w-5 h-5 text-orange-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <div>
              <h3 className="font-semibold text-sm text-gray-900">Delivery Address</h3>
              {address.addressType === 'CURRENT_LOCATION' ? (
                <p className="text-xs text-gray-500 mt-0.5">Current Location (auto-detected)</p>
              ) : (
                <p className="text-xs text-gray-500 mt-0.5">{address.doorNo}, {address.street}, {address.city}, {address.state} - {address.pincode}</p>
              )}
            </div>
          </div>
        )}

        <h3 className="font-semibold text-sm text-gray-700 flex items-center gap-2 mb-3">
          <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
          <span>Cart Items ({cart.length})</span>
        </h3>
        <div className="flex flex-col gap-2 mb-6">
          {cart.map((item, i) => (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              key={i} 
              className="bg-white border border-gray-150 rounded-xl px-5 py-3.5 flex items-center gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.01)]"
            >
              <span className="flex-1 text-sm text-gray-800 font-semibold">{item.selectedProduct?.name || item.name}</span>
              <span className="text-xs text-gray-400 font-bold">x{item.qty || 1}</span>
              <span className="text-sm font-black text-orange-600 min-w-[60px] text-right">₹{(item.price || 0) * (item.qty || 1)}</span>
            </motion.div>
          ))}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8 shadow-sm">
          <div className="flex justify-between text-sm py-1.5 text-gray-500 font-medium"><span>Subtotal</span><span>₹{total}</span></div>
          <div className="flex justify-between text-sm py-1.5 text-gray-500 font-medium"><span>Delivery Fee</span><span className="text-green-600 font-bold">FREE</span></div>
          <div className="flex justify-between font-extrabold text-lg py-2.5 mt-2 border-t border-gray-100 text-gray-900"><span>Total</span><span>₹{total}</span></div>
        </div>

        <motion.button 
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={handleConfirm} 
          className="gradient-bg text-white py-4 rounded-2xl font-bold font-display text-sm hover:opacity-95 transition-all w-full flex items-center justify-center gap-2 shadow-lg mb-12 cursor-pointer"
        >
          <span>Confirm Order</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
        </motion.button>
      </motion.div>
      <BottomNav />
      <FAB />
    </div>
  );
}

