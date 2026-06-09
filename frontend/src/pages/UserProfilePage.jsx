import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import AppBar from '../components/AppBar';
import BottomNav from '../components/BottomNav';
import PremiumBackground from '../components/PremiumBackground';

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
  const addresses = state.addresses || [];
  const recentRecipes = state.recentRecipes || [];

  return (
    <div className="c2c-root min-h-screen pb-32 overflow-x-hidden relative bg-[white]">
      <PremiumBackground />
      <AppBar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 relative z-10 animate-fade-slide-up font-display">
        
        {/* Profile dashboard header */}
        <div className="glass border border-white/60 rounded-3xl p-8 text-center mb-8 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 w-full h-[6px] gradient-bg" />
          
          <div className="w-20 h-20 mx-auto rounded-2xl gradient-bg flex items-center justify-center text-white text-3xl font-display font-black mb-5 shadow-md border border-white/20 relative overflow-hidden">
            <span>{user.name?.charAt(0)?.toUpperCase() || 'U'}</span>
            <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity" />
          </div>

          <h2 className="font-display font-black text-2xl text-[#1e2229]">{user.name}</h2>
          <p className="text-gray-400 text-sm mt-1 font-display font-medium">{user.email}</p>
          
          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-4 mt-8 max-w-sm mx-auto border-t border-gray-100 pt-6">
            {[
              { value: recentRecipes.length, label: 'Recipes' },
              { value: addresses.length, label: 'Addresses' },
              { value: state.orderConfirmed ? 1 : 0, label: 'Orders' },
            ].map((stat, i) => (
              <div key={i} className="text-center font-display">
                <span className="block text-2xl font-black text-[#ff6b35]">{stat.value}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-450">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Tab Menu and Content Panels */}
        <div className="flex flex-col md:flex-row gap-6">
          
          {/* Side Menu Tab switcher */}
          <div className="md:w-56 flex-shrink-0">
            <div className="glass border border-white/60 rounded-2xl p-2 flex flex-row md:flex-col gap-1 overflow-x-auto no-scrollbar shadow-sm">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button 
                    key={tab.id} 
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-xs font-bold font-display uppercase tracking-wider transition-all flex-shrink-0 md:w-full ${
                      isActive 
                        ? 'bg-white text-[#ff6b35] border border-gray-200 shadow-sm' 
                        : 'text-gray-400 hover:text-gray-700 border border-transparent'
                    }`}
                  >
                    <span className={`material-icon text-base ${isActive ? 'fill text-[#ff6b35]' : ''}`}>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content Area */}
          <div className="flex-1">
            
            {/* Profile Content */}
            {activeTab === 'profile' && (
              <div className="glass border border-white/60 rounded-3xl p-6 md:p-8 animate-fade-slide-up shadow-sm">
                <h3 className="font-display font-extrabold text-lg text-[#1e2229] mb-6 flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-[#ff6b35] rounded-full" />
                  <span>Personal Details</span>
                </h3>
                <div className="flex flex-col gap-3">
                  {[
                    { icon: 'person', label: 'Display Name', value: user.name },
                    { icon: 'mail', label: 'Email Address', value: user.email },
                    { icon: 'phone', label: 'Contact Number', value: user.contact || user.phone || 'No contact number added' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-4 px-4 py-3.5 bg-white/40 border border-gray-150 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                      <span className="material-icon text-lg text-[#ff6b35]">{item.icon}</span>
                      <div className="font-display">
                        <span className="block text-[9px] font-bold uppercase tracking-wider text-gray-400">{item.label}</span>
                        <span className="text-sm font-bold text-[#1e2229] mt-0.5 block">{item.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Delivery address lists */}
            {activeTab === 'addresses' && (
              <div className="glass border border-white/60 rounded-3xl p-6 md:p-8 animate-fade-slide-up shadow-sm">
                <h3 className="font-display font-extrabold text-lg text-[#1e2229] mb-6 flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-[#ff6b35] rounded-full" />
                  <span>Saved Addresses</span>
                </h3>
                {addresses.length === 0 ? (
                  <div className="bg-white/40 rounded-2xl p-12 text-center border border-dashed border-gray-200 shadow-sm">
                    <span className="material-icon text-3xl text-gray-300 block mb-2">location_off</span>
                    <p className="text-gray-400 text-xs font-medium">No saved addresses found.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {addresses.map((addr, i) => (
                      <div key={i} className="bg-white/40 border border-white/60 rounded-2xl px-5 py-4 flex items-start gap-4 shadow-sm">
                        <span className="material-icon text-lg text-[#ff6b35] mt-1">location_on</span>
                        <div className="font-display">
                          <p className="font-bold text-[#1e2229] text-sm">{addr.label}</p>
                          {addr.addressType === 'MANUAL' && (
                            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed font-medium">
                              {addr.doorNo}, {addr.street}, {addr.city}, {addr.state} - {addr.pincode}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Video Import History */}
            {activeTab === 'history' && (
              <div className="glass border border-white/60 rounded-3xl p-6 md:p-8 animate-fade-slide-up shadow-sm">
                <h3 className="font-display font-extrabold text-lg text-[#1e2229] mb-6 flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-[#ff6b35] rounded-full" />
                  <span>Recipe Pipeline History</span>
                </h3>
                {recentRecipes.length === 0 ? (
                  <div className="bg-white/40 rounded-2xl p-12 text-center border border-dashed border-gray-200 shadow-sm">
                    <span className="material-icon text-3xl text-gray-300 block mb-2">history</span>
                    <p className="text-gray-400 text-xs font-medium">No pipeline history available.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {recentRecipes.map((recipe, i) => (
                      <div key={i} className="bg-white/40 border border-white/60 rounded-2xl p-3 flex items-center gap-4 hover:border-[#ff6b35]/20 transition-all shadow-sm">
                        <img 
                          src={recipe.thumbnailUrl} 
                          alt={recipe.title} 
                          className="w-20 h-14 rounded-xl object-cover border border-gray-100 flex-shrink-0" 
                        />
                        <div className="flex-1 min-w-0 font-display">
                          <h4 className="font-bold text-sm text-[#1e2229] truncate">{recipe.title}</h4>
                          <p className="text-xs text-gray-400 mt-1 font-medium">{recipe.channelTitle || 'YouTube link'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Bookmarked/favorites recipes */}
            {activeTab === 'favorites' && (
              <div className="glass border border-white/60 rounded-3xl p-6 md:p-8 animate-fade-slide-up shadow-sm">
                <h3 className="font-display font-extrabold text-lg text-[#1e2229] mb-6 flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-[#ff6b35] rounded-full" />
                  <span>Favorite Saved Recipes</span>
                </h3>
                
                {state.savedRecipes && state.savedRecipes.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {state.savedRecipes.map((recipe, i) => (
                      <div 
                        key={i} 
                        className="bg-white/40 border border-white/60 rounded-2xl p-3 flex items-center gap-4 hover:border-[#ff6b35]/20 transition-all cursor-pointer shadow-sm"
                        onClick={() => navigate(`/review/${recipe.videoId || recipe.id}`)}
                      >
                        <img 
                          src={recipe.thumbnailUrl} 
                          alt={recipe.title} 
                          className="w-20 h-14 rounded-xl object-cover border border-gray-100 flex-shrink-0" 
                        />
                        <div className="flex-1 min-w-0 font-display">
                          <h4 className="font-bold text-sm text-[#1e2229] truncate">{recipe.title}</h4>
                          <p className="text-xs text-gray-400 mt-1 font-medium">Click to view details</p>
                        </div>
                        <span className="material-icon text-sm text-[#ff6b35] mr-2">arrow_forward</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white/40 rounded-2xl p-12 text-center border border-dashed border-gray-200 shadow-sm">
                    <span className="material-icon text-3xl text-[#ff6b35] block mb-2">favorite_border</span>
                    <p className="text-gray-400 text-xs font-bold font-display">No bookmark recipes saved yet.</p>
                    <p className="text-gray-450 text-[10px] mt-1 font-display">Save items by checking the bookmark icon on reviews.</p>
                  </div>
                )}
              </div>
            )}

          </div>

        </div>

        {/* Logout CTA */}
        <div className="mt-10 mb-8 flex justify-center">
          <button 
            onClick={() => { dispatch({ type: 'LOGOUT' }); localStorage.removeItem('token'); navigate('/'); }}
            className="px-8 py-3.5 rounded-xl border border-red-200 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-650 font-bold font-display text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm"
          >
            <span className="material-icon text-base">logout</span>
            <span>Logout Account</span>
          </button>
        </div>

      </div>

      <BottomNav />
    </div>
  );
}
