// ============================================
// Register Page
// ============================================

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { HiOutlineCurrencyDollar, HiOutlineMail, HiOutlineLockClosed, HiOutlineUser, HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi';
import AnimatedWrapper from '../components/AnimatedWrapper';
import Card from '../components/Card';
import FormInput from '../components/FormInput';

const Register = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', role: 'subrecipient', grantPreferences: [] });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handlePreferencesChange = (e) => {
    const value = e.target.value;
    setForm(prev => {
      const prefs = prev.grantPreferences.includes(value)
        ? prev.grantPreferences.filter(p => p !== value)
        : [...prev.grantPreferences, value];
      return { ...prev, grantPreferences: prefs };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      toast.error('Please fill in all fields');
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password, form.role, form.grantPreferences);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatedWrapper className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Hyper-Clean Minimal Background */}
      <div className="absolute inset-0 -z-50 bg-[#F9FAFB]"></div>

      <div className="w-full max-w-md relative z-10 py-10">

        {/* Logo & Header */}
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
            Create Account
          </motion.h1>
          <motion.p 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-sm font-medium text-gray-500 mt-2"
          >
            Join GrantFlow to manage your grants
          </motion.p>
        </div>

        {/* Form Card */}
        <Card delay={0.3} className="border-t-[6px] border-t-indigo-600 p-8 shadow-lg bg-white border border-slate-200">
          <form onSubmit={handleSubmit} className="space-y-5">
            
            <FormInput 
              label="Full Name"
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="John Doe"
              icon={HiOutlineUser}
              required
            />

            <FormInput 
              label="Email Address"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              icon={HiOutlineMail}
              required
            />

            <div className="relative mb-4">
              <label className="absolute -top-2 left-3 bg-white text-xs font-bold text-primary-600 px-1 z-10 transition-all">Select Role</label>
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="w-full px-4 py-3.5 rounded-xl border-2 border-white/60 bg-white/70 backdrop-blur-sm text-gray-800 text-sm focus:outline-none focus:border-primary-500 focus:bg-white transition-all font-medium appearance-none shadow-sm hover:shadow focus:shadow-md"
              >
                <option value="subrecipient">Subrecipient (External User)</option>
                <option value="admin">Admin / Finance</option>
              </select>
            </div>

            <div className="relative mb-4">
              <label className="text-sm font-bold text-gray-700 px-1 mb-2 block">Grant Areas of Interest</label>
              <div className="flex flex-wrap gap-2">
                {['Technology', 'Education', 'Healthcare', 'Infrastructure', 'Energy', 'Agriculture'].map(pref => (
                  <label key={pref} className={`px-4 py-2 rounded-full border text-sm font-medium cursor-pointer transition-all ${
                    form.grantPreferences.includes(pref) 
                      ? 'bg-primary-600 text-white border-primary-600 shadow-md scale-105' 
                      : 'bg-white/70 text-gray-600 border-gray-200 hover:border-primary-300'
                  }`}>
                    <input 
                      type="checkbox" 
                      value={pref} 
                      onChange={handlePreferencesChange} 
                      className="hidden" 
                    />
                    {pref}
                  </label>
                ))}
              </div>
            </div>

            <div className="relative">
              <FormInput 
                label="Password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Min 6 characters"
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

            <FormInput 
              label="Confirm Password"
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter password"
              icon={HiOutlineLockClosed}
              required
            />

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5 text-base flex items-center justify-center gap-2 shadow-primary-500/25 mt-4"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating Account...
                </>
              ) : 'Create Account'}
            </button>
          </form>

          <div className="mt-8 text-center border-t border-surface-200 pt-6">
            <p className="text-sm font-medium text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-600 hover:text-primary-800 font-bold transition-colors">
                Sign In
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </AnimatedWrapper>
  );
};

export default Register;

