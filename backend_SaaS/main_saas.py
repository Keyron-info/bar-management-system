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

# インポート部分（上部）に追加
from database_saas import (
    get_db, create_tables, SystemAdmin, Organization, Store, Employee, 
    Subscription, InviteCode, DailyReport, Receipt, AuditLog,
    PersonalGoal,  # ← 追加
    generate_store_code, generate_employee_code, generate_invite_code,
    create_super_admin, UserRole, SubscriptionStatus, InviteStatus
)

from schemas_saas import (
    # ... 既存のインポート ...
    PersonalGoalInput, PersonalGoalResponse,  # ← 追加
)

# SaaS対応インポート
from database_saas import (
    get_db, create_tables, SystemAdmin, Organization, Store, Employee, 
    Subscription, InviteCode, DailyReport, Receipt, AuditLog,
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

app = FastAPI(
    title="バー管理システム SaaS API", 
    version="3.0.0",
    description="マルチテナント対応バー管理システム"
)

# CORS設定（本番環境対応）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 開発段階では全てのオリジンを許可
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# セキュリティヘッダーミドルウェア
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    
    # セキュリティヘッダーを追加
    security_headers = create_security_headers()
    for header, value in security_headers.items():
        response.headers[header] = value
    
    # UTF-8レスポンス
    if response.headers.get("content-type", "").startswith("application/json"):
        response.headers["content-type"] = "application/json; charset=utf-8"
    
    return response

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
        
        # 開発用スーパーアドミン作成（エラーハンドリング強化）
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

# ====== ヘルスチェック・基本エンドポイント ======

@app.get("/")
async def root():
    return JSONResponse(
        content={"message": "バー管理システム SaaS API が正常に動作しています", "version": "3.0.0"},
        media_type="application/json; charset=utf-8"
    )
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

@app.get("/api/admin/dashboard")
def get_super_admin_dashboard(
    admin: SystemAdmin = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """スーパーアドミンダッシュボード"""
    # 統計データ取得
    total_orgs = db.query(Organization).filter(Organization.is_active == True).count()
    total_stores = db.query(Store).filter(Store.is_active == True).count()
    total_employees = db.query(Employee).filter(Employee.is_active == True).count()
    
    # サブスクリプション統計
    active_subs = db.query(Subscription).filter(Subscription.status == SubscriptionStatus.ACTIVE).count()
    trial_subs = db.query(Subscription).filter(Subscription.status == SubscriptionStatus.TRIAL).count()
    
    # 月次売上合計（全組織）
    monthly_revenue = db.query(func.sum(Subscription.monthly_fee)).filter(
        Subscription.status == SubscriptionStatus.ACTIVE
    ).scalar() or 0.0
    
    # 最近の組織
    recent_orgs = db.query(Organization).filter(
        Organization.is_active == True
    ).order_by(Organization.created_at.desc()).limit(5).all()
    
    return {
        "total_organizations": total_orgs,
        "total_stores": total_stores,
        "total_employees": total_employees,
        "total_monthly_revenue": monthly_revenue,
        "active_subscriptions": active_subs,
        "trial_subscriptions": trial_subs,
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
            invite_code=initial_invite,
            invited_role=UserRole.MANAGER,
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
        DailyReport.date == today
    ).scalar() or 0
    
    # 今月の売上
    current_month = today.replace(day=1)
    month_sales = db.query(func.sum(DailyReport.total_sales)).filter(
        DailyReport.store_id == store_id,
        DailyReport.date >= current_month
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
                "date": report.date.isoformat(),
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
        invite_code=invite_code_str,
        invited_role=invite_data.invited_role,
        invited_email=invite_data.invited_email,
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
        "invite_code": invite_code.invite_code,
        "invited_role": invite_code.invited_role,
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
            "invite_code": code.invite_code,
            "invited_role": code.invited_role,
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
        InviteCode.invite_code == invite_data.invite_code,
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
        role=invite_code.invited_role,  # 招待コードで指定された役割
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
        DailyReport.date == report_data.date
    ).first()
    
    if existing_report:
        raise HTTPException(status_code=400, detail="この日付の日報は既に作成されています")
    
    # 日報作成
    daily_report = DailyReport(
        store_id=store_id,
        employee_id=current_user.id,
        date=report_data.date,
        total_sales=report_data.total_sales,
        alcohol_cost=report_data.alcohol_cost,
        other_expenses=report_data.other_expenses,
        card_sales=report_data.card_sales,
        drink_count=report_data.drink_count,
        champagne_type=report_data.champagne_type,
        champagne_price=report_data.champagne_price,
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
        "date": daily_report.date.isoformat(),
        "total_sales": daily_report.total_sales,
        "alcohol_cost": daily_report.alcohol_cost,
        "other_expenses": daily_report.other_expenses,
        "card_sales": daily_report.card_sales,
        "drink_count": daily_report.drink_count,
        "champagne_type": daily_report.champagne_type,
        "champagne_price": daily_report.champagne_price,
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
        query = query.filter(DailyReport.date >= date_from)
    if date_to:
        query = query.filter(DailyReport.date <= date_to)
    if is_approved is not None:
        query = query.filter(DailyReport.is_approved == is_approved)
    
    reports = query.order_by(DailyReport.date.desc()).offset(skip).limit(limit).all()
    
    return [
        {
            "id": report.id,
            "store_id": report.store_id,
            "employee_id": report.employee_id,
            "date": report.date.isoformat(),
            "total_sales": report.total_sales,
            "alcohol_cost": report.alcohol_cost,
            "other_expenses": report.other_expenses,
            "card_sales": report.card_sales,
            "drink_count": report.drink_count,
            "champagne_type": report.champagne_type,
            "champagne_price": report.champagne_price,
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