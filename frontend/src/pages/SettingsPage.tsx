import React, { useState } from 'react';
import { Bell, LogOut, User, Settings, Shield, Smartphone, Palette, Database, Users } from 'lucide-react';
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
  const [notifications, setNotifications] = useState({
    shifts: true,
    sales: true,
    reports: false,
    system: true
  });

  const [preferences, setPreferences] = useState({
    theme: 'light',
    language: 'ja',
    currency: 'JPY'
  });

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const updatePreference = (key: keyof typeof preferences, value: string) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="settings-page">
      {/* Header */}
      <div className="settings-header">
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

      {/* Account Information */}
      <div className="settings-section">
        <div className="section-header">
          <User size={20} className="section-icon" />
          <span className="section-label">アカウント情報</span>
        </div>
        
        <div className="settings-content">
          <div className="info-item">
            <label>名前</label>
            <div className="info-value">{user.name}</div>
          </div>
          <div className="info-item">
            <label>メールアドレス</label>
            <div className="info-value">{user.email}</div>
          </div>
          <div className="info-item">
            <label>役職</label>
            <div className="info-value">
              {user.role === 'manager' ? '店長' : '店員'}
            </div>
          </div>
          <div className="info-item">
            <label>登録日</label>
            <div className="info-value">2024年8月1日</div>
          </div>
        </div>

        <div className="section-actions">
          <button className="action-btn secondary">プロフィール編集</button>
          <button className="action-btn secondary">パスワード変更</button>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="settings-section">
        <div className="section-header">
          <Bell size={20} className="section-icon" />
          <span className="section-label">通知設定</span>
        </div>
        
        <div className="settings-content">
          <div className="toggle-item">
            <div className="toggle-info">
              <span className="toggle-label">シフト通知</span>
              <span className="toggle-description">シフト承認・変更の通知</span>
            </div>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={notifications.shifts}
                onChange={() => toggleNotification('shifts')}
              />
              <span className="slider"></span>
            </label>
          </div>

          <div className="toggle-item">
            <div className="toggle-info">
              <span className="toggle-label">売上通知</span>
              <span className="toggle-description">日次・月次売上のお知らせ</span>
            </div>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={notifications.sales}
                onChange={() => toggleNotification('sales')}
              />
              <span className="slider"></span>
            </label>
          </div>

          <div className="toggle-item">
            <div className="toggle-info">
              <span className="toggle-label">レポート通知</span>
              <span className="toggle-description">月次レポートの配信</span>
            </div>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={notifications.reports}
                onChange={() => toggleNotification('reports')}
              />
              <span className="slider"></span>
            </label>
          </div>

          <div className="toggle-item">
            <div className="toggle-info">
              <span className="toggle-label">システム通知</span>
              <span className="toggle-description">メンテナンス・アップデート情報</span>
            </div>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={notifications.system}
                onChange={() => toggleNotification('system')}
              />
              <span className="slider"></span>
            </label>
          </div>
        </div>
      </div>

      {/* App Preferences */}
      <div className="settings-section">
        <div className="section-header">
          <Palette size={20} className="section-icon" />
          <span className="section-label">アプリ設定</span>
        </div>
        
        <div className="settings-content">
          <div className="preference-item">
            <label>テーマ</label>
            <select 
              value={preferences.theme}
              onChange={(e) => updatePreference('theme', e.target.value)}
              className="preference-select"
            >
              <option value="light">ライト</option>
              <option value="dark">ダーク</option>
              <option value="auto">システム設定に従う</option>
            </select>
          </div>

          <div className="preference-item">
            <label>言語</label>
            <select 
              value={preferences.language}
              onChange={(e) => updatePreference('language', e.target.value)}
              className="preference-select"
            >
              <option value="ja">日本語</option>
              <option value="en">English</option>
            </select>
          </div>

          <div className="preference-item">
            <label>通貨表示</label>
            <select 
              value={preferences.currency}
              onChange={(e) => updatePreference('currency', e.target.value)}
              className="preference-select"
            >
              <option value="JPY">日本円 (¥)</option>
              <option value="USD">米ドル ($)</option>
            </select>
          </div>
        </div>
      </div>

      {user.role === 'manager' && (
        /* Manager Only Settings */
        <div className="settings-section">
          <div className="section-header">
            <Shield size={20} className="section-icon" />
            <span className="section-label">店長専用設定</span>
          </div>
          
          <div className="settings-content">
            <div className="manager-item">
              <Database size={18} />
              <div className="manager-info">
                <span className="manager-label">データエクスポート</span>
                <span className="manager-description">売上・従業員データのダウンロード</span>
              </div>
              <button className="manager-btn">エクスポート</button>
            </div>

            <div className="manager-item">
              <Users size={18} />
              <div className="manager-info">
                <span className="manager-label">従業員管理</span>
                <span className="manager-description">従業員の追加・編集・削除</span>
              </div>
              <button className="manager-btn">管理画面</button>
            </div>

            <div className="manager-item">
              <Settings size={18} />
              <div className="manager-info">
                <span className="manager-label">店舗設定</span>
                <span className="manager-description">営業時間・目標設定等</span>
              </div>
              <button className="manager-btn">設定</button>
            </div>
          </div>
        </div>
      )}

      {/* System Information */}
      <div className="settings-section">
        <div className="section-header">
          <Smartphone size={20} className="section-icon" />
          <span className="section-label">システム情報</span>
        </div>
        
        <div className="settings-content">
          <div className="info-item">
            <label>アプリバージョン</label>
            <div className="info-value">v1.2.0</div>
          </div>
          <div className="info-item">
            <label>最終更新</label>
            <div className="info-value">2024年9月20日</div>
          </div>
          <div className="info-item">
            <label>開発者</label>
            <div className="info-value">KEYRON</div>
          </div>
        </div>

        <div className="section-actions">
          <button className="action-btn secondary">利用規約</button>
          <button className="action-btn secondary">プライバシーポリシー</button>
          <button className="action-btn secondary">サポート</button>
        </div>
      </div>

      {/* Logout Section */}
      <div className="logout-section">
        <button onClick={onLogout} className="logout-btn">
          <LogOut size={18} />
          ログアウト
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;