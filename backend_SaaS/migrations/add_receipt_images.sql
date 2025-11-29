-- AI伝票スキャン機能用のマイグレーション
-- 作成日: 2024-11-28
-- 機能: 伝票画像保存とOCR処理結果の管理

-- ProcessingStatus ENUM型を作成（PostgreSQL用）
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'processingstatus') THEN
        CREATE TYPE processingstatus AS ENUM ('pending', 'processing', 'completed', 'failed');
    END IF;
END$$;

-- receipt_imagesテーブル作成
CREATE TABLE IF NOT EXISTS receipt_images (
    id SERIAL PRIMARY KEY,
    store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    daily_report_id INTEGER REFERENCES daily_reports(id) ON DELETE SET NULL,
    receipt_id INTEGER REFERENCES receipts(id) ON DELETE SET NULL,
    
    -- 画像情報
    image_url VARCHAR(500) NOT NULL,
    image_hash VARCHAR(64),
    file_size INTEGER,
    mime_type VARCHAR(50),
    
    -- OCR結果
    ocr_raw_response TEXT,
    ocr_extracted_data TEXT,  -- JSONB形式
    
    -- 処理状態
    processing_status processingstatus DEFAULT 'pending',
    error_message TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    confidence_score FLOAT,
    
    -- タイムスタンプ
    uploaded_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_receipt_images_store_employee 
ON receipt_images(store_id, employee_id);

CREATE INDEX IF NOT EXISTS idx_receipt_images_status 
ON receipt_images(processing_status);

CREATE INDEX IF NOT EXISTS idx_receipt_images_hash 
ON receipt_images(image_hash);

CREATE INDEX IF NOT EXISTS idx_receipt_images_daily_report 
ON receipt_images(daily_report_id);

-- receiptsテーブルにカラム追加
DO $$
BEGIN
    -- receipt_image_id カラム追加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'receipts' AND column_name = 'receipt_image_id'
    ) THEN
        ALTER TABLE receipts 
        ADD COLUMN receipt_image_id INTEGER REFERENCES receipt_images(id) ON DELETE SET NULL;
    END IF;

    -- is_auto_generated カラム追加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'receipts' AND column_name = 'is_auto_generated'
    ) THEN
        ALTER TABLE receipts 
        ADD COLUMN is_auto_generated BOOLEAN DEFAULT FALSE;
    END IF;

    -- manual_corrections カラム追加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'receipts' AND column_name = 'manual_corrections'
    ) THEN
        ALTER TABLE receipts 
        ADD COLUMN manual_corrections TEXT;  -- JSON形式
    END IF;
END$$;

-- daily_reportsテーブルにスキャン統計カラム追加（オプション）
DO $$
BEGIN
    -- total_scanned_receipts カラム追加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'daily_reports' AND column_name = 'total_scanned_receipts'
    ) THEN
        ALTER TABLE daily_reports 
        ADD COLUMN total_scanned_receipts INTEGER DEFAULT 0;
    END IF;

    -- auto_generation_rate カラム追加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'daily_reports' AND column_name = 'auto_generation_rate'
    ) THEN
        ALTER TABLE daily_reports 
        ADD COLUMN auto_generation_rate FLOAT;
    END IF;
END$$;

-- 成功メッセージ
DO $$
BEGIN
    RAISE NOTICE '✅ AI伝票スキャン機能のマイグレーション完了';
END$$;

