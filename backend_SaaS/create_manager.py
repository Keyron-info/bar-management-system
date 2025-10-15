"""
店長アカウント作成スクリプト（SaaS版対応）
backend_SaaS/ディレクトリで実行してください
"""
import sys
sys.path.append('.')

from sqlalchemy.orm import Session
from database_saas import SessionLocal, Employee, Store, UserRole, generate_employee_code
from auth_saas import get_password_hash

def create_manager_account():
    """店長アカウントを作成"""
    db = SessionLocal()
    
    try:
        # STORE001を検索
        store = db.query(Store).filter(Store.store_code == "STORE001").first()
        
        if not store:
            print("❌ エラー: STORE001 が見つかりません")
            print("まず初期データを作成してください")
            return
        
        print(f"✅ 店舗を確認: {store.store_name} (ID: {store.id})")
        
        # 既存の店長アカウントを確認
        existing_manager = db.query(Employee).filter(
            Employee.store_id == store.id,
            Employee.email == "manager@store001.com"
        ).first()
        
        if existing_manager:
            print("\n✅ 店長アカウントは既に存在します")
            print(f"   Email: {existing_manager.email}")
            print(f"   名前: {existing_manager.name}")
            print(f"   役職: {existing_manager.role.value}")
            print(f"   従業員コード: {existing_manager.employee_code}")
            print("\n【ログイン情報】")
            print("━━━━━━━━━━━━━━━━━━━━")
            print(f"店舗コード: STORE001")
            print(f"Email: {existing_manager.email}")
            print(f"Password: password123")
            print("━━━━━━━━━━━━━━━━━━━━")
            return
        
        # 従業員コード生成
        employee_code = generate_employee_code("STORE001")
        
        # 新しい店長アカウントを作成
        manager = Employee(
            store_id=store.id,
            employee_code=employee_code,
            name="山田太郎（店長）",
            email="manager@store001.com",
            password_hash=get_password_hash("password123"),
            role=UserRole.MANAGER,  # Enumを使用
            is_active=True,
            employment_type="full_time"
        )
        
        db.add(manager)
        db.commit()
        db.refresh(manager)
        
        print("\n✅ 店長アカウントを作成しました！")
        print("\n【ログイン情報】")
        print("━━━━━━━━━━━━━━━━━━━━")
        print(f"店舗コード: STORE001")
        print(f"Email: manager@store001.com")
        print(f"Password: password123")
        print(f"名前: 山田太郎（店長）")
        print(f"役職: manager（店長）")
        print(f"従業員コード: {employee_code}")
        print("━━━━━━━━━━━━━━━━━━━━")
        print("\nこのアカウントでログインしてStorePageを確認してください！")
        
    except Exception as e:
        db.rollback()
        print(f"❌ エラーが発生しました: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    print("🔧 店長アカウント作成スクリプト（SaaS版）")
    print("=" * 40)
    create_manager_account()