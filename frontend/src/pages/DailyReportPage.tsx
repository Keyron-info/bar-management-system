import React, { useState } from 'react';
import axios from 'axios';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

interface DailyReportPageProps {
  user: User;
}

interface SalesData {
  date: string;
  employee_name: string;
  total_sales: number;
  drink_count: number;
  champagne_count: number;
  catch_count: number;
  work_hours: number;
}

const DailyReportPage: React.FC<DailyReportPageProps> = ({ user }) => {
  const [formData, setFormData] = useState<SalesData>({
    date: new Date().toISOString().split('T')[0],
    employee_name: user.name,
    total_sales: 0,
    drink_count: 0,
    champagne_count: 0,
    catch_count: 0,
    work_hours: 0,
  });
  
  const [expenses, setExpenses] = useState({
    alcohol_cost: 0,
    other_expenses: 0,
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

  const handleExpenseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setExpenses(prev => ({
      ...prev,
      [name]: Number(value)
    }));
  };

  const calculateRemaining = () => {
    const totalExpenses = expenses.alcohol_cost + expenses.other_expenses;
    return formData.total_sales - totalExpenses;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('認証が必要です');
      }

      await axios.post(
        'https://bar-management-system.onrender.com/api/sales',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      setMessage('日報の提出が完了しました');
      
      // フォームをリセット
      setFormData({
        date: new Date().toISOString().split('T')[0],
        employee_name: user.name,
        total_sales: 0,
        drink_count: 0,
        champagne_count: 0,
        catch_count: 0,
        work_hours: 0,
      });
      
      setExpenses({
        alcohol_cost: 0,
        other_expenses: 0,
      });
    } catch (error: any) {
      console.error('Save error:', error);
      if (error.response?.status === 401) {
        setMessage('認証エラー：再ログインしてください');
      } else {
        setMessage('提出に失敗しました');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* ページヘッダー */}
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ 
          fontSize: '28px', 
          color: '#2c3e50', 
          margin: '0 0 10px 0',
          fontWeight: '600'
        }}>
          📝 日報入力
        </h1>
        <p style={{ color: '#7f8c8d', margin: 0 }}>
          今日の売上と経費を入力してください
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* 基本情報 */}
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
            基本情報
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                color: '#2c3e50',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                日付
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
                style={{ 
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e1e8ed',
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
            </div>
            
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                color: '#2c3e50',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                担当者
              </label>
              <input
                type="text"
                name="employee_name"
                value={formData.employee_name}
                onChange={handleChange}
                required
                style={{ 
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e1e8ed',
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  backgroundColor: '#f8f9fa'
                }}
                readOnly
              />
            </div>
          </div>

          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              color: '#2c3e50',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              稼働時間 (時間)
            </label>
            <input
              type="number"
              name="work_hours"
              value={formData.work_hours}
              onChange={handleChange}
              min="0"
              max="24"
              step="0.5"
              required
              style={{ 
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e1e8ed',
                borderRadius: '8px',
                fontSize: '16px',
                boxSizing: 'border-box',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* 売上情報 */}
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
            売上情報
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                color: '#2c3e50',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                総売上 (円)
              </label>
              <input
                type="number"
                name="total_sales"
                value={formData.total_sales}
                onChange={handleChange}
                min="0"
                required
                style={{ 
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e1e8ed',
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                color: '#2c3e50',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                ドリンク杯数
              </label>
              <input
                type="number"
                name="drink_count"
                value={formData.drink_count}
                onChange={handleChange}
                min="0"
                style={{ 
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e1e8ed',
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                color: '#2c3e50',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                シャンパン本数
              </label>
              <input
                type="number"
                name="champagne_count"
                value={formData.champagne_count}
                onChange={handleChange}
                min="0"
                style={{ 
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e1e8ed',
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                color: '#2c3e50',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                キャッチ数
              </label>
              <input
                type="number"
                name="catch_count"
                value={formData.catch_count}
                onChange={handleChange}
                min="0"
                style={{ 
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e1e8ed',
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
            </div>
          </div>
        </div>

        {/* 経費情報 */}
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
            経費情報
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                color: '#2c3e50',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                酒代 (円)
              </label>
              <input
                type="number"
                name="alcohol_cost"
                value={expenses.alcohol_cost}
                onChange={handleExpenseChange}
                min="0"
                style={{ 
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e1e8ed',
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                color: '#2c3e50',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                その他経費 (円)
              </label>
              <input
                type="number"
                name="other_expenses"
                value={expenses.other_expenses}
                onChange={handleExpenseChange}
                min="0"
                style={{ 
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e1e8ed',
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* 残金計算 */}
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #e1e8ed'
          }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#2c3e50' }}>計算結果</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '4px' }}>総売上</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2c3e50' }}>
                  {formData.total_sales.toLocaleString()}円
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '4px' }}>総経費</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#e74c3c' }}>
                  {(expenses.alcohol_cost + expenses.other_expenses).toLocaleString()}円
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '4px' }}>残金</div>
                <div style={{ 
                  fontSize: '18px', 
                  fontWeight: 'bold', 
                  color: calculateRemaining() >= 0 ? '#27ae60' : '#e74c3c'
                }}>
                  {calculateRemaining().toLocaleString()}円
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 提出ボタン */}
        <div style={{ textAlign: 'center' }}>
          <button 
            type="submit" 
            disabled={loading}
            style={{
              backgroundColor: loading ? '#bdc3c7' : '#3498db',
              color: 'white',
              padding: '15px 40px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              minWidth: '200px',
              transition: 'background-color 0.3s ease'
            }}
          >
            {loading ? '提出中...' : '📝 日報を提出'}
          </button>
        </div>
      </form>

      {/* メッセージ表示 */}
      {message && (
        <div style={{ 
          marginTop: '20px',
          padding: '15px',
          backgroundColor: message.includes('完了') ? '#d5f4e6' : '#fdeaea',
          border: `1px solid ${message.includes('完了') ? '#27ae60' : '#e74c3c'}`,
          color: message.includes('完了') ? '#27ae60' : '#e74c3c',
          borderRadius: '8px',
          textAlign: 'center',
          fontWeight: '500'
        }}>
          {message}
        </div>
      )}
    </div>
  );
};

export default DailyReportPage;