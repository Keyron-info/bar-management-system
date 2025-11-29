import React, { useState, useEffect } from 'react';
import './App.css';

// ページコンポーネントのインポート
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PersonalPage from './pages/PersonalPage';
import StorePage from './pages/StorePage';
import DailyReportPage from './pages/DailyReportPage';
import ShiftPage from './pages/ShiftPage';
import SettingsPage from './pages/SettingsPage';
import ReportHistoryPage from './pages/ReportHistoryPage';
import SuperAdminLoginPage from './pages/SuperAdminLoginPage';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import ReceiptScanPage from './pages/ReceiptScanPage';

// 通知システムのインポート
import { NotificationProvider, NotificationBell, useNotifications } from './components/NotificationSystem';
interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  store_id?: number;
  employee_code?: string;
}

interface Store {
  id: number;
  name: string;
  code: string;
  subscription_status: string;
  monthly_goal: number;
}

type PageType = 'personal' | 'store' | 'daily-report' | 'shift' | 'settings' | 'report-history' | 'receipt-scan';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [currentPage, setCurrentPage] = useState<PageType>('personal');
  const [showRegister, setShowRegister] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [isAdminMode, setIsAdminMode] = useState(false);

  // ページ読み込み時にトークンをチェック
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    const storeData = localStorage.getItem('store');
    
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
        if (storeData) {
          setStore(JSON.parse(storeData));
        }
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('store');
      }
    }

    // 管理者チェック
    const adminToken = localStorage.getItem('admin_token');
    const adminData = localStorage.getItem('admin_user');
    
    if (adminToken && adminData) {
      try {
        setAdminUser(JSON.parse(adminData));
        setIsAdminMode(true);
      } catch (error) {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
      }
    }

    setLoading(false);

    // カスタムナビゲーションイベントのリスナー
    const handleNavigate = (event: CustomEvent) => {
      const page = event.detail as PageType;
      if (page) {
        setCurrentPage(page);
      }
    };

    window.addEventListener('navigateTo', handleNavigate as EventListener);
    
    return () => {
      window.removeEventListener('navigateTo', handleNavigate as EventListener);
    };
  }, []);

  const handleLoginSuccess = () => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('store');
    setUser(null);
    setStore(null);
    setCurrentPage('personal');
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setAdminUser(null);
    setIsAdminMode(false);
  };

  const handleAdminLoginSuccess = (admin: any, token: string) => {
    setAdminUser(admin);
    setIsAdminMode(true);
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

  // 管理者モードの場合
  if (isAdminMode && adminUser) {
    return <SuperAdminDashboard admin={adminUser} onLogout={handleAdminLogout} />;
  }

  // 管理者ログインページへのアクセス
  if (window.location.pathname === '/admin' || window.location.hash === '#admin') {
    return <SuperAdminLoginPage onLoginSuccess={handleAdminLoginSuccess} />;
  }

  // ログインしていない場合
  if (!user) {
    if (showRegister) {
      return (
        <RegisterPage 
          onRegisterSuccess={() => setShowRegister(false)}
          onBackToLogin={() => setShowRegister(false)}
        />
      );
    }
    
    return (
      <LoginPage 
        onLoginSuccess={handleLoginSuccess}
        onShowRegister={() => setShowRegister(true)}
      />
    );
  }

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
      case 'report-history':
        return <ReportHistoryPage user={user} />;
      case 'receipt-scan':
        return (
          <ReceiptScanPage 
            user={user} 
            onBack={() => setCurrentPage('daily-report')}
            onReceiptAdded={() => setCurrentPage('daily-report')}
          />
        );
      default:
        return <PersonalPage user={user} />;
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f5f5f5',
      position: 'relative',
      paddingBottom: '80px'
    }}>
      <header style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '18px',
            color: 'white'
          }}>
            {user.name.charAt(0)}
          </div>
          <div>
            <div style={{ fontSize: '16px', color: 'white', fontWeight: '600' }}>
              {user.name}
            </div>
            <div style={{ 
              fontSize: '12px', 
              color: 'rgba(255,255,255,0.8)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '11px'
              }}>
                {user.role === 'owner' ? 'オーナー' : user.role === 'manager' ? '店長' : 'スタッフ'}
              </span>
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <NotificationBell />
          
          <button 
            onClick={handleLogout}
            style={{
              backgroundColor: 'rgba(255,255,255,0.15)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              backdropFilter: 'blur(10px)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.9)';
              e.currentTarget.style.borderColor = 'transparent';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
            }}
          >
            ログアウト
          </button>
        </div>
      </header>

      <main style={{ 
        padding: '20px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {getCurrentPageComponent()}
      </main>

      <footer style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '70px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        zIndex: 100,
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)'
      }}>
        {/* シフト */}
        <button
          onClick={() => setCurrentPage('shift')}
          style={{
            background: currentPage === 'shift' ? 'rgba(255,255,255,0.2)' : 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '8px 12px',
            borderRadius: '12px',
            opacity: currentPage === 'shift' ? 1 : 0.7,
            transition: 'all 0.2s ease'
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
            <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
          </svg>
          <span style={{ fontSize: '10px', marginTop: '4px' }}>シフト</span>
        </button>

        {/* 店舗（店長・オーナーのみ） */}
        {(user.role === 'manager' || user.role === 'owner') && (
          <button
            onClick={() => setCurrentPage('store')}
            style={{
              background: currentPage === 'store' ? 'rgba(255,255,255,0.2)' : 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '8px 12px',
              borderRadius: '12px',
              opacity: currentPage === 'store' ? 1 : 0.7,
              transition: 'all 0.2s ease'
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <span style={{ fontSize: '10px', marginTop: '4px' }}>店舗</span>
          </button>
        )}

        {/* マイページ */}
        <button
          onClick={() => setCurrentPage('personal')}
          style={{
            background: currentPage === 'personal' ? 'rgba(255,255,255,0.2)' : 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '8px 12px',
            borderRadius: '12px',
            opacity: currentPage === 'personal' ? 1 : 0.7,
            transition: 'all 0.2s ease'
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
          <span style={{ fontSize: '10px', marginTop: '4px' }}>マイ</span>
        </button>

        {/* 日報 */}
        <button
          onClick={() => setCurrentPage('daily-report')}
          style={{
            background: currentPage === 'daily-report' ? 'rgba(255,255,255,0.2)' : 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '8px 12px',
            borderRadius: '12px',
            opacity: currentPage === 'daily-report' ? 1 : 0.7,
            transition: 'all 0.2s ease'
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
          </svg>
          <span style={{ fontSize: '10px', marginTop: '4px' }}>日報</span>
        </button>

        {/* AI伝票スキャン */}
        <button
          onClick={() => setCurrentPage('receipt-scan')}
          style={{
            background: currentPage === 'receipt-scan' 
              ? 'linear-gradient(135deg, rgba(147,51,234,0.4), rgba(236,72,153,0.4))' 
              : 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '8px 12px',
            borderRadius: '12px',
            opacity: currentPage === 'receipt-scan' ? 1 : 0.7,
            transition: 'all 0.2s ease',
            position: 'relative'
          }}
        >
          <div style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
            animation: 'pulse 2s infinite'
          }} />
          <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
            <path d="M4 4h16v2H4V4zm0 14h16v2H4v-2zm0-7h16v2H4v-2zM2 2v20h20V2H2zm18 18H4V4h16v16z"/>
            <circle cx="12" cy="12" r="3" fill="white"/>
          </svg>
          <span style={{ fontSize: '10px', marginTop: '4px' }}>スキャン</span>
        </button>

        {/* 履歴（店長・オーナーのみ） */}
        {(user.role === 'manager' || user.role === 'owner') && (
          <button
            onClick={() => setCurrentPage('report-history')}
            style={{
              background: currentPage === 'report-history' ? 'rgba(255,255,255,0.2)' : 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '8px 12px',
              borderRadius: '12px',
              opacity: currentPage === 'report-history' ? 1 : 0.7,
              transition: 'all 0.2s ease'
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
              <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
            </svg>
            <span style={{ fontSize: '10px', marginTop: '4px' }}>履歴</span>
          </button>
        )}

        {/* 設定 */}
        <button
          onClick={() => setCurrentPage('settings')}
          style={{
            background: currentPage === 'settings' ? 'rgba(255,255,255,0.2)' : 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '8px 12px',
            borderRadius: '12px',
            opacity: currentPage === 'settings' ? 1 : 0.7,
            transition: 'all 0.2s ease'
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
          </svg>
          <span style={{ fontSize: '10px', marginTop: '4px' }}>設定</span>
        </button>
      </footer>
    </div>
  );
}

// 通知プロバイダーでラップしたApp
const AppWithNotifications = () => (
  <NotificationProvider>
    <App />
  </NotificationProvider>
);

export default AppWithNotifications;