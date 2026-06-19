import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import catalogApi from '../api/catalogApi';
import { ShieldCheck, Truck, RefreshCw, Minus, Plus, ShoppingCart, ChevronRight, Home } from 'lucide-react';

export default function ProductDetailPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    setLoading(true);
    catalogApi.getProduct(id)
      .then((data) => {
        setProduct(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Không thể lấy thông tin chi tiết sản phẩm.');
        setLoading(false);
      });
  }, [id]);

  const formatVND = (price) => {
    if (!price) return '0 ₫';
    return price.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
  };

  const handleQuantityChange = (type) => {
    if (type === 'decrease' && quantity > 1) {
      setQuantity(quantity - 1);
    } else if (type === 'increase') {
      setQuantity(quantity + 1);
    }
  };

  if (loading) return <div className="text-center py-32 text-sm text-gray-500">Đang tải chi tiết cấu hình sản phẩm...</div>;
  if (error) return <div className="text-center py-32 text-red-500 font-bold text-sm">Lỗi: {error}</div>;
  if (!product) return <div className="text-center py-32 text-gray-400 text-sm">Sản phẩm không tồn tại.</div>;

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Breadcrumb điều hướng */}
      <nav className="flex items-center gap-2 text-xs text-gray-500 mb-6 bg-white px-4 py-2.5 rounded-lg border border-gray-100 shadow-sm">
        <Link to="/" className="hover:text-amber-500 flex items-center gap-1">
          <Home className="w-3.5 h-3.5" /> Trang chủ
        </Link>
        <ChevronRight className="w-3 h-3 text-gray-300" />
        <Link to="/products" className="hover:text-amber-500">Sản phẩm</Link>
        <ChevronRight className="w-3 h-3 text-gray-300" />
        <span className="text-gray-800 font-medium truncate max-w-[200px] sm:max-w-xs">{product.name}</span>
      </nav>

      {/* Khối thông tin chính của Sản phẩm */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-white p-4 sm:p-8 rounded-2xl border border-gray-100 shadow-sm">
        
        {/* Khối Ảnh Bên Trái (Cột 5/12) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="relative aspect-square rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center p-4 group overflow-hidden">
            {product.discount > 0 && (
              <span className="absolute top-4 left-4 bg-red-500 text-white text-xs font-black px-2.5 py-1 rounded-md z-10">
                GIẢM {product.discount}%
              </span>
            )}
            <img
              src={product.image}
              alt={product.name}
              className="object-contain w-full h-full transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        </div>

        {/* Khối Chi Tiết Giá & Mua Hàng Bên Phải (Cột 7/12) */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div>
            <span className="text-xs bg-amber-500/10 text-amber-600 font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
              {product.brand || 'Chính hãng'}
            </span>
            
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 mt-3 leading-snug">
              {product.name}
            </h1>

            <div className="flex items-center gap-4 mt-3 text-xs border-b border-gray-100 pb-4">
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400">Tình trạng:</span>
                <span className={`font-bold ${product.status === 'Còn hàng' ? 'text-green-600' : 'text-amber-600'}`}>
                  {product.status || 'Còn hàng'}
                </span>
              </div>
              <div className="w-px h-3 bg-gray-200"></div>
              <div>
                <span className="text-gray-400">Mã sản phẩm:</span>
                <span className="text-gray-700 font-mono ml-1">#PROD-{product.id}</span>
              </div>
            </div>

            {/* Vùng hiển thị giá tiền */}
            <div className="bg-gray-50 p-4 rounded-xl mt-4 flex items-baseline flex-wrap gap-3">
              <span className="text-red-500 font-black text-2xl sm:text-3xl">
                {formatVND(product.price)}
              </span>
              {product.oldPrice && (
                <span className="text-sm text-gray-400 line-through">
                  {formatVND(product.oldPrice)}
                </span>
              )}
            </div>

            {/* Mô tả tóm tắt ngắn gọn */}
            <div className="mt-5">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Mô tả sản phẩm</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {product.description || 'Thiết bị công nghệ cao cấp chính hãng, sở hữu cấu hình mạnh mẽ cùng các tính năng tối ưu giúp đáp ứng toàn diện nhu cầu trải nghiệm quay chụp và sáng tạo nội dung chuyên nghiệp.'}
              </p>
            </div>
          </div>

          {/* Vùng Tương tác: Số lượng & Nút Thêm vào giỏ */}
          <div className="mt-8 pt-6 border-t border-gray-100 space-y-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-bold text-gray-700">Số lượng:</span>
              <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50">
                <button
                  onClick={() => handleQuantityChange('decrease')}
                  className="p-2 hover:bg-gray-200 text-gray-600 transition-colors rounded-l-lg"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-12 text-center text-sm font-bold text-gray-800">
                  {quantity}
                </span>
                <button
                  onClick={() => handleQuantityChange('increase')}
                  className="p-2 hover:bg-gray-200 text-gray-600 transition-colors rounded-r-lg"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button className="flex-1 bg-gray-900 text-white font-bold py-3.5 px-6 rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-amber-500 transition-all shadow-md shadow-gray-900/10">
                <ShoppingCart className="w-4 h-4" /> Thêm vào giỏ hàng
              </button>
              <button className="flex-1 bg-amber-500 text-white font-bold py-3.5 px-6 rounded-xl text-sm hover:bg-amber-600 transition-all shadow-md shadow-amber-500/10">
                Mua ngay lập tức
              </button>
            </div>
          </div>

          {/* Cam kết cửa hàng tiện ích dưới nút mua */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-gray-100 text-[11px] text-gray-500">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Bảo hành 12 tháng chính hãng</span>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-500 shrink-0" />
              <span>Giao hàng hỏa tốc toàn quốc</span>
            </div>
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Đổi trả miễn phí trong 7 ngày</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}