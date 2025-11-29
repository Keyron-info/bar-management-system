from pydantic import BaseModel, EmailStr, Field
from datetime import date, datetime
from typing import Optional, List
from enum import Enum

# ====== Enumクラス ======

class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    OWNER = "owner"
    MANAGER = "manager"
    STAFF = "staff"

class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    CANCELLED = "cancelled"
    TRIAL = "trial"

class InviteStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    EXPIRED = "expired"

# ====== システム管理者関連スキーマ ======

class SystemAdminCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    name: str = Field(..., min_length=1, max_length=100)
    is_super_admin: bool = True

class SystemAdminLogin(BaseModel):
    email: EmailStr
    password: str

class SystemAdminResponse(BaseModel):
    id: int
    email: str
    name: str
    is_super_admin: bool
    can_create_organizations: bool
    can_manage_subscriptions: bool
    can_access_all_data: bool
    last_login: Optional[datetime] = None
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# ====== 組織関連スキーマ ======

class OrganizationCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    domain: str = Field(..., min_length=1, max_length=100)
    contact_email: EmailStr
    phone: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = None

class OrganizationUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    contact_email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = None
    is_active: Optional[bool] = None

class OrganizationResponse(BaseModel):
    id: int
    name: str
    domain: str
    contact_email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# ====== 店舗関連スキーマ ======

