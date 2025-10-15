import React, { useState, useEffect } from 'react';
import { Building2, Users, DollarSign, TrendingUp, Plus, LogOut, CheckCircle, Store, Mail, Phone, MapPin, User, Lock, CreditCard, Calendar } from 'lucide-react';

interface AdminUser {
  id: number;
  email: string;
  name: string;
  is_super_admin: boolean;
}

interface SuperAdminDashboardProps {
  admin: AdminUser;
  onLogout: () => void;
}

const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ admin, onLogout }) => {
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);
  const [dashboardStats, setDashboardStats] = useState({
    total_organizations: 0,
    total_stores: 0,
    total_employees: 0,
    total_monthly_revenue: 0
  });

  // フォームデータ
  const [orgData, setOrgData] = useState({
    name: '',
    domain: '',
    contact_email: '',
    phone: '',
    address: ''
  });

  const [storeData, setStoreData] = useState({
    store_name: '',
    store_type: 'bar',
    address: '',
    phone: '',
    timezone: 'Asia/Tokyo',
    currency: 'JPY',
    business_hours_start: '18:00',
    business_hours_end: '02:00'
  });

  const [ownerData, setOwnerData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    hourly_wage: 0,
    employment_type: 'full_time'
  });

  const [subData, setSubData] = useState({
    plan_name: 'スタンダード',
    max_stores: 1,
    max_employees_per_store: 10,
    monthly_fee: 10000
  });

  const [setupResult, setSetupResult] = useState<any>(null);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('http://localhost:8002/api/admin/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardStats(data);
      }
    } catch (error) {
      console.error('統計データ取得エラー:', error);
    }
  };

  const handleSetupStore = async () => {
  setLoading(true);

  try {
    const token = localStorage.getItem('admin_token');
    
    const requestData = {
      organization_data: orgData,
      store_data: storeData,
      owner_data: ownerData,
      subscription_data: subData
    };

    console.log('送信データ:', JSON.stringify(requestData, null, 2));

    const response = await fetch('http://localhost:8002/api/admin/stores/setup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(requestData)
    });

    if (response.ok) {
      const result = await response.json();
      setSetupResult(result);
      setStep(4);
      fetchDashboardStats();
    } else {
      const error = await response.json();
      console.error('セットアップエラー:', error);
      alert(`エラー: ${error.detail || JSON.stringify(error, null, 2)}`);
    }
  } catch (error) {
    console.error('通信エラー:', error);
    alert('店舗セットアップ中にエラーが発生しました');
  } finally {
    setLoading(false);
  }
};

  const resetForm = () => {
    setOrgData({ name: '', domain: '', contact_email: '', phone: '', address: '' });
    setStoreData({ store_name: '', store_type: 'bar', address: '', phone: '', timezone: 'Asia/Tokyo', currency: 'JPY', business_hours_start: '18:00', business_hours_end: '02:00' });
    setOwnerData({ name: '', email: '', password: '', phone: '', hourly_wage: 0, employment_type: 'full_time' });
    setSubData({ plan_name: 'スタンダード', max_stores: 1, max_employees_per_store: 10, monthly_fee: 10000 });
    setSetupResult(null);
    setStep(1);
    setShowSetupModal(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f7fa',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* ヘッダー */}
      <header style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
        color: 'white',
        padding: '20px 30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{
            width: '45px',
            height: '45px',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '12px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <Building2 size={24} color="white" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '600' }}>
              管理者ダッシュボード
            </h1>
            <p style={{ margin: 0, fontSize: '13px', opacity: 0.9 }}>
              {admin.name}（スーパーアドミン）
            </p>
          </div>
        </div>

        <button
          onClick={onLogout}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <LogOut size={16} />
          ログアウト
        </button>
      </header>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '30px' }}>
        {/* 統計カード */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          marginBottom: '30px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '25px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
              <div>
                <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>総組織数</p>
                <h2 style={{ margin: '10px 0 0 0', fontSize: '32px', fontWeight: '700', color: '#1e3a8a' }}>
                  {dashboardStats.total_organizations}
                </h2>
              </div>
              <Building2 size={24} color="#3b82f6" />
            </div>
          </div>

          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '25px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
              <div>
                <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>総店舗数</p>
                <h2 style={{ margin: '10px 0 0 0', fontSize: '32px', fontWeight: '700', color: '#059669' }}>
                  {dashboardStats.total_stores}
                </h2>
              </div>
              <Store size={24} color="#10b981" />
            </div>
          </div>

          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '25px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
              <div>
                <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>総従業員数</p>
                <h2 style={{ margin: '10px 0 0 0', fontSize: '32px', fontWeight: '700', color: '#7c3aed' }}>
                  {dashboardStats.total_employees}
                </h2>
              </div>
              <Users size={24} color="#8b5cf6" />
            </div>
          </div>

          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '25px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
              <div>
                <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>月間収益</p>
                <h2 style={{ margin: '10px 0 0 0', fontSize: '32px', fontWeight: '700', color: '#dc2626' }}>
                  ¥{Math.floor(dashboardStats.total_monthly_revenue / 10000)}万
                </h2>
              </div>
              <DollarSign size={24} color="#ef4444" />
            </div>
          </div>
        </div>

        {/* 新規店舗セットアップボタン */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '30px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          marginBottom: '30px'
        }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', fontWeight: '600' }}>
            店舗管理
          </h3>
          <p style={{ margin: '0 0 20px 0', color: '#666', fontSize: '14px' }}>
            新しい組織・店舗をセットアップして、オーナーアカウントと初期設定を一括作成できます
          </p>
          <button
            onClick={() => setShowSetupModal(true)}
            style={{
              background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
            }}
          >
            <Plus size={20} />
            新規店舗セットアップ
          </button>
        </div>
      </div>

      {/* セットアップモーダル */}
      {showSetupModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px',
          overflow: 'auto'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '700px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            {/* モーダルヘッダー */}
            <div style={{
              padding: '25px 30px',
              borderBottom: '1px solid #e5e7eb',
              position: 'sticky',
              top: 0,
              background: 'white',
              zIndex: 10,
              borderRadius: '16px 16px 0 0'
            }}>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '600' }}>
                店舗セットアップウィザード
              </h2>
              <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>
                ステップ {step}/4
              </p>

              {/* ステップインジケーター */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
                {[1, 2, 3, 4].map((s) => (
                  <div
                    key={s}
                    style={{
                      flex: 1,
                      height: '4px',
                      borderRadius: '2px',
                      background: s <= step ? '#3b82f6' : '#e5e7eb'
                    }}
                  />
                ))}
              </div>
            </div>

            {/* ステップ1: 組織情報 */}
            {step === 1 && (
              <div style={{ padding: '30px' }}>
                <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Building2 size={20} color="#3b82f6" />
                  組織情報
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                      組織名 *
                    </label>
                    <input
                      type="text"
                      value={orgData.name}
                      onChange={(e) => setOrgData({ ...orgData, name: e.target.value })}
                      placeholder="例: 株式会社サンプル"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '16px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                      ドメイン *
                    </label>
                    <input
                      type="text"
                      value={orgData.domain}
                      onChange={(e) => setOrgData({ ...orgData, domain: e.target.value })}
                      placeholder="例: sample-corp"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '16px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                      連絡先メールアドレス *
                    </label>
                    <input
                      type="email"
                      value={orgData.contact_email}
                      onChange={(e) => setOrgData({ ...orgData, contact_email: e.target.value })}
                      placeholder="contact@sample-corp.com"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '16px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                      電話番号
                    </label>
                    <input
                      type="tel"
                      value={orgData.phone}
                      onChange={(e) => setOrgData({ ...orgData, phone: e.target.value })}
                      placeholder="03-1234-5678"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '16px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                      住所
                    </label>
                    <input
                      type="text"
                      value={orgData.address}
                      onChange={(e) => setOrgData({ ...orgData, address: e.target.value })}
                      placeholder="東京都渋谷区..."
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '16px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    onClick={resetForm}
                    style={{
                      padding: '12px 24px',
                      border: '2px solid #e5e7eb',
                      background: 'white',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={() => setStep(2)}
                    disabled={!orgData.name || !orgData.domain || !orgData.contact_email}
                    style={{
                      padding: '12px 24px',
                      border: 'none',
                      background: (!orgData.name || !orgData.domain || !orgData.contact_email) ? '#ccc' : '#3b82f6',
                      color: 'white',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: (!orgData.name || !orgData.domain || !orgData.contact_email) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    次へ
                  </button>
                </div>
              </div>
            )}

            {/* ステップ2: 店舗情報 */}
            {step === 2 && (
              <div style={{ padding: '30px' }}>
                <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Store size={20} color="#10b981" />
                  店舗情報
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                      店舗名 *
                    </label>
                    <input
                      type="text"
                      value={storeData.store_name}
                      onChange={(e) => setStoreData({ ...storeData, store_name: e.target.value })}
                      placeholder="例: Bar Sample 渋谷店"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '16px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                      店舗タイプ
                    </label>
                    <select
                      value={storeData.store_type}
                      onChange={(e) => setStoreData({ ...storeData, store_type: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '16px',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="bar">バー</option>
                      <option value="club">クラブ</option>
                      <option value="lounge">ラウンジ</option>
                      <option value="snack">スナック</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                      住所 *
                    </label>
                    <input
                      type="text"
                      value={storeData.address}
                      onChange={(e) => setStoreData({ ...storeData, address: e.target.value })}
                      placeholder="東京都渋谷区..."
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '16px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                      電話番号
                    </label>
                    <input
                      type="tel"
                      value={storeData.phone}
                      onChange={(e) => setStoreData({ ...storeData, phone: e.target.value })}
                      placeholder="03-1234-5678"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '16px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                        営業開始時間
                      </label>
                      <input
                        type="time"
                        value={storeData.business_hours_start}
                        onChange={(e) => setStoreData({ ...storeData, business_hours_start: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '2px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '16px',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                        営業終了時間
                      </label>
                      <input
                        type="time"
                        value={storeData.business_hours_end}
                        onChange={(e) => setStoreData({ ...storeData, business_hours_end: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '2px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '16px',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between' }}>
                  <button
                    onClick={() => setStep(1)}
                    style={{
                      padding: '12px 24px',
                      border: '2px solid #e5e7eb',
                      background: 'white',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    戻る
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    disabled={!storeData.store_name || !storeData.address}
                    style={{
                      padding: '12px 24px',
                      border: 'none',
                      background: (!storeData.store_name || !storeData.address) ? '#ccc' : '#3b82f6',
                      color: 'white',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: (!storeData.store_name || !storeData.address) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    次へ
                  </button>
                </div>
              </div>
            )}

            {/* ステップ3: オーナー情報 */}
            {step === 3 && (
              <div style={{ padding: '30px' }}>
                <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <User size={20} color="#8b5cf6" />
                  オーナー情報
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                      名前 *
                    </label>
                    <input
                      type="text"
                      value={ownerData.name}
                      onChange={(e) => setOwnerData({ ...ownerData, name: e.target.value })}
                      placeholder="山田 太郎"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '16px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                      メールアドレス *
                    </label>
                    <input
                      type="email"
                      value={ownerData.email}
                      onChange={(e) => setOwnerData({ ...ownerData, email: e.target.value })}
                      placeholder="owner@example.com"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '16px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                      初期パスワード *
                    </label>
                    <input
                      type="password"
                      value={ownerData.password}
                      onChange={(e) => setOwnerData({ ...ownerData, password: e.target.value })}
                      placeholder="8文字以上（大文字・小文字・数字を含む）"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '16px',
                        boxSizing: 'border-box'
                      }}
                    />
                    <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#666' }}>
                      オーナーに初回ログイン後の変更を推奨してください
                    </p>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                      電話番号
                    </label>
                    <input
                      type="tel"
                      value={ownerData.phone}
                      onChange={(e) => setOwnerData({ ...ownerData, phone: e.target.value })}
                      placeholder="090-1234-5678"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '16px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between' }}>
                  <button
                    onClick={() => setStep(2)}
                    style={{
                      padding: '12px 24px',
                      border: '2px solid #e5e7eb',
                      background: 'white',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    戻る
                  </button>
                  <button
                    onClick={handleSetupStore}
                    disabled={!ownerData.name || !ownerData.email || !ownerData.password || loading}
                    style={{
                      padding: '12px 24px',
                      border: 'none',
                      background: (!ownerData.name || !ownerData.email || !ownerData.password || loading) ? '#ccc' : '#10b981',
                      color: 'white',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: (!ownerData.name || !ownerData.email || !ownerData.password || loading) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {loading ? 'セットアップ中...' : '店舗をセットアップ'}
                  </button>
                </div>
              </div>
            )}

            {/* ステップ4: 完了画面 */}
            {step === 4 && setupResult && (
              <div style={{ padding: '30px' }}>
                <div style={{
                  textAlign: 'center',
                  marginBottom: '30px'
                }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    borderRadius: '50%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    margin: '0 auto 20px'
                  }}>
                    <CheckCircle size={40} color="white" />
                  </div>
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '24px', fontWeight: '600' }}>
                    セットアップ完了!
                  </h3>
                  <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                    店舗とオーナーアカウントが正常に作成されました
                  </p>
                </div>

                <div style={{
                  background: '#f9fafb',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '20px'
                }}>
                  <h4 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: '600' }}>
                    セットアップ情報
                  </h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666' }}>組織名</p>
                      <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>{setupResult.organization.name}</p>
                    </div>

                    <div>
                      <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666' }}>店舗名</p>
                      <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>{setupResult.store.store_name}</p>
                    </div>

                    <div>
                      <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666' }}>店舗コード</p>
                      <p style={{ margin: 0, fontSize: '16px', fontWeight: '700', fontFamily: 'monospace', color: '#3b82f6' }}>
                        {setupResult.store.store_code}
                      </p>
                    </div>

                    <div>
                      <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666' }}>オーナー</p>
                      <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>
                        {setupResult.owner.name} ({setupResult.owner.email})
                      </p>
                    </div>

                    <div>
                      <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666' }}>従業員コード</p>
                      <p style={{ margin: 0, fontSize: '14px', fontWeight: '500', fontFamily: 'monospace' }}>
                        {setupResult.owner.employee_code}
                      </p>
                    </div>

                    {setupResult.initial_invite_code && (
                      <div>
                        <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666' }}>初期招待コード</p>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: '500', fontFamily: 'monospace', color: '#10b981' }}>
                          {setupResult.initial_invite_code}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{
                  background: 'rgba(59, 130, 246, 0.05)',
                  borderRadius: '10px',
                  padding: '15px',
                  borderLeft: '4px solid #3b82f6',
                  marginBottom: '20px'
                }}>
                  <p style={{ margin: 0, fontSize: '12px', color: '#1e3a8a', lineHeight: '1.6' }}>
                    <strong>次のステップ:</strong><br />
                    1. オーナーに店舗コードとログイン情報を連絡<br />
                    2. オーナーがログイン後、パスワード変更を推奨<br />
                    3. 必要に応じて追加メンバーを招待
                  </p>
                </div>

                <button
                  onClick={resetForm}
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  完了
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;