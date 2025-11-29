from fastapi import FastAPI, Depends, HTTPException, status, Request, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import List, Optional
from datetime import timedelta, datetime, date
from contextlib import asynccontextmanager
import uvicorn
import os

# Google OAuth認証用インポート
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

# SaaS対応インポート
from database_saas import (
    get_db, create_tables, SystemAdmin, Organization, Store, Employee, 
    Subscription, InviteCode, DailyReport, Receipt, AuditLog,
    PersonalGoal, StoreGoal, Shift, ShiftRequest, Notification,
    ShiftStatus, ShiftRequestType, NotificationType,
    generate_store_code, generate_employee_code, generate_invite_code,
    create_super_admin, UserRole, SubscriptionStatus, InviteStatus
)
from schemas_saas import (
    # 認証関連
    SystemAdminLogin, SystemAdminResponse, SystemAdminToken,
    EmployeeLogin, EmployeeResponse, EmployeeToken, TokenResponse,
    EmployeeRegisterInput, EmployeeRegisterResponse, 
    
    # 組織・店舗関連
    OrganizationCreate, OrganizationResponse, OrganizationUpdate,
    StoreCreate, StoreResponse, StoreUpdate, StoreSetupWizard, StoreSetupResponse,
    
    # サブスクリプション関連
    SubscriptionCreate, SubscriptionResponse, SubscriptionUpdate,
    
    # 従業員関連
    EmployeeCreate, EmployeeUpdate, BulkEmployeeCreate, BulkEmployeeResponse,
    
    # 招待コード関連
    InviteCodeCreate, InviteCodeResponse, InviteCodeUse,
    
    # 日報関連
    DailyReportCreate, DailyReportResponse, DailyReportUpdate, DailyReportApproval,
    
    # ダッシュボード関連
    SuperAdminDashboardResponse, OrganizationDashboardResponse, StoreDashboardResponse,
    
    # フィルター・ページネーション
    PaginationParams, PaginatedResponse, EmployeeFilter, DailyReportFilter,
    
    # 個人目標関連
    PersonalGoalInput, PersonalGoalResponse,
    
    # 店舗目標関連
    StoreGoalInput, StoreGoalResponse,
    
    # シフト関連
    ShiftCreate, ShiftUpdate, ShiftResponse,
    ShiftRequestCreate, ShiftRequestResponse,
    
    # 通知関連
    NotificationCreate, NotificationResponse, NotificationMarkRead,
    
    # 後方互換性
    LegacyTokenResponse, LegacyUserResponse,
    
    # エラーレスポンス
    ErrorResponse, ValidationErrorResponse
)
from auth_saas import (
    get_password_hash, authenticate_system_admin, authenticate_employee,
    create_access_token, get_current_user, get_current_admin, get_current_employee,
    require_super_admin, require_role, require_store_access, require_organization_access,
    log_user_action, get_user_accessible_stores, get_user_accessible_organizations,
    get_legacy_user_from_employee, create_security_headers, validate_password_strength,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

# Googleクライアント設定
GOOGLE_CLIENT_ID = "650805213837-gr5gm541euvep495jahcnm3ku0r6vv72.apps.googleusercontent.com"

# ★★★ ここでFastAPIアプリを作成 ★★★
app = FastAPI(
    title="バー管理システム SaaS API", 
    version="3.0.0",
    description="マルチテナント対応バー管理システム"
)

# CORS設定（本番環境対応）
# backend_SaaS/main_saas.py
# 28行目から60行目あたりのCORS設定を以下に完全置き換え

# ★★★ CORS設定（本番環境対応 - 完全版）★★★
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 開発中は全て許可
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# プリフライトリクエストの明示的処理
@app.options("/{path:path}")
async def handle_options(path: str):
    """すべてのOPTIONSリクエストを処理"""
    return JSONResponse(
        content={},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "86400",
        }
    )

# セキュリティヘッダーミドルウェア
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    
    # CORSヘッダーを強制的に追加
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
    response.headers["Access-Control-Allow-Headers"] = "*"
    
    # UTF-8レスポンス
    if response.headers.get("content-type", "").startswith("application/json"):
        response.headers["content-type"] = "application/json; charset=utf-8"
    
    return response


# ========== 以下は既存のコードをそのまま残す ==========
# check_dependencies() 関数から続く...

# 依存関係チェック関数
def check_dependencies():
    """必要な依存関係をチェック"""
    missing_packages = []
    
    try:
        import passlib
    except ImportError:
        missing_packages.append("passlib[bcrypt]")
    
    try:
        import jose
    except ImportError:
        missing_packages.append("python-jose[cryptography]")
    
    try:
        import sqlalchemy
    except ImportError:
        missing_packages.append("sqlalchemy")
    
    try:
        import fastapi
    except ImportError:
        missing_packages.append("fastapi")
    
    try:
        import uvicorn
    except ImportError:
        missing_packages.append("uvicorn")
    
    if missing_packages:
        print("不足しているパッケージ:")
        for package in missing_packages:
            print(f"  - {package}")
        print("\n以下のコマンドでインストールしてください:")
        print(f"pip install {' '.join(missing_packages)}")
        return False
    
    return True

# アプリ起動時にデータベーステーブルを作成
@app.on_event("startup")
def startup_event():
    try:
        print("データベーステーブルを作成中...")
        create_tables()
        print("データベーステーブル作成完了")
        
        # 開発用スーパーアドミン作成
        print("スーパーアドミンを作成中...")
        try:
            admin = create_super_admin(
                email="admin@bar-management.com",
                password="admin123",
                name="システム管理者"
            )
            if admin:
                print(f"スーパーアドミン作成完了: {admin.email}")
            else:
                print("スーパーアドミンは既に存在します")
        except ImportError as e:
            print(f"警告: 必要なライブラリがインストールされていません: {e}")
            print("以下のコマンドを実行してください:")
            print("pip install passlib[bcrypt] python-jose[cryptography]")
        except Exception as e:
            print(f"スーパーアドミン作成エラー: {e}")
            print("アプリケーションは起動しますが、管理者機能が制限される可能性があります")
        
        print("SaaS API起動完了")
        
    except Exception as e:
        print(f"起動時エラー: {e}")
        print("アプリケーションは起動しますが、一部機能が制限される可能性があります")


# ====== AI伝票スキャンルーターを追加 ======
try:
    from routes.receipt_scan import router as receipt_scan_router
    app.include_router(receipt_scan_router)
    print("✅ 伝票スキャンAPIルーター登録完了")
except ImportError as e:
    print(f"⚠️ 伝票スキャンAPIルーター登録スキップ: {e}")


# ====== ヘルスチェック・基本エンドポイント ======

@app.get("/")
async def root():
    return JSONResponse(
        content={"message": "バー管理システム SaaS API が正常に動作しています", "version": "3.0.0"},
        media_type="application/json; charset=utf-8"
    )

@app.get("/api/health")
async def health_check():
    return JSONResponse(
        content={"status": "OK", "message": "SaaS API is running"},
        media_type="application/json; charset=utf-8"
    )

# ====== 認証エンドポイント ======

@app.post("/api/auth/admin/login")
def admin_login(
    login_data: SystemAdminLogin,
    request: Request,
    db: Session = Depends(get_db)
):
    """システム管理者ログイン"""
    admin = authenticate_system_admin(db, login_data.email, login_data.password)
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="メールアドレスまたはパスワードが正しくありません",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # JWTトークン作成
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"user_id": admin.id, "user_type": "admin", "email": admin.email},
        expires_delta=access_token_expires
    )
    
    # 監査ログ記録
    log_user_action(db, admin, "admin_login_success", "authentication", request=request)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "admin": {
            "id": admin.id,
            "email": admin.email,
            "name": admin.name,
            "is_super_admin": admin.is_super_admin,
            "can_create_organizations": admin.can_create_organizations,
            "can_manage_subscriptions": admin.can_manage_subscriptions,
            "can_access_all_data": admin.can_access_all_data,
            "is_active": admin.is_active,
            "created_at": admin.created_at.isoformat()
        }
    }

@app.post("/api/auth/employee/login")
def employee_login(
    username: str = Form(...),
    password: str = Form(...),
    store_code: str = Form(...),
    request: Request = None,
    db: Session = Depends(get_db)
):
    """従業員ログイン"""
    employee = authenticate_employee(db, username, password, store_code)
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="メールアドレス、パスワード、または店舗コードが正しくありません",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # JWTトークン作成
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"user_id": employee.id, "user_type": "employee", "email": employee.email},
        expires_delta=access_token_expires
    )
    
    # 監査ログ記録
    if request:
        log_user_action(db, employee, "employee_login", "authentication", request=request)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": employee.id,
            "store_id": employee.store_id,
            "employee_code": employee.employee_code,
            "name": employee.name,
            "email": employee.email,
            "role": employee.role,
            "is_active": employee.is_active,
            "created_at": employee.created_at.isoformat()
        }
    }

# 🆕 ====== Google OAuth認証エンドポイント ======

@app.post("/api/auth/google/employee")
def google_employee_login(
    token: str = Form(...),
    store_code: str = Form(...),
    db: Session = Depends(get_db)
):
    """Google OAuth - 従業員ログイン"""
    try:
        # Googleトークンを検証
        idinfo = id_token.verify_oauth2_token(
            token, 
            google_requests.Request(), 
            GOOGLE_CLIENT_ID
        )
        
        # メールアドレスを取得
        email = idinfo.get('email')
        name = idinfo.get('name', email.split('@')[0] if email else "ユーザー")
        
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Googleアカウントからメールアドレスを取得できませんでした"
            )
        
        # 店舗を検索
        store = db.query(Store).filter(Store.store_code == store_code).first()
        if not store:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="指定された店舗コードが見つかりません"
            )
        
        # メールアドレスで従業員を検索
        employee = db.query(Employee).filter(
            Employee.email == email,
            Employee.store_id == store.id
        ).first()
        
        # 従業員が見つからない場合は新規登録
        if not employee:
            # 従業員コード生成
            employee_code = generate_employee_code(store.store_code)
            
            # 新規従業員として登録
            employee = Employee(
                store_id=store.id,
                employee_code=employee_code,
                name=name,
                email=email,
                password_hash=get_password_hash("google_oauth_user"),  # ダミーパスワード
                role=UserRole.STAFF,  # デフォルトはスタッフ
                hire_date=date.today(),
                is_active=True
            )
            db.add(employee)
            db.commit()
            db.refresh(employee)
        
        # 非アクティブチェック
        if not employee.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="このアカウントは無効化されています"
            )
        
        # JWTトークン作成
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={
                "user_id": employee.id,
                "user_type": "employee",
                "email": employee.email,
                "store_id": employee.store_id
            },
            expires_delta=access_token_expires
        )
        
        # レスポンス
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": employee.id,
                "email": employee.email,
                "name": employee.name,
                "role": employee.role,
                "store_id": employee.store_id,
                "employee_code": employee.employee_code
            },
            "store": {
                "id": store.id,
                "store_code": store.store_code,
                "store_name": store.store_name
            }
        }
        
    except ValueError as e:
        # トークン検証失敗
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"無効なGoogleトークンです: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"認証エラー: {str(e)}"
        )


