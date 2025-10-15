#!/usr/bin/env python3
"""
データベースマイグレーション実行スクリプト
バー管理システムをマルチテナント対応に移行します
"""

import sys
import os
from datetime import date

# 現在のディレクトリを確認
print(f"現在のディレクトリ: {os.getcwd()}")

try:
    from database import run_migration, SessionLocal, Store, User, Employee
    from auth import get_password_hash
    print("✅ 必要なモジュールのインポート成功")
except ImportError as e:
    print(f"❌ インポートエラー: {e}")
    sys.exit(1)

def create_demo_data():
    """デモ用データを作成"""
    print("📝 デモデータ作成開始...")
    db = SessionLocal()
    try:
        # デフォルト店舗の確認・作成
        store = db.query(Store).filter(Store.store_code == "BAR_0001").first()
        if not store:
            print("❌ デフォルト店舗が見つかりません。マイグレーションを先に実行してください。")
            return
        
        print(f"✅ 店舗確認: {store.store_name} ({store.store_code})")
        
        # テストユーザーの作成（既存チェック）
        test_user = db.query(User).filter(User.email == "test@bar.com").first()
        if not test_user:
            test_user = User(
                store_id=store.id,
                email="test@bar.com",
                password_hash=get_password_hash("test123"),
                name="テストユーザー",
                role="manager"
            )
            db.add(test_user)
            print("✅ テストユーザー作成: test@bar.com / test123 (店長権限)")
        else:
            print("✅ テストユーザー既存: test@bar.com")
        
        # デモ従業員の作成
        demo_employees = [
            {"code": "EMP_001", "name": "田中花子", "role": "staff"},
            {"code": "EMP_002", "name": "佐藤太郎", "role": "staff"},
            {"code": "EMP_003", "name": "山田美咲", "role": "staff"}
        ]
        
        for emp_data in demo_employees:
            existing_emp = db.query(Employee).filter(
                Employee.store_id == store.id,
                Employee.employee_code == emp_data["code"]
            ).first()
            
            if not existing_emp:
                new_employee = Employee(
                    store_id=store.id,
                    employee_code=emp_data["code"],
                    name=emp_data["name"],
                    role=emp_data["role"],
                    hire_date=date.today()
                )
                db.add(new_employee)
                print(f"✅ デモ従業員作成: {emp_data['name']} ({emp_data['code']})")
            else:
                print(f"✅ デモ従業員既存: {emp_data['name']} ({emp_data['code']})")
        
        db.commit()
        print("✅ デモデータの作成が完了しました")
        
    except Exception as e:
        db.rollback()
        print(f"❌ デモデータ作成中にエラーが発生しました: {str(e)}")
        raise
    finally:
        db.close()

def verify_migration():
    """マイグレーション結果を検証"""
    print("📝 マイグレーション結果検証開始...")
    db = SessionLocal()
    try:
        # 店舗数確認
        store_count = db.query(Store).count()
        print(f"📊 店舗数: {store_count}")
        
        # ユーザー数確認
        user_count = db.query(User).count()
        print(f"📊 ユーザー数: {user_count}")
        
        # 従業員数確認
        employee_count = db.query(Employee).count()
        print(f"📊 従業員数: {employee_count}")
        
        # 店舗別データ確認
        stores = db.query(Store).all()
        for store in stores:
            store_users = db.query(User).filter(User.store_id == store.id).count()
            store_employees = db.query(Employee).filter(Employee.store_id == store.id).count()
            print(f"🏪 店舗 {store.store_code} ({store.store_name}): ユーザー{store_users}名、従業員{store_employees}名")
            
    except Exception as e:
        print(f"❌ 検証中にエラーが発生しました: {str(e)}")
    finally:
        db.close()

def main():
    """メイン処理"""
    print("🚀 バー管理システム マルチテナント移行開始")
    print("=" * 60)
    
    try:
        # Step 1: データベースマイグレーション実行
        print("📝 Step 1: データベースマイグレーション実行")
        run_migration()
        print("✅ マイグレーション完了")
        
        # Step 2: デモデータ作成
        print("\n📝 Step 2: デモデータ作成")
        create_demo_data()
        
        # Step 3: 結果検証
        print("\n📝 Step 3: マイグレーション結果検証")
        verify_migration()
        
        print("\n" + "=" * 60)
        print("🎉 マルチテナント移行が正常に完了しました！")
        print("\n📋 ログイン情報:")
        print("   店舗コード: BAR_0001")
        print("   メール: test@bar.com")
        print("   パスワード: test123")
        print("   権限: 店長")
        print("\n🔧 次の手順:")
        print("   1. バックエンドサーバーを起動: python main.py")
        print("   2. フロントエンドサーバーを起動: npm run dev")
        print("   3. ブラウザでアクセス: http://localhost:5173")
        
    except Exception as e:
        print(f"\n❌ 移行中にエラーが発生しました: {str(e)}")
        import traceback
        traceback.print_exc()
        print("\n🔧 トラブルシューティング:")
        print("   1. データベースファイルが存在するか確認")
        print("   2. 必要な依存関係がインストールされているか確認") 
        print("   3. ファイルの権限を確認")
        sys.exit(1)

if __name__ == "__main__":
    main()