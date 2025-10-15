from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional, List

# 店舗関連スキーマ（新規追加）
class StoreCreate(BaseModel):
    store_code: str
    store_name: str
    address: Optional[str] = ""
    phone_number: Optional[str] = ""

class StoreResponse(BaseModel):
    id: int
    store_code: str
    store_name: str
    address: str
    phone_number: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# 従業員関連スキーマ（新規追加）
class EmployeeCreate(BaseModel):
    employee_code: str
    name: str
    email: Optional[str] = ""
    role: str = "staff"  # "staff", "manager", "owner"
    hire_date: date

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class EmployeeResponse(BaseModel):
    id: int
    store_id: int
    employee_code: str
    name: str
    email: str
    role: str
    hire_date: date
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# 売上詳細スキーマ（新規追加）
class SalesDetailInput(BaseModel):
    employee_id: int
    drink_count: int = 0
    champagne_count: int = 0
    customer_info: Optional[str] = ""
    notes: Optional[str] = ""

class SalesDetailResponse(BaseModel):
    id: int
    daily_report_id: int
    employee_id: int
    drink_count: int
    champagne_count: int
    customer_info: str
    notes: str
    created_at: datetime
    employee: EmployeeResponse  # 従業員情報も含む
    
    class Config:
        from_attributes = True

# 既存の売上データ入力用スキーマ（後方互換性のため保持）
class SalesInput(BaseModel):
    date: date
    employee_name: str
    total_sales: int
    drink_count: int = 0
    champagne_count: int = 0
    catch_count: int = 0
    work_hours: float = 0

# 既存の売上データ応答用スキーマ（後方互換性のため保持）
class SalesResponse(BaseModel):
    id: int
    date: date
    employee_name: str
    total_sales: int
    drink_count: int
    champagne_count: int
    catch_count: int
    work_hours: float
    
    class Config:
        from_attributes = True  # SQLAlchemyモデルとの連携

# 伝票データ用スキーマ
class ReceiptInput(BaseModel):
    customer_name: str
    employee_name: str
    drink_count: int = 0
    champagne_type: str = ""
    champagne_price: int = 0
    amount: int
    is_card: bool = False

class ReceiptResponse(BaseModel):
    id: int
    customer_name: str
    employee_name: str
    drink_count: int
    champagne_type: str
    champagne_price: int
    amount: int
    is_card: bool
    
    class Config:
        from_attributes = True

# 日報データ用スキーマ（売上詳細追加）
class DailyReportInput(BaseModel):
    date: date
    employee_name: str
    total_sales: int = 0
    alcohol_cost: int = 0
    other_expenses: int = 0
    card_sales: int = 0
    drink_count: int = 0
    champagne_type: str = ""
    champagne_price: int = 0
    work_start_time: str
    work_end_time: str
    receipts: List[ReceiptInput] = []
    sales_details: List[SalesDetailInput] = []  # 従業員別売上詳細追加

class DailyReportResponse(BaseModel):
    id: int
    store_id: int
    date: date
    employee_name: str
    total_sales: int
    alcohol_cost: int
    other_expenses: int
    card_sales: int
    drink_count: int
    champagne_type: str
    champagne_price: int
    work_start_time: str
    work_end_time: str
    receipts: List[ReceiptResponse] = []
    sales_details: List[SalesDetailResponse] = []  # 従業員別売上詳細追加
    created_at: Optional[str] = None
    
    class Config:
        from_attributes = True

# 認証関連のスキーマ（店舗対応）
class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    role: str = "staff"  # "staff" または "manager"
    store_code: str  # 店舗コード追加

class UserLogin(BaseModel):
    email: str
    password: str
    store_code: str  # 店舗コード追加

class UserResponse(BaseModel):
    id: int
    store_id: int  # 店舗ID追加
    email: str
    name: str
    role: str
    store: Optional[StoreResponse] = None  # 店舗情報も含む
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# 計算結果用スキーマ
class DailyCalculationResponse(BaseModel):
    net_profit: int  # 純利益
    cash_remaining: int  # 現金残金
    total_expenses: int  # 総経費
    total_receipt_amount: int  # 伝票合計額

# 店舗別統計スキーマ（新規追加）
class StoreStatistics(BaseModel):
    store_id: int
    store_name: str
    employee_count: int
    monthly_total_sales: int
    monthly_drink_count: int
    active_employees: int

# 従業員別統計スキーマ（新規追加）
class EmployeeStatistics(BaseModel):
    employee_id: int
    employee_name: str
    employee_code: str
    monthly_drink_count: int
    monthly_champagne_count: int
    monthly_customer_count: int
    total_revenue_contribution: int

# 詳細レポートスキーマ（新規追加）
class DetailedSalesReport(BaseModel):
    date: date
    store_name: str
    employee_details: List[EmployeeStatistics]
    daily_totals: DailyCalculationResponse
    top_performer: Optional[str] = None

# 管理者用スキーマ
class AdminDashboard(BaseModel):
    total_stores: int
    total_employees: int
    monthly_revenue: int
    top_performing_stores: List[StoreStatistics]
    recent_activities: List[str]

# バリデーション用の補助スキーマ
class StoreCodeValidation(BaseModel):
    store_code: str
    is_valid: bool
    store_name: Optional[str] = None

class EmployeeCodeGeneration(BaseModel):
    store_id: int
    suggested_code: str
    next_sequence: int