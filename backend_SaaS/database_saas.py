# database_saas.py - PostgreSQL + bcrypt修正版
from sqlalchemy import (
    create_engine, Column, Integer, String, Date, DateTime, Boolean,
    ForeignKey, Text, Enum, Float, text
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from datetime import datetime
import secrets
import string
import enum
import os
from sqlalchemy.pool import QueuePool
import time

# ==============================
# DB 接続設定 (PostgreSQL対応)
# ==============================

# 環境変数からDB URLを取得（PostgreSQL優先、なければSQLite）
DATABASE_URL = os.getenv("DATABASE_URL")

# RenderのPostgreSQLは "postgres://" で始まるが、SQLAlchemyは "postgresql://" が必要
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# デフォルト値（ローカル開発用）
if not DATABASE_URL:
    DATABASE_URL = "sqlite:///./bar_management_saas.db"
    print("⚠️ DATABASE_URLが設定されていません。SQLiteを使用します。")
else:
    print(f"✅ DATABASE_URL取得成功: {DATABASE_URL[:30]}...")

# SQLite の場合のみ thread check をオフ
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

# エンジン作成
# PostgreSQL接続設定の強化
engine_kwargs = {
    "future": True,
    "echo": False,
    "pool_pre_ping": True,
}

# PostgreSQLの場合のみ追加設定
if DATABASE_URL.startswith("postgresql"):
    engine_kwargs.update({
        "poolclass": QueuePool,
        "pool_size": 5,
        "max_overflow": 10,
        "pool_timeout": 30,
        "pool_recycle": 3600,
        "connect_args": {
            "connect_timeout": 10,
            "keepalives": 1,
            "keepalives_idle": 30,
            "keepalives_interval": 10,
            "keepalives_count": 5,
            "sslmode": "require",
        }
    })
else:
    # SQLiteの場合
    engine_kwargs["connect_args"] = connect_args

# リトライ機能付きエンジン作成
def create_db_engine_with_retry(max_retries=3, retry_delay=2):
    for attempt in range(max_retries):
        try:
            print(f"データベース接続試行 {attempt + 1}/{max_retries}")
            engine = create_engine(DATABASE_URL, **engine_kwargs)
            
            # 接続テスト
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            
            print("✅ データベース接続成功")
            return engine
            
        except Exception as e:
            print(f"❌ 接続エラー (試行 {attempt + 1}/{max_retries}): {e}")
            
            if attempt < max_retries - 1:
                print(f"⏳ {retry_delay}秒後に再試行...")
                time.sleep(retry_delay)
            else:
                print("❌ 全ての接続試行が失敗しました")
                # フォールバック
                print("基本設定でエンジンを作成します...")
                return create_engine(DATABASE_URL, pool_pre_ping=True)

# エンジン作成
engine = create_db_engine_with_retry()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ==============================
# Enum 定義
# ==============================

class UserRole(enum.Enum):
    SUPER_ADMIN = "super_admin"
    OWNER = "owner"
    MANAGER = "manager"
    STAFF = "staff"


class SubscriptionStatus(enum.Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    CANCELLED = "cancelled"
    TRIAL = "trial"


class InviteStatus(enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    EXPIRED = "expired"


# ==============================
# テーブル定義
# ==============================

class SystemAdmin(Base):
    """スーパーアドミンテーブル"""
    __tablename__ = "system_admins"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True)
    is_super_admin = Column(Boolean, default=True)
    can_create_organizations = Column(Boolean, default=True)
    can_manage_subscriptions = Column(Boolean, default=True)
    can_access_all_data = Column(Boolean, default=True)
    last_login = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Organization(Base):
    """組織テーブル"""
    __tablename__ = "organizations"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    domain = Column(String(100), unique=True)
    contact_email = Column(String(255), nullable=False)
    phone = Column(String(50))
    address = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    stores = relationship("Store", back_populates="organization", cascade="all, delete-orphan")
    subscriptions = relationship("Subscription", back_populates="organization", cascade="all, delete-orphan")


class Store(Base):
    """店舗テーブル"""
    __tablename__ = "stores"
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    
    store_code = Column(String(20), unique=True, nullable=False, index=True)
    store_name = Column(String(200), nullable=False)
    store_type = Column(String(50), default="bar")
    address = Column(Text)
    phone = Column(String(50))
    email = Column(String(255))
    
    timezone = Column(String(50), default="Asia/Tokyo")
    currency = Column(String(10), default="JPY")
    business_hours_start = Column(String(10))
    business_hours_end = Column(String(10))
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    organization = relationship("Organization", back_populates="stores")
    employees = relationship("Employee", back_populates="store", cascade="all, delete-orphan")
    daily_reports = relationship("DailyReport", back_populates="store", cascade="all, delete-orphan")
    invite_codes = relationship("InviteCode", back_populates="store", cascade="all, delete-orphan")


class Employee(Base):
    """従業員テーブル"""
    __tablename__ = "employees"
    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    
    employee_code = Column(String(50), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    
    role = Column(Enum(UserRole), default=UserRole.STAFF, nullable=False)
    position = Column(String(100))
    hire_date = Column(Date, nullable=True)  # NULLを許可（後から設定可能）
    termination_date = Column(Date)
    
    hourly_wage = Column(Integer, default=0)
    employment_type = Column(String(50), default="part_time")
    
    phone = Column(String(50))
    emergency_contact_name = Column(String(100))
    emergency_contact_phone = Column(String(50))
    
    google_id = Column(String(255), unique=True)
    profile_image_url = Column(Text)
    
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    store = relationship("Store", back_populates="employees")
    daily_reports = relationship("DailyReport", back_populates="employee", foreign_keys="DailyReport.employee_id")
    approved_reports = relationship("DailyReport", back_populates="approved_by", foreign_keys="DailyReport.approved_by_employee_id")
    personal_goals = relationship("PersonalGoal", back_populates="employee", cascade="all, delete-orphan")


class Subscription(Base):
    """サブスクリプションテーブル"""
    __tablename__ = "subscriptions"
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    
    plan_name = Column(String(50), nullable=False)
    status = Column(Enum(SubscriptionStatus), default=SubscriptionStatus.TRIAL, nullable=False)
    
    max_stores = Column(Integer, default=1)
    max_employees_per_store = Column(Integer, default=10)
    monthly_fee = Column(Integer, default=0)
    
    trial_start_date = Column(DateTime, default=datetime.utcnow)
    trial_end_date = Column(DateTime)
    billing_start_date = Column(DateTime)
    next_billing_date = Column(DateTime)
    
    payment_method = Column(String(50))
    last_payment_date = Column(DateTime)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    organization = relationship("Organization", back_populates="subscriptions")


class InviteCode(Base):
    """招待コードテーブル"""
    __tablename__ = "invite_codes"
    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    
    code = Column(String(50), unique=True, nullable=False, index=True)
    role = Column(Enum(UserRole), default=UserRole.STAFF, nullable=False)
    max_uses = Column(Integer, default=1)
    current_uses = Column(Integer, default=0)
    status = Column(Enum(InviteStatus), default=InviteStatus.PENDING, nullable=False)
    
    expires_at = Column(DateTime, nullable=False)
    created_by_admin_id = Column(Integer)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    store = relationship("Store", back_populates="invite_codes")


class DailyReport(Base):
    """日報テーブル"""
    __tablename__ = "daily_reports"
    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    
    report_date = Column(Date, nullable=False, index=True)
    work_start_time = Column(String(10))
    work_end_time = Column(String(10))
    work_hours = Column(Float, default=0)
    
    total_sales = Column(Integer, default=0)
    number_of_customers = Column(Integer, default=0)
    drink_sales = Column(Integer, default=0)
    drink_count = Column(Integer, default=0)  # 🆕 ドリンク杯数
    champagne_sales = Column(Integer, default=0)
    champagne_type = Column(String(200), default="")  # 🆕 シャンパン種類
    champagne_price = Column(Integer, default=0)  # 🆕 シャンパン金額
    catch_count = Column(Integer, default=0)  # 🆕 キャッチ数
    alcohol_cost = Column(Integer, default=0)  # 🆕 酒代
    other_expenses = Column(Integer, default=0)  # 🆕 その他経費
    break_minutes = Column(Integer, default=0)  # 🆕 休憩時間
    
    cash_sales = Column(Integer, default=0)
    card_sales = Column(Integer, default=0)
    
    notes = Column(Text)
    special_events = Column(Text)
    
    is_approved = Column(Boolean, default=False)
    approved_by_employee_id = Column(Integer, ForeignKey("employees.id"))
    approved_at = Column(DateTime)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    store = relationship("Store", back_populates="daily_reports")
    employee = relationship("Employee", back_populates="daily_reports", foreign_keys=[employee_id])
    approved_by = relationship("Employee", back_populates="approved_reports", foreign_keys=[approved_by_employee_id])
    receipts = relationship("Receipt", back_populates="daily_report", cascade="all, delete-orphan")


class ProcessingStatus(enum.Enum):
    """OCR処理ステータス"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ReceiptImage(Base):
    """伝票画像テーブル（OCR用）"""
    __tablename__ = "receipt_images"
    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    daily_report_id = Column(Integer, ForeignKey("daily_reports.id"), nullable=True)
    receipt_id = Column(Integer, ForeignKey("receipts.id"), nullable=True)
    
    # 画像情報
    image_url = Column(String(500), nullable=False)
    image_hash = Column(String(64))  # SHA-256ハッシュ（重複検出用）
    file_size = Column(Integer)
    mime_type = Column(String(50))
    
    # OCR結果
    ocr_raw_response = Column(Text)  # JSONテキスト
    ocr_extracted_data = Column(Text)  # JSON形式の抽出データ
    
    # 処理状態
    processing_status = Column(Enum(ProcessingStatus), default=ProcessingStatus.PENDING)
    error_message = Column(Text)
    is_verified = Column(Boolean, default=False)
    confidence_score = Column(Float)
    
    # タイムスタンプ
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Receipt(Base):
    """伝票テーブル"""
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
    receipt_number = Column(String(50))
    table_number = Column(String(20))
    service_charge = Column(Integer, default=0)
    
    # OCR関連
    receipt_image_id = Column(Integer, ForeignKey("receipt_images.id"), nullable=True)
    is_auto_generated = Column(Boolean, default=False)  # OCRで自動生成されたか
    manual_corrections = Column(Text)  # 手動修正内容（JSON）
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    daily_report = relationship("DailyReport", back_populates="receipts")


class PersonalGoal(Base):
    """個人目標テーブル"""
    __tablename__ = "personal_goals"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    
    # 年月指定
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    
    # 目標値
    sales_goal = Column(Integer, default=500000)  # 売上目標
    drinks_goal = Column(Integer, default=100)    # ドリンク目標
    catch_goal = Column(Integer, default=50)      # キャッチ目標
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    employee = relationship("Employee", back_populates="personal_goals")


class StoreGoal(Base):
    """店舗目標テーブル"""
    __tablename__ = "store_goals"
    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    
    monthly_sales_goal = Column(Integer, default=3000000)  # 月間売上目標
    weekday_sales_goal = Column(Integer, default=100000)   # 平日売上目標
    weekend_sales_goal = Column(Integer, default=200000)   # 週末売上目標
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ShiftStatus(enum.Enum):
    SCHEDULED = "scheduled"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ShiftRequestType(enum.Enum):
    AVAILABLE = "available"
    UNAVAILABLE = "unavailable"
    PREFERRED = "preferred"


class Shift(Base):
    """シフトテーブル"""
    __tablename__ = "shifts"
    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    
    shift_date = Column(Date, nullable=False, index=True)
    start_time = Column(String(10), nullable=False)
    end_time = Column(String(10), nullable=False)
    
    status = Column(Enum(ShiftStatus), default=ShiftStatus.SCHEDULED, nullable=False)
    notes = Column(Text)
    
    created_by_id = Column(Integer, ForeignKey("employees.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ShiftRequest(Base):
    """シフト希望テーブル"""
    __tablename__ = "shift_requests"
    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    
    request_date = Column(Date, nullable=False, index=True)
    start_time = Column(String(10))
    end_time = Column(String(10))
    
    request_type = Column(Enum(ShiftRequestType), default=ShiftRequestType.AVAILABLE, nullable=False)
    notes = Column(Text)
    
    is_approved = Column(Boolean, default=False)
    approved_by_id = Column(Integer, ForeignKey("employees.id"))
    approved_at = Column(DateTime)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class NotificationType(enum.Enum):
    SHIFT_ASSIGNED = "shift_assigned"
    SHIFT_CHANGED = "shift_changed"
    REPORT_APPROVED = "report_approved"
    REPORT_REJECTED = "report_rejected"
    GOAL_ACHIEVED = "goal_achieved"
    ANNOUNCEMENT = "announcement"
    REMINDER = "reminder"


class Notification(Base):
    """通知テーブル"""
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    
    notification_type = Column(Enum(NotificationType), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime)
    
    related_entity_type = Column(String(50))  # shift, report, etc.
    related_entity_id = Column(Integer)
    
    created_at = Column(DateTime, default=datetime.utcnow)


class AuditLog(Base):
    """監査ログテーブル"""
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(Integer, nullable=False)
    
    user_type = Column(String(50), nullable=False)
    user_id = Column(Integer, nullable=False)
    user_email = Column(String(255))
    
    details = Column(Text)
    ip_address = Column(String(50))
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


# ==============================
# ユーティリティ関数
# ==============================

def get_db():
    """データベースセッションを取得"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def generate_store_code(prefix="BAR"):
    """店舗コード生成"""
    random_chars = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
    return f"{prefix}_{random_chars}"


def generate_employee_code(store_code):
    """従業員コード生成"""
    random_digits = ''.join(secrets.choice(string.digits) for _ in range(4))
    return f"{store_code}_EMP{random_digits}"


def generate_invite_code():
    """招待コード生成"""
    return secrets.token_urlsafe(24)


def create_tables():
    """全テーブル作成"""
    print("データベーステーブルを作成中...")
    Base.metadata.create_all(bind=engine)
    print("✅ データベーステーブル作成完了")


def create_super_admin(email: str, password: str, name: str = "Super Admin"):
    """スーパーアドミン作成（bcryptバグ修正版）"""
    db = SessionLocal()
    try:
        # 既存チェック
        existing_admin = db.query(SystemAdmin).filter(SystemAdmin.email == email).first()
        if existing_admin:
            print(f"スーパーアドミン {email} は既に存在します")
            return existing_admin

        # ⭐ 重要修正: bcryptは72バイト制限 - 事前に切り詰め
        if len(password.encode("utf-8")) > 72:
            original_length = len(password)
            password = password[:72]
            print(f"⚠️ パスワードが長すぎるため切り詰めました ({original_length} → 72 文字)")

        # パスワードハッシュ化
        try:
            from passlib.context import CryptContext
            pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
            password_hash = pwd_context.hash(password)
        except ImportError:
            print("⚠️ passlib未インストール。簡易ハッシュ化を使用")
            import hashlib
            password_hash = hashlib.sha256(password.encode()).hexdigest()

        super_admin = SystemAdmin(
            email=email,
            password_hash=password_hash,
            name=name,
            is_super_admin=True,
            can_create_organizations=True,
            can_manage_subscriptions=True,
            can_access_all_data=True,
        )

        db.add(super_admin)
        db.commit()
        db.refresh(super_admin)
        print(f"✅ スーパーアドミン {email} を作成しました")
        return super_admin

    except Exception as e:
        db.rollback()
        print(f"❌ スーパーアドミン作成エラー: {e}")
        # エラーでも起動を継続（アプリは動作可能）
        return None
    finally:
        db.close()


# ====== 開発用データ作成 ======

def create_sample_data():
    """開発用サンプルデータ作成"""
    db = SessionLocal()
    try:
        if not db.query(Organization).first():
            org = Organization(
                name="サンプル組織",
                domain="sample",
                contact_email="admin@sample.com"
            )
            db.add(org)
            db.flush()
            
            store_code = generate_store_code()
            store = Store(
                organization_id=org.id,
                store_code=store_code,
                store_name="サンプルバー"
            )
            db.add(store)
            db.flush()
            
            from datetime import timedelta
            subscription = Subscription(
                organization_id=org.id,
                plan_name="trial",
                status=SubscriptionStatus.TRIAL,
                trial_end_date=datetime.utcnow() + timedelta(days=30)
            )
            db.add(subscription)
            
            db.commit()
            print("✅ サンプルデータを作成しました")
            
    except Exception as e:
        db.rollback()
        print(f"❌ サンプルデータ作成エラー: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    create_tables()
    create_super_admin(
        email="admin@bar-management.com",
        password="admin123",
        name="システム管理者",
    )
    create_sample_data()