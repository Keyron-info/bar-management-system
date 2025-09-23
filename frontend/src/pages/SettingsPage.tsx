import React, { useState } from 'react';
import { User, Mail, Shield, Bell, Lock, ChevronRight, LogOut } from 'lucide-react';
import './SettingsPage.css';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

interface SettingsPageProps {
  user: User;
  onLogout: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ user, onLogout }) => {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const settingsGroups = [
    {
      title: 'アカウント',
      items: [
        {
          icon: User,
          label: '個人情報',
          value: user.name,
          action: () => console.log('個人情報編集')
        },
        {
          icon: Mail,
          label: 'メールアドレス',
          value: user.email,
          action: () => console.log('メール編集')
        },
        {
          icon: Lock,
          label: 'パスワード変更',
          value: '••••••••',
          action: () => console.log('パスワード変更')
        }
      ]
    },
    {
      title: '権限・セキュリティ',
      items: [
        {
          icon: Shield,
          label: '役職',
          value: user.role === 'manager' ? '店長' : '従業員',
          isReadOnly: true
        }
      ]
    },
    {
      title: '通知設定',
      items: [
        {
          icon: Bell,
          label: 'プッシュ通知',
          isToggle: true,
          value: notifications,
          action: () => setNotifications(!notifications)
        }
      ]
    }
  ];

  return (
    <div className="settings-page">
      {/* プロフィールセクション */}
      <div className="profile-section">
        <div className="profile-avatar-large">
          <div className="avatar-gradient"></div>
          <User size={32} color="white" />
        </div>
        <div className="profile-info">
          <h2 className="profile-name">{user.name}</h2>
          <p className="profile-role">
            {user.role === 'manager' ? '店長' : '従業員'}
          </p>
          <p className="profile-email">{user.email}</p>
        </div>
      </div>

      {/* 設定グループ */}
      <div className="settings-groups">
        {settingsGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="settings-group">
            <h3 className="group-title">{group.title}</h3>
            <div className="settings-items">
              {group.items.map((item, itemIndex) => {
                const IconComponent = item.icon;
                return (
                  <div 
                    key={itemIndex} 
                    className={`settings-item ${item.isReadOnly ? 'readonly' : 'clickable'}`}
                    onClick={item.action && !item.isReadOnly ? item.action : undefined}
                  >
                    <div className="item-left">
                      <div className="item-icon">
                        <IconComponent size={20} color="#9333EA" />
                      </div>
                      <div className="item-content">
                        <div className="item-label">{item.label}</div>
                        {!item.isToggle && (
                          <div className="item-value">{item.value}</div>
                        )}
                      </div>
                    </div>
                    <div className="item-right">
                      {item.isToggle ? (
                        <div 
                          className={`toggle-switch ${item.value ? 'active' : ''}`}
                          onClick={item.action}
                        >
                          <div className="toggle-handle"></div>
                        </div>
                      ) : !item.isReadOnly ? (
                        <ChevronRight size={16} color="#9333EA" />
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* アプリ情報 */}
      <div className="app-info">
        <div className="app-version">
          <div className="app-name">バー管理システム</div>
          <div className="version">Version 1.0.0</div>
        </div>
      </div>

      {/* ログアウトボタン */}
      <div className="logout-section">
        <button className="logout-button" onClick={onLogout}>
          <LogOut size={20} />
          <span>ログアウト</span>
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;