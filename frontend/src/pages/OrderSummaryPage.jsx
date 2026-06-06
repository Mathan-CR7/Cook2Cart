import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import AppBar from '../components/AppBar';
import BottomNav from '../components/BottomNav';
import FAB from '../components/FAB';

export default function OrderSummaryPage() {
  const navigate = useNavigate();
  const { videoId } = useParams();
  const { state, dispatch } = useApp();
  const [confirmed, setConfirmed] = useState(false);

  const cart = state.cart;
  const address = state.selectedAddress;
  const total = cart.reduce((sum, item) => sum + (item.price || 0) * (item.qty || 1), 0);

  const handleConfirm = () => {
    dispatch({ type: 'CONFIRM_ORDER' });
    setConfirmed(true);
    setTimeout(() => navigate('/'), 2500);
  };

  if (confirmed) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center px-4 pb-16">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
          <p className="text-gray-500 mb-8">Your groceries are on the way. Estimated delivery in 30-45 minutes.</p>
          <button onClick={() => navigate('/')} className="gradient-bg text-white py-3.5 px-8 rounded-2xl font-semibold text-sm hover:opacity-90 active:scale-95 transition-all shadow-lg">Back to Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen pb-16">
      <AppBar />
      <div className="max-w-lg mx-auto px-4 sm:px-6 pt-24">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Order Summary</h1>
        <p className="text-gray-500 text-sm mb-6">Review your order before confirming</p>

        {address && (
          <div className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center gap-4 mb-6">
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
          Cart Items ({cart.length})
        </h3>
        <div className="flex flex-col gap-1 mb-6">
          {cart.map((item, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl px-5 py-3 flex items-center gap-3">
              <span className="flex-1 text-sm text-gray-900">{item.name}</span>
              <span className="text-xs text-gray-500">x{item.qty || 1}</span>
              <span className="text-sm font-bold text-orange-600 min-w-[60px] text-right">₹{(item.price || 0) * (item.qty || 1)}</span>
            </div>
          ))}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8">
          <div className="flex justify-between text-sm py-1.5 text-gray-600"><span>Subtotal</span><span>₹{total}</span></div>
          <div className="flex justify-between text-sm py-1.5 text-gray-600"><span>Delivery Fee</span><span className="text-green-600 font-semibold">FREE</span></div>
          <div className="flex justify-between font-bold text-lg py-2.5 mt-2 border-t border-gray-100 text-gray-900"><span>Total</span><span>₹{total}</span></div>
        </div>

        <button onClick={handleConfirm} className="gradient-bg text-white py-4 rounded-2xl font-bold text-sm hover:opacity-90 active:scale-95 transition-all w-full flex items-center justify-center gap-2 shadow-lg mb-12">
          Confirm Order
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
        </button>
      </div>
      <BottomNav />
      <FAB />
    </div>
  );
}
