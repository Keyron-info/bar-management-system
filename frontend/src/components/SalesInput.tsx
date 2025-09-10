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
    work_hours: 0,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await axios.post('http://localhost:8002/api/sales', formData);
      setMessage('✅ 売上データを保存しました');
      
      setFormData({
        date: new Date().toISOString().split('T')[0],
        employee_name: '',
        total_sales: 0,
        drink_count: 0,
        champagne_count: 0,
        catch_count: 0,
        work_hours: 0,
      });
      
      onSalesAdded();
    } catch (error) {
      setMessage('❌ 保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>📊 売上データ入力</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="form-row">
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
          
          <label>
            従業員名:
            <input
              type="text"
              name="employee_name"
              value={formData.employee_name}
              onChange={handleChange}
              placeholder="名前を入力"
              required
            />
          </label>
        </div>

        <div className="form-row">
          <label>
            総売上 (円):
            <input
              type="number"
              name="total_sales"
              value={formData.total_sales}
              onChange={handleChange}
              min="0"
              required
            />
          </label>
          
          <label>
            稼働時間 (時間):
            <input
              type="number"
              name="work_hours"
              value={formData.work_hours}
              onChange={handleChange}
              min="0"
              max="24"
            />
          </label>
        </div>

        <div className="form-row">
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

        <div className="form-row">
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

        <button type="submit" disabled={loading}>
          {loading ? '保存中...' : '💾 売上データを保存'}
        </button>
      </form>

      {message && (
        <div className="message" style={{ 
          color: message.includes('✅') ? 'green' : 'red',
          marginTop: '10px',
          fontWeight: 'bold'
        }}>
          {message}
        </div>
      )}
    </div>
  );
};

export default SalesInput;