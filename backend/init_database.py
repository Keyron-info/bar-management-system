"""
新しいマルチテナント対応データベースの初期化
"""

from sqlalchemy.orm import Session
from database import SessionLocal, Store, User, SubscriptionStatus, create_tables
from auth import get_password_hash
from datetime import date, timedelta

def initialize_database():
    """新しいデータベースを初期化"""
    
    print("🚀 データベースを初期化しています...")
    
    # Step 1: テーブル作成
    print("Step 1: テーブルを作成中...")
    create_tables()
    print("✅ 全テーブル作成完了")
    
    # Step 2: デフォルト店舗とオーナーアカウント作成
    db = SessionLocal()
    
    try:
        print("Step 2: デフォルト店舗を作成中...")
        
        # デフォルト店舗作成
        default_store = Store(
            store_name="KEYRONバー",
            store_code="KEYRON_001",
            owner_email="owner@keyron-bar.com",
            subscription_status=SubscriptionStatus.ACTIVE,
            subscription_start_date=date.today(),
            subscription_end_date=date.today() + timedelta(days=365),  # 1年間有効
            monthly_sales_goal=500000,
            owner_name="KEYRON店長",
            phone="03-1234-5678",
            address="東京都渋谷区"
        )
        
        db.add(default_store)
        db.commit()
        db.refresh(default_store)
        print(f"✅ デフォルト店舗作成完了 (コード: {default_store.store_code})")
        
        # オーナーアカウント作成
        print("Step 3: オーナーアカウントを作成中...")
        
        owner_user = User(
            store_id=default_store.id,
            email="owner@keyron-bar.com",
            password_hash=get_password_hash("password123"),  # 初期パスワード
            name="KEYRON店長",
            role="owner",
            employee_code="OWNER001",
            position="店長",
            hire_date=date.today(),
            phone="03-1234-5678"
        )
        
        db.add(owner_user)
        db.commit()
        print("✅ オーナーアカウント作成完了")
        
        # サンプル従業員作成
        print("Step 4: サンプル従業員を作成中...")
        
        sample_staff = User(
            store_id=default_store.id,
            email="staff@keyron-bar.com",
            password_hash=get_password_hash("staff123"),
            name="田中 花子",
            role="staff",
            employee_code="STAFF001",
            position="スタッフ",
            hire_date=date.today(),
            hourly_wage=1500
        )
        
        sample_manager = User(
            store_id=default_store.id,
            email="manager@keyron-bar.com",
            password_hash=get_password_hash("manager123"),
            name="佐藤 太郎",
            role="manager",
            employee_code="MGR001",
            position="マネージャー",
            hire_date=date.today(),
            hourly_wage=2000
        )
        
        db.add_all([sample_staff, sample_manager])
        db.commit()
        print("✅ サンプル従業員作成完了")
        
        # 結果表示
        print("\n" + "="*50)
        print("🎉 データベース初期化完了！")
        print("="*50)
        print(f"店舗名: {default_store.store_name}")
        print(f"店舗コード: {default_store.store_code}")
        print("\n📋 作成されたアカウント:")
        print("1. オーナー:")
        print(f"   メール: owner@keyron-bar.com")
        print(f"   パスワード: password123")
        print("2. マネージャー:")
        print(f"   メール: manager@keyron-bar.com")
        print(f"   パスワード: manager123")
        print("3. スタッフ:")
        print(f"   メール: staff@keyron-bar.com")
        print(f"   パスワード: staff123")
        print("\n⚠️  本番環境では必ずパスワードを変更してください！")
        
        return True
        
    except Exception as e:
        print(f"❌ 初期化中にエラーが発生しました: {str(e)}")
        db.rollback()
        return False
        
    finally:
        db.close()

def verify_setup():
    """セットアップの確認"""
    db = SessionLocal()
    
    try:
        stores = db.query(Store).all()
        users = db.query(User).all()
        
        print(f"\n📊 セットアップ確認:")
        print(f"店舗数: {len(stores)}")
        print(f"ユーザー数: {len(users)}")
        
        for store in stores:
            store_users = db.query(User).filter(User.store_id == store.id).all()
            print(f"\n🏪 {store.store_name} ({store.store_code}):")
            print(f"   サブスクリプション: {store.subscription_status.value}")
            print(f"   従業員数: {len(store_users)}人")
            
            for user in store_users:
                print(f"   - {user.name} ({user.role}) - {user.email}")
        
    finally:
        db.close()

if __name__ == "__main__":
    success = initialize_database()
    
    if success:
        verify_setup()
        print("\n✅ 次のステップ: 認証システムの更新を行ってください")
    else:
        print("\n❌ 初期化に失敗しました")