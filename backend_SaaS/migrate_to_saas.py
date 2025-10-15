#!/usr/bin/env python3
"""
既存のバー管理システムデータをSaaS対応スキーマに移行するスクリプト

移行内容:
1. 既存のUsersテーブル → Employeesテーブル
2. 既存のDailyReportsテーブル → 新しいDailyReportsテーブル
3. 既存のReceiptsテーブル → 新しいReceiptsテーブル
4. デフォルト組織・店舗・サブスクリプション作成
"""

import sys
import os
from datetime import datetime, date, timedelta
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import json

# 既存のデータベース設定
LEGACY_DATABASE_URL = "sqlite:///./bar_management.db"
NEW_DATABASE_URL = "sqlite:///./bar_management_saas.db"

# 新しいスキーマをインポート
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database_saas import (
    Base, Organization, Store, Employee, Subscription, DailyReport, Receipt,
    SystemAdmin, UserRole, SubscriptionStatus, generate_store_code, 
    generate_employee_code, get_password_hash
)

class MigrationTool:
    def __init__(self):
        self.legacy_engine = create_engine(LEGACY_DATABASE_URL, connect_args={"check_same_thread": False})
        self.new_engine = create_engine(NEW_DATABASE_URL, connect_args={"check_same_thread": False})
        
        self.LegacySession = sessionmaker(bind=self.legacy_engine)
        self.NewSession = sessionmaker(bind=self.new_engine)
        
        self.migration_log = []
        
    def log(self, message: str):
        """移行ログを記録"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] {message}"
        print(log_entry)
        self.migration_log.append(log_entry)
    
    def create_new_tables(self):
        """新しいテーブル構造を作成"""
        self.log("新しいデータベーステーブルを作成中...")
        Base.metadata.create_all(bind=self.new_engine)
        self.log("✅ テーブル作成完了")
    
    def create_default_organization_and_store(self, new_session):
        """デフォルトの組織と店舗を作成"""
        self.log("デフォルト組織と店舗を作成中...")
        
        # 1. デフォルト組織作成
        organization = Organization(
            name="デフォルト組織",
            domain="default-bar",
            contact_email="admin@default-bar.com",
            address="移行データ（住所不明）"
        )
        new_session.add(organization)
        new_session.flush()
        
        # 2. デフォルト店舗作成（既存の店舗コードを使用）
        store = Store(
            organization_id=organization.id,
            store_code="BAR_0001",  # 既存の店舗コードを保持
            store_name="メインバー",
            store_type="bar",
            address="移行データ（住所不明）",
            timezone="Asia/Tokyo",
            currency="JPY",
            business_hours_start="18:00",
            business_hours_end="03:00"
        )
        new_session.add(store)
        new_session.flush()
        
        # 3. デフォルトサブスクリプション作成
        subscription = Subscription(
            organization_id=organization.id,
            plan_name="legacy_migration",
            status=SubscriptionStatus.ACTIVE,
            max_stores=1,
            max_employees_per_store=50,
            monthly_fee=0.0,  # 移行データは無料
            trial_end_date=datetime.utcnow() + timedelta(days=365)  # 1年間
        )
        new_session.add(subscription)
        
        new_session.commit()
        
        self.log(f"✅ デフォルト組織作成: ID={organization.id}, ドメイン={organization.domain}")
        self.log(f"✅ デフォルト店舗作成: ID={store.id}, コード={store.store_code}")
        
        return organization, store, subscription
    
    def migrate_users_to_employees(self, legacy_session, new_session, store):
        """既存のUsersテーブルをEmployeesテーブルに移行"""
        self.log("ユーザーデータを従業員データに移行中...")
        
        # 既存ユーザーを取得
        legacy_users = legacy_session.execute(text("SELECT * FROM users")).fetchall()
        
        migrated_count = 0
        for user_row in legacy_users:
            try:
                # 既存の役割をSaaS役割にマッピング
                legacy_role = user_row.role if hasattr(user_row, 'role') else 'staff'
                if legacy_role == "manager":
                    new_role = UserRole.MANAGER
                else:
                    new_role = UserRole.STAFF
                
                # 従業員コード生成
                employee_code = generate_employee_code(store.store_code)
                
                # 新しい従業員レコード作成
                employee = Employee(
                    store_id=store.id,
                    employee_code=employee_code,
                    name=user_row.name,
                    email=user_row.email,
                    password_hash=user_row.password_hash,  # 既存のハッシュを保持
                    role=new_role,
                    is_active=user_row.is_active if hasattr(user_row, 'is_active') else True,
                    hire_date=date.today(),  # 移行日を雇用日とする
                    hourly_wage=0.0,
                    employment_type="part_time",
                    created_at=user_row.created_at if hasattr(user_row, 'created_at') else datetime.utcnow()
                )
                
                new_session.add(employee)
                migrated_count += 1
                
                self.log(f"  ユーザー移行: {user_row.email} → 従業員ID: {employee.employee_code}")
                
            except Exception as e:
                self.log(f"  ❌ ユーザー移行エラー: {user_row.email if hasattr(user_row, 'email') else 'unknown'} - {str(e)}")
        
        new_session.commit()
        self.log(f"✅ ユーザー移行完了: {migrated_count}件")
        
        return migrated_count
    
    def migrate_daily_reports(self, legacy_session, new_session, store):
        """既存のDailyReportsテーブルを新しい構造に移行"""
        self.log("日報データを移行中...")
        
        # 既存日報を取得
        legacy_reports = legacy_session.execute(text("SELECT * FROM daily_reports")).fetchall()
        
        # 従業員名からIDマッピングを作成
        employees = new_session.query(Employee).filter(Employee.store_id == store.id).all()
        employee_name_to_id = {emp.name: emp.id for emp in employees}
        
        migrated_count = 0
        for report_row in legacy_reports:
            try:
                # 従業員IDを取得
                employee_id = employee_name_to_id.get(report_row.employee_name)
                if not employee_id:
                    self.log(f"  ⚠️ 従業員が見つかりません: {report_row.employee_name}")
                    # デフォルト従業員を探す
                    default_employee = employees[0] if employees else None
                    if default_employee:
                        employee_id = default_employee.id
                        self.log(f"    デフォルト従業員を使用: {default_employee.name}")
                    else:
                        continue
                
                # 新しい日報レコード作成
                new_report = DailyReport(
                    store_id=store.id,
                    employee_id=employee_id,
                    date=report_row.date,
                    total_sales=report_row.total_sales if hasattr(report_row, 'total_sales') else 0,
                    alcohol_cost=report_row.alcohol_cost if hasattr(report_row, 'alcohol_cost') else 0,
                    other_expenses=report_row.other_expenses if hasattr(report_row, 'other_expenses') else 0,
                    card_sales=report_row.card_sales if hasattr(report_row, 'card_sales') else 0,
                    drink_count=report_row.drink_count if hasattr(report_row, 'drink_count') else 0,
                    champagne_type=report_row.champagne_type if hasattr(report_row, 'champagne_type') else "",
                    champagne_price=report_row.champagne_price if hasattr(report_row, 'champagne_price') else 0,
                    work_start_time=report_row.work_start_time if hasattr(report_row, 'work_start_time') else "18:00",
                    work_end_time=report_row.work_end_time if hasattr(report_row, 'work_end_time') else "03:00",
                    break_minutes=0,
                    is_approved=True,  # 既存データは承認済みとする
                    notes="移行データ",
                    created_at=report_row.created_at if hasattr(report_row, 'created_at') else datetime.utcnow(),
                    updated_at=report_row.updated_at if hasattr(report_row, 'updated_at') else datetime.utcnow()
                )
                
                new_session.add(new_report)
                migrated_count += 1
                
                self.log(f"  日報移行: {report_row.date} - {report_row.employee_name}")
                
            except Exception as e:
                self.log(f"  ❌ 日報移行エラー: {report_row.date if hasattr(report_row, 'date') else 'unknown'} - {str(e)}")
        
        new_session.commit()
        self.log(f"✅ 日報移行完了: {migrated_count}件")
        
        return migrated_count
    
    def migrate_receipts(self, legacy_session, new_session):
        """既存のReceiptsテーブルを新しい構造に移行"""
        self.log("伝票データを移行中...")
        
        try:
            # 既存伝票を取得
            legacy_receipts = legacy_session.execute(text("SELECT * FROM receipts")).fetchall()
            
            # 日報IDマッピングを作成
            new_reports = new_session.query(DailyReport).all()
            # 日付と従業員名から日報IDを特定するマッピング
            report_mapping = {}
            for report in new_reports:
                employee = new_session.query(Employee).filter(Employee.id == report.employee_id).first()
                if employee:
                    key = f"{report.date}_{employee.name}"
                    report_mapping[key] = report.id
            
            migrated_count = 0
            for receipt_row in legacy_receipts:
                try:
                    # 対応する日報IDを見つける
                    daily_report_id = receipt_row.daily_report_id if hasattr(receipt_row, 'daily_report_id') else None
                    
                    if not daily_report_id:
                        # 従業員名から推測
                        employee_name = receipt_row.employee_name if hasattr(receipt_row, 'employee_name') else ""
                        # 日付は推測が困難なため、最新の日報を使用
                        latest_report = new_session.query(DailyReport).join(Employee).filter(
                            Employee.name == employee_name
                        ).order_by(DailyReport.created_at.desc()).first()
                        
                        if latest_report:
                            daily_report_id = latest_report.id
                        else:
                            self.log(f"  ⚠️ 対応する日報が見つかりません: {employee_name}")
                            continue
                    
                    # 新しい伝票レコード作成
                    new_receipt = Receipt(
                        daily_report_id=daily_report_id,
                        customer_name=receipt_row.customer_name if hasattr(receipt_row, 'customer_name') else "不明",
                        employee_name=receipt_row.employee_name if hasattr(receipt_row, 'employee_name') else "",
                        drink_count=receipt_row.drink_count if hasattr(receipt_row, 'drink_count') else 0,
                        champagne_type=receipt_row.champagne_type if hasattr(receipt_row, 'champagne_type') else "",
                        champagne_price=receipt_row.champagne_price if hasattr(receipt_row, 'champagne_price') else 0,
                        amount=receipt_row.amount if hasattr(receipt_row, 'amount') else 0,
                        is_card=receipt_row.is_card if hasattr(receipt_row, 'is_card') else False,
                        receipt_number="",
                        table_number="",
                        service_charge=0,
                        created_at=receipt_row.created_at if hasattr(receipt_row, 'created_at') else datetime.utcnow()
                    )
                    
                    new_session.add(new_receipt)
                    migrated_count += 1
                    
                except Exception as e:
                    self.log(f"  ❌ 伝票移行エラー: {str(e)}")
            
            new_session.commit()
            self.log(f"✅ 伝票移行完了: {migrated_count}件")
            
            return migrated_count
            
        except Exception as e:
            self.log(f"❌ 伝票テーブルが見つかりません（スキップ）: {str(e)}")
            return 0
    
    def create_super_admin(self, new_session):
        """スーパーアドミンアカウントを作成"""
        self.log("スーパーアドミンアカウントを作成中...")
        
        # 既存チェック
        existing_admin = new_session.query(SystemAdmin).filter(
            SystemAdmin.email == "admin@bar-management.com"
        ).first()
        
        if existing_admin:
            self.log("✅ スーパーアドミンは既に存在します")
            return existing_admin
        
        # 新規作成
        super_admin = SystemAdmin(
            email="admin@bar-management.com",
            password_hash=get_password_hash("admin123"),
            name="システム管理者",
            is_super_admin=True,
            can_create_organizations=True,
            can_manage_subscriptions=True,
            can_access_all_data=True
        )
        
        new_session.add(super_admin)
        new_session.commit()
        
        self.log("✅ スーパーアドミン作成完了")
        return super_admin
    
    def backup_legacy_database(self):
        """既存データベースをバックアップ"""
        import shutil
        
        backup_filename = f"bar_management_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
        try:
            shutil.copy2("./bar_management.db", f"./{backup_filename}")
            self.log(f"✅ 既存データベースバックアップ完了: {backup_filename}")
            return backup_filename
        except Exception as e:
            self.log(f"❌ バックアップエラー: {str(e)}")
            return None
    
    def validate_migration(self, new_session):
        """移行結果を検証"""
        self.log("移行結果を検証中...")
        
        # 基本統計
        org_count = new_session.query(Organization).count()
        store_count = new_session.query(Store).count()
        employee_count = new_session.query(Employee).count()
        report_count = new_session.query(DailyReport).count()
        receipt_count = new_session.query(Receipt).count()
        admin_count = new_session.query(SystemAdmin).count()
        
        self.log(f"📊 移行結果統計:")
        self.log(f"  組織: {org_count}")
        self.log(f"  店舗: {store_count}")
        self.log(f"  従業員: {employee_count}")
        self.log(f"  日報: {report_count}")
        self.log(f"  伝票: {receipt_count}")
        self.log(f"  システム管理者: {admin_count}")
        
        # 基本検証
        if org_count == 0 or store_count == 0:
            self.log("❌ 重要: 組織または店舗が作成されていません！")
            return False
        
        if employee_count == 0:
            self.log("⚠️ 警告: 従業員データが移行されていません")
        
        self.log("✅ 移行検証完了")
        return True
    
    def save_migration_log(self):
        """移行ログをファイルに保存"""
        log_filename = f"migration_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        try:
            with open(log_filename, 'w', encoding='utf-8') as f:
                f.write("\n".join(self.migration_log))
            self.log(f"✅ 移行ログ保存完了: {log_filename}")
        except Exception as e:
            self.log(f"❌ ログ保存エラー: {str(e)}")
    
    def run_migration(self):
        """完全移行を実行"""
        self.log("🚀 SaaS移行を開始します...")
        
        try:
            # 1. バックアップ
            backup_file = self.backup_legacy_database()
            if not backup_file:
                self.log("❌ バックアップに失敗しました。移行を中止します。")
                return False
            
            # 2. 新しいテーブル作成
            self.create_new_tables()
            
            legacy_session = self.LegacySession()
            new_session = self.NewSession()
            
            try:
                # 3. デフォルト組織・店舗作成
                organization, store, subscription = self.create_default_organization_and_store(new_session)
                
                # 4. スーパーアドミン作成
                self.create_super_admin(new_session)
                
                # 5. ユーザー移行
                user_count = self.migrate_users_to_employees(legacy_session, new_session, store)
                
                # 6. 日報移行
                report_count = self.migrate_daily_reports(legacy_session, new_session, store)
                
                # 7. 伝票移行
                receipt_count = self.migrate_receipts(legacy_session, new_session)
                
                # 8. 移行検証
                is_valid = self.validate_migration(new_session)
                
                if is_valid:
                    self.log("🎉 SaaS移行が正常に完了しました！")
                    self.log("")
                    self.log("📋 次のステップ:")
                    self.log("1. main_saas.py を起動してください")
                    self.log("2. スーパーアドミンでログイン: admin@bar-management.com / admin123")
                    self.log("3. 既存ユーザーは従業員として移行済みです")
                    self.log("4. 店舗コード 'BAR_0001' は保持されています")
                    self.log("")
                    self.log("⚠️ 重要:")
                    self.log("- 新しいAPI（main_saas.py）を使用してください")
                    self.log("- フロントエンドは既存のままで動作します（後方互換性）")
                    self.log("- 本格運用前にセキュリティ設定を見直してください")
                    
                    return True
                else:
                    self.log("❌ 移行検証に失敗しました")
                    return False
                    
            finally:
                legacy_session.close()
                new_session.close()
                
        except Exception as e:
            self.log(f"❌ 移行中に重大なエラーが発生しました: {str(e)}")
            return False
        
        finally:
            # ログ保存
            self.save_migration_log()

def main():
    """移行スクリプトのメイン実行"""
    print("=" * 60)
    print("バー管理システム SaaS移行ツール")
    print("=" * 60)
    print()
    
    # 確認
    response = input("既存データをSaaSスキーマに移行しますか？ (y/N): ")
    if response.lower() != 'y':
        print("移行をキャンセルしました。")
        return
    
    # 移行実行
    migrator = MigrationTool()
    success = migrator.run_migration()
    
    if success:
        print("\n✅ 移行が正常に完了しました！")
        print("新しいAPIサーバー（main_saas.py）を起動してください。")
    else:
        print("\n❌ 移行に失敗しました。ログを確認してください。")
    
    return success

if __name__ == "__main__":
    main()