import React, { useState, useEffect } from 'react';
import { Bell, LogOut, Users, TrendingUp } from 'lucide-react';
import axios from 'axios';
import './StorePage.css';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

interface StorePageProps {
  user: User;
}

interface EmployeeData {
  id: number;
  name: string;
  totalSales: number;
  drinkCount: number;
  catchCount: number;
  workHours: number;
  workDays: number;
}

interface StoreSummary {
  totalRevenue: number;
  totalEmployees: number;
  averagePerEmployee: number;
  topPerformer: string;
}

const StorePage: React.FC<StorePageProps> = ({ user }) => {
  const [employeeData, setEmployeeData] = useState<EmployeeData[]>([]);
  const [storeSummary, setStoreSummary] = useState<StoreSummary | null>(null);
  const [storeGoal, setStoreGoal] = useState<number>(2000000); // 店舗目標
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'week'>('month');

  useEffect(() => {
    fetchStoreData();
  }, [selectedPeriod]);

  const fetchStoreData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // 模擬データ（実際にはAPIから取得）
      const mockEmployeeData: EmployeeData[] = [
        {
          id: 1,
          name: '田中 花子',
          totalSales: 450000,
          drinkCount: 85,
          catchCount: 23,
          workHours: 120,
          workDays: 15
        },
        {
          id: 2,
          name: '佐藤 太郎',
          totalSales: 380000,
          drinkCount: 72,
          catchCount: 19,
          workHours: 110,
          workDays: 14
        },
        {
          id: 3,
          name: '鈴木 美咲',
          totalSales: 520000,
          drinkCount: 95,
          catchCount: 28,
          workHours: 125,
          workDays: 16
        },
        {
          id: 4,
          name: '高橋 健太',
          totalSales: 320000,
          drinkCount: 58,
          catchCount: 15,
          workHours: 95,
          workDays: 12
        },
      ];

      const totalRevenue = mockEmployeeData.reduce((sum, emp) => sum + emp.totalSales, 0);
      const topPerformer = mockEmployeeData.reduce((top, current) => 
        current.totalSales > top.totalSales ? current : top
      ).name;

      setEmployeeData(mockEmployeeData);
      setStoreSummary({
        totalRevenue,
        totalEmployees: mockEmployeeData.length,
        averagePerEmployee: totalRevenue / mockEmployeeData.length,
        topPerformer
      });

    } catch (error) {
      console.error('店舗データ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const achievementRate = storeSummary 
    ? (storeSummary.totalRevenue / storeGoal) * 100 
    : 0;

  if (loading) {
    return (
      <div className="store-page-loading">
        <div className="loading-text">店舗データを読み込んでいます...</div>
      </div>
    );
  }

  return (
    <div className="store-page">
      {/* Header */}
      <div className="store-header">
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

      {/* Store Goal Card */}
      <div className="goal-section">
        <div className="goal-header">
          <span className="goal-label">今月の目標</span>
          <div className="goal-icon-circle">
            <TrendingUp size={16} color="white" />
          </div>
        </div>
        <div className="goal-amount">{storeGoal.toLocaleString()}円</div>
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

      {/* Store Sales Chart */}
      <div className="performance-section">
        <div className="performance-header">
          <span className="performance-label">今月の成績</span>
          <div className="chart-icon-circle">
            <TrendingUp size={16} color="white" />
          </div>
        </div>
        
        <div className="sales-chart-container">
          <div className="chart-area">
            <div className="chart-placeholder">
              <div className="mock-chart">
                <div className="chart-bars">
                  <div className="chart-bar" style={{height: '60%'}}><span>1週目</span></div>
                  <div className="chart-bar" style={{height: '80%'}}><span>2週目</span></div>
                  <div className="chart-bar" style={{height: '45%'}}><span>3週目</span></div>
                  <div className="chart-bar" style={{height: '90%'}}><span>4週目</span></div>
                </div>
                <div className="chart-legend">
                  <span>週別売上推移</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Individual Performance by Store */}
      <div className="individual-performance-section">
        <div className="individual-header">
          <span className="individual-label">今月の成績</span>
          <div className="individual-icon-circle">
            <Users size={16} color="white" />
          </div>
        </div>
        
        <div className="individual-performance-grid">
          {employeeData.map((employee) => (
            <div key={employee.id} className="individual-card">
              <div className="individual-name">{employee.name}</div>
              <div className="individual-metrics">
                <div className="individual-metric">
                  <span className="metric-label">ドリンク杯数</span>
                  <span className="metric-number">{employee.drinkCount}杯</span>
                </div>
                <div className="individual-metric">
                  <span className="metric-label">キャッチ数</span>
                  <span className="metric-number">{employee.catchCount}回</span>
                </div>
                <div className="individual-metric">
                  <span className="metric-label">売上</span>
                  <span className="metric-number">{Math.round(employee.totalSales / 1000)}K円</span>
                </div>
                <div className="individual-metric">
                  <span className="metric-label">出勤日数</span>
                  <span className="metric-number">{employee.workDays}日</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StorePage;