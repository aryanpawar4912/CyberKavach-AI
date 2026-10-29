import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye, EyeOff, Lock, User, AlertTriangle, ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthShell from '../components/common/AuthShell';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const { login } = useAuth();
  const navigate = useNavigate();

  const validate = () => {
    const errs = {};
    if (!username.trim()) {
      errs.username = 'Username is required.';
    }
    if (!password) {
      errs.password = 'Password is required.';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validate()) return;

    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.[0] ||
        'Authentication failed. Please verify credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      prompt="New to CyberKavach AI?"
      linkText="Create an account"
      linkTo="/signup"
    >
      <form onSubmit={handleSubmit} className="auth-form space-y-5">
            {/* Username */}
            <div>
              <label className="ck-label block mb-1" htmlFor="login-username">Username / Operator ID</label>
              <div className="relative">
                <User size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  id="login-username"
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (fieldErrors.username) setFieldErrors((p) => ({ ...p, username: undefined }));
                  }}
                  placeholder="Enter your username"
                  autoComplete="username"
                  className={`ck-input pl-8 ${fieldErrors.username ? 'border-status-critical' : ''}`}
                />
              </div>
              {fieldErrors.username && (
                <p className="text-2xs text-status-critical mt-1">{fieldErrors.username}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="ck-label block mb-1" htmlFor="login-password">Password</label>
              <div className="relative">
                <Lock size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  id="login-password"
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
                  }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={`ck-input pl-8 pr-8 ${fieldErrors.password ? 'border-status-critical' : ''}`}
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
              {fieldErrors.password && (
                <p className="text-2xs text-status-critical mt-1">{fieldErrors.password}</p>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-status-critical bg-status-critical-dim border border-status-critical/30 rounded p-2.5">
                <AlertTriangle size={14} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="ck-btn-primary auth-submit w-full py-2.5 text-xs font-semibold justify-center flex items-center gap-2 shadow-glow-sm cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-bg-primary border-t-transparent rounded-full animate-spin" />
                  <span>Validating Clearance…</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={13} />
                </>
              )}
            </button>
          </form>
    </AuthShell>
  );
}
