# database_saas.py
from sqlalchemy import (
    create_engine, Column, Integer, String, Date, DateTime, Boolean,
    ForeignKey, Text, Enum, Float
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from datetime import datetime
import secrets
import string
import enum
import os

# ==============================
# DB 接続設定
# ==============================

# 環境変数からDB URLを取得（なければSQLiteを使用）
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./bar_management_saas.db")

# SQLite の場合のみ thread check をオフ
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args, future=True)
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

class Organization(Base):
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
    __tablename__ = "stores"
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)

    store_code = Column(String(20), unique=True, nullable=False, index=True)
    store_name = Column(String(200), nullable=False)
    store_type = Column(String(50), default="bar")
    address = Column(Text)
    phone = Column(String(50))
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


class Subscription(Base):
    __tablename__ = "subscriptions"
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)

    plan_name = Column(String(100), nullable=False)
    status = Column(Enum(SubscriptionStatus), default=SubscriptionStatus.TRIAL)
    max_stores = Column(Integer, default=1)
    max_employees_per_store = Column(Integer, default=10)
    monthly_fee = Column(Float, default=0.0)
    billing_cycle_day = Column(Integer, default=1)
    trial_end_date = Column(DateTime)
    next_billing_date = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    organization = relationship("Organization", back_populates="subscriptions")


class Employee(Base):
    __tablename__ = "employees"
    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)

    employee_code = Column(String(20), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.STAFF)
    is_active = Column(Boolean, default=True)
    hire_date = Column(Date)
    hourly_wage = Column(Float, default=0.0)
    employment_type = Column(String(50), default="part_time")
    phone = Column(String(50))
    emergency_contact_name = Column(String(100))
    emergency_contact_phone = Column(String(50))
    last_login_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # リレーション - foreign_keys を明示的に指定してリレーションシップの曖昧性を解決
    store = relationship("Store", back_populates="employees")
    
    # 作成した日報（従業員として）
    daily_reports = relationship(
        "DailyReport", 
        back_populates="employee",
        foreign_keys="DailyReport.employee_id",
        cascade="all, delete-orphan"
    )
    
    # 承認した日報（管理者として）
    approved_reports = relationship(
        "DailyReport",
        back_populates="approved_by",
        foreign_keys="DailyReport.approved_by_employee_id"
    )


