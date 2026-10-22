import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Logo } from '../components/common/Logo';
import { Button } from '../components/common/Button';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('pharmacist@medisync.ai');
  const [password, setPassword] = useState('pharma123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await login(email, password);
    setTimeout(() => {
      setIsLoading(false);
      navigate('/dashboard');
    }, 400);
  };

  const handleQuickLogin = async (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword('pharma123');
    setIsLoading(true);
    await login(roleEmail, 'pharma123');
    setTimeout(() => {
      setIsLoading(false);
      navigate('/dashboard');
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl border border-brand-border overflow-hidden grid grid-cols-1 lg:grid-cols-2">
        {/* Left Form Section */}
        <div className="p-8 sm:p-10 flex flex-col justify-between">
          <div>
            {/* Logo */}
            <div className="mb-8">
              <Logo size="lg" showTagline={true} />
            </div>

            {/* Title */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
              <p className="text-sm text-brand-muted mt-1">
                Enter your credentials to access your pharmacy portal.
              </p>
            </div>

            {/* Login Form */}
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
                    placeholder="pharmacist@medisync.ai"
                    className="w-full bg-[#F8FAF9] focus:bg-white text-sm pl-10 pr-4 py-2.5 rounded-lg border border-brand-border focus:border-pharmagreen-500 focus:ring-1 focus:ring-pharmagreen-500 focus:outline-none transition-all"
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
                    className="w-full bg-[#F8FAF9] focus:bg-white text-sm pl-10 pr-10 py-2.5 rounded-lg border border-brand-border focus:border-pharmagreen-500 focus:ring-1 focus:ring-pharmagreen-500 focus:outline-none transition-all"
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
                    className="rounded border-gray-300 text-pharmagreen-600 focus:ring-pharmagreen-500 w-4 h-4"
                  />
                  <span>Remember me</span>
                </label>
                <a
                  href="#forgot"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Password reset link has been dispatched to your registered email.');
                  }}
                  className="font-semibold text-pharmagreen-700 hover:text-pharmagreen-800"
                >
                  Forgot Password?
                </a>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={isLoading}
                  className="w-full font-semibold shadow-md"
                >
                  Sign In to Pharmacy
                </Button>
              </div>
            </form>

            {/* Quick Demo Login Pill */}
            <div className="mt-6 pt-5 border-t border-brand-border">
              <span className="text-xs text-brand-muted block mb-2 font-medium">
                Quick Demo Sign-In:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('pharmacist@medisync.ai')}
                  className="text-xs px-2.5 py-1.5 rounded-md bg-pharmagreen-50 border border-pharmagreen-200 text-pharmagreen-800 font-medium hover:bg-pharmagreen-100 transition-colors"
                >
                  👨‍⚕️ Chief Pharmacist
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin@apollocarepharma.com')}
                  className="text-xs px-2.5 py-1.5 rounded-md bg-gray-100 border border-gray-200 text-gray-800 font-medium hover:bg-gray-200 transition-colors"
                >
                  🏪 Pharmacy Owner
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-brand-muted flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-pharmagreen-600" />
            <span>256-bit Encrypted • HIPAA & CDSCO Compliant</span>
          </div>
        </div>

        {/* Right Feature Showcase (Desktop only) */}
        <div className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-pharmagreen-800 via-pharmagreen-700 to-pharmagreen-900 text-white relative overflow-hidden">
          {/* Subtle background decorative shapes */}
          <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />

          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-medium backdrop-blur-md mb-6 border border-white/10">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              MediSync AI Core
            </div>

            <h2 className="text-2xl xl:text-3xl font-bold leading-snug">
              Smarter Pharmacy. <br />
              <span className="text-pharmagreen-200">Healthier Tomorrow.</span>
            </h2>

            <p className="text-sm text-emerald-100/90 mt-4 leading-relaxed">
              Designed specifically for healthcare professionals. Prevent expired stock, eliminate
              stockouts with AI, and speed up POS billing in seconds.
            </p>
          </div>

          {/* Interactive Feature Highlights */}
          <div className="space-y-3 my-6">
            <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-white">First Expiry, First Out (FEFO)</h4>
                <p className="text-[11px] text-emerald-100/80">
                  Automated batch routing at checkout guarantees oldest viable stock sells first.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-white">Predictive AI Demand Alerts</h4>
                <p className="text-[11px] text-emerald-100/80">
                  Forecasts stockout risks 7 days in advance based on prescription velocity.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/15 flex items-center justify-between text-xs text-emerald-200/80">
            <span>Apollo Care Pharmacy Portal</span>
            <span>v1.0.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};
