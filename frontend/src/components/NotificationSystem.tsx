import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { Bell, X, Check, AlertCircle, Info, CheckCircle, Calendar, FileText, Target } from 'lucide-react';
import { API_BASE_URL } from '../config';

// 通知の型定義
export interface Notification {
  id: number;
  type: 'shift_assigned' | 'shift_changed' | 'report_approved' | 'report_rejected' | 'goal_achieved' | 'announcement' | 'reminder';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  related_entity_type?: string;
  related_entity_id?: number;
}

// 通知コンテキストの型
interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  isLoading: boolean;
}

// 通知コンテキストを作成
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// 通知プロバイダーコンポーネント
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  // 通知一覧を取得
  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications?limit=50`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        const formattedNotifications: Notification[] = data.map((n: any) => ({
          id: n.id,
          type: n.notification_type,
          title: n.title,
          message: n.message,
          timestamp: new Date(n.created_at),
          read: n.is_read,
          related_entity_type: n.related_entity_type,
          related_entity_id: n.related_entity_id
        }));
        setNotifications(formattedNotifications);
        setUnreadCount(formattedNotifications.filter(n => !n.read).length);
      }
    } catch (error) {
      console.error('通知取得エラー:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 未読数を取得
  const fetchUnreadCount = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications/unread-count`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unread_count);
      }
    } catch (error) {
      console.error('未読数取得エラー:', error);
    }
  }, []);

  // 初回読み込み & 定期更新
  useEffect(() => {
    fetchNotifications();
    
    // 30秒ごとに未読数を確認
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications, fetchUnreadCount]);

  // 通知を既読にする
  const markAsRead = useCallback(async (id: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('既読処理エラー:', error);
    }
  }, []);

  // 全て既読にする
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
        method: 'PUT',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('全既読処理エラー:', error);
    }
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      fetchNotifications,
      markAsRead,
      markAllAsRead,
      isLoading
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

// 通知フックを使用
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

// 通知ベルコンポーネント
export const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, fetchNotifications, isLoading } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'shift_assigned':
      case 'shift_changed':
        return <Calendar size={18} color="#8b5cf6" />;
      case 'report_approved':
        return <CheckCircle size={18} color="#10b981" />;
      case 'report_rejected':
        return <AlertCircle size={18} color="#ef4444" />;
      case 'goal_achieved':
        return <Target size={18} color="#f59e0b" />;
      case 'announcement':
        return <Info size={18} color="#3b82f6" />;
      case 'reminder':
        return <FileText size={18} color="#6b7280" />;
      default:
        return <Info size={18} color="#6b7280" />;
    }
  };

  const getTypeLabel = (type: Notification['type']) => {
    switch (type) {
      case 'shift_assigned': return 'シフト';
      case 'shift_changed': return 'シフト変更';
      case 'report_approved': return '日報承認';
      case 'report_rejected': return '日報差戻';
      case 'goal_achieved': return '目標達成';
      case 'announcement': return 'お知らせ';
      case 'reminder': return 'リマインダー';
      default: return '通知';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'たった今';
    if (minutes < 60) return `${minutes}分前`;
    if (hours < 24) return `${hours}時間前`;
    if (days < 7) return `${days}日前`;
    return date.toLocaleDateString('ja-JP');
  };

  const handleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      fetchNotifications();
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={handleOpen}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '8px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          transition: 'background 0.2s'
        }}
      >
        <Bell size={24} color="#6b7280" />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            backgroundColor: '#ef4444',
            color: 'white',
            borderRadius: '50%',
            width: '18px',
            height: '18px',
            fontSize: '11px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'pulse 2s infinite'
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* オーバーレイ */}
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 998
            }}
            onClick={() => setIsOpen(false)}
          />
          
          {/* 通知パネル */}
          <div style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '8px',
            width: '360px',
            maxHeight: '480px',
            backgroundColor: 'white',
            borderRadius: '16px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
            zIndex: 999,
            overflow: 'hidden'
          }}>
            {/* ヘッダー */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'white' }}>
                通知
                {unreadCount > 0 && (
                  <span style={{
                    marginLeft: '8px',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '12px'
                  }}>
                    {unreadCount}件の未読
                  </span>
                )}
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    color: 'white',
                    fontSize: '12px',
                    cursor: 'pointer',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    transition: 'background 0.2s'
                  }}
                >
                  全て既読
                </button>
              )}
            </div>

            {/* 通知リスト */}
            <div style={{
              maxHeight: '380px',
              overflowY: 'auto'
            }}>
              {isLoading ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9ca3af' }}>
                  読み込み中...
                </div>
              ) : notifications.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9ca3af' }}>
                  <Bell size={40} color="#d1d5db" style={{ marginBottom: '12px' }} />
                  <p>通知はありません</p>
                </div>
              ) : (
                notifications.map(notification => (
                  <div
                    key={notification.id}
                    onClick={() => !notification.read && markAsRead(notification.id)}
                    style={{
                      padding: '14px 20px',
                      borderBottom: '1px solid #f3f4f6',
                      cursor: notification.read ? 'default' : 'pointer',
                      backgroundColor: notification.read ? 'white' : '#f0f9ff',
                      transition: 'background 0.2s',
                      display: 'flex',
                      gap: '12px'
                    }}
                  >
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      backgroundColor: notification.read ? '#f3f4f6' : '#e0e7ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {getIcon(notification.type)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                        <span style={{
                          fontSize: '11px',
                          color: '#8b5cf6',
                          fontWeight: '600',
                          backgroundColor: '#ede9fe',
                          padding: '2px 8px',
                          borderRadius: '4px'
                        }}>
                          {getTypeLabel(notification.type)}
                        </span>
                        <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                          {formatTime(notification.timestamp)}
                        </span>
                      </div>
                      <p style={{
                        margin: '4px 0 0 0',
                        fontSize: '14px',
                        fontWeight: notification.read ? '400' : '600',
                        color: '#1f2937'
                      }}>
                        {notification.title}
                      </p>
                      <p style={{
                        margin: '4px 0 0 0',
                        fontSize: '13px',
                        color: '#6b7280',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {notification.message}
                      </p>
                    </div>
                    {!notification.read && (
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#3b82f6',
                        flexShrink: 0,
                        marginTop: '4px'
                      }} />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
};

export default NotificationBell;
