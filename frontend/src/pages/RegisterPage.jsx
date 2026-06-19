import { useState, useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const RegisterPage = () => {
  // Quản lý toàn bộ thông tin form trong một Object state
  const [formData, setFormData] = useState({
    username: "",
    full_name: "",
    email: "",
    phone_number: "",
    dob: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useContext(AuthContext);

  // Hàm cập nhật data khi người dùng gõ vào các ô input
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Kiểm tra mật khẩu khớp nhau ở phía Frontend trước
    if (formData.password !== formData.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp!");
      return;
    }

    setIsLoading(true);

    // Tách trường confirmPassword ra, chỉ gửi các trường database yêu cầu lên backend
    const { confirmPassword, ...registerData } = formData;

    const result = await register(registerData);
    if (!result.success) {
      setError(result.message);
    }
    setIsLoading(false);
  };

  return (
    <div className="flex items-center justify-center py-16 bg-gray-50">
      <div className="w-full max-w-xl p-8 bg-white rounded-lg shadow-md">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-slate-800">Tạo tài khoản</h2>
          <p className="mt-2 text-sm text-gray-500">
            Đăng ký để nhận nhiều ưu đãi từ CameraShop
          </p>
        </div>

        {error && (
          <div className="p-3 mb-4 text-sm text-red-600 bg-red-100 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tên đăng nhập */}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Tên đăng nhập (Username)
            </label>
            <input
              type="text"
              name="username"
              required
              value={formData.username}
              onChange={handleChange}
              className="w-full px-4 py-2 mt-1 border rounded-md focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          {/* Họ và tên */}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Họ và tên
            </label>
            <input
              type="text"
              name="full_name"
              required
              value={formData.full_name}
              onChange={handleChange}
              className="w-full px-4 py-2 mt-1 border rounded-md focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          {/* Email và Số điện thoại */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 mt-1 border rounded-md focus:ring-orange-500 focus:border-orange-500"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Số điện thoại
              </label>
              <input
                type="tel"
                name="phone_number"
                required
                value={formData.phone_number}
                onChange={handleChange}
                className="w-full px-4 py-2 mt-1 border rounded-md focus:ring-orange-500 focus:border-orange-500"
                placeholder="84+"
              />
            </div>
          </div>

          {/* Ngày sinh */}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Ngày sinh
            </label>
            <input
              type="date"
              name="dob"
              required
              value={formData.dob}
              onChange={handleChange}
              className="w-full px-4 py-2 mt-1 border rounded-md focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          {/* Mật khẩu và Xác nhận mật khẩu */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Mật khẩu
              </label>
              <input
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-2 mt-1 border rounded-md focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Xác nhận mật khẩu
              </label>
              <input
                type="password"
                name="confirmPassword"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-2 mt-1 border rounded-md focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-2 mt-6 font-semibold text-white transition duration-200 rounded-md bg-slate-800 hover:bg-slate-900 disabled:bg-gray-400"
          >
            {isLoading ? "Đang xử lý..." : "Đăng ký tài khoản"}
          </button>
        </form>

        <p className="mt-6 text-sm text-center text-gray-600">
          Đã có tài khoản?{" "}
          <Link to="/login" className="font-medium text-orange-600">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
