// API Base URL - 本番環境では VITE_API_URL 環境変数を使用
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8002';

// デバッグ用ログ
console.log('🔗 API Base URL:', API_BASE_URL);
console.log('🔗 Environment:', import.meta.env.MODE);
