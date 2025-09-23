import React, { useState, useEffect } from 'react';
import { Settings, X } from 'lucide-react';
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
  const [showGoalSettings, setShowGoalSettings] = useState(false);
  const [showTargetSettings, setShowTargetSettings] = useState(false);
  const [storeGoalSettings, setStoreGoalSettings] = useState<StoreGoalSettings>({
    weekdayTarget: 150000, // 平日目標
    weekendTarget: 300000, // 週末目標
    totalMonthlyTarget: 2000000 // 月間総目標
  });
  const [monthlyTarget, setMonthlyTarget] = useState<number>(2000000);

  useEffect(() => {
    if (user.role === 'manager') {
      fetchStoreData();
    }
  }, [user.role]);

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

  // 店舗全体の売上合計
  const totalStoreSales = employeeRanking.reduce((sum, emp) => sum + emp.total_sales, 0);
  const achievementRate = (totalStoreSales / storeGoalSettings.totalMonthlyTarget) * 100;

  // 平日・週末の計算（簡単な例として）
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  // 今月の平日・週末日数を計算
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  let weekdays = 0;
  let weekends = 0;
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentYear, currentMonth, day);
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) { // 日曜日(0)または土曜日(6)
      weekends++;
    } else {
      weekdays++;
    }
  }

  const expectedWeekdayRevenue = weekdays * storeGoalSettings.weekdayTarget;
  const expectedWeekendRevenue = weekends * storeGoalSettings.weekendTarget;
  const totalExpectedRevenue = expectedWeekdayRevenue + expectedWeekendRevenue;

  const updateStoreGoalSettings = () => {
    // 実際にはAPIに保存
    console.log('店舗目標設定を保存:', storeGoalSettings);
    setShowGoalSettings(false);
  };

  if (user.role !== 'manager') {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '18px', color: '#e74c3c' }}>店長のみアクセス可能です</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '18px', color: '#666' }}>データを読み込んでいます...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      {/* 店舗全体の目標と達成状況 */}
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
          <h2 style={{ 
            fontSize: '18px', 
            color: '#2c3e50', 
            margin: 0,
            fontWeight: '600'
          }}>
            今月の目標
          </h2>
          <button 
            onClick={() => setShowGoalSettings(true)}
            style={{
              background: 'linear-gradient(135deg, #9333EA, #FF00EE)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Settings size={16} color="white" />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <div style={{ color: '#7f8c8d', fontSize: '14px', marginBottom: '8px' }}>月間目標</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#9333EA' }}>
              {storeGoalSettings.totalMonthlyTarget.toLocaleString()}円
            </div>
          </div>
          
          <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <div style={{ color: '#7f8c8d', fontSize: '14px', marginBottom: '8px' }}>平日目標/日</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#3498db' }}>
              {storeGoalSettings.weekdayTarget.toLocaleString()}円
            </div>
          </div>
          
          <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <div style={{ color: '#7f8c8d', fontSize: '14px', marginBottom: '8px' }}>週末目標/日</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#e67e22' }}>
              {storeGoalSettings.weekendTarget.toLocaleString()}円
            </div>
          </div>
          
          <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <div style={{ color: '#7f8c8d', fontSize: '14px', marginBottom: '8px' }}>達成率</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: achievementRate >= 100 ? '#27ae60' : '#e74c3c' }}>
              {Math.round(achievementRate)}%
            </div>
          </div>
        </div>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <div style={{ color: '#7f8c8d', fontSize: '14px', marginBottom: '8px' }}>現在の売上</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3e50' }}>
            {totalStoreSales.toLocaleString()}円
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
        <h2 style={{ 
          fontSize: '18px', 
          color: '#2c3e50', 
          margin: '0 0 20px 0',
          fontWeight: '600'
        }}>
          従業員ランキング
        </h2>
        
        {employeeRanking.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {employeeRanking.map((employee, index) => (
              <div key={index} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '15px',
                backgroundColor: index < 3 ? '#f8f9fa' : 'white',
                borderRadius: '8px',
                border: index < 3 ? '2px solid #9333EA' : '1px solid #e1e8ed'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{
                    width: '30px',
                    height: '30px',
                    backgroundColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#e1e8ed',
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
                    <div style={{ fontWeight: '600', fontSize: '16px' }}>{employee.employee_name}</div>
                    <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                      ドリンク: {employee.total_drinks}杯 | キャッチ: {employee.total_catch}回
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#9333EA' }}>
                    {employee.total_sales.toLocaleString()}円
                  </div>
                  <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                    {employee.total_hours}時間
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: '#7f8c8d', padding: '40px' }}>
            データがありません
          </div>
        )}
      </div>

      {/* 目標設定モーダル */}
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
            maxWidth: '500px',
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
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#2c3e50' }}>
                店舗目標設定
              </h3>
              <button 
                onClick={() => setShowGoalSettings(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '6px',
                  color: '#7f8c8d'
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
                  fontWeight: '600',
                  color: '#2c3e50',
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
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '600',
                  color: '#2c3e50',
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
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '600',
                  color: '#2c3e50',
                  fontSize: '14px'
                }}>
                  月間総目標
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
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ 
                padding: '15px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>計算結果</h4>
                <div style={{ fontSize: '14px', color: '#7f8c8d', lineHeight: '1.5' }}>
                  <div>平日収益予想: {expectedWeekdayRevenue.toLocaleString()}円 ({weekdays}日)</div>
                  <div>週末収益予想: {expectedWeekendRevenue.toLocaleString()}円 ({weekends}日)</div>
                  <div style={{ fontWeight: 'bold', color: '#2c3e50', marginTop: '5px' }}>
                    月間予想総収益: {totalExpectedRevenue.toLocaleString()}円
                  </div>
                </div>
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
                onClick={updateStoreGoalSettings}
                style={{
                  background: '#9333EA',
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