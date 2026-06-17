import { Link, NavLink } from 'react-router-dom';
import { Search, ShoppingCart, User, Heart, Phone } from 'lucide-react';

export default function Header() {
  return (
    <div className="w-full bg-white tracking-tight sticky top-0 z-50 shadow-sm border-b border-gray-100">
      {/* Top Bar */}
      <div className="bg-gray-900 text-gray-400 text-xs py-2 hidden sm:block">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3 text-amber-500" /> Hotline: 0999.999.999
            </span>
            <span>| Giờ làm việc: 09:00 - 20:30</span>
          </div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-amber-500 transition">Hệ thống showroom</a>
            <a href="#" className="hover:text-amber-500 transition">Thu cũ đổi mới</a>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="bg-white">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between gap-6">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="font-black text-2xl tracking-tighter text-gray-900">
              CAMERA<span className="text-amber-500">SHOP</span>
            </div>
          </Link>

          {/* Search Bar */}
          <div className="flex-1 max-w-xl relative hidden md:block">
            <div className="w-full flex">
              <input
                type="text"
                placeholder="Tìm máy ảnh, ống kính, phụ kiện giá tốt..."
                className="w-full bg-gray-50 border border-gray-200 pl-4 pr-12 py-2.5 rounded-l-lg text-sm focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
              />
              <button className="bg-gray-900 hover:bg-amber-500 text-white hover:text-gray-900 px-5 rounded-r-lg transition-colors flex items-center justify-center">
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-6">
            <nav className="hidden lg:flex items-center gap-6 text-sm font-semibold text-gray-700">
              <NavLink to="/" className={({isActive}) => isActive ? "text-amber-500" : "hover:text-amber-500 transition"}>Trang chủ</NavLink>
              <NavLink to="/products" className={({isActive}) => isActive ? "text-amber-500" : "hover:text-amber-500 transition"}>Sản phẩm</NavLink>
            </nav>

            <div className="flex items-center gap-4 border-l pl-6 border-gray-200">
              <button className="text-gray-700 hover:text-amber-500 relative p-1">
                <Heart className="w-5 h-5" />
              </button>
              
              <button className="text-gray-700 hover:text-amber-500 relative p-1">
                <ShoppingCart className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  2
                </span>
              </button>

              <button className="text-gray-700 hover:text-amber-500 p-1">
                <User className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}