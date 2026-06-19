import { createContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import authApi from "../api/authApi";

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const userData = localStorage.getItem("user");
    return userData ? JSON.parse(userData) : null;
  });

  const [loading] = useState(false);
  const navigate = useNavigate();

  const login = async (identifier, password) => {
    try {
      const response = await authApi.login({ identifier, password });

      // Lỗi #1: Lấy thêm refresh token
      const { access, refresh, user: userData } = response.data;

      localStorage.setItem("token", access);
      localStorage.setItem("refresh", refresh); // Lưu refresh token vào máy
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);
      navigate("/");
      return { success: true };
    } catch (error) {
      // Lỗi #3: Đọc đúng cấu trúc error.data từ ApiError (không dùng error.response nữa)
      const errorMsg =
        error.data?.detail || error.data?.message || "Đăng nhập thất bại";
      return { success: false, message: errorMsg };
    }
  };

  const register = async (userData) => {
    try {
      await authApi.register(userData);
      navigate("/login");
      return { success: true };
    } catch (error) {
      const errData = error.data;
      let errorMsg = "Đăng ký thất bại";

      if (errData) {
        if (errData.detail) {
          errorMsg = errData.detail;
        } else if (errData.message) {
          errorMsg = errData.message;
        } else if (typeof errData === "object") {
          // Bóc tách lỗi của từng field từ Backend trả về
          const messages = [];
          for (const key in errData) {
            if (Array.isArray(errData[key])) {
              // Lấy lỗi đầu tiên của mảng (vd: errData['email'][0])
              messages.push(`${key}: ${errData[key][0]}`);
            } else if (typeof errData[key] === "string") {
              messages.push(`${key}: ${errData[key]}`);
            }
          }
          if (messages.length > 0) {
            errorMsg = messages.join(" | "); // Nối các lỗi lại bằng dấu |
          }
        }
      }
      return { success: false, message: errorMsg };
    }
  };

  const logout = async () => {
    // Lỗi #2: Gọi backend để blacklist refresh token trước khi xóa ở local
    try {
      const refreshToken = localStorage.getItem("refresh");
      if (refreshToken) {
        await authApi.logout({ refresh: refreshToken });
      }
    } catch (error) {
      console.error("Lỗi khi logout trên server:", error);
    } finally {
      // Dù gọi API thành công hay lỗi mạng thì vẫn phải xóa data ở máy để user thoát ra
      localStorage.removeItem("token");
      localStorage.removeItem("refresh");
      localStorage.removeItem("user");
      setUser(null);
      navigate("/login");
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
