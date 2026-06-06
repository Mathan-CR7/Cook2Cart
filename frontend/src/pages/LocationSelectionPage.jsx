import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import AppBar from '../components/AppBar';
import BottomNav from '../components/BottomNav';
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
    <div className="bg-white min-h-screen pb-16">
      <AppBar />
      <div className="max-w-lg mx-auto px-4 sm:px-6 pt-24">
        <div className="text-center mb-10">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-orange-100 to-red-100 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Select Delivery Location</h1>
          <p className="text-gray-500 text-sm mt-1">Choose where to deliver your groceries</p>
        </div>

        <div className="flex flex-col gap-4">
          <button onClick={handleCurrent} className={`bg-white border-2 rounded-2xl p-5 flex items-center gap-4 text-left transition-all ${useCurrent ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-orange-200'}`}>
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Use Current Location</h3>
              <p className="text-xs text-gray-500 mt-0.5">Auto-detect your location for delivery</p>
            </div>
            {useCurrent && <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>}
          </button>

          <div className="flex items-center gap-4"><div className="flex-1 h-px bg-gray-200" /><span className="text-xs text-gray-400 font-medium">OR</span><div className="flex-1 h-px bg-gray-200" /></div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </div>
            <div><h3 className="font-semibold text-gray-900">Add Address Manually</h3><p className="text-xs text-gray-500 mt-0.5">Enter your delivery address</p></div>
          </div>

          <form onSubmit={handleManualSubmit} className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col gap-3">
            <input type="text" placeholder="Door No." value={manual.doorNo} onChange={(e) => setManual({ ...manual, doorNo: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100 text-gray-900 placeholder-gray-400" required />
            <input type="text" placeholder="Street" value={manual.street} onChange={(e) => setManual({ ...manual, street: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100 text-gray-900 placeholder-gray-400" required />
            <div className="grid grid-cols-2 gap-3">
              <input type="text" placeholder="City" value={manual.city} onChange={(e) => setManual({ ...manual, city: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100 text-gray-900 placeholder-gray-400" required />
              <input type="text" placeholder="State" value={manual.state} onChange={(e) => setManual({ ...manual, state: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100 text-gray-900 placeholder-gray-400" required />
            </div>
            <input type="text" placeholder="Pincode" value={manual.pincode} onChange={(e) => setManual({ ...manual, pincode: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100 text-gray-900 placeholder-gray-400" required />
            <button type="submit" className="gradient-bg text-white py-3.5 rounded-xl font-semibold text-sm hover:opacity-90 active:scale-95 transition-all w-full mt-1 shadow-lg">Save & Continue</button>
          </form>

          {useCurrent && (
            <button onClick={() => navigate(`/order/${videoId}`)} className="gradient-bg text-white py-3.5 rounded-2xl font-semibold text-sm hover:opacity-90 active:scale-95 transition-all w-full shadow-lg">
              Confirm Location & Continue
            </button>
          )}
        </div>
      </div>
      <BottomNav />
      <FAB />
    </div>
  );
}
