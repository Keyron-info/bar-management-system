import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface DailySummary {
  date: string;
  total_sales: number;
  drink_count: number;
  champagne_count: number;
  catch_count: number;
}

interface MonthlySummary {
  year: number;
  month: number;
  total_sales: number;
  drink_count: number;
  champagne_count: number;
}

interface EmployeeRanking {
  employee_name: string;
  total_sales: number;
  total_drinks: number;
  total_champagne: number;
  total_catch: number;
  total_hours: number;
}

const SalesSummary: React.FC = () => {
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null);
  const [employeeRanking, setEmployeeRanking] = useState<EmployeeRanking[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  // 認証ヘッダーを含むリクエストを作成
  const createAuthenticatedRequest = () => {
    const token = localStorage.getItem('token');
    return axios.create({
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
  };

  const fetchDailySummary = async (date: string) => {
    try {
      const axiosInstance = createAuthenticatedRequest();
      const response = await axiosInstance.get(`https://bar-management-system.onrender.com/api/sales/daily-summary?target_date=${date}`);
      setDailySummary(response.data);
    } catch (error: any) {
      if (error.response?.status === 401) {
        console.error('認証エラー: 再ログインが必要です');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.reload();
      } else {
        console.error('日次集計の取得に失敗しました:', error);
      }
    }
  };

  const fetchMonthlySummary = async () => {
    try {
      const now = new Date();
      const axiosInstance = createAuthenticatedRequest();
      const response = await axiosInstance.get(`https://bar-management-system.onrender.com/api/sales/monthly-summary?year=${now.getFullYear()}&month=${now.getMonth() + 1}`);
      setMonthlySummary(response.data);
    } catch (error: any) {
      if (error.response?.status === 401) {
        console.error('認証エラー: 再ログインが必要です');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.reload();
      } else {
        console.error('月次集計の取得に失敗しました:', error);
      }
    }
  };

  const fetchEmployeeRanking = async () => {
    try {
      const now = new Date();
      const axiosInstance = createAuthenticatedRequest();
      const response = await axiosInstance.get(`https://bar-management-system.onrender.com/api/sales/employee-ranking?year=${now.getFullYear()}&month=${now.getMonth() + 1}`);
      setEmployeeRanking(response.data);
    } catch (error: any) {
      if (error.response?.status === 401) {
        console.error('認証エラー: 再ログインが必要です');
      } else if (error.response?.status === 403) {
        console.log('従業員ランキングは店長のみアクセス可能です');
        setEmployeeRanking([]);
      } else {
        console.error('従業員ランキングの取得に失敗しました:', error);
      }
    }
  };

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      await Promise.all([
        fetchDailySummary(selectedDate),
        fetchMonthlySummary(),
        fetchEmployeeRanking()
      ]);
      setLoading(false);
    };

    fetchAllData();
  }, [selectedDate]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  const getRankingMedal = (index: number) => {
    switch (index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return `${index + 1}位`;
    }
  };

  if (loading) {
    return (
      <div className="card">
        <p>集計データを読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>📈 売上集計・分析</h2>

      {/* 日次集計 */}
      <div className="summary-section">
        <h3>📅 日次集計</h3>
        <div className="date-selector">
          <label>
            日付を選択:
            <input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
            />
          </label>
        </div>
        
        {dailySummary ? (
          <div className="summary-stats">
            <div className="stat-item">
              <span className="stat-label">売上合計:</span>
              <span className="stat-value">¥{dailySummary.total_sales.toLocaleString()}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">ドリンク:</span>
              <span className="stat-value">{dailySummary.drink_count}杯</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">シャンパン:</span>
              <span className="stat-value">{dailySummary.champagne_count}杯</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">キャッチ:</span>
              <span className="stat-value">{dailySummary.catch_count}人</span>
            </div>
          </div>
        ) : (
          <p>指定日のデータがありません</p>
        )}
      </div>

      {/* 月次集計 */}
      <div className="summary-section">
        <h3>📊 今月の実績</h3>
        {monthlySummary ? (
          <div className="summary-stats">
            <div className="stat-item">
              <span className="stat-label">月間売上:</span>
              <span className="stat-value">¥{monthlySummary.total_sales.toLocaleString()}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">ドリンク:</span>
              <span className="stat-value">{monthlySummary.drink_count}杯</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">シャンパン:</span>
              <span className="stat-value">{monthlySummary.champagne_count}杯</span>
            </div>
          </div>
        ) : (
          <p>今月のデータがありません</p>
        )}
      </div>

      {/* 従業員ランキング（店長のみ） */}
      {employeeRanking.length > 0 && (
        <div className="summary-section">
          <h3>🏆 従業員ランキング (今月)</h3>
          <div className="ranking-list">
            {employeeRanking.map((employee, index) => (
              <div
                key={employee.employee_name}
                className={`ranking-item ${index < 3 ? `rank-${index + 1}` : ''}`}
              >
                <div className="ranking-header">
                  <span className="ranking-medal">{getRankingMedal(index)}</span>
                  <span className="employee-name">{employee.employee_name}</span>
                  <span className="employee-sales">¥{employee.total_sales.toLocaleString()}</span>
                </div>
                <div className="ranking-details">
                  <small>
                    ドリンク: {employee.total_drinks}杯 | 
                    シャンパン: {employee.total_champagne}杯 | 
                    キャッチ: {employee.total_catch}人 | 
                    稼働: {employee.total_hours}時間
                  </small>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesSummary;