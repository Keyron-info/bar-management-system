import React, { useState, useEffect } from 'react';
import { Bell, LogOut, Settings, TrendingUp, BarChart3 } from 'lucide-react';
import axios from 'axios';
import './PersonalPage.css';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

interface PersonalPageProps {
  user: User;
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
  created_at: string;
}

interface MonthlySummary {
  year: number;
  month: number;
  total_sales: number;
  drink_count: number;
  champagne_count: number;
}

const PersonalPage: React.FC<PersonalPageProps> = ({ user }) => {
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null);
  const [monthlyGoal, setMonthlyGoal] = useState<number>(500000);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPersonalData();
  }, []);

  const fetchPersonalData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const salesResponse = await axios.get(
        'https://bar-management-system.onrender.com/api/sales',
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      const summaryResponse = await axios.get(
        'https://bar-management-system.onrender.com/api/sales/monthly-summary',
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      setSalesData(salesResponse.data);
      setMonthlySummary(summaryResponse.data);
    } catch (error) {
      console.error('データ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const achievementRate = monthlySummary ? (monthlySummary.total_sales / monthlyGoal) * 100 : 0;

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const thisMonthData = salesData.filter(item => {
    const itemDate = new Date(item.date);
    return itemDate.getMonth() + 1 === currentMonth && itemDate.getFullYear() === currentYear;
  });

  if (loading) {
    return (
      <div className="dashboard-container">
        <div style={{ 
          textAlign: 'center', 
          padding: '40px', 
          color: '#666',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '200px'
        }}>
          データを読み込んでいます...
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header Section */}
      <div className="header">
        <div className="user-info">
          <span className="user-name">{user.name}さん（店員）</span>
        </div>
        <div className="header-icons">
          <Bell className="icon-bell" />
          <div style={{
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            background: 'linear-gradient(90deg, #9333EA 0%, #F0E 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}>
            <LogOut className="icon-logout" size={13} color="white" />
          </div>
        </div>
      </div>

      {/* Monthly Goal Card */}
      <div className="goal-card">
        <div className="goal-header">
          <span className="goal-title">今月の目標</span>
          <Settings size={18} style={{ color: '#9333EA' }} />
        </div>
        <div className="goal-amount">
          {Math.floor(monthlyGoal / 10000)}万円
        </div>
        <div className="progress-bar-container">
          <div 
            className="progress-bar-fill" 
            style={{ width: `${Math.min(100, achievementRate)}%` }}
          />
        </div>
        <div className="progress-percentage">
          {achievementRate.toFixed(1)}%
        </div>
      </div>

      {/* Chart Section */}
      <div className="chart-card">
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px',
          boxSizing: 'border-box'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '20px',
            color: '#9333EA',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            <TrendingUp size={18} />
            売上推移グラフ
          </div>
          
          {/* Simple bar chart representation */}
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'end',
            gap: '8px',
            padding: '20px 0'
          }}>
            {thisMonthData.slice(-7).map((item, index) => {
              const maxSales = Math.max(...thisMonthData.map(d => d.total_sales));
              const height = maxSales > 0 ? (item.total_sales / maxSales) * 150 : 20;
              
              return (
                <div key={index} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  flex: 1
                }}>
                  <div style={{
                    width: '20px',
                    height: `${height}px`,
                    background: 'linear-gradient(180deg, #9333EA 0%, #F0E 100%)',
                    borderRadius: '2px',
                    minHeight: '20px'
                  }} />
                  <div style={{
                    fontSize: '10px',
                    color: '#666',
                    transform: 'rotate(-45deg)',
                    whiteSpace: 'nowrap'
                  }}>
                    {new Date(item.date).getDate()}日
                  </div>
                </div>
              );
            })}
          </div>
          
          {thisMonthData.length === 0 && (
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#666',
              fontSize: '14px'
            }}>
              データがありません
            </div>
          )}
        </div>
      </div>

      {/* Key Metrics Section */}
      <div className="metrics-container">
        {/* 総売上 */}
        <div className="metrics-card-large">
          <span className="metrics-title">総売上</span>
          <span className="metrics-value">
            {Math.floor((monthlySummary?.total_sales || 0) / 10000)}万円
          </span>
        </div>

        {/* 右側の小さなカード */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div className="metrics-card-small">
            <span className="metrics-title">ドリンク杯数</span>
            <span className="metrics-value-small">
              {monthlySummary?.drink_count || 0}杯
            </span>
          </div>
          
          <div className="metrics-card-small">
            <span className="metrics-title">キャッチ数</span>
            <span className="metrics-value-small">
              {thisMonthData.reduce((sum, item) => sum + item.catch_count, 0)}杯
            </span>
          </div>
          
          <div className="metrics-card-small">
            <span className="metrics-title">出勤日数</span>
            <span className="metrics-value-small">
              {thisMonthData.length}日
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="bottom-nav">
        <div className="nav-icon" style={{ cursor: 'pointer' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
          </svg>
        </div>
        
        <div className="nav-icon" style={{ cursor: 'pointer' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        </div>
        
        <div className="nav-icon" style={{ 
          cursor: 'pointer',
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          borderRadius: '50%',
          padding: '4px'
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </div>
        
        <div className="nav-icon" style={{ cursor: 'pointer' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
          </svg>
        </div>
        
        <div className="nav-icon" style={{ cursor: 'pointer' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
          </svg>
        </div>
      </div>
    </div>
  );
};

export default PersonalPage;