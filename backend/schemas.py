from pydantic import BaseModel
from datetime import date
from typing import Optional, List

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

# 日報データ用スキーマ
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

class DailyReportResponse(BaseModel):
    id: int
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
    created_at: Optional[str] = None
    
    class Config:
        from_attributes = True

# 認証関連のスキーマ
class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    role: str = "staff"  # "staff" または "manager"

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str
    
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