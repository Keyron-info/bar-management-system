// SettingsPage.tsx
interface SettingsPageProps {
  user: User;
  onLogout: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ user, onLogout }) => {
  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ 
          fontSize: '28px', 
          color: '#2c3e50', 
          margin: '0 0 10px 0',
          fontWeight: '600'
        }}>
          設定
        </h1>
        <p style={{ color: '#7f8c8d', margin: 0 }}>
          アカウント設定とシステム設定
        </p>
      </div>

      {/* アカウント情報 */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '25px',
        marginBottom: '25px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        border: '1px solid #e1e8ed'
      }}>
        <h2 style={{ 
          fontSize: '18px', 
          color: '#2c3e50', 
          margin: '0 0 20px 0',
          fontWeight: '600'
        }}>
          アカウント情報
        </h2>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '5px', 
            color: '#7f8c8d',
            fontSize: '14px'
          }}>
            名前
          </label>
          <div style={{ 
            padding: '12px 16px',
            backgroundColor: '#f8f9fa',
            border: '1px solid #e1e8ed',
            borderRadius: '8px',
            color: '#2c3e50'
          }}>
            {user.name}
          </div>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '5px', 
            color: '#7f8c8d',
            fontSize: '14px'
          }}>
            メールアドレス
          </label>
          <div style={{ 
            padding: '12px 16px',
            backgroundColor: '#f8f9fa',
            border: '1px solid #e1e8ed',
            borderRadius: '8px',
            color: '#2c3e50'
          }}>
            {user.email}
          </div>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '5px', 
            color: '#7f8c8d',
            fontSize: '14px'
          }}>
            役職
          </label>
          <div style={{ 
            padding: '12px 16px',
            backgroundColor: '#f8f9fa',
            border: '1px solid #e1e8ed',
            borderRadius: '8px',
            color: '#2c3e50'
          }}>
            {user.role === 'manager' ? '店長' : '従業員'}
          </div>
        </div>
      </div>

      {/* システム設定 */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '25px',
        marginBottom: '25px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        border: '1px solid #e1e8ed'
      }}>
        <h2 style={{ 
          fontSize: '18px', 
          color: '#2c3e50', 
          margin: '0 0 20px 0',
          fontWeight: '600'
        }}>
          システム情報
        </h2>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '5px', 
            color: '#7f8c8d',
            fontSize: '14px'
          }}>
            バージョン
          </label>
          <div style={{ 
            padding: '12px 16px',
            backgroundColor: '#f8f9fa',
            border: '1px solid #e1e8ed',
            borderRadius: '8px',
            color: '#2c3e50'
          }}>
            v1.0.0
          </div>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '5px', 
            color: '#7f8c8d',
            fontSize: '14px'
          }}>
            開発者
          </label>
          <div style={{ 
            padding: '12px 16px',
            backgroundColor: '#f8f9fa',
            border: '1px solid #e1e8ed',
            borderRadius: '8px',
            color: '#2c3e50'
          }}>
            KEYRON
          </div>
        </div>
      </div>

      {/* ログアウト */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '25px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        border: '1px solid #e1e8ed'
      }}>
        <h2 style={{ 
          fontSize: '18px', 
          color: '#2c3e50', 
          margin: '0 0 20px 0',
          fontWeight: '600'
        }}>
          アカウント操作
        </h2>

        <button
          onClick={onLogout}
          style={{
            backgroundColor: '#e74c3c',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            width: '100%',
            transition: 'background-color 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#c0392b';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#e74c3c';
          }}
        >
          ログアウト
        </button>
      </div>
    </div>
  );
};

export { ShiftPage, SettingsPage };