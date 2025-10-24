import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { Building2, Store, Users, DollarSign, LogOut, Plus, Search, Eye, Power, X, TrendingUp, Calendar } from 'lucide-react';

interface SuperAdminDashboardProps {
  admin: any;
  onLogout: () => void;
}

interface DashboardStats {
  total_organizations: number;
  total_stores: number;
  total_employees: number;
  total_monthly_revenue: number;
  active_stores: number;
  inactive_stores: number;
  new_stores_this_month: number;
  total_monthly_sales: number;
  average_sales_per_store: number;
  active_subscriptions: number;
  trial_subscriptions: number;
}

interface StoreData {
  id: number;
  organization_id: number;
  organization_name: string;
  store_code: string;
  store_name: string;
  store_type: string;
  address: string;
  phone: string;
  is_active: boolean;
  employee_count: number;
  monthly_sales: number;
  subscription_status: string;
  subscription_plan: string;
  created_at: string;
  updated_at: string;
}

interface StoreDetails {
  store: any;
  organization: any;
  subscription: any;
  employees: any[];
  sales_history: any[];
}

const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ admin, onLogout }) => {
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    total_organizations: 0,
    total_stores: 0,
    total_employees: 0,
    total_monthly_revenue: 0,
    active_stores: 0,
    inactive_stores: 0,
    new_stores_this_month: 0,
    total_monthly_sales: 0,
    average_sales_per_store: 0,
    active_subscriptions: 0,
    trial_subscriptions: 0
  });
  
  const [stores, setStores] = useState<StoreData[]>([]);
  const [filteredStores, setFilteredStores] = useState<StoreData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStore, setSelectedStore] = useState<StoreDetails | null>(null);
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [setupResult, setSetupResult] = useState<any>(null);
  const [currentView, setCurrentView] = useState<'overview' | 'stores'>('overview');

  const [setupForm, setSetupForm] = useState({
    organization_name: '',
    domain: '',
    contact_email: '',
    phone: '',
    address: '',
    store_name: '',
    store_type: 'bar',
    owner_name: '',
    owner_email: '',
    owner_password: '',
    plan_name: 'スタンダード'
  });

  useEffect(() => {
    fetchDashboardData();
    fetchAllStores();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredStores(stores);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = stores.filter(store =>
        store.store_name.toLowerCase().includes(query) ||
        store.store_code.toLowerCase().includes(query) ||
        store.organization_name.toLowerCase().includes(query)
      );
      setFilteredStores(filtered);
    }
  }, [searchQuery, stores]);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`${API_BASE_URL}/api/admin/dashboard`, {
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

  const fetchAllStores = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`${API_BASE_URL}/api/admin/stores`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setStores(data);
        setFilteredStores(data);
      }
    } catch (error) {
      console.error('店舗一覧取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStoreDetails = async (storeId: number) => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`${API_BASE_URL}/api/admin/stores/${storeId}/details`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedStore(data);
        setShowStoreModal(true);
      }
    } catch (error) {
      console.error('店舗詳細取得エラー:', error);
    }
  };

  const toggleStoreActive = async (storeId: number) => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`${API_BASE_URL}/api/admin/stores/${storeId}/toggle-active`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        await fetchAllStores();
        await fetchDashboardData();
        alert('店舗のアクティブ状態を変更しました');
      }
    } catch (error) {
      console.error('アクティブ状態変更エラー:', error);
      alert('エラーが発生しました');
    }
  };

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`${API_BASE_URL}/api/admin/stores/setup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          organization_data: {
            name: setupForm.organization_name,
            domain: setupForm.domain,
            contact_email: setupForm.contact_email,
            phone: setupForm.phone,
            address: setupForm.address
          },
          store_data: {
            store_name: setupForm.store_name,
            store_type: setupForm.store_type,
            address: setupForm.address,
            phone: setupForm.phone
          },
          owner_data: {
            name: setupForm.owner_name,
            email: setupForm.owner_email,
            password: setupForm.owner_password
          },
          subscription_data: {
            plan_name: setupForm.plan_name
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        setSetupResult(result);
        await fetchDashboardData();
        await fetchAllStores();
      } else {
        const error = await response.json();
        alert(`エラー: ${error.detail}`);
      }
    } catch (error) {
      console.error('セットアップエラー:', error);
      alert('店舗のセットアップに失敗しました');
    }
  };

  const resetForm = () => {
    setSetupForm({
      organization_name: '',
      domain: '',
      contact_email: '',
      phone: '',
      address: '',
      store_name: '',
      store_type: 'bar',
      owner_name: '',
      owner_email: '',
      owner_password: '',
      plan_name: 'スタンダード'
    });
    setSetupResult(null);
    setShowSetupWizard(false);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
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
          <Building2 size={32} />
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>
              スーパーアドミンダッシュボード
            </h1>
            <p style={{ margin: '5px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
              {admin.name} ({admin.email})
            </p>
          </div>
        </div>
        <button
          onClick={onLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          <LogOut size={18} />
          ログアウト
        </button>
      </header>

      <div style={{ padding: '30px' }}>
        <div style={{ marginBottom: '30px', display: 'flex', gap: '15px' }}>
          <button
            onClick={() => setCurrentView('overview')}
            style={{
              padding: '12px 24px',
              background: currentView === 'overview' ? 'linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%)' : 'white',
              color: currentView === 'overview' ? 'white' : '#666',
              border: currentView === 'overview' ? 'none' : '2px solid #e5e7eb',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <TrendingUp size={18} />
            統計概要
          </button>
          <button
            onClick={() => setCurrentView('stores')}
            style={{
              padding: '12px 24px',
              background: currentView === 'stores' ? 'linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%)' : 'white',
              color: currentView === 'stores' ? 'white' : '#666',
              border: currentView === 'stores' ? 'none' : '2px solid #e5e7eb',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Store size={18} />
            店舗一覧
          </button>
          <button
            onClick={() => setShowSetupWizard(true)}
            style={{
              marginLeft: 'auto',
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Plus size={18} />
            新規店舗セットアップ
          </button>
        </div>

        {currentView === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
              borderRadius: '15px',
              padding: '25px',
              color: 'white',
              boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                <Building2 size={40} style={{ opacity: 0.9 }} />
                <span style={{ fontSize: '28px', fontWeight: '700' }}>{dashboardStats.total_organizations}</span>
              </div>
              <h3 style={{ margin: '0 0 5px 0', fontSize: '16px', fontWeight: '600', opacity: 0.95 }}>総組織数</h3>
              <p style={{ margin: 0, fontSize: '13px', opacity: 0.8 }}>登録されている組織の総数</p>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
              borderRadius: '15px',
              padding: '25px',
              color: 'white',
              boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                <Store size={40} style={{ opacity: 0.9 }} />
                <span style={{ fontSize: '28px', fontWeight: '700' }}>{dashboardStats.total_stores}</span>
              </div>
              <h3 style={{ margin: '0 0 5px 0', fontSize: '16px', fontWeight: '600', opacity: 0.95 }}>総店舗数</h3>
              <p style={{ margin: 0, fontSize: '13px', opacity: 0.8 }}>システム全体の店舗数</p>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
              borderRadius: '15px',
              padding: '25px',
              color: 'white',
              boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                <Users size={40} style={{ opacity: 0.9 }} />
                <span style={{ fontSize: '28px', fontWeight: '700' }}>{dashboardStats.total_employees}</span>
              </div>
              <h3 style={{ margin: '0 0 5px 0', fontSize: '16px', fontWeight: '600', opacity: 0.95 }}>総従業員数</h3>
              <p style={{ margin: 0, fontSize: '13px', opacity: 0.8 }}>全店舗の従業員合計</p>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              borderRadius: '15px',
              padding: '25px',
              color: 'white',
              boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                <DollarSign size={40} style={{ opacity: 0.9 }} />
                <span style={{ fontSize: '28px', fontWeight: '700' }}>
                  ¥{(dashboardStats.total_monthly_revenue / 10000).toFixed(1)}万
                </span>
              </div>
              <h3 style={{ margin: '0 0 5px 0', fontSize: '16px', fontWeight: '600', opacity: 0.95 }}>月間収益</h3>
              <p style={{ margin: 0, fontSize: '13px', opacity: 0.8 }}>サブスクリプション収益</p>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
              borderRadius: '15px',
              padding: '25px',
              color: 'white',
              boxShadow: '0 4px 15px rgba(6, 182, 212, 0.3)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                <Power size={40} style={{ opacity: 0.9 }} />
                <span style={{ fontSize: '28px', fontWeight: '700' }}>{dashboardStats.active_stores}</span>
              </div>
              <h3 style={{ margin: '0 0 5px 0', fontSize: '16px', fontWeight: '600', opacity: 0.95 }}>アクティブ店舗</h3>
              <p style={{ margin: 0, fontSize: '13px', opacity: 0.8 }}>稼働中の店舗数</p>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
              borderRadius: '15px',
              padding: '25px',
              color: 'white',
              boxShadow: '0 4px 15px rgba(100, 116, 139, 0.3)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                <Power size={40} style={{ opacity: 0.9 }} />
                <span style={{ fontSize: '28px', fontWeight: '700' }}>{dashboardStats.inactive_stores}</span>
              </div>
              <h3 style={{ margin: '0 0 5px 0', fontSize: '16px', fontWeight: '600', opacity: 0.95 }}>非アクティブ店舗</h3>
              <p style={{ margin: 0, fontSize: '13px', opacity: 0.8 }}>停止中の店舗数</p>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
              borderRadius: '15px',
              padding: '25px',
              color: 'white',
              boxShadow: '0 4px 15px rgba(236, 72, 153, 0.3)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                <Calendar size={40} style={{ opacity: 0.9 }} />
                <span style={{ fontSize: '28px', fontWeight: '700' }}>{dashboardStats.new_stores_this_month}</span>
              </div>
              <h3 style={{ margin: '0 0 5px 0', fontSize: '16px', fontWeight: '600', opacity: 0.95 }}>今月の新規店舗</h3>
              <p style={{ margin: 0, fontSize: '13px', opacity: 0.8 }}>当月追加された店舗数</p>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
              borderRadius: '15px',
              padding: '25px',
              color: 'white',
              boxShadow: '0 4px 15px rgba(20, 184, 166, 0.3)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                <DollarSign size={40} style={{ opacity: 0.9 }} />
                <span style={{ fontSize: '28px', fontWeight: '700' }}>
                  ¥{(dashboardStats.total_monthly_sales / 10000).toFixed(0)}万
                </span>
              </div>
              <h3 style={{ margin: '0 0 5px 0', fontSize: '16px', fontWeight: '600', opacity: 0.95 }}>総売上（今月）</h3>
              <p style={{ margin: 0, fontSize: '13px', opacity: 0.8 }}>全店舗の売上合計</p>
            </div>
          </div>
        )}

        {currentView === 'stores' && (
          <div>
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Search size={20} style={{ color: '#666' }} />
                <input
                  type="text"
                  placeholder="店舗名、店舗コード、組織名で検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                読み込み中...
              </div>
            ) : filteredStores.length === 0 ? (
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '40px',
                textAlign: 'center',
                color: '#666',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                {searchQuery ? '検索条件に一致する店舗が見つかりませんでした' : '店舗が登録されていません'}
              </div>
            ) : (
              <div style={{
                background: 'white',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ padding: '15px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>店舗コード</th>
                      <th style={{ padding: '15px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>店舗名</th>
                      <th style={{ padding: '15px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>組織名</th>
                      <th style={{ padding: '15px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>種類</th>
                      <th style={{ padding: '15px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>従業員数</th>
                      <th style={{ padding: '15px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>月間売上</th>
                      <th style={{ padding: '15px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>状態</th>
                      <th style={{ padding: '15px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#374151' }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStores.map((store) => (
                      <tr key={store.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '15px', fontSize: '13px', fontFamily: 'monospace', color: '#3b82f6', fontWeight: '600' }}>
                          {store.store_code}
                        </td>
                        <td style={{ padding: '15px', fontSize: '14px', fontWeight: '500' }}>
                          {store.store_name}
                        </td>
                        <td style={{ padding: '15px', fontSize: '14px', color: '#666' }}>
                          {store.organization_name}
                        </td>
                        <td style={{ padding: '15px', fontSize: '13px' }}>
                          <span style={{
                            padding: '4px 12px',
                            background: '#eff6ff',
                            color: '#1e40af',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}>
                            {store.store_type}
                          </span>
                        </td>
                        <td style={{ padding: '15px', fontSize: '14px', textAlign: 'center' }}>
                          {store.employee_count}人
                        </td>
                        <td style={{ padding: '15px', fontSize: '14px', fontWeight: '500' }}>
                          ¥{store.monthly_sales.toLocaleString()}
                        </td>
                        <td style={{ padding: '15px' }}>
                          <span style={{
                            padding: '4px 12px',
                            background: store.is_active ? '#d1fae5' : '#fee2e2',
                            color: store.is_active ? '#065f46' : '#991b1b',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}>
                            {store.is_active ? 'アクティブ' : '非アクティブ'}
                          </span>
                        </td>
                        <td style={{ padding: '15px' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                              onClick={() => fetchStoreDetails(store.id)}
                              style={{
                                padding: '6px 12px',
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Eye size={14} />
                              詳細
                            </button>
                            <button
                              onClick={() => toggleStoreActive(store.id)}
                              style={{
                                padding: '6px 12px',
                                background: store.is_active ? '#ef4444' : '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Power size={14} />
                              {store.is_active ? 'OFF' : 'ON'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {showStoreModal && selectedStore && (
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
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '15px',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{
              padding: '25px',
              borderBottom: '2px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
              color: 'white',
              borderRadius: '15px 15px 0 0'
            }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>店舗詳細情報</h2>
              <button
                onClick={() => setShowStoreModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px',
                  cursor: 'pointer',
                  color: 'white'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '25px' }}>
              <div style={{ marginBottom: '25px' }}>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: '600', color: '#1e40af' }}>
                  🏪 店舗情報
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666' }}>店舗コード</p>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', fontFamily: 'monospace', color: '#3b82f6' }}>
                      {selectedStore.store.store_code}
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666' }}>店舗名</p>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>{selectedStore.store.store_name}</p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666' }}>種類</p>
                    <p style={{ margin: 0, fontSize: '14px' }}>{selectedStore.store.store_type}</p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666' }}>状態</p>
                    <p style={{ margin: 0, fontSize: '14px' }}>
                      <span style={{
                        padding: '4px 12px',
                        background: selectedStore.store.is_active ? '#d1fae5' : '#fee2e2',
                        color: selectedStore.store.is_active ? '#065f46' : '#991b1b',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        {selectedStore.store.is_active ? 'アクティブ' : '非アクティブ'}
                      </span>
                    </p>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666' }}>住所</p>
                    <p style={{ margin: 0, fontSize: '14px' }}>{selectedStore.store.address}</p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666' }}>電話番号</p>
                    <p style={{ margin: 0, fontSize: '14px' }}>{selectedStore.store.phone}</p>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '25px' }}>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: '600', color: '#1e40af' }}>
                  🏢 組織情報
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666' }}>組織名</p>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>{selectedStore.organization.name}</p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666' }}>ドメイン</p>
                    <p style={{ margin: 0, fontSize: '14px' }}>{selectedStore.organization.domain}</p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666' }}>連絡先メール</p>
                    <p style={{ margin: 0, fontSize: '14px' }}>{selectedStore.organization.contact_email}</p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666' }}>電話番号</p>
                    <p style={{ margin: 0, fontSize: '14px' }}>{selectedStore.organization.phone}</p>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '25px' }}>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: '600', color: '#1e40af' }}>
                  💳 サブスクリプション
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666' }}>プラン</p>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>{selectedStore.subscription.plan_name}</p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666' }}>ステータス</p>
                    <p style={{ margin: 0, fontSize: '14px' }}>
                      <span style={{
                        padding: '4px 12px',
                        background: selectedStore.subscription.status === 'active' ? '#d1fae5' : '#fef3c7',
                        color: selectedStore.subscription.status === 'active' ? '#065f46' : '#92400e',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        {selectedStore.subscription.status}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666' }}>月額料金</p>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>¥{selectedStore.subscription.monthly_fee.toLocaleString()}</p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666' }}>次回更新日</p>
                    <p style={{ margin: 0, fontSize: '14px' }}>{selectedStore.subscription.next_billing_date}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: '600', color: '#1e40af' }}>
                  👥 従業員一覧 ({selectedStore.employees.length}人)
                </h3>
                <div style={{ maxHeight: '200px', overflow: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                        <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px' }}>従業員コード</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px' }}>名前</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px' }}>メール</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px' }}>ロール</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedStore.employees.map((emp: any) => (
                        <tr key={emp.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '10px', fontSize: '12px', fontFamily: 'monospace' }}>{emp.employee_code}</td>
                          <td style={{ padding: '10px', fontSize: '13px' }}>{emp.name}</td>
                          <td style={{ padding: '10px', fontSize: '13px' }}>{emp.email}</td>
                          <td style={{ padding: '10px', fontSize: '12px' }}>
                            <span style={{
                              padding: '3px 8px',
                              background: emp.role === 'owner' ? '#fef3c7' : emp.role === 'manager' ? '#dbeafe' : '#e5e7eb',
                              color: emp.role === 'owner' ? '#92400e' : emp.role === 'manager' ? '#1e40af' : '#374151',
                              borderRadius: '8px',
                              fontSize: '11px'
                            }}>
                              {emp.role}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSetupWizard && (
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
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '15px',
            maxWidth: '700px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{
              padding: '25px',
              borderBottom: '2px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              borderRadius: '15px 15px 0 0'
            }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>🏪 新規店舗セットアップ</h2>
              <button
                onClick={() => {
                  setShowSetupWizard(false);
                  resetForm();
                }}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px',
                  cursor: 'pointer',
                  color: 'white'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {!setupResult ? (
              <>
                <form onSubmit={handleSetupSubmit} style={{ padding: '25px' }}>
                  <div style={{ marginBottom: '30px' }}>
                    <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: '600', color: '#1e3a8a' }}>
                      🏢 組織情報
                    </h3>
                    <div style={{ display: 'grid', gap: '15px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>
                          組織名 *
                        </label>
                        <input
                          type="text"
                          required
                          value={setupForm.organization_name}
                          onChange={(e) => setSetupForm({...setupForm, organization_name: e.target.value})}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '2px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '14px'
                          }}
                          placeholder="例: Keyron株式会社"
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>
                          ドメイン
                        </label>
                        <input
                          type="text"
                          value={setupForm.domain}
                          onChange={(e) => setSetupForm({...setupForm, domain: e.target.value})}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '2px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '14px'
                          }}
                          placeholder="例: keyron.com"
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>
                          連絡先メール *
                        </label>
                        <input
                          type="email"
                          required
                          value={setupForm.contact_email}
                          onChange={(e) => setSetupForm({...setupForm, contact_email: e.target.value})}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '2px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '14px'
                          }}
                          placeholder="例: contact@keyron.com"
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '30px' }}>
                    <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: '600', color: '#1e3a8a' }}>
                      🏪 店舗情報
                    </h3>
                    <div style={{ display: 'grid', gap: '15px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>
                          店舗名 *
                        </label>
                        <input
                          type="text"
                          required
                          value={setupForm.store_name}
                          onChange={(e) => setSetupForm({...setupForm, store_name: e.target.value})}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '2px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '14px'
                          }}
                          placeholder="例: BAR KEYRON 六本木店"
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>
                          店舗タイプ
                        </label>
                        <select
                          value={setupForm.store_type}
                          onChange={(e) => setSetupForm({...setupForm, store_type: e.target.value})}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '2px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '14px'
                          }}
                        >
                          <option value="bar">バー</option>
                          <option value="club">クラブ</option>
                          <option value="lounge">ラウンジ</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>
                          電話番号
                        </label>
                        <input
                          type="tel"
                          value={setupForm.phone}
                          onChange={(e) => setSetupForm({...setupForm, phone: e.target.value})}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '2px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '14px'
                          }}
                          placeholder="例: 03-1234-5678"
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>
                          住所
                        </label>
                        <input
                          type="text"
                          value={setupForm.address}
                          onChange={(e) => setSetupForm({...setupForm, address: e.target.value})}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '2px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '14px'
                          }}
                          placeholder="例: 東京都港区六本木"
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '30px' }}>
                    <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: '600', color: '#1e3a8a' }}>
                      👤 オーナー情報
                    </h3>
                    <div style={{ display: 'grid', gap: '15px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>
                          オーナー名 *
                        </label>
                        <input
                          type="text"
                          required
                          value={setupForm.owner_name}
                          onChange={(e) => setSetupForm({...setupForm, owner_name: e.target.value})}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '2px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '14px'
                          }}
                          placeholder="例: 山田太郎"
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>
                          オーナーメール *
                        </label>
                        <input
                          type="email"
                          required
                          value={setupForm.owner_email}
                          onChange={(e) => setSetupForm({...setupForm, owner_email: e.target.value})}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '2px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '14px'
                          }}
                          placeholder="例: owner@keyron.com"
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>
                          初期パスワード *
                        </label>
                        <input
                          type="password"
                          required
                          value={setupForm.owner_password}
                          onChange={(e) => setSetupForm({...setupForm, owner_password: e.target.value})}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '2px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '14px'
                          }}
                          placeholder="8文字以上"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    style={{
                      width: '100%',
                      padding: '14px',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    セットアップを実行
                  </button>
                </form>
              </>
            ) : (
              <div style={{ padding: '25px' }}>
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
                    margin: '0 auto 20px',
                    fontSize: '40px'
                  }}>
                    ✓
                  </div>
                  <h2 style={{ margin: '0 0 10px 0', fontSize: '24px', fontWeight: '700', color: '#059669' }}>
                    セットアップ完了！
                  </h2>
                  <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                    新しい店舗が正常に作成されました
                  </p>
                </div>

                <div style={{
                  background: '#f9fafb',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '20px'
                }}>
                  <div style={{ display: 'grid', gap: '15px' }}>
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