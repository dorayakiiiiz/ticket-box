import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

// Backend runs on port 8080 according to the plan
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
  timeout: 10000,
  withCredentials: true,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Xử lý lỗi chung (VD: Token hết hạn -> Xóa token)
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default apiClient;
