import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Settings, X, Receipt, Calculator, DollarSign, User, Edit, ChevronDown } from 'lucide-react';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  store_id?: number;
}

interface StoreEmployee {
  id: number;
  name: string;
  employee_code: string;
}

interface ReceiptItem {
  id: string;
  totalAmount: number | string; // 初期値対応
  isCardPayment: boolean;
  assignedEmployeeId: number; // 売上担当者
  drinks: DrinkItem[];
  champagnes: ChampagneItem[];
}

interface DrinkItem {
  employeeName: string;
  drinkCount: number;
  amount: number;
}

interface ChampagneItem {
  name: string;
  amount: number;
}

interface DailyReportPageProps {
  user: User;
}

const DailyReportPage: React.FC<DailyReportPageProps> = ({ user }) => {
  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);
  const [alcoholExpense, setAlcoholExpense] = useState<number>(0);
  const [otherExpenses, setOtherExpenses] = useState<number>(0);
  const [showReceiptForm, setShowReceiptForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [storeEmployees, setStoreEmployees] = useState<StoreEmployee[]>([]);
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  
  // 新規伝票フォーム状態
  const [newReceipt, setNewReceipt] = useState({
    totalAmount: '', // 初期値を空文字に変更
    isCardPayment: false,
    assignedEmployeeId: user.id, // デフォルトは自分
    drinks: [{ employeeName: user.name, drinkCount: 0, amount: 0 }],
    champagnes: [] as ChampagneItem[]
  });

  useEffect(() => {
    fetchStoreEmployees();
  }, []);

  const fetchStoreEmployees = async () => {
    try {
      const token = localStorage.getItem('token');
      // 同じ店舗の従業員一覧を取得
      const response = await fetch('https://bar-management-system.onrender.com/api/store/employees', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const employees = await response.json();
        setStoreEmployees(employees);
      }
    } catch (error) {
      console.error('従業員データ取得エラー:', error);
    }
  };

  // 計算
  const totalSales = receipts.reduce((sum, receipt) => {
    const amount = typeof receipt.totalAmount === 'string' ? 
      parseFloat(receipt.totalAmount) || 0 : receipt.totalAmount;
    return sum + amount;
  }, 0);

  const cardSales = receipts
    .filter(receipt => receipt.isCardPayment)
    .reduce((sum, receipt) => {
      const amount = typeof receipt.totalAmount === 'string' ? 
        parseFloat(receipt.totalAmount) || 0 : receipt.totalAmount;
      return sum + amount;
    }, 0);

  const cashSales = totalSales - cardSales;
  const totalExpenses = alcoholExpense + otherExpenses;
  const netProfit = totalSales - totalExpenses;

  const submitReceipt = () => {
    if (!newReceipt.totalAmount || newReceipt.totalAmount === '') {
      alert('合計金額を入力してください');
      return;
    }

    const receipt: ReceiptItem = {
      id: Date.now().toString(),
      ...newReceipt,
      totalAmount: typeof newReceipt.totalAmount === 'string' ? 
        parseFloat(newReceipt.totalAmount) || 0 : newReceipt.totalAmount
    };
    
    setReceipts(prev => [...prev, receipt]);
    setNewReceipt({
      totalAmount: '',
      isCardPayment: false,
      assignedEmployeeId: user.id,
      drinks: [{ employeeName: user.name, drinkCount: 0, amount: 0 }],
      champagnes: []
    });
    setShowReceiptForm(false);
  };

  const deleteReceipt = (receiptId: string) => {
    setReceipts(prev => prev.filter(receipt => receipt.id !== receiptId));
  };

  const submitDailyReport = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // 日報データを準備
      const reportData = {
        date: new Date().toISOString().split('T')[0],
        employee_name: user.name,
        total_sales: totalSales,
        alcohol_cost: alcoholExpense,
        other_expenses: otherExpenses,
        receipts: receipts.map(receipt => ({
          ...receipt,
          totalAmount: typeof receipt.totalAmount === 'string' ? 
            parseFloat(receipt.totalAmount) || 0 : receipt.totalAmount
        }))
      };

      // APIに送信
      const response = await fetch('https://bar-management-system.onrender.com/api/daily-reports/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData)
      });

      if (response.ok) {
        alert('日報が正常に提出されました！店長に通知が送信されます。');
        
        // フォームをリセット
        setReceipts([]);
        setAlcoholExpense(0);
        setOtherExpenses(0);
        
        // 売上データを他のページに反映させるため、ページリロード
        window.location.reload();
      } else {
        const errorData = await response.json();
        alert(`提出エラー: ${errorData.detail || '不明なエラー'}`);
      }
    } catch (error) {
      alert('提出中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const getEmployeeName = (employeeId: number) => {
    const employee = storeEmployees.find(emp => emp.id === employeeId);
    return employee ? employee.name : '不明';
  };

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px',
      backgroundColor: '#FAFAFA',
      minHeight: '100vh',
      fontFamily: '"Noto Sans JP", sans-serif'
    }}>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ 
          fontSize: '28px', 
          color: '#000', 
          margin: '0 0 10px 0',
          fontWeight: '600'
        }}>
          日報提出
        </h1>
        <p style={{ color: '#666', margin: 0 }}>
          今日の売上と経費を入力してください
        </p>
      </div>

      {/* Date Selection Section */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '25px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          border: '1px solid #e1e8ed',
          display: 'flex',
          alignItems: 'center',
          gap: '15px'
        }}>
          <div style={{
            backgroundColor: '#fafaff',
            borderRadius: '10px',
            padding: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Calendar size={20} color="#9333EA" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>作業日</div>
            <input 
              type="date" 
              defaultValue={new Date().toISOString().split('T')[0]}
              style={{
                border: 'none',
                fontSize: '16px',
                color: '#000',
                backgroundColor: 'transparent',
                width: '100%',
                outline: 'none'
              }}
            />
          </div>
        </div>
        
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          border: '1px solid #e1e8ed',
          display: 'flex',
          alignItems: 'center',
          gap: '15px'
        }}>
          <div style={{
            backgroundColor: '#fafaff',
            borderRadius: '10px',
            padding: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <User size={20} color="#9333EA" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>提出者</div>
            <div style={{ fontSize: '16px', color: '#000', fontWeight: '500' }}>
              {user.name}
            </div>
          </div>
        </div>
      </div>

      {/* 売上サマリー */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '25px',
        marginBottom: '25px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        border: '1px solid #e1e8ed'
      }}>
        <h3 style={{
          fontSize: '18px',
          color: '#000',
          margin: '0 0 20px 0',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <DollarSign size={20} color="#9333EA" />
          売上サマリー
        </h3>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', 
          gap: '20px' 
        }}>
          <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#fafafa', borderRadius: '8px' }}>
            <div style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>総売上</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#9333EA' }}>
              ¥{totalSales.toLocaleString()}
            </div>
          </div>
          
          <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#fafafa', borderRadius: '8px' }}>
            <div style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>カード売上</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#000' }}>
              ¥{cardSales.toLocaleString()}
            </div>
          </div>
          
          <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#fafafa', borderRadius: '8px' }}>
            <div style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>現金売上</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#000' }}>
              ¥{cashSales.toLocaleString()}
            </div>
          </div>

          <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#fafafa', borderRadius: '8px' }}>
            <div style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>純利益</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: netProfit >= 0 ? '#27ae60' : '#e74c3c' }}>
              ¥{netProfit.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* 経費入力 */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '25px',
        marginBottom: '25px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        border: '1px solid #e1e8ed'
      }}>
        <h3 style={{
          fontSize: '18px',
          color: '#000',
          margin: '0 0 20px 0',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Receipt size={20} color="#9333EA" />
          経費入力
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              color: '#000',
              marginBottom: '8px',
              fontWeight: '500'
            }}>
              酒代
            </label>
            <input
              type="number"
              value={alcoholExpense || ''}
              onChange={(e) => setAlcoholExpense(Number(e.target.value) || 0)}
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
              placeholder="酒代を入力"
            />
          </div>
          
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              color: '#000',
              marginBottom: '8px',
              fontWeight: '500'
            }}>
              その他経費
            </label>
            <input
              type="number"
              value={otherExpenses || ''}
              onChange={(e) => setOtherExpenses(Number(e.target.value) || 0)}
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
              placeholder="その他経費を入力"
            />
          </div>
        </div>
      </div>

      {/* 伝票管理 */}
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
          <h3 style={{
            fontSize: '18px',
            color: '#000',
            margin: '0',
            fontWeight: '600'
          }}>
            伝票管理
          </h3>
          <span style={{
            fontSize: '14px',
            color: '#666',
            backgroundColor: '#fafafa',
            padding: '6px 12px',
            borderRadius: '20px'
          }}>
            {receipts.length}件の伝票
          </span>
        </div>
        
        <button 
          onClick={() => setShowReceiptForm(true)}
          style={{
            width: '100%',
            padding: '15px',
            background: 'linear-gradient(135deg, #9333EA, #F0E)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '20px',
            transition: 'transform 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <Plus size={20} />
          新しい伝票を追加
        </button>

        {receipts.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {receipts.map((receipt) => {
              const amount = typeof receipt.totalAmount === 'string' ? 
                parseFloat(receipt.totalAmount) || 0 : receipt.totalAmount;
              
              return (
                <div key={receipt.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '15px 20px',
                  backgroundColor: '#fafafa',
                  borderRadius: '8px',
                  border: '1px solid #e1e8ed'
                }}>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#000', marginBottom: '4px' }}>
                      ¥{amount.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      {receipt.isCardPayment ? 'カード決済' : '現金決済'} | 
                      担当: {getEmployeeName(receipt.assignedEmployeeId)} | 
                      ドリンク{receipt.drinks.length}品
                    </div>
                  </div>
                  <button 
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
                    <X size={18} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 提出ボタン */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button 
          onClick={submitDailyReport}
          disabled={loading || receipts.length === 0}
          style={{
            padding: '15px 40px',
            background: loading || receipts.length === 0 ? '#bdc3c7' : 'linear-gradient(135deg, #9333EA, #F0E)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '18px',
            fontWeight: '600',
            cursor: loading || receipts.length === 0 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'transform 0.2s ease',
            opacity: loading || receipts.length === 0 ? 0.7 : 1
          }}
          onMouseEnter={(e) => !loading && receipts.length > 0 && (e.currentTarget.style.transform = 'scale(1.05)')}
          onMouseLeave={(e) => !loading && receipts.length > 0 && (e.currentTarget.style.transform = 'scale(1)')}
        >
          <Edit size={20} />
          {loading ? '提出中...' : '日報を提出'}
        </button>
      </div>

      {/* Receipt Form Modal */}
      {showReceiptForm && (
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
            maxWidth: '600px',
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
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#000' }}>
                新しい伝票
              </h3>
              <button 
                onClick={() => setShowReceiptForm(false)}
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
                  合計金額 *
                </label>
                <input
                  type="number"
                  value={newReceipt.totalAmount}
                  onChange={(e) => setNewReceipt(prev => ({
                    ...prev,
                    totalAmount: e.target.value
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
                  placeholder="金額を入力してください"
                  required
                />
              </div>

              {/* 売上担当者選択 */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '500',
                  color: '#000',
                  fontSize: '14px'
                }}>
                  売上担当者 *
                </label>
                <div style={{ position: 'relative' }}>
                  <div 
                    onClick={() => setShowEmployeeDropdown(!showEmployeeDropdown)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #e1e8ed',
                      borderRadius: '8px',
                      fontSize: '16px',
                      color: '#000',
                      backgroundColor: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      boxSizing: 'border-box'
                    }}
                  >
                    <span>{getEmployeeName(newReceipt.assignedEmployeeId)}</span>
                    <ChevronDown size={16} color="#666" />
                  </div>
                  
                  {showEmployeeDropdown && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      backgroundColor: 'white',
                      border: '1px solid #e1e8ed',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                      zIndex: 10,
                      maxHeight: '200px',
                      overflowY: 'auto'
                    }}>
                      {storeEmployees.map((employee) => (
                        <div
                          key={employee.id}
                          onClick={() => {
                            setNewReceipt(prev => ({
                              ...prev,
                              assignedEmployeeId: employee.id
                            }));
                            setShowEmployeeDropdown(false);
                          }}
                          style={{
                            padding: '12px 16px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            color: newReceipt.assignedEmployeeId === employee.id ? '#9333EA' : '#000',
                            backgroundColor: newReceipt.assignedEmployeeId === employee.id ? '#fafaff' : 'white',
                            borderBottom: '1px solid #f0f0f0'
                          }}
                        >
                          {employee.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#000',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={newReceipt.isCardPayment}
                    onChange={(e) => setNewReceipt(prev => ({
                      ...prev,
                      isCardPayment: e.target.checked
                    }))}
                    style={{ accentColor: '#9333EA' }}
                  />
                  カード決済
                </label>
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
                onClick={submitReceipt}
                disabled={!newReceipt.totalAmount || newReceipt.totalAmount === ''}
                style={{
                  background: (!newReceipt.totalAmount || newReceipt.totalAmount === '') ? 
                    '#bdc3c7' : 'linear-gradient(135deg, #9333EA, #F0E)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: (!newReceipt.totalAmount || newReceipt.totalAmount === '') ? 
                    'not-allowed' : 'pointer'
                }}
              >
                伝票を追加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyReportPage;