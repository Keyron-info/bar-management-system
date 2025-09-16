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
          localStorage.setItem('token', data.access_token);
          localStorage.setItem('user', JSON.stringify(data.user));
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
        <div className="form-header">
          Log in
        </div>

        <form onSubmit={handleAuth}>
          {/* Name field for registration */}
          {!isLogin && (
            <div className="form-input-group">
              <User size={20} className="form-icon" />
              <input
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={!isLogin}
                className="form-input"
              />
            </div>
          )}

          {/* Email field */}
          <div className="form-input-group">
            <Mail size={20} className="form-icon" />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="form-input"
            />
          </div>

          {/* Password field */}
          <div className="form-input-group">
            <Lock size={20} className="form-icon" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="form-input"
            />
          </div>

          {/* Role selection for registration */}
          {!isLogin && (
            <div className="form-input-group">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="form-input"
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '8px',
                  padding: '10px',
                  paddingLeft: '30px'
                }}
              >
                <option value="staff" style={{ color: '#000' }}>従業員</option>
                <option value="manager" style={{ color: '#000' }}>店長</option>
              </select>
            </div>
          )}

          {/* Login button */}
          <button
            type="submit"
            disabled={loading}
            className="auth-button"
          >
            {loading ? '処理中...' : isLogin ? 'Login to your account' : 'Create account'}
          </button>

          {/* Remember me and Sign up link */}
          <div className="auth-links">
            {/* Remember me checkbox */}
            <label className="remember-me-container">
              <div style={{
                width: '17px',
                height: '17px',
                border: '1px solid rgba(255, 255, 255, 0.5)',
                borderRadius: '3px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: rememberMe ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                position: 'relative'
              }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{
                    opacity: 0,
                    position: 'absolute',
                    width: '17px',
                    height: '17px',
                    cursor: 'pointer'
                  }}
                />
                {rememberMe && (
                  <div style={{
                    width: '13.81px',
                    height: '13.81px',
                    background: 'white',
                    borderRadius: '2px'
                  }} />
                )}
              </div>
              <span className="remember-me-text">remember me</span>
            </label>

            {/* Sign up link */}
            <div style={{ display: 'flex', gap: '4px' }}>
              <span className="auth-link-text" style={{ color: 'rgba(255, 255, 255, 0.60)' }}>
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