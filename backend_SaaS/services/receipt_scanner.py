# receipt_scanner.py - AI伝票読み取りサービス
"""
Google Cloud Vision APIを使用した伝票OCR処理
バー営業の伝票から金額、顧客名、日付などを自動抽出
"""

import os
import re
import json
import base64
import hashlib
from datetime import datetime, date
from typing import Optional, Dict, Any, List, Tuple
from io import BytesIO

# 画像処理
try:
    from PIL import Image, ImageEnhance, ImageFilter
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    print("⚠️ Pillow未インストール: pip install Pillow")

# Google Cloud Vision API
try:
    from google.cloud import vision
    from google.oauth2 import service_account
    VISION_AVAILABLE = True
except ImportError:
    VISION_AVAILABLE = False
    print("⚠️ google-cloud-vision未インストール: pip install google-cloud-vision")

# Cloudinary（画像保存用）
try:
    import cloudinary
    import cloudinary.uploader
    CLOUDINARY_AVAILABLE = True
except ImportError:
    CLOUDINARY_AVAILABLE = False
    print("⚠️ cloudinary未インストール: pip install cloudinary")


class ReceiptScanner:
    """
    伝票スキャンサービス
    - 画像の前処理（圧縮、コントラスト調整など）
    - Google Cloud Vision APIでOCR処理
    - 正規表現でデータ抽出（金額、日付、顧客名など）
    - 構造化データの生成
    """
    
    def __init__(self):
        """初期化"""
        self.vision_client = None
        self._init_vision_api()
        self._init_cloudinary()
        
        # 金額認識のパターン
        self.amount_patterns = [
            r'合計[:\s]*[¥￥]?\s*([0-9,]+)',
            r'(?:お会計|会計|計|TOTAL|total)[:\s]*[¥￥]?\s*([0-9,]+)',
            r'[¥￥]\s*([0-9,]+)\s*(?:円)?',
            r'([0-9,]+)\s*円',
            r'(?:売上|売り上げ)[:\s]*[¥￥]?\s*([0-9,]+)',
        ]
        
        # 日付認識のパターン
        self.date_patterns = [
            r'(\d{4})[/\-年](\d{1,2})[/\-月](\d{1,2})',  # 2024/11/28, 2024年11月28日
            r'(\d{1,2})[/\-月](\d{1,2})[日]?',  # 11/28, 11月28日
            r'R?(\d{1,2})[/\.\-](\d{1,2})[/\.\-](\d{1,2})',  # R6.11.28
        ]
        
        # 顧客名認識のパターン
        self.customer_patterns = [
            r'(?:お客様|顧客|名前|Name|name)[:\s]*([^\n\r]+)',
            r'([^\n\r]+)\s*(?:様|さん|さま)',
            r'(?:指名|担当|キャスト)[:\s]*([^\n\r]+)',
        ]
        
        # ドリンク数認識のパターン
        self.drink_patterns = [
            r'(?:ドリンク|drink|drinks)[:\s]*(\d+)',
            r'(\d+)\s*(?:杯|はい|ドリンク)',
            r'(?:ドリンク|飲み物)[^\d]*(\d+)',
        ]
        
        # シャンパン認識のパターン
        self.champagne_patterns = [
            r'(?:シャンパン|champagne|ボトル|bottle)[:\s]*([^\n\r¥￥0-9]+)',
            r'(モエ|ドンペリ|ヴーヴクリコ|アルマンド|クリュッグ|ペリエ|ace)[^\n\r]*',
        ]
        
        # 支払い方法認識のパターン
        self.payment_patterns = [
            r'(?:支払|決済|payment)[:\s]*(現金|カード|CASH|CARD|クレジット)',
            r'(現金|カード|CASH|CARD|クレジット)',
        ]
    
    def _init_vision_api(self):
        """Google Cloud Vision APIを初期化"""
        if not VISION_AVAILABLE:
            print("⚠️ Vision API未設定（テストモードで動作）")
            return
        
        try:
            # 環境変数から認証情報を取得
            credentials_base64 = os.getenv('GOOGLE_CREDENTIALS_BASE64')
            credentials_file = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
            
            if credentials_base64:
                # Base64エンコードされた認証情報
                credentials_json = base64.b64decode(credentials_base64)
                credentials_dict = json.loads(credentials_json)
                credentials = service_account.Credentials.from_service_account_info(
                    credentials_dict
                )
                self.vision_client = vision.ImageAnnotatorClient(credentials=credentials)
                print("✅ Vision API初期化成功（Base64認証）")
                
            elif credentials_file and os.path.exists(credentials_file):
                # ファイルから認証情報
                self.vision_client = vision.ImageAnnotatorClient()
                print("✅ Vision API初期化成功（ファイル認証）")
            else:
                print("⚠️ Vision API認証情報が設定されていません")
                
        except Exception as e:
            print(f"❌ Vision API初期化エラー: {e}")
    
    def _init_cloudinary(self):
        """Cloudinaryを初期化"""
        if not CLOUDINARY_AVAILABLE:
            print("⚠️ Cloudinary未設定（ローカル保存モード）")
            return
        
        try:
            cloud_name = os.getenv('CLOUDINARY_CLOUD_NAME')
            api_key = os.getenv('CLOUDINARY_API_KEY')
            api_secret = os.getenv('CLOUDINARY_API_SECRET')
            
            if cloud_name and api_key and api_secret:
                cloudinary.config(
                    cloud_name=cloud_name,
                    api_key=api_key,
                    api_secret=api_secret
                )
                print("✅ Cloudinary初期化成功")
            else:
                print("⚠️ Cloudinary認証情報が設定されていません")
                
        except Exception as e:
            print(f"❌ Cloudinary初期化エラー: {e}")
    
    def preprocess_image(self, image_data: bytes) -> bytes:
        """
        画像の前処理
        - サイズ最適化
        - コントラスト強調
        - ノイズ除去
        """
        if not PIL_AVAILABLE:
            return image_data
        
        try:
            # バイトデータから画像を読み込み
            image = Image.open(BytesIO(image_data))
            
            # RGBに変換（透過画像対応）
            if image.mode in ('RGBA', 'P'):
                image = image.convert('RGB')
            
            # サイズ最適化（最大2048px）
            max_size = 2048
            if max(image.size) > max_size:
                ratio = max_size / max(image.size)
                new_size = (int(image.size[0] * ratio), int(image.size[1] * ratio))
                image = image.resize(new_size, Image.Resampling.LANCZOS)
            
            # コントラスト強調
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(1.5)
            
            # シャープネス強調
            enhancer = ImageEnhance.Sharpness(image)
            image = enhancer.enhance(1.2)
            
            # 明度調整
            enhancer = ImageEnhance.Brightness(image)
            image = enhancer.enhance(1.1)
            
            # バイトデータに変換
            output = BytesIO()
            image.save(output, format='JPEG', quality=85)
            return output.getvalue()
            
        except Exception as e:
            print(f"⚠️ 画像前処理エラー: {e}")
            return image_data
    
    def upload_image(self, image_data: bytes, filename: str = None) -> Tuple[str, str]:
        """
        画像をCloudinaryにアップロード
        Returns: (image_url, image_hash)
        """
        # ハッシュ計算
        image_hash = hashlib.sha256(image_data).hexdigest()
        
        if not CLOUDINARY_AVAILABLE or not os.getenv('CLOUDINARY_CLOUD_NAME'):
            # テストモード: ダミーURL返却
            return f"https://example.com/receipts/{image_hash[:16]}.jpg", image_hash
        
        try:
            # Cloudinaryにアップロード
            result = cloudinary.uploader.upload(
                image_data,
                folder="receipt_images",
                public_id=filename or image_hash[:16],
                resource_type="image"
            )
            return result['secure_url'], image_hash
            
        except Exception as e:
            print(f"❌ 画像アップロードエラー: {e}")
            return None, image_hash
    
    def perform_ocr(self, image_data: bytes) -> Dict[str, Any]:
        """
        Google Cloud Vision APIでOCR実行
        Returns: OCR結果の辞書
        """
        if not self.vision_client:
            # テストモード: サンプルテキスト返却
            return {
                'text': self._get_sample_ocr_text(),
                'confidence': 0.85,
                'is_test_mode': True
            }
        
        try:
            # Vision API呼び出し
            image = vision.Image(content=image_data)
            response = self.vision_client.text_detection(image=image)
            
            if response.error.message:
                return {
                    'error': response.error.message,
                    'text': '',
                    'confidence': 0
                }
            
            # テキスト抽出
            texts = response.text_annotations
            if texts:
                full_text = texts[0].description
                
                # 信頼度計算（単語ごとの平均）
                confidence = 0.0
                if len(texts) > 1:
                    confidence_sum = sum(
                        getattr(t, 'confidence', 0.8) 
                        for t in texts[1:]
                    )
                    confidence = confidence_sum / (len(texts) - 1)
                
                return {
                    'text': full_text,
                    'confidence': confidence,
                    'word_count': len(texts) - 1,
                    'raw_response': str(response)
                }
            
            return {
                'text': '',
                'confidence': 0,
                'message': 'テキストが検出されませんでした'
            }
            
        except Exception as e:
            print(f"❌ OCRエラー: {e}")
            return {
                'error': str(e),
                'text': '',
                'confidence': 0
            }
    
    def _get_sample_ocr_text(self) -> str:
        """テストモード用サンプルテキスト"""
        return """
        伝票 No.1234
        2024年11月28日
        
        お客様名: 田中様
        担当: 花子
        
        ドリンク 8杯
        シャンパン: モエ
        
        合計: ¥35,000
        
        支払: カード
        
        ありがとうございました
        """
    
    def extract_data(self, ocr_text: str) -> Dict[str, Any]:
        """
        OCRテキストから構造化データを抽出
        """
        extracted = {
            'total_amount': None,
            'customer_name': None,
            'employee_name': None,
            'date': None,
            'drink_count': None,
            'champagne_type': None,
            'champagne_price': None,
            'is_card': None,
            'raw_text': ocr_text,
            'extraction_details': {}
        }
        
        # 金額抽出
        extracted['total_amount'], details = self._extract_amount(ocr_text)
        extracted['extraction_details']['amount'] = details
        
        # 日付抽出
        extracted['date'], details = self._extract_date(ocr_text)
        extracted['extraction_details']['date'] = details
        
        # 顧客名抽出
        extracted['customer_name'], details = self._extract_customer_name(ocr_text)
        extracted['extraction_details']['customer'] = details
        
        # ドリンク数抽出
        extracted['drink_count'], details = self._extract_drink_count(ocr_text)
        extracted['extraction_details']['drinks'] = details
        
        # シャンパン抽出
        extracted['champagne_type'], details = self._extract_champagne(ocr_text)
        extracted['extraction_details']['champagne'] = details
        
        # 支払い方法抽出
        extracted['is_card'], details = self._extract_payment_method(ocr_text)
        extracted['extraction_details']['payment'] = details
        
        return extracted
    
    def _extract_amount(self, text: str) -> Tuple[Optional[int], Dict]:
        """金額を抽出"""
        details = {'matched_pattern': None, 'raw_match': None}
        
        for pattern in self.amount_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                amount_str = match.group(1).replace(',', '')
                try:
                    amount = int(amount_str)
                    details['matched_pattern'] = pattern
                    details['raw_match'] = match.group(0)
                    return amount, details
                except ValueError:
                    continue
        
        return None, details
    
    def _extract_date(self, text: str) -> Tuple[Optional[str], Dict]:
        """日付を抽出"""
        details = {'matched_pattern': None, 'raw_match': None}
        today = date.today()
        
        for pattern in self.date_patterns:
            match = re.search(pattern, text)
            if match:
                groups = match.groups()
                details['matched_pattern'] = pattern
                details['raw_match'] = match.group(0)
                
                try:
                    if len(groups) == 3:
                        year, month, day = int(groups[0]), int(groups[1]), int(groups[2])
                        # 2桁年の場合は2000年代として処理
                        if year < 100:
                            year = 2000 + year
                    else:
                        # 年なしの場合は今年
                        year = today.year
                        month, day = int(groups[0]), int(groups[1])
                    
                    # 日付検証
                    result_date = date(year, month, day)
                    return result_date.isoformat(), details
                    
                except (ValueError, IndexError):
                    continue
        
        # 見つからない場合は今日の日付
        return today.isoformat(), details
    
    def _extract_customer_name(self, text: str) -> Tuple[Optional[str], Dict]:
        """顧客名を抽出"""
        details = {'matched_pattern': None, 'raw_match': None}
        
        for pattern in self.customer_patterns:
            match = re.search(pattern, text)
            if match:
                name = match.group(1).strip()
                # 短すぎる名前は除外
                if len(name) >= 1 and len(name) <= 20:
                    details['matched_pattern'] = pattern
                    details['raw_match'] = match.group(0)
                    # 「様」「さん」を正規化
                    name = re.sub(r'(様|さん|さま)$', '', name).strip()
                    if name:
                        return name + '様', details
        
        return None, details
    
    def _extract_drink_count(self, text: str) -> Tuple[Optional[int], Dict]:
        """ドリンク数を抽出"""
        details = {'matched_pattern': None, 'raw_match': None}
        
        for pattern in self.drink_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    count = int(match.group(1))
                    if 0 < count < 100:  # 妥当な範囲
                        details['matched_pattern'] = pattern
                        details['raw_match'] = match.group(0)
                        return count, details
                except ValueError:
                    continue
        
        return None, details
    
    def _extract_champagne(self, text: str) -> Tuple[Optional[str], Dict]:
        """シャンパン情報を抽出"""
        details = {'matched_pattern': None, 'raw_match': None}
        
        # 有名シャンパンブランドのリスト
        champagne_brands = [
            'モエ', 'ドンペリ', 'ヴーヴクリコ', 'アルマンド', 'クリュッグ',
            'ペリエジュエ', 'ベルエポック', 'ACE', 'エース', 'アンジェロ',
            'ドンペリニヨン', 'モエ・エ・シャンドン', 'Dom Perignon',
        ]
        
        text_lower = text.lower()
        for brand in champagne_brands:
            if brand.lower() in text_lower:
                details['matched_pattern'] = f'ブランド検出: {brand}'
                return brand, details
        
        # パターンマッチング
        for pattern in self.champagne_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                champagne = match.group(1).strip() if match.lastindex else match.group(0).strip()
                if len(champagne) <= 30:
                    details['matched_pattern'] = pattern
                    details['raw_match'] = match.group(0)
                    return champagne, details
        
        return None, details
    
    def _extract_payment_method(self, text: str) -> Tuple[Optional[bool], Dict]:
        """支払い方法を抽出（True=カード, False=現金）"""
        details = {'matched_pattern': None, 'raw_match': None}
        
        text_lower = text.lower()
        
        # カード払いのキーワード
        card_keywords = ['カード', 'card', 'クレジット', 'credit', 'visa', 'master']
        for keyword in card_keywords:
            if keyword in text_lower:
                details['matched_pattern'] = f'キーワード検出: {keyword}'
                return True, details
        
        # 現金払いのキーワード
        cash_keywords = ['現金', 'cash', 'キャッシュ']
        for keyword in cash_keywords:
            if keyword in text_lower:
                details['matched_pattern'] = f'キーワード検出: {keyword}'
                return False, details
        
        return None, details
    
    def calculate_confidence(self, extracted_data: Dict, ocr_result: Dict) -> float:
        """
        抽出結果の信頼度を計算
        """
        score = 0.0
        weights = {
            'total_amount': 0.35,  # 金額は最重要
            'date': 0.15,
            'customer_name': 0.15,
            'drink_count': 0.10,
            'champagne_type': 0.10,
            'is_card': 0.05,
            'ocr_confidence': 0.10
        }
        
        # 各フィールドのスコア計算
        if extracted_data.get('total_amount'):
            score += weights['total_amount']
        
        if extracted_data.get('date'):
            score += weights['date']
        
        if extracted_data.get('customer_name'):
            score += weights['customer_name']
        
        if extracted_data.get('drink_count'):
            score += weights['drink_count']
        
        if extracted_data.get('champagne_type'):
            score += weights['champagne_type']
        
        if extracted_data.get('is_card') is not None:
            score += weights['is_card']
        
        # OCR信頼度を加味
        ocr_confidence = ocr_result.get('confidence', 0.5)
        score += weights['ocr_confidence'] * ocr_confidence
        
        return min(score, 1.0)
    
    def scan_receipt(self, image_data_base64: str) -> Dict[str, Any]:
        """
        メイン処理: 伝票画像をスキャンして構造化データを返す
        
        Args:
            image_data_base64: Base64エンコードされた画像データ
                              (data:image/jpeg;base64,... 形式もOK)
        
        Returns:
            {
                'success': bool,
                'image_url': str,
                'image_hash': str,
                'extracted_data': {...},
                'confidence_score': float,
                'ocr_text': str,
                'error': str (エラー時のみ)
            }
        """
        try:
            # Base64デコード
            if ',' in image_data_base64:
                # data:image/jpeg;base64,... 形式
                image_data_base64 = image_data_base64.split(',')[1]
            
            image_data = base64.b64decode(image_data_base64)
            
            # 画像の前処理
            processed_image = self.preprocess_image(image_data)
            
            # 画像アップロード
            image_url, image_hash = self.upload_image(processed_image)
            
            # OCR実行
            ocr_result = self.perform_ocr(processed_image)
            
            if 'error' in ocr_result and not ocr_result.get('text'):
                return {
                    'success': False,
                    'error': ocr_result['error'],
                    'image_url': image_url,
                    'image_hash': image_hash
                }
            
            # データ抽出
            extracted_data = self.extract_data(ocr_result['text'])
            
            # 信頼度計算
            confidence = self.calculate_confidence(extracted_data, ocr_result)
            
            return {
                'success': True,
                'image_url': image_url,
                'image_hash': image_hash,
                'extracted_data': extracted_data,
                'confidence_score': confidence,
                'ocr_text': ocr_result['text'],
                'is_test_mode': ocr_result.get('is_test_mode', False)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }


# シングルトンインスタンス
_scanner_instance = None

def get_receipt_scanner() -> ReceiptScanner:
    """スキャナーのシングルトンインスタンスを取得"""
    global _scanner_instance
    if _scanner_instance is None:
        _scanner_instance = ReceiptScanner()
    return _scanner_instance

