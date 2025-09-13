from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import List
from datetime import timedelta, datetime, date
import uvicorn
import os

# 既存のインポート
from database import get_db, create_tables, DailySales, User, DailyReport, Receipt
from schemas import (
    SalesInput, SalesResponse, UserCreate, UserLogin, UserResponse, Token,
    DailyReportInput, DailyReportResponse, DailyCalculationResponse, ReceiptResponse
)
from auth import (
    get_password_hash, 
    authenticate_user, 
    create_access_token, 
    get_current_active_user,
    require_manager,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

app = FastAPI(title="バー管理システム API", version="2.0.0")

# CORS設定（本番環境対応）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 開発段階では全てのオリジンを許可
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# プリフライトリクエストの明示的処理
@app.options("/{path:path}")
async def handle_options(path: str):
    return JSONResponse(
        content={},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Max-Age": "86400",
        }
    )

# UTF-8レスポンス用ミドルウェア
@app.middleware("http")
async def add_charset_header(request, call_next):
    response = await call_next(request)
    if response.headers.get("content-type", "").startswith("application/json"):
        response.headers["content-type"] = "application/json; charset=utf-8"
    return response

# アプリ起動時にデータベーステーブルを作成
@app.on_event("startup")
def startup_event():
    create_tables()

@app.get("/")
async def root():
    return JSONResponse(
        content={"message": "バー管理システム API が正常に動作しています"},
        media_type="application/json; charset=utf-8"
    )

@app.get("/api/health")
async def health_check():
    return JSONResponse(
        content={"status": "OK", "message": "API is running"},
        media_type="application/json; charset=utf-8"
    )

# ユーザー登録API
@app.post("/api/auth/register", response_model=UserResponse)
def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    try:
        # メールアドレスの重複チェック
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="このメールアドレスは既に登録されています"
            )
        
        # パスワードをハッシュ化してユーザーを作成
        hashed_password = get_password_hash(user_data.password)
        db_user = User(
            email=user_data.email,
            password_hash=hashed_password,
            name=user_data.name,
            role=user_data.role
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"ユーザー登録に失敗しました: {str(e)}"
        )

