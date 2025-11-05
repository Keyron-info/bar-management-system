from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import datetime, date, timedelta
from typing import List, Optional

# インポート
from database import (
    get_db, create_tables, User, Store, Employee, DailyReport, 
    Receipt, DailySales, SalesDetail, run_migration
)
from schemas import (
    # 店舗関連
    StoreCreate, StoreResponse, 
    # 従業員関連
    EmployeeCreate, EmployeeUpdate, EmployeeResponse,
    # 認証関連
    UserCreate, UserLogin, UserResponse, Token,
    # 日報関連
    DailyReportInput, DailyReportResponse, ReceiptInput, ReceiptResponse,
    SalesDetailInput, SalesDetailResponse,
    # 既存互換
    SalesInput, SalesResponse,
    # 統計関連
    StoreStatistics, EmployeeStatistics, DailyCalculationResponse
)
from auth import (
    get_password_hash, create_access_token, authenticate_user_with_store,
    get_current_active_user, get_current_store, require_manager, require_owner,
    generate_store_code, generate_employee_code, validate_store_access,
    get_store_by_code, validate_store_for_user_creation, create_user_session_data,
    filter_by_store
)

# FastAPIアプリケーションの作成
app = FastAPI(title="バー管理システム API", version="2.0.0")

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    import traceback
    print(f"Global exception: {exc}")
    print(f"Traceback: {traceback.format_exc()}")
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"}  # str(e) → str(exc) に修正
    )
#　CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://bar-management-system-two.vercel.app",  # 本番のみ
        "*",  # その他も許可
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 起動時にテーブル作成とマイグレーション実行
@app.on_event("startup")
async def startup_event():
    try:
        run_migration()
        print("✅ データベース初期化完了")
    except Exception as e:
        print(f"❌ データベース初期化エラー: {e}")

# ヘルスチェック
@app.get("/")
async def root():
    return {"message": "バー管理システム API v2.0.0 - マルチテナント対応"}

# ===== 認証系API =====

@app.post("/api/auth/register", response_model=UserResponse)
def register_user(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    """ユーザー登録（店舗コード必須）"""
    try:
        print(f"受信データ: {user_data}")  # デバッグ用
        
        # 店舗の存在確認
        store = validate_store_for_user_creation(db, user_data.store_code)
        print(f"店舗確認: {store}")  # デバッグ用
        
        # 既存ユーザー確認
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="このメールアドレスは既に登録されています"
            )
        
        # 新規ユーザー作成
        new_user = User(
            store_id=store.id,
            email=user_data.email,
            password_hash=get_password_hash(user_data.password),
            name=user_data.name,
            role=user_data.role
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        print(f"ユーザー作成成功: {new_user.id}")  # デバッグ用
        return new_user
        
    except Exception as e:
        print(f"エラー詳細: {str(e)}")  # 追加
        print(f"エラータイプ: {type(e)}")  # 追加
        import traceback
        print(f"トレースバック: {traceback.format_exc()}")  # 追加
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"ユーザー登録に失敗しました: {str(e)}"
        )

@app.post("/api/auth/login", response_model=Token)
def login_user(
    login_data: UserLogin,
    db: Session = Depends(get_db)
):
    """ログイン（店舗コード付き）"""
    user, error_message = authenticate_user_with_store(
        db, login_data.email, login_data.password, login_data.store_code
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error_message or "認証に失敗しました",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 店舗情報取得
    store = db.query(Store).filter(Store.id == user.store_id).first()
    
    # JWTトークン作成
    session_data = create_user_session_data(user, store)
    access_token = create_access_token(data=session_data)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

# ===== 店舗管理API =====

@app.post("/api/stores", response_model=StoreResponse)
def create_store(
    store_data: StoreCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner)
):
    """新規店舗作成（オーナー権限必要）"""
    try:
        # 店舗コード重複チェック
        existing_store = db.query(Store).filter(Store.store_code == store_data.store_code).first()
        if existing_store:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="店舗コードが既に存在します"
            )
        
        new_store = Store(
            store_code=store_data.store_code,
            store_name=store_data.store_name,
            address=store_data.address,
            phone_number=store_data.phone_number
        )
        
        db.add(new_store)
        db.commit()
        db.refresh(new_store)
        
        return new_store
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"店舗作成に失敗しました: {str(e)}"
        )

@app.get("/api/stores/current", response_model=StoreResponse)
def get_current_store_info(
    current_store: Store = Depends(get_current_store)
):
    """現在のユーザーの店舗情報取得"""
    return current_store

# ===== 従業員管理API =====

@app.post("/api/employees", response_model=EmployeeResponse)
def create_employee(
    employee_data: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager),
    current_store: Store = Depends(get_current_store)
):
    """従業員登録（店長権限必要）"""
    try:
        # 従業員コード重複チェック（同一店舗内）
        existing_employee = db.query(Employee).filter(
            Employee.store_id == current_store.id,
            Employee.employee_code == employee_data.employee_code
        ).first()
        
        if existing_employee:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="従業員コードが既に存在します"
            )
        
        new_employee = Employee(
            store_id=current_store.id,
            employee_code=employee_data.employee_code,
            name=employee_data.name,
            email=employee_data.email,
            role=employee_data.role,
            hire_date=employee_data.hire_date
        )
        
        db.add(new_employee)
        db.commit()
        db.refresh(new_employee)
        
        return new_employee
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"従業員登録に失敗しました: {str(e)}"
        )

