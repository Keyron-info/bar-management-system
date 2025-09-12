import React, { useState } from 'react';
import { Mail, Lock, User } from 'lucide-react';

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
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #8B5A99 0%, #6B4C8A 50%, #5A3E7B 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Main container */}
      <div style={{
        width: '100%',
        maxWidth: '320px',
        textAlign: 'left'
      }}>
        {/* Log in header */}
        <div style={{
          marginBottom: '50px'
        }}>
          <h1 style={{
            color: 'white',
            fontSize: '28px',
            fontWeight: '300',
            margin: '0',
            letterSpacing: '0.5px'
          }}>
            Log in
          </h1>
        </div>

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Name field for registration */}
          {!isLogin && (
            <div style={{ marginBottom: '30px' }}>
              <div style={{
                position: 'relative',
                borderBottom: '1px solid rgba(255, 255, 255, 0.4)'
              }}>
                <User style={{
                  position: 'absolute',
                  left: '0',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '20px',
                  height: '20px',
                  color: 'rgba(255, 255, 255, 0.7)'
                }} />
                <input
                  type="text"
                  placeholder="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={!isLogin}
                  style={{
                    width: '100%',
                    padding: '18px 0 18px 35px',
                    background: 'transparent',
                    border: 'none',
                    fontSize: '16px',
                    color: 'white',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
          )}

          {/* Email field */}
          <div style={{ marginBottom: '30px' }}>
            <div style={{
              position: 'relative',
              borderBottom: '1px solid rgba(255, 255, 255, 0.4)'
            }}>
              <Mail style={{
                position: 'absolute',
                left: '0',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '20px',
                height: '20px',
                color: 'rgba(255, 255, 255, 0.7)'
              }} />
              <input
                type="email"
                placeholder="Email adress"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '18px 0 18px 35px',
                  background: 'transparent',
                  border: 'none',
                  fontSize: '16px',
                  color: 'white',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Password field */}
          <div style={{ marginBottom: '40px' }}>
            <div style={{
              position: 'relative',
              borderBottom: '1px solid rgba(255, 255, 255, 0.4)'
            }}>
              <Lock style={{
                position: 'absolute',
                left: '0',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '20px',
                height: '20px',
                color: 'rgba(255, 255, 255, 0.7)'
              }} />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '18px 0 18px 35px',
                  background: 'transparent',
                  border: 'none',
                  fontSize: '16px',
                  color: 'white',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Role selection for registration */}
          {!isLogin && (
            <div style={{ marginBottom: '30px' }}>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{
                  width: '100%',
                  padding: '15px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '8px',
                  fontSize: '16px',
                  color: 'white',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              >
                <option value="staff" style={{ color: '#000' }}>従業員</option>
                <option value="manager" style={{ color: '#000' }}>店長</option>
              </select>
            </div>
          )}

          {/* Login button */}
          <div style={{ marginBottom: '30px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '18px',
                background: 'rgba(255, 255, 255, 0.2)',
                color: '#8B5A99',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxSizing: 'border-box',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? '処理中...' : isLogin ? 'Login to your account' : 'Create account'}
            </button>
          </div>

          {/* Remember me and Sign up link */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '14px',
            color: 'rgba(255, 255, 255, 0.8)'
          }}>
            {/* Remember me checkbox */}
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer'
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                border: '1px solid rgba(255, 255, 255, 0.5)',
                borderRadius: '50%',
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
                    width: '16px',
                    height: '16px',
                    cursor: 'pointer'
                  }}
                />
                {rememberMe && (
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: 'white'
                  }} />
                )}
              </div>
              remember me
            </label>

            {/* Sign up link */}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.8)',
                cursor: 'pointer',
                fontSize: '14px',
                textDecoration: 'none'
              }}
            >
              {isLogin ? 'New here? Sign in!' : 'Already have account? Login!'}
            </button>
          </div>
        </form>

        {/* Message display */}
        {message && (
          <div style={{
            marginTop: '25px',
            padding: '15px',
            borderRadius: '8px',
            backgroundColor: message.includes('完了') ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            border: `1px solid ${message.includes('完了') ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)'}`,
            color: 'white',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            {message}
          </div>
        )}

        {/* Footer */}
        <div style={{
          marginTop: '60px',
          textAlign: 'center',
          fontSize: '12px',
          color: 'rgba(255, 255, 255, 0.5)'
        }}>
          Powered by KEYRON
        </div>
      </div>
    </div>
  );
};

export default LoginPage;