import React, { useState } from 'react';
import { Mail, Lock, User } from 'lucide-react';
import './Loginpage.css';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

interface LoginPageProps {
  onLogin: (user: User) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('staff');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const url = isLogin 
        ? 'https://bar-management-system.onrender.com/api/auth/login'
        : 'https://bar-management-system.onrender.com/api/auth/register';
      
      const payload = isLogin 
        ? { email, password }
        : { email, password, name, role };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        if (isLogin) {
          if (rememberMe) {
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('user', JSON.stringify(data.user));
          }
          onLogin(data.user);
          setMessage('');
        } else {
          setMessage('ユーザー登録が完了しました。ログインしてください。');
          setIsLogin(true);
        }
        
        setEmail('');
        setPassword('');
        setName('');
        setRole('staff');
      } else {
        setMessage(`${data.detail || 'エラーが発生しました'}`);
      }
    } catch (error) {
      setMessage('通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-form-box">
        <form onSubmit={handleAuth} className="login-form">
          {/* Header */}
          <div className="form-header">
            {isLogin ? 'Log in' : 'Create account'}
          </div>

          {/* Name field for registration */}
          {!isLogin && (
            <div className="form-input-group">
              <div className="form-icon">
                <User size={20} />
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                required={!isLogin}
                className="form-input"
              />
            </div>
          )}

          {/* Email field */}
          <div className="form-input-group">
            <div className="form-icon">
              <Mail size={20} />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              required
              className="form-input"
            />
          </div>

          {/* Password field */}
          <div className="form-input-group">
            <div className="form-icon">
              <Lock size={20} />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="form-input"
            />
          </div>

          {/* Role selection for registration */}
          {!isLogin && (
            <div className="form-input-group">
              <div className="form-icon">
                <User size={20} />
              </div>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="form-select"
              >
                <option value="staff">スタッフ</option>
                <option value="manager">マネージャー</option>
              </select>
            </div>
          )}

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className={`auth-button ${loading ? 'loading' : ''}`}
          >
            {loading ? 'Processing...' : (isLogin ? 'Login to your account' : 'Create account')}
          </button>

          {/* Remember me and Sign up links */}
          <div className="auth-links">
            {/* Remember me checkbox */}
            {isLogin && (
              <label className="remember-me-container">
                <div className={`remember-me-checkbox ${rememberMe ? 'checked' : ''}`}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <div className="remember-me-checkmark"></div>
                </div>
                <span className="remember-me-text">remember me</span>
              </label>
            )}

            {/* Sign up link */}
            <div className="auth-link-section">
              <span className="auth-link-text">
                {isLogin ? 'New here?' : 'Already have account?'}
              </span>
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="auth-link"
              >
                {isLogin ? 'Sign in!' : 'Login!'}
              </button>
            </div>
          </div>
        </form>

        {/* Message display */}
        {message && (
          <div className={`message-box ${message.includes('完了') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="page-footer">
        Powered by KEYRON
      </div>
    </div>
  );
};

export default LoginPage;