@app.post("/api/auth/google/admin")
def google_admin_login(
    token: str = Form(...),
    db: Session = Depends(get_db)
):
    """Google OAuth - スーパーアドミンログイン"""
    try:
        # Googleトークンを検証
        idinfo = id_token.verify_oauth2_token(
            token, 
            google_requests.Request(), 
            GOOGLE_CLIENT_ID
        )
        
        # メールアドレスを取得
        email = idinfo.get('email')
        
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Googleアカウントからメールアドレスを取得できませんでした"
            )
        
        # 管理者を検索
        admin = db.query(SystemAdmin).filter(
            SystemAdmin.email == email,
            SystemAdmin.is_active == True
        ).first()
        
        if not admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="このGoogleアカウントは管理者として登録されていません"
            )
        
        # JWTトークン作成
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"user_id": admin.id, "user_type": "admin", "email": admin.email},
            expires_delta=access_token_expires
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "admin": {
                "id": admin.id,
                "email": admin.email,
                "name": admin.name,
                "is_super_admin": admin.is_super_admin,
                "can_create_organizations": admin.can_create_organizations,
                "can_manage_subscriptions": admin.can_manage_subscriptions,
                "can_access_all_data": admin.can_access_all_data,
                "is_active": admin.is_active
            }
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"無効なGoogleトークンです: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"認証エラー: {str(e)}"
        )
    

# 後方互換性のためのレガシーログインエンドポイント
@app.post("/api/auth/login")
def legacy_login(
    login_data: EmployeeLogin,
    request: Request,
    db: Session = Depends(get_db)
):
    """既存フロントエンド用ログイン（後方互換性）"""
    employee = authenticate_employee(db, login_data.email, login_data.password, login_data.store_code)
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="メールアドレス、パスワード、または店舗コードが正しくありません",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"user_id": employee.id, "user_type": "employee", "email": employee.email},
        expires_delta=access_token_expires
    )
    
    # レガシー形式のユーザー情報
    legacy_user = get_legacy_user_from_employee(employee, db)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": legacy_user
    }
