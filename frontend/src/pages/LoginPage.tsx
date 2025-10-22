import React, { useState } from 'react';
import { API_BASE_URL } from '../config';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { Mail, Lock, Building2 } from 'lucide-react';
import './Loginpage.css';

const GOOGLE_CLIENT_ID = "650805213837-gr5gm541euvep495jahcnm3ku0r6vv72.apps.googleusercontent.com";

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

  const handleAuth = async () => {
    if (!email || !password || !storeCode) {
      setMessage('すべての項目を入力してください');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const formBody = new URLSearchParams();
      formBody.append('username', email);
      formBody.append('password', password);
      formBody.append('store_code', storeCode);

      const response = await fetch(`${API_BASE_URL}/api/auth/employee/login`, {
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

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setLoading(true);
    setMessage('');

    try {
      if (!storeCode) {
        setMessage('店舗コードを入力してください');
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append('token', credentialResponse.credential);
      formData.append('store_code', storeCode);

      const response = await fetch(`${API_BASE_URL}/api/auth/google/employee`, {
        method: 'POST',
        body: formData,
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
      console.error('Google認証エラー:', error);
      setMessage('Google認証に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setMessage('Googleログインがキャンセルされました');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAuth();
    }
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="login-page-container">
        <div className="login-form-box">
          <div className="login-form">
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
                onKeyPress={handleKeyPress}
                placeholder="店舗コード (例: BAR_0EHHGJ89)"
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
                onKeyPress={handleKeyPress}
                placeholder="Email address"
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
                onKeyPress={handleKeyPress}
                placeholder="Password"
                className="form-input"
              />
            </div>

            <button
              onClick={handleAuth}
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

            {/* Google OAuth セクション */}
            <div style={{
              marginTop: '20px',
              position: 'relative',
              textAlign: 'center'
            }}>
              <div style={{
                position: 'relative',
                marginBottom: '15px'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: 0,
                  right: 0,
                  height: '1px',
                  background: 'rgba(255, 255, 255, 0.2)'
                }}></div>
                <span style={{
                  position: 'relative',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  padding: '0 15px',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '13px'
                }}>
                  または
                </span>
              </div>

              <div style={{ 
                display: 'flex', 
                justifyContent: 'center',
                marginTop: '15px'
              }}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  text="continue_with"
                  shape="rectangular"
                  size="large"
                  locale="ja"
                />
              </div>
            </div>
          </div>

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
            <div>店舗コード: BAR_0EHHGJ89</div>
            <div>Email: 8eito.nitta@gmail.com</div>
            <div>Password: 6Rokushibamix</div>
          </div>
        </div>

        <div className="page-footer">
          Powered by KEYRON | SaaS Edition
        </div>
      </div>
    </GoogleOAuthProvider>
  );
};

export default LoginPage;