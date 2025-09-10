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

  const fetchDailySummary = async (date: string) => {
    try {
      const response = await axios.get(`http://localhost:8002/api/sales/daily-summary?target_date=${date}`);
      setDailySummary(response.data);
    } catch (error) {
      console.error('日次集計の取得に失敗しました');
    }
  };

  const fetchMonthlySummary = async () => {
    try {
      const now = new Date();
      const response = await axios.get(`http://localhost:8002/api/sales/monthly-summary?year=${now.getFullYear()}&month=${now.getMonth() + 1}`);
      setMonthlySummary(response.data);
    } catch (error) {
      console.error('月次集計の取得に失敗しました');
    }
  };

  const fetchEmployeeRanking = async () => {
    try {
      const now = new Date();
      const response = await axios.get(`http://localhost:8002/api/sales/employee-ranking?year=${now.getFullYear()}&month=${now.getMonth() + 1}`);
      setEmployeeRanking(response.data);
    } catch (error) {
      console.error('従業員ランキングの取得に失敗しました');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchDailySummary(selectedDate),
        fetchMonthlySummary(),
        fetchEmployeeRanking()
      ]);
      setLoading(false);
    };
    
    loadData();
  }, [selectedDate]);

  if (loading) {
    return (
      <div className="card">
        <h2>📊 売上集計・分析</h2>
        <p>データを読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="summary-container">
      <div className="card">
        <h2>📊 売上集計・分析</h2>
        
        {/* 日次集計 */}
        <div className="summary-section">
          <h3>📅 日次売上</h3>
          <div className="date-selector">
            <label>
              日付を選択:
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </label>
          </div>
          
          {dailySummary && (
            <div className="summary-grid">
              <div className="summary-item">
                <span className="summary-label">💰 総売上</span>
                <span className="summary-value">¥{dailySummary.total_sales.toLocaleString()}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">🍹 ドリンク</span>
                <span className="summary-value">{dailySummary.drink_count}杯</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">🍾 シャンパン</span>
                <span className="summary-value">{dailySummary.champagne_count}杯</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">👥 キャッチ</span>
                <span className="summary-value">{dailySummary.catch_count}人</span>
              </div>
            </div>
          )}
        </div>

        {/* 月次集計 */}
        <div className="summary-section">
          <h3>📈 今月の売上</h3>
          {monthlySummary && (
            <div className="summary-grid">
              <div className="summary-item">
                <span className="summary-label">💰 月間売上</span>
                <span className="summary-value">¥{monthlySummary.total_sales.toLocaleString()}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">🍹 月間ドリンク</span>
                <span className="summary-value">{monthlySummary.drink_count}杯</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">🍾 月間シャンパン</span>
                <span className="summary-value">{monthlySummary.champagne_count}杯</span>
              </div>
            </div>
          )}
        </div>

        {/* 従業員ランキング */}
        <div className="summary-section">
          <h3>🏆 今月の従業員ランキング</h3>
          {employeeRanking.length > 0 ? (
            <div className="ranking-list">
              {employeeRanking.map((employee, index) => (
                <div key={employee.employee_name} className="ranking-item">
                  <div className="ranking-position">
                    {index + 1}位
                  </div>
                  <div className="ranking-details">
                    <div className="employee-name">{employee.employee_name}</div>
                    <div className="employee-stats">
                      <span>💰 ¥{employee.total_sales.toLocaleString()}</span>
                      <span>🍹 {employee.total_drinks}杯</span>
                      <span>🍾 {employee.total_champagne}杯</span>
                      <span>👥 {employee.total_catch}人</span>
                      <span>⏰ {employee.total_hours}h</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>今月のデータがまだありません。</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SalesSummary;