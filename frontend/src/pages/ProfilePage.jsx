import { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { User, MapPin, Phone, Mail, Edit, Loader2, AlertCircle } from 'lucide-react';
import addressApi from "../api/addressApi";
import authApi from "../api/authApi";
import { AuthContext } from "../context/AuthContext";

const formatAddress = (address) => {
  if (!address) return "Chưa cập nhật";

  return [
    address.address_line1,
    address.address_line2,
    address.ward?.name,
    address.ward?.district?.name,
    address.ward?.district?.city?.name,
    address.ward?.district?.city?.province?.name,
    address.ward?.district?.city?.province?.country?.name,
    address.postal_code,
  ]
    .filter(Boolean)
    .join(", ");
};

export default function ProfilePage() {
  const { updateUser } = useContext(AuthContext);
  const [user, setUser] = useState(null);
  const [defaultAddress, setDefaultAddress] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [profileResponse, addressResponse] = await Promise.all([
          authApi.getProfile(),
          addressApi.getAddresses().catch(() => ({ data: [] })),
        ]);
        const data = profileResponse.data;
        const rawAddressData = addressResponse.data;
        const addresses = Array.isArray(rawAddressData)
          ? rawAddressData
          : rawAddressData?.results ?? [];

        setUser(data);
        setDefaultAddress(
          addresses.find((address) => address.is_default) ?? addresses[0] ?? null,
        );
        updateUser(data);
      } catch (err) {
        setError(err.message || 'Không thể tải thông tin hồ sơ cá nhân.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [updateUser]);

  // Lấy chữ cái cuối cùng của tên làm kí tự Avatar đại diện
  const avatarText = user?.full_name
    ? user.full_name.split(' ').pop().charAt(0).toUpperCase()
    : (user?.username ? user.username.charAt(0).toUpperCase() : 'U');

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
                {isLoading ? 'Đang tải...' : (user?.full_name || user?.username || 'Khách hàng')}
              </h3>
              <p className="text-xs text-gray-500">Thành viên chính thức</p>
            </div>
          </div>

          <nav className="flex flex-col gap-1">
            <Link to="/profile" className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-amber-600 bg-amber-50 rounded-xl">
              <User className="w-5 h-5" /> Hồ sơ của tôi
            </Link>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <div className="p-6 bg-white border border-gray-100 shadow-sm sm:p-8 rounded-2xl min-h-[400px]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
              <div>
                <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight">Hồ sơ cá nhân</h1>
                <p className="mt-1 text-xs text-gray-400">Quản lý thông tin tài khoản cá nhân cá nhân</p>
              </div>
              {!isLoading && !error && (
                <Link to="/profile/edit" className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold transition bg-gray-900 rounded-xl text-white hover:bg-amber-500 hover:text-gray-900 shadow-md">
                  <Edit className="w-4 h-4" /> Chỉnh sửa hồ sơ
                </Link>
              )}
            </div>

            {/* Loading UI State */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <Loader2 className="w-8 h-8 mb-4 animate-spin text-amber-500" />
                <p className="text-sm">Đang tải thông tin cá nhân...</p>
              </div>
            )}

            {/* Error UI State */}
            {!isLoading && error && (
              <div className="flex items-center gap-3 p-4 text-sm text-red-600 bg-red-50 rounded-xl">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {/* Profile Info Grid */}
            {!isLoading && !error && user && (
              <div className="py-6 border-t border-gray-100">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">

                  {/* Họ và tên */}
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-xl bg-gray-50 text-gray-500 shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Họ và tên</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900">{user.full_name || 'Chưa cập nhật'}</p>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-xl bg-gray-50 text-gray-500 shrink-0">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Địa chỉ Email</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900">{user.email || 'Chưa cập nhật'}</p>
                    </div>
                  </div>

                  {/* Số điện thoại */}
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-xl bg-gray-50 text-gray-500 shrink-0">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Số điện thoại</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900">{user.phone_number || 'Chưa cập nhật'}</p>
                    </div>
                  </div>

                  {/* Địa chỉ mặc định */}
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-xl bg-gray-50 text-gray-500 shrink-0">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Địa chỉ mặc định</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900 leading-relaxed">
                        {formatAddress(defaultAddress)}
                      </p>
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
