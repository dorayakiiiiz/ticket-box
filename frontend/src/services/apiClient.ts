import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

// Backend runs on port 8080 according to the plan
const apiClient = axios.create({
  baseURL: 'http://localhost:8080',
  timeout: 10000,
});

apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Xử lý lỗi chung (VD: Token hết hạn -> Xóa token)
    if (error.response?.status === 401) {
      // Gọi hàm logout của store để clear toàn bộ (cookie, local, state)
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default apiClient;
