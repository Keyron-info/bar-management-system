import React from 'react';
import { Calendar, Store, User, FileText, Settings } from 'lucide-react';
import './CommonFooter.css';

interface CommonFooterProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  userRole: string;
}

const CommonFooter: React.FC<CommonFooterProps> = ({ 
  currentPage, 
  onPageChange, 
  userRole 
}) => {
  const navigationItems = [
    { key: 'shift', icon: Calendar },
    ...(userRole === 'manager' ? 
      [{ key: 'store', icon: Store }] : []
    ),
    { key: 'personal', icon: User },
    { key: 'daily-report', icon: FileText },
    { key: 'settings', icon: Settings },
  ];

  return (
    <footer className="common-footer">
      {navigationItems.map((item) => {
        const IconComponent = item.icon;
        const isActive = currentPage === item.key;
        
        return (
          <div
            key={item.key}
            className={`footer-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => onPageChange(item.key)}
          >
            <IconComponent 
              size={20} 
              color="white"
              strokeWidth={1.5}
              fill="none"
            />
          </div>
        );
      })}
    </footer>
  );
};

export default CommonFooter;