import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, UserPlus, Sparkles } from 'lucide-react';
import { authApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const toast = useToast();

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.full_name.trim()) {
      errors.full_name = 'Full name is required';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!emailRegex.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    if (!formData.confirm_password) {
      errors.confirm_password = 'Confirm password is required';
    } else if (formData.password !== formData.confirm_password) {
      errors.confirm_password = 'Passwords must match';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        password: formData.password,
      };

      const response = await authApi.register(payload);
      const userObject = response?.user || response || {
        ...payload,
        user_id: Math.floor(100 + Math.random() * 900),
      };

      login(userObject);
      toast.success(`Account created successfully! Welcome, ${userObject.full_name}!`);
      navigate('/');
    } catch (err) {
      console.warn('POST /users/register failed:', err.message);
      // Show error toast as required: "show an error toast if the API is not ready"
      toast.error(`Registration API Error: ${err.message || 'Authentication server offline'}`);
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
          <span>New Account Registration</span>
        </div>
        <h1 className="font-heading text-3xl sm:text-4xl uppercase tracking-tight text-ink">
          CREATE ACCOUNT
        </h1>
        <p className="text-xs sm:text-sm text-ink/70">
          Join Eventilion to reserve tickets or register and manage event facilities.
        </p>
      </div>

      {/* Registration Card */}
      <div className="bg-sand rounded-2xl border border-sand-dark p-6 sm:p-8 shadow-poster space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Full Name */}
          <div className="space-y-1.5">
            <label htmlFor="reg-name" className="block text-xs font-heading uppercase tracking-wider text-ink">
              Full Name <span className="text-red-700">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-wine absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="reg-name"
                name="full_name"
                type="text"
                required
                maxLength={100}
                value={formData.full_name}
                onChange={handleInputChange}
                placeholder="e.g. Priya Sharma"
                className={`w-full pl-11 pr-4 py-3 bg-sand-dark/30 border rounded-xl text-sm font-medium text-ink placeholder-ink/40 focus:outline-none focus:ring-2 focus:ring-wine focus:bg-sand transition-all ${
                  formErrors.full_name ? 'border-red-500 ring-1 ring-red-500' : 'border-sand-dark'
                }`}
                aria-invalid={Boolean(formErrors.full_name)}
              />
            </div>
            {formErrors.full_name && (
              <p className="text-xs text-red-700 font-semibold">{formErrors.full_name}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="reg-email" className="block text-xs font-heading uppercase tracking-wider text-ink">
              Email Address <span className="text-red-700">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-wine absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="reg-email"
                name="email"
                type="email"
                required
                maxLength={150}
                value={formData.email}
                onChange={handleInputChange}
                placeholder="you@example.com"
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
            <label htmlFor="reg-password" className="block text-xs font-heading uppercase tracking-wider text-ink">
              Password <span className="text-red-700">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-wine absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="reg-password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Minimum 8 characters"
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



          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label htmlFor="reg-confirm-password" className="block text-xs font-heading uppercase tracking-wider text-ink">
              Confirm Password <span className="text-red-700">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-wine absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="reg-confirm-password"
                name="confirm_password"
                type="password"
                required
                value={formData.confirm_password}
                onChange={handleInputChange}
                placeholder="Re-enter password"
                className={`w-full pl-11 pr-4 py-3 bg-sand-dark/30 border rounded-xl text-sm font-medium text-ink placeholder-ink/40 focus:outline-none focus:ring-2 focus:ring-wine focus:bg-sand transition-all ${
                  formErrors.confirm_password ? 'border-red-500 ring-1 ring-red-500' : 'border-sand-dark'
                }`}
                aria-invalid={Boolean(formErrors.confirm_password)}
              />
            </div>
            {formErrors.confirm_password && (
              <p className="text-xs text-red-700 font-semibold">{formErrors.confirm_password}</p>
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
            <UserPlus className="w-4 h-4" />
            <span>{loading ? 'Creating Account...' : 'Register'}</span>
          </button>
        </form>

        {/* Existing account prompt */}
        <div className="pt-4 border-t border-sand-dark text-center text-xs text-ink/75">
          Already registered?{' '}
          <Link
            to="/login"
            className="text-wine font-bold hover:underline underline-offset-2 ml-1"
          >
            Sign In Here
          </Link>
        </div>
      </div>
    </div>
  );
}