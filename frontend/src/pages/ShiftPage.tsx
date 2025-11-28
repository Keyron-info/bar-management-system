import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { Calendar, Plus, X, Clock, User, ChevronLeft, ChevronRight, Check, Edit2, Trash2 } from 'lucide-react';
import './ShiftPage.css';

interface UserProp {
  id: number;
  email: string;
  name: string;
  role: string;
  store_id?: number;
}

interface ShiftPageProps {
  user: UserProp;
}

interface Employee {
  id: number;
  name: string;
  employee_code: string;
  role: string;
}

interface Shift {
  id: string;
  employee_id: number;
  employee_name: string;
  date: string;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
}

interface ShiftRequest {
  id: string;
  employee_id: number;
  employee_name: string;
  date: string;
  start_time: string;
  end_time: string;
  request_type: 'available' | 'unavailable' | 'preferred';
  notes?: string;
  created_at: string;
}

const ShiftPage: React.FC<ShiftPageProps> = ({ user }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [shiftRequests, setShiftRequests] = useState<ShiftRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddShiftModal, setShowAddShiftModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // 新しいシフトのフォーム状態
  const [newShift, setNewShift] = useState({
    employee_id: 0,
    date: '',
    start_time: '18:00',
    end_time: '02:00',
    notes: ''
  });

  // シフト希望のフォーム状態
  const [newRequest, setNewRequest] = useState({
    date: '',
    start_time: '18:00',
    end_time: '02:00',
    request_type: 'available' as 'available' | 'unavailable' | 'preferred',
    notes: ''
  });

  useEffect(() => {
    fetchEmployees();
    fetchShifts();
    fetchShiftRequests();
  }, [currentDate]);

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
        if (data.length > 0) {
          setNewShift(prev => ({ ...prev, employee_id: data[0].id }));
        }
      }
    } catch (error) {
      console.error('従業員取得エラー:', error);
    }
  };

  // シフト一覧を取得（バックエンドAPI）
  const fetchShifts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const store_id = user.store_id;
      
      if (!token || !store_id) return;

      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      const response = await fetch(`${API_BASE_URL}/api/stores/${store_id}/shifts?year=${year}&month=${month}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        // バックエンドのレスポンスをフロントエンドの形式に変換
        const formattedShifts: Shift[] = data.map((s: any) => ({
          id: s.id.toString(),
          employee_id: s.employee_id,
          employee_name: s.employee_name || '',
          date: s.shift_date,
          start_time: s.start_time,
          end_time: s.end_time,
          status: s.status,
          notes: s.notes
        }));
        setShifts(formattedShifts);
      }
    } catch (error) {
      console.error('シフト取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  // シフト希望一覧を取得（バックエンドAPI）
  const fetchShiftRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const store_id = user.store_id;
      
      if (!token || !store_id) return;

      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      const response = await fetch(`${API_BASE_URL}/api/stores/${store_id}/shift-requests?year=${year}&month=${month}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const formattedRequests: ShiftRequest[] = data.map((r: any) => ({
          id: r.id.toString(),
          employee_id: r.employee_id,
          employee_name: r.employee_name || '',
          date: r.request_date,
          start_time: r.start_time,
          end_time: r.end_time,
          request_type: r.request_type,
          notes: r.notes,
          created_at: r.created_at
        }));
        setShiftRequests(formattedRequests);
      }
    } catch (error) {
      console.error('シフト希望取得エラー:', error);
    }
  };

  // シフトを追加（バックエンドAPI）
  const handleAddShift = async () => {
    if (!newShift.employee_id || !newShift.date) {
      alert('従業員と日付を選択してください');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const store_id = user.store_id;

      const response = await fetch(`${API_BASE_URL}/api/stores/${store_id}/shifts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          employee_id: newShift.employee_id,
          shift_date: newShift.date,
          start_time: newShift.start_time,
          end_time: newShift.end_time,
          notes: newShift.notes
        })
      });

      if (response.ok) {
        await fetchShifts();
        setShowAddShiftModal(false);
        setNewShift({
          employee_id: employees[0]?.id || 0,
          date: '',
          start_time: '18:00',
          end_time: '02:00',
          notes: ''
        });
        alert('シフトを追加しました');
      } else {
        const error = await response.json();
        alert(error.detail || 'シフトの追加に失敗しました');
      }
    } catch (error) {
      console.error('シフト追加エラー:', error);
      alert('シフトの追加に失敗しました');
    }
  };

  // シフト希望を提出（バックエンドAPI）
  const handleSubmitRequest = async () => {
    if (!newRequest.date) {
      alert('日付を選択してください');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const store_id = user.store_id;

      const response = await fetch(`${API_BASE_URL}/api/stores/${store_id}/shift-requests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          request_date: newRequest.date,
          start_time: newRequest.start_time,
          end_time: newRequest.end_time,
          request_type: newRequest.request_type,
          notes: newRequest.notes
        })
      });

      if (response.ok) {
        await fetchShiftRequests();
        setShowRequestModal(false);
        setNewRequest({
          date: '',
          start_time: '18:00',
          end_time: '02:00',
          request_type: 'available',
          notes: ''
        });
        alert('シフト希望を提出しました');
      } else {
        const error = await response.json();
        alert(error.detail || 'シフト希望の提出に失敗しました');
      }
    } catch (error) {
      console.error('シフト希望提出エラー:', error);
      alert('シフト希望の提出に失敗しました');
    }
  };

  // シフトを削除（バックエンドAPI）
  const handleDeleteShift = async (shiftId: string) => {
    if (!confirm('このシフトを削除しますか？')) return;

    try {
      const token = localStorage.getItem('token');
      const store_id = user.store_id;

      const response = await fetch(`${API_BASE_URL}/api/stores/${store_id}/shifts/${shiftId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        await fetchShifts();
      } else {
        alert('シフトの削除に失敗しました');
      }
    } catch (error) {
      console.error('シフト削除エラー:', error);
      alert('シフトの削除に失敗しました');
    }
  };

  // シフト希望を削除
  const handleDeleteRequest = (requestId: string) => {
    if (confirm('このシフト希望を削除しますか？')) {
      const updatedRequests = shiftRequests.filter(r => r.id !== requestId);
      setShiftRequests(updatedRequests);
    }
  };

  // シフトステータスを更新（バックエンドAPI）
  const handleUpdateShiftStatus = async (shiftId: string, status: Shift['status']) => {
    try {
      const token = localStorage.getItem('token');
      const store_id = user.store_id;

      const response = await fetch(`${API_BASE_URL}/api/stores/${store_id}/shifts/${shiftId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        await fetchShifts();
      }
    } catch (error) {
      console.error('シフト更新エラー:', error);
    }
  };

  // カレンダー関連のユーティリティ関数
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDate = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const getShiftsForDate = (dateStr: string) => {
    return shifts.filter(s => s.date === dateStr);
  };

  const getRequestsForDate = (dateStr: string) => {
    return shiftRequests.filter(r => r.date === dateStr);
  };

  const getMyShiftsForDate = (dateStr: string) => {
    return shifts.filter(s => s.date === dateStr && s.employee_id === user.id);
  };

  const getMyRequestsForDate = (dateStr: string) => {
    return shiftRequests.filter(r => r.date === dateStr && r.employee_id === user.id);
  };

  // 月を移動
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // カレンダーのレンダリング
  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];
    const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

    // 曜日ヘッダー
    const weekDayHeaders = weekDays.map((day, index) => (
      <div 
        key={`header-${index}`} 
        className={`calendar-header-cell ${index === 0 ? 'sunday' : index === 6 ? 'saturday' : ''}`}
      >
        {day}
      </div>
    ));

    // 空白セル
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-cell empty"></div>);
    }

    // 日付セル
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDate(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayOfWeek = (firstDay + day - 1) % 7;
      const isToday = dateStr === new Date().toISOString().split('T')[0];
      
      const dayShifts = user.role === 'manager' || user.role === 'owner' 
        ? getShiftsForDate(dateStr) 
        : getMyShiftsForDate(dateStr);
      
      const dayRequests = user.role === 'manager' || user.role === 'owner'
        ? getRequestsForDate(dateStr)
        : getMyRequestsForDate(dateStr);

      days.push(
        <div 
          key={day} 
          className={`calendar-cell ${isToday ? 'today' : ''} ${dayOfWeek === 0 ? 'sunday' : dayOfWeek === 6 ? 'saturday' : ''}`}
          onClick={() => {
            setSelectedDate(dateStr);
            if (user.role === 'manager' || user.role === 'owner') {
              setNewShift(prev => ({ ...prev, date: dateStr }));
              setShowAddShiftModal(true);
            } else {
              setNewRequest(prev => ({ ...prev, date: dateStr }));
              setShowRequestModal(true);
            }
          }}
        >
          <div className="day-number">{day}</div>
          
          {/* シフト表示 */}
          {dayShifts.slice(0, 3).map((shift, idx) => (
            <div 
              key={`shift-${shift.id}`} 
              className={`shift-indicator ${shift.status}`}
              title={`${shift.employee_name}: ${shift.start_time}-${shift.end_time}`}
            >
              {user.role === 'manager' || user.role === 'owner' 
                ? shift.employee_name.slice(0, 3)
                : `${shift.start_time.slice(0, 5)}`
              }
            </div>
          ))}
          
          {dayShifts.length > 3 && (
            <div className="more-indicator">+{dayShifts.length - 3}</div>
          )}

          {/* リクエスト表示 */}
          {dayRequests.length > 0 && (
            <div className="request-indicator" title={`希望: ${dayRequests.length}件`}>
              📋{dayRequests.length}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="calendar-grid">
        {weekDayHeaders}
        {days}
      </div>
    );
  };

  // リスト表示のレンダリング
  const renderList = () => {
    const myShifts = user.role === 'manager' || user.role === 'owner' 
      ? shifts 
      : shifts.filter(s => s.employee_id === user.id);
    
    const sortedShifts = [...myShifts].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const futureShifts = sortedShifts.filter(s => 
      new Date(s.date) >= new Date(new Date().setHours(0, 0, 0, 0))
    );

    return (
      <div className="shift-list">
        {futureShifts.length === 0 ? (
          <div className="empty-state">
            <Calendar size={48} color="#ccc" />
            <p>予定されているシフトはありません</p>
          </div>
        ) : (
          futureShifts.map(shift => (
            <div key={shift.id} className={`shift-card ${shift.status}`}>
              <div className="shift-card-header">
                <div className="shift-date">
                  {new Date(shift.date).toLocaleDateString('ja-JP', {
                    month: 'long',
                    day: 'numeric',
                    weekday: 'short'
                  })}
                </div>
                <span className={`status-badge ${shift.status}`}>
                  {shift.status === 'scheduled' && '予定'}
                  {shift.status === 'confirmed' && '確定'}
                  {shift.status === 'completed' && '完了'}
                  {shift.status === 'cancelled' && 'キャンセル'}
                </span>
              </div>
              
              <div className="shift-card-body">
                {(user.role === 'manager' || user.role === 'owner') && (
                  <div className="shift-employee">
                    <User size={16} />
                    {shift.employee_name}
                  </div>
                )}
                <div className="shift-time">
                  <Clock size={16} />
                  {shift.start_time} - {shift.end_time}
                </div>
                {shift.notes && (
                  <div className="shift-notes">{shift.notes}</div>
                )}
              </div>

              {(user.role === 'manager' || user.role === 'owner') && (
                <div className="shift-card-actions">
                  {shift.status === 'scheduled' && (
                    <button 
                      className="action-btn confirm"
                      onClick={() => handleUpdateShiftStatus(shift.id, 'confirmed')}
                    >
                      <Check size={16} />
                      確定
                    </button>
                  )}
                  <button 
                    className="action-btn delete"
                    onClick={() => handleDeleteShift(shift.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    );
  };

  // シフト希望一覧
  const renderMyRequests = () => {
    const myRequests = shiftRequests.filter(r => r.employee_id === user.id);
    const sortedRequests = [...myRequests].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return (
      <div className="requests-section">
        <h3 className="section-title">提出済みのシフト希望</h3>
        {sortedRequests.length === 0 ? (
          <div className="empty-state-small">
            まだシフト希望を提出していません
          </div>
        ) : (
          <div className="request-list">
            {sortedRequests.map(request => (
              <div key={request.id} className={`request-card ${request.request_type}`}>
                <div className="request-info">
                  <div className="request-date">
                    {new Date(request.date).toLocaleDateString('ja-JP', {
                      month: 'long',
                      day: 'numeric',
                      weekday: 'short'
                    })}
                  </div>
                  <div className="request-time">
                    {request.start_time} - {request.end_time}
                  </div>
                  <span className={`request-type-badge ${request.request_type}`}>
                    {request.request_type === 'available' && '出勤可能'}
                    {request.request_type === 'unavailable' && '出勤不可'}
                    {request.request_type === 'preferred' && '希望'}
                  </span>
                </div>
                <button 
                  className="delete-request-btn"
                  onClick={() => handleDeleteRequest(request.id)}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // 店長・オーナー向けのシフト希望一覧
  const renderAllRequests = () => {
    if (user.role !== 'manager' && user.role !== 'owner') return null;

    const sortedRequests = [...shiftRequests].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const futureRequests = sortedRequests.filter(r => 
      new Date(r.date) >= new Date(new Date().setHours(0, 0, 0, 0))
    );

    return (
      <div className="all-requests-section">
        <h3 className="section-title">従業員からのシフト希望 ({futureRequests.length}件)</h3>
        {futureRequests.length === 0 ? (
          <div className="empty-state-small">
            シフト希望はありません
          </div>
        ) : (
          <div className="request-list">
            {futureRequests.map(request => (
              <div key={request.id} className={`request-card ${request.request_type}`}>
                <div className="request-info">
                  <div className="request-employee">{request.employee_name}</div>
                  <div className="request-date">
                    {new Date(request.date).toLocaleDateString('ja-JP', {
                      month: 'short',
                      day: 'numeric',
                      weekday: 'short'
                    })}
                  </div>
                  <div className="request-time">
                    {request.start_time} - {request.end_time}
                  </div>
                  <span className={`request-type-badge ${request.request_type}`}>
                    {request.request_type === 'available' && '出勤可'}
                    {request.request_type === 'unavailable' && '出勤不可'}
                    {request.request_type === 'preferred' && '希望'}
                  </span>
                </div>
                <button 
                  className="approve-request-btn"
                  onClick={() => {
                    // シフトに変換
                    const shift: Shift = {
                      id: Date.now().toString(),
                      employee_id: request.employee_id,
                      employee_name: request.employee_name,
                      date: request.date,
                      start_time: request.start_time,
                      end_time: request.end_time,
                      status: 'scheduled',
                      notes: request.notes
                    };
                    const updatedShifts = [...shifts, shift];
                    saveShifts(updatedShifts);
                    // 希望を削除
                    const updatedRequests = shiftRequests.filter(r => r.id !== request.id);
                    saveShiftRequests(updatedRequests);
                    alert('シフトを作成しました');
                  }}
                  title="シフトとして追加"
                >
                  <Check size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="shift-page loading">
        <div className="loading-spinner">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="shift-page">
      {/* ヘッダー */}
      <div className="page-header">
        <div className="header-left">
          <h1 className="page-title">シフト管理</h1>
          <p className="page-subtitle">
            {user.role === 'manager' || user.role === 'owner' 
              ? 'シフトの作成と従業員の希望を管理' 
              : 'シフトの確認と希望の提出'
            }
          </p>
        </div>
        <div className="header-actions">
          {user.role === 'manager' || user.role === 'owner' ? (
            <button 
              className="primary-btn"
              onClick={() => {
                setNewShift(prev => ({ ...prev, date: new Date().toISOString().split('T')[0] }));
                setShowAddShiftModal(true);
              }}
            >
              <Plus size={20} />
              シフト追加
            </button>
          ) : (
            <button 
              className="primary-btn"
              onClick={() => {
                setNewRequest(prev => ({ ...prev, date: new Date().toISOString().split('T')[0] }));
                setShowRequestModal(true);
              }}
            >
              <Plus size={20} />
              希望提出
            </button>
          )}
        </div>
      </div>

      {/* 表示モード切り替え */}
      <div className="view-toggle">
        <button 
          className={`toggle-btn ${viewMode === 'calendar' ? 'active' : ''}`}
          onClick={() => setViewMode('calendar')}
        >
          <Calendar size={18} />
          カレンダー
        </button>
        <button 
          className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
          onClick={() => setViewMode('list')}
        >
          <Clock size={18} />
          リスト
        </button>
      </div>

      {/* カレンダー表示 */}
      {viewMode === 'calendar' && (
        <div className="calendar-section">
          <div className="calendar-header">
            <button className="nav-btn" onClick={goToPreviousMonth}>
              <ChevronLeft size={20} />
            </button>
            <h2 className="current-month">
              {currentDate.getFullYear()}年{currentDate.getMonth() + 1}月
            </h2>
            <button className="nav-btn" onClick={goToNextMonth}>
              <ChevronRight size={20} />
            </button>
          </div>
          {renderCalendar()}
        </div>
      )}

      {/* リスト表示 */}
      {viewMode === 'list' && renderList()}

      {/* シフト希望セクション（スタッフ用） */}
      {user.role === 'staff' && renderMyRequests()}

      {/* 全シフト希望セクション（店長・オーナー用） */}
      {renderAllRequests()}

      {/* シフト追加モーダル（店長・オーナー用） */}
      {showAddShiftModal && (user.role === 'manager' || user.role === 'owner') && (
        <div className="modal-overlay" onClick={() => setShowAddShiftModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>シフトを追加</h3>
              <button className="close-btn" onClick={() => setShowAddShiftModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>従業員 *</label>
                <select
                  value={newShift.employee_id}
                  onChange={e => setNewShift(prev => ({ ...prev, employee_id: Number(e.target.value) }))}
                  className="form-input"
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>日付 *</label>
                <input
                  type="date"
                  value={newShift.date}
                  onChange={e => setNewShift(prev => ({ ...prev, date: e.target.value }))}
                  className="form-input"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>開始時間</label>
                  <input
                    type="time"
                    value={newShift.start_time}
                    onChange={e => setNewShift(prev => ({ ...prev, start_time: e.target.value }))}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>終了時間</label>
                  <input
                    type="time"
                    value={newShift.end_time}
                    onChange={e => setNewShift(prev => ({ ...prev, end_time: e.target.value }))}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>メモ</label>
                <textarea
                  value={newShift.notes}
                  onChange={e => setNewShift(prev => ({ ...prev, notes: e.target.value }))}
                  className="form-input textarea"
                  placeholder="特記事項があれば入力..."
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowAddShiftModal(false)}>
                キャンセル
              </button>
              <button className="submit-btn" onClick={handleAddShift}>
                追加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* シフト希望提出モーダル（スタッフ用） */}
      {showRequestModal && (
        <div className="modal-overlay" onClick={() => setShowRequestModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>シフト希望を提出</h3>
              <button className="close-btn" onClick={() => setShowRequestModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>日付 *</label>
                <input
                  type="date"
                  value={newRequest.date}
                  onChange={e => setNewRequest(prev => ({ ...prev, date: e.target.value }))}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>希望タイプ</label>
                <select
                  value={newRequest.request_type}
                  onChange={e => setNewRequest(prev => ({ 
                    ...prev, 
                    request_type: e.target.value as 'available' | 'unavailable' | 'preferred' 
                  }))}
                  className="form-input"
                >
                  <option value="available">出勤可能</option>
                  <option value="preferred">出勤希望</option>
                  <option value="unavailable">出勤不可</option>
                </select>
              </div>

              {newRequest.request_type !== 'unavailable' && (
                <div className="form-row">
                  <div className="form-group">
                    <label>希望開始時間</label>
                    <input
                      type="time"
                      value={newRequest.start_time}
                      onChange={e => setNewRequest(prev => ({ ...prev, start_time: e.target.value }))}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>希望終了時間</label>
                    <input
                      type="time"
                      value={newRequest.end_time}
                      onChange={e => setNewRequest(prev => ({ ...prev, end_time: e.target.value }))}
                      className="form-input"
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>備考</label>
                <textarea
                  value={newRequest.notes}
                  onChange={e => setNewRequest(prev => ({ ...prev, notes: e.target.value }))}
                  className="form-input textarea"
                  placeholder="理由や詳細があれば入力..."
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowRequestModal(false)}>
                キャンセル
              </button>
              <button className="submit-btn" onClick={handleSubmitRequest}>
                提出
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftPage;
