import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, ShieldCheck, ArrowRight } from 'lucide-react';
import { Logo } from '../../components/common/Logo';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      showToast('Validation Error', 'Please enter your email address', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await login(email, password);
      if (res.success) {
        showToast('Welcome back', 'Signed in successfully');
        navigate('/dashboard');
      } else {
        showToast('Sign In Failed', res.message || 'Invalid email or credentials', 'error');
      }
    } catch {
      showToast('Sign In Failed', 'Unable to connect to server. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-sm border border-brand-border overflow-hidden grid grid-cols-1 lg:grid-cols-2">
        {/* Left Side: Brand Overview */}
        <div className="hidden lg:flex flex-col justify-between p-10 bg-[#14532D] text-white">
          <div>
            <div className="mb-8">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white p-1 shadow-sm flex items-center justify-center shrink-0">
                  <img src="/medisync-logo.png" alt="MediSync Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <span className="text-2xl font-bold tracking-tight text-white flex items-center">
                    Medi<span className="text-[#34D399]">Sync</span>
                  </span>
                </div>
              </div>
              <p className="text-xs text-emerald-100/90 mt-2 font-medium">
                Smarter Pharmacy. Healthier Tomorrow.
              </p>
            </div>

            <div className="mt-8 space-y-4">
              <h2 className="text-lg font-bold text-white">
                Professional Pharmacy Management System
              </h2>
              <p className="text-xs text-emerald-100/90 leading-relaxed">
                Unified inventory management, prescription dispensing, automated FEFO batching, POS billing, and real operational decision support for pharmacists.
              </p>

              <div className="pt-2 space-y-2 text-xs text-emerald-50">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Hospital-Attached, Retail, and Hybrid workflows</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Strict First-Expiry, First-Out (FEFO) deduction</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Zero fake data rule with full tenant isolation</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/15 flex items-center justify-between text-xs text-emerald-200/80">
            <span>Operational Decision Support</span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Secure Authentication
            </span>
          </div>
        </div>

        {/* Right Side: Simple Sign In Form */}
        <div className="p-8 sm:p-10 flex flex-col justify-between">
          <div>
            <div className="lg:hidden mb-6">
              <Logo size="md" showTagline={true} />
            </div>

            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Sign In</h1>
              <p className="text-xs text-brand-muted mt-1">
                Enter your credentials to access your pharmacy workspace.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="pharmacist@mypharmacy.com"
                    className="w-full bg-[#F8FAF9] focus:bg-white text-sm pl-10 pr-4 py-2.5 rounded-lg border border-brand-border focus:border-pharmagreen-600 focus:ring-1 focus:ring-pharmagreen-600 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#F8FAF9] focus:bg-white text-sm pl-10 pr-10 py-2.5 rounded-lg border border-brand-border focus:border-pharmagreen-600 focus:ring-1 focus:ring-pharmagreen-600 focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-gray-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-gray-300 text-pharmagreen-600 focus:ring-pharmagreen-600 w-4 h-4"
                  />
                  <span>Remember me</span>
                </label>
                <Link
                  to="/forgot-password"
                  className="font-semibold text-pharmagreen-700 hover:text-pharmagreen-800"
                >
                  Forgot password?
                </Link>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={loading}
                  className="w-full font-semibold shadow-xs"
                >
                  Sign In
                </Button>
              </div>
            </form>

            <div className="mt-6 pt-5 border-t border-brand-border text-center text-xs text-gray-600">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-bold text-pharmagreen-700 hover:text-pharmagreen-800 ml-1"
              >
                Create pharmacy account
              </Link>
            </div>
          </div>

          {/* Quick Demo Fill Buttons for Testing All 3 Pharmacy Types */}
          <div className="mt-6 pt-3 border-t border-brand-border/60">
            <div className="text-[11px] font-semibold text-gray-500 mb-1.5">Test Account Quick-Fill:</div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickFill('hospital@medisync.ai')}
                className="py-1 px-2 rounded bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-[11px] font-medium truncate transition-colors text-center"
              >
                🏥 Hospital
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('retail@medisync.ai')}
                className="py-1 px-2 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-medium truncate transition-colors text-center"
              >
                🏪 Retail
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('hybrid@medisync.ai')}
                className="py-1 px-2 rounded bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-[11px] font-medium truncate transition-colors text-center"
              >
                🔄 Hybrid
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
