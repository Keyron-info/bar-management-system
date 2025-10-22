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
      const response = await fetch('${API_BASE_URL}/api/admin/dashboard', {
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
      const response = await fetch('${API_BASE_URL}/api/admin/stores', {
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
      const response = await fetch('${API_BASE_URL}/api/admin/stores/setup', {
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
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{
            width: '50px',
            height: '50px',
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
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '10px',
          marginBottom: '30px',
          display: 'flex',
          gap: '10px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          <button
            onClick={() => setCurrentView('overview')}
            style={{
              flex: 1,
              padding: '12px',
              background: currentView === 'overview' ? 'linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%)' : 'transparent',
              color: currentView === 'overview' ? 'white' : '#666',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: '600'
            }}
          >
            📊 概要
          </button>
          <button
            onClick={() => setCurrentView('stores')}
            style={{
              flex: 1,
              padding: '12px',
              background: currentView === 'stores' ? 'linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%)' : 'transparent',
              color: currentView === 'stores' ? 'white' : '#666',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: '600'
            }}
          >
            🏪 店舗一覧
          </button>
        </div>

        {currentView === 'overview' && (
          <>
            {/* 8枚の統計カード */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '20px',
              marginBottom: '30px'
            }}>
              {/* 1. 総組織数 */}
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <p style={{ margin: 0, color: '#666', fontSize: '13px' }}>総組織数</p>
                    <h2 style={{ margin: '10px 0 0 0', fontSize: '28px', fontWeight: '700', color: '#1e3a8a' }}>
                      {dashboardStats.total_organizations}
                    </h2>
                  </div>
                  <Building2 size={22} color="#3b82f6" />
                </div>
              </div>

              {/* 2. アクティブ店舗 */}
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <p style={{ margin: 0, color: '#666', fontSize: '13px' }}>アクティブ店舗</p>
                    <h2 style={{ margin: '10px 0 0 0', fontSize: '28px', fontWeight: '700', color: '#059669' }}>
                      {dashboardStats.active_stores}
                    </h2>
                    <p style={{ margin: '5px 0 0 0', fontSize: '11px', color: '#999' }}>
                      全{dashboardStats.total_stores}店舗
                    </p>
                  </div>
                  <Store size={22} color="#10b981" />
                </div>
              </div>

              {/* 3. 今月の新規店舗 */}
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <p style={{ margin: 0, color: '#666', fontSize: '13px' }}>今月の新規店舗</p>
                    <h2 style={{ margin: '10px 0 0 0', fontSize: '28px', fontWeight: '700', color: '#7c3aed' }}>
                      {dashboardStats.new_stores_this_month}
                    </h2>
                    <p style={{ margin: '5px 0 0 0', fontSize: '11px', color: '#999' }}>
                      {new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })}
                    </p>
                  </div>
                  <TrendingUp size={22} color="#8b5cf6" />
                </div>
              </div>

              {/* 4. 総従業員数 */}
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <p style={{ margin: 0, color: '#666', fontSize: '13px' }}>総従業員数</p>
                    <h2 style={{ margin: '10px 0 0 0', fontSize: '28px', fontWeight: '700', color: '#ea580c' }}>
                      {dashboardStats.total_employees}
                    </h2>
                  </div>
                  <Users size={22} color="#f97316" />
                </div>
              </div>

              {/* 5. サブスク収益 */}
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <p style={{ margin: 0, color: '#666', fontSize: '13px' }}>サブスク収益/月</p>
                    <h2 style={{ margin: '10px 0 0 0', fontSize: '28px', fontWeight: '700', color: '#dc2626' }}>
                      ¥{Math.floor(dashboardStats.total_monthly_revenue / 10000)}万
                    </h2>
                    <p style={{ margin: '5px 0 0 0', fontSize: '11px', color: '#999' }}>
                      {dashboardStats.active_subscriptions}契約
                    </p>
                  </div>
                  <DollarSign size={22} color="#ef4444" />
                </div>
              </div>

              {/* 6. 月間総売上 */}
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <p style={{ margin: 0, color: '#666', fontSize: '13px' }}>月間総売上</p>
                    <h2 style={{ margin: '10px 0 0 0', fontSize: '28px', fontWeight: '700', color: '#0891b2' }}>
                      ¥{Math.floor(dashboardStats.total_monthly_sales / 10000)}万
                    </h2>
                    <p style={{ margin: '5px 0 0 0', fontSize: '11px', color: '#999' }}>
                      全店舗合計
                    </p>
                  </div>
                  <TrendingUp size={22} color="#06b6d4" />
                </div>
              </div>

              {/* 7. 平均売上/店舗 */}
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <p style={{ margin: 0, color: '#666', fontSize: '13px' }}>平均売上/店舗</p>
                    <h2 style={{ margin: '10px 0 0 0', fontSize: '28px', fontWeight: '700', color: '#059669' }}>
                      ¥{Math.floor(dashboardStats.average_sales_per_store / 10000)}万
                    </h2>
                    <p style={{ margin: '5px 0 0 0', fontSize: '11px', color: '#999' }}>
                      今月平均
                    </p>
                  </div>
                  <Store size={22} color="#10b981" />
                </div>
              </div>

              {/* 8. トライアル店舗 */}
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <p style={{ margin: 0, color: '#666', fontSize: '13px' }}>トライアル中</p>
                    <h2 style={{ margin: '10px 0 0 0', fontSize: '28px', fontWeight: '700', color: '#eab308' }}>
                      {dashboardStats.trial_subscriptions}
                    </h2>
                    <p style={{ margin: '5px 0 0 0', fontSize: '11px', color: '#999' }}>
                      店舗
                    </p>
                  </div>
                  <Calendar size={22} color="#facc15" />
                </div>
              </div>
            </div>

            {/* 新規店舗セットアップ */}
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '30px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
            }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', fontWeight: '600' }}>
                店舗管理
              </h3>
              <p style={{ margin: '0 0 20px 0', color: '#666', fontSize: '14px' }}>
                新しい組織・店舗をセットアップして、オーナーアカウントと初期設定を一括作成できます
              </p>
              <button
                onClick={() => setShowSetupWizard(true)}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '14px 30px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <Plus size={20} />
                新規店舗をセットアップ
              </button>
            </div>
          </>
        )}

        {/* 店舗一覧タブ */}
        {currentView === 'stores' && (
          <>
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
            }}>
              <div style={{ position: 'relative' }}>
                <Search size={20} style={{
                  position: 'absolute',
                  left: '15px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#666'
                }} />
                <input
                  type="text"
                  placeholder="店舗名、店舗コード、組織名で検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 12px 12px 45px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '15px'
                  }}
                />
              </div>
            </div>

            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
            }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600' }}>
                登録店舗一覧 ({filteredStores.length}件)
              </h3>

              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                  読み込み中...
                </div>
              ) : filteredStores.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                  {searchQuery ? '検索結果がありません' : '店舗がまだ登録されていません'}
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#666' }}>店舗コード</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#666' }}>店舗名</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#666' }}>組織名</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#666' }}>従業員数</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#666' }}>月間売上</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#666' }}>ステータス</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#666' }}>登録日</th>
                        <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#666' }}>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStores.map((store) => (
                        <tr key={store.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '12px', fontSize: '13px', fontFamily: 'monospace', color: '#3b82f6', fontWeight: '600' }}>
                            {store.store_code}
                          </td>
                          <td style={{ padding: '12px', fontSize: '14px', fontWeight: '500' }}>
                            {store.store_name}
                          </td>
                          <td style={{ padding: '12px', fontSize: '13px', color: '#666' }}>
                            {store.organization_name}
                          </td>
                          <td style={{ padding: '12px', fontSize: '13px' }}>
                            {store.employee_count}名
                          </td>
                          <td style={{ padding: '12px', fontSize: '13px', fontWeight: '600', color: '#059669' }}>
                            ¥{store.monthly_sales.toLocaleString()}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span style={{
                              padding: '4px 12px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '600',
                              background: store.is_active ? '#d1fae5' : '#fee2e2',
                              color: store.is_active ? '#065f46' : '#991b1b'
                            }}>
                              {store.is_active ? 'アクティブ' : '非アクティブ'}
                            </span>
                          </td>
                          <td style={{ padding: '12px', fontSize: '13px', color: '#666' }}>
                            {new Date(store.created_at).toLocaleDateString('ja-JP')}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                              <button
                                onClick={() => fetchStoreDetails(store.id)}
                                style={{
                                  background: '#3b82f6',
                                  border: 'none',
                                  color: 'white',
                                  padding: '6px 12px',
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
                                  background: store.is_active ? '#ef4444' : '#10b981',
                                  border: 'none',
                                  color: 'white',
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <Power size={14} />
                                {store.is_active ? '停止' : '有効化'}
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
          </>
        )}
      </div>

      {/* 店舗詳細モーダル */}
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
            borderRadius: '16px',
            maxWidth: '900px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            padding: '30px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '25px',
              paddingBottom: '15px',
              borderBottom: '2px solid #e5e7eb'
            }}>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>
                店舗詳細情報
              </h2>
              <button
                onClick={() => setShowStoreModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px'
                }}
              >
                <X size={24} color="#666" />
              </button>
            </div>

            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', fontWeight: '600', color: '#1e3a8a' }}>
                基本情報
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '15px',
                background: '#f9fafb',
                padding: '20px',
                borderRadius: '8px'
              }}>
                <div>
                  <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666' }}>店舗コード</p>
                  <p style={{ margin: 0, fontSize: '16px', fontWeight: '600', fontFamily: 'monospace', color: '#3b82f6' }}>
                    {selectedStore.store.store_code}
                  </p>
                </div>
                <div>
                  <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666' }}>店舗名</p>
                  <p style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                    {selectedStore.store.store_name}
                  </p>
                </div>
                <div>
                  <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666' }}>組織名</p>
                  <p style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                    {selectedStore.organization?.name || '不明'}
                  </p>
                </div>
                <div>
                  <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666' }}>電話番号</p>
                  <p style={{ margin: 0, fontSize: '16px' }}>
                    {selectedStore.store.phone || '-'}
                  </p>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666' }}>住所</p>
                  <p style={{ margin: 0, fontSize: '16px' }}>
                    {selectedStore.store.address || '-'}
                  </p>
                </div>
              </div>
            </div>

            {selectedStore.subscription && (
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', fontWeight: '600', color: '#1e3a8a' }}>
                  サブスクリプション
                </h3>
                <div style={{
                  background: '#f9fafb',
                  padding: '20px',
                  borderRadius: '8px'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                    <div>
                      <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666' }}>プラン</p>
                      <p style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                        {selectedStore.subscription.plan_name}
                      </p>
                    </div>
                    <div>
                      <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666' }}>ステータス</p>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '13px',
                        fontWeight: '600',
                        background: selectedStore.subscription.status === 'active' ? '#d1fae5' : '#fee2e2',
                        color: selectedStore.subscription.status === 'active' ? '#065f46' : '#991b1b'
                      }}>
                        {selectedStore.subscription.status === 'active' ? 'アクティブ' : '停止中'}
                      </span>
                    </div>
                    <div>
                      <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666' }}>月額料金</p>
                      <p style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#059669' }}>
                        ¥{selectedStore.subscription.monthly_fee.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', fontWeight: '600', color: '#1e3a8a' }}>
                従業員一覧 ({selectedStore.employees.length}名)
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#666' }}>従業員コード</th>
                      <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#666' }}>名前</th>
                      <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#666' }}>メール</th>
                      <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#666' }}>役割</th>
                      <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#666' }}>雇用形態</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedStore.employees.map((emp: any) => (
                      <tr key={emp.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '10px', fontSize: '12px', fontFamily: 'monospace' }}>
                          {emp.employee_code}
                        </td>
                        <td style={{ padding: '10px', fontSize: '13px', fontWeight: '500' }}>
                          {emp.name}
                        </td>
                        <td style={{ padding: '10px', fontSize: '13px', color: '#666' }}>
                          {emp.email}
                        </td>
                        <td style={{ padding: '10px', fontSize: '13px' }}>
                          {emp.role === 'owner' ? 'オーナー' : emp.role === 'manager' ? '店長' : 'スタッフ'}
                        </td>
                        <td style={{ padding: '10px', fontSize: '13px' }}>
                          {emp.employment_type || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedStore.sales_history && selectedStore.sales_history.length > 0 && (
              <div>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', fontWeight: '600', color: '#1e3a8a' }}>
                  売上推移（過去6ヶ月）
                </h3>
                <div style={{
                  background: '#f9fafb',
                  padding: '20px',
                  borderRadius: '8px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: '10px',
                    height: '200px'
                  }}>
                    {selectedStore.sales_history.map((item: any, index: number) => {
                      const maxSales = Math.max(...selectedStore.sales_history.map((h: any) => h.total_sales));
                      const height = maxSales > 0 ? (item.total_sales / maxSales) * 100 : 0;
                      
                      return (
                        <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div
                            style={{
                              width: '100%',
                              height: `${height}%`,
                              background: 'linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%)',
                              borderRadius: '4px 4px 0 0',
                              transition: 'all 0.3s',
                              position: 'relative'
                            }}
                            title={`¥${item.total_sales.toLocaleString()}`}
                          >
                            <div style={{
                              position: 'absolute',
                              top: '-25px',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              fontSize: '11px',
                              fontWeight: '600',
                              color: '#3b82f6',
                              whiteSpace: 'nowrap'
                            }}>
                              ¥{Math.floor(item.total_sales / 10000)}万
                            </div>
                          </div>
                          <div style={{
                            marginTop: '8px',
                            fontSize: '11px',
                            color: '#666',
                            textAlign: 'center'
                          }}>
                            {new Date(item.month).toLocaleDateString('ja-JP', { month: 'short' })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 新規店舗セットアップウィザード */}
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
            borderRadius: '16px',
            maxWidth: '700px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            padding: '30px'
          }}>
            {!setupResult ? (
              <>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '25px'
                }}>
                  <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>
                    新規店舗セットアップ
                  </h2>
                  <button
                    onClick={() => setShowSetupWizard(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '8px'
                    }}
                  >
                    <X size={24} color="#666" />
                  </button>
                </div>

                <form onSubmit={handleSetupSubmit}>
                  <div style={{ marginBottom: '30px' }}>
                    <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: '600', color: '#1e3a8a' }}>
                      📋 組織情報
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
                          placeholder="例: KEYRON株式会社"
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>
                          ドメイン *
                        </label>
                        <input
                          type="text"
                          required
                          value={setupForm.domain}
                          onChange={(e) => setSetupForm({...setupForm, domain: e.target.value})}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '2px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '14px'
                          }}
                          placeholder="例: keyron-bar"
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
                          placeholder="例: KEYRON六本木店"
                        />
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
              <div>
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