import React, { useState } from 'react';
import { API_BASE_URL } from '../config';
import { Mail, Lock, User, Building2, ArrowLeft, CheckCircle } from 'lucide-react';

interface RegisterPageProps {
  onRegisterSuccess: () => void;
  onBackToLogin: () => void;
}

const RegisterPage: React.FC<RegisterPageProps> = ({ onRegisterSuccess, onBackToLogin }) => {
  const [step, setStep] = useState<'verify' | 'register'>('verify');
  const [storeCode, setStoreCode] = useState('');
  const [storeName, setStoreName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('error');

  // 店舗コード検証
  const handleVerifyStore = async () => {
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-store-code/${storeCode}`);
      const data = await response.json();

      if (response.ok) {
        setStoreName(data.store_name);
        setStep('register');
        setMessageType('success');
        setMessage(`店舗「${data.store_name}」が見つかりました`);
      } else {
        setMessageType('error');
        setMessage(data.detail || '店舗コードが見つかりません');
      }
    } catch (error) {
      console.error('店舗コード検証エラー:', error);
      setMessageType('error');
      setMessage('通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  // アカウント登録
  const handleRegister = async () => {
    // パスワード確認
    if (password !== confirmPassword) {
      setMessageType('error');
      setMessage('パスワードが一致しません');
      return;
    }

    // パスワード強度チェック（フロント側）
    if (password.length < 8) {
      setMessageType('error');
      setMessage('パスワードは8文字以上である必要があります');
      return;
    }

    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasDigit = /[0-9]/.test(password);

    if (!hasUpper || !hasLower || !hasDigit) {
      setMessageType('error');
      setMessage('パスワードには大文字、小文字、数字を含める必要があります');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/employee/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          store_code: storeCode,
          name: name,
          email: email,
          password: password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessageType('success');
        setMessage('アカウント作成完了！ログインページに移動します...');
        
        // 2秒後にログインページに戻る
        setTimeout(() => {
          onRegisterSuccess();
        }, 2000);
      } else {
        setMessageType('error');
        setMessage(data.detail || 'アカウント作成に失敗しました');
      }
    } catch (error) {
      console.error('登録エラー:', error);
      setMessageType('error');
      setMessage('通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '450px',
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '20px',
        padding: '40px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
      }}>
        {/* 戻るボタン */}
        <button
          onClick={step === 'verify' ? onBackToLogin : () => setStep('verify')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            color: '#667eea',
            cursor: 'pointer',
            fontSize: '14px',
            marginBottom: '20px',
            padding: '0'
          }}
        >
          <ArrowLeft size={16} />
          {step === 'verify' ? 'ログインに戻る' : '店舗コード入力に戻る'}
        </button>

        {/* ヘッダー */}
        <div style={{
          marginBottom: '30px',
          textAlign: 'center'
        }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '10px'
          }}>
            {step === 'verify' ? '新規アカウント作成' : 'プロフィール入力'}
          </h1>
          <p style={{
            color: '#666',
            fontSize: '14px'
          }}>
            {step === 'verify' 
              ? '店舗コードを入力してください' 
              : `${storeName} のアカウントを作成`
            }
          </p>
        </div>

        {/* ステップインジケーター */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '15px',
          marginBottom: '30px'
        }}>
          <div style={{
            width: '40px',
            height: '4px',
            borderRadius: '2px',
            background: '#667eea'
          }} />
          <div style={{
            width: '40px',
            height: '4px',
            borderRadius: '2px',
            background: step === 'register' ? '#667eea' : '#e0e0e0'
          }} />
        </div>

        {/* Step 1: 店舗コード検証 */}
        {step === 'verify' && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#333'
              }}>
                店舗コード
              </label>
              <div style={{
                position: 'relative'
              }}>
                <Building2 size={20} style={{
                  position: 'absolute',
                  left: '15px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#999'
                }} />
                <input
                  type="text"
                  value={storeCode}
                  onChange={(e) => setStoreCode(e.target.value.toUpperCase())}
                  onKeyPress={(e) => e.key === 'Enter' && handleVerifyStore()}
                  placeholder="例: BAR_ABC12345"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 15px 12px 45px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '10px',
                    fontSize: '16px',
                    outline: 'none',
                    transition: 'border-color 0.3s',
                    fontFamily: 'monospace'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#e0e0e0'}
                />
              </div>
              <p style={{
                marginTop: '8px',
                fontSize: '12px',
                color: '#999'
              }}>
                店舗から配布された店舗コードを入力してください
              </p>
            </div>

            <button
              onClick={handleVerifyStore}
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                background: loading 
                  ? '#ccc' 
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
              }}
            >
              {loading ? '確認中...' : '次へ'}
            </button>
          </div>
        )}

        {/* Step 2: プロフィール入力 */}
        {step === 'register' && (
          <div>
            {/* 店舗名表示 */}
            <div style={{
              background: 'rgba(102, 126, 234, 0.1)',
              padding: '15px',
              borderRadius: '10px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <CheckCircle size={20} style={{ color: '#667eea' }} />
              <div>
                <div style={{ fontSize: '12px', color: '#666' }}>登録先店舗</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#667eea' }}>
                  {storeName}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#333'
              }}>
                名前
              </label>
              <div style={{ position: 'relative' }}>
                <User size={20} style={{
                  position: 'absolute',
                  left: '15px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#999'
                }} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="山田 太郎"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 15px 12px 45px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '10px',
                    fontSize: '16px',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#e0e0e0'}
                />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#333'
              }}>
                メールアドレス
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={20} style={{
                  position: 'absolute',
                  left: '15px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#999'
                }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 15px 12px 45px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '10px',
                    fontSize: '16px',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#e0e0e0'}
                />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#333'
              }}>
                パスワード
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={20} style={{
                  position: 'absolute',
                  left: '15px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#999'
                }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8文字以上（大文字・小文字・数字を含む）"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 15px 12px 45px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '10px',
                    fontSize: '16px',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#e0e0e0'}
                />
              </div>
            </div>

            <div style={{ marginBottom: '30px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#333'
              }}>
                パスワード（確認）
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={20} style={{
                  position: 'absolute',
                  left: '15px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#999'
                }} />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleRegister()}
                  placeholder="もう一度パスワードを入力"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 15px 12px 45px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '10px',
                    fontSize: '16px',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#e0e0e0'}
                />
              </div>
            </div>

            <button
              onClick={handleRegister}
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                background: loading 
                  ? '#ccc' 
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
              }}
            >
              {loading ? '作成中...' : 'アカウントを作成'}
            </button>
          </div>
        )}

        {/* メッセージ表示 */}
        {message && (
          <div style={{
            marginTop: '20px',
            padding: '15px',
            borderRadius: '10px',
            background: messageType === 'success' 
              ? 'rgba(34, 197, 94, 0.1)' 
              : 'rgba(239, 68, 68, 0.1)',
            border: `2px solid ${messageType === 'success' ? '#22c55e' : '#ef4444'}`,
            color: messageType === 'success' ? '#166534' : '#991b1b',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            {message}
          </div>
        )}

        {/* フッター */}
        <div style={{
          marginTop: '30px',
          textAlign: 'center',
          fontSize: '12px',
          color: '#999'
        }}>
          Powered by KEYRON | SaaS Edition
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;