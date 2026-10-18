import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, Sparkles, AlertCircle, ArrowRight, UserCheck } from 'lucide-react';
import { authApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const toast = useToast();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const errors = {};
    if (!formData.email.trim()) errors.email = 'Email address is required';
    if (!formData.password) errors.password = 'Password is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const response = await authApi.login({
        email: formData.email.trim(),
        password: formData.password,
      });

      const userObject = response?.user || response || {
        email: formData.email,
        full_name: formData.email.split('@')[0],
        role: 'Attendee',
      };

      login(userObject);
      toast.success(`Welcome back, ${userObject.full_name || userObject.email}!`);
      navigate('/');
    } catch (err) {
      console.warn('POST /users/login failed:', err.message);
      // Show error toast as required: "show an error toast if the API is not ready"
      toast.error(`Login API Error: ${err.message || 'Authentication server offline'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = (role) => {
    const demoAccounts = {
      Admin: { user_id: 1, full_name: 'Sneha Admin', email: 'admin@eventhub.com', role: 'Admin' },
      Organizer: { user_id: 2, full_name: 'Arjun Mehta', email: 'arjun.organizer@gmail.com', role: 'Organizer' },
      Attendee: { user_id: 4, full_name: 'Rohan Verma', email: 'rohan.v@outlook.com', role: 'Attendee' },
    };

    const selected = demoAccounts[role];
    login(selected);
    toast.success(`Signed in as ${selected.full_name} (${role})`);
    navigate('/');
  };

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-12 sm:py-16 w-full animate-fadeIn">
      {/* Brand Header */}
      <div className="text-center space-y-2 mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sand-dark/60 text-wine text-xs font-heading uppercase tracking-wider mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>DBMS Authentication</span>
        </div>
        <h1 className="font-heading text-3xl sm:text-4xl uppercase tracking-tight text-ink">
          SIGN IN
        </h1>
        <p className="text-xs sm:text-sm text-ink/70">
          Access your event bookings, ticket passes, and organizer controls.
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
                placeholder="name@example.com"
                className={`w-full pl-11 pr-4 py-3 bg-sand-dark/30 border rounded-xl text-sm font-medium text-ink placeholder-ink/40 focus:outline-none focus:ring-2 focus:ring-wine focus:bg-sand transition-all ${
                  formErrors.email ? 'border-red-500 ring-1 ring-red-500' : 'border-sand-dark'
                }`}
                aria-invalid={Boolean(formErrors.email)}
              />
            </div>
            {formErrors.email && (
              <p className="text-xs text-red-700 font-semibold">{formErrors.email}</p>
            )}
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
                className={`w-full pl-11 pr-4 py-3 bg-sand-dark/30 border rounded-xl text-sm font-medium text-ink placeholder-ink/40 focus:outline-none focus:ring-2 focus:ring-wine focus:bg-sand transition-all ${
                  formErrors.password ? 'border-red-500 ring-1 ring-red-500' : 'border-sand-dark'
                }`}
                aria-invalid={Boolean(formErrors.password)}
              />
            </div>
            {formErrors.password && (
              <p className="text-xs text-red-700 font-semibold">{formErrors.password}</p>
            )}
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
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
          </button>
        </form>

        {/* Register Prompt */}
        <div className="pt-4 border-t border-sand-dark text-center text-xs text-ink/75">
          Don't have an account yet?{' '}
          <Link
            to="/register"
            className="text-wine font-bold hover:underline underline-offset-2 ml-1"
          >
            Register Here
          </Link>
        </div>

        {/* Demo Fast Sign-in (DBMS Evaluation) */}
        <div className="pt-4 border-t border-sand-dark/60 space-y-2">
          <span className="text-[10px] font-heading uppercase text-wine/80 tracking-wider block text-center">
            One-Click Evaluation Personas (Seed Data)
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('Admin')}
              className="px-2.5 py-1.5 rounded-lg bg-sand-dark/50 text-[11px] font-semibold text-ink hover:bg-wine hover:text-sand transition-colors truncate"
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('Organizer')}
              className="px-2.5 py-1.5 rounded-lg bg-sand-dark/50 text-[11px] font-semibold text-ink hover:bg-wine hover:text-sand transition-colors truncate"
            >
              Organizer
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('Attendee')}
              className="px-2.5 py-1.5 rounded-lg bg-sand-dark/50 text-[11px] font-semibold text-ink hover:bg-wine hover:text-sand transition-colors truncate"
            >
              Attendee
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
