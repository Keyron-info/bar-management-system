import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { Calendar, Plus, Settings, X, Receipt, Calculator, DollarSign, User, Edit, ChevronDown, Wine, Trash2, Users } from 'lucide-react';

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

interface DrinkItem {
  id: string;
  employeeId: number;
  employeeName: string;
  drinkCount: number;
}

interface ChampagneItem {
  id: string;
  name: string;
  amount: number;
}

interface CatchItem {
  id: string;
  employeeId: number;
  employeeName: string;
  catchCount: number;
}

interface ReceiptItem {
  id: string;
  totalAmount: number | string;
  isCardPayment: boolean;
  assignedEmployeeId: number;
  drinks: DrinkItem[];
  champagnes: ChampagneItem[];
  catches: CatchItem[];
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
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [newReceipt, setNewReceipt] = useState<{
    totalAmount: string;
    isCardPayment: boolean;
    assignedEmployeeId: number;
    drinks: DrinkItem[];
    champagnes: ChampagneItem[];
    catches: CatchItem[];
  }>({
    totalAmount: '',
    isCardPayment: false,
    assignedEmployeeId: user.id,
    drinks: [],
    champagnes: [],
    catches: []
  });

  useEffect(() => {
    fetchStoreEmployees();
  }, []);

  const fetchStoreEmployees = async () => {
    try {
      const token = localStorage.getItem('token');
      const store_id = user.store_id;
      
      console.log('🔍 従業員データ取得開始:', { store_id, user });
      
      if (!store_id) {
        console.error('❌ 店舗IDが見つかりません');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/stores/${store_id}/employees`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 従業員API レスポンスステータス:', response.status);
      
      if (response.ok) {
        const employees = await response.json();
        console.log('✅ 従業員データ取得成功:', employees);
        setStoreEmployees(employees);
      } else {
        const errorData = await response.json();
        console.error('❌ 従業員データ取得失敗:', errorData);
      }
    } catch (error) {
      console.error('❌ 従業員データ取得エラー:', error);
    }
  };

  // 🆕 ドリンク追加
  const addDrinkEntry = () => {
    if (storeEmployees.length === 0) {
      alert('従業員データを読み込み中です。少々お待ちください。');
      return;
    }
    
    const newDrink: DrinkItem = {
      id: Date.now().toString(),
      employeeId: storeEmployees[0]?.id || user.id,
      employeeName: storeEmployees[0]?.name || user.name,
      drinkCount: 0
    };
    setNewReceipt(prev => ({
      ...prev,
      drinks: [...prev.drinks, newDrink]
    }));
  };

  // 🆕 ドリンク削除
  const removeDrinkEntry = (drinkId: string) => {
    setNewReceipt(prev => ({
      ...prev,
      drinks: prev.drinks.filter(d => d.id !== drinkId)
    }));
  };

  // 🆕 ドリンク更新
  const updateDrinkEntry = (drinkId: string, field: 'employeeId' | 'drinkCount', value: number | string) => {
    setNewReceipt(prev => ({
      ...prev,
      drinks: prev.drinks.map(drink => {
        if (drink.id === drinkId) {
          if (field === 'employeeId') {
            const employee = storeEmployees.find(e => e.id === Number(value));
            return {
              ...drink,
              employeeId: Number(value),
              employeeName: employee?.name || drink.employeeName
            };
          } else {
            return { ...drink, drinkCount: Number(value) };
          }
        }
        return drink;
      })
    }));
  };

  // 🆕 シャンパン追加
  const addChampagneEntry = () => {
    const newChampagne: ChampagneItem = {
      id: Date.now().toString(),
      name: '',
      amount: 0
    };
    setNewReceipt(prev => ({
      ...prev,
      champagnes: [...prev.champagnes, newChampagne]
    }));
  };

  // 🆕 シャンパン削除
  const removeChampagneEntry = (champagneId: string) => {
    setNewReceipt(prev => ({
      ...prev,
      champagnes: prev.champagnes.filter(c => c.id !== champagneId)
    }));
  };

  // 🆕 シャンパン更新
  const updateChampagneEntry = (champagneId: string, field: 'name' | 'amount', value: string | number) => {
    setNewReceipt(prev => ({
      ...prev,
      champagnes: prev.champagnes.map(champagne => 
        champagne.id === champagneId 
          ? { ...champagne, [field]: field === 'amount' ? Number(value) : value }
          : champagne
      )
    }));
  };

  // 🆕 キャッチ追加
  const addCatchEntry = () => {
    if (storeEmployees.length === 0) {
      alert('従業員データを読み込み中です。少々お待ちください。');
      return;
    }
    
    const newCatch: CatchItem = {
      id: Date.now().toString(),
      employeeId: storeEmployees[0]?.id || user.id,
      employeeName: storeEmployees[0]?.name || user.name,
      catchCount: 0
    };
    setNewReceipt(prev => ({
      ...prev,
      catches: [...prev.catches, newCatch]
    }));
  };

  // 🆕 キャッチ削除
  const removeCatchEntry = (catchId: string) => {
    setNewReceipt(prev => ({
      ...prev,
      catches: prev.catches.filter(c => c.id !== catchId)
    }));
  };

  // 🆕 キャッチ更新
  const updateCatchEntry = (catchId: string, field: 'employeeId' | 'catchCount', value: number | string) => {
    setNewReceipt(prev => ({
      ...prev,
      catches: prev.catches.map(catchItem => {
        if (catchItem.id === catchId) {
          if (field === 'employeeId') {
            const employee = storeEmployees.find(e => e.id === Number(value));
            return {
              ...catchItem,
              employeeId: Number(value),
              employeeName: employee?.name || catchItem.employeeName
            };
          } else {
            return { ...catchItem, catchCount: Number(value) };
          }
        }
        return catchItem;
      })
    }));
  };

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
      drinks: [],
      champagnes: [],
      catches: []
    });
    setShowReceiptForm(false);
  };

  const deleteReceipt = (receiptId: string) => {
    setReceipts(prev => prev.filter(receipt => receipt.id !== receiptId));
  };

  // DailyReportPage.tsx の submitDailyReport 関数を以下に置き換えてください

const submitDailyReport = async () => {
  setLoading(true);
  try {
    const token = localStorage.getItem('token');
    const store_id = user.store_id;
    
    if (!store_id) {
      alert('店舗IDが見つかりません');
      setLoading(false);
      return;
    }

    if (!user.id) {
      alert('ユーザーIDが見つかりません');
      setLoading(false);
      return;
    }

    // 🆕 伝票からドリンク数、シャンパン情報、キャッチ数を集計
    let totalDrinkCount = 0;
    let totalChampagnePrice = 0;
    let champagneTypes: string[] = [];
    let totalCatchCount = 0;

    receipts.forEach(receipt => {
      // ドリンク数を合計
      if (receipt.drinks && receipt.drinks.length > 0) {
        receipt.drinks.forEach(drink => {
          totalDrinkCount += drink.drinkCount || 0;
        });
      }

      // シャンパン情報を集計
      if (receipt.champagnes && receipt.champagnes.length > 0) {
        receipt.champagnes.forEach(champagne => {
          totalChampagnePrice += champagne.amount || 0;
          if (champagne.name && !champagneTypes.includes(champagne.name)) {
            champagneTypes.push(champagne.name);
          }
        });
      }

      // キャッチ数を合計
      if (receipt.catches && receipt.catches.length > 0) {
        receipt.catches.forEach(catchItem => {
          totalCatchCount += catchItem.catchCount || 0;
        });
      }
    });

    const reportData = {
      store_id: store_id,
      employee_id: user.id,
      date: selectedDate,
      total_sales: totalSales,
      alcohol_cost: alcoholExpense,
      other_expenses: otherExpenses,
      card_sales: cardSales,
      drink_count: totalDrinkCount,  // 🆕 実際のドリンク数
      champagne_type: champagneTypes.join(', '),  // 🆕 シャンパン名
      champagne_price: totalChampagnePrice,  // 🆕 シャンパン合計金額
      catch_count: totalCatchCount,  // 🆕 キャッチ数
      work_start_time: '18:00',
      work_end_time: '02:00',
      break_minutes: 0,
      notes: `伝票数: ${receipts.length}件, ドリンク: ${totalDrinkCount}杯, シャンパン: ¥${totalChampagnePrice.toLocaleString()}, キャッチ: ${totalCatchCount}回`
    };

    console.log('📤 送信データ:', reportData);

    const response = await fetch(`${API_BASE_URL}/api/stores/${store_id}/daily-reports`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reportData)
    });

    if (response.ok) {
      alert('日報が正常に提出されました！店長に通知が送信されます。');
      
      setReceipts([]);
      setAlcoholExpense(0);
      setOtherExpenses(0);
      
      window.location.reload();
    } else {
      const errorData = await response.json();
      alert(`提出エラー: ${errorData.detail || '不明なエラー'}`);
    }
  } catch (error) {
    console.error('日報提出エラー:', error);
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
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
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
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  padding: '15px 20px',
                  backgroundColor: '#fafafa',
                  borderRadius: '8px',
                  border: '1px solid #e1e8ed'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#000', marginBottom: '6px' }}>
                      ¥{amount.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                      {receipt.isCardPayment ? '💳 カード決済' : '💵 現金決済'} | 
                      担当: {getEmployeeName(receipt.assignedEmployeeId)}
                    </div>
                    {receipt.drinks.length > 0 && (
                      <div style={{ fontSize: '13px', color: '#888', marginTop: '6px' }}>
                        🍹 ドリンク: {receipt.drinks.map(d => `${d.employeeName}(${d.drinkCount}杯)`).join(', ')}
                      </div>
                    )}
                    {receipt.champagnes.length > 0 && (
                      <div style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>
                        🍾 シャンパン: {receipt.champagnes.map(c => `${c.name}(¥${c.amount.toLocaleString()})`).join(', ')}
                      </div>
                    )}
                    {receipt.catches && receipt.catches.length > 0 && (
                      <div style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>
                        🎯 キャッチ: {receipt.catches.map(c => `${c.employeeName}(${c.catchCount}回)`).join(', ')}
                      </div>
                    )}
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
              {/* 合計金額 */}
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
                  
                  {showEmployeeDropdown && storeEmployees.length > 0 && (
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
                      overflowY: 'auto',
                      marginTop: '4px'
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

              {/* 🆕 ドリンク記録セクション */}
              <div style={{ marginBottom: '25px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px'
                }}>
                  <label style={{ 
                    fontWeight: '500',
                    color: '#000',
                    fontSize: '14px'
                  }}>
                    ドリンク記録
                  </label>
                  <button
                    type="button"
                    onClick={addDrinkEntry}
                    style={{
                      background: 'linear-gradient(135deg, #9333EA, #F0E)',
                      color: 'white',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Plus size={14} />
                    追加
                  </button>
                </div>

                {newReceipt.drinks.length === 0 ? (
                  <div style={{
                    padding: '20px',
                    backgroundColor: '#fafafa',
                    borderRadius: '8px',
                    textAlign: 'center',
                    color: '#999',
                    fontSize: '14px'
                  }}>
                    「追加」ボタンでドリンクを記録できます
                    {storeEmployees.length === 0 && (
                      <div style={{ marginTop: '8px', color: '#e74c3c', fontSize: '13px' }}>
                        ⚠️ 従業員データを読み込み中...
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {newReceipt.drinks.map((drink) => (
                      <div key={drink.id} style={{
                        display: 'flex',
                        gap: '10px',
                        alignItems: 'center',
                        padding: '12px',
                        backgroundColor: '#fafafa',
                        borderRadius: '8px',
                        border: '1px solid #e1e8ed'
                      }}>
                        {storeEmployees.length > 0 ? (
                          <select
                            value={drink.employeeId}
                            onChange={(e) => updateDrinkEntry(drink.id, 'employeeId', e.target.value)}
                            style={{
                              flex: 1,
                              padding: '8px 12px',
                              border: '1px solid #e1e8ed',
                              borderRadius: '6px',
                              fontSize: '14px',
                              color: '#000',
                              backgroundColor: 'white',
                              outline: 'none'
                            }}
                          >
                            {storeEmployees.map((emp) => (
                              <option key={emp.id} value={emp.id}>
                                {emp.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div style={{
                            flex: 1,
                            padding: '8px 12px',
                            border: '1px solid #e1e8ed',
                            borderRadius: '6px',
                            fontSize: '14px',
                            color: '#999',
                            backgroundColor: '#f5f5f5'
                          }}>
                            従業員を読み込み中...
                          </div>
                        )}
                        
                        <input
                          type="number"
                          value={drink.drinkCount || ''}
                          onChange={(e) => updateDrinkEntry(drink.id, 'drinkCount', e.target.value)}
                          placeholder="杯数"
                          style={{
                            width: '80px',
                            padding: '8px 12px',
                            border: '1px solid #e1e8ed',
                            borderRadius: '6px',
                            fontSize: '14px',
                            color: '#000',
                            backgroundColor: 'white',
                            outline: 'none',
                            textAlign: 'center'
                          }}
                        />
                        <span style={{ fontSize: '14px', color: '#666', minWidth: '20px' }}>杯</span>
                        
                        <button
                          type="button"
                          onClick={() => removeDrinkEntry(drink.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#e74c3c',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 🆕 シャンパンセクション */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px'
                }}>
                  <label style={{ 
                    fontWeight: '500',
                    color: '#000',
                    fontSize: '14px'
                  }}>
                    シャンパン
                  </label>
                  <button
                    type="button"
                    onClick={addChampagneEntry}
                    style={{
                      background: 'white',
                      color: '#9333EA',
                      border: '1px solid #9333EA',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Wine size={14} />
                    追加
                  </button>
                </div>

                {newReceipt.champagnes.length === 0 ? (
                  <div style={{
                    padding: '20px',
                    backgroundColor: '#fafafa',
                    borderRadius: '8px',
                    textAlign: 'center',
                    color: '#999',
                    fontSize: '14px'
                  }}>
                    シャンパンがある場合は「追加」ボタンで記録できます
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {newReceipt.champagnes.map((champagne) => (
                      <div key={champagne.id} style={{
                        display: 'flex',
                        gap: '10px',
                        alignItems: 'center',
                        padding: '12px',
                        backgroundColor: '#fffaf0',
                        borderRadius: '8px',
                        border: '1px solid #ffd700'
                      }}>
                        <input
                          type="text"
                          value={champagne.name}
                          onChange={(e) => updateChampagneEntry(champagne.id, 'name', e.target.value)}
                          placeholder="シャンパン名"
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            border: '1px solid #e1e8ed',
                            borderRadius: '6px',
                            fontSize: '14px',
                            color: '#000',
                            backgroundColor: 'white',
                            outline: 'none'
                          }}
                        />
                        
                        <input
                          type="number"
                          value={champagne.amount || ''}
                          onChange={(e) => updateChampagneEntry(champagne.id, 'amount', e.target.value)}
                          placeholder="金額"
                          style={{
                            width: '120px',
                            padding: '8px 12px',
                            border: '1px solid #e1e8ed',
                            borderRadius: '6px',
                            fontSize: '14px',
                            color: '#000',
                            backgroundColor: 'white',
                            outline: 'none',
                            textAlign: 'right'
                          }}
                        />
                        <span style={{ fontSize: '14px', color: '#666', minWidth: '20px' }}>円</span>
                        
                        <button
                          type="button"
                          onClick={() => removeChampagneEntry(champagne.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#e74c3c',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 🆕 キャッチセクション */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px'
                }}>
                  <label style={{ 
                    fontWeight: '500',
                    color: '#000',
                    fontSize: '14px'
                  }}>
                    キャッチ記録
                  </label>
                  <button
                    type="button"
                    onClick={addCatchEntry}
                    style={{
                      background: 'white',
                      color: '#10b981',
                      border: '1px solid #10b981',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Users size={14} />
                    追加
                  </button>
                </div>

                {newReceipt.catches.length === 0 ? (
                  <div style={{
                    padding: '20px',
                    backgroundColor: '#fafafa',
                    borderRadius: '8px',
                    textAlign: 'center',
                    color: '#999',
                    fontSize: '14px'
                  }}>
                    キャッチがある場合は「追加」ボタンで記録できます
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {newReceipt.catches.map((catchItem) => (
                      <div key={catchItem.id} style={{
                        display: 'flex',
                        gap: '10px',
                        alignItems: 'center',
                        padding: '12px',
                        backgroundColor: '#f0fdf4',
                        borderRadius: '8px',
                        border: '1px solid #bbf7d0'
                      }}>
                        {storeEmployees.length > 0 ? (
                          <select
                            value={catchItem.employeeId}
                            onChange={(e) => updateCatchEntry(catchItem.id, 'employeeId', e.target.value)}
                            style={{
                              flex: 1,
                              padding: '8px 12px',
                              border: '1px solid #e1e8ed',
                              borderRadius: '6px',
                              fontSize: '14px',
                              color: '#000',
                              backgroundColor: 'white',
                              outline: 'none'
                            }}
                          >
                            {storeEmployees.map((emp) => (
                              <option key={emp.id} value={emp.id}>
                                {emp.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div style={{
                            flex: 1,
                            padding: '8px 12px',
                            border: '1px solid #e1e8ed',
                            borderRadius: '6px',
                            fontSize: '14px',
                            color: '#999',
                            backgroundColor: '#f5f5f5'
                          }}>
                            従業員を読み込み中...
                          </div>
                        )}
                        
                        <input
                          type="number"
                          value={catchItem.catchCount || ''}
                          onChange={(e) => updateCatchEntry(catchItem.id, 'catchCount', e.target.value)}
                          placeholder="回数"
                          style={{
                            width: '80px',
                            padding: '8px 12px',
                            border: '1px solid #e1e8ed',
                            borderRadius: '6px',
                            fontSize: '14px',
                            color: '#000',
                            backgroundColor: 'white',
                            outline: 'none',
                            textAlign: 'center'
                          }}
                        />
                        <span style={{ fontSize: '14px', color: '#666', minWidth: '20px' }}>回</span>
                        
                        <button
                          type="button"
                          onClick={() => removeCatchEntry(catchItem.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#e74c3c',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* カード決済チェックボックス */}
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