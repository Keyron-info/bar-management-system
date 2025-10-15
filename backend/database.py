from sqlalchemy import create_engine, Column, Integer, String, Date, DateTime, Boolean, ForeignKey, Float, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
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

# 店舗モデル（新規追加）
class Store(Base):
    __tablename__ = "stores"
    
    id = Column(Integer, primary_key=True, index=True)
    store_code = Column(String(20), unique=True, index=True, nullable=False)  # BAR_0001形式
    store_name = Column(String(100), nullable=False)  # 店舗名
    address = Column(String(500), default="")  # 住所
    phone_number = Column(String(20), default="")  # 電話番号
    is_active = Column(Boolean, default=True)  # 営業中フラグ
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # リレーション
    users = relationship("User", back_populates="store")
    employees = relationship("Employee", back_populates="store")
    daily_reports = relationship("DailyReport", back_populates="store")
    daily_sales = relationship("DailySales", back_populates="store")

# 従業員モデル（新規追加）
class Employee(Base):
    __tablename__ = "employees"
    
    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    employee_code = Column(String(20), nullable=False)  # EMP_001形式
    name = Column(String(100), nullable=False)  # 従業員名
    email = Column(String(255), default="")  # メールアドレス（任意）
    role = Column(String(20), nullable=False, default="staff")  # "staff", "manager", "owner"
    hire_date = Column(Date, nullable=False)  # 入社日
    is_active = Column(Boolean, default=True)  # 在籍フラグ
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 同一店舗内でのemployee_codeの一意性を保証
    __table_args__ = (UniqueConstraint('store_id', 'employee_code', name='_store_employee_code_uc'),)
    
    # リレーション
    store = relationship("Store", back_populates="employees")
    sales_details = relationship("SalesDetail", back_populates="employee")

# ユーザーモデル（店舗ID追加）
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)  # 店舗ID追加
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(100), nullable=False)
    role = Column(String(20), nullable=False, default="staff")  # "staff" または "manager"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # リレーション
    store = relationship("Store", back_populates="users")

# 売上詳細モデル（新規追加）- "誰が何杯飲んだか"記録用
class SalesDetail(Base):
    __tablename__ = "sales_details"
    
    id = Column(Integer, primary_key=True, index=True)
    daily_report_id = Column(Integer, ForeignKey("daily_reports.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    drink_count = Column(Integer, default=0)  # ドリンク数
    champagne_count = Column(Integer, default=0)  # シャンパン数
    customer_info = Column(String(200), default="")  # 顧客情報（任意）
    notes = Column(String(500), default="")  # 備考
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # リレーション
    daily_report = relationship("DailyReport", back_populates="sales_details")
    employee = relationship("Employee", back_populates="sales_details")

# 日報メインデータ（店舗ID追加）
class DailyReport(Base):
    __tablename__ = "daily_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)  # 店舗ID追加
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
    store = relationship("Store", back_populates="daily_reports")
    receipts = relationship("Receipt", back_populates="daily_report", cascade="all, delete-orphan")
    sales_details = relationship("SalesDetail", back_populates="daily_report", cascade="all, delete-orphan")

# 伝票データ（変更なし）
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

# 既存のDailySalesテーブル（店舗ID追加・後方互換性のため保持）
class DailySales(Base):
    __tablename__ = "daily_sales"
    
    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=True)  # 既存データ考慮でnullable=True
    date = Column(Date, nullable=False)
    employee_name = Column(String(100), nullable=False)
    total_sales = Column(Integer, default=0)  # 総売上（円）
    drink_count = Column(Integer, default=0)  # ドリンク杯数
    champagne_count = Column(Integer, default=0)  # シャンパン杯数
    catch_count = Column(Integer, default=0)  # キャッチ数
    work_hours = Column(Float, nullable=False) # 稼働時間（分）
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # リレーション
    store = relationship("Store", back_populates="daily_sales")

# データベーステーブルを作成
def create_tables():
    Base.metadata.create_all(bind=engine)

# マイグレーション用ユーティリティ関数
def create_default_store(db):
    """既存データ用のデフォルト店舗を作成"""
    default_store = Store(
        store_code="BAR_0001",
        store_name="メインバー",
        address="東京都",
        phone_number="03-0000-0000"
    )
    db.add(default_store)
    db.commit()
    db.refresh(default_store)
    return default_store

def migrate_existing_users_to_store(db, store_id):
    """既存ユーザーにstore_idを設定"""
    users_without_store = db.query(User).filter(User.store_id == None).all()
    for user in users_without_store:
        user.store_id = store_id
    db.commit()
    
def migrate_existing_reports_to_store(db, store_id):
    """既存の日報データにstore_idを設定"""
    reports_without_store = db.query(DailyReport).filter(DailyReport.store_id == None).all()
    for report in reports_without_store:
        report.store_id = store_id
    db.commit()
    
def migrate_existing_sales_to_store(db, store_id):
    """既存の売上データにstore_idを設定"""
    sales_without_store = db.query(DailySales).filter(DailySales.store_id == None).all()
    for sale in sales_without_store:
        sale.store_id = store_id
    db.commit()

# フルマイグレーション実行関数
def run_migration():
    """既存データをマルチテナント対応に移行"""
    from sqlalchemy.orm import Session
    
    # テーブル作成
    create_tables()
    
    db = SessionLocal()
    try:
        # デフォルト店舗の作成（既に存在する場合はスキップ）
        existing_store = db.query(Store).filter(Store.store_code == "BAR_0001").first()
        if not existing_store:
            default_store = create_default_store(db)
            store_id = default_store.id
        else:
            store_id = existing_store.id
        
        # 既存データのマイグレーション
        migrate_existing_users_to_store(db, store_id)
        migrate_existing_reports_to_store(db, store_id)
        migrate_existing_sales_to_store(db, store_id)
        
        print(f"マイグレーション完了: 店舗ID {store_id} にデータを移行しました")
        
    except Exception as e:
        db.rollback()
        print(f"マイグレーション中にエラーが発生しました: {str(e)}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    # 直接実行時はマイグレーションを実行
    run_migration()