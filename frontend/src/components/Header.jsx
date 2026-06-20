import { Link, NavLink } from "react-router-dom";
import { Search, ShoppingCart, User, Heart, Phone, LogOut, ShieldCheck, Package } from "lucide-react";
import { useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "../context/AuthContext";

export default function Header() {
  // Lấy thông tin trạng thái đăng nhập toàn cục từ AuthContext của hệ thống
  const { user, logout } = useContext(AuthContext);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef(null);

  useEffect(() => {
    const closeAccountMenu = (event) => {
      if (!accountMenuRef.current?.contains(event.target)) {
        setIsAccountMenuOpen(false);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setIsAccountMenuOpen(false);
    };

    document.addEventListener("pointerdown", closeAccountMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeAccountMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <div className="sticky top-0 z-50 w-full tracking-tight bg-white border-b border-gray-100 shadow-sm">
      {/* Top Bar */}
      <div className="hidden py-2 text-xs text-gray-400 bg-gray-900 sm:block">
        <div className="container flex items-center justify-between px-4 mx-auto">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3 text-amber-500" /> Hotline: 123 4567
            </span>
            <span>| Giờ làm việc: 09:00 - 20:30</span>
          </div>
          <div className="flex gap-4">
            <Link
              to="/about"
              className="hover:text-amber-500 transition-colors"
            >
              About Us
            </Link>
            <Link
              to="/contact"
              className="hover:text-amber-500 transition-colors"
            >
              Contact
            </Link>
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
              <Link
                to="/wishlist"
                aria-label="Danh sách yêu thích"
                className="relative p-1 text-gray-700 hover:text-amber-500"
              >
                <Heart className="w-5 h-5" />
              </Link>

              <Link
                to="/cart"
                className="relative p-1 text-gray-700 hover:text-amber-500"
              >
                <ShoppingCart className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  2
                </span>
              </Link>

              {/* Tích hợp đồng nhất trạng thái đăng nhập cùng Dropdown Menu */}
              {user ? (
                <div ref={accountMenuRef} className="relative p-1">
                  <button
                    type="button"
                    onClick={() => setIsAccountMenuOpen((isOpen) => !isOpen)}
                    className="flex items-center gap-2 text-gray-700 transition hover:text-amber-500"
                    aria-haspopup="menu"
                    aria-expanded={isAccountMenuOpen}
                    aria-label="Mở menu tài khoản"
                  >
                    <User className="w-5 h-5" />
                    <div className="flex flex-col items-start hidden sm:flex max-w-[110px]">
                      <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider leading-none">
                        Xin chào
                      </span>
                      <span className="text-xs font-bold text-gray-900 truncate w-full mt-0.5">
                        {user.full_name || user.username}
                      </span>
                    </div>
                  </button>

                  <div
                    className={`absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-lg ${isAccountMenuOpen ? "block" : "hidden"}`}
                    role="menu"
                  >
                    <div className="flex flex-col py-1.5 bg-white border border-gray-100 shadow-xl rounded-xl">
                      <Link
                        to="/profile"
                        onClick={() => setIsAccountMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-amber-50 hover:text-amber-600 transition"
                        role="menuitem"
                      >
                        <User className="w-3.5 h-3.5" /> Hồ sơ của tôi
                      </Link>
                      <Link to="/profile/orders" onClick={() => setIsAccountMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-amber-50 hover:text-amber-600" role="menuitem">
                        <Package className="h-3.5 w-3.5" /> Đơn hàng
                      </Link>
                      <Link to="/profile/security" onClick={() => setIsAccountMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-amber-50 hover:text-amber-600" role="menuitem">
                        <ShieldCheck className="h-3.5 w-3.5" /> Bảo mật
                      </Link>
                      <hr className="my-1 border-gray-100" />
                      <button
                        onClick={() => {
                          setIsAccountMenuOpen(false);
                          logout();
                        }}
                        type="button"
                        className="flex items-center w-full gap-2 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition text-left"
                        role="menuitem"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Đăng xuất
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
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
