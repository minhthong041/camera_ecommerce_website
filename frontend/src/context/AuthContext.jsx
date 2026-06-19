import { createContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authApi from '../api/authApi';

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  });
  
  const [loading] = useState(false);
  const navigate = useNavigate();

  const login = async (identifier, password) => {
    try {
      const response = await authApi.login({ identifier, password });
      
      // Lỗi #1: Lấy thêm refresh token
      const { access, refresh, user: userData } = response.data; 
      
      localStorage.setItem('token', access);
      localStorage.setItem('refresh', refresh); // Lưu refresh token vào máy
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      navigate('/'); 
      return { success: true };
    } catch (error) {
      // Lỗi #3: Đọc đúng cấu trúc error.data từ ApiError (không dùng error.response nữa)
      const errorMsg = error.data?.detail || error.data?.message || 'Đăng nhập thất bại';
      return { success: false, message: errorMsg };
    }
  };

  const register = async (userData) => {
    try {
      await authApi.register(userData);
      navigate('/login'); 
      return { success: true };
    } catch (error) {
      // Lỗi #3: Tương tự như trên
      const errorMsg = error.data?.detail || error.data?.message || 'Đăng ký thất bại';
      return { success: false, message: errorMsg };
    }
  };

  const logout = async () => {
    // Lỗi #2: Gọi backend để blacklist refresh token trước khi xóa ở local
    try {
      const refreshToken = localStorage.getItem('refresh');
      if (refreshToken) {
        await authApi.logout({ refresh: refreshToken });
      }
    } catch (error) {
      console.error("Lỗi khi logout trên server:", error);
    } finally {
      // Dù gọi API thành công hay lỗi mạng thì vẫn phải xóa data ở máy để user thoát ra
      localStorage.removeItem('token');
      localStorage.removeItem('refresh');
      localStorage.removeItem('user');
      setUser(null);
      navigate('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};