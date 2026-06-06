import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AppBar from '../components/AppBar';
import BottomNav from '../components/BottomNav';
import { videoService } from '../utils/api';
import { useApp } from '../context/AppContext';

export default function LandingPage() {
  const navigate = useNavigate();
  const { state } = useApp();
  const [url, setUrl] = useState('');
  const [processing, setProcessing] = useState(false);
  const [downloadedVideo, setDownloadedVideo] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!url.trim()) return;

    const match = url.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/);
    const videoId = match?.[1];
    if (!videoId) {
      setError('Invalid YouTube URL');
      return;
    }

    setProcessing(true);
    setDownloadedVideo(null);

    try {
      await videoService.process(url);
      setDownloadedVideo({
        videoId,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        url,
      });
    } catch {
      setError('Failed to process video. Make sure the backend is running.');
    } finally {
      setProcessing(false);
    }
  };

  const handleExtract = () => {
    if (!downloadedVideo) return;
    if (!state.isAuthenticated) {
      navigate(`/login?redirect=/process/${downloadedVideo.videoId}`);
    } else {
      navigate(`/process/${downloadedVideo.videoId}`, {
        state: {
          videoId: downloadedVideo.videoId,
          title: 'YouTube Recipe',
          channelTitle: 'YouTube',
          thumbnailUrl: downloadedVideo.thumbnailUrl,
        },
      });
    }
  };

  return (
    <div className="bg-white min-h-screen pb-16">
      <AppBar />

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-red-50" />
        <div className="absolute top-20 right-0 w-96 h-96 bg-gradient-to-br from-orange-200/30 to-red-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-br from-red-200/30 to-pink-200/30 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-3xl flex items-center justify-center text-white shadow-2xl transform hover:rotate-6 transition-transform">
              <span className="material-icon fill !text-4xl !text-white">restaurant</span>
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              <span className="gradient-text">Turn Any Cooking Video<br />Into a Shopping Cart</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-12">
              Paste any YouTube recipe URL. Our AI extracts ingredients, detects quantities, and creates a grocery shopping cart automatically.
            </p>
            <div className="inline-flex items-center gap-2 bg-white rounded-full px-6 py-3 shadow-lg mb-12">
              <span className="text-3xl font-bold gradient-text">∞</span>
              <span className="text-gray-600">Recipes Supported</span>
            </div>

            {/* URL Input */}
            <div className="max-w-2xl mx-auto mb-12">
              <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => { setUrl(e.target.value); setError(''); setDownloadedVideo(null); }}
                    className="flex-1 px-5 py-4 border-2 border-gray-200 rounded-2xl text-lg focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all text-gray-900 placeholder-gray-400"
                    placeholder="Paste YouTube recipe URL..."
                    disabled={processing}
                  />
                  <button
                    type="submit"
                    disabled={processing}
                    className="gradient-bg text-white px-8 py-4 rounded-2xl font-bold text-lg hover:scale-105 transition-transform shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="flex items-center gap-2 justify-center">
                      {processing ? (
                        <>
                          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Downloading...
                        </>
                      ) : (
                        <>
                          <span className="material-icon !text-white !text-xl fill">auto_awesome</span>
                          Import Recipe
                        </>
                      )}
                    </span>
                  </button>
                </div>
                {error && (
                  <p className="text-center text-red-500 text-sm mt-3">{error}</p>
                )}
                {!error && !downloadedVideo && !processing && (
                  <p className="text-center text-gray-400 text-sm mt-3">
                    Works with any YouTube recipe video
                  </p>
                )}
              </form>

              {/* Downloaded Video */}
              {downloadedVideo && (
                <div className="mt-6 bg-white rounded-2xl shadow-xl p-4 sm:p-6 border border-gray-100">
                  <div className="flex items-center gap-4">
                    <img
                      src={downloadedVideo.thumbnailUrl}
                      alt="Video thumbnail"
                      className="w-28 h-20 rounded-xl object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-green-600 text-sm font-medium">Downloaded</span>
                      </div>
                      <p className="text-gray-900 font-semibold text-sm truncate">
                        YouTube Recipe
                      </p>
                      <p className="text-gray-400 text-xs mt-0.5 truncate">
                        {downloadedVideo.url}
                      </p>
                    </div>
                    <button
                      onClick={handleExtract}
                      className="gradient-bg text-white px-6 py-3 rounded-xl font-bold text-sm hover:scale-105 transition-transform shadow-lg hover:shadow-xl flex-shrink-0"
                    >
                      <span className="flex items-center gap-2">
                        <span className="material-icon !text-white !text-base fill">auto_awesome</span>
                        Extract
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* App Store Buttons */}
            <div className="flex flex-wrap gap-4 justify-center">
              <button className="inline-flex items-center gap-3 bg-gray-900 text-white hover:bg-gray-800 px-6 py-3 rounded-xl transition shadow-lg">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                <div className="text-left">
                  <div className="text-xs text-gray-400">Download on the</div>
                  <div className="text-sm font-semibold">App Store</div>
                </div>
              </button>
              <button className="inline-flex items-center gap-3 bg-gray-900 text-white hover:bg-gray-800 px-6 py-3 rounded-xl transition shadow-lg">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
                </svg>
                <div className="text-left">
                  <div className="text-xs text-gray-400">Get it on</div>
                  <div className="text-sm font-semibold">Google Play</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              <span className="material-icon !text-sm fill">auto_awesome</span>
              WHY COOK2CART
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">AI-Powered Recipe to Cart</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">The smartest way to turn cooking videos into grocery lists</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: 'smartphone', title: 'Works with YouTube', desc: 'Paste any YouTube recipe URL and let AI do the rest' },
              { icon: 'psychology', title: 'AI Ingredient Detection', desc: 'Automatically detects ingredients and exact quantities' },
              { icon: 'shopping_cart_checkout', title: 'Smart Cart', desc: 'Budget mode, health filters, and auto-generated shopping lists' },
              { icon: 'location_on', title: 'Deliver to Door', desc: 'Select your location and get everything delivered' },
            ].map((feature, i) => (
              <div key={i} className="group">
                <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-red-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <span className="material-icon !text-2xl text-orange-500">{feature.icon}</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-500 text-sm">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              HOW IT WORKS
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">From Video to Cart in 3 Steps</h2>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-4">
            {[
              { num: '01', icon: 'content_paste', title: 'Paste URL', desc: 'Copy any YouTube recipe URL and paste it here' },
              { num: '02', icon: 'auto_awesome', title: 'AI Processing', desc: 'Our AI extracts ingredients, quantities, and more' },
              { num: '03', icon: 'shopping_bag', title: 'Shop & Cook', desc: 'Review cart, adjust items, and order groceries' },
            ].map((step, i) => (
              <div key={i} className="flex-1 max-w-sm">
                {i > 0 && (
                  <div className="hidden md:flex items-center justify-center mb-4">
                    <div className="w-10 h-10 gradient-bg rounded-full shadow-lg flex items-center justify-center -mb-12 relative z-10">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                )}
                <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1">
                  <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-red-100 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                    <span className="material-icon !text-3xl text-orange-500">{step.icon}</span>
                  </div>
                  <div className="text-sm font-bold text-orange-500 mb-2 text-center">STEP {step.num}</div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3 text-center">{step.title}</h3>
                  <p className="text-gray-500 text-center text-sm">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">What Our Users Say</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: 'Priya S.', role: 'Home Cook', text: 'This is genius! No more manually writing out ingredient lists from YouTube videos. Just paste and go!', stars: 5 },
              { name: 'Rahul M.', role: 'Fitness Enthusiast', text: 'The budget mode is a game changer. I can plan my meals and know exactly what to buy under ₹500.', stars: 5 },
              { name: 'Anita K.', role: 'Busy Parent', text: 'From watching a recipe to having groceries delivered in under 10 minutes. This app saves me hours every week!', stars: 5 },
            ].map((testimonial, i) => (
              <div key={i} className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all">
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.stars)].map((_, s) => (
                    <svg key={s} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-600 mb-6 italic">&ldquo;{testimonial.text}&rdquo;</p>
                <div>
                  <p className="font-bold text-gray-900">{testimonial.name}</p>
                  <p className="text-sm text-gray-500">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-4">
            {[
              { q: 'How does the AI ingredient detection work?', a: 'When you paste a YouTube URL, our AI analyzes the video title, description, and audio to extract ingredients and their quantities. It uses advanced NLP to understand recipe content.' },
              { q: 'Can I edit detected ingredients?', a: 'Yes! You can edit any ingredient name, adjust quantities, remove items, or add new ingredients manually before generating your cart.' },
              { q: 'What is Budget Mode?', a: 'Budget Mode lets you set a spending limit (₹500, ₹1000, etc.) and we optimize your cart to stay within that budget while keeping recipe essentials.' },
              { q: 'How does delivery work?', a: 'After generating your cart, you can select your delivery location or enter a manual address. Your order is then ready for checkout with local grocery partners.' },
            ].map((faq, i) => (
              <details key={i} className="group bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg hover:border-orange-200 transition-all">
                <summary className="w-full px-8 py-5 flex items-center justify-between text-left cursor-pointer list-none">
                  <span className="text-lg font-bold text-gray-900 pr-4">{faq.q}</span>
                  <svg className="w-5 h-5 text-gray-400 flex-shrink-0 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-8 pb-5 pt-2 border-t border-gray-100">
                  <p className="text-gray-600 leading-relaxed">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 gradient-bg">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Ready to Start Cooking?</h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">Turn any cooking video into a shopping cart in seconds</p>
          <div className="flex flex-wrap gap-4 justify-center mb-8">
            <button className="inline-flex items-center gap-3 bg-white text-gray-900 hover:bg-gray-100 px-6 py-3 rounded-xl transition shadow-lg">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              <div className="text-left">
                <div className="text-xs text-gray-500">Download on the</div>
                <div className="text-sm font-semibold">App Store</div>
              </div>
            </button>
            <button className="inline-flex items-center gap-3 bg-white text-gray-900 hover:bg-gray-100 px-6 py-3 rounded-xl transition shadow-lg">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
              </svg>
              <div className="text-left">
                <div className="text-xs text-gray-500">Get it on</div>
                <div className="text-sm font-semibold">Google Play</div>
              </div>
            </button>
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            <span className="px-4 py-2 bg-white/20 backdrop-blur rounded-full text-white text-sm font-medium">Free to Start</span>
            <span className="px-4 py-2 bg-white/20 backdrop-blur rounded-full text-white text-sm font-medium">AI-Powered</span>
            <span className="px-4 py-2 bg-white/20 backdrop-blur rounded-full text-white text-sm font-medium">No Account Needed</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">C</div>
                <span className="font-bold text-xl text-white">Cook2Cart</span>
              </div>
              <p className="text-sm">Turn any cooking video into a shopping cart with AI.</p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/search" className="hover:text-white transition">Search Recipes</Link></li>
                <li><Link to="/" className="hover:text-white transition">Features</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><span className="hover:text-white transition cursor-pointer">FAQ</span></li>
                <li><span className="hover:text-white transition cursor-pointer">Contact</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><span className="hover:text-white transition cursor-pointer">Privacy Policy</span></li>
                <li><span className="hover:text-white transition cursor-pointer">Terms of Service</span></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm">&copy; 2026 Cook2Cart. All rights reserved.</p>
            <div className="flex gap-4">
              {['X', 'FB', 'IG', 'YT'].map((s, i) => (
                <span key={i} className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs text-gray-400 hover:bg-gray-700 hover:text-white transition cursor-pointer">{s}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>

      <BottomNav />
    </div>
  );
}
