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

  updateProfile: async (fullName?: string, phone?: string) => {
    const response = await apiClient.post('/auth/profile', { fullName, phone });
    return response.data;
  }
};
