import { User } from "@/interfaces/editor";
import { create } from "zustand";

// Thêm interface cho credentials đăng nhập
interface LoginCredentials {
  username: string;
  password: string;
}

// Thêm interface cho response của API 
interface AuthResponse {
  access_token?: string;
  token_type?: string;
  error?: string;
}

interface AuthStore {
  user: User | null;
  username: string | null;
  isAuthenticated: boolean;
  accessToken: string | null;
  signOut: () => Promise<void>;
  setUser: (user: User | null) => void;
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  signinWithMagicLink: ({ email }: { email: string }) => Promise<any>;
  signinWithGithub: () => Promise<any>;
}

// Hàm kiểm tra token có hợp lệ không (kiểm tra cơ bản)
const isValidToken = (token: string | null): boolean => {
  return !!token && typeof token === 'string' && token.startsWith('eyJ');
};

// Lấy token từ localStorage và kiểm tra tính hợp lệ
const storedToken = localStorage.getItem('access_token');
const validToken = isValidToken(storedToken) ? storedToken : null;

// Nếu token không hợp lệ, xóa khỏi localStorage
if (storedToken && !validToken) {
  console.log('Token không hợp lệ, xóa khỏi localStorage');
  localStorage.removeItem('access_token');
  localStorage.removeItem('username');
}

const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  username: validToken ? localStorage.getItem('username') : null,
  accessToken: validToken,
  isAuthenticated: !!validToken,
  setUser: (user) => set({ user }),

  // Đăng nhập với API của bạn
  login: async (credentials: LoginCredentials) => {
    try {
      console.log('Đang gửi yêu cầu đăng nhập với:', credentials);
      
      const apiUrl = 'http://localhost:8000/api/v1/auth/login';
      console.log('API URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      console.log('Status code:', response.status);
      console.log('Response headers:', Object.fromEntries([...response.headers]));
      
      if (response.ok) {
        const tokenString = await response.json();
        console.log('Response data (token):', tokenString);

        if (isValidToken(tokenString)) {
          console.log('Đăng nhập thành công, lưu token');
          
          // Lưu token vào localStorage
          localStorage.setItem('access_token', tokenString);
          localStorage.setItem('username', credentials.username);
          
          // Cập nhật state
          set({ 
            accessToken: tokenString,
            isAuthenticated: true,
            username: credentials.username,
            user: { id: '1', email: credentials.username, avatar: '', username: credentials.username, provider: 'github' }
          });

          console.log('Token đã được lưu:', tokenString);
          console.log('Chuyển hướng sau đăng nhập thành công');
          
          // Chuyển hướng sau khi đăng nhập thành công
          window.location.href = '/';
          
          return { access_token: tokenString };
        } else {
          console.error('Token không hợp lệ:', tokenString);
          return { error: 'Token không hợp lệ' };
        }
      } else {
        const errorText = await response.text();
        console.error('Đăng nhập thất bại:', errorText);
        return { error: errorText || 'Đăng nhập thất bại' };
      }
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        return { error: 'Không thể kết nối đến server. Vui lòng kiểm tra:\n1. Server backend có đang chạy không\n2. URL API có chính xác không\n3. CORS đã được cấu hình đúng chưa' };
      }
      return { error: 'Đã xảy ra lỗi không xác định' };
    }
  },

  signinWithGithub: async () => {
    // Giữ phương thức này để tương thích với mã nguồn cũ
    alert('Chức năng đăng nhập qua Github hiện không khả dụng');
    return {};
  },
  
  signinWithMagicLink: async ({ email }: { email: string }) => {
    // Giữ phương thức này để tương thích với mã nguồn cũ
    alert('Chức năng đăng nhập qua Magic Link hiện không khả dụng');
    return {};
  },

  // Đăng xuất
  signOut: async () => {
    try {
      const token = get().accessToken;
      console.log('Đang thực hiện đăng xuất');
      
      if (token) {
        // Gọi API đăng xuất
        console.log('Gửi yêu cầu đăng xuất đến server');
        try {
          const response = await fetch('http://localhost:8000/api/v1/auth/logout', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            credentials: 'include',
          });
          
          if (response.ok) {
            console.log('Đăng xuất thành công trên server');
          } else {
            console.warn('Đăng xuất trên server không thành công:', response.status);
          }
        } catch (apiError) {
          console.warn('Lỗi khi gọi API đăng xuất:', apiError);
          // Tiếp tục đăng xuất cục bộ ngay cả khi API thất bại
        }
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Xóa token và username, reset trạng thái đăng nhập
      console.log('Xóa thông tin đăng nhập khỏi localStorage');
      
      // Xóa tất cả các thông tin liên quan đến phiên đăng nhập
      localStorage.removeItem('access_token');
      localStorage.removeItem('username');
      localStorage.removeItem('selectedVideoId');
      localStorage.removeItem('mostRecentVideoId');
      
      // Reset state
      set({ 
        user: null, 
        isAuthenticated: false, 
        accessToken: null, 
        username: null 
      });
      
      // Reload trang sau khi đăng xuất
      console.log('Chuyển hướng sau đăng xuất');
      window.location.href = '/';
    }
  },
}));

export default useAuthStore;