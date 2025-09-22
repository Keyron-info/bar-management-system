import React, { useState, useEffect } from 'react';
import { Calendar, User, Plus, X, Settings } from 'lucide-react';
import './DailyReportPage.css';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

interface DailyReportPageProps {
  user: User;
  onPageChange?: (page: string) => void;
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

interface ExpenseItem {
  type: string;
  amount: number;
  description: string;
}

interface CashSettings {
  startingCash: number;
}

const DailyReportPage: React.FC<DailyReportPageProps> = ({ user, onPageChange }) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedEmployee, setSelectedEmployee] = useState<string>(user.name);
  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);
  const [alcoholExpense, setAlcoholExpense] = useState<number>(0);
  const [otherExpenses, setOtherExpenses] = useState<ExpenseItem[]>([]);
  const [showReceiptForm, setShowReceiptForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showCashSettings, setShowCashSettings] = useState(false);
  const [cashSettings, setCashSettings] = useState<CashSettings>({ startingCash: 50000 });

  // New receipt form state
  const [newReceipt, setNewReceipt] = useState<{
    totalAmount: number;
    isCardPayment: boolean;
    drinks: DrinkItem[];
    champagnes: ChampagneItem[];
  }>({
    totalAmount: 0,
    isCardPayment: false,
    drinks: [{ employeeName: user.name, drinkCount: 0, amount: 0 }],
    champagnes: []
  });

  // New expense form state
  const [newExpense, setNewExpense] = useState({
    type: '',
    amount: 0,
    description: ''
  });

  // Calculate totals
  const totalSales = receipts.reduce((sum, receipt) => sum + receipt.totalAmount, 0);
  const cardSales = receipts
    .filter(receipt => receipt.isCardPayment)
    .reduce((sum, receipt) => sum + receipt.totalAmount, 0);
  const cashSales = totalSales - cardSales;
  
  const totalOtherExpenses = otherExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const totalExpenses = alcoholExpense + totalOtherExpenses;
  
  // 現金残金 = スタート現金 + 現金売上 - 経費
  const cashRemaining = cashSettings.startingCash + cashSales - totalExpenses;
  
  // 純利益 = 総売上 - 経費
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

  const updateDrink = (index: number, field: keyof DrinkItem, value: string | number) => {
    setNewReceipt(prev => ({
      ...prev,
      drinks: prev.drinks.map((drink, i) => 
        i === index ? { ...drink, [field]: value } : drink
      )
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

  const addExpense = () => {
    if (newExpense.type && newExpense.amount > 0) {
      setOtherExpenses(prev => [...prev, { ...newExpense }]);
      setNewExpense({ type: '', amount: 0, description: '' });
      setShowExpenseForm(false);
    }
  };

  const updateCashSettings = () => {
    setShowCashSettings(false);
  };

  const submitDailyReport = () => {
    const reportData = {
      date: selectedDate,
      employee: selectedEmployee,
      totalSales,
      cardSales,
      cashSales,
      alcoholExpense,
      otherExpenses,
      cashRemaining,
      netProfit
    };
    
    console.log('日報データ:', reportData);
    alert('日報を提出しました！');
  };

  return (
    <div className="daily-report-page">
      {/* Date and Employee Selection */}
      <div className="selection-section">
        <div className="selection-item">
          <Calendar size={20} className="selection-icon" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="date-input"
          />
        </div>
        <div className="selection-item">
          <User size={20} className="selection-icon" />
          <input
            type="text"
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="employee-input"
            placeholder="従業員名"
          />
        </div>
      </div>

      {/* Sales Summary */}
      <div className="sales-summary">
        <div className="summary-card large">
          <div className="summary-title">総売上</div>
          <div className="summary-value large">{totalSales.toLocaleString()}円</div>
        </div>
        
        <div className="summary-column">
          <div className="summary-card small">
            <div className="summary-title">カード売上</div>
            <div className="summary-value small">{cardSales.toLocaleString()}円</div>
          </div>
          
          <div className="summary-card small">
            <div className="summary-title">現金売上</div>
            <div className="summary-value small">{cashSales.toLocaleString()}円</div>
          </div>
          
          <div className="summary-card small">
            <div className="summary-title">酒代</div>
            <input
              type="number"
              value={alcoholExpense}
              onChange={(e) => setAlcoholExpense(Number(e.target.value))}
              className="expense-input"
              placeholder="0"
            />
          </div>
        </div>
      </div>

      {/* Receipt Addition */}
      <div className="action-section">
        <div className="action-card" onClick={() => setShowReceiptForm(true)}>
          <span>伝票追加</span>
        </div>
      </div>

      {/* Calculation Result */}
      <div className="action-section">
        <div className="result-card">
          <div className="result-header">
            <div className="result-title">計算結果</div>
            <div className="result-settings-icon" onClick={() => setShowCashSettings(true)}>
              <Settings size={16} color="white" />
            </div>
          </div>
          <div className="result-content">
            <div className="result-item">
              <span className="result-label">現金残金:</span>
              <span className="result-value">{cashRemaining.toLocaleString()}円</span>
            </div>
            <div className="result-item">
              <span className="result-label">純利益:</span>
              <span className="result-value">{netProfit.toLocaleString()}円</span>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="submit-section">
        <button onClick={submitDailyReport} className="submit-btn">
          <span>日報提出</span>
        </button>
      </div>

      {/* Receipt Form Modal */}
      {showReceiptForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>伝票追加</h3>
              <button onClick={() => setShowReceiptForm(false)} className="close-btn">
                <X size={20} />
              </button>
            </div>
            
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

            <div className="drinks-section">
              <label>ドリンク詳細</label>
              {newReceipt.drinks.map((drink, index) => (
                <div key={index} className="drink-item">
                  <input
                    type="text"
                    placeholder="従業員名"
                    value={drink.employeeName}
                    onChange={(e) => updateDrink(index, 'employeeName', e.target.value)}
                    className="form-input small"
                  />
                  <input
                    type="number"
                    placeholder="杯数"
                    value={drink.drinkCount}
                    onChange={(e) => updateDrink(index, 'drinkCount', Number(e.target.value))}
                    className="form-input small"
                  />
                  <input
                    type="number"
                    placeholder="金額"
                    value={drink.amount}
                    onChange={(e) => updateDrink(index, 'amount', Number(e.target.value))}
                    className="form-input small"
                  />
                  {newReceipt.drinks.length > 1 && (
                    <button 
                      onClick={() => removeDrinkFromReceipt(index)}
                      className="remove-btn"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
              
              <button onClick={addDrinkToReceipt} className="add-drink-btn">
                <Plus size={16} /> ドリンク追加
              </button>
            </div>

            <div className="champagne-section">
              <label>シャンパン詳細</label>
              {newReceipt.champagnes.map((champagne, index) => (
                <div key={index} className="champagne-item">
                  <input
                    type="text"
                    placeholder="シャンパン名"
                    value={champagne.name}
                    onChange={(e) => updateChampagne(index, 'name', e.target.value)}
                    className="form-input small"
                  />
                  <input
                    type="number"
                    placeholder="金額"
                    value={champagne.amount}
                    onChange={(e) => updateChampagne(index, 'amount', Number(e.target.value))}
                    className="form-input small"
                  />
                  <button 
                    onClick={() => removeChampagneFromReceipt(index)}
                    className="remove-btn"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              
              <button onClick={addChampagneToReceipt} className="add-champagne-btn">
                <Plus size={16} /> シャンパン追加
              </button>
            </div>

            <div className="modal-actions">
              <button onClick={submitReceipt} className="submit-receipt-btn">
                伝票追加
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
            
            <div className="form-group">
              <label>スタート時のレジ金</label>
              <input
                type="number"
                value={cashSettings.startingCash}
                onChange={(e) => setCashSettings({
                  startingCash: Number(e.target.value)
                })}
                className="form-input"
                placeholder="50000"
              />
            </div>

            <div className="modal-actions">
              <button onClick={updateCashSettings} className="save-btn">
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