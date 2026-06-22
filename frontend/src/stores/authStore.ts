import { create } from 'zustand';
import Cookies from 'js-cookie';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  phone?: string;
  avatarUrl?: string;
  hasPassword?: boolean; // false nếu đăng nhập bằng Google OAuth
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
  // Cập nhật một phần thông tin user mà không cần re-login
  updateUser: (partial: Partial<User>) => void;
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
    Cookies.set('user', JSON.stringify(user), { expires: 7, path: '/' });
    set({ user, isAuthenticated: true });
  },

  // Merge partial update vào state + đồng bộ lại cookie
  updateUser: (partial) => {
    const current = useAuthStore.getState().user;
    if (!current) return;
    const updated = { ...current, ...partial };
    Cookies.set('user', JSON.stringify(updated), { expires: 7, path: '/' });
    set({ user: updated });
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