@app.get("/api/employees", response_model=List[EmployeeResponse])
def get_employees(
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    current_store: Store = Depends(get_current_store)
):
    """従業員一覧取得（店舗内のみ）"""
    query = db.query(Employee).filter(Employee.store_id == current_store.id)
    
    if is_active is not None:
        query = query.filter(Employee.is_active == is_active)
    
    employees = query.order_by(Employee.employee_code).offset(skip).limit(limit).all()
    return employees

@app.get("/api/employees/generate-code")
def generate_new_employee_code(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager),
    current_store: Store = Depends(get_current_store)
):
    """新しい従業員コードを生成"""
    return {
        "suggested_code": generate_employee_code(db, current_store.id),
        "store_id": current_store.id
    }

# ===== 日報管理API =====

@app.post("/api/daily-reports", response_model=DailyReportResponse)
def create_daily_report(
    report_data: DailyReportInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    current_store: Store = Depends(get_current_store)
):
    """日報作成（売上詳細対応）"""
    try:
        # 日報メインデータ作成
        db_report = DailyReport(
            store_id=current_store.id,
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
        
        # 伝票データ作成
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
        
        # 売上詳細データ作成
        for sales_detail_data in report_data.sales_details:
            # 従業員の存在確認（同一店舗内）
            employee = db.query(Employee).filter(
                Employee.id == sales_detail_data.employee_id,
                Employee.store_id == current_store.id
            ).first()
            
            if not employee:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"従業員ID {sales_detail_data.employee_id} が見つかりません"
                )
            
            db_sales_detail = SalesDetail(
                daily_report_id=db_report.id,
                employee_id=sales_detail_data.employee_id,
                drink_count=sales_detail_data.drink_count,
                champagne_count=sales_detail_data.champagne_count,
                customer_info=sales_detail_data.customer_info,
                notes=sales_detail_data.notes
            )
            db.add(db_sales_detail)
        
        db.commit()
        db.refresh(db_report)
        
        return db_report
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"日報の保存に失敗しました: {str(e)}"
        )

@app.get("/api/daily-reports", response_model=List[DailyReportResponse])
def get_daily_reports(
    skip: int = 0,
    limit: int = 100,
    employee_name: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    current_store: Store = Depends(get_current_store)
):
    """日報一覧取得（店舗内データのみ）"""
    query = db.query(DailyReport).filter(DailyReport.store_id == current_store.id)
    
    # 権限に応じてフィルタリング
    if current_user.role != "manager":
        query = query.filter(DailyReport.employee_name == current_user.name)
    elif employee_name:
        query = query.filter(DailyReport.employee_name == employee_name)
    
    # 日付フィルタリング
    if start_date:
        query = query.filter(DailyReport.date >= start_date)
    if end_date:
        query = query.filter(DailyReport.date <= end_date)
    
    reports = query.order_by(DailyReport.date.desc()).offset(skip).limit(limit).all()
    return reports

# ===== 統計・分析API =====

@app.get("/api/statistics/employee-performance")
def get_employee_performance(
    year: int = None,
    month: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager),
    current_store: Store = Depends(get_current_store)
):
    """従業員パフォーマンス分析（店長権限必要）"""
    if not year:
        year = datetime.now().year
    if not month:
        month = datetime.now().month
    
    # 従業員別の売上詳細集計
    performance_data = db.query(
        Employee.id,
        Employee.employee_code,
        Employee.name,
        func.sum(SalesDetail.drink_count).label('total_drinks'),
        func.sum(SalesDetail.champagne_count).label('total_champagne'),
        func.count(SalesDetail.id).label('service_count')
    ).join(
        SalesDetail, Employee.id == SalesDetail.employee_id
    ).join(
        DailyReport, SalesDetail.daily_report_id == DailyReport.id
    ).filter(
        Employee.store_id == current_store.id,
        extract('year', DailyReport.date) == year,
        extract('month', DailyReport.date) == month
    ).group_by(Employee.id).all()
    
    return [{
        "employee_id": emp.id,
        "employee_code": emp.employee_code,
        "employee_name": emp.name,
        "total_drinks": emp.total_drinks or 0,
        "total_champagne": emp.total_champagne or 0,
        "service_count": emp.service_count or 0
    } for emp in performance_data]

# ===== 既存API（後方互換性保持）=====

@app.post("/api/sales", response_model=SalesResponse)
def create_sales(
    sales_data: SalesInput, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    current_store: Store = Depends(get_current_store)
):
    """売上データ作成（後方互換性）"""
    try:
        db_sales = DailySales(
            store_id=current_store.id,  # 店舗ID追加
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

@app.get("/api/sales", response_model=List[SalesResponse])
def get_sales(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    current_store: Store = Depends(get_current_store)
):
    """売上データ取得（店舗分離対応）"""
    query = db.query(DailySales).filter(DailySales.store_id == current_store.id)
    
    # 店長は全データ、従業員は自分のデータのみ表示
    if current_user.role != "manager":
        query = query.filter(DailySales.employee_name == current_user.name)
    
    sales = query.order_by(DailySales.date.desc()).offset(skip).limit(limit).all()
    return sales

# ===== システム管理API =====

@app.get("/api/system/migrate")
def run_system_migration(
    current_user: User = Depends(require_owner)
):
    """システム全体のマイグレーション実行（オーナー権限必要）"""
    try:
        run_migration()
        return {"message": "マイグレーションが正常に完了しました"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"マイグレーション実行に失敗しました: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)