import React, { useState } from 'react';
import { Calendar, Plus, Settings, X, Receipt, Calculator, DollarSign } from 'lucide-react';
import './DailyReportPage.css';

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

interface SummaryItem {
  icon: React.ComponentType<any>;
  label: string;
  value: string | number;
  color?: string;
  isInput?: boolean;
  placeholder?: string;
  onChange?: (value: number) => void;
  hasSettings?: boolean;
  onSettings?: () => void;
}

interface SummaryGroup {
  title: string;
  items: SummaryItem[];
}

const DailyReportPage: React.FC<DailyReportPageProps> = ({ user }) => {
  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);
  const [alcoholExpense, setAlcoholExpense] = useState<number>(0);
  const [otherExpenses, setOtherExpenses] = useState<number>(0);
  const [showReceiptForm, setShowReceiptForm] = useState(false);
  const [showCashSettings, setShowCashSettings] = useState(false);
  const [cashSettings, setCashSettings] = useState<CashSettings>({ startingCash: 50000 });
  
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

  const submitDailyReport = () => {
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
  };

  const summaryGroups: SummaryGroup[] = [
    {
      title: '売上管理',
      items: [
        {
          icon: DollarSign,
          label: '総売上',
          value: `${totalSales.toLocaleString()}円`,
          color: '#9333EA'
        },
        {
          icon: DollarSign,
          label: 'カード売上',
          value: `${cardSales.toLocaleString()}円`,
          color: '#3498db'
        },
        {
          icon: DollarSign,
          label: '現金売上',
          value: `${cashSales.toLocaleString()}円`,
          color: '#27ae60'
        }
      ]
    },
    {
      title: '経費管理',
      items: [
        {
          icon: Receipt,
          label: '酒代',
          value: alcoholExpense,
          isInput: true,
          placeholder: '酒代を入力',
          onChange: (value: number) => setAlcoholExpense(value)
        },
        {
          icon: Receipt,
          label: 'その他経費',
          value: otherExpenses,
          isInput: true,
          placeholder: 'その他経費を入力',
          onChange: (value: number) => setOtherExpenses(value)
        }
      ]
    },
    {
      title: '計算結果',
      items: [
        {
          icon: Calculator,
          label: '現金残金',
          value: `${cashRemaining.toLocaleString()}円`,
          color: cashRemaining >= 0 ? '#27ae60' : '#e74c3c',
          hasSettings: true,
          onSettings: () => setShowCashSettings(true)
        },
        {
          icon: Calculator,
          label: '純利益',
          value: `${netProfit.toLocaleString()}円`,
          color: netProfit >= 0 ? '#27ae60' : '#e74c3c'
        }
      ]
    }
  ];

  return (
    <div className="daily-report-page">
      {/* Date Selection Section */}
      <div className="date-section">
        <div className="date-card">
          <div className="date-icon">
            <Calendar size={20} color="#9333EA" />
          </div>
          <div className="date-content">
            <div className="date-label">作業日</div>
            <input 
              type="date" 
              defaultValue={new Date().toISOString().split('T')[0]}
              className="date-input"
            />
          </div>
        </div>
        
        <div className="submitter-card">
          <div className="submitter-icon">
            <User size={20} color="#9333EA" />
          </div>
          <div className="submitter-content">
            <div className="submitter-label">提出者</div>
            <input 
              type="text" 
              defaultValue={user.name}
              className="submitter-input"
              placeholder="提出者名を入力"
            />
          </div>
        </div>
      </div>

      {/* Summary Groups */}
      <div className="summary-groups">
        {summaryGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="summary-group">
            <h3 className="group-title">{group.title}</h3>
            <div className="summary-items">
              {group.items.map((item, itemIndex) => {
                const IconComponent = item.icon;
                return (
                  <div key={itemIndex} className="summary-item">
                    <div className="item-left">
                      <div className="item-icon">
                        <IconComponent size={20} color={item.color || '#9333EA'} />
                      </div>
                      <div className="item-content">
                        <div className="item-label">{item.label}</div>
                        {item.isInput ? (
                          <input
                            type="number"
                            value={item.value === 0 ? '' : item.value as number}
                            onChange={(e) => item.onChange && item.onChange(Number(e.target.value) || 0)}
                            className="item-input"
                            placeholder={item.placeholder || "0"}
                          />
                        ) : (
                          <div className="item-value" style={{ color: item.color || '#2c3e50' }}>
                            {item.value}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="item-right">
                      {item.hasSettings && (
                        <button className="settings-btn" onClick={item.onSettings}>
                          <Settings size={16} color="#9333EA" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Receipt Management */}
      <div className="receipt-section">
        <div className="receipt-header">
          <h3 className="section-title">伝票管理</h3>
          <span className="receipt-count">{receipts.length}件の伝票</span>
        </div>
        
        <button 
          className="add-receipt-btn"
          onClick={() => setShowReceiptForm(true)}
        >
          <Plus size={20} />
          <span>新しい伝票を追加</span>
        </button>

        {receipts.length > 0 && (
          <div className="receipts-list">
            {receipts.map((receipt) => (
              <div key={receipt.id} className="receipt-item">
                <div className="receipt-info">
                  <div className="receipt-amount">{receipt.totalAmount.toLocaleString()}円</div>
                  <div className="receipt-type">
                    {receipt.isCardPayment ? 'カード' : '現金'}
                  </div>
                </div>
                <div className="receipt-details">
                  ドリンク{receipt.drinks.length}品 | シャンパン{receipt.champagnes.length}品
                </div>
                <button 
                  className="delete-receipt-btn"
                  onClick={() => deleteReceipt(receipt.id)}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit Section */}
      <div className="submit-section">
        <button className="submit-button" onClick={submitDailyReport}>
          <Receipt size={20} />
          <span>日報を提出</span>
        </button>
      </div>

      {/* Receipt Form Modal */}
      {showReceiptForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>新しい伝票</h3>
              <button onClick={() => setShowReceiptForm(false)} className="close-btn">
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>合計金額</label>
                <input
                  type="number"
                  value={newReceipt.totalAmount}
                  onChange={(e) => setNewReceipt(prev => ({
                    ...prev,
                    totalAmount: Number(e.target.value)
                  }))}
                  className="form-input"
                  placeholder="金額を入力"
                />
              </div>

              <div className="form-group">
                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    checked={newReceipt.isCardPayment}
                    onChange={(e) => setNewReceipt(prev => ({
                      ...prev,
                      isCardPayment: e.target.checked
                    }))}
                  />
                  <span className="checkbox-label">カード会計</span>
                </label>
              </div>

              <div className="form-section">
                <div className="section-header">
                  <label>ドリンク詳細</label>
                  <button 
                    type="button"
                    onClick={addDrinkToReceipt} 
                    className="add-btn"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                
                {newReceipt.drinks.map((drink, index) => (
                  <div key={index} className="input-row">
                    <input
                      type="text"
                      placeholder="従業員名"
                      value={drink.employeeName}
                      onChange={(e) => updateDrink(index, 'employeeName', e.target.value)}
                      className="form-input-small"
                    />
                    <input
                      type="number"
                      placeholder="杯数"
                      value={drink.drinkCount}
                      onChange={(e) => updateDrink(index, 'drinkCount', Number(e.target.value))}
                      className="form-input-small"
                    />
                    <input
                      type="number"
                      placeholder="金額"
                      value={drink.amount}
                      onChange={(e) => updateDrink(index, 'amount', Number(e.target.value))}
                      className="form-input-small"
                    />
                    {newReceipt.drinks.length > 1 && (
                      <button 
                        type="button"
                        onClick={() => removeDrinkFromReceipt(index)}
                        className="remove-btn"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="form-section">
                <div className="section-header">
                  <label>シャンパン詳細</label>
                  <button 
                    type="button"
                    onClick={addChampagneToReceipt} 
                    className="add-btn"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                
                {newReceipt.champagnes.map((champagne, index) => (
                  <div key={index} className="input-row">
                    <input
                      type="text"
                      placeholder="シャンパン名"
                      value={champagne.name}
                      onChange={(e) => updateChampagne(index, 'name', e.target.value)}
                      className="form-input-small"
                    />
                    <input
                      type="number"
                      placeholder="金額"
                      value={champagne.amount}
                      onChange={(e) => updateChampagne(index, 'amount', Number(e.target.value))}
                      className="form-input-small"
                    />
                    <button 
                      type="button"
                      onClick={() => removeChampagneFromReceipt(index)}
                      className="remove-btn"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <button onClick={submitReceipt} className="submit-receipt-btn">
                伝票を追加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cash Settings Modal */}
      {showCashSettings && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>レジ設定</h3>
              <button onClick={() => setShowCashSettings(false)} className="close-btn">
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>開始時レジ金</label>
                <input
                  type="number"
                  value={cashSettings.startingCash}
                  onChange={(e) => setCashSettings({
                    startingCash: Number(e.target.value)
                  })}
                  className="form-input"
                  placeholder="金額を入力"
                />
              </div>
              
              <div className="info-card">
                <div className="info-title">計算式</div>
                <div className="info-content">
                  現金残金 = 開始レジ金 + 現金売上 - 経費
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button onClick={() => setShowCashSettings(false)} className="save-btn">
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