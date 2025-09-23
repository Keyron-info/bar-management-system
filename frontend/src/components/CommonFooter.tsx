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
    { key: 'shift', icon: Calendar, className: 'nav-icon-1' },
    ...(userRole === 'manager' ? 
      [{ key: 'store', icon: Store, className: 'nav-icon-2' }] : []
    ),
    { key: 'personal', icon: User, className: 'nav-icon-3' },
    { key: 'daily-report', icon: FileText, className: 'nav-icon-4' },
    { key: 'settings', icon: Settings, className: 'nav-icon-5' },
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
              className={item.className}
            />
          </div>
        );
      })}
    </footer>
  );
};

export default CommonFooter;