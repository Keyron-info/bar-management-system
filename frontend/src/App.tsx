import React, { useState, useEffect } from 'react';
import './App.css';

// ページコンポーネントのインポート
import LoginPage from './pages/LoginPage';
import PersonalPage from './pages/PersonalPage';
import StorePage from './pages/StorePage';
import DailyReportPage from './pages/DailyReportPage';
import ShiftPage from './pages/ShiftPage';
import SettingsPage from './pages/SettingsPage';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

type PageType = 'personal' | 'store' | 'daily-report' | 'shift' | 'settings';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<PageType>('personal');
  const [loading, setLoading] = useState(true);

  // ページ読み込み時にトークンをチェック
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setCurrentPage('personal');
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', color: '#666' }}>読み込み中...</div>
        </div>
      </div>
    );
  }

  // ログインしていない場合
  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  // ナビゲーションメニューの定義
  const navigationItems = [
    { key: 'personal', label: '個人ページ', icon: '👤' },
    ...(user.role === 'manager' ? [{ key: 'store' as PageType, label: '店舗ページ', icon: '🏪' }] : []),
    { key: 'daily-report', label: '日報ページ', icon: '📝' },
    { key: 'shift', label: 'シフト調整', icon: '📅' },
    { key: 'settings', label: '設定', icon: '⚙️' },
  ];

  // 現在のページコンポーネントを取得
  const getCurrentPageComponent = () => {
    switch (currentPage) {
      case 'personal':
        return <PersonalPage user={user} />;
      case 'store':
        return <StorePage user={user} />;
      case 'daily-report':
        return <DailyReportPage user={user} />;
      case 'shift':
        return <ShiftPage user={user} />;
      case 'settings':
        return <SettingsPage user={user} onLogout={handleLogout} />;
      default:
        return <PersonalPage user={user} />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* ヘッダー */}
      <header style={{
        backgroundColor: '#2c3e50',
        color: 'white',
        padding: '0',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 1000
      }}>
        {/* トップバー */}
        <div style={{
          padding: '12px 20px',
          borderBottom: '1px solid #34495e',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h1 style={{ 
            margin: 0, 
            fontSize: '20px',
            fontWeight: 'bold'
          }}>
            🍻 バー管理システム
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ fontSize: '14px' }}>
              {user.name}さん ({user.role === 'manager' ? '店長' : '従業員'})
            </span>
            <button
              onClick={handleLogout}
              style={{
                backgroundColor: '#e74c3c',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              ログアウト
            </button>
          </div>
        </div>

        {/* ナビゲーションメニュー */}
        <nav style={{
          display: 'flex',
          padding: '0 20px',
          gap: '0'
        }}>
          {navigationItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setCurrentPage(item.key)}
              style={{
                backgroundColor: currentPage === item.key ? '#34495e' : 'transparent',
                color: 'white',
                border: 'none',
                padding: '12px 20px',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderRadius: '0',
                borderBottom: currentPage === item.key ? '3px solid #3498db' : '3px solid transparent',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                if (currentPage !== item.key) {
                  e.currentTarget.style.backgroundColor = '#34495e';
                }
              }}
              onMouseLeave={(e) => {
                if (currentPage !== item.key) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </header>

      {/* メインコンテンツ */}
      <main style={{ 
        padding: '20px',
        maxWidth: '1200px',
        margin: '0 auto',
        minHeight: 'calc(100vh - 120px)'
      }}>
        {getCurrentPageComponent()}
      </main>

      {/* フッター */}
      <footer style={{
        backgroundColor: '#2c3e50',
        color: 'white',
        textAlign: 'center',
        padding: '15px',
        fontSize: '12px'
      }}>
        <div>Powered by KEYRON</div>
      </footer>
    </div>
  );
}

export default App;