import React from 'react';
import { Bell, LogOut } from 'lucide-react';
import './CommonHeader.css';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

interface CommonHeaderProps {
  user: User;
  onLogout?: () => void;
}

const CommonHeader: React.FC<CommonHeaderProps> = ({ user, onLogout }) => {
  return (
    <div className="common-header">
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
          <div className="logout-icon" onClick={onLogout}>
            <LogOut size={16} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommonHeader;