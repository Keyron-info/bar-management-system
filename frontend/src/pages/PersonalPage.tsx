import React, { useState, useEffect } from 'react';
import { Bell, LogOut, Settings, X } from 'lucide-react';
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

interface GoalSettings {
  sales: number;
  drinks: number;
  catch: number;
}

const PersonalPage: React.FC<PersonalPageProps> = ({ user }) => {
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null);
  const [goalSettings, setGoalSettings] = useState<GoalSettings>({
    sales: 500000,
    drinks: 100,
    catch: 50
  });
  const [loading, setLoading] = useState(true);
  const [showGoalSettings, setShowGoalSettings] = useState(false);
  const [chartType, setChartType] = useState<'sales' | 'drinks' | 'catch'>('sales');

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

  const achievementRate = monthlySummary ? (monthlySummary.total_sales / goalSettings.sales) * 100 : 0;

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const thisMonthData = salesData.filter(item => {
    const itemDate = new Date(item.date);
    return itemDate.getMonth() + 1 === currentMonth && itemDate.getFullYear() === currentYear;
  });

  // 過去7日間のデータ取得
  const getLast7DaysData = () => {
    const last7Days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayData = thisMonthData.find(item => item.date === dateStr);
      last7Days.push({
        date: dateStr,
        dayLabel: date.getDate() + '日',
        sales: dayData?.total_sales || 0,
        drinks: dayData?.drink_count || 0,
        catch: dayData?.catch_count || 0
      });
    }
    
    return last7Days;
  };

  const chartData = getLast7DaysData();
  const maxValue = Math.max(...chartData.map(d => {
    switch(chartType) {
      case 'sales': return d.sales;
      case 'drinks': return d.drinks;
      case 'catch': return d.catch;
      default: return 0;
    }
  }));

  const workDays = thisMonthData.length;
  const currentSales = monthlySummary?.total_sales || 0;
  const totalDrinks = monthlySummary?.drink_count || 0;
  const totalCatch = thisMonthData.reduce((acc, item) => acc + item.catch_count, 0);

  const updateGoalSettings = () => {
    // ここで実際にはAPIに保存
    setShowGoalSettings(false);
  };

  if (loading) {
    return (
      <div className="personal-page-loading">
        <div className="loading-text">データを読み込んでいます...</div>
      </div>
    );
  }

  return (
    <div className="personal-page">
      {/* Header */}
      <div className="personal-header">
        <div className="header-user">
          <span className="user-display-name">
            {user.name}さん（{user.role === 'manager' ? '店長' : '店員'}）
          </span>
        </div>
        <div className="header-actions">
          <Bell size={24} className="header-icon" />
          <div className="profile-circle" />
          <LogOut size={20} className="header-icon" />
        </div>
      </div>

      {/* Goal Card */}
      <div className="goal-section">
        <div className="goal-header">
          <span className="goal-label">今月の目標</span>
          <div className="goal-settings-icon" onClick={() => setShowGoalSettings(true)}>
            <Settings size={16} color="white" />
          </div>
        </div>
        <div className="goal-amount">{goalSettings.sales.toLocaleString()}円</div>
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${Math.min(achievementRate, 100)}%` }}
            />
          </div>
          <div className="progress-text">{Math.round(achievementRate)}%</div>
        </div>
      </div>

      {/* Performance Card */}
      <div className="performance-section">
        <div className="performance-header">
          <span className="performance-label">今月の成績</span>
        </div>
        <div className="chart-controls">
          <button 
            className={chartType === 'sales' ? 'active' : ''}
            onClick={() => setChartType('sales')}
          >
            売上
          </button>
          <button 
            className={chartType === 'drinks' ? 'active' : ''}
            onClick={() => setChartType('drinks')}
          >
            ドリンク
          </button>
          <button 
            className={chartType === 'catch' ? 'active' : ''}
            onClick={() => setChartType('catch')}
          >
            キャッチ
          </button>
        </div>
        <div className="chart-area">
          <div className="chart-bars">
            {chartData.map((day, index) => {
              const value = chartType === 'sales' ? day.sales : 
                           chartType === 'drinks' ? day.drinks : day.catch;
              const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
              
              return (
                <div key={index} className="chart-bar-container">
                  <div 
                    className="chart-bar" 
                    style={{ height: `${height}%` }}
                    title={`${day.dayLabel}: ${value}${chartType === 'sales' ? '円' : chartType === 'drinks' ? '杯' : '回'}`}
                  />
                  <span className="chart-label">{day.dayLabel}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="metrics-grid">
        <div className="metric-card large">
          <div className="metric-title">総売上</div>
          <div className="metric-value large">{currentSales.toLocaleString()}円</div>
        </div>
        
        <div className="metrics-column">
          <div className="metric-card small">
            <div className="metric-title">ドリンク杯数</div>
            <div className="metric-value small">{totalDrinks}杯</div>
          </div>
          
          <div className="metric-card small">
            <div className="metric-title">キャッチ数</div>
            <div className="metric-value small">{totalCatch}杯</div>
          </div>
          
          <div className="metric-card small">
            <div className="metric-title">出勤日数</div>
            <div className="metric-value small">{workDays}日</div>
          </div>
        </div>
      </div>

      {/* Goal Settings Modal */}
      {showGoalSettings && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>目標設定</h3>
              <button onClick={() => setShowGoalSettings(false)} className="close-btn">
                <X size={20} />
              </button>
            </div>
            
            <div className="goal-form">
              <div className="form-group">
                <label>売上目標</label>
                <input
                  type="number"
                  value={goalSettings.sales}
                  onChange={(e) => setGoalSettings(prev => ({
                    ...prev,
                    sales: Number(e.target.value)
                  }))}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>ドリンク目標</label>
                <input
                  type="number"
                  value={goalSettings.drinks}
                  onChange={(e) => setGoalSettings(prev => ({
                    ...prev,
                    drinks: Number(e.target.value)
                  }))}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>キャッチ目標</label>
                <input
                  type="number"
                  value={goalSettings.catch}
                  onChange={(e) => setGoalSettings(prev => ({
                    ...prev,
                    catch: Number(e.target.value)
                  }))}
                  className="form-input"
                />
              </div>
            </div>

            <div className="modal-actions">
              <button onClick={updateGoalSettings} className="save-btn">
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="bottom-navigation">
        <div className="nav-item active">
          <div className="nav-icon personal"></div>
          <span>個人</span>
        </div>
        <div className="nav-item">
          <div className="nav-icon store"></div>
          <span>店舗</span>
        </div>
        <div className="nav-item">
          <div className="nav-icon report"></div>
          <span>日報</span>
        </div>
        <div className="nav-item">
          <div className="nav-icon shift"></div>
          <span>シフト</span>
        </div>
        <div className="nav-item">
          <div className="nav-icon settings"></div>
          <span>設定</span>
        </div>
      </div>
    </div>
  );
};

export default PersonalPage;