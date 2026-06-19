import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Trash2, ArrowLeft } from 'lucide-react';
import wishlistApi from '../api/wishlistApi';
import ProductCard from '../components/ProductCard';

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

  // Hàm fetch danh sách yêu thích từ API thật
  const fetchWishlist = () => {
    wishlistApi.getWishlist()
      .then((res) => {
        // Hỗ trợ nếu API trả trực tiếp mảng hoặc bọc trong thuộc tính data
        const data = res.data || res;
        setWishlist(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Lỗi lấy danh sách yêu thích:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchWishlist();

    // Lắng nghe sự kiện click tim thay đổi từ các page khác để sync trực tiếp
    window.addEventListener('wishlistUpdated', fetchWishlist);
    return () => window.removeEventListener('wishlistUpdated', fetchWishlist);
  }, []);

  const clearAllWishlist = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ danh sách yêu thích không?')) {
      localStorage.setItem('wishlist_local', JSON.stringify([]));
      setWishlist([]);
      window.dispatchEvent(new Event('wishlistUpdated'));
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-sm text-gray-500">Đang tải danh sách yêu thích...</div>;
  }

  // --- 2. EMPTY STATE ---
  if (wishlist.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-7xl text-center">
        <div className="flex flex-col items-center justify-center max-w-md mx-auto bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 mb-4 animate-bounce">
            <Heart className="w-8 h-8" strokeWidth={1.5} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Danh sách yêu thích trống</h2>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            Hãy thả tim những chiếc máy ảnh, ống kính siêu xịn mà bạn thích để lưu trữ và tìm kiếm dễ dàng hơn nhé!
          </p>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 hover:bg-amber-500 text-white hover:text-gray-900 font-semibold rounded-xl text-sm transition-all shadow-md hover:shadow-lg"
          >
            <ArrowLeft className="w-4 h-4" /> Khám phá sản phẩm ngay
          </Link>
        </div>
      </div>
    );
  }

  // --- 3. GIAO DIỆN CHÍNH ---
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-black text-xl text-gray-900 uppercase m-0 tracking-tight flex items-center gap-2">
            <Heart className="w-6 h-6 text-red-500 fill-red-500" /> Sản phẩm yêu thích của bạn
          </h1>
          <p className="text-xs text-gray-400 mt-1">Đang kết nối dữ liệu máy ảnh ({wishlist.length})</p>
        </div>
        
        <button
          onClick={clearAllWishlist}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors self-start sm:self-auto"
        >
          <Trash2 className="w-4 h-4" /> Xóa tất cả
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {wishlist.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}