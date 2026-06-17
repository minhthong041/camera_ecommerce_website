export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 pt-16 pb-8 text-sm border-t border-gray-950">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pb-12 border-b border-gray-800">
          <div>
            <h3 className="text-white font-black text-xl mb-4 tracking-tight">CAMERA<span className="text-amber-500">SHOP</span></h3>
            <p className="text-gray-400 leading-relaxed mb-4">
              Hệ thống sửa chữa, thu mua và bán lẻ máy ảnh, ống kính, thiết bị làm phim, phụ kiện công nghệ đỉnh cao hàng đầu.
            </p>
            <div className="text-xs text-gray-500 space-y-1">
              <p>📍 Địa chỉ: 97, Man Thiện, Thủ Đức, TP.HCM</p>
            </div>
          </div>

          <div>
            <h4 className="text-white font-bold uppercase tracking-wider mb-4 text-xs">Chính sách</h4>
            <ul className="space-y-2.5">
              <li><a href="#" className="hover:text-amber-500 transition">Chính sách bảo hành đổi trả</a></li>
              <li><a href="#" className="hover:text-amber-500 transition">Chính sách vận chuyển giao hàng</a></li>
              <li><a href="#" className="hover:text-amber-500 transition">Chính sách bảo mật thông tin</a></li>
              <li><a href="#" className="hover:text-amber-500 transition">Hướng dẫn mua hàng trả góp</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold uppercase tracking-wider mb-4 text-xs">Tổng đài hỗ trợ</h4>
            <div className="space-y-3">
              <div>
                <span className="block text-xs text-gray-500">Tư vấn mua hàng</span>
                <span className="text-white font-bold text-base hover:text-amber-500 cursor-pointer">0999.999.999</span>
              </div>
              <div>
                <span className="block text-xs text-gray-500">Hỗ trợ kỹ thuật</span>
                <span className="text-white font-bold text-base hover:text-amber-500 cursor-pointer">0999.999.999</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-white font-bold uppercase tracking-wider mb-4 text-xs">Thanh toán</h4>
            <p className="mb-3 text-xs text-gray-500">Chấp nhận hầu hết các hình thức thanh toán:</p>
            <div className="grid grid-cols-4 gap-2 opacity-70">
              {['Visa', 'Master', 'Momo', 'Banking'].map((pay, i) => (
                <div key={i} className="bg-gray-800 text-white text-[10px] py-2 rounded text-center font-medium border border-gray-700">
                  {pay}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-6 text-center text-xs text-gray-600 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© {new Date().getFullYear()} PTIT. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:underline">Điều khoản dịch vụ</a>
            <a href="#" className="hover:underline">Bảo mật</a>
          </div>
        </div>
      </div>
    </footer>
  );
}