import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { catalogApi } from '../api/catalogApi';
import apiClient from '../api/client';
import { ShieldCheck, Truck, RefreshCw, Minus, Plus, ShoppingCart, ChevronRight, Home } from 'lucide-react';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);

  // Quản lý biến thể được chọn từ trường dữ liệu API thật
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);
  const [cartAction, setCartAction] = useState(null);
  const [cartMessage, setCartMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    catalogApi.getProduct(id)
      .then((data) => {
        if (isMounted) {
          setProduct(data);
          const productItems = data.product_items || data.items || [];
          const firstAvailableIndex = productItems.findIndex(
            (item) => Number(item.qty_in_stock) > 0,
          );
          setSelectedItemIndex(firstAvailableIndex >= 0 ? firstAvailableIndex : 0);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Không thể lấy thông tin chi tiết sản phẩm.');
          setLoading(false);
        }
      });

    // Hàm dọn dẹp (Cleanup Function): Chạy an toàn khi ID thay đổi để reset lại UI về trạng thái loading sạch
    return () => {
      isMounted = false;
      setLoading(true);
      setProduct(null);
      setError(null);
      setSelectedItemIndex(0);
      setQuantity(1);
      setCartAction(null);
      setCartMessage('');
    };
  }, [id]);

  const formatVND = (price) => {
    if (price === undefined || price === null) return 'Liên hệ';
    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice)) return 'Liên hệ';
    return numericPrice.toLocaleString('vi-VN', {
      style: 'currency',
      currency: 'VND',
    });
  };

  const handleQuantityChange = (type, maxStock) => {
    if (type === 'decrease' && quantity > 1) {
      setQuantity((currentQuantity) => currentQuantity - 1);
    } else if (type === 'increase' && quantity < maxStock) {
      setQuantity((currentQuantity) => currentQuantity + 1);
    }
  };

  if (loading) return <div className="text-center py-32 text-sm text-gray-500">Đang tải cấu hình sản phẩm thực tế...</div>;
  if (error) return <div className="text-center py-32 text-red-500 font-bold text-sm">Lỗi: {error}</div>;
  if (!product) return <div className="text-center py-32 text-gray-400 text-sm">Sản phẩm không tồn tại.</div>;

  // Trích xuất dữ liệu thật từ các cấu trúc mảng Backend trả về
  const items = product.product_items || product.items || [];
  const currentItem = items[selectedItemIndex] || {};

  const currentPrice = currentItem.price || product.price;
  const currentOldPrice = currentItem.old_price || product.oldPrice;
  const currentImage = currentItem.product_image || product.image;
  const currentStock = Number(currentItem.qty_in_stock) || 0;

  const brandName = product.brand?.name || product.brand || 'Chính hãng';
  const specifications = product.tech_specs || {};

  const getApiErrorMessage = (apiError) => {
    const errorData = apiError.data;
    if (errorData?.detail) return errorData.detail;

    if (errorData && typeof errorData === 'object') {
      const firstError = Object.values(errorData).flat().find(Boolean);
      if (firstError) return String(firstError);
    }

    return apiError.message || 'Không thể cập nhật giỏ hàng.';
  };

  const handleAddToCart = async (goToCheckout = false) => {
    if (!currentItem.id || currentStock <= 0) return;

    const accessToken = localStorage.getItem('token');
    if (!accessToken) {
      navigate('/login', { state: { from: `/products/${id}` } });
      return;
    }

    setCartAction(goToCheckout ? 'checkout' : 'cart');
    setCartMessage('');

    try {
      await apiClient.post(
        '/cart/items/',
        {
          product_item_id: currentItem.id,
          quantity,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (goToCheckout) {
        navigate('/checkout');
      } else {
        setCartMessage('Đã thêm sản phẩm vào giỏ hàng.');
      }
    } catch (apiError) {
      if (apiError.status === 401) {
        navigate('/login', { state: { from: `/products/${id}` } });
        return;
      }
      setCartMessage(getApiErrorMessage(apiError));
    } finally {
      setCartAction(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <nav className="flex items-center gap-2 text-xs text-gray-500 mb-6 bg-white px-4 py-2.5 rounded-lg border border-gray-100 shadow-sm">
        <Link to="/" className="hover:text-amber-500 flex items-center gap-1">
          <Home className="w-3.5 h-3.5" /> Trang chủ
        </Link>
        <ChevronRight className="w-3 h-3 text-gray-300" />
        <Link to="/products" className="hover:text-amber-500">Sản phẩm</Link>
        <ChevronRight className="w-3 h-3 text-gray-300" />
        <span className="text-gray-800 font-medium truncate max-w-[200px] sm:max-w-xs">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-white p-4 sm:p-8 rounded-2xl border border-gray-100 shadow-sm">
        {/* Khối Ảnh Bên Trái */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="relative aspect-square rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center p-4 group overflow-hidden">
            {product.discount > 0 && (
              <span className="absolute top-4 left-4 bg-red-500 text-white text-xs font-black px-2.5 py-1 rounded-md z-10">
                GIẢM {product.discount}%
              </span>
            )}
            <img
              src={currentImage}
              alt={product.name}
              className="object-contain w-full h-full transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        </div>

        {/* Khối Thông Tin Chi Tiết */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div>
            <span className="text-xs bg-amber-500/10 text-amber-600 font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
              {brandName}
            </span>
            
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 mt-3 leading-snug">
              {product.name}
            </h1>

            <div className="flex items-center gap-4 mt-3 text-xs border-b border-gray-100 pb-4">
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400">Trạng thái kho:</span>
                <span className={`font-bold ${currentStock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {currentStock > 0 ? `Còn hàng (${currentStock} sản phẩm)` : 'Hết hàng tạm thời'}
                </span>
              </div>
              <div className="w-px h-3 bg-gray-200"></div>
              <div>
                <span className="text-gray-400">Mã thiết bị:</span>
                <span className="text-gray-700 font-mono ml-1">#SKU-{currentItem.id || product.id}</span>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl mt-4 flex items-baseline flex-wrap gap-3">
              <span className="text-red-500 font-black text-2xl sm:text-3xl">
                {formatVND(currentPrice)}
              </span>
              {currentOldPrice && (
                <span className="text-sm text-gray-400 line-through">
                  {formatVND(currentOldPrice)}
                </span>
              )}
            </div>

            {/* HIỂN THỊ CÁC BIẾN THỂ DỮ LIỆU THẬT TỪ BACKEND */}
            {items.length > 1 && (
              <div className="mt-5 bg-amber-50/40 p-4 rounded-xl border border-amber-50">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">Tùy chọn cấu hình</h3>
                <div className="flex flex-wrap gap-2">
                  {items.map((item, idx) => (
                    <button
                      type="button"
                      key={item.id || idx}
                      onClick={() => {
                        setSelectedItemIndex(idx);
                        setQuantity(1);
                        setCartMessage('');
                      }}
                      className={`px-3 py-2 border text-xs font-semibold rounded-lg transition-all ${
                        selectedItemIndex === idx
                          ? 'border-amber-500 bg-amber-500 text-white shadow-sm'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      {item.sku || `Phiên bản ${idx + 1}`} ({formatVND(item.price)})
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Mô tả sản phẩm</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {product.description || 'Thiết bị công nghệ cao cấp chính hãng, sở hữu cấu hình mạnh mẽ đáp ứng toàn diện nhu cầu công việc quay chụp hình ảnh chất lượng cao.'}
              </p>
            </div>

            {/* HIỂN THỊ THÔNG SỐ KỸ THUẬT THẬT (TECH SPECS) TỪ BACKEND */}
            {Object.keys(specifications).length > 0 && (
              <div className="mt-5 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Thông số kỹ thuật chi tiết</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                  {Object.entries(specifications).map(([key, value]) => (
                    <div key={key} className="flex justify-between py-1 border-b border-gray-200/60 last:border-0">
                      <span className="text-gray-400 capitalize">{key.replace('_', ' ')}</span>
                      <span className="font-semibold text-gray-800 text-right">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 space-y-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-bold text-gray-700">Số lượng đặt:</span>
              <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50">
                <button
                  disabled={currentStock === 0}
                  onClick={() => handleQuantityChange('decrease', currentStock)}
                  className="p-2 hover:bg-gray-200 text-gray-600 disabled:opacity-30 transition-colors rounded-l-lg"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-12 text-center text-sm font-bold text-gray-800">
                  {currentStock === 0 ? 0 : quantity}
                </span>
                <button
                  disabled={currentStock === 0}
                  onClick={() => handleQuantityChange('increase', currentStock)}
                  className="p-2 hover:bg-gray-200 text-gray-600 disabled:opacity-30 transition-colors rounded-r-lg"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                disabled={currentStock === 0 || cartAction !== null}
                onClick={() => handleAddToCart(false)}
                className="flex-1 bg-gray-900 text-white font-bold py-3.5 px-6 rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-amber-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-md shadow-gray-900/10"
              >
                <ShoppingCart className="w-4 h-4" />
                {cartAction === 'cart' ? 'Đang thêm...' : 'Thêm vào giỏ hàng'}
              </button>
              <button
                type="button"
                disabled={currentStock === 0 || cartAction !== null}
                onClick={() => handleAddToCart(true)}
                className="flex-1 bg-amber-500 text-white font-bold py-3.5 px-6 rounded-xl text-sm hover:bg-amber-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-all shadow-md shadow-amber-500/10"
              >
                {cartAction === 'checkout' ? 'Đang xử lý...' : 'Mua ngay lập tức'}
              </button>
            </div>
            {cartMessage && (
              <p className="text-sm font-medium text-gray-700" role="status">
                {cartMessage}
              </p>
            )}
          </div>

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