class SystemAdmin(Base):
    __tablename__ = "system_admins"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(100), nullable=False)
    is_super_admin = Column(Boolean, default=True)
    can_create_organizations = Column(Boolean, default=True)
    can_manage_subscriptions = Column(Boolean, default=True)
    can_access_all_data = Column(Boolean, default=True)
    last_login_at = Column(DateTime)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class InviteCode(Base):
    __tablename__ = "invite_codes"
    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    invite_code = Column(String(50), unique=True, nullable=False, index=True)
    invited_role = Column(Enum(UserRole), nullable=False)
    invited_by_employee_id = Column(Integer, ForeignKey("employees.id"))
    invited_email = Column(String(255))
    status = Column(Enum(InviteStatus), default=InviteStatus.PENDING)
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime)
    used_by_employee_id = Column(Integer, ForeignKey("employees.id"))
    max_uses = Column(Integer, default=1)
    current_uses = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    store = relationship("Store", back_populates="invite_codes")


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer)
    user_type = Column(String(20))
    user_email = Column(String(255))
    action = Column(String(100), nullable=False)
    resource_type = Column(String(50))
    resource_id = Column(Integer)
    changes = Column(Text)
    ip_address = Column(String(45))
    user_agent = Column(Text)
    organization_id = Column(Integer, ForeignKey("organizations.id"))
    store_id = Column(Integer, ForeignKey("stores.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

# AuditLog クラスの直後に追加

class PersonalGoal(Base):
    """個人目標テーブル"""
    __tablename__ = "personal_goals"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    sales_goal = Column(Integer, default=0)
    drinks_goal = Column(Integer, default=0)
    catch_goal = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # リレーション
    employee = relationship("Employee", backref="personal_goals")


class DailyReport(Base):
    __tablename__ = "daily_reports"
    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)

    date = Column(Date, nullable=False)
    total_sales = Column(Integer, default=0)
    alcohol_cost = Column(Integer, default=0)
    other_expenses = Column(Integer, default=0)
    card_sales = Column(Integer, default=0)
    drink_count = Column(Integer, default=0)
    champagne_type = Column(String(100), default="")
    champagne_price = Column(Integer, default=0)
    work_start_time = Column(String(10), nullable=False)
    work_end_time = Column(String(10), nullable=False)
    break_minutes = Column(Integer, default=0)
    is_approved = Column(Boolean, default=False)
    approved_by_employee_id = Column(Integer, ForeignKey("employees.id"))
    approved_at = Column(DateTime)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # リレーション - foreign_keys を明示的に指定
    store = relationship("Store", back_populates="daily_reports")
    employee = relationship(
        "Employee", 
        back_populates="daily_reports",
        foreign_keys=[employee_id]
    )
    approved_by = relationship(
        "Employee",
        back_populates="approved_reports",
        foreign_keys=[approved_by_employee_id]
    )
    receipts = relationship("Receipt", back_populates="daily_report", cascade="all, delete-orphan")


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
    receipt_number = Column(String(50))
    table_number = Column(String(20))
    service_charge = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    daily_report = relationship("DailyReport", back_populates="receipts")


# ==============================
# ユーティリティ関数
# ==============================

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def generate_store_code(prefix="BAR"):
    random_chars = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
    return f"{prefix}_{random_chars}"


def generate_employee_code(store_code):
    random_digits = ''.join(secrets.choice(string.digits) for _ in range(4))
    return f"{store_code}_EMP{random_digits}"


def generate_invite_code():
    return secrets.token_urlsafe(24)


def create_tables():
    Base.metadata.create_all(bind=engine)


def create_super_admin(email: str, password: str, name: str = "Super Admin"):
    """スーパーアドミン作成"""
    try:
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    except ImportError:
        print("警告: passlib がインストールされていません。pip install passlib[bcrypt] を実行してください")
        # 開発用の簡易ハッシュ化（本番環境では使用しないでください）
        import hashlib
        pwd_context = None

    # パスワード長制限（bcryptの制限）
    if len(password.encode("utf-8")) > 72:
        password = password[:72]

    db = SessionLocal()
    try:
        # 既存チェック
        existing_admin = db.query(SystemAdmin).filter(SystemAdmin.email == email).first()
        if existing_admin:
            print(f"スーパーアドミン {email} は既に存在します")
            return existing_admin

        # パスワードハッシュ化
        if pwd_context:
            password_hash = pwd_context.hash(password)
        else:
            # 開発用の簡易ハッシュ化（セキュリティ上推奨されません）
            import hashlib
            password_hash = hashlib.sha256(password.encode()).hexdigest()
            print("警告: 簡易ハッシュ化を使用しています。本番環境では passlib を使用してください")

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
        print(f"スーパーアドミン {email} を作成しました")
        return super_admin

    except Exception as e:
        db.rollback()
        print(f"スーパーアドミン作成エラー: {e}")
        raise
    finally:
        db.close()


# ====== 開発用データ作成 ======

def create_sample_data():
    """開発用サンプルデータ作成"""
    db = SessionLocal()
    try:
        # 組織作成
        if not db.query(Organization).first():
            org = Organization(
                name="サンプル組織",
                domain="sample",
                contact_email="admin@sample.com"
            )
            db.add(org)
            db.flush()
            
            # 店舗作成
            store_code = generate_store_code()
            store = Store(
                organization_id=org.id,
                store_code=store_code,
                store_name="サンプルバー"
            )
            db.add(store)
            db.flush()
            
            # サブスクリプション作成
            from datetime import timedelta
            subscription = Subscription(
                organization_id=org.id,
                plan_name="trial",
                status=SubscriptionStatus.TRIAL,
                trial_end_date=datetime.utcnow() + timedelta(days=30)
            )
            db.add(subscription)
            
            db.commit()
            print("サンプルデータを作成しました")
            
    except Exception as e:
        db.rollback()
        print(f"サンプルデータ作成エラー: {e}")
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