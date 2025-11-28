-- hire_date カラムのNOT NULL制約を削除
-- 実行日: 2024-11-28
-- 問題: 従業員登録時にhire_dateがNULLだとエラーになる

-- PostgreSQL用
ALTER TABLE employees ALTER COLUMN hire_date DROP NOT NULL;

-- 確認クエリ
-- SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'hire_date';

