import { createContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authApi from '../api/authApi';

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Tối ưu hóa: Đọc localStorage ngay lúc khởi tạo state, bỏ hẳn useEffect
  const [user, setUser] = useState(() => {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  });
  
  const [loading] = useState(false); // Không cần loading nữa vì đọc localStorage là đồng bộ
  const navigate = useNavigate();

  const login = async (email, password) => {
    try {
      const response = await authApi.login({ email, password });
      const { access, user: userData } = response.data; 
      
      localStorage.setItem('token', access);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      navigate('/'); 
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Đăng nhập thất bại' };
    }
  };

  const register = async (userData) => {
    try {
      await authApi.register(userData);
      navigate('/login'); 
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Đăng ký thất bại' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};