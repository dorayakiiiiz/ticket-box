import { create } from 'zustand';
import Cookies from 'js-cookie';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  phone?: string;
  avatarUrl?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isAuthModalOpen: boolean;
  login: (user: User) => void;
  logout: () => void;
  initialize: () => void;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  isInitialized: boolean;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isAuthModalOpen: false,
  isInitialized: false,

  openAuthModal: () => set({ isAuthModalOpen: true }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),

  login: (user) => {
    // Chỉ lưu thông tin user (để render UI) vào cookie thường.
    // Còn Token đã được Backend nhét vào httpOnly cookie tự động.
    Cookies.set('user', JSON.stringify(user), { expires: 7, path: '/' });
    set({ user, isAuthenticated: true });
  },

  logout: () => {
    Cookies.remove('user', { path: '/' });
    set({ user: null, isAuthenticated: false });
  },

  initialize: () => {
    if (typeof window !== 'undefined') {
      const userStr = Cookies.get('user');

      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          set({ user, isAuthenticated: true, isInitialized: true });
        } catch (e) {
          set({ user: null, isAuthenticated: false, isInitialized: true });
        }
      } else {
        set({ isInitialized: true });
      }
    } else {
      set({ isInitialized: true });
    }
  }
}));
