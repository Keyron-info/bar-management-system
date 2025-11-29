// ローカル開発用（本番デプロイ時はコメントを戻す）
export const API_BASE_URL = 'http://localhost:8002';
// export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8002';
console.log('🔗 API Base URL:', API_BASE_URL);