class StoreCreate(BaseModel):
    organization_id: int
    store_name: str = Field(..., min_length=1, max_length=200)
    store_type: str = Field(default="bar", max_length=50)
    address: Optional[str] = None
    phone: Optional[str] = Field(None, max_length=50)
    timezone: str = Field(default="Asia/Tokyo", max_length=50)
    currency: str = Field(default="JPY", max_length=10)
    business_hours_start: Optional[str] = Field(None, pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$")
    business_hours_end: Optional[str] = Field(None, pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$")

class StoreUpdate(BaseModel):
    store_name: Optional[str] = Field(None, min_length=1, max_length=200)
    address: Optional[str] = None
    phone: Optional[str] = Field(None, max_length=50)
    business_hours_start: Optional[str] = Field(None, pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$")
    business_hours_end: Optional[str] = Field(None, pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$")
    is_active: Optional[bool] = None

class StoreResponse(BaseModel):
    id: int
    organization_id: int
    store_code: str
    store_name: str
    store_type: str
    address: Optional[str] = None
    phone: Optional[str] = None
    timezone: str
    currency: str
    business_hours_start: Optional[str] = None
    business_hours_end: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# ====== サブスクリプション関連スキーマ ======

class SubscriptionCreate(BaseModel):
    organization_id: int
    plan_name: str = Field(..., min_length=1, max_length=100)
    max_stores: int = Field(default=1, ge=1)
    max_employees_per_store: int = Field(default=10, ge=1)
    monthly_fee: float = Field(default=0.0, ge=0)
    trial_end_date: Optional[datetime] = None

class SubscriptionUpdate(BaseModel):
    plan_name: Optional[str] = Field(None, min_length=1, max_length=100)
    status: Optional[SubscriptionStatus] = None
    max_stores: Optional[int] = Field(None, ge=1)
    max_employees_per_store: Optional[int] = Field(None, ge=1)
    monthly_fee: Optional[float] = Field(None, ge=0)
    trial_end_date: Optional[datetime] = None
    next_billing_date: Optional[datetime] = None

class SubscriptionResponse(BaseModel):
    id: int
    organization_id: int
    plan_name: str
    status: SubscriptionStatus
    max_stores: int
    max_employees_per_store: int
    monthly_fee: float
    billing_cycle_day: int
    trial_end_date: Optional[datetime] = None
    next_billing_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# ====== 従業員関連スキーマ ======

class EmployeeCreate(BaseModel):
    store_id: int
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: UserRole = UserRole.STAFF
    hire_date: Optional[date] = None
    hourly_wage: float = Field(default=0.0, ge=0)
    employment_type: str = Field(default="part_time", max_length=50)
    phone: Optional[str] = Field(None, max_length=50)
    emergency_contact_name: Optional[str] = Field(None, max_length=100)
    emergency_contact_phone: Optional[str] = Field(None, max_length=50)

class EmployeeUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    hourly_wage: Optional[float] = Field(None, ge=0)
    employment_type: Optional[str] = Field(None, max_length=50)
    phone: Optional[str] = Field(None, max_length=50)
    emergency_contact_name: Optional[str] = Field(None, max_length=100)
    emergency_contact_phone: Optional[str] = Field(None, max_length=50)

class EmployeeResponse(BaseModel):
    id: int
    store_id: int
    employee_code: str
    name: str
    email: str
    role: UserRole
    is_active: bool
    hire_date: Optional[date] = None
    hourly_wage: float
    employment_type: str
    phone: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class EmployeeLogin(BaseModel):
    email: EmailStr
    password: str
    store_code: Optional[str] = None  # 後方互換性のため

# ====== 招待コード関連スキーマ ======

class InviteCodeCreate(BaseModel):
    store_id: int
    invited_role: UserRole
    invited_email: Optional[EmailStr] = None
    max_uses: int = Field(default=1, ge=1, le=100)
    expires_in_hours: int = Field(default=168, ge=1, le=8760)  # デフォルト1週間、最大1年

class InviteCodeResponse(BaseModel):
    id: int
    store_id: int
    invite_code: str
    invited_role: UserRole
    invited_email: Optional[str] = None
    status: InviteStatus
    expires_at: datetime
    max_uses: int
    current_uses: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class InviteCodeUse(BaseModel):
    invite_code: str
    employee_data: EmployeeCreate

# ====== 認証関連スキーマ ======

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user_type: str  # "admin" または "employee"
    user: dict  # SystemAdminResponse または EmployeeResponse

class SystemAdminToken(BaseModel):
    access_token: str
    token_type: str
    admin: SystemAdminResponse

class EmployeeToken(BaseModel):
    access_token: str
    token_type: str
    employee: EmployeeResponse

# ====== 日報関連スキーマ（拡張版） ======

class DailyReportCreate(BaseModel):
    store_id: int
    employee_id: int
    date: date
    total_sales: int = 0
    alcohol_cost: int = 0
    other_expenses: int = 0
    card_sales: int = 0
    drink_count: int = 0
    champagne_type: str = ""
    champagne_price: int = 0
    catch_count: int = 0  # 🆕 キャッチ数
    work_start_time: str = Field(..., pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$")
    work_end_time: str = Field(..., pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$")
    break_minutes: int = Field(default=0, ge=0, le=480)
    notes: Optional[str] = None

class DailyReportUpdate(BaseModel):
    total_sales: Optional[int] = Field(None, ge=0)
    alcohol_cost: Optional[int] = Field(None, ge=0)
    other_expenses: Optional[int] = Field(None, ge=0)
    card_sales: Optional[int] = Field(None, ge=0)
    drink_count: Optional[int] = Field(None, ge=0)
    champagne_type: Optional[str] = None
    champagne_price: Optional[int] = Field(None, ge=0)
    work_start_time: Optional[str] = Field(None, pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$")
    work_end_time: Optional[str] = Field(None, pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$")
    break_minutes: Optional[int] = Field(None, ge=0, le=480)
    notes: Optional[str] = None

class DailyReportResponse(BaseModel):
    id: int
    store_id: int
    employee_id: int
    date: date
    total_sales: int
    alcohol_cost: int
    other_expenses: int
    card_sales: int
    drink_count: int
    champagne_type: str
    champagne_price: int
    catch_count: int = 0  # 🆕 キャッチ数
    work_start_time: str
    work_end_time: str
    break_minutes: int
    is_approved: bool
    approved_by_employee_id: Optional[int] = None
    approved_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class DailyReportApproval(BaseModel):
    is_approved: bool
    approved_by_employee_id: int

# ====== 伝票関連スキーマ（拡張版） ======

class ReceiptCreate(BaseModel):
    daily_report_id: int
    customer_name: str = Field(..., min_length=1, max_length=100)
    employee_name: str = Field(..., min_length=1, max_length=100)  # 後方互換性
    drink_count: int = Field(default=0, ge=0)
    champagne_type: str = ""
    champagne_price: int = Field(default=0, ge=0)
    amount: int = Field(..., ge=0)
    is_card: bool = False
    receipt_number: Optional[str] = Field(None, max_length=50)
    table_number: Optional[str] = Field(None, max_length=20)
    service_charge: int = Field(default=0, ge=0)

class ReceiptUpdate(BaseModel):
    customer_name: Optional[str] = Field(None, min_length=1, max_length=100)
    drink_count: Optional[int] = Field(None, ge=0)
    champagne_type: Optional[str] = None
    champagne_price: Optional[int] = Field(None, ge=0)
    amount: Optional[int] = Field(None, ge=0)
    is_card: Optional[bool] = None
    receipt_number: Optional[str] = Field(None, max_length=50)
    table_number: Optional[str] = Field(None, max_length=20)
    service_charge: Optional[int] = Field(None, ge=0)

class ReceiptResponse(BaseModel):
    id: int
    daily_report_id: int
    customer_name: str
    employee_name: str
    drink_count: int
    champagne_type: str
    champagne_price: int
    amount: int
    is_card: bool
    receipt_number: Optional[str] = None
    table_number: Optional[str] = None
    service_charge: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# ====== 監査ログ関連スキーマ ======

class AuditLogCreate(BaseModel):
    user_id: int
    user_type: str  # "employee" または "admin"
    action: str = Field(..., min_length=1, max_length=100)
    resource_type: str = Field(..., min_length=1, max_length=50)
    resource_id: Optional[int] = None
    changes: Optional[str] = None  # JSON文字列
    ip_address: Optional[str] = Field(None, max_length=45)
    user_agent: Optional[str] = None

class AuditLogResponse(BaseModel):
    id: int
    user_id: int
    user_type: str
    user_email: str
    action: str
    resource_type: str
    resource_id: Optional[int] = None
    changes: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    organization_id: Optional[int] = None
    store_id: Optional[int] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

# ====== 統計・ダッシュボード関連スキーマ ======

class StoreDashboardResponse(BaseModel):
    store: StoreResponse
    today_sales: int
    month_sales: int
    active_employees: int
    pending_reports: int
    recent_reports: List[DailyReportResponse]

class OrganizationDashboardResponse(BaseModel):
    organization: OrganizationResponse
    total_stores: int
    total_employees: int
    total_monthly_sales: int
    subscription: SubscriptionResponse
    stores: List[StoreResponse]

class SuperAdminDashboardResponse(BaseModel):
    total_organizations: int
    total_stores: int
    total_employees: int
    total_monthly_revenue: float
    active_subscriptions: int
    trial_subscriptions: int
    recent_organizations: List[OrganizationResponse]

# ====== バルク操作用スキーマ ======

class BulkEmployeeCreate(BaseModel):
    employees: List[EmployeeCreate]

class BulkEmployeeResponse(BaseModel):
    success_count: int
    error_count: int
    errors: List[dict]
    created_employees: List[EmployeeResponse]

# ====== 検索・フィルター用スキーマ ======

class EmployeeFilter(BaseModel):
    store_id: Optional[int] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    employment_type: Optional[str] = None

class DailyReportFilter(BaseModel):
    store_id: Optional[int] = None
    employee_id: Optional[int] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    is_approved: Optional[bool] = None

class AuditLogFilter(BaseModel):
    user_type: Optional[str] = None
    action: Optional[str] = None
    resource_type: Optional[str] = None
    organization_id: Optional[int] = None
    store_id: Optional[int] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None

# ====== ページネーション用スキーマ ======

class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1)
    size: int = Field(default=20, ge=1, le=100)

class PaginatedResponse(BaseModel):
    items: List[dict]
    total: int
    page: int
    size: int
    pages: int

# ====== エラーレスポンス用スキーマ ======

class ErrorResponse(BaseModel):
    error: str
    detail: str
    timestamp: datetime

class ValidationErrorResponse(BaseModel):
    error: str
    detail: List[dict]
    timestamp: datetime

# ====== 店舗セットアップ専用スキーマ ======

class StoreDataForSetup(BaseModel):
    """セットアップ時の店舗データ（organization_id不要）"""
    store_name: str = Field(..., min_length=1, max_length=200)
    store_type: str = Field(default="bar", max_length=50)
    address: Optional[str] = None
    phone: Optional[str] = Field(None, max_length=50)
    timezone: str = Field(default="Asia/Tokyo", max_length=50)
    currency: str = Field(default="JPY", max_length=10)
    business_hours_start: Optional[str] = Field(None, pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$")
    business_hours_end: Optional[str] = Field(None, pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$")

class OwnerDataForSetup(BaseModel):
    """セットアップ時のオーナーデータ（store_id不要）"""
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8)
    hire_date: Optional[date] = None
    hourly_wage: float = Field(default=0.0, ge=0)
    employment_type: str = Field(default="full_time", max_length=50)
    phone: Optional[str] = Field(None, max_length=50)
    emergency_contact_name: Optional[str] = Field(None, max_length=100)
    emergency_contact_phone: Optional[str] = Field(None, max_length=50)

class SubscriptionDataForSetup(BaseModel):
    """セットアップ時のサブスクリプションデータ（organization_id不要）"""
    plan_name: str = Field(..., min_length=1, max_length=100)
    max_stores: int = Field(default=1, ge=1)
    max_employees_per_store: int = Field(default=10, ge=1)
    monthly_fee: float = Field(default=0.0, ge=0)
    trial_end_date: Optional[datetime] = None
# ====== 店舗作成ウィザード用スキーマ ======

class StoreSetupWizard(BaseModel):
    """店舗作成時の一括設定用スキーマ"""
    organization_data: OrganizationCreate
    store_data: StoreDataForSetup  # ← 変更
    owner_data: OwnerDataForSetup  # ← 変更
    subscription_data: SubscriptionDataForSetup  # ← 変更

class StoreSetupResponse(BaseModel):
    organization: OrganizationResponse
    store: StoreResponse
    owner: EmployeeResponse
    subscription: SubscriptionResponse
    initial_invite_code: str

# ====== 後方互換性スキーマ ======

class LegacyUserResponse(BaseModel):
    """既存フロントエンド互換用"""
    id: int
    email: str
    name: str
    role: str
    
    class Config:
        from_attributes = True

class LegacyTokenResponse(BaseModel):
    """既存フロントエンド互換用"""
    access_token: str
    token_type: str
    user: LegacyUserResponse

# schemas_saas.py の最後に追加

class EmployeeRegisterInput(BaseModel):
    """新規従業員登録用の簡易スキーマ"""
    store_code: str
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)

class EmployeeRegisterResponse(BaseModel):
    """登録成功レスポンス"""
    id: int
    employee_code: str
    name: str
    email: str
    role: str
    store_name: str
    message: str
    
    class Config:
        from_attributes = True

# ====== 個人目標関連スキーマ ======

class PersonalGoalInput(BaseModel):
    """個人目標入力用スキーマ"""
    year: int
    month: int
    sales_goal: int = 0
    drinks_goal: int = 0
    catch_goal: int = 0

class PersonalGoalResponse(BaseModel):
    """個人目標レスポンス用スキーマ"""
    id: int
    employee_id: int
    year: int
    month: int
    sales_goal: int
    drinks_goal: int
    catch_goal: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ====== 店舗目標関連スキーマ ======

class StoreGoalInput(BaseModel):
    """店舗目標入力用スキーマ"""
    year: int
    month: int
    monthly_sales_goal: int = 3000000
    weekday_sales_goal: int = 100000
    weekend_sales_goal: int = 200000

class StoreGoalResponse(BaseModel):
    """店舗目標レスポンス用スキーマ"""
    id: int
    store_id: int
    year: int
    month: int
    monthly_sales_goal: int
    weekday_sales_goal: int
    weekend_sales_goal: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ====== シフト関連スキーマ ======

class ShiftStatus(str, Enum):
    SCHEDULED = "scheduled"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class ShiftRequestType(str, Enum):
    AVAILABLE = "available"
    UNAVAILABLE = "unavailable"
    PREFERRED = "preferred"

class ShiftCreate(BaseModel):
    """シフト作成用スキーマ"""
    employee_id: int
    shift_date: date
    start_time: str = Field(..., pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$")
    end_time: str = Field(..., pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$")
    notes: Optional[str] = None

class ShiftUpdate(BaseModel):
    """シフト更新用スキーマ"""
    employee_id: Optional[int] = None
    shift_date: Optional[date] = None
    start_time: Optional[str] = Field(None, pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$")
    end_time: Optional[str] = Field(None, pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$")
    status: Optional[ShiftStatus] = None
    notes: Optional[str] = None

class ShiftResponse(BaseModel):
    """シフトレスポンス用スキーマ"""
    id: int
    store_id: int
    employee_id: int
    employee_name: Optional[str] = None
    shift_date: date
    start_time: str
    end_time: str
    status: str
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ShiftRequestCreate(BaseModel):
    """シフト希望作成用スキーマ"""
    request_date: date
    start_time: Optional[str] = Field(None, pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$")
    end_time: Optional[str] = Field(None, pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$")
    request_type: ShiftRequestType = ShiftRequestType.AVAILABLE
    notes: Optional[str] = None

class ShiftRequestResponse(BaseModel):
    """シフト希望レスポンス用スキーマ"""
    id: int
    store_id: int
    employee_id: int
    employee_name: Optional[str] = None
    request_date: date
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    request_type: str
    notes: Optional[str] = None
    is_approved: bool
    approved_by_id: Optional[int] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


# ====== 通知関連スキーマ ======

class NotificationType(str, Enum):
    SHIFT_ASSIGNED = "shift_assigned"
    SHIFT_CHANGED = "shift_changed"
    REPORT_APPROVED = "report_approved"
    REPORT_REJECTED = "report_rejected"
    GOAL_ACHIEVED = "goal_achieved"
    ANNOUNCEMENT = "announcement"
    REMINDER = "reminder"

class NotificationCreate(BaseModel):
    """通知作成用スキーマ"""
    employee_id: int
    notification_type: NotificationType
    title: str = Field(..., min_length=1, max_length=200)
    message: str
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[int] = None

class NotificationResponse(BaseModel):
    """通知レスポンス用スキーマ"""
    id: int
    store_id: int
    employee_id: int
    notification_type: str
    title: str
    message: str
    is_read: bool
    read_at: Optional[datetime] = None
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[int] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class NotificationMarkRead(BaseModel):
    """通知既読マーク用スキーマ"""
    notification_ids: List[int]


# ====== AI伝票スキャン関連スキーマ ======

class ProcessingStatus(str, Enum):
    """OCR処理ステータス"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ReceiptScanRequest(BaseModel):
    """伝票スキャンリクエスト"""
    image_data: str = Field(..., description="Base64エンコードされた画像データ")
    daily_report_id: Optional[int] = Field(None, description="関連付ける日報ID")


class ExtractedReceiptData(BaseModel):
    """OCR抽出データ"""
    total_amount: Optional[int] = Field(None, description="合計金額")
    customer_name: Optional[str] = Field(None, description="顧客名")
    employee_name: Optional[str] = Field(None, description="担当者名")
    date: Optional[str] = Field(None, description="日付 (YYYY-MM-DD)")
    drink_count: Optional[int] = Field(None, description="ドリンク数")
    champagne_type: Optional[str] = Field(None, description="シャンパン種類")
    champagne_price: Optional[int] = Field(None, description="シャンパン金額")
    is_card: Optional[bool] = Field(None, description="カード決済かどうか")


class ReceiptScanResponse(BaseModel):
    """伝票スキャンレスポンス"""
    success: bool
    receipt_image_id: Optional[int] = None
    image_url: Optional[str] = None
    extracted_data: Optional[ExtractedReceiptData] = None
    confidence_score: Optional[float] = None
    ocr_text: Optional[str] = None
    is_test_mode: bool = False
    error: Optional[str] = None
    
    class Config:
        from_attributes = True


class ReceiptScanConfirmRequest(BaseModel):
    """スキャン結果確認リクエスト"""
    confirmed_data: ExtractedReceiptData
    manual_corrections: Optional[dict] = Field(None, description="手動修正内容")
    daily_report_id: Optional[int] = Field(None, description="日報ID")


class ReceiptScanConfirmResponse(BaseModel):
    """スキャン結果確認レスポンス"""
    success: bool
    receipt_id: Optional[int] = None
    daily_report_id: Optional[int] = None
    message: str
    
    class Config:
        from_attributes = True


class ReceiptImageResponse(BaseModel):
    """伝票画像レスポンス"""
    id: int
    store_id: int
    employee_id: int
    daily_report_id: Optional[int] = None
    receipt_id: Optional[int] = None
    image_url: str
    processing_status: str
    confidence_score: Optional[float] = None
    is_verified: bool
    uploaded_at: datetime
    processed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True