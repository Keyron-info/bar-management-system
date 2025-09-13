from sqlalchemy import create_engine, Column, Integer, String, Date, DateTime, Boolean, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy import Column, Integer, String, DateTime, Float
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

# 日報メインデータ（拡張版）
class DailyReport(Base):
    __tablename__ = "daily_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    employee_name = Column(String(100), nullable=False)
    total_sales = Column(Integer, default=0)  # 総売上（円）
    alcohol_cost = Column(Integer, default=0)  # 酒代
    other_expenses = Column(Integer, default=0)  # その他経費
    card_sales = Column(Integer, default=0)  # カード売上
    drink_count = Column(Integer, default=0)  # ドリンク杯数
    champagne_type = Column(String(100), default="")  # シャンパン種類
    champagne_price = Column(Integer, default=0)  # シャンパン価格
    work_start_time = Column(String(10), nullable=False)  # 開始時間（HH:MM）
    work_end_time = Column(String(10), nullable=False)  # 終了時間（HH:MM）
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # リレーション
    receipts = relationship("Receipt", back_populates="daily_report", cascade="all, delete-orphan")

# 伝票データ
class Receipt(Base):
    __tablename__ = "receipts"
    
    id = Column(Integer, primary_key=True, index=True)
    daily_report_id = Column(Integer, ForeignKey("daily_reports.id"), nullable=False)
    customer_name = Column(String(100), nullable=False)
    employee_name = Column(String(100), nullable=False)
    drink_count = Column(Integer, default=0)
    champagne_type = Column(String(100), default="")
    champagne_price = Column(Integer, default=0)
    amount = Column(Integer, nullable=False)
    is_card = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # リレーション
    daily_report = relationship("DailyReport", back_populates="receipts")

# 既存のDailySalesテーブルも保持（後方互換性のため）
class DailySales(Base):
    __tablename__ = "daily_sales"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    employee_name = Column(String(100), nullable=False)
    total_sales = Column(Integer, default=0)  # 総売上（円）
    drink_count = Column(Integer, default=0)  # ドリンク杯数
    champagne_count = Column(Integer, default=0)  # シャンパン杯数
    catch_count = Column(Integer, default=0)  # キャッチ数
    work_hours = Column(Float, nullable=False) # 稼働時間（分）
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# データベーステーブルを作成
def create_tables():
    Base.metadata.create_all(bind=engine)