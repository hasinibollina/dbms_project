import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, LogIn, Sparkles } from 'lucide-react';
import { authApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const toast = useToast();

  const [formData, setFormData] = useState({
    email: location.state?.email || '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMessage) {
      setErrorMessage('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const emailTrimmed = formData.email.trim().toLowerCase();
    const password = formData.password;

    if (!emailTrimmed || !password) {
      setErrorMessage('Invalid email or password');
      return;
    }

    setLoading(true);

    try {
      const response = await authApi.login({
        email: emailTrimmed,
        password: password,
      });

      if (response && response.user && response.access_token) {
        const user = response.user;
        const role = (user.role || 'organizer').toLowerCase();

        login({
          user_id: user.id,
          name: user.full_name,
          email: user.email || emailTrimmed,
          role: role,
          token: response.access_token,
        });

        toast.success(`Welcome, ${user.full_name || 'Organizer'}!`);

        if (role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/manage-events');
        }
      } else {
        throw new Error('Invalid login response from server');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-12 sm:py-16 w-full animate-fadeIn">
      {/* Brand Header */}
      <div className="text-center space-y-2 mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sand-dark/60 text-wine text-xs font-heading uppercase tracking-wider mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Eventilion Portal</span>
        </div>
        <h1 className="font-heading text-3xl sm:text-4xl uppercase tracking-tight text-ink">
          SIGN IN
        </h1>
        <p className="text-xs sm:text-sm text-ink/70">
          Enter your email and password to access your management dashboard.
        </p>
      </div>


      {/* Login Card */}
      <div className="bg-sand rounded-2xl border border-sand-dark p-6 sm:p-8 shadow-poster space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="login-email" className="block text-xs font-heading uppercase tracking-wider text-ink">
              Email Address <span className="text-red-700">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-wine absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                placeholder="you@example.com"
                className="w-full pl-11 pr-4 py-3 bg-sand-dark/30 border border-sand-dark rounded-xl text-sm font-medium text-ink placeholder-ink/40 focus:outline-none focus:ring-2 focus:ring-wine focus:bg-sand transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label htmlFor="login-password" className="block text-xs font-heading uppercase tracking-wider text-ink">
              Password <span className="text-red-700">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-wine absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleInputChange}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3 bg-sand-dark/30 border border-sand-dark rounded-xl text-sm font-medium text-ink placeholder-ink/40 focus:outline-none focus:ring-2 focus:ring-wine focus:bg-sand transition-all"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-wine text-sand font-heading text-xs uppercase tracking-wider font-bold hover:bg-wine-dark transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-wine-light mt-2 ${
              loading ? 'opacity-70 cursor-wait' : ''
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? 'Signing in...' : 'Sign In'}</span>
          </button>

          {/* Error Message Display: Wrong credentials show "Incorrect email or password" under the form */}
          {errorMessage && (
            <div
              id="login-error-message"
              className="p-3 rounded-xl bg-red-100 border border-red-300 text-red-800 text-xs font-bold text-center mt-3 animate-fadeIn"
            >
              {errorMessage}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}