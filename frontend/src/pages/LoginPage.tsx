import React, { useState } from 'react';

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
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#ecf0f1', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      padding: '20px'
    }}>
      <div style={{ 
        backgroundColor: 'white', 
        padding: '40px', 
        borderRadius: '12px', 
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '420px'
      }}>
        {/* ロゴ・タイトル */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ 
            fontSize: '48px', 
            marginBottom: '10px' 
          }}>
            🍻
          </div>
          <h1 style={{ 
            margin: 0, 
            fontSize: '28px', 
            color: '#2c3e50',
            fontWeight: '600'
          }}>
            バー管理システム
          </h1>
          <p style={{ 
            margin: '10px 0 0 0', 
            color: '#7f8c8d',
            fontSize: '14px'
          }}>
            売上・スタッフ管理を効率化
          </p>
        </div>
        
        {/* タブ切り替え */}
        <div style={{ 
          marginBottom: '30px', 
          display: 'flex',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          padding: '4px'
        }}>
          <button
            onClick={() => setIsLogin(true)}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: isLogin ? '#3498db' : 'transparent',
              color: isLogin ? 'white' : '#7f8c8d',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.3s ease'
            }}
          >
            ログイン
          </button>
          <button
            onClick={() => setIsLogin(false)}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: !isLogin ? '#3498db' : 'transparent',
              color: !isLogin ? 'white' : '#7f8c8d',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.3s ease'
            }}
          >
            新規登録
          </button>
        </div>

        {/* フォーム */}
        <form onSubmit={handleAuth}>
          {!isLogin && (
            <>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '6px', 
                  color: '#2c3e50',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  名前
                </label>
                <input
                  type="text"
                  placeholder="山田太郎"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e1e8ed',
                    borderRadius: '8px',
                    fontSize: '16px',
                    boxSizing: 'border-box',
                    outline: 'none',
                    transition: 'border-color 0.3s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3498db'}
                  onBlur={(e) => e.target.style.borderColor = '#e1e8ed'}
                />
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '6px', 
                  color: '#2c3e50',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  役職
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e1e8ed',
                    borderRadius: '8px',
                    fontSize: '16px',
                    boxSizing: 'border-box',
                    outline: 'none',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="staff">従業員</option>
                  <option value="manager">店長</option>
                </select>
              </div>
            </>
          )}
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '6px', 
              color: '#2c3e50',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              メールアドレス
            </label>
            <input
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e1e8ed',
                borderRadius: '8px',
                fontSize: '16px',
                boxSizing: 'border-box',
                outline: 'none',
                transition: 'border-color 0.3s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3498db'}
              onBlur={(e) => e.target.style.borderColor = '#e1e8ed'}
            />
          </div>
          
          <div style={{ marginBottom: '30px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '6px', 
              color: '#2c3e50',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              パスワード
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e1e8ed',
                borderRadius: '8px',
                fontSize: '16px',
                boxSizing: 'border-box',
                outline: 'none',
                transition: 'border-color 0.3s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3498db'}
              onBlur={(e) => e.target.style.borderColor = '#e1e8ed'}
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: loading ? '#bdc3c7' : '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.3s ease'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = '#2980b9';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = '#3498db';
              }
            }}
          >
            {loading ? '処理中...' : (isLogin ? 'ログイン' : '登録')}
          </button>
        </form>

        {/* メッセージ表示 */}
        {message && (
          <div style={{
            marginTop: '20px',
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: message.includes('完了') ? '#d5f4e6' : '#fdeaea',
            border: `1px solid ${message.includes('完了') ? '#27ae60' : '#e74c3c'}`,
            color: message.includes('完了') ? '#27ae60' : '#e74c3c',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            {message}
          </div>
        )}

        {/* フッター */}
        <div style={{
          marginTop: '40px',
          textAlign: 'center',
          fontSize: '12px',
          color: '#95a5a6'
        }}>
          Powered by KEYRON
        </div>
      </div>
    </div>
  );
};

export default LoginPage;