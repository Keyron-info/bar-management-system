import React, { useState, useEffect } from 'react';
import { Calendar, User, Plus, X } from 'lucide-react';
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
  customerName: string;
  totalAmount: number;
  drinks: DrinkItem[];
}

interface DrinkItem {
  employeeName: string;
  drinkCount: number;
  amount: number;
}

interface PersonalResult {
  employeeName: string;
  totalDrinks: number;
  totalSales: number;
}

interface ExpenseItem {
  type: string;
  amount: number;
  description: string;
}

const DailyReportPage: React.FC<DailyReportPageProps> = ({ user }) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedEmployee, setSelectedEmployee] = useState<string>(user.name);
  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);
  const [alcoholExpense, setAlcoholExpense] = useState<number>(0);
  const [otherExpenses, setOtherExpenses] = useState<ExpenseItem[]>([]);
  const [showReceiptForm, setShowReceiptForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);

  // New receipt form state
  const [newReceipt, setNewReceipt] = useState({
    customerName: '',
    totalAmount: 0,
    drinks: [{ employeeName: user.name, drinkCount: 0, amount: 0 }]
  });

  // New expense form state
  const [newExpense, setNewExpense] = useState({
    type: '',
    amount: 0,
    description: ''
  });

  // Calculate totals
  const totalSales = receipts.reduce((sum, receipt) => sum + receipt.totalAmount, 0);
  const cardSales = receipts.reduce((sum, receipt) => 
    sum + receipt.drinks.reduce((drinkSum, drink) => drinkSum + drink.amount, 0), 0
  );
  
  const personalResults: PersonalResult[] = receipts.reduce((results: PersonalResult[], receipt) => {
    receipt.drinks.forEach(drink => {
      const existing = results.find(r => r.employeeName === drink.employeeName);
      if (existing) {
        existing.totalDrinks += drink.drinkCount;
        existing.totalSales += drink.amount;
      } else {
        results.push({
          employeeName: drink.employeeName,
          totalDrinks: drink.drinkCount,
          totalSales: drink.amount
        });
      }
    });
    return results;
  }, []);

  const totalOtherExpenses = otherExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const remainingAmount = totalSales - alcoholExpense - totalOtherExpenses;

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

  const submitReceipt = () => {
    const receipt: ReceiptItem = {
      id: Date.now().toString(),
      ...newReceipt
    };
    setReceipts(prev => [...prev, receipt]);
    setNewReceipt({
      customerName: '',
      totalAmount: 0,
      drinks: [{ employeeName: user.name, drinkCount: 0, amount: 0 }]
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

  const submitDailyReport = () => {
    const reportData = {
      date: selectedDate,
      employee: selectedEmployee,
      totalSales,
      cardSales,
      alcoholExpense,
      otherExpenses,
      personalResults,
      remainingAmount
    };
    
    console.log('日報データ:', reportData);
    alert('日報を提出しました！');
  };

  return (
    <div className="daily-report-page">
      {/* Header */}
      <div className="report-header">
        <div className="header-user">
          <span className="user-display-name">
            {user.name}さん（{user.role === 'manager' ? '店長' : '店員'}）
          </span>
        </div>
        <div className="header-actions">
          <div className="bell-icon" />
          <div className="profile-circle" />
          <div className="logout-icon" />
        </div>
      </div>

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
            <div className="summary-title">酒代</div>
            <input
              type="number"
              value={alcoholExpense}
              onChange={(e) => setAlcoholExpense(Number(e.target.value))}
              className="expense-input"
              placeholder="0"
            />
          </div>
          
          <div className="summary-card small">
            <div className="summary-title">その他経費</div>
            <div className="summary-value small">{totalOtherExpenses.toLocaleString()}円</div>
            <button 
              onClick={() => setShowExpenseForm(true)}
              className="add-expense-btn"
            >
              +
            </button>
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
          <div className="result-title">計算結果</div>
          <div className="result-value">残り: {remainingAmount.toLocaleString()}円</div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="submit-section">
        <button onClick={submitDailyReport} className="submit-btn">
          <span>日報提出</span>
        </button>
      </div>

      {/* Personal Results */}
      <div className="action-section">
        <div className="personal-results">
          <div className="result-title">個人結果</div>
          {personalResults.map((result, index) => (
            <div key={index} className="personal-item">
              <span className="person-name">{result.employeeName}</span>
              <span className="person-drinks">{result.totalDrinks}杯</span>
              <span className="person-sales">{result.totalSales.toLocaleString()}円</span>
            </div>
          ))}
        </div>
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

            <div className="modal-actions">
              <button onClick={submitReceipt} className="submit-receipt-btn">
                伝票追加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expense Form Modal */}
      {showExpenseForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>経費追加</h3>
              <button onClick={() => setShowExpenseForm(false)} className="close-btn">
                <X size={20} />
              </button>
            </div>
            
            <div className="form-group">
              <label>経費種類</label>
              <input
                type="text"
                value={newExpense.type}
                onChange={(e) => setNewExpense(prev => ({
                  ...prev,
                  type: e.target.value
                }))}
                className="form-input"
                placeholder="例: 食材費、光熱費など"
              />
            </div>

            <div className="form-group">
              <label>金額</label>
              <input
                type="number"
                value={newExpense.amount}
                onChange={(e) => setNewExpense(prev => ({
                  ...prev,
                  amount: Number(e.target.value)
                }))}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>詳細（任意）</label>
              <input
                type="text"
                value={newExpense.description}
                onChange={(e) => setNewExpense(prev => ({
                  ...prev,
                  description: e.target.value
                }))}
                className="form-input"
                placeholder="詳細説明"
              />
            </div>

            <div className="modal-actions">
              <button onClick={addExpense} className="submit-receipt-btn">
                経費追加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyReportPage;