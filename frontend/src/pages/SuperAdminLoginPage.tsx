import React, { useState } from 'react';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { Shield, Mail, Lock, AlertCircle } from 'lucide-react';

const GOOGLE_CLIENT_ID = "650805213837-gr5gm541euvep495jahcnm3ku0r6vv72.apps.googleusercontent.com";

interface SuperAdminLoginProps {
  onLoginSuccess: (admin: any, token: string) => void;
}

const SuperAdminLoginPage: React.FC<SuperAdminLoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('メールアドレスとパスワードを入力してください');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:8002/api/auth/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password
        }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('admin_token', data.access_token);
        localStorage.setItem('admin_user', JSON.stringify(data.admin));
        
        onLoginSuccess(data.admin, data.access_token);
      } else {
        setError(data.detail || 'ログインに失敗しました');
      }
    } catch (err) {
      console.error('ログインエラー:', err);
      setError('通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('token', credentialResponse.credential);

      const response = await fetch('http://localhost:8002/api/auth/google/admin', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('admin_token', data.access_token);
        localStorage.setItem('admin_user', JSON.stringify(data.admin));
        
        onLoginSuccess(data.admin, data.access_token);
      } else {
        setError(data.detail || 'Google認証に失敗しました');
      }
    } catch (err) {
      console.error('Google認証エラー:', err);
      setError('Google認証でエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Googleログインがキャンセルされました');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '420px',
          background: 'rgba(255, 255, 255, 0.98)',
          borderRadius: '20px',
          padding: '40px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
        }}>
          {/* ヘッダー */}
          <div style={{
            textAlign: 'center',
            marginBottom: '35px'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
              borderRadius: '20px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 10px 30px rgba(59, 130, 246, 0.3)'
            }}>
              <Shield size={40} color="white" />
            </div>
            
            <h1 style={{
              fontSize: '28px',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '10px'
            }}>
              システム管理者
            </h1>
            <p style={{
              color: '#666',
              fontSize: '14px'
            }}>
              管理者ダッシュボードにログイン
            </p>
          </div>

          {/* エラーメッセージ */}
          {error && (
            <div style={{
              marginBottom: '20px',
              padding: '15px',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '2px solid #ef4444',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <AlertCircle size={20} color="#ef4444" />
              <span style={{ color: '#dc2626', fontSize: '14px', fontWeight: '500' }}>
                {error}
              </span>
            </div>
          )}

          {/* ログインフォーム */}
          <div style={{ display: 'grid', gap: '20px' }}>
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#1f2937'
              }}>
                メールアドレス
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={20} style={{
                  position: 'absolute',
                  left: '15px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9ca3af'
                }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="admin@example.com"
                  style={{
                    width: '100%',
                    padding: '12px 15px 12px 45px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '10px',
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                />
              </div>
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#1f2937'
              }}>
                パスワード
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={20} style={{
                  position: 'absolute',
                  left: '15px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9ca3af'
                }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    padding: '12px 15px 12px 45px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '10px',
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                />
              </div>
            </div>

            <button
              onClick={handleLogin}
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                background: loading 
                  ? '#9ca3af' 
                  : 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 15px rgba(59, 130, 246, 0.3)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(59, 130, 246, 0.3)';
              }}
            >
              {loading ? 'ログイン中...' : '管理者ダッシュボードにログイン'}
            </button>

            {/* Google OAuth セクション */}
            <div style={{
              position: 'relative',
              textAlign: 'center',
              marginTop: '10px'
            }}>
              <div style={{
                position: 'relative',
                marginBottom: '20px'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: 0,
                  right: 0,
                  height: '1px',
                  background: '#e5e7eb'
                }}></div>
                <span style={{
                  position: 'relative',
                  background: 'rgba(255, 255, 255, 0.98)',
                  padding: '0 15px',
                  color: '#666',
                  fontSize: '14px'
                }}>
                  または
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center' }}>
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

          {/* セキュリティ警告 */}
          <div style={{
            marginTop: '30px',
            padding: '15px',
            background: 'rgba(59, 130, 246, 0.05)',
            borderRadius: '10px',
            borderLeft: '4px solid #3b82f6'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'start',
              gap: '10px'
            }}>
              <Shield size={18} color="#3b82f6" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.6' }}>
                <strong style={{ color: '#1e3a8a' }}>セキュリティ注意</strong><br />
                このページはシステム管理者専用です。<br />
                認証情報は厳重に管理してください。
              </div>
            </div>
          </div>

          {/* フッター */}
          <div style={{
            marginTop: '30px',
            textAlign: 'center',
            fontSize: '12px',
            color: '#999'
          }}>
            Powered by KEYRON | SaaS Edition v4.0.0
          </div>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
};

export default SuperAdminLoginPage;