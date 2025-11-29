# routes/receipt_scan.py - AI伝票スキャンAPIエンドポイント
"""
伝票のAIスキャン機能を提供するAPIエンドポイント
- 画像アップロード & OCR処理
- 抽出結果の確認・修正
- 伝票作成・日報反映
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional
import json

from database_saas import (
    get_db, ReceiptImage, Receipt, DailyReport, Employee, Store,
    ProcessingStatus
)
from schemas_saas import (
    ReceiptScanRequest, ReceiptScanResponse, ExtractedReceiptData,
    ReceiptScanConfirmRequest, ReceiptScanConfirmResponse,
    ReceiptImageResponse
)
from auth_saas import get_current_employee
from services.receipt_scanner import get_receipt_scanner

router = APIRouter(
    prefix="/api/receipts",
    tags=["Receipt Scan"]
)


@router.post("/scan", response_model=ReceiptScanResponse)
async def scan_receipt(
    request: ReceiptScanRequest,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_employee)
):
    """
    伝票画像をスキャンしてOCR処理を実行
    
    - 画像をBase64で受け取り
    - Google Cloud Vision APIでOCR処理
    - 金額・日付・顧客名などを自動抽出
    - 画像をCloudinaryに保存
    """
    try:
        # スキャナーを取得
        scanner = get_receipt_scanner()
        
        # OCR処理実行
        result = scanner.scan_receipt(request.image_data)
        
        if not result.get('success'):
            return ReceiptScanResponse(
                success=False,
                error=result.get('error', '処理中にエラーが発生しました'),
                is_test_mode=result.get('is_test_mode', False)
            )
        
        # 抽出データを整形
        extracted = result.get('extracted_data', {})
        extracted_data = ExtractedReceiptData(
            total_amount=extracted.get('total_amount'),
            customer_name=extracted.get('customer_name'),
            employee_name=extracted.get('employee_name') or current_user.name,
            date=extracted.get('date'),
            drink_count=extracted.get('drink_count'),
            champagne_type=extracted.get('champagne_type'),
            champagne_price=extracted.get('champagne_price'),
            is_card=extracted.get('is_card')
        )
        
        # データベースに保存
        receipt_image = ReceiptImage(
            store_id=current_user.store_id,
            employee_id=current_user.id,
            daily_report_id=request.daily_report_id,
            image_url=result.get('image_url', ''),
            image_hash=result.get('image_hash'),
            ocr_raw_response=result.get('ocr_text', ''),
            ocr_extracted_data=json.dumps(extracted, ensure_ascii=False),
            processing_status=ProcessingStatus.COMPLETED,
            confidence_score=result.get('confidence_score', 0),
            uploaded_at=datetime.utcnow(),
            processed_at=datetime.utcnow()
        )
        
        db.add(receipt_image)
        db.commit()
        db.refresh(receipt_image)
        
        return ReceiptScanResponse(
            success=True,
            receipt_image_id=receipt_image.id,
            image_url=result.get('image_url'),
            extracted_data=extracted_data,
            confidence_score=result.get('confidence_score'),
            ocr_text=result.get('ocr_text'),
            is_test_mode=result.get('is_test_mode', False)
        )
        
    except Exception as e:
        print(f"❌ スキャンエラー: {e}")
        return ReceiptScanResponse(
            success=False,
            error=str(e)
        )


@router.put("/scan/{receipt_image_id}/confirm", response_model=ReceiptScanConfirmResponse)
async def confirm_scan_result(
    receipt_image_id: int,
    request: ReceiptScanConfirmRequest,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_employee)
):
    """
    スキャン結果を確認して伝票を作成
    
    - 手動修正内容を反映
    - 伝票レコードを作成
    - 日報に自動追加
    """
    try:
        # スキャン画像を取得
        receipt_image = db.query(ReceiptImage).filter(
            ReceiptImage.id == receipt_image_id,
            ReceiptImage.store_id == current_user.store_id
        ).first()
        
        if not receipt_image:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="スキャン画像が見つかりません"
            )
        
        # 日報IDの確認（リクエストまたはスキャン時に設定されたもの）
        daily_report_id = request.daily_report_id or receipt_image.daily_report_id
        
        if not daily_report_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="日報IDが指定されていません"
            )
        
        # 日報の存在確認
        daily_report = db.query(DailyReport).filter(
            DailyReport.id == daily_report_id,
            DailyReport.store_id == current_user.store_id
        ).first()
        
        if not daily_report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="日報が見つかりません"
            )
        
        # 伝票データの準備
        confirmed = request.confirmed_data
        
        # 伝票を作成
        receipt = Receipt(
            daily_report_id=daily_report_id,
            customer_name=confirmed.customer_name or "不明",
            employee_name=confirmed.employee_name or current_user.name,
            drink_count=confirmed.drink_count or 0,
            champagne_type=confirmed.champagne_type or "",
            champagne_price=confirmed.champagne_price or 0,
            amount=confirmed.total_amount or 0,
            is_card=confirmed.is_card or False,
            receipt_image_id=receipt_image.id,
            is_auto_generated=True,
            manual_corrections=json.dumps(request.manual_corrections or {}, ensure_ascii=False)
        )
        
        db.add(receipt)
        
        # スキャン画像を確認済みに更新
        receipt_image.is_verified = True
        receipt_image.daily_report_id = daily_report_id
        
        db.commit()
        db.refresh(receipt)
        
        # 日報の売上を更新
        _update_daily_report_totals(db, daily_report)
        
        return ReceiptScanConfirmResponse(
            success=True,
            receipt_id=receipt.id,
            daily_report_id=daily_report_id,
            message="伝票を日報に追加しました"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ 確認エラー: {e}")
        return ReceiptScanConfirmResponse(
            success=False,
            message=str(e)
        )


@router.get("/scan/history", response_model=list)
async def get_scan_history(
    daily_report_id: Optional[int] = None,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_employee)
):
    """
    スキャン履歴を取得
    """
    query = db.query(ReceiptImage).filter(
        ReceiptImage.store_id == current_user.store_id
    )
    
    if daily_report_id:
        query = query.filter(ReceiptImage.daily_report_id == daily_report_id)
    
    images = query.order_by(
        ReceiptImage.created_at.desc()
    ).limit(limit).all()
    
    return [
        {
            "id": img.id,
            "image_url": img.image_url,
            "processing_status": img.processing_status.value if img.processing_status else "unknown",
            "confidence_score": img.confidence_score,
            "is_verified": img.is_verified,
            "uploaded_at": img.uploaded_at.isoformat() if img.uploaded_at else None,
            "daily_report_id": img.daily_report_id
        }
        for img in images
    ]


@router.delete("/scan/{receipt_image_id}")
async def delete_scan(
    receipt_image_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_employee)
):
    """
    スキャン画像を削除
    """
    receipt_image = db.query(ReceiptImage).filter(
        ReceiptImage.id == receipt_image_id,
        ReceiptImage.store_id == current_user.store_id
    ).first()
    
    if not receipt_image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="スキャン画像が見つかりません"
        )
    
    # 既に確認済みの場合は削除不可
    if receipt_image.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="この画像は伝票に紐付いているため削除できません"
        )
    
    db.delete(receipt_image)
    db.commit()
    
    return {"success": True, "message": "スキャン画像を削除しました"}


def _update_daily_report_totals(db: Session, daily_report: DailyReport):
    """
    日報の合計値を更新
    """
    # 関連する伝票を取得
    receipts = db.query(Receipt).filter(
        Receipt.daily_report_id == daily_report.id
    ).all()
    
    # 集計
    total_sales = sum(r.amount for r in receipts)
    card_sales = sum(r.amount for r in receipts if r.is_card)
    drink_count = sum(r.drink_count for r in receipts)
    champagne_price = sum(r.champagne_price for r in receipts)
    champagne_types = [r.champagne_type for r in receipts if r.champagne_type]
    
    # 更新
    daily_report.total_sales = total_sales
    daily_report.card_sales = card_sales
    daily_report.drink_count = drink_count
    daily_report.champagne_price = champagne_price
    daily_report.champagne_type = ", ".join(set(champagne_types))
    
    db.commit()

