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
  
  // 🆕 パスワードリセット用のstate
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetStep, setResetStep] = useState<'email' | 'token' | 'password'>('email');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

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

  // 🆕 パスワードリセットリクエスト
  const handleRequestReset = async () => {
    if (!resetEmail) {
      setResetMessage('メールアドレスを入力してください');
      return;
    }
    
    setResetLoading(true);
    setResetMessage('');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/password-reset/request?email=${encodeURIComponent(resetEmail)}`, {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setResetMessage('リセットコードを送信しました（開発環境ではコンソールを確認）');
        // 開発用：トークンがあれば自動入力
        if (data.dev_token) {
          setResetToken(data.dev_token);
        }
        setResetStep('token');
      } else {
        setResetMessage(data.detail || 'エラーが発生しました');
      }
    } catch (error) {
      setResetMessage('通信エラーが発生しました');
    } finally {
      setResetLoading(false);
    }
  };

  // 🆕 トークン検証
  const handleVerifyToken = async () => {
    if (!resetToken) {
      setResetMessage('リセットコードを入力してください');
      return;
    }
    
    setResetLoading(true);
    setResetMessage('');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/password-reset/verify?token=${encodeURIComponent(resetToken)}`, {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (response.ok && data.valid) {
        setResetStep('password');
        setResetMessage('');
      } else {
        setResetMessage(data.detail || '無効なコードです');
      }
    } catch (error) {
      setResetMessage('通信エラーが発生しました');
    } finally {
      setResetLoading(false);
    }
  };

  // 🆕 パスワード変更確定
  const handleConfirmReset = async () => {
    if (newPassword !== confirmPassword) {
      setResetMessage('パスワードが一致しません');
      return;
    }
    
    if (newPassword.length < 8) {
      setResetMessage('パスワードは8文字以上で入力してください');
      return;
    }
    
    setResetLoading(true);
    setResetMessage('');
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/password-reset/confirm?token=${encodeURIComponent(resetToken)}&new_password=${encodeURIComponent(newPassword)}`,
        { method: 'POST' }
      );
      
      const data = await response.json();
      
      if (response.ok) {
        setResetMessage('パスワードを変更しました！ログインしてください');
        setTimeout(() => {
          setShowResetModal(false);
          setResetStep('email');
          setResetEmail('');
          setResetToken('');
          setNewPassword('');
          setConfirmPassword('');
          setResetMessage('');
        }, 2000);
      } else {
        setResetMessage(data.detail || 'エラーが発生しました');
      }
    } catch (error) {
      setResetMessage('通信エラーが発生しました');
    } finally {
      setResetLoading(false);
    }
  };

  // 🆕 モーダルを閉じる
  const handleCloseResetModal = () => {
    setShowResetModal(false);
    setResetStep('email');
    setResetEmail('');
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setResetMessage('');
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
                <button
                  type="button"
                  onClick={() => setShowResetModal(true)}
                  className="auth-link"
                  style={{ marginRight: '15px' }}
                >
                  パスワードを忘れた
                </button>
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

        <div style={{
          textAlign: 'center',
          fontSize: '12px',
          color: 'rgba(255, 255, 255, 0.5)',
          marginTop: '20px',
          paddingBottom: '10px'
        }}>
          Powered by KEYRON | SaaS Edition
        </div>

        {/* 🆕 パスワードリセットモーダル */}
        {showResetModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '20px'
          }}>
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '30px',
              width: '100%',
              maxWidth: '400px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '25px'
              }}>
                <h3 style={{ margin: 0, color: '#333', fontSize: '20px', fontWeight: '600' }}>
                  パスワードリセット
                </h3>
                <button
                  onClick={handleCloseResetModal}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    color: '#666',
                    cursor: 'pointer'
                  }}
                >
                  ×
                </button>
              </div>

              {/* ステップインジケーター */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '20px',
                marginBottom: '25px'
              }}>
                {['email', 'token', 'password'].map((step, index) => (
                  <div key={step} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: resetStep === step ? 'linear-gradient(135deg, #9333EA, #F0E)' :
                                 ['email', 'token', 'password'].indexOf(resetStep) > index ? '#27ae60' : '#e0e0e0',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}>
                      {index + 1}
                    </div>
                    {index < 2 && (
                      <div style={{
                        width: '30px',
                        height: '2px',
                        background: ['email', 'token', 'password'].indexOf(resetStep) > index ? '#27ae60' : '#e0e0e0'
                      }} />
                    )}
                  </div>
                ))}
              </div>

              {/* ステップ1: メールアドレス入力 */}
              {resetStep === 'email' && (
                <div>
                  <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
                    登録されているメールアドレスを入力してください
                  </p>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="メールアドレス"
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      border: '2px solid #e1e8ed',
                      borderRadius: '10px',
                      fontSize: '16px',
                      marginBottom: '20px',
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    onClick={handleRequestReset}
                    disabled={resetLoading}
                    style={{
                      width: '100%',
                      padding: '14px',
                      background: resetLoading ? '#ccc' : 'linear-gradient(135deg, #9333EA, #F0E)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: resetLoading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {resetLoading ? '送信中...' : 'リセットコードを送信'}
                  </button>
                </div>
              )}

              {/* ステップ2: トークン入力 */}
              {resetStep === 'token' && (
                <div>
                  <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
                    メールに送信されたリセットコードを入力してください
                  </p>
                  <input
                    type="text"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    placeholder="リセットコード"
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      border: '2px solid #e1e8ed',
                      borderRadius: '10px',
                      fontSize: '16px',
                      marginBottom: '20px',
                      boxSizing: 'border-box',
                      fontFamily: 'monospace'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => setResetStep('email')}
                      style={{
                        flex: 1,
                        padding: '14px',
                        background: '#f0f0f0',
                        color: '#666',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '16px',
                        cursor: 'pointer'
                      }}
                    >
                      戻る
                    </button>
                    <button
                      onClick={handleVerifyToken}
                      disabled={resetLoading}
                      style={{
                        flex: 2,
                        padding: '14px',
                        background: resetLoading ? '#ccc' : 'linear-gradient(135deg, #9333EA, #F0E)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: resetLoading ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {resetLoading ? '確認中...' : '確認'}
                    </button>
                  </div>
                </div>
              )}

              {/* ステップ3: 新しいパスワード入力 */}
              {resetStep === 'password' && (
                <div>
                  <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
                    新しいパスワードを設定してください（8文字以上）
                  </p>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="新しいパスワード"
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      border: '2px solid #e1e8ed',
                      borderRadius: '10px',
                      fontSize: '16px',
                      marginBottom: '15px',
                      boxSizing: 'border-box'
                    }}
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="パスワード確認"
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      border: '2px solid #e1e8ed',
                      borderRadius: '10px',
                      fontSize: '16px',
                      marginBottom: '20px',
                      boxSizing: 'border-box'
                    }}
                  />
                  {newPassword && confirmPassword && (
                    <div style={{
                      marginBottom: '15px',
                      fontSize: '13px',
                      color: newPassword === confirmPassword ? '#27ae60' : '#e74c3c'
                    }}>
                      {newPassword === confirmPassword ? '✓ パスワードが一致しています' : '✗ パスワードが一致しません'}
                    </div>
                  )}
                  <button
                    onClick={handleConfirmReset}
                    disabled={resetLoading || newPassword !== confirmPassword || newPassword.length < 8}
                    style={{
                      width: '100%',
                      padding: '14px',
                      background: (resetLoading || newPassword !== confirmPassword || newPassword.length < 8) 
                        ? '#ccc' 
                        : 'linear-gradient(135deg, #9333EA, #F0E)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: (resetLoading || newPassword !== confirmPassword || newPassword.length < 8) 
                        ? 'not-allowed' 
                        : 'pointer'
                    }}
                  >
                    {resetLoading ? '変更中...' : 'パスワードを変更'}
                  </button>
                </div>
              )}

              {/* メッセージ表示 */}
              {resetMessage && (
                <div style={{
                  marginTop: '15px',
                  padding: '12px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  background: resetMessage.includes('しました') ? '#e8f5e9' : '#ffebee',
                  color: resetMessage.includes('しました') ? '#27ae60' : '#e74c3c',
                  textAlign: 'center'
                }}>
                  {resetMessage}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </GoogleOAuthProvider>
  );
};

export default LoginPage;