import React, { useState, useEffect } from 'react';
import { Calendar, Filter, X, CheckCircle, XCircle, Eye, Search } from 'lucide-react';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  store_id?: number;
}

interface ReportHistoryPageProps {
  user: User;
}

interface DailyReport {
  id: number;
  store_id: number;
  employee_id: number;
  date: string;
  total_sales: number;
  alcohol_cost: number;
  other_expenses: number;
  card_sales: number;
  drink_count: number;
  champagne_type: string;
  champagne_price: number;
  work_start_time: string;
  work_end_time: string;
  is_approved: boolean;
  notes: string;
  created_at: string;
}

interface Employee {
  id: number;
  name: string;
  employee_code: string;
}

const ReportHistoryPage: React.FC<ReportHistoryPageProps> = ({ user }) => {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<DailyReport[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // フィルター状態
  const [filterEmployee, setFilterEmployee] = useState<number | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'approved' | 'pending'>('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchReports();
    if (user.role === 'manager' || user.role === 'owner') {
      fetchEmployees();
    }
  }, []);

  useEffect(() => {
    applyFilters();
  }, [reports, filterEmployee, filterStatus, filterStartDate, filterEndDate, searchQuery]);

  // 日報一覧を取得
  const fetchReports = async () => {
    try {
      const token = localStorage.getItem('token');
      const store_id = user.store_id;
      
      if (!token || !store_id) return;

      // 従業員の場合は自分の日報のみ、店長・オーナーは全員の日報を取得
      const url = user.role === 'manager' || user.role === 'owner'
        ? `${API_BASE_URL}/api/stores/${store_id}/daily-reports`
        : `${API_BASE_URL}/api/stores/${store_id}/daily-reports?employee_id=${user.id}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ 日報データ取得:', data.length, '件');
        setReports(data);
        setFilteredReports(data);
      }
    } catch (error) {
      console.error('❌ 日報取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  // 従業員一覧を取得
  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('token');
      const store_id = user.store_id;
      
      if (!token || !store_id) return;

      const response = await fetch(`${API_BASE_URL}/api/stores/${store_id}/employees`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
      }
    } catch (error) {
      console.error('❌ 従業員取得エラー:', error);
    }
  };

  // フィルター適用
  const applyFilters = () => {
    let filtered = [...reports];

    // 従業員フィルター
    if (filterEmployee !== 'all') {
      filtered = filtered.filter(r => r.employee_id === filterEmployee);
    }

    // ステータスフィルター
    if (filterStatus === 'approved') {
      filtered = filtered.filter(r => r.is_approved);
    } else if (filterStatus === 'pending') {
      filtered = filtered.filter(r => !r.is_approved);
    }

    // 日付フィルター
    if (filterStartDate) {
      filtered = filtered.filter(r => r.date >= filterStartDate);
    }
    if (filterEndDate) {
      filtered = filtered.filter(r => r.date <= filterEndDate);
    }

    // 検索フィルター
    if (searchQuery) {
      filtered = filtered.filter(r =>
        r.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.date.includes(searchQuery)
      );
    }

    setFilteredReports(filtered);
  };

  // 日報承認
  const approveReport = async (reportId: number) => {
    try {
      const token = localStorage.getItem('token');
      const store_id = user.store_id;
      
      const response = await fetch(
        `${API_BASE_URL}/api/stores/${store_id}/daily-reports/${reportId}/approve`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            is_approved: true,
            approved_by_employee_id: user.id
          })
        }
      );

      if (response.ok) {
        alert('日報を承認しました');
        fetchReports();
        setShowDetailModal(false);
      } else {
        alert('承認に失敗しました');
      }
    } catch (error) {
      console.error('承認エラー:', error);
      alert('承認中にエラーが発生しました');
    }
  };

  // 従業員名を取得
  const getEmployeeName = (employeeId: number) => {
    const employee = employees.find(e => e.id === employeeId);
    return employee ? employee.name : `従業員${employeeId}`;
  };

  // フィルターリセット
  const resetFilters = () => {
    setFilterEmployee('all');
    setFilterStatus('all');
    setFilterStartDate('');
    setFilterEndDate('');
    setSearchQuery('');
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '400px',
        color: '#666'
      }}>
        データを読み込んでいます...
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: '"Noto Sans JP", sans-serif'
    }}>
      {/* ページタイトル */}
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{
          fontSize: '28px',
          color: '#000',
          margin: '0 0 10px 0',
          fontWeight: '600'
        }}>
          日報履歴
        </h1>
        <p style={{ color: '#666', margin: 0 }}>
          {filteredReports.length}件の日報
        </p>
      </div>

      {/* フィルターセクション */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        border: '1px solid #e1e8ed'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '15px'
        }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
            <Filter size={18} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
            フィルター
          </h3>
          <button
            onClick={resetFilters}
            style={{
              background: 'none',
              border: '1px solid #e1e8ed',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#666'
            }}
          >
            リセット
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px'
        }}>
          {/* 検索 */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              color: '#666',
              marginBottom: '8px'
            }}>
              検索
            </label>
            <div style={{ position: 'relative' }}>
              <Search
                size={18}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#999'
                }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="日付、メモで検索"
                style={{
                  width: '100%',
                  padding: '10px 10px 10px 40px',
                  border: '1px solid #e1e8ed',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* 従業員フィルター（店長・オーナーのみ） */}
          {(user.role === 'manager' || user.role === 'owner') && (
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                color: '#666',
                marginBottom: '8px'
              }}>
                従業員
              </label>
              <select
                value={filterEmployee}
                onChange={(e) => setFilterEmployee(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #e1e8ed',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              >
                <option value="all">全員</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* ステータスフィルター */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              color: '#666',
              marginBottom: '8px'
            }}>
              承認状態
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #e1e8ed',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none'
              }}
            >
              <option value="all">すべて</option>
              <option value="approved">承認済み</option>
              <option value="pending">未承認</option>
            </select>
          </div>

          {/* 開始日 */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              color: '#666',
              marginBottom: '8px'
            }}>
              開始日
            </label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #e1e8ed',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* 終了日 */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              color: '#666',
              marginBottom: '8px'
            }}>
              終了日
            </label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #e1e8ed',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>
      </div>

      {/* 日報一覧 */}
      <div style={{
        display: 'grid',
        gap: '15px'
      }}>
        {filteredReports.length === 0 ? (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '40px',
            textAlign: 'center',
            color: '#666'
          }}>
            該当する日報がありません
          </div>
        ) : (
          filteredReports.map(report => (
            <div
              key={report.id}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                border: '1px solid #e1e8ed',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease'
              }}
              onClick={() => {
                setSelectedReport(report);
                setShowDetailModal(true);
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.05)';
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '15px'
              }}>
                <div>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#000',
                    marginBottom: '5px'
                  }}>
                    {report.date}
                    {(user.role === 'manager' || user.role === 'owner') && (
                      <span style={{
                        marginLeft: '10px',
                        fontSize: '14px',
                        color: '#666',
                        fontWeight: '400'
                      }}>
                        - {getEmployeeName(report.employee_id)}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    {report.work_start_time} - {report.work_end_time}
                  </div>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  {report.is_approved ? (
                    <span style={{
                      backgroundColor: '#10b981',
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <CheckCircle size={14} />
                      承認済み
                    </span>
                  ) : (
                    <span style={{
                      backgroundColor: '#f59e0b',
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <XCircle size={14} />
                      未承認
                    </span>
                  )}
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: '15px',
                marginBottom: '10px'
              }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>
                    売上
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: '#9333EA' }}>
                    ¥{report.total_sales.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>
                    ドリンク
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: '#06B6D4' }}>
                    {report.drink_count}杯
                  </div>
                </div>
                {report.champagne_price > 0 && (
                  <div>
                    <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>
                      シャンパン
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: '600', color: '#F59E0B' }}>
                      ¥{report.champagne_price.toLocaleString()}
                    </div>
                  </div>
                )}
              </div>

              {report.notes && (
                <div style={{
                  fontSize: '14px',
                  color: '#666',
                  marginTop: '10px',
                  paddingTop: '10px',
                  borderTop: '1px solid #f0f0f0'
                }}>
                  📝 {report.notes}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 詳細モーダル */}
      {showDetailModal && selectedReport && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setShowDetailModal(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div style={{
              padding: '20px',
              borderBottom: '1px solid #e1e8ed',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
                日報詳細
              </h3>
              <button
                onClick={() => setShowDetailModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '6px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* コンテンツ */}
            <div style={{ padding: '20px' }}>
              {/* 基本情報 */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{
                  fontSize: '14px',
                  color: '#999',
                  margin: '0 0 10px 0',
                  fontWeight: '600'
                }}>
                  基本情報
                </h4>
                <div style={{
                  backgroundColor: '#f8f9fa',
                  padding: '15px',
                  borderRadius: '8px'
                }}>
                  <div style={{ marginBottom: '10px' }}>
                    <span style={{ color: '#666', fontSize: '14px' }}>日付: </span>
                    <span style={{ fontWeight: '600' }}>{selectedReport.date}</span>
                  </div>
                  {(user.role === 'manager' || user.role === 'owner') && (
                    <div style={{ marginBottom: '10px' }}>
                      <span style={{ color: '#666', fontSize: '14px' }}>従業員: </span>
                      <span style={{ fontWeight: '600' }}>
                        {getEmployeeName(selectedReport.employee_id)}
                      </span>
                    </div>
                  )}
                  <div style={{ marginBottom: '10px' }}>
                    <span style={{ color: '#666', fontSize: '14px' }}>勤務時間: </span>
                    <span style={{ fontWeight: '600' }}>
                      {selectedReport.work_start_time} - {selectedReport.work_end_time}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: '#666', fontSize: '14px' }}>承認状態: </span>
                    {selectedReport.is_approved ? (
                      <span style={{
                        color: '#10b981',
                        fontWeight: '600',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <CheckCircle size={16} />
                        承認済み
                      </span>
                    ) : (
                      <span style={{
                        color: '#f59e0b',
                        fontWeight: '600',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <XCircle size={16} />
                        未承認
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 売上情報 */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{
                  fontSize: '14px',
                  color: '#999',
                  margin: '0 0 10px 0',
                  fontWeight: '600'
                }}>
                  売上情報
                </h4>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px'
                }}>
                  <div style={{
                    backgroundColor: '#f8f9fa',
                    padding: '15px',
                    borderRadius: '8px'
                  }}>
                    <div style={{ fontSize: '12px', color: '#999', marginBottom: '5px' }}>
                      総売上
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: '600', color: '#9333EA' }}>
                      ¥{selectedReport.total_sales.toLocaleString()}
                    </div>
                  </div>
                  <div style={{
                    backgroundColor: '#f8f9fa',
                    padding: '15px',
                    borderRadius: '8px'
                  }}>
                    <div style={{ fontSize: '12px', color: '#999', marginBottom: '5px' }}>
                      カード売上
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: '600', color: '#000' }}>
                      ¥{selectedReport.card_sales.toLocaleString()}
                    </div>
                  </div>
                  <div style={{
                    backgroundColor: '#f8f9fa',
                    padding: '15px',
                    borderRadius: '8px'
                  }}>
                    <div style={{ fontSize: '12px', color: '#999', marginBottom: '5px' }}>
                      ドリンク数
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: '600', color: '#06B6D4' }}>
                      {selectedReport.drink_count}杯
                    </div>
                  </div>
                  {selectedReport.champagne_price > 0 && (
                    <div style={{
                      backgroundColor: '#f8f9fa',
                      padding: '15px',
                      borderRadius: '8px'
                    }}>
                      <div style={{ fontSize: '12px', color: '#999', marginBottom: '5px' }}>
                        シャンパン
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: '600', color: '#F59E0B' }}>
                        ¥{selectedReport.champagne_price.toLocaleString()}
                      </div>
                      {selectedReport.champagne_type && (
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                          {selectedReport.champagne_type}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 経費情報 */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{
                  fontSize: '14px',
                  color: '#999',
                  margin: '0 0 10px 0',
                  fontWeight: '600'
                }}>
                  経費情報
                </h4>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px'
                }}>
                  <div style={{
                    backgroundColor: '#f8f9fa',
                    padding: '15px',
                    borderRadius: '8px'
                  }}>
                    <div style={{ fontSize: '12px', color: '#999', marginBottom: '5px' }}>
                      酒代
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: '600' }}>
                      ¥{selectedReport.alcohol_cost.toLocaleString()}
                    </div>
                  </div>
                  <div style={{
                    backgroundColor: '#f8f9fa',
                    padding: '15px',
                    borderRadius: '8px'
                  }}>
                    <div style={{ fontSize: '12px', color: '#999', marginBottom: '5px' }}>
                      その他経費
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: '600' }}>
                      ¥{selectedReport.other_expenses.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* メモ */}
              {selectedReport.notes && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{
                    fontSize: '14px',
                    color: '#999',
                    margin: '0 0 10px 0',
                    fontWeight: '600'
                  }}>
                    メモ
                  </h4>
                  <div style={{
                    backgroundColor: '#f8f9fa',
                    padding: '15px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: '#333'
                  }}>
                    {selectedReport.notes}
                  </div>
                </div>
              )}

              {/* 承認ボタン（店長・オーナーのみ） */}
              {(user.role === 'manager' || user.role === 'owner') && !selectedReport.is_approved && (
                <button
                  onClick={() => approveReport(selectedReport.id)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <CheckCircle size={20} />
                  この日報を承認する
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportHistoryPage;