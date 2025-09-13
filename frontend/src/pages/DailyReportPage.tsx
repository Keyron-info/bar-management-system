import React, { useState } from 'react';
import { Calendar, User, Edit, Plus, Trash2, Download, Clock, CreditCard, DollarSign } from 'lucide-react';
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

interface ReceiptItem {
  id: string;
  customer_name: string;
  employee_name: string;
  drink_count: number;
  champagne_type: string;
  champagne_price: number;
  amount: number;
  is_card: boolean;
}

const DailyReportPage: React.FC<DailyReportPageProps> = ({ user }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [employeeName, setEmployeeName] = useState(user.name);
  
  const [reportData, setReportData] = useState({
    total_sales: '',
    alcohol_cost: '',
    other_expenses: '',
    card_sales: '',
    drink_count: '',
    champagne_type: '',
    champagne_price: '',
    work_start_time: '21:00',
    work_end_time: '04:00'
  });

  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);
  const [showReceiptForm, setShowReceiptForm] = useState(false);
  const [newReceipt, setNewReceipt] = useState({
    customer_name: '',
    employee_name: employeeName,
    drink_count: '',
    champagne_type: '',
    champagne_price: '',
    amount: '',
    is_card: false
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // 計算結果
  const totalReceiptAmount = receipts.reduce((sum, receipt) => sum + receipt.amount, 0);
  const totalExpenses = Number(reportData.alcohol_cost || 0) + Number(reportData.other_expenses || 0);
  const cashRemaining = Number(reportData.total_sales || 0) - Number(reportData.card_sales || 0);
  const netProfit = Number(reportData.total_sales || 0) - totalExpenses;

  const addReceipt = () => {
    if (newReceipt.customer_name && Number(newReceipt.amount) > 0) {
      const receipt: ReceiptItem = {
        id: Date.now().toString(),
        customer_name: newReceipt.customer_name,
        employee_name: newReceipt.employee_name,
        drink_count: Number(newReceipt.drink_count || 0),
        champagne_type: newReceipt.champagne_type,
        champagne_price: Number(newReceipt.champagne_price || 0),
        amount: Number(newReceipt.amount),
        is_card: newReceipt.is_card
      };
      setReceipts([...receipts, receipt]);
      setNewReceipt({
        customer_name: '',
        employee_name: employeeName,
        drink_count: '',
        champagne_type: '',
        champagne_price: '',
        amount: '',
        is_card: false
      });
      setShowReceiptForm(false);
    }
  };

  const deleteReceipt = (id: string) => {
    setReceipts(receipts.filter(receipt => receipt.id !== id));
  };

  const exportToExcel = () => {
    const csvContent = [
      ['日付', '担当者', '総売上', '酒代', 'その他経費', 'カード売上', 'ドリンク杯数', 'シャンパン種類', 'シャンパン価格', '勤務時間', '純利益', '現金残金'],
      [
        selectedDate,
        employeeName,
        reportData.total_sales,
        reportData.alcohol_cost,
        reportData.other_expenses,
        reportData.card_sales,
        reportData.drink_count,
        reportData.champagne_type,
        reportData.champagne_price,
        `${reportData.work_start_time}-${reportData.work_end_time}`,
        netProfit,
        cashRemaining
      ],
      [''],
      ['伝票詳細'],
      ['顧客名', '担当者', 'ドリンク杯数', 'シャンパン種類', 'シャンパン価格', '金額', '支払方法'],
      ...receipts.map(receipt => [
        receipt.customer_name,
        receipt.employee_name,
        receipt.drink_count,
        receipt.champagne_type,
        receipt.champagne_price,
        receipt.amount,
        receipt.is_card ? 'カード' : '現金'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `日報_${selectedDate}_${employeeName}.csv`);
    link.click();
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('認証が必要です');
      }

      const payload = {
        date: selectedDate,
        employee_name: employeeName,
        total_sales: Number(reportData.total_sales || 0),
        alcohol_cost: Number(reportData.alcohol_cost || 0),
        other_expenses: Number(reportData.other_expenses || 0),
        card_sales: Number(reportData.card_sales || 0),
        drink_count: Number(reportData.drink_count || 0),
        champagne_type: reportData.champagne_type,
        champagne_price: Number(reportData.champagne_price || 0),
        work_start_time: reportData.work_start_time,
        work_end_time: reportData.work_end_time,
        receipts: receipts.map(receipt => ({
          customer_name: receipt.customer_name,
          employee_name: receipt.employee_name,
          drink_count: receipt.drink_count,
          champagne_type: receipt.champagne_type,
          champagne_price: receipt.champagne_price,
          amount: receipt.amount,
          is_card: receipt.is_card
        }))
      };

      await axios.post(
        'https://bar-management-system.onrender.com/api/daily-report',
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      setMessage('日報の提出が完了しました');
      exportToExcel();

      // フォームリセット
      setReportData({
        total_sales: '',
        alcohol_cost: '',
        other_expenses: '',
        card_sales: '',
        drink_count: '',
        champagne_type: '',
        champagne_price: '',
        work_start_time: '21:00',
        work_end_time: '04:00'
      });
      setReceipts([]);
      
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
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
      {/* ページヘッダー */}
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ 
          fontSize: '28px', 
          color: '#2c3e50', 
          margin: '0 0 10px 0',
          fontWeight: '600'
        }}>
          日報入力
        </h1>
        <p style={{ color: '#7f8c8d', margin: 0 }}>
          今日の売上、経費、伝票情報を入力してください
        </p>
      </div>

      <form onSubmit={handleSubmitReport}>
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
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Calendar size={20} style={{ color: '#8B5A99' }} />
            基本情報
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
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
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                required
                style={{ 
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e1e8ed',
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  transition: 'border-color 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#8B5A99'}
                onBlur={(e) => e.target.style.borderColor = '#e1e8ed'}
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
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
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
        </div>

        {/* 売上・経費入力 */}
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
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <DollarSign size={20} style={{ color: '#8B5A99' }} />
            売上・経費入力
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            {[
              { key: 'total_sales', label: '総売上', placeholder: '0' },
              { key: 'alcohol_cost', label: '酒代', placeholder: '0' },
              { key: 'other_expenses', label: 'その他経費', placeholder: '0' },
              { key: 'card_sales', label: 'カード売上', placeholder: '0' }
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  color: '#2c3e50',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  {label}
                </label>
                <input
                  type="number"
                  value={reportData[key as keyof typeof reportData]}
                  onChange={(e) => setReportData({...reportData, [key]: e.target.value})}
                  placeholder={placeholder}
                  style={{ 
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e1e8ed',
                    borderRadius: '8px',
                    fontSize: '16px',
                    boxSizing: 'border-box',
                    outline: 'none',
                    transition: 'border-color 0.3s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#8B5A99'}
                  onBlur={(e) => e.target.style.borderColor = '#e1e8ed'}
                />
              </div>
            ))}
          </div>
        </div>

        {/* 勤務詳細 */}
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
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Clock size={20} style={{ color: '#8B5A99' }} />
            勤務詳細
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
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
                value={reportData.drink_count}
                onChange={(e) => setReportData({...reportData, drink_count: e.target.value})}
                placeholder="0"
                style={{ 
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e1e8ed',
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  transition: 'border-color 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#8B5A99'}
                onBlur={(e) => e.target.style.borderColor = '#e1e8ed'}
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
                シャンパン種類
              </label>
              <input
                type="text"
                value={reportData.champagne_type}
                onChange={(e) => setReportData({...reportData, champagne_type: e.target.value})}
                style={{ 
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e1e8ed',
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  transition: 'border-color 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#8B5A99'}
                onBlur={(e) => e.target.style.borderColor = '#e1e8ed'}
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
                シャンパン価格
              </label>
              <input
                type="number"
                value={reportData.champagne_price}
                onChange={(e) => setReportData({...reportData, champagne_price: e.target.value})}
                placeholder="0"
                style={{ 
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e1e8ed',
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  transition: 'border-color 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#8B5A99'}
                onBlur={(e) => e.target.style.borderColor = '#e1e8ed'}
              />
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                color: '#2c3e50',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                開始時間
              </label>
              <input
                type="time"
                value={reportData.work_start_time}
                onChange={(e) => setReportData({...reportData, work_start_time: e.target.value})}
                style={{ 
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e1e8ed',
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  transition: 'border-color 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#8B5A99'}
                onBlur={(e) => e.target.style.borderColor = '#e1e8ed'}
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
                終了時間
              </label>
              <input
                type="time"
                value={reportData.work_end_time}
                onChange={(e) => setReportData({...reportData, work_end_time: e.target.value})}
                style={{ 
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e1e8ed',
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  transition: 'border-color 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#8B5A99'}
                onBlur={(e) => e.target.style.borderColor = '#e1e8ed'}
              />
            </div>
          </div>
        </div>

        {/* 伝票入力セクション */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '25px',
          marginBottom: '25px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          border: '1px solid #e1e8ed'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ 
              fontSize: '18px', 
              color: '#2c3e50', 
              margin: 0,
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Edit size={20} style={{ color: '#8B5A99' }} />
              伝票入力
            </h2>
            <button
              type="button"
              onClick={() => setShowReceiptForm(true)}
              style={{
                background: 'linear-gradient(135deg, #8B5A99, #6B4C8A)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 16px',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: '500',
                transition: 'transform 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <Plus size={16} />
              伝票追加
            </button>
          </div>
          
          {receipts.map((receipt) => (
            <div key={receipt.id} style={{
              border: '1px solid #f0f0f0',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '12px',
              backgroundColor: '#fafafa'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
                    {receipt.customer_name} → {receipt.employee_name}
                  </div>
                  <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '8px' }}>
                    ドリンク: {receipt.drink_count}杯 | {receipt.champagne_type}: ¥{receipt.champagne_price.toLocaleString()}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#8B5A99' }}>
                      ¥{receipt.amount.toLocaleString()}
                    </div>
                    <div style={{ 
                      fontSize: '12px', 
                      padding: '4px 8px', 
                      borderRadius: '4px',
                      backgroundColor: receipt.is_card ? '#3498db' : '#27ae60',
                      color: 'white',
                      fontWeight: '500'
                    }}>
                      {receipt.is_card ? 'カード' : '現金'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => deleteReceipt(receipt.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#e74c3c',
                    cursor: 'pointer',
                    padding: '8px',
                    borderRadius: '4px',
                    transition: 'background-color 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fdeaea'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}

          {receipts.length === 0 && (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px', 
              color: '#7f8c8d',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              border: '2px dashed #e1e8ed'
            }}>
              伝票を追加してください
            </div>
          )}
        </div>

        {/* 計算結果 */}
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
            計算結果
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <div style={{ color: '#7f8c8d', fontSize: '14px', marginBottom: '8px' }}>純利益</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: netProfit >= 0 ? '#27ae60' : '#e74c3c' }}>
                ¥{netProfit.toLocaleString()}
              </div>
            </div>
            <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <div style={{ color: '#7f8c8d', fontSize: '14px', marginBottom: '8px' }}>現金残金</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#8B5A99' }}>
                ¥{cashRemaining.toLocaleString()}
              </div>
            </div>
            <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <div style={{ color: '#7f8c8d', fontSize: '14px', marginBottom: '8px' }}>伝票合計</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#3498db' }}>
                ¥{totalReceiptAmount.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* 提出ボタン */}
        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={exportToExcel}
            style={{
              padding: '15px 30px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: '500',
              transition: 'background-color 0.3s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5a6268'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6c757d'}
          >
            <Download size={18} />
            Excel出力
          </button>
          
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '15px 40px',
              background: loading ? '#bdc3c7' : 'linear-gradient(135deg, #8B5A99, #6B4C8A)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'transform 0.2s ease',
              opacity: loading ? 0.7 : 1
            }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = 'scale(1.05)')}
            onMouseLeave={(e) => !loading && (e.currentTarget.style.transform = 'scale(1)')}
          >
            <Edit size={18} />
            {loading ? '提出中...' : '日報提出'}
          </button>
        </div>
      </form>

      {/* 伝票追加モーダル */}
      {showReceiptForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '25px',
            width: '100%',
            maxWidth: '400px',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ 
              margin: '0 0 20px 0', 
              fontSize: '18px',
              color: '#2c3e50',
              fontWeight: '600'
            }}>
              伝票追加
            </h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ 
                fontSize: '14px', 
                color: '#2c3e50', 
                display: 'block', 
                marginBottom: '6px',
                fontWeight: '500'
              }}>
                顧客名
              </label>
              <input
                type="text"
                value={newReceipt.customer_name}
                onChange={(e) => setNewReceipt({...newReceipt, customer_name: e.target.value})}
                style={{ 
                  width: '100%', 
                  padding: '12px 16px', 
                  border: '2px solid #e1e8ed', 
                  borderRadius: '8px', 
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  transition: 'border-color 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#8B5A99'}
                onBlur={(e) => e.target.style.borderColor = '#e1e8ed'}
              />
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ 
                fontSize: '14px', 
                color: '#2c3e50', 
                display: 'block', 
                marginBottom: '6px',
                fontWeight: '500'
              }}>
                担当者
              </label>
              <input
                type="text"
                value={newReceipt.employee_name}
                onChange={(e) => setNewReceipt({...newReceipt, employee_name: e.target.value})}
                style={{ 
                  width: '100%', 
                  padding: '12px 16px', 
                  border: '2px solid #e1e8ed', 
                  borderRadius: '8px', 
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ 
                  fontSize: '14px', 
                  color: '#2c3e50', 
                  display: 'block', 
                  marginBottom: '6px',
                  fontWeight: '500'
                }}>
                  ドリンク杯数
                </label>
                <input
                  type="number"
                  value={newReceipt.drink_count}
                  onChange={(e) => setNewReceipt({...newReceipt, drink_count: e.target.value})}
                  placeholder="0"
                  style={{ 
                    width: '100%', 
                    padding: '12px 16px', 
                    border: '2px solid #e1e8ed', 
                    borderRadius: '8px', 
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    outline: 'none',
                    transition: 'border-color 0.3s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#8B5A99'}
                  onBlur={(e) => e.target.style.borderColor = '#e1e8ed'}
                />
              </div>
              <div>
                <label style={{ 
                  fontSize: '14px', 
                  color: '#2c3e50', 
                  display: 'block', 
                  marginBottom: '6px',
                  fontWeight: '500'
                }}>
                  金額
                </label>
                <input
                  type="number"
                  value={newReceipt.amount}
                  onChange={(e) => setNewReceipt({...newReceipt, amount: e.target.value})}
                  placeholder="0"
                  style={{ 
                    width: '100%', 
                    padding: '12px 16px', 
                    border: '2px solid #e1e8ed', 
                    borderRadius: '8px', 
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    outline: 'none',
                    transition: 'border-color 0.3s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#8B5A99'}
                  onBlur={(e) => e.target.style.borderColor = '#e1e8ed'}
                />
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ 
                  fontSize: '14px', 
                  color: '#2c3e50', 
                  display: 'block', 
                  marginBottom: '6px',
                  fontWeight: '500'
                }}>
                  シャンパン種類
                </label>
                <input
                  type="text"
                  value={newReceipt.champagne_type}
                  onChange={(e) => setNewReceipt({...newReceipt, champagne_type: e.target.value})}
                  style={{ 
                    width: '100%', 
                    padding: '12px 16px', 
                    border: '2px solid #e1e8ed', 
                    borderRadius: '8px', 
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    outline: 'none',
                    transition: 'border-color 0.3s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#8B5A99'}
                  onBlur={(e) => e.target.style.borderColor = '#e1e8ed'}
                />
              </div>
              <div>
                <label style={{ 
                  fontSize: '14px', 
                  color: '#2c3e50', 
                  display: 'block', 
                  marginBottom: '6px',
                  fontWeight: '500'
                }}>
                  シャンパン価格
                </label>
                <input
                  type="number"
                  value={newReceipt.champagne_price}
                  onChange={(e) => setNewReceipt({...newReceipt, champagne_price: e.target.value})}
                  placeholder="0"
                  style={{ 
                    width: '100%', 
                    padding: '12px 16px', 
                    border: '2px solid #e1e8ed', 
                    borderRadius: '8px', 
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    outline: 'none',
                    transition: 'border-color 0.3s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#8B5A99'}
                  onBlur={(e) => e.target.style.borderColor = '#e1e8ed'}
                />
              </div>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                cursor: 'pointer',
                fontSize: '14px',
                color: '#2c3e50',
                fontWeight: '500'
              }}>
                <div style={{
                  width: '18px',
                  height: '18px',
                  border: '2px solid #8B5A99',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: newReceipt.is_card ? '#8B5A99' : 'transparent',
                  transition: 'all 0.2s ease'
                }}>
                  <input
                    type="checkbox"
                    checked={newReceipt.is_card}
                    onChange={(e) => setNewReceipt({...newReceipt, is_card: e.target.checked})}
                    style={{
                      opacity: 0,
                      position: 'absolute',
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer'
                    }}
                  />
                  {newReceipt.is_card && (
                    <div style={{
                      width: '10px',
                      height: '10px',
                      backgroundColor: 'white',
                      borderRadius: '2px'
                    }} />
                  )}
                </div>
                <CreditCard size={16} style={{ color: '#8B5A99' }} />
                カード払い
              </label>
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setShowReceiptForm(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #e1e8ed',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#6c757d',
                  fontWeight: '500',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e9ecef'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={addReceipt}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'linear-gradient(135deg, #8B5A99, #6B4C8A)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'transform 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                追加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* メッセージ表示 */}
      {message && (
        <div style={{ 
          marginTop: '25px',
          padding: '16px 20px',
          backgroundColor: message.includes('完了') ? '#d5f4e6' : '#fdeaea',
          border: `1px solid ${message.includes('完了') ? '#27ae60' : '#e74c3c'}`,
          color: message.includes('完了') ? '#27ae60' : '#e74c3c',
          borderRadius: '8px',
          textAlign: 'center',
          fontWeight: '500',
          fontSize: '14px'
        }}>
          {message}
        </div>
      )}

      {/* Footer */}
      <div style={{
        marginTop: '40px',
        textAlign: 'center',
        fontSize: '12px',
        color: '#7f8c8d'
      }}>
        Powered by KEYRON
      </div>
    </div>
  );
};

export default DailyReportPage;