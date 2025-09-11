import React, { useState } from 'react';
import axios from 'axios';

interface SalesData {
  date: string;
  employee_name: string;
  total_sales: number;
  drink_count: number;
  champagne_count: number;
  catch_count: number;
  work_hours: number;
  notes: string;
}

interface SalesInputWithPhotoProps {
  onSalesAdded: () => void;
}

const SalesInputWithPhoto: React.FC<SalesInputWithPhotoProps> = ({ onSalesAdded }) => {
  const [formData, setFormData] = useState<SalesData>({
    date: new Date().toISOString().split('T')[0],
    employee_name: '',
    total_sales: 0,
    drink_count: 0,
    champagne_count: 0,
    catch_count: 0,
    work_hours: 0,
    notes: '',
  });
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // ファイルサイズチェック（10MB）
      if (file.size > 10 * 1024 * 1024) {
        setMessage('❌ ファイルサイズが大きすぎます（10MB以下）');
        return;
      }

      // ファイル形式チェック
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setMessage('❌ サポートされていないファイル形式です');
        return;
      }

      setSelectedFile(file);
      
      // プレビュー用のURLを作成
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      setMessage('');
    }
  };

  const removePhoto = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    const fileInput = document.getElementById('photo-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('認証が必要です');
      }

      // FormDataを作成
      const formDataToSend = new FormData();
      formDataToSend.append('date', formData.date);
      formDataToSend.append('employee_name', formData.employee_name);
      formDataToSend.append('total_sales', formData.total_sales.toString());
      formDataToSend.append('drink_count', formData.drink_count.toString());
      formDataToSend.append('champagne_count', formData.champagne_count.toString());
      formDataToSend.append('catch_count', formData.catch_count.toString());
      formDataToSend.append('work_hours', formData.work_hours.toString());
      if (formData.notes) {
        formDataToSend.append('notes', formData.notes);
      }
      if (selectedFile) {
        formDataToSend.append('photo', selectedFile);
      }

      const response = await axios.post(
        'https://bar-management-system.onrender.com/api/sales-with-photo',
        formDataToSend,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      setMessage('✅ 売上データを保存しました');
      
      // フォームをリセット
      setFormData({
        date: new Date().toISOString().split('T')[0],
        employee_name: '',
        total_sales: 0,
        drink_count: 0,
        champagne_count: 0,
        catch_count: 0,
        work_hours: 0,
        notes: '',
      });
      removePhoto();
      
      onSalesAdded();
    } catch (error: any) {
      console.error('Save error:', error);
      if (error.response?.status === 401) {
        setMessage('❌ 認証エラー：再ログインしてください');
      } else {
        setMessage('❌ 保存に失敗しました');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      backgroundColor: '#fff', 
      padding: '20px', 
      borderRadius: '8px', 
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)', 
      marginBottom: '20px' 
    }}>
      <h2 style={{ color: '#333', marginBottom: '20px' }}>📊 写真付き売上データ入力</h2>
      
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
          <label style={{ display: 'flex', flexDirection: 'column' }}>
            日付:
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
              style={{ 
                padding: '10px', 
                border: '1px solid #ddd', 
                borderRadius: '4px',
                fontSize: '16px'
              }}
            />
          </label>
          
          <label style={{ display: 'flex', flexDirection: 'column' }}>
            従業員名:
            <input
              type="text"
              name="employee_name"
              value={formData.employee_name}
              onChange={handleChange}
              placeholder="名前を入力"
              required
              style={{ 
                padding: '10px', 
                border: '1px solid #ddd', 
                borderRadius: '4px',
                fontSize: '16px'
              }}
            />
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
          <label style={{ display: 'flex', flexDirection: 'column' }}>
            総売上 (円):
            <input
              type="number"
              name="total_sales"
              value={formData.total_sales}
              onChange={handleChange}
              min="0"
              required
              style={{ 
                padding: '10px', 
                border: '1px solid #ddd', 
                borderRadius: '4px',
                fontSize: '16px'
              }}
            />
          </label>
          
          <label style={{ display: 'flex', flexDirection: 'column' }}>
            稼働時間 (時間):
            <input
              type="number"
              name="work_hours"
              value={formData.work_hours}
              onChange={handleChange}
              min="0"
              max="24"
              step="0.5"
              style={{ 
                padding: '10px', 
                border: '1px solid #ddd', 
                borderRadius: '4px',
                fontSize: '16px'
              }}
            />
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
          <label style={{ display: 'flex', flexDirection: 'column' }}>
            ドリンク杯数:
            <input
              type="number"
              name="drink_count"
              value={formData.drink_count}
              onChange={handleChange}
              min="0"
              style={{ 
                padding: '10px', 
                border: '1px solid #ddd', 
                borderRadius: '4px',
                fontSize: '16px'
              }}
            />
          </label>
          
          <label style={{ display: 'flex', flexDirection: 'column' }}>
            シャンパン杯数:
            <input
              type="number"
              name="champagne_count"
              value={formData.champagne_count}
              onChange={handleChange}
              min="0"
              style={{ 
                padding: '10px', 
                border: '1px solid #ddd', 
                borderRadius: '4px',
                fontSize: '16px'
              }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column' }}>
            キャッチ数:
            <input
              type="number"
              name="catch_count"
              value={formData.catch_count}
              onChange={handleChange}
              min="0"
              style={{ 
                padding: '10px', 
                border: '1px solid #ddd', 
                borderRadius: '4px',
                fontSize: '16px'
              }}
            />
          </label>
        </div>

        {/* 写真アップロード部分 */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'flex', flexDirection: 'column' }}>
            📷 日報写真 (任意):
            <input
              id="photo-input"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ 
                padding: '10px', 
                border: '1px solid #ddd', 
                borderRadius: '4px',
                fontSize: '16px',
                marginTop: '5px'
              }}
            />
          </label>
          <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>
            JPEG、PNG、GIF、WebP形式（10MB以下）
          </small>
        </div>

        {/* 写真プレビュー */}
        {previewUrl && (
          <div style={{ marginBottom: '15px' }}>
            <h4 style={{ marginBottom: '10px' }}>写真プレビュー:</h4>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img
                src={previewUrl}
                alt="プレビュー"
                style={{ 
                  maxWidth: '300px', 
                  maxHeight: '200px', 
                  borderRadius: '4px',
                  border: '1px solid #ddd'
                }}
              />
              <button
                type="button"
                onClick={removePhoto}
                style={{
                  position: 'absolute',
                  top: '5px',
                  right: '5px',
                  backgroundColor: 'rgba(255, 0, 0, 0.7)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '25px',
                  height: '25px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* メモ欄 */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'flex', flexDirection: 'column' }}>
            メモ・備考 (任意):
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="特記事項があれば入力してください"
              rows={3}
              style={{ 
                padding: '10px', 
                border: '1px solid #ddd', 
                borderRadius: '4px',
                fontSize: '16px',
                resize: 'vertical'
              }}
            />
          </label>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          style={{
            backgroundColor: loading ? '#ccc' : '#007bff',
            color: 'white',
            padding: '12px 24px',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            cursor: loading ? 'not-allowed' : 'pointer',
            width: '100%'
          }}
        >
          {loading ? '保存中...' : '💾 売上データを保存'}
        </button>
      </form>

      {message && (
        <div style={{ 
          color: message.includes('✅') ? 'green' : 'red',
          marginTop: '15px',
          padding: '10px',
          backgroundColor: message.includes('✅') ? '#f0f8f0' : '#fdf0f0',
          border: `1px solid ${message.includes('✅') ? '#d4edda' : '#f5c6cb'}`,
          borderRadius: '4px',
          fontWeight: 'bold'
        }}>
          {message}
        </div>
      )}
    </div>
  );
};

export default SalesInputWithPhoto;