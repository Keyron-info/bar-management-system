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
  onLogout: () => void;
}

const CommonHeader: React.FC<CommonHeaderProps> = ({ user, onLogout }) => {
  return (
    <header className="common-header">
      <div className="header-content">
        <div className="user-info">
          <span className="user-name">
            {user.name}さん ({user.role === 'manager' ? '店長' : '従業員'})
          </span>
        </div>
        
        <div className="header-actions">
          <div className="notification-icon">
            <Bell size={20} />
          </div>
          
          <div className="profile-avatar"></div>
          
          <div className="logout-icon" onClick={onLogout}>
            <LogOut size={18} />
          </div>
        </div>
      </div>
    </header>
  );
};

export default CommonHeader;