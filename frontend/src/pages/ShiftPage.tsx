import React from 'react';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

interface ShiftPageProps {
  user: User;
}

const ShiftPage: React.FC<ShiftPageProps> = ({ user }) => {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ 
          fontSize: '28px', 
          color: '#2c3e50', 
          margin: '0 0 10px 0',
          fontWeight: '600'
        }}>
          シフト管理
        </h1>
        <p style={{ color: '#7f8c8d', margin: 0 }}>
          シフトの提出・調整・確認ができます
        </p>
      </div>

      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '40px',
        textAlign: 'center',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        border: '1px solid #e1e8ed'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🚧</div>
        <h2 style={{ color: '#2c3e50', marginBottom: '15px' }}>開発中の機能</h2>
        <p style={{ color: '#7f8c8d', marginBottom: '20px' }}>
          シフト管理機能は現在開発中です。<br/>
          以下の機能を実装予定です：
        </p>
        <ul style={{ 
          textAlign: 'left', 
          color: '#7f8c8d', 
          maxWidth: '300px', 
          margin: '0 auto',
          lineHeight: '1.6'
        }}>
          <li>シフト提出</li>
          <li>シフト調整・変更</li>
          <li>店長による承認機能</li>
          <li>通知機能</li>
          <li>カレンダー表示</li>
        </ul>
      </div>
    </div>
  );
};

export default ShiftPage;