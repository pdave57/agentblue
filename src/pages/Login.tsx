import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';
import SEO from '../components/seo/SEO';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ email, password });
      navigate('/');
    } catch (err: any) {
      setError(
        err?.detail ||
        (typeof err?.body?.detail === 'string' ? err.body.detail : err?.body?.detail?.[0]?.msg) ||
        err?.response?.detail?.[0]?.msg ||
        err?.message ||
        'Login failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <SEO
        title="My Assessment Results"        
        path="/dashboard/results"
        noIndex
      />
      <div className="auth-card">
        <img
          src={logo}
          alt="Agent Bleu"
          className="auth-logo"
          onClick={() => navigate('/')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigate('/');
            }
          }}
          title="Back to Landing Page"
        />
        <h1>Welcome back</h1>
        <p>Sign in to continue your assessment</p>
        {error && <div className="err" role="alert">{error}</div>}

        <div className="divider"><span>or</span></div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="auth-switch">
          Don't have an account? <button type="button" onClick={() => navigate('/register')}>Create account</button>
        </p>
      </div>
    </div>
  );
}
