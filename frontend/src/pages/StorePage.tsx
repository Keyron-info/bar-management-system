import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { Settings, X, Target, TrendingUp, Users, FileText, Download } from 'lucide-react';
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
  total_drinks: number;
  total_catch: number;
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

interface DailySalesData {
  date: string;
  day: string;
  sales: number;
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
  const [dailySalesData, setDailySalesData] = useState<DailySalesData[]>([]);
  const [savingGoal, setSavingGoal] = useState(false);

  useEffect(() => {
    // 🆕 修正: owner も manager と同じくアクセス可能
    if (user.role === 'manager' || user.role === 'owner') {
      fetchStoreData();
      loadStoreGoals();
    }
  }, [user.role]);

  // 店舗目標をバックエンドAPIから読み込み
  const loadStoreGoals = async () => {
    try {
      const token = localStorage.getItem('token');
      const store_id = user.store_id;
      if (!token || !store_id) return;

      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      const response = await fetch(`${API_BASE_URL}/api/stores/${store_id}/goals?year=${year}&month=${month}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStoreGoalSettings({
          weekdayTarget: data.weekday_sales_goal || 150000,
          weekendTarget: data.weekend_sales_goal || 300000,
          totalMonthlyTarget: data.monthly_sales_goal || 2000000
        });
      }
    } catch (error) {
      console.error('目標読み込みエラー:', error);
    }
  };

  // 店舗目標をバックエンドAPIに保存
  const saveStoreGoalsToStorage = async () => {
    setSavingGoal(true);
    try {
      const token = localStorage.getItem('token');
      const store_id = user.store_id;
      if (!token || !store_id) return;

      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      const response = await fetch(`${API_BASE_URL}/api/stores/${store_id}/goals`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          year,
          month,
          monthly_sales_goal: storeGoalSettings.totalMonthlyTarget,
          weekday_sales_goal: storeGoalSettings.weekdayTarget,
          weekend_sales_goal: storeGoalSettings.weekendTarget
        })
      });

      if (response.ok) {
        alert('店舗目標を保存しました！');
        setShowTargetSettings(false);
      } else {
        const error = await response.json();
        alert(error.detail || '保存中にエラーが発生しました');
      }
    } catch (error) {
      console.error('目標保存エラー:', error);
      alert('保存中にエラーが発生しました');
    } finally {
      setSavingGoal(false);
    }
  };

  const fetchStoreData = async () => {
    try {
      const token = localStorage.getItem('token');
      const store_id = user.store_id;
      
      if (!token || !store_id) return;

      const dashboardResponse = await fetch(`${API_BASE_URL}/api/stores/${store_id}/dashboard`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      const reportsResponse = await fetch(`${API_BASE_URL}/api/stores/${store_id}/daily-reports`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      // 🆕 従業員一覧を取得して名前をマッピング
      const employeesResponse = await fetch(`${API_BASE_URL}/api/stores/${store_id}/employees`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      let employeeNames: Record<number, string> = {};
      if (employeesResponse.ok) {
        const employees = await employeesResponse.json();
        employees.forEach((emp: any) => {
          employeeNames[emp.id] = emp.name;
        });
      }

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
        
        // 🆕 過去7日間の売上データを集計
        const last7Days: DailySalesData[] = [];
        const today = new Date();
        
        for (let i = 6; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(today.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          
          const daySales = reports
            .filter((r: any) => r.date === dateStr)
            .reduce((sum: number, r: any) => sum + (r.total_sales || 0), 0);
          
          last7Days.push({
            date: dateStr,
            day: `${date.getDate()}日`,
            sales: daySales
          });
        }
        setDailySalesData(last7Days);
        
        // 🆕 従業員別の集計を更新（ドリンク・キャッチも含む）
        const employeeMap = new Map<number, EmployeeReport>();
        
        // 今月のレポートのみフィルタ
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        const thisMonthReports = reports.filter((r: any) => {
          const reportDate = new Date(r.date);
          return reportDate.getMonth() + 1 === currentMonth && reportDate.getFullYear() === currentYear;
        });
        
        thisMonthReports.forEach((report: any) => {
          if (!employeeMap.has(report.employee_id)) {
            employeeMap.set(report.employee_id, {
              employee_id: report.employee_id,
              employee_name: employeeNames[report.employee_id] || `従業員${report.employee_id}`,
              total_sales: 0,
              report_count: 0,
              approved_count: 0,
              total_drinks: 0,
              total_catch: 0
            });
          }
          
          const empReport = employeeMap.get(report.employee_id)!;
          empReport.total_sales += report.total_sales || 0;
          empReport.total_drinks += report.drink_count || 0;
          empReport.total_catch += report.catch_count || 0;
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

  // 🆕 実データを使用（空の場合はデフォルト表示）
  const displaySalesData = dailySalesData.length > 0 ? dailySalesData : [
    { date: '', day: '-', sales: 0 },
    { date: '', day: '-', sales: 0 },
    { date: '', day: '-', sales: 0 },
    { date: '', day: '-', sales: 0 },
    { date: '', day: '-', sales: 0 },
    { date: '', day: '-', sales: 0 },
    { date: '', day: '-', sales: 0 }
  ];

  const maxDailySales = Math.max(...displaySalesData.map(d => d.sales), 1);
  
  // 🆕 平日・週末の達成率を実データから計算
  const calculateDayTypeAchievement = () => {
    if (dailySalesData.length === 0) return { weekday: 0, weekend: 0 };
    
    let weekdaySales = 0;
    let weekdayCount = 0;
    let weekendSales = 0;
    let weekendCount = 0;
    
    dailySalesData.forEach(item => {
      const date = new Date(item.date);
      const dayOfWeek = date.getDay();
      
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        weekendSales += item.sales;
        weekendCount++;
      } else {
        weekdaySales += item.sales;
        weekdayCount++;
      }
    });
    
    const avgWeekday = weekdayCount > 0 ? weekdaySales / weekdayCount : 0;
    const avgWeekend = weekendCount > 0 ? weekendSales / weekendCount : 0;
    
    return {
      weekday: storeGoalSettings.weekdayTarget > 0 
        ? Math.round((avgWeekday / storeGoalSettings.weekdayTarget) * 100) 
        : 0,
      weekend: storeGoalSettings.weekendTarget > 0 
        ? Math.round((avgWeekend / storeGoalSettings.weekendTarget) * 100) 
        : 0
    };
  };
  
  const dayTypeAchievement = calculateDayTypeAchievement();
  const weekdayAchievementRate = dayTypeAchievement.weekday;
  const weekendAchievementRate = dayTypeAchievement.weekend;

  const saveTargetSettings = () => {
    saveStoreGoalsToStorage();
  };

  // 🆕 日報データをCSVエクスポート
  const handleExportCSV = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('認証エラー');
        return;
      }
      
      // 今月の開始日と終了日を計算
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const dateFrom = firstDay.toISOString().split('T')[0];
      const dateTo = lastDay.toISOString().split('T')[0];
      
      const response = await fetch(
        `${API_BASE_URL}/api/exports/daily-reports?format=csv&date_from=${dateFrom}&date_to=${dateTo}`,
        {
          headers: { 
            'Authorization': `Bearer ${token}`,
          }
        }
      );
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `daily_reports_${dateFrom}_${dateTo}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const error = await response.json();
        alert(error.detail || 'エクスポートに失敗しました');
      }
    } catch (error) {
      console.error('エクスポートエラー:', error);
      alert('エクスポート中にエラーが発生しました');
    }
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
      {/* 🆕 エクスポートボタン */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        marginBottom: '15px'
      }}>
        <button
          onClick={handleExportCSV}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            background: 'linear-gradient(135deg, #27ae60, #2ecc71)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(39, 174, 96, 0.3)'
          }}
        >
          <Download size={16} />
          日報CSVダウンロード
        </button>
      </div>

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
                {displaySalesData.map((item, index) => {
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
                        {item.sales > 0 ? `${Math.floor(item.sales / 10000)}万` : '-'}
                      </div>
                      <div style={{
                        width: '20px',
                        height: `${Math.max(height, 20)}px`,
                        background: item.sales > 0 
                          ? 'linear-gradient(180deg, #9333EA 0%, #F0E 100%)' 
                          : '#e1e8ed',
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
                          日報: {employee.report_count}件 | 🍹{employee.total_drinks}杯 | 🎯{employee.total_catch}回
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
                    onClick={() => setShowTargetSettings(false)}
                    style={{
                      background: 'white',
                      color: '#666',
                      border: '1px solid #e1e8ed',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    キャンセル
                  </button>
                  <button 
                    onClick={saveTargetSettings}
                    disabled={savingGoal}
                    style={{
                      background: savingGoal ? '#ccc' : 'linear-gradient(135deg, #9333EA, #F0E)',
                      color: 'white',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: savingGoal ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {savingGoal ? '保存中...' : '保存'}
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