# ログインAPI
@app.post("/api/auth/login", response_model=Token)
def login_user(user_data: UserLogin, db: Session = Depends(get_db)):
    user = authenticate_user(db, user_data.email, user_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="メールアドレスまたはパスワードが間違っています",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

# 現在のユーザー情報取得API
@app.get("/api/auth/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    return current_user

# === 新しい日報API ===

# 日報提出API
@app.post("/api/daily-report", response_model=DailyReportResponse)
def create_daily_report(
    report_data: DailyReportInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    try:
        # 日報メインデータを作成
        db_report = DailyReport(
            date=report_data.date,
            employee_name=report_data.employee_name,
            total_sales=report_data.total_sales,
            alcohol_cost=report_data.alcohol_cost,
            other_expenses=report_data.other_expenses,
            card_sales=report_data.card_sales,
            drink_count=report_data.drink_count,
            champagne_type=report_data.champagne_type,
            champagne_price=report_data.champagne_price,
            work_start_time=report_data.work_start_time,
            work_end_time=report_data.work_end_time
        )
        db.add(db_report)
        db.commit()
        db.refresh(db_report)
        
        # 伝票データを作成
        for receipt_data in report_data.receipts:
            db_receipt = Receipt(
                daily_report_id=db_report.id,
                customer_name=receipt_data.customer_name,
                employee_name=receipt_data.employee_name,
                drink_count=receipt_data.drink_count,
                champagne_type=receipt_data.champagne_type,
                champagne_price=receipt_data.champagne_price,
                amount=receipt_data.amount,
                is_card=receipt_data.is_card
            )
            db.add(db_receipt)
        
        db.commit()
        
        # レスポンス用にデータを再取得
        db.refresh(db_report)
        return db_report
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"日報の保存に失敗しました: {str(e)}"
        )

# 日報一覧取得API
@app.get("/api/daily-reports", response_model=List[DailyReportResponse])
def get_daily_reports(
    skip: int = 0,
    limit: int = 100,
    employee_name: str = None,
    start_date: date = None,
    end_date: date = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(DailyReport)
    
    # 権限に応じてフィルタリング
    if current_user.role != "manager":
        query = query.filter(DailyReport.employee_name == current_user.name)
    elif employee_name:
        query = query.filter(DailyReport.employee_name == employee_name)
    
    # 日付フィルタ
    if start_date:
        query = query.filter(DailyReport.date >= start_date)
    if end_date:
        query = query.filter(DailyReport.date <= end_date)
    
    reports = query.order_by(DailyReport.date.desc()).offset(skip).limit(limit).all()
    return reports

# 特定の日報取得API
@app.get("/api/daily-report/{report_id}", response_model=DailyReportResponse)
def get_daily_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    report = db.query(DailyReport).filter(DailyReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="日報が見つかりません")
    
    # 権限チェック
    if current_user.role != "manager" and report.employee_name != current_user.name:
        raise HTTPException(status_code=403, detail="この日報にアクセスする権限がありません")
    
    return report

# 日報の計算結果取得API
@app.get("/api/daily-report/{report_id}/calculations", response_model=DailyCalculationResponse)
def get_daily_report_calculations(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    report = db.query(DailyReport).filter(DailyReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="日報が見つかりません")
    
    # 権限チェック
    if current_user.role != "manager" and report.employee_name != current_user.name:
        raise HTTPException(status_code=403, detail="この日報にアクセスする権限がありません")
    
    # 計算
    total_receipt_amount = sum(receipt.amount for receipt in report.receipts)
    total_expenses = report.alcohol_cost + report.other_expenses
    cash_remaining = report.total_sales - report.card_sales
    net_profit = report.total_sales - total_expenses
    
    return {
        "net_profit": net_profit,
        "cash_remaining": cash_remaining,
        "total_expenses": total_expenses,
        "total_receipt_amount": total_receipt_amount
    }

# === 既存の売上データAPI（後方互換性のため保持） ===

# 売上データ投稿API（認証必須）
@app.post("/api/sales", response_model=SalesResponse)
def create_sales(
    sales_data: SalesInput, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    try:
        # 新しい売上データをデータベースに保存
        db_sales = DailySales(
            date=sales_data.date,
            employee_name=sales_data.employee_name,
            total_sales=sales_data.total_sales,
            drink_count=sales_data.drink_count,
            champagne_count=sales_data.champagne_count,
            catch_count=sales_data.catch_count,
            work_hours=sales_data.work_hours
        )
        db.add(db_sales)
        db.commit()
        db.refresh(db_sales)
        return db_sales
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"売上データの保存に失敗しました: {str(e)}"
        )

# 売上データ取得API（認証必須）
@app.get("/api/sales", response_model=List[SalesResponse])
def get_sales(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # 店長は全データ、従業員は自分のデータのみ表示
    if current_user.role == "manager":
        sales = db.query(DailySales).order_by(DailySales.date.desc()).offset(skip).limit(limit).all()
    else:
        sales = db.query(DailySales).filter(
            DailySales.employee_name == current_user.name
        ).order_by(DailySales.date.desc()).offset(skip).limit(limit).all()
    return sales

# 日次売上集計API（認証必須）
@app.get("/api/sales/daily-summary")
def get_daily_summary(
    target_date: str = None, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if target_date:
        target = datetime.fromisoformat(target_date).date()
    else:
        target = date.today()
    
    # 権限に応じてフィルタリング
    query = db.query(DailySales).filter(DailySales.date == target)
    if current_user.role != "manager":
        query = query.filter(DailySales.employee_name == current_user.name)
    
    # 指定日の売上合計
    daily_total = query.with_entities(func.sum(DailySales.total_sales)).scalar() or 0
    drinks_total = query.with_entities(func.sum(DailySales.drink_count)).scalar() or 0
    champagne_total = query.with_entities(func.sum(DailySales.champagne_count)).scalar() or 0
    catch_total = query.with_entities(func.sum(DailySales.catch_count)).scalar() or 0
    
    return {
        "date": target,
        "total_sales": daily_total,
        "drink_count": drinks_total,
        "champagne_count": champagne_total,
        "catch_count": catch_total
    }

# 月次売上集計API（認証必須）
@app.get("/api/sales/monthly-summary")
def get_monthly_summary(
    year: int = None, 
    month: int = None, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if not year:
        year = datetime.now().year
    if not month:
        month = datetime.now().month
    
    # 権限に応じてフィルタリング
    query = db.query(DailySales).filter(
        extract('year', DailySales.date) == year,
        extract('month', DailySales.date) == month
    )
    if current_user.role != "manager":
        query = query.filter(DailySales.employee_name == current_user.name)
    
    # 月次売上合計
    monthly_total = query.with_entities(func.sum(DailySales.total_sales)).scalar() or 0
    drinks_total = query.with_entities(func.sum(DailySales.drink_count)).scalar() or 0
    champagne_total = query.with_entities(func.sum(DailySales.champagne_count)).scalar() or 0
    
    return {
        "year": year,
        "month": month,
        "total_sales": monthly_total,
        "drink_count": drinks_total,
        "champagne_count": champagne_total
    }

# 従業員別売上ランキングAPI（店長のみ）
@app.get("/api/sales/employee-ranking")
def get_employee_ranking(
    year: int = None, 
    month: int = None, 
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    if not year:
        year = datetime.now().year
    if not month:
        month = datetime.now().month
    
    # 従業員別の売上合計（店長のみアクセス可能）
    ranking = db.query(
        DailySales.employee_name,
        func.sum(DailySales.total_sales).label('total_sales'),
        func.sum(DailySales.drink_count).label('total_drinks'),
        func.sum(DailySales.champagne_count).label('total_champagne'),
        func.sum(DailySales.catch_count).label('total_catch'),
        func.sum(DailySales.work_hours).label('total_hours')
    ).filter(
        extract('year', DailySales.date) == year,
        extract('month', DailySales.date) == month
    ).group_by(DailySales.employee_name).order_by(
        func.sum(DailySales.total_sales).desc()
    ).all()
    
    return [
        {
            "employee_name": r.employee_name,
            "total_sales": r.total_sales,
            "total_drinks": r.total_drinks,
            "total_champagne": r.total_champagne,
            "total_catch": r.total_catch,
            "total_hours": r.total_hours
        }
        for r in ranking
    ]

# 売上データ削除API（認証必須、店長のみ）
@app.delete("/api/sales/{sales_id}")
def delete_sales(
    sales_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    sales = db.query(DailySales).filter(DailySales.id == sales_id).first()
    if not sales:
        raise HTTPException(status_code=404, detail="売上データが見つかりません")
    
    # 権限チェック：店長のみ削除可能
    if current_user.role != "manager":
        raise HTTPException(status_code=403, detail="この操作を実行する権限がありません")
    
    db.delete(sales)
    db.commit()
    return {"message": "売上データを削除しました"}

# 日報削除API（認証必須、店長のみ）
@app.delete("/api/daily-report/{report_id}")
def delete_daily_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    report = db.query(DailyReport).filter(DailyReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="日報が見つかりません")
    
    # 権限チェック：店長のみ削除可能
    if current_user.role != "manager":
        raise HTTPException(status_code=403, detail="この操作を実行する権限がありません")
    
    db.delete(report)
    db.commit()
    return {"message": "日報を削除しました"}

# デバッグ用エンドポイント
@app.get("/api/debug/cors")
async def debug_cors():
    return {"message": "CORS test successful", "status": "OK"}

if __name__ == "__main__":
    # 本番環境ではPORTを環境変数から取得
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)