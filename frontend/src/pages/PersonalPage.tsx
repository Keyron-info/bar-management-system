import React, { useState, useEffect } from 'react';
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

  const workDays = thisMonthData.length;
  const currentSales = monthlySummary?.total_sales || 0;
  const totalDrinks = monthlySummary?.drink_count || 0;
  const totalCatch = thisMonthData.reduce((acc, item) => acc + item.catch_count, 0);

  if (loading) {
    return (
      <div className="personal-page-container">
        <div className="loading-container">
          データを読み込んでいます...
        </div>
      </div>
    );
  }

  return (
    <div className="personal-page-container">
      {/* Header Section */}
      <div className="page-header">
        <div className="user-name">{user.name}さん（{user.role === 'manager' ? '店長' : '店員'}）</div>
        <div className="header-icons">
          <div className="bell-icon">
            <div className="bell-icon-inner" />
          </div>
          <div className="profile-icon" />
          <div className="logout-icon" />
        </div>
      </div>

      {/* Monthly Goal Card */}
      <div className="goal-card">
        <div className="goal-header">
          <div className="goal-title">今月の目標</div>
          <div className="goal-icon">
            <div className="goal-icon-inner" />
          </div>
        </div>
        <div className="goal-amount">{monthlyGoal.toLocaleString()}円</div>
        <div className="progress-section">
          <div className="progress-bar-bg">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${Math.min(achievementRate, 100)}%` }}
            />
          </div>
          <div className="progress-percentage">{Math.round(achievementRate)}%</div>
        </div>
      </div>

      {/* Monthly Performance Card */}
      <div className="performance-section">
        <div className="performance-card">
          <div className="performance-header">
            <div className="performance-title">今月の成績</div>
            <div className="performance-icon">
              <div className="performance-icon-inner" />
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Section */}
      <div className="metrics-section">
        <div className="total-sales-card">
          <div className="metric-title">総売上</div>
          <div className="metric-value-large">{currentSales.toLocaleString()}円</div>
        </div>
        <div className="small-metrics-column">
          <div className="small-metric-card">
            <div className="metric-content">
              <div className="metric-title">ドリンク杯数</div>
              <div className="metric-value-small">{totalDrinks}杯</div>
            </div>
          </div>
          <div className="small-metric-card">
            <div className="metric-content">
              <div className="metric-title">キャッチ数</div>
              <div className="metric-value-small">{totalCatch}杯</div>
            </div>
          </div>
          <div className="small-metric-card">
            <div className="metric-content">
              <div className="metric-title">出勤日数</div>
              <div className="metric-value-small">{workDays}日</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="bottom-navigation">
        <div className="nav-icon" />
        <div className="nav-icon" />
        <div className="nav-icon" />
        <div className="nav-icon" />
        <div className="nav-icon" />
      </div>
    </div>
  );
};

export default PersonalPage;