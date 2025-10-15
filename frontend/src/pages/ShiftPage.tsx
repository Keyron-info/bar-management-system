import React, { useState, useEffect } from 'react';
import { Settings, X, Target, TrendingUp, Users } from 'lucide-react';
import axios from 'axios';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

interface StorePageProps {
  user: User;
}

interface EmployeeRanking {
  employee_name: string;
  total_sales: number;
  total_drinks: number;
  total_champagne: number;
  total_catch: number;
  total_hours: number;
}

interface StoreGoalSettings {
  weekdayTarget: number;
  weekendTarget: number;
  totalMonthlyTarget: number;
}

const StorePage: React.FC<StorePageProps> = ({ user }) => {
  const [employeeRanking, setEmployeeRanking] = useState<EmployeeRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTargetSettings, setShowTargetSettings] = useState(false);
  const [storeGoalSettings, setStoreGoalSettings] = useState<StoreGoalSettings>({
    weekdayTarget: 150000,
    weekendTarget: 300000,
    totalMonthlyTarget: 2000000
  });

  useEffect(() => {
    fetchStoreData();
  }, []);

  const fetchStoreData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get(
        'https://bar-management-system.onrender.com/api/sales/employee-ranking',
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      setEmployeeRanking(response.data);
    } catch (error) {
      console.error('データ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalStoreSales = employeeRanking.reduce((sum, emp) => sum + emp.total_sales, 0);
  const achievementRate = (totalStoreSales / storeGoalSettings.totalMonthlyTarget) * 100;

  const weekdayAchievementRate = 78;
  const weekendAchievementRate = 85;

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

  const saveTargetSettings = () => {
    console.log('店舗目標設定を保存:', storeGoalSettings);
    setShowTargetSettings(false);
  };

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
      {/* ページタイトル */}
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ 
          fontSize: '28px', 
          color: '#000', 
          margin: '0 0 10px 0',
          fontWeight: '600'
        }}>
          店舗ダッシュボード
        </h1>
        <p style={{ color: '#666', margin: 0 }}>
          店舗全体の売上状況とランキング
        </p>
      </div>

      {/* 店舗目標セクション */}
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
            <Target size={20} color="#9333EA" />
            <span style={{
              color: '#000',
              fontSize: '18px',
              fontWeight: '600'
            }}>
              店舗目標
            </span>
          </div>

          {/* 🔧 権限修正：店長のみ設定ボタン表示 */}
          {user.role === 'manager' && (
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
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <Settings size={16} color="#9333EA" />
            </button>
          )}
        </div>

        {/* サマリーカード */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '15px',
          marginBottom: '20px'
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
              {employeeRanking.length}人
            </div>
          </div>
        </div>

        {/* 達成率バー */}
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
              color: achievementRate >= 100 ? '#10b981' : '#F0E'
            }}>
              {achievementRate.toFixed(1)}%
            </span>
          </div>
          
          <div style={{
            width: '100%',
            height: '12px',
            background: '#f1f3f4',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              background: achievementRate >= 100 
                ? 'linear-gradient(90deg, #10b981 0%, #34d399 100%)'
                : 'linear-gradient(90deg, #9333EA 0%, #F0E 100%)',
              width: `${Math.min(100, achievementRate)}%`,
              transition: 'width 0.6s ease'
            }} />
          </div>
        </div>

        {/* 平日・週末目標 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '15px'
        }}>
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '15px',
            borderRadius: '8px'
          }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>平日目標</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#000', marginBottom: '5px' }}>
              {storeGoalSettings.weekdayTarget.toLocaleString()}円
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>
              達成率: {weekdayAchievementRate}%
            </div>
          </div>

          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '15px',
            borderRadius: '8px'
          }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>週末目標</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#000', marginBottom: '5px' }}>
              {storeGoalSettings.weekendTarget.toLocaleString()}円
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>
              達成率: {weekendAchievementRate}%
            </div>
          </div>
        </div>
      </div>

      {/* 7日間売上推移 */}
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
          <TrendingUp size={20} color="#9333EA" />
          <span style={{
            color: '#000',
            fontSize: '18px',
            fontWeight: '600'
          }}>
            7日間売上推移
          </span>
        </div>

        <div style={{
          height: '200px',
          display: 'flex',
          alignItems: 'end',
          gap: '8px',
          padding: '20px 15px',
          backgroundColor: '#fafafa',
          borderRadius: '8px'
        }}>
          {dailySalesData.map((day, index) => {
            const height = (day.sales / maxDailySales) * 140;
            
            return (
              <div key={index} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                flex: 1
              }}>
                <div style={{ fontSize: '12px', color: '#666', textAlign: 'center' }}>
                  {Math.floor(day.sales / 10000)}万
                </div>
                <div style={{
                  width: '28px',
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
                  {day.day}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 従業員ランキング */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '25px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        border: '1px solid #e1e8ed'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '20px'
        }}>
          <Users size={20} color="#9333EA" />
          <span style={{
            color: '#000',
            fontSize: '18px',
            fontWeight: '600'
          }}>
            従業員ランキング
          </span>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {employeeRanking.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
              データがありません
            </div>
          ) : (
            employeeRanking.map((employee, index) => (
              <div key={index} style={{
                display: 'flex',
                alignItems: 'center',
                padding: '15px',
                backgroundColor: index < 3 ? '#f8f3ff' : '#f8f9fa',
                borderRadius: '8px',
                border: index < 3 ? '1px solid #e9d5ff' : '1px solid #e1e8ed'
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: index === 0 ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)' :
                             index === 1 ? 'linear-gradient(135deg, #C0C0C0 0%, #A8A8A8 100%)' :
                             index === 2 ? 'linear-gradient(135deg, #CD7F32 0%, #8B4513 100%)' :
                             'linear-gradient(135deg, #e1e8ed 0%, #cbd5e0 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: 'white',
                  marginRight: '12px',
                  flexShrink: 0
                }}>
                  {index + 1}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#000',
                    marginBottom: '4px'
                  }}>
                    {employee.employee_name}
                  </div>
                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    fontSize: '12px',
                    color: '#666'
                  }}>
                    <span>ドリンク: {employee.total_drinks}杯</span>
                    <span>シャンパン: {employee.total_champagne}本</span>
                  </div>
                </div>

                <div style={{
                  textAlign: 'right'
                }}>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: '700',
                    color: '#9333EA'
                  }}>
                    {Math.floor(employee.total_sales / 10000)}万円
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 目標設定モーダル（店長のみ） */}
      {showTargetSettings && user.role === 'manager' && (
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
                店舗目標設定
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
                  月間目標売上
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
                  平日目標
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
                  週末目標
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
    </div>
  );
};

export default StorePage;