import React, { useState } from 'react';
import { Mail, Lock, User, Building2 } from 'lucide-react';
import './Loginpage.css';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  store_id: number;
}

interface LoginPageProps {
  onLoginSuccess: () => void;
  onShowRegister: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onShowRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [storeCode, setStoreCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const formBody = new URLSearchParams();
      formBody.append('username', email);
      formBody.append('password', password);
      formBody.append('store_code', storeCode);

      const response = await fetch('http://localhost:8002/api/auth/employee/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formBody.toString(),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('store_code', storeCode);
        
        onLoginSuccess();
        setMessage('');
      } else {
        const errorMsg = typeof data.detail === 'string' 
          ? data.detail 
          : JSON.stringify(data.detail);
        setMessage(errorMsg);
      }
    } catch (error) {
      console.error('認証エラー:', error);
      setMessage('通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-form-box">
        <form onSubmit={handleAuth} className="login-form">
          <div className="form-header">
            Log in
          </div>

          <div className="form-input-group">
            <div className="form-icon">
              <Building2 size={20} />
            </div>
            <input
              type="text"
              value={storeCode}
              onChange={(e) => setStoreCode(e.target.value)}
              placeholder="店舗コード (例: STORE001)"
              required
              className="form-input"
            />
          </div>

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

          <button
            type="submit"
            disabled={loading}
            className={`auth-button ${loading ? 'loading' : ''}`}
          >
            {loading ? 'Processing...' : 'Login to your account'}
          </button>

          <div className="auth-links">
            <label className="remember-me-container">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span className="remember-me-text">remember me</span>
            </label>

            <div className="auth-link-section">
              <span className="auth-link-text">New here?</span>
              <button
                type="button"
                onClick={onShowRegister}
                className="auth-link"
              >
                アカウントを作成
              </button>
            </div>
          </div>
        </form>

        {message && (
          <div className={`message-box ${message.includes('完了') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

        <div style={{
          marginTop: '20px',
          padding: '15px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '10px',
          fontSize: '12px',
          color: 'rgba(255, 255, 255, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ marginBottom: '8px', fontWeight: 'bold', color: 'rgba(255, 255, 255, 0.8)' }}>
            テスト用アカウント
          </div>
          <div>店舗コード: STORE001</div>
          <div>Email: employee1@store001.com</div>
          <div>Password: password123</div>
        </div>
      </div>

      <div className="page-footer">
        Powered by KEYRON | SaaS Edition
      </div>
    </div>
  );
};

export default LoginPage;