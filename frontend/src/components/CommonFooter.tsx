import React from 'react';
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
    { key: 'personal', label: '個人' },
    ...(userRole === 'manager' ? [{ key: 'store', label: '店舗' }] : []),
    { key: 'daily-report', label: '日報' },
    { key: 'shift', label: 'シフト' },
    { key: 'settings', label: '設定' }
  ];

  return (
    <div className="common-footer">
      {navigationItems.map((item, index) => (
        <div 
          key={item.key}
          className={`footer-nav-item ${currentPage === item.key ? 'active' : ''}`}
          onClick={() => onPageChange(item.key)}
        >
          <div className={`nav-icon nav-icon-${index + 1}`}></div>
        </div>
      ))}
    </div>
  );
};

export default CommonFooter;