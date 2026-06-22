import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

// Backend runs on port 8080 according to the plan
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
  timeout: 10000,
  withCredentials: true,
});

apiClient.interceptors.response.use(
  (response) => {
    // Auto-extract response envelope { success, data } — transparent cho các service call
    // BE bọc tất cả response thành { success: true, data: ... } qua TransformInterceptor
    // FE tự unwrap ở đây → res.data trong các service vẫn là payload thật, không cần đổi
    const envelope = response.data;
    if (
      envelope &&
      typeof envelope === 'object' &&
      'success' in envelope &&
      'data' in envelope
    ) {
      return { ...response, data: envelope.data };
    }
    return response;
  },
  (error) => {
    // Xử lý lỗi chung: Token hết hạn → logout
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default apiClient;
