import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import AppBar from '../components/AppBar';
import BottomNav from '../components/BottomNav';
import FAB from '../components/FAB';
import { addressService, getApiErrorMessage } from '../utils/api';

export default function LocationSelectionPage() {
  const navigate = useNavigate();
  const { videoId } = useParams();
  const nextPath = videoId === 'profile' ? '/profile' : `/order/${videoId}`;
  const { state, dispatch } = useApp();
  const [useCurrent, setUseCurrent] = useState(false);
  const [manual, setManual] = useState({ doorNo: '', street: '', city: '', state: '', pincode: '' });
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!state.isAuthenticated) {
      navigate(`/login?redirect=/location/${videoId}`, { replace: true });
      return;
    }

    setLoadingAddresses(true);
    setError('');

    addressService.getAddresses()
      .then((res) => {
        const addresses = Array.isArray(res.data) ? res.data : [];
        setSavedAddresses(addresses);
        dispatch({ type: 'SET_ADDRESSES', payload: addresses });
      })
      .catch((err) => {
        setError(getApiErrorMessage(err, 'Could not load saved addresses.'));
      })
      .finally(() => setLoadingAddresses(false));
  }, [dispatch, navigate, state.isAuthenticated, videoId]);

  const formatAddress = (address) => {
    if (address.addressType === 'CURRENT_LOCATION') {
      return `Current Location (${Number(address.latitude).toFixed(4)}, ${Number(address.longitude).toFixed(4)})`;
    }

    return [address.doorNo, address.street, address.city, address.state, address.pincode]
      .filter(Boolean)
      .join(', ');
  };

  const selectSavedAddress = (address) => {
    setUseCurrent(false);
    setSelectedAddressId(address.id);
    dispatch({ type: 'SET_SELECTED_ADDRESS', payload: { ...address, label: formatAddress(address) } });
  };

  const refreshAddresses = async () => {
    const res = await addressService.getAddresses();
    const addresses = Array.isArray(res.data) ? res.data : [];
    setSavedAddresses(addresses);
    dispatch({ type: 'SET_ADDRESSES', payload: addresses });
  };

  const handleCurrent = () => {
    if (!navigator.geolocation) {
      setError('Current location is not supported in this browser.');
      return;
    }

    setSaving(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        try {
          await addressService.addLocation(location);
          const address = {
            ...location,
            addressType: 'CURRENT_LOCATION',
            label: `Current Location (${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)})`,
          };

          setUseCurrent(true);
          setSelectedAddressId(null);
          dispatch({ type: 'SET_SELECTED_ADDRESS', payload: address });
          await refreshAddresses();
        } catch (err) {
          setError(getApiErrorMessage(err, 'Could not save current location.'));
        } finally {
          setSaving(false);
        }
      },
      () => {
        setSaving(false);
        setError('Location permission was blocked. Allow location access and try again.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      await addressService.addManual(manual);
      const address = { ...manual, addressType: 'MANUAL', label: `${manual.doorNo}, ${manual.street}` };
      dispatch({ type: 'SET_SELECTED_ADDRESS', payload: address });
      await refreshAddresses();
      navigate(nextPath);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not save address.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white min-h-screen pb-16">
      <AppBar />
      <div className="max-w-lg mx-auto px-4 sm:px-6 pt-24">
        <div className="text-center mb-10">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-orange-100 to-red-100 rounded-2xl flex items-center justify-center mb-4">
            <span className="material-icon !text-3xl text-orange-500">location_on</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Select Delivery Location</h1>
          <p className="text-gray-500 text-sm mt-1">Choose where to deliver your groceries</p>
        </div>

        <div className="flex flex-col gap-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">
              {error}
            </div>
          )}

          <button
            disabled={saving}
            onClick={handleCurrent}
            className={`bg-white border-2 rounded-2xl p-5 flex items-center gap-4 text-left transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
              useCurrent ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-orange-200'
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
              <span className="material-icon !text-xl text-orange-500">my_location</span>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Use Current Location</h3>
              <p className="text-xs text-gray-500 mt-0.5">{saving ? 'Saving location...' : 'Auto-detect your location for delivery'}</p>
            </div>
            {useCurrent && <span className="material-icon fill !text-xl text-orange-500">check_circle</span>}
          </button>

          {(loadingAddresses || savedAddresses.length > 0) && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Saved Addresses</h3>
              {loadingAddresses ? (
                <p className="text-sm text-gray-500">Loading saved addresses...</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {savedAddresses.map((address) => (
                    <button
                      key={address.id}
                      type="button"
                      onClick={() => selectSavedAddress(address)}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                        selectedAddressId === address.id
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-gray-200 text-gray-600 hover:border-orange-200'
                      }`}
                    >
                      <span className="block text-sm font-medium">{formatAddress(address)}</span>
                      <span className="block text-xs text-gray-400 mt-1">{address.addressType === 'CURRENT_LOCATION' ? 'Current Location' : 'Manual Address'}</span>
                    </button>
                  ))}
                </div>
              )}
              {selectedAddressId && (
                <button onClick={() => navigate(nextPath)} className="gradient-bg text-white py-3.5 rounded-xl font-semibold text-sm hover:opacity-90 active:scale-95 transition-all w-full mt-4 shadow-lg">
                  Continue With Selected Address
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">OR</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
              <span className="material-icon !text-xl text-orange-500">edit_location</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Add Address Manually</h3>
              <p className="text-xs text-gray-500 mt-0.5">Enter your delivery address</p>
            </div>
          </div>

          <form onSubmit={handleManualSubmit} className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col gap-3">
            <input type="text" placeholder="Door No." value={manual.doorNo} onChange={(e) => setManual({ ...manual, doorNo: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100 text-gray-900 placeholder-gray-400" required />
            <input type="text" placeholder="Street" value={manual.street} onChange={(e) => setManual({ ...manual, street: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100 text-gray-900 placeholder-gray-400" required />
            <div className="grid grid-cols-2 gap-3">
              <input type="text" placeholder="City" value={manual.city} onChange={(e) => setManual({ ...manual, city: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100 text-gray-900 placeholder-gray-400" required />
              <input type="text" placeholder="State" value={manual.state} onChange={(e) => setManual({ ...manual, state: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100 text-gray-900 placeholder-gray-400" required />
            </div>
            <input type="text" placeholder="Pincode" value={manual.pincode} onChange={(e) => setManual({ ...manual, pincode: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100 text-gray-900 placeholder-gray-400" required />
            <button type="submit" disabled={saving} className="gradient-bg text-white py-3.5 rounded-xl font-semibold text-sm hover:opacity-90 active:scale-95 transition-all w-full mt-1 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed">
              {saving ? 'Saving...' : 'Save & Continue'}
            </button>
          </form>

          {useCurrent && (
            <button onClick={() => navigate(nextPath)} className="gradient-bg text-white py-3.5 rounded-2xl font-semibold text-sm hover:opacity-90 active:scale-95 transition-all w-full shadow-lg">
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
