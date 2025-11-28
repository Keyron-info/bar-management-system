import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { User, Mail, Shield, Bell, Lock, ChevronRight, LogOut, Users, Plus, Edit, Eye, EyeOff, X, Check, AlertCircle, Copy, Trash2, Clock } from 'lucide-react';
import './SettingsPage.css';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  store_id?: number;
}

interface Employee {
  id: number;
  store_id: number;
  employee_code: string;
  name: string;
  email: string;
  role: string;
  hire_date: string;
  is_active: boolean;
  created_at: string;
}

interface InviteCode {
  id: number;
  invite_code: string;
  invited_role: string;
  invited_email: string;
  status: string;
  expires_at: string;
  max_uses: number;
  current_uses: number;
  created_at: string;
}

interface SettingsPageProps {
  user: User;
  onLogout: () => void;
}

interface SettingsItem {
  icon: React.ComponentType<any>;
  label: string;
  value?: string | boolean;
  action?: () => void;
  isReadOnly?: boolean;
  isToggle?: boolean;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ user, onLogout }) => {
  const [notifications, setNotifications] = useState(true);
  const [showEmployeeManagement, setShowEmployeeManagement] = useState(false);
  const [showInviteCodeModal, setShowInviteCodeModal] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [showAddEmployeeForm, setShowAddEmployeeForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [suggestedCode, setSuggestedCode] = useState('');
  
  // 🆕 プロフィール編集モーダル状態
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user.name,
    phone: '',
    emergency_contact_name: '',
    emergency_contact_phone: ''
  });
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // 招待コードフォーム状態
  const [newInvite, setNewInvite] = useState({
    invited_role: 'staff' as 'staff' | 'manager' | 'owner',
    invited_email: '',
    expires_in_hours: 168, // 7日間
    max_uses: 1
  });

  // APIヘッダー取得
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  // 🆕 プロフィール取得
  const fetchProfile = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/employees/me/profile`, {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        setProfileData({
          name: data.name || '',
          phone: data.phone || '',
          emergency_contact_name: data.emergency_contact_name || '',
          emergency_contact_phone: data.emergency_contact_phone || ''
        });
      }
    } catch (error) {
      console.error('プロフィール取得エラー:', error);
    }
  };

  // 🆕 プロフィール更新
  const handleUpdateProfile = async () => {
    setProfileLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/employees/me/profile`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(profileData)
      });

      if (response.ok) {
        const result = await response.json();
        alert('プロフィールを更新しました');
        
        // ローカルストレージのユーザー情報も更新
        const userDataStr = localStorage.getItem('user');
        if (userDataStr) {
          const userData = JSON.parse(userDataStr);
          userData.name = profileData.name;
          localStorage.setItem('user', JSON.stringify(userData));
        }
        
        setShowProfileModal(false);
      } else {
        const error = await response.json();
        alert(`エラー: ${error.detail || 'プロフィール更新に失敗しました'}`);
      }
    } catch (error) {
      alert('プロフィール更新中にエラーが発生しました');
      console.error(error);
    } finally {
      setProfileLoading(false);
    }
  };

  // 🆕 パスワード変更
  const handleChangePassword = async () => {
    // バリデーション
    if (passwordData.new_password !== passwordData.confirm_password) {
      alert('新しいパスワードと確認用パスワードが一致しません');
      return;
    }
    
    if (passwordData.new_password.length < 8) {
      alert('パスワードは8文字以上で入力してください');
      return;
    }

    setPasswordLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/employees/me/password`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          current_password: passwordData.current_password,
          new_password: passwordData.new_password
        })
      });

      if (response.ok) {
        alert('パスワードを変更しました');
        setPasswordData({
          current_password: '',
          new_password: '',
          confirm_password: ''
        });
        setShowPasswordModal(false);
      } else {
        const error = await response.json();
        alert(`エラー: ${error.detail || 'パスワード変更に失敗しました'}`);
      }
    } catch (error) {
      alert('パスワード変更中にエラーが発生しました');
      console.error(error);
    } finally {
      setPasswordLoading(false);
    }
  };

  // 🆕 プロフィール編集モーダルを開く
  const handleOpenProfileModal = () => {
    fetchProfile();
    setShowProfileModal(true);
  };

  // 🆕 パスワード変更モーダルを開く
  const handleOpenPasswordModal = () => {
    setPasswordData({
      current_password: '',
      new_password: '',
      confirm_password: ''
    });
    setShowPasswordModal(true);
  };

  // 招待コード一覧を取得
  const fetchInviteCodes = async () => {
    if (user.role !== 'manager' && user.role !== 'owner') return;
    
    setLoadingInvites(true);
    try {
      const userDataStr = localStorage.getItem('user');
      if (!userDataStr) return;
      
      const userData = JSON.parse(userDataStr);
      const storeId = userData.store_id;
      
      const response = await fetch(`${API_BASE_URL}/api/stores/${storeId}/invite-codes`, {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        setInviteCodes(data);
      }
    } catch (error) {
      console.error('招待コード取得エラー:', error);
    } finally {
      setLoadingInvites(false);
    }
  };

  // 招待コード発行
  const handleCreateInviteCode = async () => {
    if (!newInvite.invited_email.trim()) {
      alert('メールアドレスを入力してください');
      return;
    }

    setFormLoading(true);
    try {
      const userDataStr = localStorage.getItem('user');
      if (!userDataStr) return;
      
      const userData = JSON.parse(userDataStr);
      const storeId = userData.store_id;
      
      const response = await fetch(`${API_BASE_URL}/api/stores/${storeId}/invite-codes`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newInvite)
      });

      if (response.ok) {
        const data = await response.json();
        
        // コピー機能付きのアラート
        const codeText = data.invite_code;
        navigator.clipboard.writeText(codeText);
        
        alert(`招待コードを発行しました！\n\n${codeText}\n\n（クリップボードにコピーされました）\n\nこのコードを新しいメンバーに共有してください。`);
        
        setNewInvite({
          invited_role: 'staff',
          invited_email: '',
          expires_in_hours: 168,
          max_uses: 1
        });
        
        fetchInviteCodes();
      } else {
        const error = await response.json();
        console.error('セットアップエラー:', error);
        alert(`エラー: ${error.detail || JSON.stringify(error, null, 2)}`);
      }
    } catch (error) {
      alert('招待コード発行中にエラーが発生しました');
      console.error(error);
    } finally {
      setFormLoading(false);
    }
  };

  // 招待コードをコピー
  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    alert('招待コードをコピーしました');
  };

  // 従業員一覧を取得
  const fetchEmployees = async () => {
    if (user.role !== 'manager' && user.role !== 'owner') return;
    
    setLoadingEmployees(true);
    try {
      const userDataStr = localStorage.getItem('user');
      if (!userDataStr) return;
      
      const userData = JSON.parse(userDataStr);
      const storeId = userData.store_id;
      
      const response = await fetch(`${API_BASE_URL}/api/stores/${storeId}/employees`, {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
      }
    } catch (error) {
      console.error('従業員データ取得エラー:', error);
    } finally {
      setLoadingEmployees(false);
    }
  };

  // チーム管理を開く
  const handleOpenTeamManagement = () => {
    setShowInviteCodeModal(true);
    fetchInviteCodes();
    fetchEmployees();
  };

  // 従業員アクティブ状態の切り替え
  const toggleEmployeeStatus = async (employeeId: number, isActive: boolean) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/employees/${employeeId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ is_active: !isActive })
      });

      if (response.ok) {
        alert(`従業員を${!isActive ? '有効' : '無効'}にしました`);
        fetchEmployees();
      } else {
        alert('ステータス変更に失敗しました');
      }
    } catch (error) {
      alert('ステータス変更中にエラーが発生しました');
    }
  };

  // 役割の日本語表示
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner': return 'オーナー';
      case 'manager': return '店長';
      case 'staff': return 'スタッフ';
      default: return role;
    }
  };

  const settingsGroups: { title: string; items: SettingsItem[] }[] = [
    {
      title: 'アカウント',
      items: [
        {
          icon: User,
          label: '個人情報',
          value: user.name,
          action: handleOpenProfileModal
        },
        {
          icon: Mail,
          label: 'メールアドレス',
          value: user.email,
          isReadOnly: true
        },
        {
          icon: Lock,
          label: 'パスワード変更',
          value: '••••••••',
          action: handleOpenPasswordModal
        }
      ]
    },
    {
      title: '権限・セキュリティ',
      items: [
        {
          icon: Shield,
          label: '役職',
          value: getRoleLabel(user.role),
          isReadOnly: true
        }
      ]
    },
    // 店長・オーナーのみチーム管理セクションを表示
    ...((user.role === 'manager' || user.role === 'owner') ? [{
      title: 'チーム管理',
      items: [
        {
          icon: Users,
          label: 'メンバー招待',
          value: '招待コード発行・メンバー管理',
          action: handleOpenTeamManagement
        }
      ]
    }] : []),
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
          <p className="profile-role">{getRoleLabel(user.role)}</p>
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
                          <div className="item-value">{String(item.value)}</div>
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
          <div className="version">Version 3.0.0 - SaaS Edition</div>
        </div>
      </div>

      {/* ログアウトボタン */}
      <div className="logout-section">
        <button className="logout-button" onClick={onLogout}>
          <LogOut size={20} />
          <span>ログアウト</span>
        </button>
      </div>

      {/* 🆕 プロフィール編集モーダル */}
      {showProfileModal && (
        <div className="modal-overlay">
          <div className="profile-edit-modal">
            <div className="modal-header">
              <div className="modal-header-left">
                <User size={24} color="#9333EA" />
                <h3 className="modal-title">プロフィール編集</h3>
              </div>
              <button 
                onClick={() => setShowProfileModal(false)}
                className="close-modal-button"
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-content">
              <div className="form-group">
                <label className="form-label">名前 *</label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                  className="form-input"
                  placeholder="山田太郎"
                />
              </div>

              <div className="form-group">
                <label className="form-label">電話番号</label>
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                  className="form-input"
                  placeholder="090-1234-5678"
                />
              </div>

              <div className="form-group">
                <label className="form-label">緊急連絡先（氏名）</label>
                <input
                  type="text"
                  value={profileData.emergency_contact_name}
                  onChange={(e) => setProfileData(prev => ({ ...prev, emergency_contact_name: e.target.value }))}
                  className="form-input"
                  placeholder="山田花子"
                />
              </div>

              <div className="form-group">
                <label className="form-label">緊急連絡先（電話番号）</label>
                <input
                  type="tel"
                  value={profileData.emergency_contact_phone}
                  onChange={(e) => setProfileData(prev => ({ ...prev, emergency_contact_phone: e.target.value }))}
                  className="form-input"
                  placeholder="090-8765-4321"
                />
              </div>

              <div className="modal-actions">
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="cancel-button"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleUpdateProfile}
                  disabled={!profileData.name.trim() || profileLoading}
                  className="submit-button"
                >
                  {profileLoading ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🆕 パスワード変更モーダル */}
      {showPasswordModal && (
        <div className="modal-overlay">
          <div className="profile-edit-modal">
            <div className="modal-header">
              <div className="modal-header-left">
                <Lock size={24} color="#9333EA" />
                <h3 className="modal-title">パスワード変更</h3>
              </div>
              <button 
                onClick={() => setShowPasswordModal(false)}
                className="close-modal-button"
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-content">
              <div className="form-group">
                <label className="form-label">現在のパスワード *</label>
                <div className="password-input-wrapper">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordData.current_password}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, current_password: e.target.value }))}
                    className="form-input"
                    placeholder="現在のパスワードを入力"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">新しいパスワード *</label>
                <div className="password-input-wrapper">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordData.new_password}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, new_password: e.target.value }))}
                    className="form-input"
                    placeholder="8文字以上で入力"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <div className="password-hint">
                  大文字・小文字・数字を含む8文字以上
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">新しいパスワード（確認） *</label>
                <input
                  type="password"
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirm_password: e.target.value }))}
                  className="form-input"
                  placeholder="新しいパスワードを再入力"
                />
                {passwordData.new_password && passwordData.confirm_password && (
                  <div className={`password-match ${passwordData.new_password === passwordData.confirm_password ? 'match' : 'no-match'}`}>
                    {passwordData.new_password === passwordData.confirm_password ? (
                      <><Check size={14} /> パスワードが一致しています</>
                    ) : (
                      <><AlertCircle size={14} /> パスワードが一致しません</>
                    )}
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="cancel-button"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleChangePassword}
                  disabled={
                    !passwordData.current_password ||
                    !passwordData.new_password ||
                    passwordData.new_password !== passwordData.confirm_password ||
                    passwordLoading
                  }
                  className="submit-button"
                >
                  {passwordLoading ? '変更中...' : 'パスワードを変更'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* チーム管理モーダル（招待コード + メンバー一覧） */}
      {showInviteCodeModal && (
        <div className="modal-overlay">
          <div className="employee-management-modal">
            <div className="modal-header">
              <div className="modal-header-left">
                <Users size={24} color="#9333EA" />
                <h3 className="modal-title">チーム管理</h3>
              </div>
              <button 
                onClick={() => setShowInviteCodeModal(false)}
                className="close-modal-button"
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-content">
              {/* 招待コード発行セクション */}
              <div className="invite-section">
                <div className="section-header">
                  <h4>新しいメンバーを招待</h4>
                  <p className="section-description">招待コードを発行して、新しいメンバーを追加できます</p>
                </div>

                <div className="invite-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">招待するメールアドレス *</label>
                      <input
                        type="email"
                        value={newInvite.invited_email}
                        onChange={(e) => setNewInvite(prev => ({
                          ...prev,
                          invited_email: e.target.value
                        }))}
                        className="form-input"
                        placeholder="newmember@example.com"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">役割</label>
                      <select
                        value={newInvite.invited_role}
                        onChange={(e) => setNewInvite(prev => ({
                          ...prev,
                          invited_role: e.target.value as 'staff' | 'manager' | 'owner'
                        }))}
                        className="form-select"
                      >
                        <option value="staff">スタッフ</option>
                        <option value="manager">店長</option>
                        <option value="owner">オーナー</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">有効期限</label>
                      <select
                        value={newInvite.expires_in_hours}
                        onChange={(e) => setNewInvite(prev => ({
                          ...prev,
                          expires_in_hours: parseInt(e.target.value)
                        }))}
                        className="form-select"
                      >
                        <option value="24">24時間</option>
                        <option value="72">3日間</option>
                        <option value="168">7日間</option>
                        <option value="336">14日間</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">使用回数制限</label>
                      <select
                        value={newInvite.max_uses}
                        onChange={(e) => setNewInvite(prev => ({
                          ...prev,
                          max_uses: parseInt(e.target.value)
                        }))}
                        className="form-select"
                      >
                        <option value="1">1回のみ</option>
                        <option value="5">5回まで</option>
                        <option value="10">10回まで</option>
                        <option value="999">無制限</option>
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={handleCreateInviteCode}
                    disabled={!newInvite.invited_email.trim() || formLoading}
                    className="submit-button"
                    style={{
                      opacity: !newInvite.invited_email.trim() || formLoading ? 0.5 : 1,
                      cursor: !newInvite.invited_email.trim() || formLoading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <Plus size={16} />
                    {formLoading ? '発行中...' : '招待コードを発行'}
                  </button>
                </div>
              </div>

              {/* 有効な招待コード一覧 */}
              <div className="invite-codes-section">
                <div className="section-header">
                  <h4>有効な招待コード</h4>
                </div>

                {loadingInvites ? (
                  <div className="loading-state">読み込み中...</div>
                ) : inviteCodes.filter(code => code.status === 'pending').length > 0 ? (
                  <div className="invite-codes-list">
                    {inviteCodes.filter(code => code.status === 'pending').map((invite) => (
                      <div key={invite.id} className="invite-code-card">
                        <div className="invite-code-header">
                          <div className="invite-code-text" style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 'bold' }}>
                            {invite.invite_code}
                          </div>
                          <button
                            onClick={() => copyInviteCode(invite.invite_code)}
                            className="icon-button"
                            title="コピー"
                          >
                            <Copy size={16} />
                          </button>
                        </div>
                        <div className="invite-code-details">
                          <div className="detail-item">
                            <Shield size={14} />
                            <span>役割: {getRoleLabel(invite.invited_role)}</span>
                          </div>
                          <div className="detail-item">
                            <Mail size={14} />
                            <span>{invite.invited_email}</span>
                          </div>
                          <div className="detail-item">
                            <Clock size={14} />
                            <span>期限: {new Date(invite.expires_at).toLocaleDateString('ja-JP')}</span>
                          </div>
                          <div className="detail-item">
                            <span>使用: {invite.current_uses}/{invite.max_uses}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state-small">
                    発行済みの招待コードはありません
                  </div>
                )}
              </div>

              {/* メンバー一覧 */}
              <div className="members-section">
                <div className="section-header">
                  <h4>チームメンバー</h4>
                </div>

                {loadingEmployees ? (
                  <div className="loading-state">読み込み中...</div>
                ) : employees.length > 0 ? (
                  <div className="employees-list">
                    {employees.map((employee) => (
                      <div 
                        key={employee.id} 
                        className={`employee-card ${employee.is_active ? 'active' : 'inactive'}`}
                      >
                        <div className="employee-info">
                          <div className="employee-header">
                            <div className={`employee-avatar ${employee.is_active ? 'active' : 'inactive'}`}>
                              {employee.name.charAt(0)}
                            </div>
                            <div>
                              <div className={`employee-name ${employee.is_active ? 'active' : 'inactive'}`}>
                                {employee.name}
                              </div>
                              <div className="employee-role-info">
                                {employee.employee_code} | {getRoleLabel(employee.role)}
                                {!employee.is_active && (
                                  <span className="status-badge">無効</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="employee-details">
                            {employee.email && `${employee.email} | `}
                            入社: {new Date(employee.hire_date).toLocaleDateString('ja-JP')}
                          </div>
                        </div>
                        
                        <div className="employee-actions">
                          <button
                            onClick={() => toggleEmployeeStatus(employee.id, employee.is_active)}
                            className={`toggle-status-button ${employee.is_active ? 'deactivate' : 'activate'}`}
                          >
                            {employee.is_active ? '無効化' : '有効化'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <Users size={48} color="#ccc" />
                    <p>メンバーが登録されていません</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;