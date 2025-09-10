from sqlalchemy import create_engine, Column, Integer, String, Date, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os

# SQLiteデータベースを使用（開発用）
DATABASE_URL = "sqlite:///./bar_management.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# データベースセッションを取得する関数
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ユーザーモデル
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(100), nullable=False)
    role = Column(String(20), nullable=False, default="staff")  # "staff" または "manager"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

# データベースモデル
class DailySales(Base):
    __tablename__ = "daily_sales"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    employee_name = Column(String(100), nullable=False)
    total_sales = Column(Integer, default=0)  # 総売上（円）
    drink_count = Column(Integer, default=0)  # ドリンク杯数
    champagne_count = Column(Integer, default=0)  # シャンパン杯数
    catch_count = Column(Integer, default=0)  # キャッチ数
    work_hours = Column(Integer, default=0)  # 稼働時間（分）
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# データベーステーブルを作成
def create_tables():
    Base.metadata.create_all(bind=engine)