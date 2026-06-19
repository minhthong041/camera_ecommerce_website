import { Link, NavLink } from "react-router-dom";
// ĐÃ SỬA: Thêm icon LogOut vào danh sách import
import { Search, ShoppingCart, User, Heart, Phone, LogOut } from "lucide-react";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export default function Header() {
  // ĐÃ SỬA: Lấy thông tin user và hàm logout từ AuthContext
  const { user, logout } = useContext(AuthContext);

  return (
    <div className="sticky top-0 z-50 w-full tracking-tight bg-white border-b border-gray-100 shadow-sm">
      {/* Top Bar */}
      <div className="hidden py-2 text-xs text-gray-400 bg-gray-900 sm:block">
        <div className="container flex items-center justify-between px-4 mx-auto">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3 text-amber-500" /> Hotline: 0999.999.999
            </span>
            <span>| Giờ làm việc: 09:00 - 20:30</span>
          </div>
          <div className="flex gap-4">
            <a href="#" className="transition hover:text-amber-500">
              Hệ thống showroom
            </a>
            <a href="#" className="transition hover:text-amber-500">
              Thu cũ đổi mới
            </a>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="bg-white">
        <div className="container flex items-center justify-between h-20 gap-6 px-4 mx-auto">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="text-2xl font-black tracking-tighter text-gray-900">
              CAMERA<span className="text-amber-500">SHOP</span>
            </div>
          </Link>

          {/* Search Bar */}
          <div className="relative flex-1 hidden max-w-xl md:block">
            <div className="flex w-full">
              <input
                type="text"
                placeholder="Tìm máy ảnh, ống kính, phụ kiện giá tốt..."
                className="w-full bg-gray-50 border border-gray-200 pl-4 pr-12 py-2.5 rounded-l-lg text-sm focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
              />
              <button className="flex items-center justify-center px-5 text-white transition-colors bg-gray-900 rounded-r-lg hover:bg-amber-500 hover:text-gray-900">
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-6">
            <nav className="items-center hidden gap-6 text-sm font-semibold text-gray-700 lg:flex">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  isActive
                    ? "text-amber-500"
                    : "hover:text-amber-500 transition"
                }
              >
                Trang chủ
              </NavLink>
              <NavLink
                to="/products"
                className={({ isActive }) =>
                  isActive
                    ? "text-amber-500"
                    : "hover:text-amber-500 transition"
                }
              >
                Sản phẩm
              </NavLink>
            </nav>

            <div className="flex items-center gap-4 pl-6 border-l border-gray-200">
              <button className="relative p-1 text-gray-700 hover:text-amber-500">
                <Heart className="w-5 h-5" />
              </button>

              <Link
                to="/cart"
                className="relative p-1 text-gray-700 hover:text-amber-500"
              >
                <ShoppingCart className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  2
                </span>
              </Link>

              {/* ĐÃ SỬA: Logic kiểm tra trạng thái đăng nhập */}
              {user ? (
                // Nếu CÓ user (đã đăng nhập) -> Hiện tên và nút Đăng xuất
                <div className="flex items-center gap-3 pl-2 border-l border-gray-200">
                  <div className="flex flex-col items-end hidden sm:flex">
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">
                      Xin chào
                    </span>
                    <span className="text-sm font-bold text-gray-900">
                      {user.full_name || user.username}
                    </span>
                  </div>
                  <button
                    onClick={logout}
                    title="Đăng xuất"
                    className="p-1.5 text-red-500 bg-red-50 rounded-full hover:bg-red-500 hover:text-white transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                // Nếu KHÔNG CÓ user (chưa đăng nhập) -> Hiện icon User như cũ
                <Link
                  to="/login"
                  className="p-1 text-gray-700 hover:text-amber-500"
                >
                  <User className="w-5 h-5" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}
