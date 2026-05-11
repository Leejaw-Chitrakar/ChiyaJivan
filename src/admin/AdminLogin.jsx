import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Coffee, Lock, Mail, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { getUserRole } from '../lib/firestoreService';
import './styles/AdminLogin.css';

const ADMIN_UID = import.meta.env.VITE_ADMIN_UID;

export default function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const role = await getUserRole(result.user.uid);
      
      if (role === 'visitor') {
        await auth.signOut();
        setError('Permission Denied. You do not have administrative access.');
        setIsSubmitting(false);
        return;
      }
      
      sessionStorage.setItem('isAdminAuth', 'true');
      sessionStorage.setItem('adminUid', result.user.uid);
      sessionStorage.setItem('userRole', role);
      
      onLogin(true, role);
      navigate('/admin/dashboard');
    } catch (err) {
      const messages = {
        'auth/user-not-found':    'No account found with this email.',
        'auth/wrong-password':    'Incorrect password. Please try again.',
        'auth/invalid-email':     'Please enter a valid email address.',
        'auth/invalid-credential':'Invalid email or password.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
      };
      setError(messages[err.code] || `Sign-in failed: ${err.message}`);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-login-wrapper">

      {/* ── LEFT: Brand Panel ── */}
      <div className="admin-login-brand-panel">
        <div className="admin-login-circle-top" />
        <div className="admin-login-circle-bottom" />

        {/* Brand */}
        <div className="relative z-10 flex items-center gap-4">
          <div className="admin-login-logo-box">
            <Coffee size={24} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-lg leading-tight">Chiya Jivan</p>
            <p className="admin-login-portal-label">Admin Portal</p>
          </div>
        </div>

        {/* Quote */}
        <div className="relative z-10 space-y-8">
          <div>
            <div className="admin-login-divider" />
            <h2 className="admin-login-heading">
              Your shop,<br />
              <span className="admin-login-heading-highlight">your rules.</span>
            </h2>
            <p className="admin-login-desc">
              Manage your menu, track live orders, and keep Chiya Jivan running — all from one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {['Live Order Tracking', 'Menu Control', 'Social Updates'].map(tag => (
              <span key={tag} className="admin-login-tag">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <p className="admin-login-copyright">
          © 2026 Chiya Jivan · Kathmandu, Nepal
        </p>
      </div>

      {/* ── RIGHT: Form Panel ── */}
      <div className="admin-login-form-panel">
        <div className="admin-login-circle-right" />

        <div className="w-full max-w-sm relative z-10">
          {/* Mobile brand */}
          <div className="admin-login-mobile-brand">
            <div className="admin-login-mobile-logo">
              <Coffee size={20} className="text-white" />
            </div>
            <div>
              <p className="admin-login-mobile-title">Chiya Jivan</p>
              <p className="text-xs text-gray-400">Admin Portal</p>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-10">
            <h1 className="admin-login-form-title">
              Welcome back
            </h1>
            <p className="admin-login-form-desc">
              Sign in with your authorized admin credentials.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="admin-login-error">
              <span className="flex-shrink-0 mt-0.5">⚠</span>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">

              {/* Email */}
              <div>
                <label className="admin-login-label">
                  Email Address
                </label>
                <div className="relative">
                  <div className="admin-login-icon">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="admin@chiyajivan.com"
                    className="admin-login-input"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="admin-login-label">
                  Password
                </label>
                <div className="relative">
                  <div className="admin-login-icon">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••••"
                    className="admin-login-input password"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="admin-login-eye-btn"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="admin-login-submit-btn"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span>Access Dashboard</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          <p className="admin-login-footer">
            © 2026 CHIYA JIVAN · AUTHORIZED PERSONNEL ONLY
          </p>
        </div>
      </div>
    </div>
  );
}
