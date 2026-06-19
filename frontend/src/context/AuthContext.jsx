import { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// Thay thế import axiosClient bằng authApi
import authApi from '../api/authApi'; 

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      // SỬ DỤNG AUTHApi Ở ĐÂY
      const response = await authApi.login({ email, password });
      
      const { token, user: userData } = response.data; 
      localStorage.setItem('token', token);
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
      // SỬ DỤNG AUTHApi Ở ĐÂY
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