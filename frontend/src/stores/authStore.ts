import { create } from 'zustand';
import Cookies from 'js-cookie';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  avatarUrl?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  login: (user, token) => {
    // Lưu vào Cookie (hỗ trợ cho Server Components lấy được token)
    Cookies.set('token', token, { expires: 7, path: '/' });
    Cookies.set('user', JSON.stringify(user), { expires: 7, path: '/' });

    // Lưu vào localStorage dự phòng
    // if (typeof window !== 'undefined') {
    //   localStorage.setItem('token', token);
    //   localStorage.setItem('user', JSON.stringify(user));
    // }

    // Dùng client cookie thay vì local storage để tránh tình trạng
    // lần đầu tải web thì ko đọc dc token từ local storage từ window
    // vì trên server nextjs làm gì có window nên đâu đọc dc token
    // và khi client nhận html thì hydration chạy js trên trình duyệt
    // xong mới hiện thông tin ra nên màn hình bị chớp, còn cookie thì ko bị
    // do browser tự động gửi cookie chứa token lên lúc còn render phía server
    // (nó render 2 lần 1 lần ở server 1 lần ở browser)

    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    Cookies.remove('token', { path: '/' });
    Cookies.remove('user', { path: '/' });
    // if (typeof window !== 'undefined') {
    //   localStorage.removeItem('token');
    //   localStorage.removeItem('user');
    // }
    set({ user: null, token: null, isAuthenticated: false });
  },

  initialize: () => {
    if (typeof window !== 'undefined') {
      // Ưu tiên đọc từ Cookie trước
      // const token = Cookies.get('token') || localStorage.getItem('token');
      // const userStr = Cookies.get('user') || localStorage.getItem('user');
      const token = Cookies.get('token');
      const userStr = Cookies.get('user');

      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
          set({ user, token, isAuthenticated: true });
        } catch (e) {
          set({ user: null, token: null, isAuthenticated: false });
        }
      }
    }
  }
}));
