import React, { useState, useEffect } from 'react';
import './App.css';

// ページコンポーネントのインポート
import LoginPage from './pages/LoginPage';
import PersonalPage from './pages/PersonalPage';
import StorePage from './pages/StorePage';
import DailyReportPage from './pages/DailyReportPage';
import ShiftPage from './pages/ShiftPage';
import SettingsPage from './pages/SettingsPage';

// 共通コンポーネントのインポート
import CommonHeader from './components/CommonHeader';
import CommonFooter from './components/CommonFooter';

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

  // 現在のページコンポーネントを取得
  const getCurrentPageComponent = () => {
    switch (currentPage) {
      case 'personal':
        return <PersonalPage user={user!} />;
      case 'store':
        return <StorePage user={user!} />;
      case 'daily-report':
        return <DailyReportPage user={user!} />;
      case 'shift':
        return <ShiftPage user={user!} />;
      case 'settings':
        return <SettingsPage user={user!} onLogout={handleLogout} />;
      default:
        return <PersonalPage user={user!} />;
    }
  };

  return (
    <div className="app-container">
      {/* 共通ヘッダー */}
      <CommonHeader user={user} onLogout={handleLogout} />
      
      {/* メインコンテンツ */}
      <main className="main-content">
        <div className="page-container">
          {getCurrentPageComponent()}
        </div>
      </main>
      
      {/* 共通フッター */}
      <CommonFooter 
        currentPage={currentPage} 
        onPageChange={handlePageChange}
        userRole={user.role}
      />
    </div>
  );
}

export default App;