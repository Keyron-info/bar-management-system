import React, { useState } from 'react';
import { Bell, LogOut, Calendar, Clock, Users, Plus } from 'lucide-react';
import './ShiftPage.css';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

interface ShiftPageProps {
  user: User;
}

interface ShiftEntry {
  id: string;
  employeeName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'approved' | 'rejected';
}

const ShiftPage: React.FC<ShiftPageProps> = ({ user }) => {
  const [currentWeek, setCurrentWeek] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [shiftEntries] = useState<ShiftEntry[]>([
    {
      id: '1',
      employeeName: '田中 花子',
      date: '2024-09-25',
      startTime: '18:00',
      endTime: '02:00',
      status: 'approved'
    },
    {
      id: '2', 
      employeeName: '佐藤 太郎',
      date: '2024-09-25',
      startTime: '19:00',
      endTime: '03:00',
      status: 'pending'
    },
    {
      id: '3',
      employeeName: '鈴木 美咲',
      date: '2024-09-26',
      startTime: '20:00',
      endTime: '04:00',
      status: 'approved'
    }
  ]);

  const getWeekDates = (weekOffset: number) => {
    const today = new Date();
    const currentDay = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - currentDay + 1 + (weekOffset * 7));
    
    const week = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      week.push(date);
    }
    return week;
  };

  const weekDates = getWeekDates(currentWeek);
  const dayLabels = ['月', '火', '水', '木', '金', '土', '日'];

  const getShiftsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return shiftEntries.filter(shift => shift.date === dateStr);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'rejected': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <div className="shift-page">
      {/* Header */}
      <div className="shift-header">
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

      {/* Calendar View */}
      <div className="calendar-section">
        <div className="calendar-header">
          <span className="calendar-label">シフトカレンダー</span>
          <div className="calendar-icon-circle">
            <Calendar size={16} color="white" />
          </div>
        </div>
        
        <div className="week-navigation">
          <button 
            onClick={() => setCurrentWeek(currentWeek - 1)}
            className="nav-button"
          >
            ←
          </button>
          <span className="week-display">
            {weekDates[0].getMonth() + 1}月 {weekDates[0].getDate()}日 - {weekDates[6].getDate()}日
          </span>
          <button 
            onClick={() => setCurrentWeek(currentWeek + 1)}
            className="nav-button"
          >
            →
          </button>
        </div>

        <div className="calendar-grid">
          {weekDates.map((date, index) => (
            <div key={index} className="calendar-day">
              <div className="day-header">
                <span className="day-label">{dayLabels[index]}</span>
                <span className="day-number">{date.getDate()}</span>
              </div>
              <div className="day-shifts">
                {getShiftsForDate(date).map((shift) => (
                  <div 
                    key={shift.id} 
                    className="shift-block"
                    style={{ borderLeftColor: getStatusColor(shift.status) }}
                  >
                    <div className="shift-employee">{shift.employeeName}</div>
                    <div className="shift-time">{shift.startTime}-{shift.endTime}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Shift Management */}
      <div className="management-section">
        <div className="management-header">
          <span className="management-label">シフト管理</span>
          <div className="management-icon-circle">
            <Users size={16} color="white" />
          </div>
        </div>
        
        <div className="management-content">
          <div className="management-stats">
            <div className="stat-item">
              <Clock size={16} />
              <span>今週の予定: {shiftEntries.length}件</span>
            </div>
            <div className="stat-item">
              <Users size={16} />
              <span>承認待ち: {shiftEntries.filter(s => s.status === 'pending').length}件</span>
            </div>
          </div>

          {user.role === 'manager' && (
            <div className="manager-actions">
              <button className="action-button primary">
                <Plus size={16} />
                シフト作成
              </button>
              <button className="action-button secondary">
                一括承認
              </button>
            </div>
          )}

          <div className="quick-actions">
            <button className="quick-action-btn">
              <Calendar size={18} />
              <span>シフト提出</span>
            </button>
            <button className="quick-action-btn">
              <Clock size={18} />
              <span>勤怠確認</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="activity-section">
        <div className="activity-header">
          <span className="activity-label">最近の活動</span>
          <div className="activity-icon-circle">
            <Clock size={16} color="white" />
          </div>
        </div>
        
        <div className="activity-list">
          <div className="activity-item">
            <div className="activity-dot pending"></div>
            <div className="activity-content">
              <span className="activity-text">佐藤 太郎のシフト申請（9/25）</span>
              <span className="activity-time">2時間前</span>
            </div>
          </div>
          <div className="activity-item">
            <div className="activity-dot approved"></div>
            <div className="activity-content">
              <span className="activity-text">田中 花子のシフトが承認されました</span>
              <span className="activity-time">5時間前</span>
            </div>
          </div>
          <div className="activity-item">
            <div className="activity-dot approved"></div>
            <div className="activity-content">
              <span className="activity-text">鈴木 美咲のシフトが承認されました</span>
              <span className="activity-time">1日前</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShiftPage;