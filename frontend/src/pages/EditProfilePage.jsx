import { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Save, X, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import authApi from "../api/authApi";
import { AuthContext } from "../context/AuthContext";

const getProfileErrorMessage = (error) => {
  if (error.data && typeof error.data === "object") {
    const message = Object.values(error.data)
      .flat()
      .find((value) => typeof value === "string");
    if (message) return message;
  }

  return (
    error.message || "Lỗi trong quá trình cập nhật. Vui lòng kiểm tra lại."
  );
};

export default function EditProfilePage() {
  const navigate = useNavigate();
  const { updateUser } = useContext(AuthContext);

  const [formData, setFormData] = useState({
    username: "",
    full_name: "",
    email: "",
    phone_number: "",
    dob: "",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState({ type: "", message: "" });

  // Tải dữ liệu hiện tại lên Form
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const response = await authApi.getProfile();
        const data = response.data;

        setFormData({
          username: data.username || "",
          full_name: data.full_name || "",
          email: data.email || "",
          phone_number: data.phone_number || "",
          dob: data.dob || "",
        });
      } catch (err) {
        console.error("Error fetching profile:", err);
        setAlert({
          type: "error",
          message: "Không thể tải dữ liệu để chỉnh sửa.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // Xử lý thay đổi dữ liệu các trường Input
  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  // Gửi thông tin thay đổi lên backend qua API PATCH
  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert({ type: "", message: "" });
    setIsSaving(true);

    try {
      const payload = {
        full_name: formData.full_name,
        email: formData.email,
        phone_number: formData.phone_number,
        dob: formData.dob || null,
      };

      // Gọi API PATCH cập nhật hồ sơ
      const response = await authApi.updateProfile(payload);

      updateUser(response.data);

      setAlert({
        type: "success",
        message: "Cập nhật thông tin tài khoản thành công!",
      });

      // Chuyển hướng mượt mà về trang Profile sau 1.5 giây để xem thay đổi
      setTimeout(() => {
        navigate("/profile");
      }, 1500);
    } catch (err) {
      setAlert({ type: "error", message: getProfileErrorMessage(err) });
    } finally {
      setIsSaving(false);
    }
  };

  const avatarText = formData.full_name
    ? formData.full_name.split(" ").pop().charAt(0).toUpperCase()
    : "U";

  return (
    <div className="container px-4 py-8 mx-auto max-w-7xl">
      <div className="flex flex-col gap-8 md:flex-row">
        {/* Sidebar Menu */}
        <div className="w-full shrink-0 md:w-64">
          <div className="flex items-center gap-3 p-4 mb-6 border border-gray-100 shadow-sm bg-white rounded-2xl">
            <div className="flex items-center justify-center w-12 h-12 font-bold text-white bg-gray-900 rounded-full shrink-0">
              {avatarText}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-gray-900 truncate">
                {isLoading ? "Đang tải..." : formData.full_name}
              </h3>
              <p className="text-xs text-gray-500">Chỉnh sửa hồ sơ</p>
            </div>
          </div>

          <nav className="flex flex-col gap-1">
            <Link
              to="/profile"
              className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-amber-600 bg-amber-50 rounded-xl"
            >
              <User className="w-5 h-5" /> Hồ sơ của tôi
            </Link>
          </nav>
        </div>

        {/* Main Content Form */}
        <div className="flex-1">
          <div className="p-6 bg-white border border-gray-100 shadow-sm sm:p-8 rounded-2xl min-h-[400px]">
            <div className="mb-6">
              <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                Cập nhật hồ sơ
              </h1>
              <p className="mt-1 text-xs text-gray-400">
                Thay đổi thông tin tài khoản của bạn
              </p>
            </div>

            {/* Thông báo trạng thái xử lý dữ liệu */}
            {alert.message && (
              <div
                className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-sm ${alert.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
              >
                {alert.type === "success" ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
                <p>{alert.message}</p>
              </div>
            )}

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <Loader2 className="w-8 h-8 mb-4 animate-spin text-amber-500" />
                <p className="text-sm">Đang nạp biểu mẫu chỉnh sửa...</p>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="pt-6 border-t border-gray-100"
              >
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {/* Họ và tên */}
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="full_name"
                      className="text-xs font-bold text-gray-700 uppercase"
                    >
                      Họ và tên
                    </label>
                    <input
                      type="text"
                      id="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      required
                      className="w-full bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
                    />
                  </div>

                  {/* Tên đăng nhập */}
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="username"
                      className="text-xs font-bold text-gray-700 uppercase"
                    >
                      Tên đăng nhập
                    </label>
                    <input
                      type="text"
                      id="username"
                      value={formData.username}
                      disabled
                      className="w-full bg-gray-100 border border-gray-200 px-4 py-2.5 text-gray-500 rounded-lg text-sm cursor-not-allowed"
                    />
                  </div>

                  {/* Email */}
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="email"
                      className="text-xs font-bold text-gray-700 uppercase"
                    >
                      Địa chỉ Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
                    />
                  </div>

                  {/* Số điện thoại */}
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="phone_number"
                      className="text-xs font-bold text-gray-700 uppercase"
                    >
                      Số điện thoại
                    </label>
                    <input
                      type="tel"
                      id="phone_number"
                      value={formData.phone_number}
                      onChange={handleChange}
                      className="w-full bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
                    />
                  </div>

                  {/* Ngày sinh */}
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="dob"
                      className="text-xs font-bold text-gray-700 uppercase"
                    >
                      Ngày sinh
                    </label>
                    <input
                      type="date"
                      id="dob"
                      value={formData.dob}
                      onChange={handleChange}
                      className="w-full bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-6 mt-8 border-t border-gray-100">
                  <Link
                    to="/profile"
                    className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
                  >
                    <X className="w-4 h-4" /> Hủy bỏ
                  </Link>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-2 px-5 py-2.5 text-xs font-black text-gray-900 bg-amber-500 hover:bg-amber-400 rounded-xl transition shadow-md shadow-amber-500/20 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {isSaving ? "Đang lưu..." : "Lưu thông tin"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
