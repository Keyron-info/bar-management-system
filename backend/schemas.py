from pydantic import BaseModel
from datetime import date
from typing import Optional

# 売上データ入力用スキーマ
class SalesInput(BaseModel):
    date: date
    employee_name: str
    total_sales: int
    drink_count: int = 0
    champagne_count: int = 0
    catch_count: int = 0
    work_hours: int = 0

# 売上データ応答用スキーマ
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

# 認証関連のスキーマを追加
from typing import Optional

# ユーザー登録用スキーマ
class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    role: str = "staff"  # "staff" または "manager"

# ユーザーログイン用スキーマ
class UserLogin(BaseModel):
    email: str
    password: str

# ユーザー応答用スキーマ
class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str
    
    class Config:
        from_attributes = True

# トークン応答用スキーマ
class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse