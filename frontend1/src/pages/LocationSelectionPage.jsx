import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import AppBar from '../components/AppBar';
import BottomNav from '../components/BottomNav';
import PremiumBackground from '../components/PremiumBackground';
import FAB from '../components/FAB';

export default function LocationSelectionPage() {
  const navigate = useNavigate();
  const { videoId } = useParams();
  const { dispatch } = useApp();
  const [useCurrent, setUseCurrent] = useState(false);
  const [manual, setManual] = useState({ doorNo: '', street: '', city: '', state: '', pincode: '' });

  const handleCurrent = () => {
    setUseCurrent(true);
    dispatch({ type: 'SET_SELECTED_ADDRESS', payload: { addressType: 'CURRENT_LOCATION', label: 'Current Location' } });
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const address = { ...manual, addressType: 'MANUAL', label: `${manual.doorNo}, ${manual.street}` };
    dispatch({ type: 'SET_SELECTED_ADDRESS', payload: address });
    dispatch({ type: 'ADD_ADDRESS', payload: address });
    navigate(`/order/${videoId}`);
  };

  return (
    <div className="c2c-root min-h-screen pb-16 overflow-x-hidden relative bg-[white]">
      <PremiumBackground />
      <AppBar />
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="max-w-lg mx-auto px-4 sm:px-6 pt-24 z-10 relative"
      >
        <div className="text-center mb-10">
          <motion.div 
            animate={{ y: [0, -5, 0] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
            className="w-16 h-16 mx-auto bg-gradient-to-br from-orange-100 to-red-100 rounded-2xl flex items-center justify-center mb-4 shadow-sm"
          >
            <svg className="w-7 h-7 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </motion.div>
          <h1 className="text-2xl font-bold text-gray-900 font-display">Select Delivery Location</h1>
          <p className="text-gray-500 text-sm mt-1 font-display">Choose where to deliver your groceries</p>
        </div>

        <div className="flex flex-col gap-4">
          <motion.button 
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleCurrent} 
            className={`bg-white border-2 rounded-2xl p-5 flex items-center gap-4 text-left transition-all cursor-pointer ${useCurrent ? 'border-orange-500 bg-orange-50 shadow-sm' : 'border-gray-200 hover:border-orange-200'}`}
          >
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <div className="flex-1 font-display">
              <h3 className="font-semibold text-gray-900">Use Current Location</h3>
              <p className="text-xs text-gray-500 mt-0.5">Auto-detect your location for delivery</p>
            </div>
            <AnimatePresence>
              {useCurrent && (
                <motion.svg 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="w-5 h-5 text-orange-500 flex-shrink-0" 
                  fill="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </motion.svg>
              )}
            </AnimatePresence>
          </motion.button>

          <div className="flex items-center gap-4"><div className="flex-1 h-px bg-gray-200" /><span className="text-xs text-gray-400 font-bold font-display">OR</span><div className="flex-1 h-px bg-gray-200" /></div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </div>
            <div className="font-display">
              <h3 className="font-semibold text-gray-900">Add Address Manually</h3>
              <p className="text-xs text-gray-500 mt-0.5">Enter your delivery address</p>
            </div>
          </div>

          <form onSubmit={handleManualSubmit} className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col gap-3">
            <input type="text" placeholder="Door No." value={manual.doorNo} onChange={(e) => setManual({ ...manual, doorNo: e.target.value })} className="w-full px-4 py-3 border border-gray-200 focus:border-[#ff6b35] focus:shadow-[0_0_0_3px_rgba(255,107,53,0.1)] rounded-xl text-sm focus:outline-none transition-all text-gray-900 placeholder-gray-400" required />
            <input type="text" placeholder="Street" value={manual.street} onChange={(e) => setManual({ ...manual, street: e.target.value })} className="w-full px-4 py-3 border border-gray-200 focus:border-[#ff6b35] focus:shadow-[0_0_0_3px_rgba(255,107,53,0.1)] rounded-xl text-sm focus:outline-none transition-all text-gray-900 placeholder-gray-400" required />
            <div className="grid grid-cols-2 gap-3">
              <input type="text" placeholder="City" value={manual.city} onChange={(e) => setManual({ ...manual, city: e.target.value })} className="w-full px-4 py-3 border border-gray-200 focus:border-[#ff6b35] focus:shadow-[0_0_0_3px_rgba(255,107,53,0.1)] rounded-xl text-sm focus:outline-none transition-all text-gray-900 placeholder-gray-400" required />
              <input type="text" placeholder="State" value={manual.state} onChange={(e) => setManual({ ...manual, state: e.target.value })} className="w-full px-4 py-3 border border-gray-200 focus:border-[#ff6b35] focus:shadow-[0_0_0_3px_rgba(255,107,53,0.1)] rounded-xl text-sm focus:outline-none transition-all text-gray-900 placeholder-gray-400" required />
            </div>
            <input type="text" placeholder="Pincode" value={manual.pincode} onChange={(e) => setManual({ ...manual, pincode: e.target.value })} className="w-full px-4 py-3 border border-gray-200 focus:border-[#ff6b35] focus:shadow-[0_0_0_3px_rgba(255,107,53,0.1)] rounded-xl text-sm focus:outline-none transition-all text-gray-900 placeholder-gray-400" required />
            
            <motion.button 
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit" 
              className="gradient-bg text-white py-3.5 rounded-xl font-bold font-display text-sm hover:opacity-95 transition-all w-full mt-1 shadow-lg cursor-pointer"
            >
              Save & Continue
            </motion.button>
          </form>

          <AnimatePresence>
            {useCurrent && (
              <motion.button 
                initial={{ opacity: 0, height: 0, y: 10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => navigate(`/order/${videoId}`)} 
                className="gradient-bg text-white py-3.5 rounded-2xl font-bold font-display text-sm hover:opacity-95 transition-all w-full shadow-lg cursor-pointer overflow-hidden"
              >
                Confirm Location & Continue
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
      <BottomNav />
      <FAB />
    </div>
  );
}

