import React, { useState } from 'react';
import { Calendar, Plus, Settings, X } from 'lucide-react';
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

  const addChampagneToReceipt = () => {
    setNewReceipt(prev => ({
      ...prev,
      champagnes: [...prev.champagnes, { name: '', amount: 0 }]
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

  const submitDailyReport = () => {
    const reportData = {
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
    <div className="daily-report-container">
      {/* 日付選択セクション */}
      <div className="date-selection-section">
        <div className="date-selector">
          <Calendar size={20} color="#9333EA" />
          <input 
            type="date" 
            defaultValue={new Date().toISOString().split('T')[0]}
            className="date-input"
          />
        </div>
        <div className="employee-selector">
          <input 
            type="text" 
            value={user.name}
            readOnly
            className="employee-input"
          />
        </div>
      </div>

      {/* 売上表示セクション */}
      <div className="sales-display-section">
        <div className="total-sales-card">
          <div className="sales-label">総売上</div>
          <div className="sales-amount">{totalSales.toLocaleString()}円</div>
        </div>
        
        <div className="sales-details-column">
          <div className="sales-detail-card">
            <div className="detail-label">酒代</div>
            <input
              type="number"
              value={alcoholExpense}
              onChange={(e) => setAlcoholExpense(Number(e.target.value))}
              className="expense-input"
              placeholder="0"
            />
          </div>
          
          <div className="sales-detail-card">
            <div className="detail-label">その他経費</div>
            <input
              type="number"
              value={otherExpenses}
              onChange={(e) => setOtherExpenses(Number(e.target.value))}
              className="expense-input"
              placeholder="0"
            />
          </div>
          
          <div className="sales-detail-card">
            <div className="detail-label">カード売上</div>
            <div className="detail-amount">{cardSales.toLocaleString()}円</div>
          </div>
        </div>
      </div>

      {/* 伝票追加ボタン */}
      <div className="action-button-section">
        <button 
          className="receipt-add-button"
          onClick={() => setShowReceiptForm(true)}
        >
          <span>伝票追加</span>
          <Plus size={17} />
        </button>
      </div>

      {/* 計算結果 */}
      <div className="calculation-result-section">
        <div className="result-card">
          <div className="result-header">
            <span>計算結果</span>
            <button 
              className="settings-icon-button"
              onClick={() => setShowCashSettings(true)}
            >
              <Settings size={16} />
            </button>
          </div>
          <div className="result-content">
            <div className="result-item">
              <span>現金残金: {cashRemaining.toLocaleString()}円</span>
            </div>
            <div className="result-item">
              <span>純利益: {netProfit.toLocaleString()}円</span>
            </div>
          </div>
        </div>
      </div>

      {/* 日報提出ボタン */}
      <div className="submit-section">
        <button className="submit-button" onClick={submitDailyReport}>
          <span>日報提出</span>
        </button>
      </div>

      {/* 伝票追加モーダル */}
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

            <div className="form-section">
              <label>ドリンク詳細</label>
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
                </div>
              ))}
              <button onClick={addDrinkToReceipt} className="add-button">
                <Plus size={16} /> ドリンク追加
              </button>
            </div>

            <div className="form-section">
              <label>シャンパン詳細</label>
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
                </div>
              ))}
              <button onClick={addChampagneToReceipt} className="add-button">
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

      {/* レジ設定モーダル */}
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