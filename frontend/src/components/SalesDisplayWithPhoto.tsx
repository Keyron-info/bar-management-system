import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface SalesData {
  id: number;
  date: string;
  employee_name: string;
  total_sales: number;
  drink_count: number;
  champagne_count: number;
  catch_count: number;
  work_hours: number;
  photo_filename?: string;
  photo_path?: string;
  notes?: string;
  created_at: string;
}

interface SalesDisplayWithPhotoProps {
  refreshTrigger: number;
}

const SalesDisplayWithPhoto: React.FC<SalesDisplayWithPhotoProps> = ({ refreshTrigger }) => {
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const fetchSalesData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('認証が必要です');
      }

      const response = await axios.get(
        'https://bar-management-system.onrender.com/api/sales',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      setSalesData(response.data);
      setError('');
    } catch (error: any) {
      console.error('Fetch error:', error);
      if (error.response?.status === 401) {
        setError('認証エラー：再ログインしてください');
      } else {
        setError('データの取得に失敗しました');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesData();
  }, [refreshTrigger]);

  const toggleExpanded = (id: number) => {
    const newExpandedItems = new Set(expandedItems);
    if (newExpandedItems.has(id)) {
      newExpandedItems.delete(id);
    } else {
      newExpandedItems.add(id);
    }
    setExpandedItems(newExpandedItems);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('ja-JP') + '円';
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '18px', color: '#666' }}>データを読み込んでいます...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        backgroundColor: '#fdf0f0', 
        border: '1px solid #f5c6cb', 
        borderRadius: '4px',
        padding: '15px',
        color: '#721c24',
        textAlign: 'center'
      }}>
        {error}
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      <h2 style={{ 
        padding: '20px 20px 0 20px', 
        margin: '0 0 20px 0', 
        color: '#333',
        borderBottom: '1px solid #eee',
        paddingBottom: '15px'
      }}>
        売上データ一覧 ({salesData.length}件)
      </h2>
      
      {salesData.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
          売上データがありません
        </div>
      ) : (
        <div style={{ padding: '0 20px 20px 20px' }}>
          {salesData.map((sale) => (
            <div
              key={sale.id}
              style={{
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                marginBottom: '15px',
                overflow: 'hidden',
                backgroundColor: '#fafafa'
              }}
            >
              {/* ヘッダー部分 */}
              <div
                style={{
                  padding: '15px',
                  backgroundColor: '#f8f9fa',
                  borderBottom: '1px solid #e0e0e0',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
                onClick={() => toggleExpanded(sale.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <span style={{ fontWeight: 'bold', color: '#333' }}>
                    {formatDate(sale.date)}
                  </span>
                  <span style={{ color: '#666' }}>
                    {sale.employee_name}
                  </span>
                  <span style={{ fontWeight: 'bold', color: '#007bff' }}>
                    {formatCurrency(sale.total_sales)}
                  </span>
                  {sale.photo_filename && (
                    <span style={{ 
                      backgroundColor: '#28a745', 
                      color: 'white', 
                      padding: '2px 8px', 
                      borderRadius: '12px', 
                      fontSize: '12px' 
                    }}>
                      写真あり
                    </span>
                  )}
                </div>
                <span style={{ 
                  fontSize: '18px', 
                  color: '#666',
                  transform: expandedItems.has(sale.id) ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s'
                }}>
                  ▼
                </span>
              </div>

              {/* 詳細部分（展開時のみ表示） */}
              {expandedItems.has(sale.id) && (
                <div style={{ padding: '20px' }}>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
                    gap: '15px',
                    marginBottom: '15px'
                  }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>ドリンク杯数</div>
                      <div style={{ fontWeight: 'bold' }}>{sale.drink_count}杯</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>シャンパン杯数</div>
                      <div style={{ fontWeight: 'bold' }}>{sale.champagne_count}杯</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>キャッチ数</div>
                      <div style={{ fontWeight: 'bold' }}>{sale.catch_count}人</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>稼働時間</div>
                      <div style={{ fontWeight: 'bold' }}>{sale.work_hours}時間</div>
                    </div>
                  </div>

                  {/* 写真表示 */}
                  {sale.photo_filename && (
                    <div style={{ marginBottom: '15px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
                        日報写真:
                      </div>
                      <img
                        src={`https://bar-management-system.onrender.com/api/photo/${sale.photo_filename}`}
                        alt="日報写真"
                        style={{
                          maxWidth: '100%',
                          maxHeight: '300px',
                          borderRadius: '4px',
                          border: '1px solid #ddd',
                          objectFit: 'contain'
                        }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const errorMsg = document.createElement('div');
                          errorMsg.textContent = '画像の読み込みに失敗しました';
                          errorMsg.style.color = '#666';
                          errorMsg.style.fontStyle = 'italic';
                          target.parentNode?.appendChild(errorMsg);
                        }}
                      />
                    </div>
                  )}

                  {/* メモ表示 */}
                  {sale.notes && (
                    <div style={{ marginBottom: '15px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
                        メモ・備考:
                      </div>
                      <div style={{
                        backgroundColor: '#f8f9fa',
                        padding: '10px',
                        borderRadius: '4px',
                        border: '1px solid #e0e0e0',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {sale.notes}
                      </div>
                    </div>
                  )}

                  {/* 登録日時 */}
                  <div style={{ fontSize: '12px', color: '#999', textAlign: 'right' }}>
                    登録日時: {new Date(sale.created_at).toLocaleString('ja-JP')}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SalesDisplayWithPhoto;