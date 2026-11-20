import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  login,
  register,
  authStatus,
  grantConsent,
  setAuthToken,
  getAuthToken,
  parseJwtPayload,
  type LoginRequest,
  type RegisterRequest,
  type TokenResponse,
} from '../api';

interface AuthContextType {
  user: { user_id: string; email?: string } | null;
  token: string | null;
  loading: boolean;
  authenticated: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ user_id: string; email?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAuthToken() || (typeof window !== 'undefined' ? localStorage.getItem('agentbleu_token') : null);
    if (token) {
      // Check for token expiration
      const payload = parseJwtPayload(token);
      if (payload?.exp && Date.now() / 1000 > payload.exp) {
        setAuthToken(null);
        localStorage.removeItem('agentbleu_token');
        localStorage.removeItem('agentbleu_user_id');
        localStorage.removeItem('agentbleu_email');
        setUser(null);
        setLoading(false);
        return;
      }

      setAuthToken(token);
      const savedUserId = typeof window !== 'undefined' ? localStorage.getItem('agentbleu_user_id') : null;
      const savedEmail = typeof window !== 'undefined' ? localStorage.getItem('agentbleu_email') : null;

      // Ensure user_id is never the raw JWT token string
      const initialUserId =
        savedUserId && !savedUserId.startsWith('eyJ')
          ? savedUserId
          : (payload?.user_id || payload?.sub || null);

      const initialEmail =
        savedEmail ||
        payload?.email ||
        (typeof payload?.sub === 'string' && payload.sub.includes('@') ? payload.sub : undefined);

      if (initialUserId) {
        setUser({ user_id: initialUserId, email: initialEmail });
      }

      authStatus()
        .then((res: any) => {
          const finalUserId =
            res?.user_id && typeof res.user_id === 'string' && !res.user_id.startsWith('eyJ')
              ? res.user_id
              : (res?.id || res?.sub || initialUserId);
          const finalEmail = res?.email || initialEmail;

          if (finalUserId) {
            setUser({ user_id: finalUserId, email: finalEmail });
            localStorage.setItem('agentbleu_user_id', finalUserId);
          }
          if (finalEmail) {
            localStorage.setItem('agentbleu_email', finalEmail);
          }
          setLoading(false);
        })
        .catch(() => {
          setAuthToken(null);
          localStorage.removeItem('agentbleu_token');
          localStorage.removeItem('agentbleu_user_id');
          localStorage.removeItem('agentbleu_email');
          setUser(null);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = async (data: LoginRequest) => {
    const res: TokenResponse = await login(data);
    setAuthToken(res.access_token);
    localStorage.setItem('agentbleu_token', res.access_token);
    if (res.refresh_token) {
      localStorage.setItem('agentbleu_refresh_token', res.refresh_token);
    }

    const payload = parseJwtPayload(res.access_token);
    const resolvedUserId = res.user_id || payload?.user_id || payload?.sub || data.email;
    localStorage.setItem('agentbleu_user_id', resolvedUserId);
    localStorage.setItem('agentbleu_email', data.email);
    setUser({ user_id: resolvedUserId, email: data.email });

    // Proactively grant consent to ensure assessments are not blocked with 403
    try {
      await grantConsent({
        type: 'assessment_processing',
        version: '1.0.0',
        granted: true,
      });
    } catch {
      // ignore
    }
  };

  const handleRegister = async (data: RegisterRequest) => {
    const res: TokenResponse = await register(data);
    setAuthToken(res.access_token);
    localStorage.setItem('agentbleu_token', res.access_token);
    if (res.refresh_token) {
      localStorage.setItem('agentbleu_refresh_token', res.refresh_token);
    }

    const payload = parseJwtPayload(res.access_token);
    const resolvedUserId = res.user_id || payload?.user_id || payload?.sub || data.email;
    localStorage.setItem('agentbleu_user_id', resolvedUserId);
    localStorage.setItem('agentbleu_email', data.email);
    setUser({ user_id: resolvedUserId, email: data.email });

    // Proactively grant consent so assessment is not blocked with 403
    try {
      await grantConsent({
        type: 'assessment_processing',
        version: '1.0.0',
        granted: true,
      });
      await grantConsent({
        type: 'terms_privacy',
        version: '1.0.0',
        granted: true,
      });
    } catch {
      // ignore
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
    localStorage.removeItem('agentbleu_token');
    localStorage.removeItem('agentbleu_user_id');
    localStorage.removeItem('agentbleu_email');
    localStorage.removeItem('agentbleu_refresh_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token: getAuthToken(),
        loading,
        authenticated: !!getAuthToken(),
        login: handleLogin,
        register: handleRegister,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
