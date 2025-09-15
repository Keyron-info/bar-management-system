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
      width: '390px',
      height: '844px',
      position: 'relative',
      background: 'linear-gradient(223deg, #3A0E47 0%, #AB3AA4 47%, #521364 100%)',
      overflow: 'hidden',
      margin: '0 auto',
      fontFamily: 'Narnoor, sans-serif'
    }}>
      {/* Log in header */}
      <div style={{
        width: '104.47px',
        height: '25.87px',
        left: '26px',
        top: '274px',
        position: 'absolute',
        opacity: 0.8,
        textAlign: 'center',
        color: 'white',
        fontSize: '19.90px',
        fontFamily: 'Narnoor, sans-serif',
        fontWeight: 400,
        wordWrap: 'break-word'
      }}>
        Log in
      </div>

      <form onSubmit={handleAuth}>
        {/* Name field for registration */}
        {!isLogin && (
          <div style={{ position: 'relative' }}>
            <div style={{
              width: '23.88px',
              height: '23.88px',
              left: '54.85px',
              top: '310px',
              position: 'absolute',
              overflow: 'hidden'
            }}>
              <User size={20} style={{ 
                color: 'rgba(255, 255, 255, 0.8)',
                position: 'absolute',
                top: '2px',
                left: '2px'
              }} />
            </div>
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required={!isLogin}
              style={{
                width: '214px',
                height: '30px',
                left: '100.13px',
                top: '305px',
                position: 'absolute',
                opacity: 0.8,
                color: 'white',
                fontSize: '19.90px',
                fontFamily: 'Narnoor, sans-serif',
                fontWeight: 400,
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid rgba(255, 255, 255, 0.4)',
                outline: 'none',
                paddingBottom: '5px'
              }}
            />
          </div>
        )}

        {/* Email field */}
        <div style={{ position: 'relative' }}>
          <div style={{
            width: '214px',
            height: '30px',
            left: '100.13px',
            top: isLogin ? '321.42px' : '361.42px',
            position: 'absolute',
            opacity: 0.8,
            color: 'white',
            fontSize: '19.90px',
            fontFamily: 'Narnoor, sans-serif',
            fontWeight: 400,
            wordWrap: 'break-word'
          }}>
            Email adress
          </div>
          <div style={{
            width: '23.88px',
            height: '23.88px',
            left: '54.85px',
            top: isLogin ? '326.73px' : '366.73px',
            position: 'absolute',
            overflow: 'hidden'
          }}>
            <div style={{
              width: '19.90px',
              height: '15.92px',
              left: '1.99px',
              top: '3.98px',
              position: 'absolute',
              background: 'rgba(255, 255, 255, 0.80)'
            }}></div>
          </div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: '214px',
              height: '30px',
              left: '100.13px',
              top: isLogin ? '351.42px' : '391.42px',
              position: 'absolute',
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid rgba(255, 255, 255, 0.4)',
              color: 'white',
              fontSize: '16px',
              fontFamily: 'Narnoor, sans-serif',
              outline: 'none',
              paddingBottom: '5px'
            }}
          />
        </div>

        {/* Password field */}
        <div style={{ position: 'relative' }}>
          <div style={{
            width: '225px',
            height: '26px',
            left: '100.13px',
            top: isLogin ? '369.42px' : '409.42px',
            position: 'absolute',
            opacity: 0.8,
            color: 'white',
            fontSize: '19.90px',
            fontFamily: 'Narnoor, sans-serif',
            fontWeight: 400,
            wordWrap: 'break-word'
          }}>
            Password
          </div>
          <div style={{
            width: '18px',
            height: '20.25px',
            left: '58.13px',
            top: isLogin ? '373.42px' : '413.42px',
            position: 'absolute',
            background: 'white'
          }}></div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: '225px',
              height: '26px',
              left: '100.13px',
              top: isLogin ? '399.42px' : '439.42px',
              position: 'absolute',
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid rgba(255, 255, 255, 0.4)',
              color: 'white',
              fontSize: '16px',
              fontFamily: 'Narnoor, sans-serif',
              outline: 'none',
              paddingBottom: '5px'
            }}
          />
        </div>

        {/* Role selection for registration */}
        {!isLogin && (
          <div style={{ position: 'relative' }}>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{
                width: '214px',
                left: '100.13px',
                top: '479.42px',
                position: 'absolute',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '8px',
                fontSize: '16px',
                color: 'white',
                outline: 'none',
                padding: '10px',
                fontFamily: 'Narnoor, sans-serif'
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
          style={{
            width: '280px',
            height: '45px',
            left: '55px',
            top: isLogin ? '440px' : '520px',
            position: 'absolute',
            background: 'rgba(255, 255, 255, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '8px',
            color: 'white',
            fontSize: '16px',
            fontWeight: '500',
            fontFamily: 'Narnoor, sans-serif',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            transition: 'all 0.3s ease'
          }}
        >
          {loading ? '処理中...' : isLogin ? 'Login to your account' : 'Create account'}
        </button>

        {/* Remember me and Sign up link */}
        <div style={{
          position: 'absolute',
          top: isLogin ? '485.42px' : '565.42px',
          left: '50px',
          right: '50px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          {/* Remember me checkbox */}
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer'
          }}>
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
            <div style={{
              color: 'white',
              fontSize: '12px',
              fontFamily: 'Neuton, sans-serif',
              fontWeight: 400
            }}>
              remember me
            </div>
          </label>

          {/* Sign up link */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <div style={{
              color: 'rgba(255, 255, 255, 0.60)',
              fontSize: '12px',
              fontFamily: 'Neuton, sans-serif',
              fontWeight: 400
            }}>
              {isLogin ? 'New here?' : 'Already have account?'}
            </div>
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontSize: '12px',
                fontFamily: 'Neuton, sans-serif',
                fontWeight: 400,
                textDecoration: 'none'
              }}
            >
              {isLogin ? 'Sign in!' : 'Login!'}
            </button>
          </div>
        </div>
      </form>

      {/* Message display */}
      {message && (
        <div style={{
          position: 'absolute',
          top: isLogin ? '540px' : '620px',
          left: '30px',
          right: '30px',
          padding: '15px',
          borderRadius: '8px',
          backgroundColor: message.includes('完了') ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          border: `1px solid ${message.includes('完了') ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)'}`,
          color: 'white',
          fontSize: '14px',
          textAlign: 'center',
          fontFamily: 'Neuton, sans-serif'
        }}>
          {message}
        </div>
      )}

      {/* Footer */}
      <div style={{
        position: 'absolute',
        bottom: '40px',
        left: '0',
        right: '0',
        textAlign: 'center',
        fontSize: '12px',
        color: 'rgba(255, 255, 255, 0.5)',
        fontFamily: 'Neuton, sans-serif'
      }}>
        Powered by KEYRON
      </div>
    </div>
  );
};

export default LoginPage;