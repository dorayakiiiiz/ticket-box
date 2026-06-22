import apiClient from './apiClient';

export const authService = {
  login: async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  },

  signup: async (email: string, password: string, fullName: string, captchaToken?: string) => {
    const config = captchaToken ? { headers: { 'x-turnstile-token': captchaToken } } : {};
    const response = await apiClient.post('/auth/signup', { email, password, fullName }, config);
    return response.data;
  },

  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },

  verifyOtp: async (email: string, code: string) => {
    const response = await apiClient.post('/auth/verify-otp', { email, code });
    return response.data;
  },

  googleLogin: async (supabaseToken: string) => {
    const response = await apiClient.post('/auth/supabase-login', { token: supabaseToken });
    return response.data;
  },

  forgotPassword: async (email: string, captchaToken?: string) => {
    const config = captchaToken ? { headers: { 'x-turnstile-token': captchaToken } } : {};
    const response = await apiClient.post('/auth/forgot-password', { email }, config);
    return response.data;
  },

  resetPassword: async (email: string, code: string, newPassword: string) => {
    const response = await apiClient.post('/auth/reset-password', { email, code, newPassword });
    return response.data;
  },

  // PATCH /auth/profile — cập nhật họ tên và SĐT
  updateProfile: async (fullName?: string, phone?: string) => {
    const response = await apiClient.patch('/auth/profile', { fullName, phone });
    return response.data;
  },

  // PATCH /auth/change-password — đổi mật khẩu
  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await apiClient.patch('/auth/change-password', { currentPassword, newPassword });
    return response.data;
  },

  // DELETE /auth/account — soft delete tài khoản
  deleteAccount: async () => {
    const response = await apiClient.delete('/auth/account');
    return response.data;
  },
};
