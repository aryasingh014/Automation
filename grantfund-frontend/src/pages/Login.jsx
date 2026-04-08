// ============================================
// Login Page
// ============================================

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { HiOutlineCurrencyDollar, HiOutlineMail, HiOutlineLockClosed, HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi';
import AnimatedWrapper from '../components/AnimatedWrapper';
import Card from '../components/Card';
import FormInput from '../components/FormInput';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatedWrapper className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Premium Vibrant Mesh Background */}
      <div className="mesh-bg">
        <div className="mesh-shape shape-1"></div>
        <div className="mesh-shape shape-2"></div>
        <div className="mesh-shape shape-3 opacity-50"></div>
      </div>

      <div className="w-full max-w-md relative z-10">

        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="mb-5 flex justify-center w-full"
          >
            <img src="/favicon.jpeg" alt="Infosoft Inc." className="h-16 object-contain" />
          </motion.div>
          <motion.h1 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-2xl font-bold text-gray-900"
          >
            Welcome Back
          </motion.h1>
          <motion.p 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-sm font-medium text-gray-500 mt-2"
          >
            Sign in to continue to GrantFlow
          </motion.p>
        </div>

        {/* Form Card */}
        <Card delay={0.3} className="border-t-[6px] border-t-primary-500 p-8 shadow-[0_30px_60px_rgba(0,0,0,0.1)] bg-white/80 backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <FormInput 
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              icon={HiOutlineMail}
              required
            />

            <div className="relative">
              <FormInput 
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                icon={HiOutlineLockClosed}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-[54%] -translate-y-[50%] p-1 text-gray-400 hover:text-primary-600 transition-colors bg-white z-10"
              >
                {showPassword ? <HiOutlineEyeOff className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
              </button>
            </div>

            <div className="flex items-center justify-between mt-[-8px]">
              <div className="flex items-center">
                <input type="checkbox" id="remember" className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500" />
                <label htmlFor="remember" className="ml-2 block text-sm text-gray-700">Remember me</label>
              </div>
              <a href="#" className="text-sm font-semibold text-primary-600 hover:text-primary-700">Forgot password?</a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5 text-base flex items-center justify-center gap-2 shadow-primary-500/25 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </>
              ) : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 text-center border-t border-surface-200 pt-6">
            <p className="text-sm font-medium text-gray-600">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary-600 hover:text-primary-800 font-bold transition-colors">
                Create Account
              </Link>
            </p>
          </div>

          {/* Demo credentials */}
          {/* <div className="mt-8 p-4 bg-white/40 backdrop-blur-md rounded-lg border border-white/60">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span> Demo Credentials
            </p>
            <div className="space-y-2 text-xs text-gray-600 font-medium">
              <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-surface-200">
                <span className="text-primary-600 font-bold">Admin:</span>
                <span className="text-gray-500">admin@grantfund.com <span className="text-gray-300 px-1">|</span> admin123</span>
              </div>
              <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-surface-200">
                <span className="text-teal-600 font-bold">User:</span>
                <span className="text-gray-500">sarah@university.edu <span className="text-gray-300 px-1">|</span> user123</span>
              </div>
            </div>
          </div> */}
        </Card>
      </div>
    </AnimatedWrapper>
  );
};

export default Login;

