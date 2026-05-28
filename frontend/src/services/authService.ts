import apiClient from './apiClient';

export const authService = {
  login: async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  },

  signup: async (email: string, password: string, fullName: string) => {
    const response = await apiClient.post('/auth/signup', { email, password, fullName });
    return response.data;
  },

  verifyOtp: async (email: string, code: string) => {
    const response = await apiClient.post('/auth/verify-otp', { email, code });
    return response.data;
  },

  googleLogin: async (supabaseToken: string) => {
    const response = await apiClient.post('/auth/supabase-login', { token: supabaseToken });
    return response.data;
  }
};
