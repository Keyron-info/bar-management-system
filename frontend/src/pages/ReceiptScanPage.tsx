import React, { useState, useRef, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { 
  Camera, 
  Upload, 
  Check, 
  X, 
  AlertCircle, 
  Loader2, 
  RefreshCw,
  Edit3,
  CreditCard,
  Banknote,
  Wine,
  User,
  Calendar,
  DollarSign,
  GlassWater,
  Sparkles,
  ChevronLeft,
  Image as ImageIcon,
  Zap
} from 'lucide-react';
import './ReceiptScanPage.css';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  store_id?: number;
}

interface ExtractedData {
  total_amount: number | null;
  customer_name: string | null;
  employee_name: string | null;
  date: string | null;
  drink_count: number | null;
  champagne_type: string | null;
  champagne_price: number | null;
  is_card: boolean | null;
}

interface ScanResult {
  success: boolean;
  receipt_image_id?: number;
  image_url?: string;
  extracted_data?: ExtractedData;
  confidence_score?: number;
  ocr_text?: string;
  is_test_mode?: boolean;
  error?: string;
}

interface ReceiptScanPageProps {
  user: User;
  onBack?: () => void;
  dailyReportId?: number;
  onReceiptAdded?: () => void;
}

const ReceiptScanPage: React.FC<ReceiptScanPageProps> = ({ 
  user, 
  onBack,
  dailyReportId,
  onReceiptAdded 
}) => {
  const [step, setStep] = useState<'camera' | 'processing' | 'confirm' | 'success'>('camera');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [editedData, setEditedData] = useState<ExtractedData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [useCameraMode, setUseCameraMode] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // カメラ起動
  useEffect(() => {
    if (step === 'camera' && useCameraMode) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [step, useCameraMode]);

  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err) {
      console.error('カメラ起動エラー:', err);
      setCameraError('カメラを起動できませんでした。ファイルアップロードをお使いください。');
      setUseCameraMode(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  // 写真撮影
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedImage(imageData);
      stopCamera();
      processImage(imageData);
    }
  };

  // ファイルアップロード
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // ファイルサイズチェック (10MB以下)
    if (file.size > 10 * 1024 * 1024) {
      setError('ファイルサイズは10MB以下にしてください');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target?.result as string;
      setCapturedImage(imageData);
      processImage(imageData);
    };
    reader.readAsDataURL(file);
  };

  // OCR処理
  const processImage = async (imageData: string) => {
    setStep('processing');
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/api/receipts/scan`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image_data: imageData,
          daily_report_id: dailyReportId
        })
      });

      const result: ScanResult = await response.json();
      
      if (result.success) {
        setScanResult(result);
        setEditedData(result.extracted_data || null);
        setStep('confirm');
      } else {
        setError(result.error || '読み取りに失敗しました');
        setStep('camera');
      }
    } catch (err) {
      console.error('OCRエラー:', err);
      setError('処理中にエラーが発生しました');
      setStep('camera');
    } finally {
      setLoading(false);
    }
  };

  // 確定処理
  const confirmReceipt = async () => {
    if (!scanResult?.receipt_image_id || !editedData) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(
        `${API_BASE_URL}/api/receipts/scan/${scanResult.receipt_image_id}/confirm`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            confirmed_data: editedData,
            manual_corrections: getManualCorrections(),
            daily_report_id: dailyReportId
          })
        }
      );

      const result = await response.json();
      
      if (result.success) {
        setStep('success');
        if (onReceiptAdded) {
          setTimeout(() => onReceiptAdded(), 1500);
        }
      } else {
        setError(result.message || '確定処理に失敗しました');
      }
    } catch (err) {
      console.error('確定エラー:', err);
      setError('確定処理中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  // 手動修正内容を取得
  const getManualCorrections = (): Record<string, any> => {
    if (!scanResult?.extracted_data || !editedData) return {};
    
    const corrections: Record<string, any> = {};
    const original = scanResult.extracted_data;
    
    if (original.total_amount !== editedData.total_amount) {
      corrections.total_amount = { from: original.total_amount, to: editedData.total_amount };
    }
    if (original.customer_name !== editedData.customer_name) {
      corrections.customer_name = { from: original.customer_name, to: editedData.customer_name };
    }
    // ... 他のフィールドも同様
    
    return corrections;
  };

  // リトライ
  const retry = () => {
    setCapturedImage(null);
    setScanResult(null);
    setEditedData(null);
    setError(null);
    setStep('camera');
    if (useCameraMode) {
      startCamera();
    }
  };

  // 信頼度表示
  const getConfidenceColor = (score: number): string => {
    if (score >= 0.8) return '#10b981';
    if (score >= 0.6) return '#f59e0b';
    return '#ef4444';
  };

  const getConfidenceLabel = (score: number): string => {
    if (score >= 0.8) return '高精度';
    if (score >= 0.6) return '要確認';
    return '低精度';
  };

  return (
    <div className="receipt-scan-page">
      {/* ヘッダー */}
      <div className="scan-header">
        <button className="back-button" onClick={onBack}>
          <ChevronLeft size={24} />
        </button>
        <div className="header-content">
          <h1>
            <Sparkles size={24} />
            AI伝票スキャン
          </h1>
          <p>写真を撮って自動入力</p>
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="error-banner">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <X size={18} />
          </button>
        </div>
      )}

      {/* カメラ画面 */}
      {step === 'camera' && (
        <div className="camera-step">
          {useCameraMode && !cameraError ? (
            <div className="camera-container">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="camera-preview"
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              
              {/* ガイドフレーム */}
              <div className="guide-frame">
                <div className="corner top-left" />
                <div className="corner top-right" />
                <div className="corner bottom-left" />
                <div className="corner bottom-right" />
              </div>

              {/* 撮影ボタン */}
              <button className="capture-button" onClick={capturePhoto}>
                <Camera size={32} />
              </button>
            </div>
          ) : (
            <div className="upload-container">
              <div className="upload-icon">
                <ImageIcon size={64} />
              </div>
              <h2>伝票画像をアップロード</h2>
              <p>カメラが使用できないため、ファイルをアップロードしてください</p>
              
              <button 
                className="upload-button"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={20} />
                画像を選択
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </div>
          )}

          {/* 撮影のコツ */}
          <div className="tips-container">
            <h3>📸 撮影のコツ</h3>
            <ul>
              <li>伝票全体が画面に収まるように</li>
              <li>明るい場所で撮影</li>
              <li>文字がはっきり見えるように</li>
              <li>傾きを少なくする</li>
            </ul>
          </div>

          {/* モード切替 */}
          {!cameraError && (
            <div className="mode-switch">
              <button 
                className={useCameraMode ? 'active' : ''}
                onClick={() => setUseCameraMode(true)}
              >
                <Camera size={16} />
                カメラ
              </button>
              <button 
                className={!useCameraMode ? 'active' : ''}
                onClick={() => {
                  setUseCameraMode(false);
                  stopCamera();
                }}
              >
                <Upload size={16} />
                アップロード
              </button>
            </div>
          )}

          {/* ファイルアップロード（カメラモードでも使用可能） */}
          {useCameraMode && !cameraError && (
            <>
              <button 
                className="file-upload-alt"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={18} />
                ファイルから選択
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </>
          )}
        </div>
      )}

      {/* 処理中画面 */}
      {step === 'processing' && (
        <div className="processing-step">
          <div className="processing-content">
            <div className="loader-container">
              <Zap className="zap-icon" size={48} />
              <Loader2 className="spinner" size={64} />
            </div>
            <h2>AI解析中...</h2>
            <p>画像から情報を読み取っています</p>
            
            {capturedImage && (
              <div className="preview-image">
                <img src={capturedImage} alt="撮影画像" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* 確認・編集画面 */}
      {step === 'confirm' && editedData && (
        <div className="confirm-step">
          {/* 信頼度表示 */}
          {scanResult?.confidence_score !== undefined && (
            <div className="confidence-bar">
              <div className="confidence-label">
                <span>認識精度</span>
                <span 
                  className="confidence-value"
                  style={{ color: getConfidenceColor(scanResult.confidence_score) }}
                >
                  {getConfidenceLabel(scanResult.confidence_score)}
                  ({Math.round(scanResult.confidence_score * 100)}%)
                </span>
              </div>
              <div className="confidence-track">
                <div 
                  className="confidence-fill"
                  style={{ 
                    width: `${scanResult.confidence_score * 100}%`,
                    backgroundColor: getConfidenceColor(scanResult.confidence_score)
                  }}
                />
              </div>
            </div>
          )}

          {/* テストモード警告 */}
          {scanResult?.is_test_mode && (
            <div className="test-mode-banner">
              <AlertCircle size={18} />
              <span>テストモード: サンプルデータが表示されています</span>
            </div>
          )}

          {/* 撮影画像プレビュー */}
          {capturedImage && (
            <div className="image-preview-section">
              <img src={capturedImage} alt="伝票画像" />
            </div>
          )}

          {/* 編集フォーム */}
          <div className="edit-form">
            <h3>
              <Edit3 size={20} />
              読み取り結果
            </h3>

            {/* 金額 */}
            <div className="form-field required">
              <label>
                <DollarSign size={16} />
                合計金額
              </label>
              <div className="input-with-unit">
                <span className="unit-prefix">¥</span>
                <input
                  type="number"
                  value={editedData.total_amount || ''}
                  onChange={(e) => setEditedData({
                    ...editedData,
                    total_amount: parseInt(e.target.value) || null
                  })}
                  placeholder="金額を入力"
                />
              </div>
            </div>

            {/* 顧客名 */}
            <div className="form-field">
              <label>
                <User size={16} />
                顧客名
              </label>
              <input
                type="text"
                value={editedData.customer_name || ''}
                onChange={(e) => setEditedData({
                  ...editedData,
                  customer_name: e.target.value || null
                })}
                placeholder="顧客名を入力"
              />
            </div>

            {/* 日付 */}
            <div className="form-field">
              <label>
                <Calendar size={16} />
                日付
              </label>
              <input
                type="date"
                value={editedData.date || ''}
                onChange={(e) => setEditedData({
                  ...editedData,
                  date: e.target.value || null
                })}
              />
            </div>

            {/* ドリンク数 */}
            <div className="form-field">
              <label>
                <GlassWater size={16} />
                ドリンク
              </label>
              <div className="input-with-unit">
                <input
                  type="number"
                  value={editedData.drink_count || ''}
                  onChange={(e) => setEditedData({
                    ...editedData,
                    drink_count: parseInt(e.target.value) || null
                  })}
                  placeholder="杯数"
                />
                <span className="unit-suffix">杯</span>
              </div>
            </div>

            {/* シャンパン */}
            <div className="form-field">
              <label>
                <Wine size={16} />
                シャンパン
              </label>
              <input
                type="text"
                value={editedData.champagne_type || ''}
                onChange={(e) => setEditedData({
                  ...editedData,
                  champagne_type: e.target.value || null
                })}
                placeholder="シャンパン名"
              />
            </div>

            {/* 支払い方法 */}
            <div className="form-field">
              <label>支払方法</label>
              <div className="payment-toggle">
                <button
                  className={editedData.is_card === false ? 'active' : ''}
                  onClick={() => setEditedData({ ...editedData, is_card: false })}
                >
                  <Banknote size={18} />
                  現金
                </button>
                <button
                  className={editedData.is_card === true ? 'active' : ''}
                  onClick={() => setEditedData({ ...editedData, is_card: true })}
                >
                  <CreditCard size={18} />
                  カード
                </button>
              </div>
            </div>
          </div>

          {/* アクションボタン */}
          <div className="action-buttons">
            <button className="cancel-button" onClick={retry}>
              <RefreshCw size={18} />
              撮り直す
            </button>
            <button 
              className="confirm-button"
              onClick={confirmReceipt}
              disabled={!editedData.total_amount || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="spinner" size={18} />
                  処理中...
                </>
              ) : (
                <>
                  <Check size={18} />
                  確定して追加
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 成功画面 */}
      {step === 'success' && (
        <div className="success-step">
          <div className="success-content">
            <div className="success-icon">
              <Check size={48} />
            </div>
            <h2>伝票を追加しました！</h2>
            <p>日報に自動的に反映されます</p>
            
            <button className="continue-button" onClick={retry}>
              <Camera size={20} />
              次の伝票をスキャン
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceiptScanPage;

