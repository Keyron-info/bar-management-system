from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import get_db, User, Store

# パスワードハッシュ化の設定
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT設定
SECRET_KEY = "your-secret-key-here-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# HTTP Bearer認証
security = HTTPBearer()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """パスワードを検証"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """パスワードをハッシュ化"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """JWTトークンを作成（店舗情報も含む）"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def authenticate_user_with_store(db: Session, email: str, password: str, store_code: str):
    """店舗コード付きユーザー認証"""
    # 店舗の存在確認
    store = db.query(Store).filter(
        Store.store_code == store_code,
        Store.is_active == True
    ).first()
    
    if not store:
        return False, "店舗コードが無効です"
    
    # ユーザー認証
    user = db.query(User).filter(
        User.email == email,
        User.store_id == store.id,
        User.is_active == True
    ).first()
    
    if not user:
        return False, "ユーザーが見つかりません"
    
    if not verify_password(password, user.password_hash):
        return False, "パスワードが間違っています"
    
    return user, None

def authenticate_user(db: Session, email: str, password: str):
    """既存の認証関数（後方互換性のため保持）"""
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return False
    if not verify_password(password, user.password_hash):
        return False
    return user

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    """現在のユーザーを取得（店舗情報も含む）"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="認証情報が無効です",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        store_id: int = payload.get("store_id")  # 店舗IDも取得
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
        
    # 店舗IDが一致することを確認（セキュリティ強化）
    if store_id and user.store_id != store_id:
        raise credentials_exception
        
    return user

def get_current_active_user(current_user: User = Depends(get_current_user)):
    """アクティブなユーザーを取得"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="非アクティブなユーザーです")
    return current_user

def get_current_store(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """現在のユーザーの店舗情報を取得"""
    store = db.query(Store).filter(Store.id == current_user.store_id).first()
    if not store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="店舗情報が見つかりません"
        )
    return store

def require_manager(current_user: User = Depends(get_current_active_user)):
    """店長権限が必要な処理"""
    if current_user.role != "manager":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="この操作には店長権限が必要です"
        )
    return current_user

def require_owner(current_user: User = Depends(get_current_active_user)):
    """オーナー権限が必要な処理"""
    if current_user.role not in ["owner", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="この操作にはオーナー権限が必要です"
        )
    return current_user

def require_same_store(target_store_id: int, current_user: User = Depends(get_current_active_user)):
    """同一店舗のデータのみアクセス可能"""
    if current_user.store_id != target_store_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="他店舗のデータにはアクセスできません"
        )
    return True

# データ分離フィルター関数
def filter_by_store(query, model, current_user: User):
    """クエリに店舗フィルターを適用"""
    store_column = getattr(model, 'store_id', None)
    if store_column is not None:
        return query.filter(store_column == current_user.store_id)
    return query

# 店舗コード生成関数
def generate_store_code(db: Session) -> str:
    """新しい店舗コードを生成"""
    last_store = db.query(Store).order_by(Store.id.desc()).first()
    if last_store:
        # 最後の店舗コードから番号を抽出して+1
        try:
            last_number = int(last_store.store_code.split('_')[1])
            new_number = last_number + 1
        except (IndexError, ValueError):
            new_number = 2
    else:
        new_number = 1
    
    return f"BAR_{new_number:04d}"

# 従業員コード生成関数
def generate_employee_code(db: Session, store_id: int) -> str:
    """指定店舗内で新しい従業員コードを生成"""
    from database import Employee
    
    last_employee = db.query(Employee).filter(
        Employee.store_id == store_id
    ).order_by(Employee.id.desc()).first()
    
    if last_employee:
        try:
            last_number = int(last_employee.employee_code.split('_')[1])
            new_number = last_number + 1
        except (IndexError, ValueError):
            new_number = 2
    else:
        new_number = 1
    
    return f"EMP_{new_number:03d}"

# テナント情報検証
def validate_store_access(store_id: int, current_user: User):
    """ユーザーが指定店舗にアクセス可能かチェック"""
    if current_user.store_id != store_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="他店舗のデータにはアクセスできません"
        )
    return True

# 店舗情報取得
def get_store_by_code(db: Session, store_code: str):
    """店舗コードから店舗情報を取得"""
    return db.query(Store).filter(
        Store.store_code == store_code,
        Store.is_active == True
    ).first()

# ユーザー作成時の店舗検証
def validate_store_for_user_creation(db: Session, store_code: str):
    """ユーザー作成時に店舗の存在を確認"""
    store = get_store_by_code(db, store_code)
    if not store:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="指定された店舗コードが存在しません"
        )
    return store

# セッション管理
def create_user_session_data(user: User, store: Store):
    """ユーザーセッション用のデータを作成"""
    return {
        "sub": user.email,
        "user_id": user.id,
        "store_id": user.store_id,
        "store_code": store.store_code,
        "role": user.role,
        "name": user.name
    }