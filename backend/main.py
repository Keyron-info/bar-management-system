from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from datetime import timedelta
import uvicorn

# 新しいインポート
from database import get_db, create_tables, DailySales, User
from schemas import SalesInput, SalesResponse, UserCreate, UserLogin, UserResponse, Token
from auth import (
    get_password_hash, 
    authenticate_user, 
    create_access_token, 
    get_current_active_user,
    require_manager,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

app = FastAPI(title="バー管理システム API", version="1.0.0")

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# アプリ起動時にデータベーステーブルを作成
@app.on_event("startup")
def startup_event():
    create_tables()

@app.get("/")
async def root():
    return {"message": "バー管理システム API が正常に動作しています"}

@app.get("/api/health")
async def health_check():
    return {"status": "OK", "message": "API is running"}

# ユーザー登録API
@app.post("/api/auth/register", response_model=UserResponse)
def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
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

# 売上データ投稿API
@app.post("/api/sales", response_model=SalesResponse)
def create_sales(sales_data: SalesInput, db: Session = Depends(get_db)):
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

# 売上データ取得API
@app.get("/api/sales", response_model=List[SalesResponse])
def get_sales(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    sales = db.query(DailySales).offset(skip).limit(limit).all()
    return sales

from sqlalchemy import func, extract
from datetime import datetime, date

# 日次売上集計API
@app.get("/api/sales/daily-summary")
def get_daily_summary(target_date: str = None, db: Session = Depends(get_db)):
    if target_date:
        target = datetime.fromisoformat(target_date).date()
    else:
        target = date.today()
    
    # 指定日の売上合計
    daily_total = db.query(func.sum(DailySales.total_sales)).filter(
        DailySales.date == target
    ).scalar() or 0
    
    # 指定日のドリンク・シャンパン合計
    drinks_total = db.query(func.sum(DailySales.drink_count)).filter(
        DailySales.date == target
    ).scalar() or 0
    
    champagne_total = db.query(func.sum(DailySales.champagne_count)).filter(
        DailySales.date == target
    ).scalar() or 0
    
    catch_total = db.query(func.sum(DailySales.catch_count)).filter(
        DailySales.date == target
    ).scalar() or 0
    
    return {
        "date": target,
        "total_sales": daily_total,
        "drink_count": drinks_total,
        "champagne_count": champagne_total,
        "catch_count": catch_total
    }

# 月次売上集計API
@app.get("/api/sales/monthly-summary")
def get_monthly_summary(year: int = None, month: int = None, db: Session = Depends(get_db)):
    if not year:
        year = datetime.now().year
    if not month:
        month = datetime.now().month
    
    # 月次売上合計
    monthly_total = db.query(func.sum(DailySales.total_sales)).filter(
        extract('year', DailySales.date) == year,
        extract('month', DailySales.date) == month
    ).scalar() or 0
    
    # 月次ドリンク・シャンパン合計
    drinks_total = db.query(func.sum(DailySales.drink_count)).filter(
        extract('year', DailySales.date) == year,
        extract('month', DailySales.date) == month
    ).scalar() or 0
    
    champagne_total = db.query(func.sum(DailySales.champagne_count)).filter(
        extract('year', DailySales.date) == year,
        extract('month', DailySales.date) == month
    ).scalar() or 0
    
    return {
        "year": year,
        "month": month,
        "total_sales": monthly_total,
        "drink_count": drinks_total,
        "champagne_count": champagne_total
    }

# 従業員別売上ランキングAPI
@app.get("/api/sales/employee-ranking")
def get_employee_ranking(year: int = None, month: int = None, db: Session = Depends(get_db)):
    if not year:
        year = datetime.now().year
    if not month:
        month = datetime.now().month
    
    # 従業員別の売上合計
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

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)