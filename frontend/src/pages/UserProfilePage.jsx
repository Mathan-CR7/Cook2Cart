import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import AppBar from '../components/AppBar';
import BottomNav from '../components/BottomNav';

const TABS = [
  { id: 'profile', label: 'Profile', icon: 'person' },
  { id: 'addresses', label: 'Addresses', icon: 'location_on' },
  { id: 'history', label: 'History', icon: 'history' },
  { id: 'favorites', label: 'Favorites', icon: 'favorite' },
];

export default function UserProfilePage() {
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const [activeTab, setActiveTab] = useState('profile');

  const user = state.user || { name: 'John Doe', email: 'john@example.com' };
  const addresses = state.addresses;
  const recentRecipes = state.recentRecipes;

  return (
    <div className="bg-white min-h-screen pb-16">
      <AppBar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        <div className="bg-white border border-gray-200 rounded-3xl shadow-lg p-8 text-center mb-8">
          <div className="w-20 h-20 mx-auto rounded-full gradient-bg flex items-center justify-center text-white text-3xl font-bold mb-4 shadow-lg">
            {user.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
          <p className="text-gray-500 text-sm">{user.email}</p>
          <div className="grid grid-cols-3 gap-6 mt-6 max-w-xs mx-auto">
            {[
              { value: recentRecipes.length, label: 'Recipes' },
              { value: addresses.length, label: 'Addresses' },
              { value: state.orderConfirmed ? 1 : 0, label: 'Orders' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <span className="block text-xl font-bold text-orange-500">{stat.value}</span>
                <span className="text-xs text-gray-500">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          <div className="md:w-48 flex-shrink-0">
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-row md:flex-col gap-0.5 p-1.5">
              {TABS.map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-orange-50 text-orange-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                  <span className={`material-icon !text-lg ${activeTab === tab.id ? 'fill text-orange-500' : ''}`}>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1">
            {activeTab === 'profile' && (
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <h3 className="font-semibold text-gray-900 mb-5">Profile Information</h3>
                <div className="flex flex-col gap-2">
                  {[
                    { icon: 'person', label: 'Name', value: user.name },
                    { icon: 'mail', label: 'Email', value: user.email },
                    { icon: 'phone', label: 'Phone', value: user.phone || 'Not added' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-4 px-4 py-3 bg-gray-50 rounded-xl">
                      <span className="material-icon !text-lg text-orange-500">{item.icon}</span>
                      <div>
                        <span className="block text-xs text-gray-500">{item.label}</span>
                        <span className="text-sm text-gray-900">{item.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'addresses' && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Saved Addresses</h3>
                {addresses.length === 0 ? (
                  <div className="bg-gray-50 rounded-2xl p-12 text-center">
                    <span className="text-3xl block mb-3">📍</span>
                    <p className="text-gray-500 text-sm">No saved addresses yet</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {addresses.map((addr, i) => (
                      <div key={i} className="bg-white border border-gray-200 rounded-2xl px-5 py-4 flex items-center gap-4">
                        <svg className="w-5 h-5 text-orange-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        <div>
                          <p className="font-medium text-sm text-gray-900">{addr.label}</p>
                          {addr.addressType === 'MANUAL' && <p className="text-xs text-gray-500 mt-0.5">{addr.doorNo}, {addr.street}, {addr.city}, {addr.state} - {addr.pincode}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Recipe History</h3>
                {recentRecipes.length === 0 ? (
                  <div className="bg-gray-50 rounded-2xl p-12 text-center">
                    <span className="text-3xl block mb-3">🕐</span>
                    <p className="text-gray-500 text-sm">No recipes processed yet</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {recentRecipes.map((recipe, i) => (
                      <div key={i} className="bg-white border border-gray-200 rounded-2xl p-3 flex items-center gap-4">
                        <img src={recipe.thumbnailUrl} alt={recipe.title} className="w-20 h-14 rounded-xl object-cover flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm text-gray-900 truncate">{recipe.title}</h4>
                          <p className="text-xs text-gray-500">{recipe.channelTitle}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'favorites' && (
              <div className="bg-gray-50 rounded-2xl p-12 text-center">
                <span className="text-3xl block mb-3">❤️</span>
                <p className="text-gray-500 text-sm">No favorite recipes yet</p>
                <p className="text-xs text-gray-400 mt-1">Save recipes by clicking the bookmark icon</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 mb-8 flex justify-center">
          <button onClick={() => { dispatch({ type: 'LOGOUT' }); localStorage.removeItem('token'); navigate('/'); }}
            className="px-8 py-3 rounded-xl border-2 border-red-200 text-red-500 font-medium text-sm hover:bg-red-50 transition-all flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Logout
          </button>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
