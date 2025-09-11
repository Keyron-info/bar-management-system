import React, { useState, useEffect } from 'react';
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

const StorePage: React.FC<StorePageProps> = ({ user }) => {
  const [employeeRanking, setEmployeeRanking] = useState<EmployeeRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [storeGoal, setStoreGoal] = useState<number>(2000000); // デフォルト目標200万円

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
  const achievementRate = (totalStoreSales / storeGoal) * 100;

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
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* ページヘッダー */}
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ 
          fontSize: '28px', 
          color: '#2c3e50', 
          margin: '0 0 10px 0',
          fontWeight: '600'
        }}>
          店舗管理ページ
        </h1>
        <p style={{ color: '#7f8c8d', margin: 0 }}>
          店舗全体の売上状況と従業員の成績を確認できます
        </p>
      </div>

      {/* 店舗全体の目標と達成状況 */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '25px',
        marginBottom: '25px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        border: '1px solid #e1e8ed'
      }}>
        <h2 style={{ 
          fontSize: '20px', 
          color: '#2c3e50', 
          margin: '0 0 20px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          店舗全体の売上状況
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '5px' }}>今月の目標</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3e50' }}>
              {storeGoal.toLocaleString()}円
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '5px' }}>現在の売上</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3498db' }}>
              {totalStoreSales.toLocaleString()}円
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '5px' }}>達成率</div>
            <div style={{ 
              fontSize: '24px', 
              fontWeight: 'bold', 
              color: achievementRate >= 100 ? '#27ae60' : achievementRate >= 80 ? '#f39c12' : '#e74c3c'
            }}>
              {achievementRate.toFixed(1)}%
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '5px' }}>従業員数</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#9b59b6' }}>
              {employeeRanking.length}人
            </div>
          </div>
        </div>

        {/* 進捗バー */}
        <div style={{ marginTop: '20px' }}>
          <div style={{
            backgroundColor: '#ecf0f1',
            borderRadius: '10px',
            height: '20px',
            overflow: 'hidden'
          }}>
            <div style={{
              backgroundColor: achievementRate >= 100 ? '#27ae60' : achievementRate >= 80 ? '#f39c12' : '#3498db',
              height: '100%',
              width: `${Math.min(100, achievementRate)}%`,
              transition: 'width 0.3s ease',
              borderRadius: '10px'
            }} />
          </div>
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
        <h2 style={{ 
          fontSize: '20px', 
          color: '#2c3e50', 
          margin: '0 0 20px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          従業員売上ランキング
        </h2>

        {employeeRanking.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px', 
            color: '#7f8c8d',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px'
          }}>
            今月の売上データがありません
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '15px 12px', textAlign: 'left', borderBottom: '2px solid #e1e8ed' }}>順位</th>
                  <th style={{ padding: '15px 12px', textAlign: 'left', borderBottom: '2px solid #e1e8ed' }}>従業員名</th>
                  <th style={{ padding: '15px 12px', textAlign: 'right', borderBottom: '2px solid #e1e8ed' }}>売上</th>
                  <th style={{ padding: '15px 12px', textAlign: 'right', borderBottom: '2px solid #e1e8ed' }}>ドリンク</th>
                  <th style={{ padding: '15px 12px', textAlign: 'right', borderBottom: '2px solid #e1e8ed' }}>シャンパン</th>
                  <th style={{ padding: '15px 12px', textAlign: 'right', borderBottom: '2px solid #e1e8ed' }}>キャッチ</th>
                  <th style={{ padding: '15px 12px', textAlign: 'right', borderBottom: '2px solid #e1e8ed' }}>稼働時間</th>
                </tr>
              </thead>
              <tbody>
                {employeeRanking.map((employee, index) => (
                  <tr key={employee.employee_name} style={{ 
                    borderBottom: '1px solid #f1f1f1',
                    backgroundColor: index < 3 ? '#f8f9fa' : 'transparent'
                  }}>
                    <td style={{ padding: '15px 12px' }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px' 
                      }}>
                        <span style={{
                          backgroundColor: index === 0 ? '#f1c40f' : index === 1 ? '#95a5a6' : index === 2 ? '#cd7f32' : '#ecf0f1',
                          color: index < 3 ? 'white' : '#7f8c8d',
                          borderRadius: '50%',
                          width: '24px',
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          {index + 1}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '15px 12px', fontWeight: '600', color: '#2c3e50' }}>
                      {employee.employee_name}
                    </td>
                    <td style={{ padding: '15px 12px', textAlign: 'right', fontWeight: 'bold', color: '#2c3e50' }}>
                      {employee.total_sales.toLocaleString()}円
                    </td>
                    <td style={{ padding: '15px 12px', textAlign: 'right' }}>
                      {employee.total_drinks}杯
                    </td>
                    <td style={{ padding: '15px 12px', textAlign: 'right' }}>
                      {employee.total_champagne}本
                    </td>
                    <td style={{ padding: '15px 12px', textAlign: 'right' }}>
                      {employee.total_catch}人
                    </td>
                    <td style={{ padding: '15px 12px', textAlign: 'right' }}>
                      {employee.total_hours}時間
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StorePage;