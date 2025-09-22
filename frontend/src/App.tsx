import React, { useState, useEffect } from 'react';
import { Bell, LogOut } from 'lucide-react';
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

  const handlePageChange = (page: string) => {
    setCurrentPage(page as PageType);
  };

  // 現在のページコンポーネントを取得
  const getCurrentPageComponent = () => {
    const pageProps = { 
      user, 
      onPageChange: handlePageChange 
    };
    
    switch (currentPage) {
      case 'personal':
        return <PersonalPage {...pageProps} />;
      case 'store':
        return <StorePage {...pageProps} />;
      case 'daily-report':
        return <DailyReportPage {...pageProps} />;
      case 'shift':
        return <ShiftPage {...pageProps} />;
      case 'settings':
        return <SettingsPage {...pageProps} onLogout={handleLogout} />;
      default:
        return <PersonalPage {...pageProps} />;
    }
  };

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner">読み込み中...</div>
      </div>
    );
  }

  // ログインしていない場合
  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  // メインアプリケーション（ヘッダー + ページ + フッター）
  return (
    <div className="app-container">
      {/* 共通ヘッダー */}
      <header className="common-header">
        <div className="header-content">
          <div className="user-info">
            <span className="user-name">
              {user.name}さん（{user.role === 'manager' ? '店長' : '店員'}）
            </span>
          </div>
          <div className="header-actions">
            <div className="notification-icon">
              <Bell size={20} />
            </div>
            <div className="profile-avatar"></div>
            <div className="logout-icon" onClick={handleLogout}>
              <LogOut size={16} />
            </div>
          </div>
        </div>
      </header>
      
      {/* メインコンテンツ */}
      <main className="main-content">
        {getCurrentPageComponent()}
      </main>
      
      {/* 共通フッター */}
      <footer className="common-footer">
        <div 
          className={`footer-nav-item ${currentPage === 'personal' ? 'active' : ''}`}
          onClick={() => handlePageChange('personal')}
        >
          <div className="nav-icon nav-icon-1"></div>
        </div>
        <div 
          className={`footer-nav-item ${currentPage === 'store' ? 'active' : ''}`}
          onClick={() => handlePageChange('store')}
        >
          <div className="nav-icon nav-icon-2"></div>
        </div>
        <div 
          className={`footer-nav-item ${currentPage === 'daily-report' ? 'active' : ''}`}
          onClick={() => handlePageChange('daily-report')}
        >
          <div className="nav-icon nav-icon-3"></div>
        </div>
        <div 
          className={`footer-nav-item ${currentPage === 'shift' ? 'active' : ''}`}
          onClick={() => handlePageChange('shift')}
        >
          <div className="nav-icon nav-icon-4"></div>
        </div>
        <div 
          className={`footer-nav-item ${currentPage === 'settings' ? 'active' : ''}`}
          onClick={() => handlePageChange('settings')}
        >
          <div className="nav-icon nav-icon-5"></div>
        </div>
      </footer>
    </div>
  );
}

export default App;