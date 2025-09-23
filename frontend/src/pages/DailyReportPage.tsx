import React, { useState } from 'react';
import { Calendar, Plus, Settings, X, Receipt, Calculator, DollarSign, User, Edit } from 'lucide-react';

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
  totalAmount: number;
  isCardPayment: boolean;
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

interface CashSettings {
  startingCash: number;
}

const DailyReportPage: React.FC<DailyReportPageProps> = ({ user }) => {
  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);
  const [alcoholExpense, setAlcoholExpense] = useState<number>(0);
  const [otherExpenses, setOtherExpenses] = useState<number>(0);
  const [showReceiptForm, setShowReceiptForm] = useState(false);
  const [showCashSettings, setShowCashSettings] = useState(false);
  const [cashSettings, setCashSettings] = useState<CashSettings>({ startingCash: 50000 });
  const [loading, setLoading] = useState(false);
  
  // 新規伝票フォーム状態
  const [newReceipt, setNewReceipt] = useState({
    totalAmount: 0,
    isCardPayment: false,
    drinks: [{ employeeName: user.name, drinkCount: 0, amount: 0 }],
    champagnes: [] as ChampagneItem[]
  });

  // 計算
  const totalSales = receipts.reduce((sum, receipt) => sum + receipt.totalAmount, 0);
  const cardSales = receipts
    .filter(receipt => receipt.isCardPayment)
    .reduce((sum, receipt) => sum + receipt.totalAmount, 0);
  const cashSales = totalSales - cardSales;
  const totalExpenses = alcoholExpense + otherExpenses;
  const cashRemaining = cashSettings.startingCash + cashSales - totalExpenses;
  const netProfit = totalSales - totalExpenses;

  const addDrinkToReceipt = () => {
    setNewReceipt(prev => ({
      ...prev,
      drinks: [...prev.drinks, { employeeName: '', drinkCount: 0, amount: 0 }]
    }));
  };

  const removeDrinkFromReceipt = (index: number) => {
    setNewReceipt(prev => ({
      ...prev,
      drinks: prev.drinks.filter((_, i) => i !== index)
    }));
  };

  const addChampagneToReceipt = () => {
    setNewReceipt(prev => ({
      ...prev,
      champagnes: [...prev.champagnes, { name: '', amount: 0 }]
    }));
  };

  const removeChampagneFromReceipt = (index: number) => {
    setNewReceipt(prev => ({
      ...prev,
      champagnes: prev.champagnes.filter((_, i) => i !== index)
    }));
  };

  const updateDrink = (index: number, field: keyof DrinkItem, value: string | number) => {
    setNewReceipt(prev => ({
      ...prev,
      drinks: prev.drinks.map((drink, i) => 
        i === index ? { ...drink, [field]: value } : drink
      )
    }));
  };

  const updateChampagne = (index: number, field: keyof ChampagneItem, value: string | number) => {
    setNewReceipt(prev => ({
      ...prev,
      champagnes: prev.champagnes.map((champagne, i) => 
        i === index ? { ...champagne, [field]: value } : champagne
      )
    }));
  };

  const submitReceipt = () => {
    const receipt: ReceiptItem = {
      id: Date.now().toString(),
      ...newReceipt
    };
    setReceipts(prev => [...prev, receipt]);
    setNewReceipt({
      totalAmount: 0,
      isCardPayment: false,
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
      const reportData = {
        totalSales,
        cardSales,
        cashSales,
        alcoholExpense,
        otherExpenses,
        cashRemaining,
        netProfit,
        receipts
      };
      console.log('日報データ:', reportData);
      alert('日報を提出しました！');
    } catch (error) {
      alert('提出中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      maxWidth: '600px',
      margin: '0 auto',
      padding: '20px',
      backgroundColor: '#FAFAFA',
      minHeight: '100vh',
      fontFamily: 'Sana, Noto Sans JP, sans-serif'
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

      {/* Date Selection Section - 白背景に統一 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '15px',
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
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>作業日</div>
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
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>提出者</div>
            <input 
              type="text" 
              defaultValue={user.name}
              style={{
                border: 'none',
                fontSize: '16px',
                color: '#000',
                backgroundColor: 'transparent',
                width: '100%',
                outline: 'none'
              }}
              placeholder="提出者名を入力"
            />
          </div>
        </div>
      </div>

      {/* 売上管理 - 白背景に統一 */}
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
          売上管理
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '20px' }}>
          <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#fafafa', borderRadius: '8px' }}>
            <div style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>総売上</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#9333EA' }}>
              ¥{totalSales.toLocaleString()}
            </div>
          </div>
          
          <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#fafafa', borderRadius: '8px' }}>
            <div style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>カード売上</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#000' }}>
              ¥{cardSales.toLocaleString()}
            </div>
          </div>
          
          <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#fafafa', borderRadius: '8px' }}>
            <div style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>現金売上</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#000' }}>
              ¥{cashSales.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* 経費管理 - 白背景に統一 */}
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
          経費管理
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
              value={alcoholExpense === 0 ? '' : alcoholExpense}
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
              value={otherExpenses === 0 ? '' : otherExpenses}
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

      {/* 計算結果 - 白背景に統一 */}
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
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Calculator size={20} color="#9333EA" />
            計算結果
          </h3>
          <button 
            onClick={() => setShowCashSettings(true)}
            style={{
              background: 'white',
              border: '1px solid #e1e8ed',
              borderRadius: '8px',
              padding: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            <Settings size={16} color="#9333EA" />
          </button>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '20px' }}>
          <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#fafafa', borderRadius: '8px' }}>
            <div style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>現金残金</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: cashRemaining >= 0 ? '#27ae60' : '#e74c3c' }}>
              ¥{cashRemaining.toLocaleString()}
            </div>
          </div>
          
          <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#fafafa', borderRadius: '8px' }}>
            <div style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>純利益</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: netProfit >= 0 ? '#27ae60' : '#e74c3c' }}>
              ¥{netProfit.toLocaleString()}
            </div>
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
            padding: '4px 12px',
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
            marginBottom: '20px'
          }}
        >
          <Plus size={20} />
          新しい伝票を追加
        </button>

        {receipts.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {receipts.map((receipt) => (
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
                    ¥{receipt.totalAmount.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {receipt.isCardPayment ? 'カード決済' : '現金決済'} | 
                    ドリンク{receipt.drinks.length}品 | シャンパン{receipt.champagnes.length}品
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
            ))}
          </div>
        )}
      </div>

      {/* 提出ボタン */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button 
          onClick={submitDailyReport}
          disabled={loading}
          style={{
            padding: '15px 40px',
            background: loading ? '#bdc3c7' : 'linear-gradient(135deg, #9333EA, #F0E)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '18px',
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
            maxWidth: '500px',
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
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#000' }}>
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
                  合計金額
                </label>
                <input
                  type="number"
                  value={newReceipt.totalAmount}
                  onChange={(e) => setNewReceipt(prev => ({
                    ...prev,
                    totalAmount: Number(e.target.value)
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
                  placeholder="金額を入力"
                />
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

              <div style={{ marginBottom: '20px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px'
                }}>
                  <label style={{ 
                    fontWeight: '500',
                    color: '#000',
                    fontSize: '14px'
                  }}>
                    ドリンク詳細
                  </label>
                  <button 
                    type="button"
                    onClick={addDrinkToReceipt} 
                    style={{
                      background: '#9333EA',
                      color: 'white',
                      border: 'none',
                      padding: '6px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Plus size={16} />
                  </button>
                </div>
                
                {newReceipt.drinks.map((drink, index) => (
                  <div key={index} style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 2fr auto',
                    gap: '10px',
                    marginBottom: '10px',
                    alignItems: 'center'
                  }}>
                    <input
                      type="text"
                      placeholder="従業員名"
                      value={drink.employeeName}
                      onChange={(e) => updateDrink(index, 'employeeName', e.target.value)}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #e1e8ed',
                        borderRadius: '6px',
                        fontSize: '14px',
                        backgroundColor: 'white',
                        color: '#000'
                      }}
                    />
                    <input
                      type="number"
                      placeholder="杯数"
                      value={drink.drinkCount}
                      onChange={(e) => updateDrink(index, 'drinkCount', Number(e.target.value))}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #e1e8ed',
                        borderRadius: '6px',
                        fontSize: '14px',
                        backgroundColor: 'white',
                        color: '#000'
                      }}
                    />
                    <input
                      type="number"
                      placeholder="金額"
                      value={drink.amount}
                      onChange={(e) => updateDrink(index, 'amount', Number(e.target.value))}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #e1e8ed',
                        borderRadius: '6px',
                        fontSize: '14px',
                        backgroundColor: 'white',
                        color: '#000'
                      }}
                    />
                    {newReceipt.drinks.length > 1 && (
                      <button 
                        type="button"
                        onClick={() => removeDrinkFromReceipt(index)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#e74c3c',
                          cursor: 'pointer',
                          padding: '4px'
                        }}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px'
                }}>
                  <label style={{ 
                    fontWeight: '500',
                    color: '#000',
                    fontSize: '14px'
                  }}>
                    シャンパン詳細
                  </label>
                  <button 
                    type="button"
                    onClick={addChampagneToReceipt} 
                    style={{
                      background: '#9333EA',
                      color: 'white',
                      border: 'none',
                      padding: '6px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Plus size={16} />
                  </button>
                </div>
                
                {newReceipt.champagnes.map((champagne, index) => (
                  <div key={index} style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 2fr auto',
                    gap: '10px',
                    marginBottom: '10px',
                    alignItems: 'center'
                  }}>
                    <input
                      type="text"
                      placeholder="シャンパン名"
                      value={champagne.name}
                      onChange={(e) => updateChampagne(index, 'name', e.target.value)}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #e1e8ed',
                        borderRadius: '6px',
                        fontSize: '14px',
                        backgroundColor: 'white',
                        color: '#000'
                      }}
                    />
                    <input
                      type="number"
                      placeholder="金額"
                      value={champagne.amount}
                      onChange={(e) => updateChampagne(index, 'amount', Number(e.target.value))}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #e1e8ed',
                        borderRadius: '6px',
                        fontSize: '14px',
                        backgroundColor: 'white',
                        color: '#000'
                      }}
                    />
                    <button 
                      type="button"
                      onClick={() => removeChampagneFromReceipt(index)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#e74c3c',
                        cursor: 'pointer',
                        padding: '4px'
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
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
                style={{
                  background: 'linear-gradient(135deg, #9333EA, #F0E)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                伝票を追加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cash Settings Modal */}
      {showCashSettings && (
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
            maxWidth: '400px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px',
              borderBottom: '1px solid #e1e8ed'
            }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#000' }}>
                レジ設定
              </h3>
              <button 
                onClick={() => setShowCashSettings(false)}
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
                  開始時レジ金
                </label>
                <input
                  type="number"
                  value={cashSettings.startingCash}
                  onChange={(e) => setCashSettings({
                    startingCash: Number(e.target.value)
                  })}
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
                  placeholder="金額を入力"
                />
              </div>
              
              <div style={{
                padding: '15px',
                backgroundColor: '#fafafa',
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <div style={{
                  fontSize: '14px',
                  color: '#000',
                  fontWeight: '600',
                  marginBottom: '8px'
                }}>
                  計算式
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#666',
                  lineHeight: '1.5'
                }}>
                  現金残金 = 開始レジ金 + 現金売上 - 経費
                </div>
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
                onClick={() => setShowCashSettings(false)}
                style={{
                  background: 'linear-gradient(135deg, #9333EA, #F0E)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyReportPage;