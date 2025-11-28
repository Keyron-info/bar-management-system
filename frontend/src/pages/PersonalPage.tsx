import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { Settings, X, ChevronDown, TrendingUp } from 'lucide-react';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  store_id?: number;
}

interface PersonalPageProps {
  user: User;
  onPageChange?: (page: string) => void;
  onLogout?: () => void;
}

// 🆕 拡張: 日報インターフェースにドリンク・シャンパン・キャッチ情報を追加
interface DailyReport {
  id: number;
  date: string;
  total_sales: number;
  cash_sales: number;
  card_sales: number;
  drink_count: number;          // 🆕 追加
  champagne_type: string;       // 🆕 追加
  champagne_price: number;      // 🆕 追加
  catch_count: number;          // 🆕 キャッチ数追加
  is_approved: boolean;
}

// 🆕 拡張: 月次サマリーにドリンク・シャンパン・キャッチ集計を追加
interface MonthlySummary {
  total_reports: number;
  total_sales: number;
  average_sales: number;
  approved_count: number;
  total_drinks: number;         // 🆕 追加
  total_champagne_count: number; // 🆕 追加
  total_catch: number;          // 🆕 キャッチ追加
}

interface GoalSettings {
  sales: number;
  drinks: number;
  catch: number;
}

const PersonalPage: React.FC<PersonalPageProps> = ({ user, onPageChange, onLogout }) => {
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null);
  const [goalSettings, setGoalSettings] = useState<GoalSettings>({
    sales: 500000,
    drinks: 100,
    catch: 50
  });
  const [loading, setLoading] = useState(true);
  const [showGoalSettings, setShowGoalSettings] = useState(false);
  const [chartType, setChartType] = useState<'sales' | 'drinks' | 'catch'>('sales');
  const [showChartDropdown, setShowChartDropdown] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);

  const chartOptions = [
    { key: 'sales', label: '売上', unit: '円' },
    { key: 'drinks', label: 'ドリンク', unit: '杯' },
    { key: 'catch', label: 'キャッチ', unit: '回' }
  ];

  useEffect(() => {
    fetchPersonalData();
    fetchPersonalGoal();
  }, []);

  // 🆕 個人目標をAPIから取得
  const fetchPersonalGoal = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;

      const response = await fetch(
        `${API_BASE_URL}/api/personal-goals?year=${currentYear}&month=${currentMonth}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('✅ 目標データ取得成功:', data);
        setGoalSettings({
          sales: data.sales_goal || 500000,
          drinks: data.drinks_goal || 100,
          catch: data.catch_goal || 50
        });
      }
    } catch (error) {
      console.error('❌ 目標取得エラー:', error);
    }
  };

  // 🆕 個人目標をAPIに保存
  const savePersonalGoal = async () => {
    setSavingGoal(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('認証エラー: ログインしてください');
        return;
      }

      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;

      const response = await fetch(`${API_BASE_URL}/api/personal-goals`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          year: currentYear,
          month: currentMonth,
          sales_goal: goalSettings.sales,
          drinks_goal: goalSettings.drinks,
          catch_goal: goalSettings.catch
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ 目標保存成功:', data);
        alert('目標を保存しました！');
        setShowGoalSettings(false);
      } else {
        const error = await response.json();
        console.error('❌ 目標保存エラー:', error);
        alert(`保存エラー: ${error.detail || '不明なエラー'}`);
      }
    } catch (error) {
      console.error('❌ 目標保存エラー:', error);
      alert('保存中にエラーが発生しました');
    } finally {
      setSavingGoal(false);
    }
  };

  // 🆕 改善: ドリンク・シャンパン数の集計を追加
  const fetchPersonalData = async () => {
    try {
      const token = localStorage.getItem('token');
      const store_id = user.store_id;
      
      console.log('🔍 デバッグ:', { token: token?.slice(0, 20) + '...', store_id, user_id: user.id });
      
      if (!token || !store_id) {
        console.error('❌ トークンまたはstore_idが見つかりません');
        setLoading(false);
        return;
      }

      // 自分の日報一覧を取得
      const reportsResponse = await fetch(
        `${API_BASE_URL}/api/stores/${store_id}/daily-reports?employee_id=${user.id}`,
        {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        }
      );

      console.log('📡 レスポンスステータス:', reportsResponse.status);

      if (reportsResponse.ok) {
        const reports = await reportsResponse.json();
        console.log('✅ 日報データ取得成功:', reports.length, '件');
        console.log('📊 サンプルデータ:', reports[0]); // データ構造確認用
        setDailyReports(reports);
        
        // 月次サマリーを計算
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        const thisMonthReports = reports.filter((report: DailyReport) => {
          const reportDate = new Date(report.date);
          return reportDate.getMonth() + 1 === currentMonth && reportDate.getFullYear() === currentYear;
        });
        
        const totalSales = thisMonthReports.reduce((sum: number, r: DailyReport) => sum + r.total_sales, 0);
        const approvedCount = thisMonthReports.filter((r: DailyReport) => r.is_approved).length;
        
        // 🆕 ドリンク数の集計
        const totalDrinks = thisMonthReports.reduce((sum: number, r: DailyReport) => {
          return sum + (r.drink_count || 0);
        }, 0);
        
        // 🆕 シャンパン本数の集計（champagne_priceが0より大きい場合は1本とカウント）
        const totalChampagneCount = thisMonthReports.filter((r: DailyReport) => 
          (r.champagne_price || 0) > 0
        ).length;

        // 🆕 キャッチ数の集計
        const totalCatch = thisMonthReports.reduce((sum: number, r: DailyReport) => {
          return sum + (r.catch_count || 0);
        }, 0);
        
        console.log('📊 集計結果:', {
          totalSales,
          totalDrinks,
          totalChampagneCount,
          totalCatch,
          reportCount: thisMonthReports.length
        });
        
        setMonthlySummary({
          total_reports: thisMonthReports.length,
          total_sales: totalSales,
          average_sales: thisMonthReports.length > 0 ? totalSales / thisMonthReports.length : 0,
          approved_count: approvedCount,
          total_drinks: totalDrinks,              // 🆕 追加
          total_champagne_count: totalChampagneCount,  // 🆕 追加
          total_catch: totalCatch                  // 🆕 キャッチ追加
        });
      } else {
        const errorData = await reportsResponse.json();
        console.error('❌ APIエラー:', errorData);
      }
    } catch (error) {
      console.error('❌ データ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const achievementRate = monthlySummary ? (monthlySummary.total_sales / goalSettings.sales) * 100 : 0;

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const thisMonthReports = dailyReports.filter(report => {
    const reportDate = new Date(report.date);
    return reportDate.getMonth() + 1 === currentMonth && reportDate.getFullYear() === currentYear;
  });

  // 🆕 改善: 過去7日間のデータに実データを反映
  const getLast7DaysData = () => {
    const last7Days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayReport = thisMonthReports.find(report => report.date === dateStr);
      last7Days.push({
        date: dateStr,
        dayLabel: date.getDate() + '日',
        sales: dayReport?.total_sales || 0,
        drinks: dayReport?.drink_count || 0,  // 🆕 実データ反映
        catch: dayReport?.catch_count || 0    // 🆕 キャッチ実データ反映
      });
    }
    
    return last7Days;
  };

  const chartData = getLast7DaysData();
  const maxValue = Math.max(...chartData.map(d => {
    switch(chartType) {
      case 'sales': return d.sales;
      case 'drinks': return d.drinks;
      case 'catch': return d.catch;
      default: return 0;
    }
  }), 1);

  const workDays = thisMonthReports.length;
  const currentSales = monthlySummary?.total_sales || 0;
  const totalDrinks = monthlySummary?.total_drinks || 0;  // 🆕 実データ使用
  const totalCatch = monthlySummary?.total_catch || 0;    // 🆕 実データ使用

  const updateGoalSettings = () => {
    savePersonalGoal();
  };

  const handleChartTypeChange = (type: 'sales' | 'drinks' | 'catch') => {
    setChartType(type);
    setShowChartDropdown(false);
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '400px',
        color: '#666',
        backgroundColor: '#FAFAFA',
        fontFamily: '"Noto Sans JP", sans-serif'
      }}>
        データを読み込んでいます...
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '20px',
      backgroundColor: '#FAFAFA',
      minHeight: '100vh',
      fontFamily: '"Noto Sans JP", sans-serif'
    }}>
      {/* ページタイトル */}
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ 
          fontSize: '28px', 
          color: '#000', 
          margin: '0 0 10px 0',
          fontWeight: '600'
        }}>
          個人ダッシュボード
        </h1>
        <p style={{ color: '#666', margin: 0 }}>
          {user.name}さんの売上状況と目標達成度
        </p>
      </div>

      {/* メインコンテンツグリッド */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '25px',
        marginBottom: '25px'
      }}>
        {/* Monthly Goal Card */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '25px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          border: '1px solid #e1e8ed'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '15px'
          }}>
            <span style={{
              color: '#000',
              fontSize: '18px',
              fontWeight: '600'
            }}>
              今月の目標
            </span>
            <button 
              onClick={() => setShowGoalSettings(true)}
              style={{
                background: 'white',
                border: '1px solid #e1e8ed',
                borderRadius: '8px',
                padding: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <Settings size={16} color="#9333EA" />
            </button>
          </div>

          <div style={{
            fontSize: '32px',
            fontWeight: '700',
            background: 'linear-gradient(90deg, #9333EA 0%, #F0E 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '15px'
          }}>
            {goalSettings.sales.toLocaleString()}円
          </div>

          <div style={{
            width: '100%',
            height: '12px',
            background: '#f1f3f4',
            borderRadius: '8px',
            overflow: 'hidden',
            marginBottom: '8px'
          }}>
            <div style={{
              height: '100%',
              background: 'linear-gradient(90deg, #9333EA 0%, #F0E 100%)',
              width: `${Math.min(100, achievementRate)}%`,
              transition: 'width 0.6s ease'
            }} />
          </div>

          <div style={{
            color: '#F0E',
            fontSize: '16px',
            fontWeight: '600',
            textAlign: 'right'
          }}>
            {achievementRate.toFixed(1)}%
          </div>
        </div>

        {/* Chart Section */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '25px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          border: '1px solid #e1e8ed',
          gridColumn: 'span 1'
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
              <TrendingUp size={20} color="#9333EA" />
              <span style={{
                color: '#000',
                fontSize: '18px',
                fontWeight: '600'
              }}>
                今月の成績
              </span>
            </div>

            {/* Chart Type Selector */}
            <div style={{ position: 'relative' }}>
              <div 
                onClick={() => setShowChartDropdown(!showChartDropdown)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  backgroundColor: 'white',
                  border: '1px solid #e1e8ed',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#000'
                }}
              >
                <span>{chartOptions.find(opt => opt.key === chartType)?.label}</span>
                <ChevronDown 
                  size={16} 
                  color="#666"
                  style={{ 
                    transform: showChartDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease'
                  }}
                />
              </div>
              
              {showChartDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  backgroundColor: 'white',
                  border: '1px solid #e1e8ed',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  zIndex: 10,
                  minWidth: '120px',
                  marginTop: '4px'
                }}>
                  {chartOptions.map((option) => (
                    <div
                      key={option.key}
                      onClick={() => handleChartTypeChange(option.key as 'sales' | 'drinks' | 'catch')}
                      style={{
                        padding: '10px 12px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: chartType === option.key ? '#9333EA' : '#000',
                        backgroundColor: chartType === option.key ? '#fafaff' : 'white',
                        borderBottom: '1px solid #f0f0f0'
                      }}
                    >
                      {option.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Chart Area */}
          <div style={{
            height: '200px',
            display: 'flex',
            alignItems: 'end',
            gap: '8px',
            padding: '20px 15px',
            backgroundColor: '#fafafa',
            borderRadius: '8px'
          }}>
            {chartData.map((day, index) => {
              const value = chartType === 'sales' ? day.sales : 
                           chartType === 'drinks' ? day.drinks : day.catch;
              const height = maxValue > 0 ? (value / maxValue) * 120 : 0;
              
              return (
                <div key={index} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  flex: 1
                }}>
                  <div style={{ fontSize: '12px', color: '#666', textAlign: 'center' }}>
                    {chartType === 'sales' ? `${Math.floor(value / 10000)}万` : 
                     value > 0 ? value.toString() : '0'}
                  </div>
                  <div style={{
                    width: '24px',
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
                    {day.dayLabel}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px'
      }}>
        {/* 総売上 */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '25px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          border: '1px solid #e1e8ed',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '16px',
            color: '#666',
            marginBottom: '10px'
          }}>
            総売上
          </div>
          <div style={{
            fontSize: '32px',
            fontWeight: '700',
            color: '#000'
          }}>
            {Math.floor(currentSales / 10000)}万円
          </div>
        </div>

        {/* 🆕 改善: ドリンク数に実データを反映 */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '25px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          border: '1px solid #e1e8ed',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '16px',
            color: '#666',
            marginBottom: '10px'
          }}>
            ドリンク数
          </div>
          <div style={{
            fontSize: '32px',
            fontWeight: '700',
            color: '#9333EA'
          }}>
            {totalDrinks}杯
          </div>
        </div>

        {/* キャッチ数 */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '25px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          border: '1px solid #e1e8ed',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '16px',
            color: '#666',
            marginBottom: '10px'
          }}>
            キャッチ数
          </div>
          <div style={{
            fontSize: '32px',
            fontWeight: '700',
            color: '#F0E'
          }}>
            {totalCatch}回
          </div>
        </div>

        {/* 出勤日数 */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '25px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          border: '1px solid #e1e8ed',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '16px',
            color: '#666',
            marginBottom: '10px'
          }}>
            出勤日数
          </div>
          <div style={{
            fontSize: '32px',
            fontWeight: '700',
            color: '#000'
          }}>
            {workDays}日
          </div>
        </div>
      </div>

      {/* Goal Settings Modal */}
      {showGoalSettings && (
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
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px',
              borderBottom: '1px solid #e1e8ed'
            }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#000' }}>
                目標設定
              </h3>
              <button 
                onClick={() => setShowGoalSettings(false)}
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
                  売上目標
                </label>
                <input
                  type="number"
                  value={goalSettings.sales}
                  onChange={(e) => setGoalSettings(prev => ({
                    ...prev,
                    sales: Number(e.target.value)
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
                  ドリンク目標
                </label>
                <input
                  type="number"
                  value={goalSettings.drinks}
                  onChange={(e) => setGoalSettings(prev => ({
                    ...prev,
                    drinks: Number(e.target.value)
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
                  キャッチ目標
                </label>
                <input
                  type="number"
                  value={goalSettings.catch}
                  onChange={(e) => setGoalSettings(prev => ({
                    ...prev,
                    catch: Number(e.target.value)
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
                onClick={() => setShowGoalSettings(false)}
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
                onClick={updateGoalSettings}
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
    </div>
  );
};

export default PersonalPage;