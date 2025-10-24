#!/bin/bash
# start.sh - Render起動スクリプト (PostgreSQL対応)

echo "🚀 バー管理システム SaaS起動中..."

# 環境変数チェック
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️ DATABASE_URLが設定されていません"
    exit 1
else
    echo "✅ DATABASE_URL検出: ${DATABASE_URL:0:30}..."
fi

# PostgreSQL接続待機（最大30秒）
echo "PostgreSQL接続を待機中..."
python << END
import sys
import time
import os
from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

max_retries = 30
retry_count = 0

while retry_count < max_retries:
    try:
        engine = create_engine(DATABASE_URL, pool_pre_ping=True)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("✅ PostgreSQL接続成功")
        sys.exit(0)
    except Exception as e:
        retry_count += 1
        print(f"接続試行 {retry_count}/{max_retries}... ({str(e)[:50]})")
        time.sleep(1)

print("❌ PostgreSQL接続失敗")
sys.exit(1)
END

if [ $? -ne 0 ]; then
    echo "❌ データベース接続に失敗しました"
    exit 1
fi

# データベーステーブル作成
echo "データベーステーブルを作成中..."
python -c "from database_saas import create_tables, create_super_admin; create_tables(); create_super_admin('admin@bar-management.com', 'admin123', 'システム管理者')"

# uvicornでAPIサーバー起動
echo "✅ APIサーバーを起動します"
exec uvicorn main_saas:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1