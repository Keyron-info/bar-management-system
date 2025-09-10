import React, { useState } from 'react';
import axios from 'axios';

interface SalesData {
  date: string;
  employee_name: string;
  total_sales: number;
  drink_count: number;
  champagne_count: number;
  catch_count: number;
  work_hours: number;
}

interface SalesInputProps {
  onSalesAdded: () => void;
}

const SalesInput: React.FC<SalesInputProps> = ({ onSalesAdded }) => {
  const [formData, setFormData] = useState<SalesData>({
    date: new Date().toISOString().split('T')[0],
    employee_name: '',
    total_sales: 0,
    drink_count: 0,
    champagne_count: 0,
    catch_count: 0,
    work_hours: 0
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // 認証ヘッダーを含むリクエストを作成
  const createAuthenticatedRequest = () => {
    const token = localStorage.getItem('token');
    return axios.create({
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'employee_name' ? value : Number(value)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    try {
      const axiosInstance = createAuthenticatedRequest();
      await axiosInstance.post('https://bar-management-system.onrender.com/api/sales', formData);
      setMessage('✅ 売上データを保存しました');
      
      // フォームをリセット
      setFormData({
        date: new Date().toISOString().split('T')[0],
        employee_name: '',
        total_sales: 0,
        drink_count: 0,
        champagne_count: 0,
        catch_count: 0,
        work_hours: 0
      });
      
      // 親コンポーネントに通知
      onSalesAdded();
      
    } catch (error: any) {
      if (error.response?.status === 401) {
        setMessage('❌ 認証が必要です。再度ログインしてください');
        // トークンが無効な場合はローカルストレージをクリア
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.reload();
      } else {
        setMessage('❌ 売上データの保存に失敗しました');
      }
      console.error('Sales creation error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>📊 売上データ入力</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>
            日付:
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
            />
          </label>
        </div>

        <div className="form-group">
          <label>
            従業員名:
            <input
              type="text"
              name="employee_name"
              value={formData.employee_name}
              onChange={handleChange}
              placeholder="山田太郎"
              required
            />
          </label>
        </div>

        <div className="form-group">
          <label>
            総売上 (円):
            <input
              type="number"
              name="total_sales"
              value={formData.total_sales}
              onChange={handleChange}
              min="0"
              step="100"
              required
            />
          </label>
        </div>

        <div className="form-group">
          <label>
            稼働時間 (時間):
            <input
              type="number"
              name="work_hours"
              value={formData.work_hours}
              onChange={handleChange}
              min="0"
              step="0.5"
              required
            />
          </label>
        </div>

        <div className="form-group">
          <label>
            ドリンク杯数:
            <input
              type="number"
              name="drink_count"
              value={formData.drink_count}
              onChange={handleChange}
              min="0"
            />
          </label>
        </div>

        <div className="form-group">
          <label>
            シャンパン杯数:
            <input
              type="number"
              name="champagne_count"
              value={formData.champagne_count}
              onChange={handleChange}
              min="0"
            />
          </label>
        </div>

        <div className="form-group">
          <label>
            キャッチ数:
            <input
              type="number"
              name="catch_count"
              value={formData.catch_count}
              onChange={handleChange}
              min="0"
            />
          </label>
        </div>

        <button type="submit" disabled={loading} className="submit-button">
          {loading ? '保存中...' : '📝 売上データを保存'}
        </button>
      </form>

      {message && (
        <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}
    </div>
  );
};

export default SalesInput;