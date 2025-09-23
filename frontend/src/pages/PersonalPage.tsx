import React, { useState, useEffect } from 'react';
import { Settings, X, ChevronDown, Bell, LogOut, User, TrendingUp } from 'lucide-react';
import axios from 'axios';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

interface PersonalPageProps {
  user: User;
  onPageChange?: (page: string) => void;
  onLogout?: () => void;
}

interface SalesData {
  id: number;
  date: string;
  employee_name: string;
  total_sales: number;
  drink_count: number;
  champagne_count: number;
  catch_count: number;
  work_hours: number;
  created_at: string;
}

interface MonthlySummary {
  year: number;
  month: number;
  total_sales: number;
  drink_count: number;
  champagne_count: number;
}

interface GoalSettings {
  sales: number;
  drinks: number;
  catch: number;
}

const PersonalPage: React.FC<PersonalPageProps> = ({ user, onPageChange, onLogout }) => {
  const [salesData, setSalesData] = useState<SalesData[]>([]);
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

  const chartOptions = [
    { key: 'sales', label: '売上', unit: '円' },
    { key: 'drinks', label: 'ドリンク', unit: '杯' },
    { key: 'catch', label: 'キャッチ', unit: '回' }
  ];

  useEffect(() => {
    fetchPersonalData();
  }, []);

  const fetchPersonalData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const salesResponse = await axios.get(
        'https://bar-management-system.onrender.com/api/sales',
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      const summaryResponse = await axios.get(
        'https://bar-management-system.onrender.com/api/sales/monthly-summary',
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      setSalesData(salesResponse.data);
      setMonthlySummary(summaryResponse.data);
    } catch (error) {
      console.error('データ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const achievementRate = monthlySummary ? (monthlySummary.total_sales / goalSettings.sales) * 100 : 0;

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const thisMonthData = salesData.filter(item => {
    const itemDate = new Date(item.date);
    return itemDate.getMonth() + 1 === currentMonth && itemDate.getFullYear() === currentYear;
  });

  // 過去7日間のデータ取得
  const getLast7DaysData = () => {
    const last7Days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayData = thisMonthData.find(item => item.date === dateStr);
      last7Days.push({
        date: dateStr,
        dayLabel: date.getDate() + '日',
        sales: dayData?.total_sales || 0,
        drinks: dayData?.drink_count || 0,
        catch: dayData?.catch_count || 0
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

  const workDays = thisMonthData.length;
  const currentSales = monthlySummary?.total_sales || 0;
  const totalDrinks = monthlySummary?.drink_count || 0;
  const totalCatch = thisMonthData.reduce((acc, item) => acc + item.catch_count, 0);

  const updateGoalSettings = () => {
    // ここで実際にはAPIに保存
    setShowGoalSettings(false);
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
        fontFamily: 'Sana, Noto Sans JP, sans-serif'
      }}>
        データを読み込んでいます...
      </div>
    );
  }

  return (
    <div style={{
      width: '390px',
      minHeight: '844px',
      backgroundColor: '#FAFAFA', // 白ベースに戻す
      margin: '0 auto',
      padding: '20px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      fontFamily: 'Sana, Noto Sans JP, sans-serif'
    }}>
      {/* Header Section */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 0'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          {/* プロフィールアイコン - 白背景+紫ボーダー */}
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: 'white',
            border: '2px solid #9333EA',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <User size={20} color="#9333EA" />
          </div>
          <span style={{
            color: '#000',
            fontSize: '15px',
            fontWeight: '400'
          }}>
            {user.name}さん
          </span>
        </div>

        <div style={{ display: 'flex', gap: '15px' }}>
          {/* 通知アイコン - 白背景 */}
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: 'white',
            border: '1px solid #e1e8ed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <Bell size={18} color="#9333EA" />
          </div>

          {/* ログアウトアイコン */}
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'linear-gradient(90deg, #9333EA 0%, #F0E 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }} onClick={onLogout}>
            <LogOut size={16} color="white" />
          </div>
        </div>
      </div>

      {/* Monthly Goal Card */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
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
            fontSize: '16px',
            fontWeight: '500'
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
          fontSize: '28px',
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
          fontSize: '14px',
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
        padding: '20px',
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
            <TrendingUp size={18} color="#9333EA" />
            <span style={{
              color: '#000',
              fontSize: '16px',
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
                minWidth: '120px'
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
          height: '140px',
          display: 'flex',
          alignItems: 'end',
          gap: '8px',
          padding: '15px 10px',
          backgroundColor: '#fafafa',
          borderRadius: '8px'
        }}>
          {chartData.map((day, index) => {
            const value = chartType === 'sales' ? day.sales : 
                         chartType === 'drinks' ? day.drinks : day.catch;
            const height = maxValue > 0 ? (value / maxValue) * 80 : 0;
            const currentOption = chartOptions.find(opt => opt.key === chartType);
            
            return (
              <div key={index} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                flex: 1
              }}>
                <div style={{ fontSize: '10px', color: '#666', textAlign: 'center' }}>
                  {chartType === 'sales' ? `${Math.floor(value / 10000)}万` : 
                   value > 0 ? value.toString() : '0'}
                </div>
                <div style={{
                  width: '20px',
                  height: `${Math.max(height, 15)}px`,
                  background: 'linear-gradient(180deg, #9333EA 0%, #F0E 100%)',
                  borderRadius: '4px',
                  minHeight: '15px'
                }} />
                <div style={{
                  fontSize: '10px',
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

      {/* Metrics Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '15px'
      }}>
        {/* 総売上 */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          border: '1px solid #e1e8ed',
          gridColumn: '1 / -1'
        }}>
          <div style={{
            fontSize: '14px',
            color: '#666',
            marginBottom: '8px'
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

        {/* ドリンク数 */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '15px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          border: '1px solid #e1e8ed'
        }}>
          <div style={{
            fontSize: '12px',
            color: '#666',
            marginBottom: '8px'
          }}>
            ドリンク数
          </div>
          <div style={{
            fontSize: '24px',
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
          padding: '15px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          border: '1px solid #e1e8ed'
        }}>
          <div style={{
            fontSize: '12px',
            color: '#666',
            marginBottom: '8px'
          }}>
            キャッチ数
          </div>
          <div style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#F0E'
          }}>
            {totalCatch}回
          </div>
        </div>
      </div>

      {/* 出勤日数 */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '15px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        border: '1px solid #e1e8ed',
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: '14px',
          color: '#666',
          marginBottom: '8px'
        }}>
          出勤日数
        </div>
        <div style={{
          fontSize: '28px',
          fontWeight: '700',
          color: '#000'
        }}>
          {workDays}日
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
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#000' }}>
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
                onClick={updateGoalSettings}
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
    </div>
  );
};

export default PersonalPage;