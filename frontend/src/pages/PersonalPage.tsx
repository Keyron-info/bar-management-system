import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

interface PersonalPageProps {
  user: User;
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

const PersonalPage: React.FC<PersonalPageProps> = ({ user }) => {
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null);
  const [monthlyGoal, setMonthlyGoal] = useState<number>(500000); // デフォルト目標50万円
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPersonalData();
  }, []);

  const fetchPersonalData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // 個人の売上データを取得
      const salesResponse = await axios.get(
        'https://bar-management-system.onrender.com/api/sales',
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      // 月次集計データを取得
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

  const achievementRate = monthlySummary ? (monthlySummary.total_sales / monthlyGoal) * 100 : 0;

  // 今月のデータを日別に集計
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const thisMonthData = salesData.filter(item => {
    const itemDate = new Date(item.date);
    return itemDate.getMonth() + 1 === currentMonth && itemDate.getFullYear() === currentYear;
  });

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
          {user.name}さんの個人ページ
        </h1>
        <p style={{ color: '#7f8c8d', margin: 0 }}>
          今月の売上状況と目標達成率を確認できます
        </p>
      </div>

      {/* 今月の目標と達成率 */}
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
          <span style={{ fontSize: '24px' }}>🎯</span>
          今月の目標と達成状況
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          {/* 目標金額 */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '5px' }}>今月の目標</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3e50' }}>
              {monthlyGoal.toLocaleString()}円
            </div>
          </div>

          {/* 現在の売上 */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '5px' }}>現在の売上</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3498db' }}>
              {monthlySummary?.total_sales.toLocaleString() || 0}円
            </div>
          </div>

          {/* 達成率 */}
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

          {/* 残り目標 */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '5px' }}>残り目標</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e74c3c' }}>
              {Math.max(0, monthlyGoal - (monthlySummary?.total_sales || 0)).toLocaleString()}円
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

      {/* 今月の詳細データ */}
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
          <span style={{ fontSize: '24px' }}>📊</span>
          今月の詳細データ
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px' }}>
          <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '5px' }}>総売上</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2c3e50' }}>
              {monthlySummary?.total_sales.toLocaleString() || 0}円
            </div>
          </div>

          <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '5px' }}>ドリンク数</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#3498db' }}>
              {monthlySummary?.drink_count || 0}杯
            </div>
          </div>

          <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '5px' }}>シャンパン数</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f39c12' }}>
              {monthlySummary?.champagne_count || 0}本
            </div>
          </div>

          <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '5px' }}>出勤日数</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#27ae60' }}>
              {thisMonthData.length}日
            </div>
          </div>
        </div>
      </div>

      {/* 最近の売上履歴 */}
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
          <span style={{ fontSize: '24px' }}>📋</span>
          最近の売上履歴
        </h2>

        {thisMonthData.length === 0 ? (
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
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e1e8ed' }}>日付</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #e1e8ed' }}>売上</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #e1e8ed' }}>ドリンク</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #e1e8ed' }}>シャンパン</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #e1e8ed' }}>キャッチ</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #e1e8ed' }}>稼働時間</th>
                </tr>
              </thead>
              <tbody>
                {thisMonthData.slice(0, 10).map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f1f1' }}>
                    <td style={{ padding: '12px' }}>
                      {new Date(item.date).toLocaleDateString('ja-JP')}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: '#2c3e50' }}>
                      {item.total_sales.toLocaleString()}円
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      {item.drink_count}杯
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      {item.champagne_count}本
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      {item.catch_count}人
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      {item.work_hours}時間
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {thisMonthData.length > 10 && (
          <div style={{ 
            textAlign: 'center', 
            marginTop: '20px',
            color: '#7f8c8d',
            fontSize: '14px'
          }}>
            最新10件を表示中（全{thisMonthData.length}件）
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonalPage;