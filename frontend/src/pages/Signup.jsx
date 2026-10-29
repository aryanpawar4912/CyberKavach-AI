import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye, EyeOff, Lock, User, Mail, Briefcase, AlertTriangle, ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthShell from '../components/common/AuthShell';

export default function Signup() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    role: 'SOC Analyst',
    password: '',
    password_confirm: '',
  });

  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');

  const { register } = useAuth();
  const navigate = useNavigate();

  // Password Strength Calculation
  const calculateStrength = (pwd) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const strength = calculateStrength(formData.password);
  const strengthLabels = ['Too Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const strengthColors = ['bg-status-critical', 'bg-status-critical', 'bg-status-warning', 'bg-accent-emerald', 'bg-accent-emerald'];

  const validate = () => {
    const errs = {};
    if (!formData.username.trim()) {
      errs.username = 'Username is required.';
    } else if (formData.username.length < 3) {
      errs.username = 'Username must be at least 3 characters.';
    } else if (!/^[a-zA-Z0-9_.-]+$/.test(formData.username)) {
      errs.username = 'Only letters, numbers, dots, and underscores allowed.';
    }

    if (!formData.email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errs.email = 'Please enter a valid email address.';
    }

    if (!formData.password) {
      errs.password = 'Password is required.';
    } else if (formData.password.length < 8) {
      errs.password = 'Password must be at least 8 characters.';
    } else if (!/\d/.test(formData.password) || !/[a-zA-Z]/.test(formData.password)) {
      errs.password = 'Password must include both letters and numbers.';
    }

    if (formData.password !== formData.password_confirm) {
      errs.password_confirm = 'Passwords do not match.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validate()) return;

    setLoading(true);
    try {
      await register({
        username: formData.username.trim(),
        email: formData.email.trim(),
        role: formData.role,
        first_name: formData.role,
        password: formData.password,
        password_confirm: formData.password_confirm,
      });
      navigate('/', { replace: true });
    } catch (err) {
      const data = err.response?.data;
      if (typeof data === 'object') {
        const firstKey = Object.keys(data)[0];
        const val = data[firstKey];
        const msg = Array.isArray(val) ? val[0] : (typeof val === 'string' ? val : 'Registration failed.');
        setServerError(`${firstKey !== 'detail' ? `${firstKey}: ` : ''}${msg}`);
      } else {
        setServerError('Server error during registration. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create an account"
      prompt="Already have an account?"
      linkText="Log in"
      linkTo="/login"
    >
          <form onSubmit={handleSubmit} className="auth-form space-y-3.5">
          {serverError && (
            <div className="flex items-center gap-2 mb-4 text-xs text-status-critical bg-status-critical-dim border border-status-critical/30 rounded p-2.5">
              <AlertTriangle size={14} className="flex-shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

            {/* Username */}
            <div>
              <label className="ck-label block mb-1" htmlFor="signup-username">Operator Username</label>
              <div className="relative">
                <User size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  id="signup-username"
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="e.g. hunter_chen"
                  className={`ck-input pl-8 ${errors.username ? 'border-status-critical focus:border-status-critical' : ''}`}
                />
              </div>
              {errors.username && <p className="text-2xs text-status-critical mt-1">{errors.username}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="ck-label block mb-1" htmlFor="signup-email">Email address</label>
              <div className="relative">
                <Mail size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  id="signup-email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="analyst@domain.com"
                  className={`ck-input pl-8 ${errors.email ? 'border-status-critical focus:border-status-critical' : ''}`}
                />
              </div>
              {errors.email && <p className="text-2xs text-status-critical mt-1">{errors.email}</p>}
            </div>

            {/* Operational Role */}
            <div>
              <label className="ck-label block mb-1" htmlFor="signup-role">Assigned Security Role</label>
              <div className="relative">
                <Briefcase size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <select
                  id="signup-role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="ck-input pl-8 appearance-none bg-bg-secondary"
                >
                  <option value="SOC Analyst">SOC Tier-1 Analyst</option>
                  <option value="Threat Hunter">Advanced Threat Hunter</option>
                  <option value="Incident Commander">Incident Response Commander</option>
                  <option value="Security Engineer">ML Security Engineer</option>
                </select>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="ck-label block mb-1" htmlFor="signup-password">Password</label>
              <div className="relative">
                <Lock size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  id="signup-password"
                  type={showPwd ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Min 8 characters (letters + digits)"
                  className={`ck-input pl-8 pr-8 ${errors.password ? 'border-status-critical' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  aria-label={showPwd ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                >
                  {showPwd ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>

              {/* Password strength visualizer */}
              {formData.password && (
                <div className="mt-1.5 space-y-1">
                  <div className="flex gap-1 h-1 w-full bg-bg-primary rounded-full overflow-hidden">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`flex-1 transition-all duration-300 ${
                          strength >= step ? strengthColors[strength] : 'bg-border'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-2xs text-text-muted">
                    <span>Complexity</span>
                    <span className="font-mono">{strengthLabels[strength] || 'Too Weak'}</span>
                  </div>
                </div>
              )}
              {errors.password && <p className="text-2xs text-status-critical mt-1">{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="ck-label block mb-1" htmlFor="signup-confirm-password">Confirm password</label>
              <div className="relative">
                <Lock size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  id="signup-confirm-password"
                  type={showConfirmPwd ? 'text' : 'password'}
                  name="password_confirm"
                  value={formData.password_confirm}
                  onChange={handleChange}
                  placeholder="Repeat exact password"
                  className={`ck-input pl-8 pr-8 ${errors.password_confirm ? 'border-status-critical' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                  aria-label={showConfirmPwd ? 'Hide password confirmation' : 'Show password confirmation'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                >
                  {showConfirmPwd ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
              {errors.password_confirm && (
                <p className="text-2xs text-status-critical mt-1">{errors.password_confirm}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="ck-btn-primary auth-submit w-full py-2.5 text-xs font-semibold justify-center flex items-center gap-2 mt-2 shadow-glow-sm cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-bg-primary border-t-transparent rounded-full animate-spin" />
                  <span>Enrolling Credentials…</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight size={13} />
                </>
              )}
            </button>
          </form>
    </AuthShell>
  );
}
