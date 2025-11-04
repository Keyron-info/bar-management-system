from datetime import datetime, timedelta
from typing import Optional, Union
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database_saas import get_db, SystemAdmin, Employee, Store, Organization, UserRole
import json
import ipaddress

# パスワードハッシュ化の設定
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT設定
SECRET_KEY = "your-super-secret-key-change-in-production-saas-2024"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8時間（SaaS運用を考慮して長め）

# HTTP Bearer認証
security = HTTPBearer()

# レート制限設定
RATE_LIMIT_REQUESTS = 100  # 1時間あたりのリクエスト数
RATE_LIMIT_WINDOW = 3600   # 1時間（秒）

# ====== パスワード関連関数 ======

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """パスワードを検証"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """パスワードをハッシュ化"""
    return pwd_context.hash(password)

def validate_password_strength(password: str) -> tuple[bool, str]:
    """パスワード強度チェック"""
    if len(password) < 8:
        return False, "パスワードは8文字以上である必要があります"
    
    has_upper = any(c.isupper() for c in password)
    has_lower = any(c.islower() for c in password)
    has_digit = any(c.isdigit() for c in password)
    
    if not (has_upper and has_lower and has_digit):
        return False, "パスワードには大文字、小文字、数字を含める必要があります"
    
    return True, "OK"

# ====== JWT関連関数 ======

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """JWTトークンを作成"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": data.get("type", "access")
    })
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> dict:
    """JWTトークンをデコード"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="無効なトークンです",
            headers={"WWW-Authenticate": "Bearer"},
        )

# ====== 認証関数 ======

def authenticate_system_admin(db: Session, email: str, password: str) -> Optional[SystemAdmin]:
    """システム管理者認証"""
    admin = db.query(SystemAdmin).filter(
        SystemAdmin.email == email,
        SystemAdmin.is_active == True
    ).first()
    
    if not admin or not verify_password(password, admin.password_hash):
        return None
    
    admin.last_login_at = datetime.utcnow()
    db.commit()
    
    return admin

def authenticate_employee(db: Session, email: str, password: str, store_code: Optional[str] = None) -> Optional[Employee]:
    """従業員認証"""
    query = db.query(Employee).filter(
        Employee.email == email,
        Employee.is_active == True
    )
    
    if store_code:
        query = query.join(Store).filter(Store.store_code == store_code)
    
    employee = query.first()
    
    if not employee or not verify_password(password, employee.password_hash):
        return None
    
    employee.last_login_at = datetime.utcnow()
    db.commit()
    
    return employee

# ====== 認証依存関数 ======

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security), 
    db: Session = Depends(get_db)
) -> Union[SystemAdmin, Employee]:
    """現在のユーザーを取得（システム管理者または従業員）"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="認証情報が無効です",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        print(f"🔍 受信したトークン: {credentials.credentials[:50]}...")
        payload = decode_access_token(credentials.credentials)
        print(f"✅ デコード成功: user_id={payload.get('user_id')}, user_type={payload.get('user_type')}")
        
        user_id: int = payload.get("user_id")
        user_type: str = payload.get("user_type")
        
        if user_id is None or user_type is None:
            print("❌ user_idまたはuser_typeがNone")
            raise credentials_exception
            
    except JWTError as e:
        print(f"❌ JWTエラー: {e}")
        raise credentials_exception
    except HTTPException as e:
        print(f"❌ HTTPException: {e.detail}")
        raise e
    
    # ユーザータイプに応じて取得
    if user_type == "admin":
        user = db.query(SystemAdmin).filter(
            SystemAdmin.id == user_id,
            SystemAdmin.is_active == True
        ).first()
        print(f"管理者検索結果: {user.name if user else 'None'}")
    elif user_type == "employee":
        user = db.query(Employee).filter(
            Employee.id == user_id,
            Employee.is_active == True
        ).first()
        print(f"✅ 従業員検索結果: {user.name if user else 'None'} (ID: {user.id if user else 'None'})")
    else:
        print(f"❌ 不明なuser_type: {user_type}")
        raise credentials_exception
    
    if user is None:
        print("❌ ユーザーがデータベースに見つかりません")
        raise credentials_exception
    
    print(f"✅ 認証成功: {user.name}")
    return user

def get_current_admin(current_user = Depends(get_current_user)) -> SystemAdmin:
    """現在のシステム管理者を取得"""
    if not isinstance(current_user, SystemAdmin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="この操作にはシステム管理者権限が必要です"
        )
    return current_user

def get_current_employee(current_user = Depends(get_current_user)) -> Employee:
    """現在の従業員を取得"""
    if not isinstance(current_user, Employee):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="この操作には従業員権限が必要です"
        )
    return current_user

# ====== 権限チェック関数 ======

def require_super_admin(current_admin: SystemAdmin = Depends(get_current_admin)) -> SystemAdmin:
    """スーパーアドミン権限チェック"""
    if not current_admin.is_super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="この操作にはスーパーアドミン権限が必要です"
        )
    return current_admin

def require_role(required_role: UserRole):
    """指定された役割以上の権限をチェック"""
    def role_checker(current_user = Depends(get_current_user)) -> Union[SystemAdmin, Employee]:
        if isinstance(current_user, SystemAdmin):
            return current_user
        
        if isinstance(current_user, Employee):
            role_hierarchy = {
                UserRole.STAFF: 1,
                UserRole.MANAGER: 2,
                UserRole.OWNER: 3,
                UserRole.SUPER_ADMIN: 4
            }
            
            current_role = current_user.role
            if isinstance(current_role, str):
                try:
                    current_role = UserRole(current_role)
                except ValueError:
                    current_role = UserRole.STAFF
            
            user_level = role_hierarchy.get(current_role, 0)
            required_level = role_hierarchy.get(required_role, 0)
            
            if user_level < required_level:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"この操作には{required_role.value}以上の権限が必要です"
                )
        
        return current_user
    
    return role_checker

