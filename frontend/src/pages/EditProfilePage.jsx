import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Package, Shield, Save, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import authApi from "../api/authApi";

export default function EditProfilePage() {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    gender: 'male',
    address: ''
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });

  // Tải dữ liệu hiện tại lên Form
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const response = await authApi.getProfile();
        const data = response.data;
        
        setFormData({
          full_name: data.full_name || '',
          email: data.email || '',
          phone: data.phone || '',
          gender: data.gender || 'male',
          address: data.address || ''
        });
      } catch (err) {
        console.error("Error fetching profile:", err);
        setAlert({ type: 'error', message: 'Không thể tải dữ liệu để chỉnh sửa.' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // Xử lý thay đổi dữ liệu các trường Input
  const handleChange = (e) => {
    const { id, name, value, type } = e.target;
    if (type === 'radio') {
      setFormData((prev) => ({ ...prev, [name]: value }));
    } else {
      setFormData((prev) => ({ ...prev, [id]: value }));
    }
  };

  // Gửi thông tin thay đổi lên backend qua API PATCH
  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert({ type: '', message: '' });
    setIsSaving(true);

    try {
      const payload = {
        full_name: formData.full_name,
        phone: formData.phone,
        gender: formData.gender,
        address: formData.address
      };

      // Gọi API PATCH có sẵn của bạn
      const response = await authApi.updateProfile(payload);
      
      // Ghi đè cập nhật lại thông tin mới vào localStorage để đồng bộ nhanh
      localStorage.setItem('user', JSON.stringify(response.data || formData));

      setAlert({ type: 'success', message: 'Cập nhật thông tin tài khoản thành công!' });
      
      // Chuyển hướng mượt mà về trang Profile sau 1.5 giây để xem thay đổi
      setTimeout(() => {
        navigate('/profile');
      }, 1500);

    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Lỗi trong quá trình cập nhật. Vui lòng kiểm tra lại.' });
    } finally {
      setIsSaving(false);
    }
  };

  const avatarText = formData.full_name 
    ? formData.full_name.split(' ').pop().charAt(0).toUpperCase() 
    : 'U';

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
                {isLoading ? 'Đang tải...' : formData.full_name}
              </h3>
              <p className="text-xs text-gray-500">Chỉnh sửa hồ sơ</p>
            </div>
          </div>
          
          <nav className="flex flex-col gap-1">
            <Link to="/profile" className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-amber-600 bg-amber-50 rounded-xl">
              <User className="w-5 h-5" /> Hồ sơ của tôi
            </Link>
            <Link to="/profile" className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 hover:text-gray-900 rounded-xl">
              <Package className="w-5 h-5" /> Đơn hàng của tôi
            </Link>
            <Link to="/profile" className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 hover:text-gray-900 rounded-xl">
              <Shield className="w-5 h-5" /> Bảo mật & Mật khẩu
            </Link>
          </nav>
        </div>

        {/* Main Content Form */}
        <div className="flex-1">
          <div className="p-6 bg-white border border-gray-100 shadow-sm sm:p-8 rounded-2xl min-h-[400px]">
            <div className="mb-6">
              <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight">Cập nhật hồ sơ</h1>
              <p className="mt-1 text-xs text-gray-400">Thay đổi thông tin tài khoản của bạn</p>
            </div>

            {/* Thông báo trạng thái xử lý dữ liệu */}
            {alert.message && (
              <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-sm ${alert.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {alert.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                <p>{alert.message}</p>
              </div>
            )}

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <Loader2 className="w-8 h-8 mb-4 animate-spin text-amber-500" />
                <p className="text-sm">Đang nạp biểu mẫu chỉnh sửa...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="pt-6 border-t border-gray-100">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  
                  {/* Họ và tên */}
                  <div className="flex flex-col gap-2">
                    <label htmlFor="full_name" className="text-xs font-bold text-gray-700 uppercase">Họ và tên</label>
                    <input 
                      type="text" 
                      id="full_name" 
                      value={formData.full_name}
                      onChange={handleChange}
                      required
                      className="w-full bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
                    />
                  </div>

                  {/* Email (Bị khóa mặc định vì không cho sửa đổi trực tiếp) */}
                  <div className="flex flex-col gap-2">
                    <label htmlFor="email" className="text-xs font-bold text-gray-400 uppercase">Địa chỉ Email</label>
                    <input 
                      type="email" 
                      id="email" 
                      value={formData.email}
                      disabled
                      className="w-full bg-gray-100 border border-gray-200 px-4 py-2.5 text-gray-400 rounded-lg text-sm cursor-not-allowed"
                    />
                  </div>

                  {/* Số điện thoại */}
                  <div className="flex flex-col gap-2">
                    <label htmlFor="phone" className="text-xs font-bold text-gray-700 uppercase">Số điện thoại</label>
                    <input 
                      type="tel" 
                      id="phone" 
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
                    />
                  </div>

                  {/* Giới tính */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-gray-700 uppercase">Giới tính</label>
                    <div className="flex items-center gap-6 h-full mt-1">
                      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input type="radio" name="gender" value="male" checked={formData.gender === 'male' || formData.gender === 'Nam'} onChange={handleChange} className="w-4 h-4 text-amber-500 focus:ring-amber-500" /> Nam
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input type="radio" name="gender" value="female" checked={formData.gender === 'female' || formData.gender === 'Nữ'} onChange={handleChange} className="w-4 h-4 text-amber-500 focus:ring-amber-500" /> Nữ
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input type="radio" name="gender" value="other" checked={formData.gender === 'other' || formData.gender === 'Khác'} onChange={handleChange} className="w-4 h-4 text-amber-500 focus:ring-amber-500" /> Khác
                      </label>
                    </div>
                  </div>

                  {/* Địa chỉ mặc định */}
                  <div className="flex flex-col gap-2 md:col-span-2">
                    <label htmlFor="address" className="text-xs font-bold text-gray-700 uppercase">Địa chỉ mặc định</label>
                    <input 
                      type="text" 
                      id="address" 
                      value={formData.address}
                      onChange={handleChange}
                      className="w-full bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
                    />
                  </div>

                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-6 mt-8 border-t border-gray-100">
                  <Link to="/profile" className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition">
                    <X className="w-4 h-4" /> Hủy bỏ
                  </Link>
                  <button 
                    type="submit" 
                    disabled={isSaving}
                    className="flex items-center gap-2 px-5 py-2.5 text-xs font-black text-gray-900 bg-amber-500 hover:bg-amber-400 rounded-xl transition shadow-md shadow-amber-500/20 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {isSaving ? 'Đang lưu...' : 'Lưu thông tin'}
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