@app.post("/api/auth/employee/register")
def register_employee(
    register_data: EmployeeRegisterInput,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    新規従業員登録API
    店舗コードを使用して従業員アカウントを作成
    """
    try:
        # 1. 店舗コードの検証
        store = db.query(Store).filter(
            Store.store_code == register_data.store_code,
            Store.is_active == True
        ).first()
        
        if not store:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="無効な店舗コードです"
            )
        
        # 2. メールアドレスの重複チェック
        existing_employee = db.query(Employee).filter(
            Employee.email == register_data.email
        ).first()
        
        if existing_employee:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="このメールアドレスは既に登録されています"
            )
        
        # 3. パスワード強度チェック
        is_valid, msg = validate_password_strength(register_data.password)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=msg
            )
        
        # 4. 従業員コードの生成
        employee_code = generate_employee_code(register_data.store_code)
        
        # 5. 新規従業員の作成
        new_employee = Employee(
            store_id=store.id,
            employee_code=employee_code,
            name=register_data.name,
            email=register_data.email,
            password_hash=get_password_hash(register_data.password),
            role=UserRole.STAFF,  # デフォルトはスタッフ
            is_active=True,
            hire_date=date.today(),  # 🆕 デフォルトで今日の日付を設定
            employment_type="part_time"
        )
        
        db.add(new_employee)
        db.commit()
        db.refresh(new_employee)
        
        # 6. 監査ログ記録
        log_user_action(
            db, new_employee, "employee_register", "employee",
            resource_id=new_employee.id,
            changes={"name": register_data.name, "email": register_data.email},
            request=request
        )
        
        return {
            "id": new_employee.id,
            "employee_code": new_employee.employee_code,
            "name": new_employee.name,
            "email": new_employee.email,
            "role": new_employee.role.value,
            "store_name": store.store_name,
            "message": "アカウントが正常に作成されました"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"アカウント作成に失敗しました: {str(e)}"
        )


@app.get("/api/auth/verify-store-code/{store_code}")
def verify_store_code(
    store_code: str,
    db: Session = Depends(get_db)
):
    """
    店舗コードの検証API
    登録画面で店舗コードが有効かチェック
    """
    store = db.query(Store).filter(
        Store.store_code == store_code,
        Store.is_active == True
    ).first()
    
    if not store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="店舗コードが見つかりません"
        )
    
    return {
        "valid": True,
        "store_name": store.store_name,
        "store_type": store.store_type,
        "message": "有効な店舗コードです"
    }
# ====== スーパーアドミン専用エンドポイント ======

# backend_SaaS/main_saas.py
# 既存の @app.get("/api/admin/dashboard") を以下に置き換えてください

@app.get("/api/admin/dashboard")
def get_super_admin_dashboard(
    admin: SystemAdmin = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """スーパーアドミンダッシュボード統計（拡張版）"""
    
    # 基本統計
    total_orgs = db.query(Organization).filter(Organization.is_active == True).count()
    total_stores = db.query(Store).filter(Store.is_active == True).count()
    total_employees = db.query(Employee).filter(Employee.is_active == True).count()
    
    # 🆕 アクティブ/非アクティブ店舗数
    active_stores = db.query(Store).filter(Store.is_active == True).count()
    inactive_stores = db.query(Store).filter(Store.is_active == False).count()
    
    # サブスクリプション統計
    active_subs = db.query(Subscription).filter(Subscription.status == SubscriptionStatus.ACTIVE).count()
    trial_subs = db.query(Subscription).filter(Subscription.status == SubscriptionStatus.TRIAL).count()
    suspended_subs = db.query(Subscription).filter(Subscription.status == SubscriptionStatus.SUSPENDED).count()
    
    # 月次売上合計（サブスクリプション料金）
    monthly_revenue = db.query(func.sum(Subscription.monthly_fee)).filter(
        Subscription.status == SubscriptionStatus.ACTIVE
    ).scalar() or 0.0
    
    # 🆕 今月の新規店舗数
    current_month_start = date.today().replace(day=1)
    new_stores_this_month = db.query(Store).filter(
        Store.created_at >= current_month_start
    ).count()
    
    # 🆕 全店舗の月間売上合計（実売上）
    total_monthly_sales = db.query(func.sum(DailyReport.total_sales)).filter(
        DailyReport.report_date >= current_month_start
    ).scalar() or 0.0
    
    # 🆕 平均月間売上（店舗あたり）
    average_sales_per_store = total_monthly_sales / active_stores if active_stores > 0 else 0
    
    # 最近の組織
    recent_orgs = db.query(Organization).filter(
        Organization.is_active == True
    ).order_by(Organization.created_at.desc()).limit(5).all()
    
    return {
        # 基本統計
        "total_organizations": total_orgs,
        "total_stores": total_stores + inactive_stores,  # 全店舗数（アクティブ+非アクティブ）
        "total_employees": total_employees,
        "total_monthly_revenue": monthly_revenue,  # サブスクリプション収益
        
        # 🆕 拡張統計
        "active_stores": active_stores,
        "inactive_stores": inactive_stores,
        "new_stores_this_month": new_stores_this_month,
        "total_monthly_sales": total_monthly_sales,  # 実売上合計
        "average_sales_per_store": average_sales_per_store,
        
        # サブスクリプション詳細
        "active_subscriptions": active_subs,
        "trial_subscriptions": trial_subs,
        "suspended_subscriptions": suspended_subs,
        
        # 最近の組織
        "recent_organizations": [
            {
                "id": org.id,
                "name": org.name,
                "domain": org.domain,
                "contact_email": org.contact_email,
                "created_at": org.created_at.isoformat()
            } for org in recent_orgs
        ]
    }

# ====== スーパーアドミン専用：店舗管理エンドポイント ======

@app.get("/api/admin/stores")
def admin_list_all_stores(
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = None,
    organization_id: Optional[int] = None,
    admin: SystemAdmin = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """スーパーアドミン専用：全店舗一覧取得"""
    query = db.query(Store).join(Organization)
    
    if is_active is not None:
        query = query.filter(Store.is_active == is_active)
    if organization_id:
        query = query.filter(Store.organization_id == organization_id)
    
    stores = query.order_by(Store.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for store in stores:
        # 組織情報を取得
        organization = db.query(Organization).filter(Organization.id == store.organization_id).first()
        
        # サブスクリプション情報を取得
        subscription = db.query(Subscription).filter(
            Subscription.organization_id == store.organization_id
        ).first()
        
        # 従業員数を取得
        employee_count = db.query(func.count(Employee.id)).filter(
            Employee.store_id == store.id,
            Employee.is_active == True
        ).scalar() or 0
        
        # 今月の売上を取得
        current_month = date.today().replace(day=1)
        monthly_sales = db.query(func.sum(DailyReport.total_sales)).filter(
            DailyReport.store_id == store.id,
            DailyReport.report_date >= current_month
        ).scalar() or 0
        
        result.append({
            "id": store.id,
            "organization_id": store.organization_id,
            "organization_name": organization.name if organization else "不明",
            "store_code": store.store_code,
            "store_name": store.store_name,
            "store_type": store.store_type,
            "address": store.address,
            "phone": store.phone,
            "is_active": store.is_active,
            "employee_count": employee_count,
            "monthly_sales": monthly_sales,
            "subscription_status": subscription.status if subscription else "none",
            "subscription_plan": subscription.plan_name if subscription else "なし",
            "created_at": store.created_at.isoformat(),
            "updated_at": store.updated_at.isoformat()
        })
    
    return result

@app.put("/api/admin/stores/{store_id}/toggle-active")
def admin_toggle_store_active(
    store_id: int,
    request: Request,
    admin: SystemAdmin = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """スーパーアドミン専用：店舗のアクティブ状態を切り替え"""
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="店舗が見つかりません")
    
    # アクティブ状態を切り替え
    store.is_active = not store.is_active
    store.updated_at = datetime.utcnow()
    
    db.commit()
    
    # 監査ログ記録
    log_user_action(
        db, admin, "toggle_store_active", "store",
        resource_id=store.id,
        changes={"is_active": store.is_active},
        request=request
    )
    
    return {
        "id": store.id,
        "store_code": store.store_code,
        "store_name": store.store_name,
        "is_active": store.is_active,
        "updated_at": store.updated_at.isoformat()
    }

@app.get("/api/admin/stores/{store_id}/details")
def admin_get_store_details(
    store_id: int,
    admin: SystemAdmin = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """スーパーアドミン専用：店舗詳細情報取得"""
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="店舗が見つかりません")
    
    # 組織情報
    organization = db.query(Organization).filter(Organization.id == store.organization_id).first()
    
    # サブスクリプション情報
    subscription = db.query(Subscription).filter(
        Subscription.organization_id == store.organization_id
    ).first()
    
    # 従業員一覧
    employees = db.query(Employee).filter(
        Employee.store_id == store.id,
        Employee.is_active == True
    ).all()
    
    # 売上統計（過去6ヶ月）
    six_months_ago = date.today() - timedelta(days=180)
    sales_data = db.query(
        func.date_trunc('month', DailyReport.report_date).label('month'),
        func.sum(DailyReport.total_sales).label('total')
    ).filter(
        DailyReport.store_id == store.id,
        DailyReport.report_date >= six_months_ago
    ).group_by('month').order_by('month').all()
    
    return {
        "store": {
            "id": store.id,
            "store_code": store.store_code,
            "store_name": store.store_name,
            "store_type": store.store_type,
            "address": store.address,
            "phone": store.phone,
            "timezone": store.timezone,
            "currency": store.currency,
            "business_hours_start": store.business_hours_start,
            "business_hours_end": store.business_hours_end,
            "is_active": store.is_active,
            "created_at": store.created_at.isoformat(),
            "updated_at": store.updated_at.isoformat()
        },
        "organization": {
            "id": organization.id,
            "name": organization.name,
            "domain": organization.domain,
            "contact_email": organization.contact_email,
            "phone": organization.phone,
            "address": organization.address
        } if organization else None,
        "subscription": {
            "id": subscription.id,
            "plan_name": subscription.plan_name,
            "status": subscription.status,
            "max_stores": subscription.max_stores,
            "max_employees_per_store": subscription.max_employees_per_store,
            "monthly_fee": subscription.monthly_fee,
            "trial_end_date": subscription.trial_end_date.isoformat() if subscription.trial_end_date else None,
            "next_billing_date": subscription.next_billing_date.isoformat() if subscription.next_billing_date else None
        } if subscription else None,
        "employees": [
            {
                "id": emp.id,
                "employee_code": emp.employee_code,
                "name": emp.name,
                "email": emp.email,
                "role": emp.role,
                "hire_date": emp.hire_date.isoformat() if emp.hire_date else None,
                "employment_type": emp.employment_type
            } for emp in employees
        ],
        "sales_history": [
            {
                "month": item.month.isoformat() if hasattr(item.month, 'isoformat') else str(item.month),
                "total_sales": float(item.total)
            } for item in sales_data
        ]
    }

@app.post("/api/admin/organizations")
def create_organization(
    org_data: OrganizationCreate,
    request: Request,
    admin: SystemAdmin = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """新規組織作成"""
    # ドメイン重複チェック
    existing_org = db.query(Organization).filter(Organization.domain == org_data.domain).first()
    if existing_org:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="指定されたドメインは既に使用されています"
        )
    
    # 組織作成
    organization = Organization(
        name=org_data.name,
        domain=org_data.domain,
        contact_email=org_data.contact_email,
        phone=org_data.phone,
        address=org_data.address
    )
    
    db.add(organization)
    db.commit()
    db.refresh(organization)
    
    # 監査ログ記録
    log_user_action(
        db, admin, "create_organization", "organization",
        resource_id=organization.id,
        changes={"name": org_data.name, "domain": org_data.domain},
        request=request
    )
    
    return {
        "id": organization.id,
        "name": organization.name,
        "domain": organization.domain,
        "contact_email": organization.contact_email,
        "phone": organization.phone,
        "address": organization.address,
        "is_active": organization.is_active,
        "created_at": organization.created_at.isoformat(),
        "updated_at": organization.updated_at.isoformat()
    }

@app.get("/api/admin/organizations")
def list_organizations(
    skip: int = 0,
    limit: int = 100,
    admin: SystemAdmin = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """組織一覧取得"""
    organizations = db.query(Organization).filter(
        Organization.is_active == True
    ).order_by(Organization.created_at.desc()).offset(skip).limit(limit).all()
    
    return [
        {
            "id": org.id,
            "name": org.name,
            "domain": org.domain,
            "contact_email": org.contact_email,
            "phone": org.phone,
            "address": org.address,
            "is_active": org.is_active,
            "created_at": org.created_at.isoformat(),
            "updated_at": org.updated_at.isoformat()
        } for org in organizations
    ]

@app.post("/api/admin/stores/setup")
def setup_store_complete(
    setup_data: StoreSetupWizard,
    request: Request,
    admin: SystemAdmin = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """店舗セットアップウィザード（組織・店舗・オーナー・サブスクリプションを一括作成）"""
    try:
        # 1. 組織作成
        organization = Organization(
            name=setup_data.organization_data.name,
            domain=setup_data.organization_data.domain,
            contact_email=setup_data.organization_data.contact_email,
            phone=setup_data.organization_data.phone,
            address=setup_data.organization_data.address
        )
        db.add(organization)
        db.flush()  # IDを取得するためフラッシュ
        
        # 2. 店舗作成
        store_code = generate_store_code()
        store = Store(
            organization_id=organization.id,
            store_code=store_code,
            store_name=setup_data.store_data.store_name,
            store_type=setup_data.store_data.store_type,
            address=setup_data.store_data.address,
            phone=setup_data.store_data.phone,
            timezone=setup_data.store_data.timezone,
            currency=setup_data.store_data.currency,
            business_hours_start=setup_data.store_data.business_hours_start,
            business_hours_end=setup_data.store_data.business_hours_end
        )
        db.add(store)
        db.flush()
        
        # 3. オーナー従業員作成
        is_valid, msg = validate_password_strength(setup_data.owner_data.password)
        if not is_valid:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)
        
        employee_code = generate_employee_code(store_code)
        owner = Employee(
            store_id=store.id,
            employee_code=employee_code,
            name=setup_data.owner_data.name,
            email=setup_data.owner_data.email,
            password_hash=get_password_hash(setup_data.owner_data.password),
            role=UserRole.OWNER,
            hire_date=setup_data.owner_data.hire_date or date.today(),
            hourly_wage=setup_data.owner_data.hourly_wage,
            employment_type=setup_data.owner_data.employment_type,
            phone=setup_data.owner_data.phone,
            emergency_contact_name=setup_data.owner_data.emergency_contact_name,
            emergency_contact_phone=setup_data.owner_data.emergency_contact_phone
        )
        db.add(owner)
        db.flush()
        
        # 4. サブスクリプション作成
        subscription = Subscription(
            organization_id=organization.id,
            plan_name=setup_data.subscription_data.plan_name,
            status=SubscriptionStatus.TRIAL,
            max_stores=setup_data.subscription_data.max_stores,
            max_employees_per_store=setup_data.subscription_data.max_employees_per_store,
            monthly_fee=setup_data.subscription_data.monthly_fee,
            trial_end_date=setup_data.subscription_data.trial_end_date or datetime.utcnow() + timedelta(days=30)
        )
        db.add(subscription)
        db.flush()
        
        # 5. 初期招待コード作成
        initial_invite = generate_invite_code()
        invite_code = InviteCode(
            store_id=store.id,
            code=initial_invite,  # ✅
            role=UserRole.MANAGER,  # ✅
            expires_at=datetime.utcnow() + timedelta(days=7),
            max_uses=5
        )
        db.add(invite_code)
        
        db.commit()
        
        # 監査ログ記録
        log_user_action(
            db, admin, "setup_store_complete", "store",
            resource_id=store.id,
            changes={
                "organization_name": organization.name,
                "store_name": store.store_name,
                "store_code": store_code,
                "owner_email": owner.email
            },
            request=request
        )
        
        return {
            "organization": {
                "id": organization.id,
                "name": organization.name,
                "domain": organization.domain,
                "contact_email": organization.contact_email,
                "created_at": organization.created_at.isoformat()
            },
            "store": {
                "id": store.id,
                "store_code": store_code,
                "store_name": store.store_name,
                "created_at": store.created_at.isoformat()
            },
            "owner": {
                "id": owner.id,
                "employee_code": employee_code,
                "name": owner.name,
                "email": owner.email,
                "role": owner.role
            },
            "subscription": {
                "id": subscription.id,
                "plan_name": subscription.plan_name,
                "status": subscription.status,
                "trial_end_date": subscription.trial_end_date.isoformat()
            },
            "initial_invite_code": initial_invite
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"店舗セットアップに失敗しました: {str(e)}"
        )

# ====== 組織・店舗管理エンドポイント ======

@app.get("/api/stores")
def list_stores(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """アクセス可能な店舗一覧取得"""
    accessible_store_ids = get_user_accessible_stores(current_user, db)
    
    stores = db.query(Store).filter(
        Store.id.in_(accessible_store_ids),
        Store.is_active == True
    ).order_by(Store.created_at.desc()).all()
    
    return [
        {
            "id": store.id,
            "organization_id": store.organization_id,
            "store_code": store.store_code,
            "store_name": store.store_name,
            "store_type": store.store_type,
            "address": store.address,
            "phone": store.phone,
            "timezone": store.timezone,
            "currency": store.currency,
            "business_hours_start": store.business_hours_start,
            "business_hours_end": store.business_hours_end,
            "is_active": store.is_active,
            "created_at": store.created_at.isoformat(),
            "updated_at": store.updated_at.isoformat()
        } for store in stores
    ]

@app.get("/api/stores/{store_id}")
def get_store(
    store_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """店舗詳細取得"""
    # 店舗アクセス権限チェック
    if isinstance(current_user, Employee) and current_user.store_id != store_id:
        raise HTTPException(status_code=403, detail="指定された店舗にアクセスする権限がありません")
    
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="店舗が見つかりません")
    
    return {
        "id": store.id,
        "organization_id": store.organization_id,
        "store_code": store.store_code,
        "store_name": store.store_name,
        "store_type": store.store_type,
        "address": store.address,
        "phone": store.phone,
        "timezone": store.timezone,
        "currency": store.currency,
        "business_hours_start": store.business_hours_start,
        "business_hours_end": store.business_hours_end,
        "is_active": store.is_active,
        "created_at": store.created_at.isoformat(),
        "updated_at": store.updated_at.isoformat()
    }

@app.get("/api/stores/{store_id}/dashboard")
def get_store_dashboard(
    store_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """店舗ダッシュボード"""
    # 店舗アクセス権限チェック
    if isinstance(current_user, Employee) and current_user.store_id != store_id:
        raise HTTPException(status_code=403, detail="指定された店舗にアクセスする権限がありません")
    
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="店舗が見つかりません")
    
    # 今日の売上
    today = date.today()
    today_sales = db.query(func.sum(DailyReport.total_sales)).filter(
        DailyReport.store_id == store_id,
        DailyReport.report_date == today
    ).scalar() or 0
    
    # 今月の売上
    current_month = today.replace(day=1)
    month_sales = db.query(func.sum(DailyReport.total_sales)).filter(
        DailyReport.store_id == store_id,
        DailyReport.report_date >= current_month
    ).scalar() or 0
    
    # アクティブ従業員数
    active_employees = db.query(Employee).filter(
        Employee.store_id == store_id,
        Employee.is_active == True
    ).count()
    
    # 未承認日報数
    pending_reports = db.query(DailyReport).filter(
        DailyReport.store_id == store_id,
        DailyReport.is_approved == False
    ).count()
    
    # 最近の日報（5件）
    recent_reports = db.query(DailyReport).filter(
        DailyReport.store_id == store_id
    ).order_by(DailyReport.created_at.desc()).limit(5).all()
    
    return {
        "store": {
            "id": store.id,
            "store_code": store.store_code,
            "store_name": store.store_name,
            "store_type": store.store_type
        },
        "today_sales": today_sales,
        "month_sales": month_sales,
        "active_employees": active_employees,
        "pending_reports": pending_reports,
        "recent_reports": [
            {
                "id": report.id,
                "date": report.report_date.isoformat(),
                "employee_id": report.employee_id,
                "total_sales": report.total_sales,
                "is_approved": report.is_approved,
                "created_at": report.created_at.isoformat()
            } for report in recent_reports
        ]
    }

# ====== 従業員管理エンドポイント ======

@app.post("/api/stores/{store_id}/employees")
def create_employee(
    store_id: int,
    employee_data: EmployeeCreate,
    request: Request,
    current_user = Depends(require_role(UserRole.MANAGER)),
    db: Session = Depends(get_db)
):
    """従業員作成"""
    # 店舗アクセス権限チェック
    if not isinstance(current_user, SystemAdmin):
        if current_user.store_id != store_id:
            raise HTTPException(status_code=403, detail="指定された店舗にアクセスする権限がありません")
    
    # メール重複チェック
    existing_employee = db.query(Employee).filter(Employee.email == employee_data.email).first()
    if existing_employee:
        raise HTTPException(status_code=400, detail="このメールアドレスは既に使用されています")
    
    # パスワード強度チェック
    is_valid, msg = validate_password_strength(employee_data.password)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)
    
    # 店舗コード取得
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="店舗が見つかりません")
    
    # 従業員作成
    employee_code = generate_employee_code(store.store_code)
    employee = Employee(
        store_id=store_id,
        employee_code=employee_code,
        name=employee_data.name,
        email=employee_data.email,
        password_hash=get_password_hash(employee_data.password),
        role=employee_data.role,
        hire_date=employee_data.hire_date or date.today(),
        hourly_wage=employee_data.hourly_wage,
        employment_type=employee_data.employment_type,
        phone=employee_data.phone,
        emergency_contact_name=employee_data.emergency_contact_name,
        emergency_contact_phone=employee_data.emergency_contact_phone
    )
    
    db.add(employee)
    db.commit()
    db.refresh(employee)
    
    # 監査ログ記録
    log_user_action(
        db, current_user, "create_employee", "employee",
        resource_id=employee.id,
        changes={"name": employee_data.name, "email": employee_data.email, "role": employee_data.role},
        request=request
    )
    
    return {
        "id": employee.id,
        "store_id": employee.store_id,
        "employee_code": employee.employee_code,
        "name": employee.name,
        "email": employee.email,
        "role": employee.role,
        "is_active": employee.is_active,
        "hire_date": employee.hire_date.isoformat() if employee.hire_date else None,
        "hourly_wage": employee.hourly_wage,
        "employment_type": employee.employment_type,
        "phone": employee.phone,
        "created_at": employee.created_at.isoformat(),
        "updated_at": employee.updated_at.isoformat()
    }

@app.get("/api/stores/{store_id}/employees")
def list_employees(
    store_id: int,
    skip: int = 0,
    limit: int = 100,
    role: Optional[UserRole] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """従業員一覧取得"""
    # 店舗アクセス権限チェック
    if isinstance(current_user, Employee) and current_user.store_id != store_id:
        raise HTTPException(status_code=403, detail="指定された店舗にアクセスする権限がありません")
    
    query = db.query(Employee).filter(Employee.store_id == store_id)
    
    if role:
        query = query.filter(Employee.role == role)
    if is_active is not None:
        query = query.filter(Employee.is_active == is_active)
    
    employees = query.order_by(Employee.created_at.desc()).offset(skip).limit(limit).all()
    
    return [
        {
            "id": emp.id,
            "store_id": emp.store_id,
            "employee_code": emp.employee_code,
            "name": emp.name,
            "email": emp.email,
            "role": emp.role,
            "is_active": emp.is_active,
            "hire_date": emp.hire_date.isoformat() if emp.hire_date else None,
            "hourly_wage": emp.hourly_wage,
            "employment_type": emp.employment_type,
            "phone": emp.phone,
            "created_at": emp.created_at.isoformat(),
            "updated_at": emp.updated_at.isoformat()
        } for emp in employees
    ]

# ====== 招待コード管理エンドポイント ======

@app.post("/api/stores/{store_id}/invite-codes")
def create_invite_code(
    store_id: int,
    invite_data: InviteCodeCreate,
    request: Request,
    current_user = Depends(require_role(UserRole.MANAGER)),
    db: Session = Depends(get_db)
):
    """招待コード作成"""
    # 店舗アクセス権限チェック
    if not isinstance(current_user, SystemAdmin):
        if current_user.store_id != store_id:
            raise HTTPException(status_code=403, detail="指定された店舗にアクセスする権限がありません")
    
    # 招待コード生成
    invite_code_str = generate_invite_code()
    
    invite_code = InviteCode(
        store_id=store_id,
        code=invite_code_str,  # ✅
        role=invite_data.invited_role,  # ✅
        expires_at=datetime.utcnow() + timedelta(hours=invite_data.expires_in_hours),
        max_uses=invite_data.max_uses
    )
    
    db.add(invite_code)
    db.commit()
    db.refresh(invite_code)
    
    # 監査ログ記録
    log_user_action(
        db, current_user, "create_invite_code", "invite_code",
        resource_id=invite_code.id,
        changes={"invited_role": invite_data.invited_role, "max_uses": invite_data.max_uses},
        request=request
    )
    
    return {
        "id": invite_code.id,
        "store_id": invite_code.store_id,
        "invite_code": invite_code.code,  
        "invited_role": invite_code.role,  
        "invited_email": invite_code.invited_email,
        "status": invite_code.status,
        "expires_at": invite_code.expires_at.isoformat(),
        "max_uses": invite_code.max_uses,
        "current_uses": invite_code.current_uses,
        "created_at": invite_code.created_at.isoformat()
    }

@app.get("/api/stores/{store_id}/invite-codes")
def list_invite_codes(
    store_id: int,
    current_user = Depends(require_role(UserRole.MANAGER)),
    db: Session = Depends(get_db)
):
    """招待コード一覧取得"""
    # 店舗アクセス権限チェック
    if not isinstance(current_user, SystemAdmin):
        if current_user.store_id != store_id:
            raise HTTPException(status_code=403, detail="指定された店舗にアクセスする権限がありません")
    
    invite_codes = db.query(InviteCode).filter(
        InviteCode.store_id == store_id
    ).order_by(InviteCode.created_at.desc()).all()
    
    return [
        {
            "id": code.id,
            "invite_code": code.code,  # ✅ 修正
            "invited_role": code.role,  # ✅ 修正
            "invited_email": code.invited_email,
            "status": code.status,
            "expires_at": code.expires_at.isoformat(),
            "max_uses": code.max_uses,
            "current_uses": code.current_uses,
            "created_at": code.created_at.isoformat()
        } for code in invite_codes
    ]

@app.post("/api/invite-codes/use")
def use_invite_code(
    invite_data: InviteCodeUse,
    request: Request,
    db: Session = Depends(get_db)
):
    """招待コードを使用して従業員登録"""
    # 招待コード検証
    invite_code = db.query(InviteCode).filter(
        InviteCode.code == invite_data.invite_code,  
        InviteCode.status == InviteStatus.PENDING,
        InviteCode.expires_at > datetime.utcnow(),
        InviteCode.current_uses < InviteCode.max_uses
    ).first()
    
    if not invite_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="無効または期限切れの招待コードです"
        )
    
    # 従業員作成
    store = db.query(Store).filter(Store.id == invite_code.store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="店舗が見つかりません")
    
    # メール重複チェック
    existing_employee = db.query(Employee).filter(Employee.email == invite_data.employee_data.email).first()
    if existing_employee:
        raise HTTPException(status_code=400, detail="このメールアドレスは既に使用されています")
    
    # パスワード強度チェック
    is_valid, msg = validate_password_strength(invite_data.employee_data.password)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)
    
    # 従業員作成
    employee_code = generate_employee_code(store.store_code)
    employee = Employee(
        store_id=invite_code.store_id,
        employee_code=employee_code,
        name=invite_data.employee_data.name,
        email=invite_data.employee_data.email,
        password_hash=get_password_hash(invite_data.employee_data.password),
        role=invite_code.role,  # 招待コードで指定された役割
        hire_date=date.today(),
        hourly_wage=invite_data.employee_data.hourly_wage,
        employment_type=invite_data.employee_data.employment_type,
        phone=invite_data.employee_data.phone
    )
    
    db.add(employee)
    
    # 招待コード使用回数更新
    invite_code.current_uses += 1
    if invite_code.current_uses >= invite_code.max_uses:
        invite_code.status = InviteStatus.ACCEPTED
    
    db.commit()
    db.refresh(employee)
    
    return {
        "id": employee.id,
        "store_id": employee.store_id,
        "employee_code": employee.employee_code,
        "name": employee.name,
        "email": employee.email,
        "role": employee.role,
        "store_code": store.store_code,
        "created_at": employee.created_at.isoformat()
    }

# ====== 日報管理エンドポイント ======

@app.post("/api/stores/{store_id}/daily-reports")
def create_daily_report(
    store_id: int,
    report_data: DailyReportCreate,
    request: Request,
    current_user = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """日報作成"""
    # 店舗アクセス権限チェック
    if current_user.store_id != store_id:
        raise HTTPException(status_code=403, detail="指定された店舗にアクセスする権限がありません")
    
    # 同日の日報重複チェック
    existing_report = db.query(DailyReport).filter(
        DailyReport.store_id == store_id,
        DailyReport.employee_id == current_user.id,
        DailyReport.report_date == report_data.date
    ).first()
    
    if existing_report:
        raise HTTPException(status_code=400, detail="この日付の日報は既に作成されています")
    
    # 日報作成
    daily_report = DailyReport(
        store_id=store_id,
        employee_id=current_user.id,
        report_date=report_data.date,
        total_sales=report_data.total_sales,
        alcohol_cost=report_data.alcohol_cost,
        other_expenses=report_data.other_expenses,
        card_sales=report_data.card_sales,
        drink_count=report_data.drink_count,
        champagne_type=report_data.champagne_type,
        champagne_price=report_data.champagne_price,
        catch_count=report_data.catch_count,  # 🆕 キャッチ数
        work_start_time=report_data.work_start_time,
        work_end_time=report_data.work_end_time,
        break_minutes=report_data.break_minutes,
        notes=report_data.notes
    )
    
    db.add(daily_report)
    db.commit()
    db.refresh(daily_report)
    
    # 監査ログ記録
    log_user_action(
        db, current_user, "create_daily_report", "daily_report",
        resource_id=daily_report.id,
        changes={"date": report_data.date.isoformat(), "total_sales": report_data.total_sales},
        request=request
    )
    
    return {
        "id": daily_report.id,
        "store_id": daily_report.store_id,
        "employee_id": daily_report.employee_id,
        "date": daily_report.report_date.isoformat(),
        "total_sales": daily_report.total_sales,
        "alcohol_cost": daily_report.alcohol_cost,
        "other_expenses": daily_report.other_expenses,
        "card_sales": daily_report.card_sales,
        "drink_count": daily_report.drink_count,
        "champagne_type": daily_report.champagne_type,
        "champagne_price": daily_report.champagne_price,
        "catch_count": daily_report.catch_count or 0,  # 🆕 キャッチ数
        "work_start_time": daily_report.work_start_time,
        "work_end_time": daily_report.work_end_time,
        "break_minutes": daily_report.break_minutes,
        "is_approved": daily_report.is_approved,
        "notes": daily_report.notes,
        "created_at": daily_report.created_at.isoformat(),
        "updated_at": daily_report.updated_at.isoformat()
    }

@app.get("/api/stores/{store_id}/daily-reports")
def list_daily_reports(
    store_id: int,
    skip: int = 0,
    limit: int = 100,
    employee_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    is_approved: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """日報一覧取得"""
    # 店舗アクセス権限チェック
    if isinstance(current_user, Employee) and current_user.store_id != store_id:
        raise HTTPException(status_code=403, detail="指定された店舗にアクセスする権限がありません")
    
    query = db.query(DailyReport).filter(DailyReport.store_id == store_id)
    
    # 従業員は自分の日報のみ閲覧可能
    if isinstance(current_user, Employee) and current_user.role == UserRole.STAFF:
        query = query.filter(DailyReport.employee_id == current_user.id)
    elif employee_id:
        query = query.filter(DailyReport.employee_id == employee_id)
    
    if date_from:
        query = query.filter(DailyReport.report_date >= date_from)
    if date_to:
        query = query.filter(DailyReport.report_date <= date_to)
    if is_approved is not None:
        query = query.filter(DailyReport.is_approved == is_approved)
    
    reports = query.order_by(DailyReport.report_date.desc()).offset(skip).limit(limit).all()
    
    return [
        {
            "id": report.id,
            "store_id": report.store_id,
            "employee_id": report.employee_id,
            "date": report.report_date.isoformat(),
            "total_sales": report.total_sales,
            "alcohol_cost": report.alcohol_cost,
            "other_expenses": report.other_expenses,
            "card_sales": report.card_sales,
            "drink_count": report.drink_count,
            "champagne_type": report.champagne_type,
            "champagne_price": report.champagne_price,
            "catch_count": report.catch_count or 0,  # 🆕 キャッチ数
            "work_start_time": report.work_start_time,
            "work_end_time": report.work_end_time,
            "break_minutes": report.break_minutes,
            "is_approved": report.is_approved,
            "approved_by_employee_id": report.approved_by_employee_id,
            "approved_at": report.approved_at.isoformat() if report.approved_at else None,
            "notes": report.notes,
            "created_at": report.created_at.isoformat(),
            "updated_at": report.updated_at.isoformat()
        } for report in reports
    ]

@app.put("/api/stores/{store_id}/daily-reports/{report_id}/approve")
def approve_daily_report(
    store_id: int,
    report_id: int,
    approval_data: DailyReportApproval,
    request: Request,
    current_user = Depends(require_role(UserRole.MANAGER)),
    db: Session = Depends(get_db)
):
    """日報承認"""
    # 店舗アクセス権限チェック
    if not isinstance(current_user, SystemAdmin):
        if current_user.store_id != store_id:
            raise HTTPException(status_code=403, detail="指定された店舗にアクセスする権限がありません")
    
    report = db.query(DailyReport).filter(
        DailyReport.id == report_id,
        DailyReport.store_id == store_id
    ).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="日報が見つかりません")
    
    # 承認状態更新
    report.is_approved = approval_data.is_approved
    report.approved_by_employee_id = approval_data.approved_by_employee_id
    report.approved_at = datetime.utcnow() if approval_data.is_approved else None
    
    db.commit()
    
    # 監査ログ記録
    log_user_action(
        db, current_user, "approve_daily_report", "daily_report",
        resource_id=report.id,
        changes={"is_approved": approval_data.is_approved},
        request=request
    )
    
    return {
        "id": report.id,
        "is_approved": report.is_approved,
        "approved_by_employee_id": report.approved_by_employee_id,
        "approved_at": report.approved_at.isoformat() if report.approved_at else None
    }

# ====== サブスクリプション管理エンドポイント ======

@app.get("/api/admin/subscriptions")
def list_subscriptions(
    skip: int = 0,
    limit: int = 100,
    admin: SystemAdmin = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """サブスクリプション一覧取得"""
    subscriptions = db.query(Subscription).order_by(
        Subscription.created_at.desc()
    ).offset(skip).limit(limit).all()
    
    return [
        {
            "id": sub.id,
            "organization_id": sub.organization_id,
            "plan_name": sub.plan_name,
            "status": sub.status,
            "max_stores": sub.max_stores,
            "max_employees_per_store": sub.max_employees_per_store,
            "monthly_fee": sub.monthly_fee,
            "billing_cycle_day": sub.billing_cycle_day,
            "trial_end_date": sub.trial_end_date.isoformat() if sub.trial_end_date else None,
            "next_billing_date": sub.next_billing_date.isoformat() if sub.next_billing_date else None,
            "created_at": sub.created_at.isoformat(),
            "updated_at": sub.updated_at.isoformat()
        } for sub in subscriptions
    ]

@app.put("/api/admin/subscriptions/{subscription_id}")
def update_subscription(
    subscription_id: int,
    update_data: SubscriptionUpdate,
    request: Request,
    admin: SystemAdmin = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """サブスクリプション更新"""
    subscription = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not subscription:
        raise HTTPException(status_code=404, detail="サブスクリプションが見つかりません")
    
    # 更新
    for field, value in update_data.dict(exclude_unset=True).items():
        setattr(subscription, field, value)
    
    subscription.updated_at = datetime.utcnow()
    db.commit()
    
    # 監査ログ記録
    log_user_action(
        db, admin, "update_subscription", "subscription",
        resource_id=subscription.id,
        changes=update_data.dict(exclude_unset=True),
        request=request
    )
    
    return {
        "id": subscription.id,
        "organization_id": subscription.organization_id,
        "plan_name": subscription.plan_name,
        "status": subscription.status,
        "max_stores": subscription.max_stores,
        "max_employees_per_store": subscription.max_employees_per_store,
        "monthly_fee": subscription.monthly_fee,
        "updated_at": subscription.updated_at.isoformat()
    }

# ====== 監査ログエンドポイント ======

@app.get("/api/admin/audit-logs")
def list_audit_logs(
    skip: int = 0,
    limit: int = 100,
    user_type: Optional[str] = None,
    action: Optional[str] = None,
    admin: SystemAdmin = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """監査ログ一覧取得"""
    query = db.query(AuditLog)
    
    if user_type:
        query = query.filter(AuditLog.user_type == user_type)
    if action:
        query = query.filter(AuditLog.action.contains(action))
    
    logs = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
    
    return [
        {
            "id": log.id,
            "user_id": log.user_id,
            "user_type": log.user_type,
            "user_email": log.user_email,
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "changes": log.changes,
            "ip_address": log.ip_address,
            "user_agent": log.user_agent,
            "organization_id": log.organization_id,
            "store_id": log.store_id,
            "created_at": log.created_at.isoformat()
        } for log in logs
    ]

# エラーハンドラー
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "detail": str(exc.detail),
            "timestamp": datetime.utcnow().isoformat()
        }
    )


# ====== 🆕 個人サマリーAPI ======

@app.get("/api/employees/me/summary")
def get_employee_summary(
    month: Optional[str] = None,  # YYYY-MM形式
    current_user = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """
    個人のサマリー情報を取得
    - 今月の目標と実績
    - 達成率
    - 日別内訳
    """
    # 月の指定がない場合は現在の月
    if month:
        try:
            year = int(month.split("-")[0])
            month_num = int(month.split("-")[1])
        except:
            year = datetime.now().year
            month_num = datetime.now().month
    else:
        year = datetime.now().year
        month_num = datetime.now().month
    
    # 月の開始日・終了日
    from calendar import monthrange
    start_date = date(year, month_num, 1)
    _, last_day = monthrange(year, month_num)
    end_date = date(year, month_num, last_day)
    
    # 目標を取得
    goal = db.query(PersonalGoal).filter(
        PersonalGoal.employee_id == current_user.id,
        PersonalGoal.year == year,
        PersonalGoal.month == month_num
    ).first()
    
    # デフォルト目標
    sales_goal = goal.sales_goal if goal else 500000
    drinks_goal = goal.drinks_goal if goal else 100
    catch_goal = goal.catch_goal if goal else 50
    
    # 実績を集計
    reports = db.query(DailyReport).filter(
        DailyReport.employee_id == current_user.id,
        DailyReport.report_date >= start_date,
        DailyReport.report_date <= end_date
    ).all()
    
    total_sales = sum(r.total_sales for r in reports)
    total_drinks = sum(r.drink_count for r in reports)
    total_catch = sum(r.catch_count or 0 for r in reports)
    total_customers = sum(r.number_of_customers for r in reports)
    total_champagne = sum(r.champagne_sales for r in reports)
    work_days = len(reports)
    
    # 達成率計算
    sales_rate = (total_sales / sales_goal * 100) if sales_goal > 0 else 0
    drinks_rate = (total_drinks / drinks_goal * 100) if drinks_goal > 0 else 0
    catch_rate = (total_catch / catch_goal * 100) if catch_goal > 0 else 0
    
    # 日別内訳
    daily_breakdown = [
        {
            "date": r.report_date.isoformat(),
            "sales": r.total_sales,
            "drinks": r.drink_count,
            "catch": r.catch_count or 0,
            "customers": r.number_of_customers
        } for r in sorted(reports, key=lambda x: x.report_date)
    ]
    
    return {
        "employee": {
            "id": current_user.id,
            "name": current_user.name,
            "employee_code": current_user.employee_code
        },
        "period": {
            "year": year,
            "month": month_num,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        },
        "goals": {
            "sales_goal": sales_goal,
            "drinks_goal": drinks_goal,
            "catch_goal": catch_goal
        },
        "actual": {
            "total_sales": total_sales,
            "total_drinks": total_drinks,
            "total_catch": total_catch,
            "total_customers": total_customers,
            "total_champagne": total_champagne,
            "work_days": work_days
        },
        "achievement_rate": {
            "sales": round(sales_rate, 1),
            "drinks": round(drinks_rate, 1),
            "catch": round(catch_rate, 1)
        },
        "daily_breakdown": daily_breakdown
    }


# ====== 🆕 店舗ランキングAPI ======

@app.get("/api/stores/{store_id}/ranking")
def get_store_ranking(
    store_id: int,
    month: Optional[str] = None,  # YYYY-MM形式
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    店舗内のランキングを取得
    - 売上ランキング
    - ドリンクランキング
    - キャッチランキング
    """
    # 店舗アクセス権限チェック
    if isinstance(current_user, Employee) and current_user.store_id != store_id:
        raise HTTPException(status_code=403, detail="他店舗のランキングは閲覧できません")
    
    # 月の指定がない場合は現在の月
    if month:
        try:
            year = int(month.split("-")[0])
            month_num = int(month.split("-")[1])
        except:
            year = datetime.now().year
            month_num = datetime.now().month
    else:
        year = datetime.now().year
        month_num = datetime.now().month
    
    # 月の開始日・終了日
    from calendar import monthrange
    start_date = date(year, month_num, 1)
    _, last_day = monthrange(year, month_num)
    end_date = date(year, month_num, last_day)
    
    # 店舗の従業員一覧
    employees = db.query(Employee).filter(
        Employee.store_id == store_id,
        Employee.is_active == True
    ).all()
    
    employee_stats = []
    
    for emp in employees:
        # 従業員ごとの実績を集計
        reports = db.query(DailyReport).filter(
            DailyReport.employee_id == emp.id,
            DailyReport.report_date >= start_date,
            DailyReport.report_date <= end_date
        ).all()
        
        total_sales = sum(r.total_sales for r in reports)
        total_drinks = sum(r.drink_count for r in reports)
        total_catch = sum(r.catch_count or 0 for r in reports)
        total_customers = sum(r.number_of_customers for r in reports)
        work_days = len(reports)
        avg_sales_per_day = total_sales // work_days if work_days > 0 else 0
        
        employee_stats.append({
            "employee_id": emp.id,
            "employee_code": emp.employee_code,
            "name": emp.name,
            "total_sales": total_sales,
            "total_drinks": total_drinks,
            "total_catch": total_catch,
            "total_customers": total_customers,
            "work_days": work_days,
            "avg_sales_per_day": avg_sales_per_day
        })
    
    # 売上順にソート
    sales_ranking = sorted(employee_stats, key=lambda x: x["total_sales"], reverse=True)
    for i, emp in enumerate(sales_ranking):
        emp["sales_rank"] = i + 1
    
    # ドリンク順にソート
    drinks_ranking = sorted(employee_stats, key=lambda x: x["total_drinks"], reverse=True)
    for i, emp in enumerate(drinks_ranking):
        emp["drinks_rank"] = i + 1
    
    # キャッチ順にソート
    catch_ranking = sorted(employee_stats, key=lambda x: x["total_catch"], reverse=True)
    for i, emp in enumerate(catch_ranking):
        emp["catch_rank"] = i + 1
    
    # ランキング情報をマージ
    ranking_map = {emp["employee_id"]: emp for emp in sales_ranking}
    for emp in drinks_ranking:
        ranking_map[emp["employee_id"]]["drinks_rank"] = emp["drinks_rank"]
    for emp in catch_ranking:
        ranking_map[emp["employee_id"]]["catch_rank"] = emp["catch_rank"]
    
    # 売上ランキング順で返す
    final_ranking = sorted(ranking_map.values(), key=lambda x: x["sales_rank"])
    
    return {
        "store_id": store_id,
        "period": {
            "year": year,
            "month": month_num,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        },
        "ranking": final_ranking,
        "top_sales": final_ranking[0] if final_ranking else None,
        "top_drinks": max(final_ranking, key=lambda x: x["total_drinks"]) if final_ranking else None,
        "top_catch": max(final_ranking, key=lambda x: x["total_catch"]) if final_ranking else None
    }


# ====== 🆕 伝票追加API ======

@app.post("/api/daily-reports/{report_id}/receipts")
def add_receipt_to_report(
    report_id: int,
    receipt_data: dict,
    request: Request,
    current_user = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """日報に伝票を追加"""
    # 日報を取得
    report = db.query(DailyReport).filter(DailyReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="日報が見つかりません")
    
    # 権限チェック（自分の日報か、マネージャー以上）
    if report.employee_id != current_user.id:
        if current_user.role.value not in ['manager', 'owner']:
            raise HTTPException(status_code=403, detail="他の従業員の日報には伝票を追加できません")
    
    try:
        # 伝票を作成
        new_receipt = Receipt(
            daily_report_id=report_id,
            customer_name=receipt_data.get("customer_name", ""),
            employee_name=receipt_data.get("employee_name", current_user.name),
            drink_count=receipt_data.get("drink_count", 0),
            champagne_type=receipt_data.get("champagne_type", ""),
            champagne_price=receipt_data.get("champagne_price", 0),
            amount=receipt_data.get("amount", 0),
            is_card=receipt_data.get("is_card", False),
            receipt_number=receipt_data.get("receipt_number"),
            table_number=receipt_data.get("table_number"),
            service_charge=receipt_data.get("service_charge", 0)
        )
        
        db.add(new_receipt)
        db.commit()
        db.refresh(new_receipt)
        
        # 監査ログ記録
        log_user_action(
            db, current_user, "add_receipt", "receipt",
            resource_id=new_receipt.id,
            changes={"daily_report_id": report_id, "amount": receipt_data.get("amount", 0)},
            request=request
        )
        
        return {
            "id": new_receipt.id,
            "daily_report_id": new_receipt.daily_report_id,
            "customer_name": new_receipt.customer_name,
            "employee_name": new_receipt.employee_name,
            "drink_count": new_receipt.drink_count,
            "champagne_type": new_receipt.champagne_type,
            "champagne_price": new_receipt.champagne_price,
            "amount": new_receipt.amount,
            "is_card": new_receipt.is_card,
            "receipt_number": new_receipt.receipt_number,
            "table_number": new_receipt.table_number,
            "service_charge": new_receipt.service_charge,
            "created_at": new_receipt.created_at.isoformat(),
            "message": "伝票を追加しました"
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"伝票追加に失敗: {str(e)}")


@app.get("/api/daily-reports/{report_id}/receipts")
def get_report_receipts(
    report_id: int,
    current_user = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """日報の伝票一覧を取得"""
    # 日報を取得
    report = db.query(DailyReport).filter(DailyReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="日報が見つかりません")
    
    # 権限チェック
    if report.employee_id != current_user.id:
        if current_user.role.value not in ['manager', 'owner']:
            raise HTTPException(status_code=403, detail="他の従業員の伝票は閲覧できません")
    
    receipts = db.query(Receipt).filter(Receipt.daily_report_id == report_id).all()
    
    return [
        {
            "id": r.id,
            "daily_report_id": r.daily_report_id,
            "customer_name": r.customer_name,
            "employee_name": r.employee_name,
            "drink_count": r.drink_count,
            "champagne_type": r.champagne_type,
            "champagne_price": r.champagne_price,
            "amount": r.amount,
            "is_card": r.is_card,
            "receipt_number": r.receipt_number,
            "table_number": r.table_number,
            "service_charge": r.service_charge,
            "created_at": r.created_at.isoformat()
        } for r in receipts
    ]


@app.delete("/api/daily-reports/{report_id}/receipts/{receipt_id}")
def delete_receipt(
    report_id: int,
    receipt_id: int,
    current_user = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """伝票を削除"""
    receipt = db.query(Receipt).filter(
        Receipt.id == receipt_id,
        Receipt.daily_report_id == report_id
    ).first()
    
    if not receipt:
        raise HTTPException(status_code=404, detail="伝票が見つかりません")
    
    # 日報の所有者チェック
    report = db.query(DailyReport).filter(DailyReport.id == report_id).first()
    if report.employee_id != current_user.id:
        if current_user.role.value not in ['manager', 'owner']:
            raise HTTPException(status_code=403, detail="他の従業員の伝票は削除できません")
    
    try:
        db.delete(receipt)
        db.commit()
        return {"message": "伝票を削除しました"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"伝票削除に失敗: {str(e)}")


# ====== 🆕 月次統計API ======

@app.get("/api/stats/monthly")
def get_monthly_stats(
    year: int,
    month: int,
    store_id: Optional[int] = None,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """月次統計を取得"""
    from calendar import monthrange
    
    # 店舗IDの決定
    if store_id:
        if isinstance(current_user, Employee) and current_user.store_id != store_id:
            raise HTTPException(status_code=403, detail="他店舗の統計は閲覧できません")
    elif isinstance(current_user, Employee):
        store_id = current_user.store_id
    else:
        # 管理者の場合、全店舗の統計
        store_id = None
    
    # 月の開始日・終了日
    start_date = date(year, month, 1)
    _, last_day = monthrange(year, month)
    end_date = date(year, month, last_day)
    
    # クエリ
    query = db.query(DailyReport).filter(
        DailyReport.report_date >= start_date,
        DailyReport.report_date <= end_date
    )
    
    if store_id:
        query = query.filter(DailyReport.store_id == store_id)
    
    reports = query.all()
    
    if not reports:
        return {
            "year": year,
            "month": month,
            "total_sales": 0,
            "total_customers": 0,
            "total_work_hours": 0,
            "avg_sales_per_day": 0,
            "avg_customers_per_day": 0,
            "best_day": None,
            "worst_day": None,
            "weekday_sales": 0,
            "weekend_sales": 0,
            "weekday_count": 0,
            "weekend_count": 0
        }
    
    # 集計
    total_sales = sum(r.total_sales for r in reports)
    total_customers = sum(r.number_of_customers for r in reports)
    total_work_hours = sum(r.work_hours or 0 for r in reports)
    
    # 日数
    report_days = len(set(r.report_date for r in reports))
    avg_sales_per_day = total_sales // report_days if report_days > 0 else 0
    avg_customers_per_day = total_customers / report_days if report_days > 0 else 0
    
    # 最高・最低売上日
    daily_sales = {}
    for r in reports:
        date_str = r.report_date.isoformat()
        if date_str not in daily_sales:
            daily_sales[date_str] = 0
        daily_sales[date_str] += r.total_sales
    
    best_day = max(daily_sales.items(), key=lambda x: x[1]) if daily_sales else None
    worst_day = min(daily_sales.items(), key=lambda x: x[1]) if daily_sales else None
    
    # 平日・週末別集計
    weekday_sales = 0
    weekend_sales = 0
    weekday_count = 0
    weekend_count = 0
    
    for r in reports:
        if r.report_date.weekday() < 5:  # 月〜金
            weekday_sales += r.total_sales
            weekday_count += 1
        else:  # 土日
            weekend_sales += r.total_sales
            weekend_count += 1
    
    return {
        "year": year,
        "month": month,
        "total_sales": total_sales,
        "total_customers": total_customers,
        "total_work_hours": round(total_work_hours, 1),
        "avg_sales_per_day": avg_sales_per_day,
        "avg_customers_per_day": round(avg_customers_per_day, 1),
        "best_day": {"date": best_day[0], "sales": best_day[1]} if best_day else None,
        "worst_day": {"date": worst_day[0], "sales": worst_day[1]} if worst_day else None,
        "weekday_sales": weekday_sales,
        "weekend_sales": weekend_sales,
        "weekday_count": weekday_count,
        "weekend_count": weekend_count,
        "avg_weekday_sales": weekday_sales // weekday_count if weekday_count > 0 else 0,
        "avg_weekend_sales": weekend_sales // weekend_count if weekend_count > 0 else 0
    }


# ====== 🆕 パスワードリセットAPI ======

# パスワードリセットトークンの一時保存（本番ではRedis等を使用）
password_reset_tokens = {}

@app.post("/api/auth/password-reset/request")
def request_password_reset(
    email: str,
    db: Session = Depends(get_db)
):
    """パスワードリセットをリクエスト"""
    import secrets
    
    # 従業員を検索
    employee = db.query(Employee).filter(Employee.email == email).first()
    
    # セキュリティ上、存在しない場合も同じレスポンスを返す
    if employee:
        # リセットトークン生成
        reset_token = secrets.token_urlsafe(32)
        password_reset_tokens[reset_token] = {
            "user_id": employee.id,
            "email": email,
            "expires_at": datetime.utcnow() + timedelta(hours=1)
        }
        
        # TODO: 本番環境ではメール送信
        # send_password_reset_email(email, reset_token)
        
        print(f"🔑 パスワードリセットトークン生成: {reset_token} (メール: {email})")
    
    return {
        "message": "パスワードリセットのメールを送信しました（登録されているメールアドレスの場合）",
        # 開発用にトークンを返す（本番では削除）
        "dev_token": reset_token if employee else None
    }


@app.post("/api/auth/password-reset/verify")
def verify_reset_token(
    token: str,
    db: Session = Depends(get_db)
):
    """パスワードリセットトークンを検証"""
    if token not in password_reset_tokens:
        raise HTTPException(status_code=400, detail="無効なトークンです")
    
    token_data = password_reset_tokens[token]
    
    if datetime.utcnow() > token_data["expires_at"]:
        del password_reset_tokens[token]
        raise HTTPException(status_code=400, detail="トークンの有効期限が切れています")
    
    return {
        "valid": True,
        "email": token_data["email"]
    }


@app.post("/api/auth/password-reset/confirm")
def confirm_password_reset(
    token: str,
    new_password: str,
    db: Session = Depends(get_db)
):
    """パスワードをリセット"""
    if token not in password_reset_tokens:
        raise HTTPException(status_code=400, detail="無効なトークンです")
    
    token_data = password_reset_tokens[token]
    
    if datetime.utcnow() > token_data["expires_at"]:
        del password_reset_tokens[token]
        raise HTTPException(status_code=400, detail="トークンの有効期限が切れています")
    
    # パスワード強度チェック
    is_valid, msg = validate_password_strength(new_password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=msg)
    
    # 従業員を取得してパスワード更新
    employee = db.query(Employee).filter(Employee.id == token_data["user_id"]).first()
    if not employee:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    
    employee.password_hash = get_password_hash(new_password)
    employee.updated_at = datetime.utcnow()
    db.commit()
    
    # トークンを削除
    del password_reset_tokens[token]
    
    return {"message": "パスワードを更新しました"}


# ====== 🆕 プロフィール更新API ======

@app.get("/api/employees/me/profile")
def get_my_profile(
    current_user = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """自分のプロフィールを取得"""
    store = db.query(Store).filter(Store.id == current_user.store_id).first()
    
    return {
        "id": current_user.id,
        "employee_code": current_user.employee_code,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role.value if hasattr(current_user.role, 'value') else current_user.role,
        "position": current_user.position,
        "phone": current_user.phone,
        "hire_date": current_user.hire_date.isoformat() if current_user.hire_date else None,
        "hourly_wage": current_user.hourly_wage,
        "employment_type": current_user.employment_type,
        "emergency_contact_name": current_user.emergency_contact_name,
        "emergency_contact_phone": current_user.emergency_contact_phone,
        "store": {
            "id": store.id,
            "store_code": store.store_code,
            "store_name": store.store_name
        } if store else None,
        "last_login": current_user.last_login.isoformat() if current_user.last_login else None,
        "created_at": current_user.created_at.isoformat(),
        "updated_at": current_user.updated_at.isoformat()
    }


@app.put("/api/employees/me/profile")
def update_my_profile(
    profile_data: dict,
    request: Request,
    current_user = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """自分のプロフィールを更新"""
    try:
        # 更新可能なフィールド
        allowed_fields = ["name", "phone", "emergency_contact_name", "emergency_contact_phone"]
        
        changes = {}
        for field in allowed_fields:
            if field in profile_data:
                setattr(current_user, field, profile_data[field])
                changes[field] = profile_data[field]
        
        current_user.updated_at = datetime.utcnow()
        db.commit()
        
        # 監査ログ記録
        log_user_action(
            db, current_user, "update_profile", "employee",
            resource_id=current_user.id,
            changes=changes,
            request=request
        )
        
        return {
            "message": "プロフィールを更新しました",
            "updated_fields": list(changes.keys())
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"プロフィール更新に失敗: {str(e)}")


@app.put("/api/employees/me/password")
def change_my_password(
    password_data: dict,
    request: Request,
    current_user = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """自分のパスワードを変更"""
    current_password = password_data.get("current_password")
    new_password = password_data.get("new_password")
    
    if not current_password or not new_password:
        raise HTTPException(status_code=400, detail="現在のパスワードと新しいパスワードを入力してください")
    
    # 現在のパスワードを検証
    if not verify_password(current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="現在のパスワードが正しくありません")
    
    # 新しいパスワードの強度チェック
    is_valid, msg = validate_password_strength(new_password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=msg)
    
    try:
        current_user.password_hash = get_password_hash(new_password)
        current_user.updated_at = datetime.utcnow()
        db.commit()
        
        # 監査ログ記録
        log_user_action(
            db, current_user, "change_password", "employee",
            resource_id=current_user.id,
            request=request
        )
        
        return {"message": "パスワードを変更しました"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"パスワード変更に失敗: {str(e)}")


# ====== 🆕 CSV/Excelエクスポート API ======

@app.get("/api/exports/daily-reports")
def export_daily_reports(
    format: str = "csv",  # csv または json
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    current_user = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """日報データをエクスポート"""
    from fastapi.responses import StreamingResponse
    import csv
    import io
    
    # 権限チェック
    if current_user.role.value not in ['manager', 'owner']:
        raise HTTPException(status_code=403, detail="エクスポート権限がありません")
    
    # 日付範囲のデフォルト（今月）
    if not date_from:
        date_from = date.today().replace(day=1)
    if not date_to:
        date_to = date.today()
    
    # 日報を取得
    reports = db.query(DailyReport).filter(
        DailyReport.store_id == current_user.store_id,
        DailyReport.report_date >= date_from,
        DailyReport.report_date <= date_to
    ).order_by(DailyReport.report_date).all()
    
    # 従業員情報を取得
    employee_ids = list(set(r.employee_id for r in reports))
    employees = {e.id: e.name for e in db.query(Employee).filter(Employee.id.in_(employee_ids)).all()}
    
    if format == "json":
        return [
            {
                "日付": r.report_date.isoformat(),
                "従業員名": employees.get(r.employee_id, ""),
                "総売上": r.total_sales,
                "客数": r.number_of_customers,
                "ドリンク売上": r.drink_sales,
                "ドリンク数": r.drink_count,
                "シャンパン売上": r.champagne_sales,
                "キャッチ数": r.catch_count or 0,
                "現金売上": r.cash_sales,
                "カード売上": r.card_sales,
                "勤務開始": r.work_start_time,
                "勤務終了": r.work_end_time,
                "承認済み": "○" if r.is_approved else "×"
            } for r in reports
        ]
    
    # CSV形式
    output = io.StringIO()
    writer = csv.writer(output)
    
    # ヘッダー
    writer.writerow([
        "日付", "従業員名", "総売上", "客数", "ドリンク売上", "ドリンク数",
        "シャンパン売上", "キャッチ数", "現金売上", "カード売上",
        "勤務開始", "勤務終了", "承認済み"
    ])
    
    # データ
    for r in reports:
        writer.writerow([
            r.report_date.isoformat(),
            employees.get(r.employee_id, ""),
            r.total_sales,
            r.number_of_customers,
            r.drink_sales,
            r.drink_count,
            r.champagne_sales,
            r.catch_count or 0,
            r.cash_sales,
            r.card_sales,
            r.work_start_time,
            r.work_end_time,
            "○" if r.is_approved else "×"
        ])
    
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=daily_reports_{date_from}_{date_to}.csv"
        }
    )


@app.get("/api/exports/employees")
def export_employees(
    format: str = "csv",
    current_user = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """従業員データをエクスポート"""
    from fastapi.responses import StreamingResponse
    import csv
    import io
    
    # 権限チェック
    if current_user.role.value not in ['manager', 'owner']:
        raise HTTPException(status_code=403, detail="エクスポート権限がありません")
    
    employees = db.query(Employee).filter(
        Employee.store_id == current_user.store_id
    ).order_by(Employee.employee_code).all()
    
    if format == "json":
        return [
            {
                "従業員コード": e.employee_code,
                "名前": e.name,
                "メール": e.email,
                "役割": e.role.value if hasattr(e.role, 'value') else e.role,
                "電話": e.phone or "",
                "入社日": e.hire_date.isoformat() if e.hire_date else "",
                "時給": e.hourly_wage,
                "雇用形態": e.employment_type,
                "アクティブ": "○" if e.is_active else "×"
            } for e in employees
        ]
    
    # CSV形式
    output = io.StringIO()
    writer = csv.writer(output)
    
    # ヘッダー
    writer.writerow([
        "従業員コード", "名前", "メール", "役割", "電話",
        "入社日", "時給", "雇用形態", "アクティブ"
    ])
    
    # データ
    for e in employees:
        writer.writerow([
            e.employee_code,
            e.name,
            e.email,
            e.role.value if hasattr(e.role, 'value') else e.role,
            e.phone or "",
            e.hire_date.isoformat() if e.hire_date else "",
            e.hourly_wage,
            e.employment_type,
            "○" if e.is_active else "×"
        ])
    
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=employees_{date.today()}.csv"
        }
    )


# ====== 個人目標管理エンドポイント ======

@app.post("/api/personal-goals", response_model=PersonalGoalResponse)
def save_personal_goal(
    goal_data: PersonalGoalInput,
    request: Request,
    current_user = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """
    個人目標を保存または更新
    - 既存の目標があれば更新、なければ新規作成
    """
    try:
        # 同じ年月の目標が既に存在するかチェック
        existing_goal = db.query(PersonalGoal).filter(
            PersonalGoal.employee_id == current_user.id,
            PersonalGoal.year == goal_data.year,
            PersonalGoal.month == goal_data.month
        ).first()
        
        if existing_goal:
            # 既存の目標を更新
            existing_goal.sales_goal = goal_data.sales_goal
            existing_goal.drinks_goal = goal_data.drinks_goal
            existing_goal.catch_goal = goal_data.catch_goal
            existing_goal.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(existing_goal)
            
            # 監査ログ記録
            log_user_action(
                db, current_user, "update_personal_goal", "personal_goal",
                resource_id=existing_goal.id,
                changes={"year": goal_data.year, "month": goal_data.month, "sales_goal": goal_data.sales_goal},
                request=request
            )
            
            return existing_goal
        else:
            # 新規目標を作成
            new_goal = PersonalGoal(
                employee_id=current_user.id,
                year=goal_data.year,
                month=goal_data.month,
                sales_goal=goal_data.sales_goal,
                drinks_goal=goal_data.drinks_goal,
                catch_goal=goal_data.catch_goal
            )
            db.add(new_goal)
            db.commit()
            db.refresh(new_goal)
            
            # 監査ログ記録
            log_user_action(
                db, current_user, "create_personal_goal", "personal_goal",
                resource_id=new_goal.id,
                changes={"year": goal_data.year, "month": goal_data.month, "sales_goal": goal_data.sales_goal},
                request=request
            )
            
            return new_goal
            
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"個人目標の保存に失敗しました: {str(e)}"
        )


@app.get("/api/personal-goals", response_model=PersonalGoalResponse)
def get_personal_goal(
    year: Optional[int] = None,
    month: Optional[int] = None,
    current_user = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """
    指定した年月の個人目標を取得
    - 指定がない場合は現在の年月を使用
    """
    if not year:
        year = datetime.now().year
    if not month:
        month = datetime.now().month
    
    goal = db.query(PersonalGoal).filter(
        PersonalGoal.employee_id == current_user.id,
        PersonalGoal.year == year,
        PersonalGoal.month == month
    ).first()
    
    if not goal:
        # 目標が存在しない場合はデフォルト値を返す
        return PersonalGoalResponse(
            id=0,
            employee_id=current_user.id,
            year=year,
            month=month,
            sales_goal=500000,
            drinks_goal=100,
            catch_goal=50,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
    
    return goal


@app.get("/api/personal-goals/history", response_model=List[PersonalGoalResponse])
def get_personal_goal_history(
    current_user = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """
    自分の個人目標の履歴を全て取得
    """
    goals = db.query(PersonalGoal).filter(
        PersonalGoal.employee_id == current_user.id
    ).order_by(
        PersonalGoal.year.desc(),
        PersonalGoal.month.desc()
    ).all()
    
    return goals


# ====== 店舗目標管理エンドポイント ======

@app.post("/api/stores/{store_id}/goals", response_model=StoreGoalResponse)
def save_store_goal(
    store_id: int,
    goal_data: StoreGoalInput,
    request: Request,
    current_user = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """店舗目標を保存または更新（店長・オーナーのみ）"""
    # 権限チェック
    if current_user.role.value not in ['manager', 'owner']:
        raise HTTPException(status_code=403, detail="店舗目標の設定権限がありません")
    
    if current_user.store_id != store_id:
        raise HTTPException(status_code=403, detail="他店舗の目標は設定できません")
    
    try:
        existing_goal = db.query(StoreGoal).filter(
            StoreGoal.store_id == store_id,
            StoreGoal.year == goal_data.year,
            StoreGoal.month == goal_data.month
        ).first()
        
        if existing_goal:
            existing_goal.monthly_sales_goal = goal_data.monthly_sales_goal
            existing_goal.weekday_sales_goal = goal_data.weekday_sales_goal
            existing_goal.weekend_sales_goal = goal_data.weekend_sales_goal
            existing_goal.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(existing_goal)
            return existing_goal
        else:
            new_goal = StoreGoal(
                store_id=store_id,
                year=goal_data.year,
                month=goal_data.month,
                monthly_sales_goal=goal_data.monthly_sales_goal,
                weekday_sales_goal=goal_data.weekday_sales_goal,
                weekend_sales_goal=goal_data.weekend_sales_goal
            )
            db.add(new_goal)
            db.commit()
            db.refresh(new_goal)
            return new_goal
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"店舗目標の保存に失敗: {str(e)}")


@app.get("/api/stores/{store_id}/goals", response_model=StoreGoalResponse)
def get_store_goal(
    store_id: int,
    year: Optional[int] = None,
    month: Optional[int] = None,
    current_user = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """店舗目標を取得"""
    if current_user.store_id != store_id:
        raise HTTPException(status_code=403, detail="他店舗の目標は閲覧できません")
    
    if not year:
        year = datetime.now().year
    if not month:
        month = datetime.now().month
    
    goal = db.query(StoreGoal).filter(
        StoreGoal.store_id == store_id,
        StoreGoal.year == year,
        StoreGoal.month == month
    ).first()
    
    if not goal:
        return StoreGoalResponse(
            id=0,
            store_id=store_id,
            year=year,
            month=month,
            monthly_sales_goal=3000000,
            weekday_sales_goal=100000,
            weekend_sales_goal=200000,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
    
    return goal


# ====== シフト管理エンドポイント ======

@app.post("/api/stores/{store_id}/shifts", response_model=ShiftResponse)
def create_shift(
    store_id: int,
    shift_data: ShiftCreate,
    request: Request,
    current_user = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """シフトを作成（店長・オーナーのみ）"""
    if current_user.role.value not in ['manager', 'owner']:
        raise HTTPException(status_code=403, detail="シフト作成権限がありません")
    
    if current_user.store_id != store_id:
        raise HTTPException(status_code=403, detail="他店舗のシフトは作成できません")
    
    # 従業員の存在確認
    employee = db.query(Employee).filter(
        Employee.id == shift_data.employee_id,
        Employee.store_id == store_id
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail="従業員が見つかりません")
    
    try:
        new_shift = Shift(
            store_id=store_id,
            employee_id=shift_data.employee_id,
            shift_date=shift_data.shift_date,
            start_time=shift_data.start_time,
            end_time=shift_data.end_time,
            notes=shift_data.notes,
            created_by_id=current_user.id
        )
        db.add(new_shift)
        db.commit()
        db.refresh(new_shift)
        
        # 通知を作成
        notification = Notification(
            store_id=store_id,
            employee_id=shift_data.employee_id,
            notification_type=NotificationType.SHIFT_ASSIGNED,
            title="新しいシフトが割り当てられました",
            message=f"{shift_data.shift_date.strftime('%Y年%m月%d日')} {shift_data.start_time}〜{shift_data.end_time}",
            related_entity_type="shift",
            related_entity_id=new_shift.id
        )
        db.add(notification)
        db.commit()
        
        return ShiftResponse(
            id=new_shift.id,
            store_id=new_shift.store_id,
            employee_id=new_shift.employee_id,
            employee_name=employee.name,
            shift_date=new_shift.shift_date,
            start_time=new_shift.start_time,
            end_time=new_shift.end_time,
            status=new_shift.status.value,
            notes=new_shift.notes,
            created_at=new_shift.created_at,
            updated_at=new_shift.updated_at
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"シフト作成に失敗: {str(e)}")


@app.get("/api/stores/{store_id}/shifts", response_model=List[ShiftResponse])
def get_shifts(
    store_id: int,
    year: Optional[int] = None,
    month: Optional[int] = None,
    employee_id: Optional[int] = None,
    current_user = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """シフト一覧を取得"""
    if current_user.store_id != store_id:
        raise HTTPException(status_code=403, detail="他店舗のシフトは閲覧できません")
    
    query = db.query(Shift).filter(Shift.store_id == store_id)
    
    if year and month:
        from calendar import monthrange
        start_date = date(year, month, 1)
        _, last_day = monthrange(year, month)
        end_date = date(year, month, last_day)
        query = query.filter(Shift.shift_date >= start_date, Shift.shift_date <= end_date)
    
    if employee_id:
        query = query.filter(Shift.employee_id == employee_id)
    
    shifts = query.order_by(Shift.shift_date, Shift.start_time).all()
    
    # 従業員名を取得
    employee_ids = list(set(s.employee_id for s in shifts))
    employees = {e.id: e.name for e in db.query(Employee).filter(Employee.id.in_(employee_ids)).all()}
    
    return [
        ShiftResponse(
            id=s.id,
            store_id=s.store_id,
            employee_id=s.employee_id,
            employee_name=employees.get(s.employee_id, ""),
            shift_date=s.shift_date,
            start_time=s.start_time,
            end_time=s.end_time,
            status=s.status.value,
            notes=s.notes,
            created_at=s.created_at,
            updated_at=s.updated_at
        ) for s in shifts
    ]


@app.put("/api/stores/{store_id}/shifts/{shift_id}", response_model=ShiftResponse)
def update_shift(
    store_id: int,
    shift_id: int,
    shift_data: ShiftUpdate,
    request: Request,
    current_user = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """シフトを更新"""
    if current_user.role.value not in ['manager', 'owner']:
        raise HTTPException(status_code=403, detail="シフト更新権限がありません")
    
    shift = db.query(Shift).filter(Shift.id == shift_id, Shift.store_id == store_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="シフトが見つかりません")
    
    try:
        if shift_data.employee_id is not None:
            shift.employee_id = shift_data.employee_id
        if shift_data.shift_date is not None:
            shift.shift_date = shift_data.shift_date
        if shift_data.start_time is not None:
            shift.start_time = shift_data.start_time
        if shift_data.end_time is not None:
            shift.end_time = shift_data.end_time
        if shift_data.status is not None:
            shift.status = ShiftStatus[shift_data.status.upper()]
        if shift_data.notes is not None:
            shift.notes = shift_data.notes
        
        shift.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(shift)
        
        employee = db.query(Employee).filter(Employee.id == shift.employee_id).first()
        
        return ShiftResponse(
            id=shift.id,
            store_id=shift.store_id,
            employee_id=shift.employee_id,
            employee_name=employee.name if employee else "",
            shift_date=shift.shift_date,
            start_time=shift.start_time,
            end_time=shift.end_time,
            status=shift.status.value,
            notes=shift.notes,
            created_at=shift.created_at,
            updated_at=shift.updated_at
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"シフト更新に失敗: {str(e)}")


@app.delete("/api/stores/{store_id}/shifts/{shift_id}")
def delete_shift(
    store_id: int,
    shift_id: int,
    current_user = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """シフトを削除"""
    if current_user.role.value not in ['manager', 'owner']:
        raise HTTPException(status_code=403, detail="シフト削除権限がありません")
    
    shift = db.query(Shift).filter(Shift.id == shift_id, Shift.store_id == store_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="シフトが見つかりません")
    
    try:
        db.delete(shift)
        db.commit()
        return {"message": "シフトを削除しました"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"シフト削除に失敗: {str(e)}")


# ====== シフト希望エンドポイント ======

@app.post("/api/stores/{store_id}/shift-requests", response_model=ShiftRequestResponse)
def create_shift_request(
    store_id: int,
    request_data: ShiftRequestCreate,
    request: Request,
    current_user = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """シフト希望を提出"""
    if current_user.store_id != store_id:
        raise HTTPException(status_code=403, detail="他店舗にシフト希望は出せません")
    
    try:
        new_request = ShiftRequest(
            store_id=store_id,
            employee_id=current_user.id,
            request_date=request_data.request_date,
            start_time=request_data.start_time,
            end_time=request_data.end_time,
            request_type=ShiftRequestType[request_data.request_type.upper()],
            notes=request_data.notes
        )
        db.add(new_request)
        db.commit()
        db.refresh(new_request)
        
        return ShiftRequestResponse(
            id=new_request.id,
            store_id=new_request.store_id,
            employee_id=new_request.employee_id,
            employee_name=current_user.name,
            request_date=new_request.request_date,
            start_time=new_request.start_time,
            end_time=new_request.end_time,
            request_type=new_request.request_type.value,
            notes=new_request.notes,
            is_approved=new_request.is_approved,
            approved_by_id=new_request.approved_by_id,
            approved_at=new_request.approved_at,
            created_at=new_request.created_at
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"シフト希望の提出に失敗: {str(e)}")


@app.get("/api/stores/{store_id}/shift-requests", response_model=List[ShiftRequestResponse])
def get_shift_requests(
    store_id: int,
    year: Optional[int] = None,
    month: Optional[int] = None,
    current_user = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """シフト希望一覧を取得"""
    if current_user.store_id != store_id:
        raise HTTPException(status_code=403, detail="他店舗のシフト希望は閲覧できません")
    
    query = db.query(ShiftRequest).filter(ShiftRequest.store_id == store_id)
    
    # 一般スタッフは自分の希望のみ
    if current_user.role.value == 'staff':
        query = query.filter(ShiftRequest.employee_id == current_user.id)
    
    if year and month:
        from calendar import monthrange
        start_date = date(year, month, 1)
        _, last_day = monthrange(year, month)
        end_date = date(year, month, last_day)
        query = query.filter(ShiftRequest.request_date >= start_date, ShiftRequest.request_date <= end_date)
    
    requests = query.order_by(ShiftRequest.request_date).all()
    
    employee_ids = list(set(r.employee_id for r in requests))
    employees = {e.id: e.name for e in db.query(Employee).filter(Employee.id.in_(employee_ids)).all()}
    
    return [
        ShiftRequestResponse(
            id=r.id,
            store_id=r.store_id,
            employee_id=r.employee_id,
            employee_name=employees.get(r.employee_id, ""),
            request_date=r.request_date,
            start_time=r.start_time,
            end_time=r.end_time,
            request_type=r.request_type.value,
            notes=r.notes,
            is_approved=r.is_approved,
            approved_by_id=r.approved_by_id,
            approved_at=r.approved_at,
            created_at=r.created_at
        ) for r in requests
    ]


# ====== 通知エンドポイント ======

@app.get("/api/notifications", response_model=List[NotificationResponse])
def get_notifications(
    unread_only: bool = False,
    limit: int = 50,
    current_user = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """自分宛の通知一覧を取得"""
    query = db.query(Notification).filter(Notification.employee_id == current_user.id)
    
    if unread_only:
        query = query.filter(Notification.is_read == False)
    
    notifications = query.order_by(Notification.created_at.desc()).limit(limit).all()
    
    return [
        NotificationResponse(
            id=n.id,
            store_id=n.store_id,
            employee_id=n.employee_id,
            notification_type=n.notification_type.value,
            title=n.title,
            message=n.message,
            is_read=n.is_read,
            read_at=n.read_at,
            related_entity_type=n.related_entity_type,
            related_entity_id=n.related_entity_id,
            created_at=n.created_at
        ) for n in notifications
    ]


@app.put("/api/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    current_user = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """通知を既読にする"""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.employee_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="通知が見つかりません")
    
    notification.is_read = True
    notification.read_at = datetime.utcnow()
    db.commit()
    
    return {"message": "既読にしました"}


@app.put("/api/notifications/read-all")
def mark_all_notifications_read(
    current_user = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """全ての通知を既読にする"""
    db.query(Notification).filter(
        Notification.employee_id == current_user.id,
        Notification.is_read == False
    ).update({"is_read": True, "read_at": datetime.utcnow()})
    db.commit()
    
    return {"message": "全て既読にしました"}


@app.get("/api/notifications/unread-count")
def get_unread_count(
    current_user = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """未読通知数を取得"""
    count = db.query(Notification).filter(
        Notification.employee_id == current_user.id,
        Notification.is_read == False
    ).count()
    
    return {"unread_count": count}


@app.post("/api/stores/{store_id}/notifications", response_model=NotificationResponse)
def create_notification(
    store_id: int,
    notification_data: NotificationCreate,
    current_user = Depends(get_current_employee),
    db: Session = Depends(get_db)
):
    """通知を作成（店長・オーナーのみ）"""
    if current_user.role.value not in ['manager', 'owner']:
        raise HTTPException(status_code=403, detail="通知作成権限がありません")
    
    if current_user.store_id != store_id:
        raise HTTPException(status_code=403, detail="他店舗には通知を送れません")
    
    try:
        new_notification = Notification(
            store_id=store_id,
            employee_id=notification_data.employee_id,
            notification_type=NotificationType[notification_data.notification_type.upper()],
            title=notification_data.title,
            message=notification_data.message,
            related_entity_type=notification_data.related_entity_type,
            related_entity_id=notification_data.related_entity_id
        )
        db.add(new_notification)
        db.commit()
        db.refresh(new_notification)
        
        return NotificationResponse(
            id=new_notification.id,
            store_id=new_notification.store_id,
            employee_id=new_notification.employee_id,
            notification_type=new_notification.notification_type.value,
            title=new_notification.title,
            message=new_notification.message,
            is_read=new_notification.is_read,
            read_at=new_notification.read_at,
            related_entity_type=new_notification.related_entity_type,
            related_entity_id=new_notification.related_entity_id,
            created_at=new_notification.created_at
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"通知作成に失敗: {str(e)}")


if __name__ == "__main__":
    print("=== バー管理システム SaaS API ===")
    print("依存関係をチェック中...")
    
    if not check_dependencies():
        print("必要なパッケージをインストールしてから再実行してください")
        exit(1)
    
    print("依存関係チェック完了")
    print("APIサーバーを起動中...")
    
    uvicorn.run(
        "main_saas:app",
        host="0.0.0.0",
        port=8002,
        reload=True,
        log_level="info"
    )