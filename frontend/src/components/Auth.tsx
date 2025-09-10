import React, { useState } from 'react';
import axios from 'axios';

interface AuthProps {
  onAuthSuccess: (user: any, token: string) => void;
}

interface AuthData {
  email: string;
  password: string;
  name: string;
  role: string;
}

const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState<AuthData>({
    email: '',
    password: '',
    name: '',
    role: 'staff'
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const data = isLogin 
        ? { email: formData.email, password: formData.password }
        : formData;

      const response = await axios.post(`http://localhost:8002${endpoint}`, data);
      
      if (isLogin) {
        // ログイン成功
        const { access_token, user } = response.data;
        onAuthSuccess(user, access_token);
        setMessage('✅ ログインしました');
      } else {
        // 登録成功
        setMessage('✅ 登録完了しました。ログインしてください。');
        setIsLogin(true);
        setFormData({
          email: formData.email,
          password: '',
          name: '',
          role: 'staff'
        });
      }
    } catch (error: any) {
      if (error.response?.data?.detail) {
        setMessage(`❌ ${error.response.data.detail}`);
      } else {
        setMessage(`❌ ${isLogin ? 'ログイン' : '登録'}に失敗しました`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>{isLogin ? '🔐 ログイン' : '👤 ユーザー登録'}</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>
              メールアドレス:
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="example@bar.com"
              />
            </label>
          </div>

          <div className="form-group">
            <label>
              パスワード:
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="パスワードを入力"
              />
            </label>
          </div>

          {!isLogin && (
            <>
              <div className="form-group">
                <label>
                  名前:
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="山田太郎"
                  />
                </label>
              </div>

              <div className="form-group">
                <label>
                  役職:
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                  >
                    <option value="staff">従業員</option>
                    <option value="manager">店長</option>
                  </select>
                </label>
              </div>
            </>
          )}

          <button type="submit" disabled={loading} className="auth-button">
            {loading ? '処理中...' : (isLogin ? 'ログイン' : '登録')}
          </button>
        </form>

        <div className="auth-switch">
          {isLogin ? (
            <p>
              アカウントをお持ちでない方は{' '}
              <button 
                type="button" 
                className="link-button"
                onClick={() => setIsLogin(false)}
              >
                こちらから登録
              </button>
            </p>
          ) : (
            <p>
              既にアカウントをお持ちの方は{' '}
              <button 
                type="button" 
                className="link-button"
                onClick={() => setIsLogin(true)}
              >
                こちらからログイン
              </button>
            </p>
          )}
        </div>

        {message && (
          <div className={`auth-message ${message.includes('✅') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default Auth;