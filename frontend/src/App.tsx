import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Auth from './components/Auth';
import SalesInput from './components/SalesInput';
import SalesSummary from './components/SalesSummary';
import './App.css';

interface HealthResponse {
  status: string;
  message: string;
}

interface SalesData {
  id: number;
  date: string;
  employee_name: string;
  total_sales: number;
  drink_count: number;
  champagne_count: number;
  catch_count: number;
  work_hours: number;
}

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

function App() {
  // 認証状態
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // アプリケーション状態
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 認証ヘッダーを含むaxiosインスタンスを作成
  const createAuthenticatedRequest = () => {
    if (token) {
      return axios.create({
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    }
    return axios;
  };

  const fetchHealth = async () => {
    try {
      const response = await axios.get<HealthResponse>('https://bar-management-system.onrender.com/api/health');
      setHealthData(response.data);
    } catch (err) {
      setError('APIとの通信に失敗しました');
    }
  };

  const fetchSales = async () => {
    try {
      const axiosInstance = createAuthenticatedRequest();
      const response = await axiosInstance.get<SalesData[]>('https://bar-management-system.onrender.com/api/sales');
      setSalesData(response.data);
    } catch (err) {
      console.error('売上データの取得に失敗しました');
    }
  };

  const handleAuthSuccess = (userData: User, accessToken: string) => {
    setUser(userData);
    setToken(accessToken);
    setIsAuthenticated(true);
    
    // ローカルストレージに保存（オプション）
    localStorage.setItem('token', accessToken);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    setSalesData([]);
    
    // ローカルストレージをクリア
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  // 初期化時にローカルストレージから認証情報を復元
  useEffect(() => {
    const initializeAuth = async () => {
      const savedToken = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');
      
      if (savedToken && savedUser) {
        try {
          // トークンの有効性を確認
          const response = await axios.get('https://bar-management-system.onrender.com/api/auth/me', {
            headers: { 'Authorization': `Bearer ${savedToken}` }
          });
          
          setUser(JSON.parse(savedUser));
          setToken(savedToken);
          setIsAuthenticated(true);
        } catch (err) {
          // トークンが無効な場合はクリア
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      
      await fetchHealth();
      setLoading(false);
    };
    
    initializeAuth();
  }, []);

  // 認証状態が変わったときに売上データを取得
  useEffect(() => {
    if (isAuthenticated) {
      fetchSales();
    }
  }, [isAuthenticated, token]);

  const handleSalesAdded = () => {
    fetchSales();
  };

  if (loading) {
    return (
      <div className="container">
        <div className="card">
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  // 未認証の場合は認証画面を表示
  if (!isAuthenticated) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  // 認証済みの場合はメインアプリケーションを表示
  return (
    <div className="container">
      <div className="card">
        <div className="header-section">
          <h1>🍻 バー管理システム</h1>
          <div className="user-info">
            <span>👤 {user?.name} ({user?.role === 'manager' ? '店長' : '従業員'})</span>
            <button onClick={handleLogout} className="logout-button">
              ログアウト
            </button>
          </div>
        </div>
        
        <div className="status-section">
          <h2>システム状態</h2>
          
          {error && (
            <div style={{ color: 'red' }}>
              <p>❌ {error}</p>
            </div>
          )}
          
          {healthData && (
            <div style={{ color: 'green' }}>
              <p>✅ バックエンド接続: {healthData.status}</p>
              <p>📡 {healthData.message}</p>
            </div>
          )}
        </div>
      </div>

      <SalesInput onSalesAdded={handleSalesAdded} />
      <SalesSummary />

      <div className="card">
        <h2>📈 売上データ一覧</h2>
        
        {salesData.length === 0 ? (
          <p>まだ売上データが登録されていません。</p>
        ) : (
          <div className="sales-list">
            {salesData.map((sales) => (
              <div key={sales.id} className="sales-item">
                <div className="sales-header">
                  {sales.date} - {sales.employee_name}
                </div>
                <div className="sales-details">
                  <span>💰 売上: ¥{sales.total_sales.toLocaleString()}</span>
                  <span>🍹 ドリンク: {sales.drink_count}杯</span>
                  <span>🍾 シャンパン: {sales.champagne_count}杯</span>
                  <span>👥 キャッチ: {sales.catch_count}人</span>
                  <span>⏰ 稼働: {sales.work_hours}時間</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;