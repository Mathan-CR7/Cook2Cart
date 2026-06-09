import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import AppBar from '../components/AppBar';
import BottomNav from '../components/BottomNav';
import PremiumBackground from '../components/PremiumBackground';
import LogoIcon from '../components/LogoIcon';
import { authService } from '../utils/api';
import { useApp } from '../context/AppContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { dispatch } = useApp();
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', contact: '', email: '', password: '' });
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
        await authService.register({
          name: `${form.firstName} ${form.lastName}`,
          firstName: form.firstName,
          lastName: form.lastName,
          contact: form.contact,
          email: form.email,
          password: form.password
        });
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
    <div className="c2c-root min-h-screen pb-24 overflow-x-hidden relative flex flex-col justify-between bg-[white]">
      <PremiumBackground />
      <AppBar />

      <div className="flex-1 flex items-center justify-center px-4 pt-32 pb-12 z-10">
        <motion.div 
          layout
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          className="w-full max-w-[430px] glass rounded-[28px] p-8 sm:p-10 border border-white/60 shadow-[0_12px_40px_rgba(255,107,53,0.06)]"
        >
          
          <div className="text-center mb-8">
            <motion.div 
              animate={{ scale: [1, 1.05, 1], rotate: [0, 3, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              className="w-16 h-16 mx-auto flex items-center justify-center mb-5"
            >
              <LogoIcon className="w-14 h-14" />
            </motion.div>
            <motion.h1 layoutId="authTitle" className="font-display font-black text-2xl md:text-3xl text-[#1e2229]">
              {isRegister ? 'Create Account' : 'Welcome Back'}
            </motion.h1>
            <motion.p layoutId="authSubtitle" className="text-gray-400 text-xs mt-1.5 font-display font-medium">
              {isRegister ? 'Sign up to start cooking' : 'Log in to continue to Cook2Cart'}
            </motion.p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mb-6">
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 rounded-xl border border-red-500/10 bg-red-500/5 text-[#ef4444] text-xs flex items-center gap-2 font-display"
                >
                  <span className="material-icon text-sm fill">error</span>
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence initial={false}>
              {isRegister && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="flex flex-col gap-4 overflow-hidden"
                >
                  <div className="flex gap-4">
                    <div className="flex-1 relative flex items-center bg-white rounded-xl border border-gray-250 focus-within:border-[#ff6b35] focus-within:shadow-[0_0_0_3px_rgba(255,107,53,0.1)] transition-all overflow-hidden">
                      <span className="material-icon text-gray-400 absolute left-4 text-lg">person</span>
                      <input
                        type="text"
                        placeholder="First Name"
                        value={form.firstName}
                        onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                        className="w-full bg-transparent pl-12 pr-4 py-3.5 text-sm text-[#1e2229] placeholder-gray-400 focus:outline-none"
                        required
                      />
                    </div>
                    <div className="flex-1 relative flex items-center bg-white rounded-xl border border-gray-250 focus-within:border-[#ff6b35] focus-within:shadow-[0_0_0_3px_rgba(255,107,53,0.1)] transition-all overflow-hidden">
                      <span className="material-icon text-gray-400 absolute left-4 text-lg">person</span>
                      <input
                        type="text"
                        placeholder="Last Name"
                        value={form.lastName}
                        onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                        className="w-full bg-transparent pl-12 pr-4 py-3.5 text-sm text-[#1e2229] placeholder-gray-400 focus:outline-none"
                        required
                      />
                    </div>
                  </div>
                  <div className="relative flex items-center bg-white rounded-xl border border-gray-250 focus-within:border-[#ff6b35] focus-within:shadow-[0_0_0_3px_rgba(255,107,53,0.1)] transition-all overflow-hidden">
                    <span className="material-icon text-gray-400 absolute left-4 text-lg">phone</span>
                    <input
                      type="tel"
                      placeholder="Contact Number"
                      value={form.contact}
                      onChange={(e) => setForm({ ...form, contact: e.target.value })}
                      className="w-full bg-transparent pl-12 pr-4 py-3.5 text-sm text-[#1e2229] placeholder-gray-400 focus:outline-none"
                      required
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative flex items-center bg-white rounded-xl border border-gray-250 focus-within:border-[#ff6b35] focus-within:shadow-[0_0_0_3px_rgba(255,107,53,0.1)] transition-all overflow-hidden">
              <span className="material-icon text-gray-400 absolute left-4 text-lg">mail</span>
              <input
                type="email"
                placeholder="Email Address"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-transparent pl-12 pr-4 py-3.5 text-sm text-[#1e2229] placeholder-gray-400 focus:outline-none"
                required
              />
            </div>

            <div className="relative flex items-center bg-white rounded-xl border border-gray-250 focus-within:border-[#ff6b35] focus-within:shadow-[0_0_0_3px_rgba(255,107,53,0.1)] transition-all overflow-hidden">
              <span className="material-icon text-gray-400 absolute left-4 text-lg">lock</span>
              <input
                type="password"
                placeholder="Password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full bg-transparent pl-12 pr-4 py-3.5 text-sm text-[#1e2229] placeholder-gray-400 focus:outline-none"
                required
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={loading}
              className="gradient-bg text-white py-3.5 rounded-xl font-bold font-display hover:scale-[1.01] active:scale-[0.99] transition-all w-full text-xs uppercase tracking-wider shadow-[0_4px_15px_rgba(255,107,53,0.2)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>{isRegister ? 'Creating Account...' : 'Logging in...'}</span>
                </>
              ) : (
                <span>{isRegister ? 'Create Account' : 'Log In'}</span>
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-[1px] bg-gray-200" />
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider font-display">Or continue with</span>
            <div className="flex-1 h-[1px] bg-gray-200" />
          </div>

          {/* Google Login */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="button"
            onClick={handleGoogleLogin}
            className="w-full py-3.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-55 font-bold font-display text-xs uppercase tracking-wider flex items-center justify-center gap-3 text-gray-650 hover:text-[#ff6b35] hover:border-[#ff6b35]/30 transition-all cursor-pointer"
          >
            <svg className="w-4.5 h-4.5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span>Google Account</span>
          </motion.button>

          {/* Switch Switcher Link */}
          <p className="text-center mt-8 text-xs text-gray-400 font-display">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button 
              className="text-[#ff6b35] font-black hover:underline bg-transparent ml-1 cursor-pointer" 
              onClick={() => { setIsRegister(!isRegister); setError(''); }}
            >
              {isRegister ? 'Log In' : 'Sign Up'}
            </button>
          </p>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
}

