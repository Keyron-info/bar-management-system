import React, { useState, useEffect } from 'react';
import { Settings, X, Target, TrendingUp, Users, FileText } from 'lucide-react';
import ReportHistoryPage from './ReportHistoryPage';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  store_id?: number;
}

interface StorePageProps {
  user: User;
}

interface EmployeeReport {
  employee_id: number;
  employee_name: string;
  total_sales: number;
  report_count: number;
  approved_count: number;
}

interface StoreGoalSettings {
  weekdayTarget: number;
  weekendTarget: number;
  totalMonthlyTarget: number;
}

interface StoreSummary {
  today_sales: number;
  month_sales: number;
  active_employees: number;
  pending_reports: number;
}

const StorePage: React.FC<StorePageProps> = ({ user }) => {
  // 🆕 タブ状態
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');
  
  const [employeeReports, setEmployeeReports] = useState<EmployeeReport[]>([]);
  const [storeSummary, setStoreSummary] = useState<StoreSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTargetSettings, setShowTargetSettings] = useState(false);
  const [storeGoalSettings, setStoreGoalSettings] = useState<StoreGoalSettings>({
    weekdayTarget: 150000,
    weekendTarget: 300000,
    totalMonthlyTarget: 2000000
  });

  useEffect(() => {
    // 🆕 修正: owner も manager と同じくアクセス可能
    if (user.role === 'manager' || user.role === 'owner') {
      fetchStoreData();
    }
  }, [user.role]);

  const fetchStoreData = async () => {
    try {
      const token = localStorage.getItem('token');
      const store_id = user.store_id;
      
      if (!token || !store_id) return;

      const dashboardResponse = await fetch(`http://localhost:8002/api/stores/${store_id}/dashboard`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      const reportsResponse = await fetch(`http://localhost:8002/api/stores/${store_id}/daily-reports`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (dashboardResponse.ok) {
        const dashboard = await dashboardResponse.json();
        setStoreSummary({
          today_sales: dashboard.today_sales || 0,
          month_sales: dashboard.month_sales || 0,
          active_employees: dashboard.active_employees || 0,
          pending_reports: dashboard.pending_reports || 0
        });
      }

      if (reportsResponse.ok) {
        const reports = await reportsResponse.json();
        
        const employeeMap = new Map<number, EmployeeReport>();
        
        reports.forEach((report: any) => {
          if (!employeeMap.has(report.employee_id)) {
            employeeMap.set(report.employee_id, {
              employee_id: report.employee_id,
              employee_name: `従業員${report.employee_id}`,
              total_sales: 0,
              report_count: 0,
              approved_count: 0
            });
          }
          
          const empReport = employeeMap.get(report.employee_id)!;
          empReport.total_sales += report.total_sales;
          empReport.report_count++;
          if (report.is_approved) {
            empReport.approved_count++;
          }
        });

        const sortedReports = Array.from(employeeMap.values())
          .sort((a, b) => b.total_sales - a.total_sales);
        
        setEmployeeReports(sortedReports);
      }
    } catch (error) {
      console.error('データ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalStoreSales = storeSummary?.month_sales || 0;
  const achievementRate = (totalStoreSales / storeGoalSettings.totalMonthlyTarget) * 100;

  const dailySalesData = [
    { day: '17日', sales: 180000 },
    { day: '18日', sales: 220000 },
    { day: '19日', sales: 160000 },
    { day: '20日', sales: 280000 },
    { day: '21日', sales: 320000 },
    { day: '22日', sales: 190000 },
    { day: '23日', sales: 240000 }
  ];

  const maxDailySales = Math.max(...dailySalesData.map(d => d.sales));
  const weekdayAchievementRate = 78;
  const weekendAchievementRate = 85;

  const saveTargetSettings = () => {
    console.log('店舗目標設定を保存:', storeGoalSettings);
    setShowTargetSettings(false);
  };

  // 🆕 権限チェック: owner も許可
  if (user.role !== 'manager' && user.role !== 'owner') {
    return (
      <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#FAFAFA', minHeight: '100vh' }}>
        <div style={{ fontSize: '18px', color: '#e74c3c' }}>店長・オーナーのみアクセス可能です</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#FAFAFA', minHeight: '100vh' }}>
        <div style={{ fontSize: '18px', color: '#666' }}>データを読み込んでいます...</div>
      </div>
    );
  }

  return (
    <div style={{ 
      maxWidth: '600px', 
      margin: '0 auto', 
      padding: '20px', 
      backgroundColor: '#FAFAFA', 
      minHeight: '100vh',
      fontFamily: '"Noto Sans JP", sans-serif'
    }}>
      {/* 🆕 タブナビゲーション */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        borderBottom: '2px solid #e1e8ed'
      }}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            flex: 1,
            padding: '12px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'overview' ? '3px solid #9333EA' : '3px solid transparent',
            color: activeTab === 'overview' ? '#9333EA' : '#666',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <TrendingUp size={20} />
          概要
        </button>
        <button
          onClick={() => setActiveTab('history')}
          style={{
            flex: 1,
            padding: '12px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'history' ? '3px solid #9333EA' : '3px solid transparent',
            color: activeTab === 'history' ? '#9333EA' : '#666',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <FileText size={20} />
          日報履歴
        </button>
      </div>

      {/* タブコンテンツ */}
      {activeTab === 'overview' ? (
        // ✅ 既存の概要タブ（全機能保持）
        <>
          {/* 今月の目標セクション */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '25px',
            marginBottom: '25px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
            border: '1px solid #e1e8ed'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '20px' 
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Target size={20} style={{ color: '#9333EA' }} />
                <span style={{ 
                  fontSize: '18px', 
                  color: '#000', 
                  fontWeight: '600'
                }}>
                  今月の目標
                </span>
              </div>
              <button 
                onClick={() => setShowTargetSettings(true)}
                style={{
                  background: 'white',
                  border: '1px solid #e1e8ed',
                  borderRadius: '8px',
                  padding: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                }}
              >
                <Settings size={16} color="#9333EA" />
              </button>
            </div>

            {/* 月間目標表示 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '15px',
              marginBottom: '25px'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>月間目標</div>
                <div style={{ 
                  fontSize: '24px', 
                  fontWeight: '700',
                  background: 'linear-gradient(90deg, #9333EA 0%, #F0E 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  {Math.floor(storeGoalSettings.totalMonthlyTarget / 10000)}万円
                </div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>現在売上</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#000' }}>
                  {Math.floor(totalStoreSales / 10000)}万円
                </div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>従業員数</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#000' }}>
                  {storeSummary?.active_employees || 0}人
                </div>
              </div>
            </div>

            {/* 達成率の横バー */}
            <div style={{ marginBottom: '25px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <span style={{ fontSize: '14px', color: '#666' }}>達成率</span>
                <span style={{ 
                  fontSize: '18px', 
                  fontWeight: 'bold',
                  color: achievementRate >= 100 ? '#27ae60' : '#9333EA'
                }}>
                  {achievementRate.toFixed(1)}%
                </span>
              </div>
              <div style={{
                width: '100%',
                height: '12px',
                backgroundColor: '#f1f3f4',
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${Math.min(achievementRate, 100)}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #9333EA 0%, #F0E 100%)',
                  transition: 'width 0.6s ease',
                  borderRadius: '8px'
                }} />
              </div>
            </div>

            {/* 線グラフエリア */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '15px'
              }}>
                <TrendingUp size={18} style={{ color: '#9333EA' }} />
                <span style={{ fontSize: '16px', fontWeight: '600', color: '#000' }}>売上推移グラフ</span>
              </div>
              
              <div style={{
                height: '140px',
                background: '#fafafa',
                borderRadius: '8px',
                padding: '20px 15px',
                display: 'flex',
                alignItems: 'end',
                gap: '12px'
              }}>
                {dailySalesData.map((item, index) => {
                  const height = maxDailySales > 0 ? (item.sales / maxDailySales) * 80 : 20;
                  
                  return (
                    <div key={index} style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      flex: 1
                    }}>
                      <div style={{ fontSize: '10px', color: '#666', textAlign: 'center' }}>
                        {Math.floor(item.sales / 10000)}万
                      </div>
                      <div style={{
                        width: '20px',
                        height: `${Math.max(height, 20)}px`,
                        background: 'linear-gradient(180deg, #9333EA 0%, #F0E 100%)',
                        borderRadius: '4px',
                        minHeight: '20px'
                      }} />
                      <div style={{
                        fontSize: '11px',
                        color: '#666',
                        whiteSpace: 'nowrap'
                      }}>
                        {item.day}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 平日・週末目標 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div style={{ 
                padding: '15px', 
                background: '#fafafa', 
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>平日目標</div>
                <div style={{ fontSize: '18px', fontWeight: '600', color: '#9333EA', marginBottom: '5px' }}>
                  {Math.floor(storeGoalSettings.weekdayTarget / 10000)}万円
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  達成率: {weekdayAchievementRate}%
                </div>
              </div>
              <div style={{ 
                padding: '15px', 
                background: '#fafafa', 
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>週末目標</div>
                <div style={{ fontSize: '18px', fontWeight: '600', color: '#F0E', marginBottom: '5px' }}>
                  {Math.floor(storeGoalSettings.weekendTarget / 10000)}万円
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  達成率: {weekendAchievementRate}%
                </div>
              </div>
            </div>
          </div>

          {/* 従業員ランキング */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '25px',
            marginBottom: '25px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
            border: '1px solid #e1e8ed'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '20px'
            }}>
              <Users size={20} style={{ color: '#9333EA' }} />
              <h2 style={{ 
                fontSize: '18px', 
                color: '#000', 
                margin: '0',
                fontWeight: '600'
              }}>
                従業員売上ランキング
              </h2>
            </div>
            
            {employeeReports.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {employeeReports.map((employee, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '15px 20px',
                    backgroundColor: index < 3 ? '#fafaff' : 'white',
                    borderRadius: '8px',
                    border: `1px solid ${index < 3 ? '#e1e8ed' : '#f0f0f0'}`,
                    transition: 'all 0.2s ease'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        backgroundColor: index === 0 ? '#FFD700' : 
                                        index === 1 ? '#C0C0C0' : 
                                        index === 2 ? '#CD7F32' : '#e1e8ed',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: index < 3 ? 'white' : '#666'
                      }}>
                        {index + 1}
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '16px', color: '#000' }}>
                          {employee.employee_name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          日報: {employee.report_count}件 | 承認済: {employee.approved_count}件
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#000' }}>
                        ¥{employee.total_sales.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#666', padding: '40px', backgroundColor: '#fafafa', borderRadius: '8px' }}>
                データがありません
              </div>
            )}
          </div>

          {/* 目標設定モーダル */}
          {showTargetSettings && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000,
              padding: '20px'
            }}>
              <div style={{
                background: 'white',
                borderRadius: '12px',
                width: '100%',
                maxWidth: '400px',
                maxHeight: '90vh',
                overflow: 'auto',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '20px',
                  borderBottom: '1px solid #e1e8ed'
                }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#000' }}>
                    今月の目標設定
                  </h3>
                  <button 
                    onClick={() => setShowTargetSettings(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '8px',
                      borderRadius: '6px',
                      color: '#666'
                    }}
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <div style={{ padding: '20px' }}>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontWeight: '500',
                      color: '#000',
                      fontSize: '14px'
                    }}>
                      月間目標
                    </label>
                    <input
                      type="number"
                      value={storeGoalSettings.totalMonthlyTarget}
                      onChange={(e) => setStoreGoalSettings(prev => ({
                        ...prev,
                        totalMonthlyTarget: Number(e.target.value)
                      }))}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '2px solid #e1e8ed',
                        borderRadius: '8px',
                        fontSize: '16px',
                        color: '#000',
                        backgroundColor: 'white',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontWeight: '500',
                      color: '#000',
                      fontSize: '14px'
                    }}>
                      平日目標（1日あたり）
                    </label>
                    <input
                      type="number"
                      value={storeGoalSettings.weekdayTarget}
                      onChange={(e) => setStoreGoalSettings(prev => ({
                        ...prev,
                        weekdayTarget: Number(e.target.value)
                      }))}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '2px solid #e1e8ed',
                        borderRadius: '8px',
                        fontSize: '16px',
                        color: '#000',
                        backgroundColor: 'white',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontWeight: '500',
                      color: '#000',
                      fontSize: '14px'
                    }}>
                      週末目標（1日あたり）
                    </label>
                    <input
                      type="number"
                      value={storeGoalSettings.weekendTarget}
                      onChange={(e) => setStoreGoalSettings(prev => ({
                        ...prev,
                        weekendTarget: Number(e.target.value)
                      }))}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '2px solid #e1e8ed',
                        borderRadius: '8px',
                        fontSize: '16px',
                        color: '#000',
                        backgroundColor: 'white',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div style={{
                  padding: '20px',
                  borderTop: '1px solid #e1e8ed',
                  display: 'flex',
                  gap: '10px',
                  justifyContent: 'flex-end'
                }}>
                  <button 
                    onClick={saveTargetSettings}
                    style={{
                      background: 'linear-gradient(135deg, #9333EA, #F0E)',
                      color: 'white',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    保存
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        // 🆕 日報履歴タブ
        <div style={{ marginTop: '-20px' }}>
          <ReportHistoryPage user={user} />
        </div>
      )}
    </div>
  );
};

export default StorePage;