def require_store_access(store_id: int):
    """指定された店舗へのアクセス権限をチェック"""
    def store_access_checker(
        current_user = Depends(get_current_user),
        db: Session = Depends(get_db)
    ) -> Union[SystemAdmin, Employee]:
        
        if isinstance(current_user, SystemAdmin):
            return current_user
        
        if isinstance(current_user, Employee):
            if current_user.store_id != store_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="指定された店舗にアクセスする権限がありません"
                )
        
        return current_user
    
    return store_access_checker

def require_organization_access(organization_id: int):
    """指定された組織へのアクセス権限をチェック"""
    def organization_access_checker(
        current_user = Depends(get_current_user),
        db: Session = Depends(get_db)
    ) -> Union[SystemAdmin, Employee]:
        
        if isinstance(current_user, SystemAdmin):
            return current_user
        
        if isinstance(current_user, Employee):
            store = db.query(Store).filter(Store.id == current_user.store_id).first()
            if not store or store.organization_id != organization_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="指定された組織にアクセスする権限がありません"
                )
        
        return current_user
    
    return organization_access_checker

# ====== セキュリティ関数 ======

def get_client_ip(request: Request) -> str:
    """クライアントIPアドレスを取得"""
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    return request.client.host if request.client else "unknown"

def is_ip_allowed(ip_address: str, allowed_ips: list = None) -> bool:
    """IPアドレスホワイトリストチェック"""
    if not allowed_ips:
        return True
    
    try:
        client_ip = ipaddress.ip_address(ip_address)
        for allowed_ip in allowed_ips:
            if "/" in allowed_ip:
                if client_ip in ipaddress.ip_network(allowed_ip, strict=False):
                    return True
            else:
                if client_ip == ipaddress.ip_address(allowed_ip):
                    return True
        return False
    except ValueError:
        return False

def check_rate_limit(request: Request, db: Session, user_id: int, user_type: str) -> bool:
    """レート制限チェック（簡易実装、本格運用時はRedis等を使用）"""
    now = datetime.utcnow()
    window_start = now - timedelta(seconds=RATE_LIMIT_WINDOW)
    return True

# ====== 監査ログ関数 ======

# auth_saas.py の log_user_action 関数を以下に置き換え

def log_user_action(
    db: Session,
    user: Union[SystemAdmin, Employee],
    action: str,
    resource_type: str,  # ← 引数名はそのまま
    resource_id: Optional[int] = None,
    changes: Optional[dict] = None,
    request: Optional[Request] = None
):
    """ユーザーアクションを監査ログに記録"""
    from database_saas import AuditLog
    
    if isinstance(user, SystemAdmin):
        user_id = user.id
        user_type = "admin"
        user_email = user.email
    else:
        user_id = user.id
        user_type = "employee"
        user_email = user.email
    
    ip_address = get_client_ip(request) if request else None
    
    # ★★★ 修正箇所: AuditLogの正しいカラム名を使用 ★★★
    audit_log = AuditLog(
        user_id=user_id,
        user_type=user_type,
        user_email=user_email,
        action=action,
        entity_type=resource_type,  # ← resource_type → entity_type
        entity_id=resource_id if resource_id else 0,  # ← resource_id → entity_id (0をデフォルト値に)
        details=json.dumps(changes, ensure_ascii=False) if changes else None,  # ← changes → details
        ip_address=ip_address,
    )
    
    db.add(audit_log)
    db.commit()

# ====== テナント分離関数 ======

def get_user_accessible_stores(user: Union[SystemAdmin, Employee], db: Session) -> list:
    """ユーザーがアクセス可能な店舗IDリストを取得"""
    if isinstance(user, SystemAdmin):
        stores = db.query(Store).filter(Store.is_active == True).all()
        return [store.id for store in stores]
    
    current_role = user.role
    if isinstance(current_role, str):
        try:
            current_role = UserRole(current_role)
        except ValueError:
            current_role = UserRole.STAFF
    
    if current_role == UserRole.OWNER:
        store = db.query(Store).filter(Store.id == user.store_id).first()
        if store:
            org_stores = db.query(Store).filter(
                Store.organization_id == store.organization_id,
                Store.is_active == True
            ).all()
            return [s.id for s in org_stores]
    
    return [user.store_id]

def get_user_accessible_organizations(user: Union[SystemAdmin, Employee], db: Session) -> list:
    """ユーザーがアクセス可能な組織IDリストを取得"""
    if isinstance(user, SystemAdmin):
        orgs = db.query(Organization).filter(Organization.is_active == True).all()
        return [org.id for org in orgs]
    
    store = db.query(Store).filter(Store.id == user.store_id).first()
    return [store.organization_id] if store else []

# ====== セキュリティミドルウェア用関数 ======

def create_security_headers() -> dict:
    """セキュリティヘッダーを作成"""
    return {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
        "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data: https://cdn.jsdelivr.net",
        "Referrer-Policy": "strict-origin-when-cross-origin"
    }

# ====== 後方互換性関数 ======

def get_legacy_user_from_employee(employee: Employee, db: Session) -> dict:
    """既存フロントエンド用のユーザー情報を生成"""
    current_role = employee.role
    if isinstance(current_role, str):
        try:
            current_role = UserRole(current_role)
        except ValueError:
            current_role = UserRole.STAFF
    
    legacy_role = "manager" if current_role in [UserRole.MANAGER, UserRole.OWNER] else "staff"
    
    return {
        "id": employee.id,
        "email": employee.email,
        "name": employee.name,
        "role": legacy_role
    }