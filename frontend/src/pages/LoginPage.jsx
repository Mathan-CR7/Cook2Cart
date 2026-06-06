import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppBar from '../components/AppBar';
import BottomNav from '../components/BottomNav';
import { authService } from '../utils/api';
import { useApp } from '../context/AppContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { dispatch } = useApp();
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const redirectTo = searchParams.get('redirect') || '/';

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) return;

    const name = searchParams.get('name') || '';
    const email = searchParams.get('email') || '';

    localStorage.setItem('token', token);
    dispatch({ type: 'SET_USER', payload: { name, email } });
    const savedRedirect = localStorage.getItem('oauthRedirect');
    localStorage.removeItem('oauthRedirect');
    navigate(savedRedirect || redirectTo, { replace: true });
  }, [dispatch, navigate, redirectTo, searchParams]);

  const handleGoogleLogin = () => {
    localStorage.setItem('oauthRedirect', redirectTo);
    window.location.href = authService.googleLoginUrl();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let res;
      if (isRegister) {
        await authService.register(form);
        res = await authService.login({ email: form.email, password: form.password });
      } else {
        res = await authService.login({ email: form.email, password: form.password });
      }

      const { token, name, email } = res.data;
      localStorage.setItem('token', token);
      dispatch({ type: 'SET_USER', payload: { name, email } });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const msg = err.response?.data || err.message || 'Something went wrong';
      setError(typeof msg === 'string' ? msg : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white min-h-screen pb-16">
      <AppBar />
      <div className="flex items-center justify-center px-4 pt-32 pb-12">
        <div className="w-full max-w-[420px] bg-white rounded-3xl shadow-xl p-8 sm:p-10 border border-gray-100">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-orange-100 to-red-100 rounded-2xl flex items-center justify-center mb-4">
              <span className="text-3xl">🍳</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{isRegister ? 'Create Account' : 'Welcome Back'}</h1>
            <p className="text-gray-500 text-sm mt-1">{isRegister ? 'Sign up to start cooking' : 'Log in to continue'}</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3 mb-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}
            {isRegister && (
              <div className="relative">
                <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <input type="text" placeholder="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full pl-11 pr-4 py-3.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all text-gray-900 placeholder-gray-400" required />
              </div>
            )}
            <div className="relative">
              <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full pl-11 pr-4 py-3.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all text-gray-900 placeholder-gray-400" required />
            </div>
            <div className="relative">
              <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full pl-11 pr-4 py-3.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all text-gray-900 placeholder-gray-400" required />
            </div>
            <button type="submit" disabled={loading} className="gradient-bg text-white py-3.5 rounded-xl font-semibold hover:opacity-90 active:scale-95 transition-all w-full text-sm disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {isRegister ? 'Creating Account...' : 'Logging in...'}
                </span>
              ) : (isRegister ? 'Create Account' : 'Log In')}
            </button>
          </form>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">or continue with</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full py-3 rounded-xl border-2 border-gray-200 font-medium text-sm flex items-center justify-center gap-3 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Google
          </button>

          <p className="text-center mt-6 text-sm text-gray-500">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button className="text-orange-600 font-semibold hover:underline bg-transparent" onClick={() => setIsRegister(!isRegister)}>
              {isRegister ? 'Log In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
