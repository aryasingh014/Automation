import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, Activity, Eye, EyeOff, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginScreen() {
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const body = isLogin ? { email, password } : { email, password, name };
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const data = await res.json();
      
      if (res.ok) {
        if (data.token) {
          toast.success('Login successful!');
          login(data.token, data);
        } else if (data.status === 'pending') {
          toast.success(data.message || 'Registration successful! Awaiting approval.');
          setIsLogin(true);
        }
      } else if (res.status === 403) {
        if (data.status === 'pending') {
          toast.warning(data.message || 'Your account is pending approval.');
        } else if (data.status === 'rejected') {
          toast.error(data.message || 'Your account was rejected.');
        } else if (data.status === 'inactive') {
          toast.error(data.message || 'Your account has been deactivated.');
        } else {
          toast.error(data.message || 'Authentication failed');
        }
      } else {
        toast.error(data.message || 'Authentication failed');
      }
    } catch (error: any) {
      toast.error('Network error. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-bg-main text-text-main">
      <div className="w-full max-w-md p-8 bg-bg-surface border border-border-main rounded-2xl shadow-2xl relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500"></div>
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl"></div>
        
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-white text-black flex items-center justify-center rounded border border-white">
            <Activity size={18} />
          </div>
          <span className="font-bold tracking-tight text-xl">OBSERVABILITY.OS</span>
        </div>

        <h2 className="text-2xl font-bold mb-2">
          {isLogin ? 'Welcome back' : 'Create an account'}
        </h2>
        <p className="text-text-secondary text-sm mb-8">
          {isLogin 
            ? 'Enter your credentials to access the dashboard' 
            : 'Sign up to monitor and analyze your infrastructure'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-text-secondary uppercase tracking-wider">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon size={14} className="text-text-muted" />
                </div>
                <input 
                  type="text" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required={!isLogin}
                  className="w-full bg-bg-main border border-border-main rounded-lg py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors placeholder:text-text-muted"
                  placeholder="Jane Doe"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-text-secondary uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail size={14} className="text-text-muted" />
              </div>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-bg-main border border-border-main rounded-lg py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors placeholder:text-text-muted"
                placeholder="admin@observability.os"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono text-text-secondary uppercase tracking-wider">Password</label>
              {isLogin && <a href="#" className="text-xs text-blue-500 hover:underline">Forgot password?</a>}
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={14} className="text-text-muted" />
              </div>
              <input 
                type={showPassword ? 'text' : 'password'} 
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-bg-main border border-border-main rounded-lg py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors placeholder:text-text-muted"
                placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-text-main transition-colors"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-white text-black font-semibold rounded-lg py-2.5 mt-4 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Authenticating...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-text-secondary">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-text-main hover:underline focus:outline-none"
          >
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </div>
      </div>
    </div>
  );
}


