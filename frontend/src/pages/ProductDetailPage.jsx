import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { catalogApi } from '../api/catalogApi';
import { ShieldCheck, Truck, RefreshCw, Minus, Plus, Heart } from 'lucide-react';

export default function ProductDetailPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);

  // Quản lý trạng thái tim (Yêu thích) đồng bộ
  const [isFavorite, setIsFavorite] = useState(() => {
    const local = JSON.parse(localStorage.getItem('wishlist_local')) || [];
    return local.some(item => String(item.id) === String(id));
  });

  useEffect(() => {
    let isMounted = true;
    catalogApi.getProduct(id)
      .then((data) => {
        if (isMounted) {
          setProduct(data);
          const productItems = data.product_items || data.items || [];
          const firstAvailableIndex = productItems.findIndex((item) => Number(item.qty_in_stock) > 0);
          setSelectedItemIndex(firstAvailableIndex >= 0 ? firstAvailableIndex : 0);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error(err);
        if (isMounted) {
          setError('Không tìm thấy thông tin sản phẩm hoặc lỗi kết nối.');
          setLoading(false);
        }
      });

    return () => { isMounted = false; };
  }, [id]);

  const toggleFavorite = () => {
    if (!product) return;
    let local = JSON.parse(localStorage.getItem('wishlist_local')) || [];
    const exists = local.some(item => item.id === product.id);

    if (exists) {
      local = local.filter(item => item.id !== product.id);
      setIsFavorite(false);
    } else {
      local.push(product);
      setIsFavorite(true);
    }
    localStorage.setItem('wishlist_local', JSON.stringify(local));
    window.dispatchEvent(new Event('wishlistUpdated'));
  };

  if (loading) return <div className="text-center py-20 text-sm text-gray-500">Đang tải chi tiết máy ảnh...</div>;
  if (error) return <div className="text-center py-20 text-red-500 text-sm font-bold">{error}</div>;
  if (!product) return null;

  const productItems = product.product_items || product.items || [];
  const currentItem = productItems[selectedItemIndex] || {};
  const currentStock = Number(currentItem.qty_in_stock) || 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 bg-white p-6 sm:p-8 rounded-2xl border border-gray-100 shadow-sm">
        {/* Khối ảnh sản phẩm */}
        <div className="flex items-center justify-center bg-gray-50 rounded-xl p-6 aspect-square max-h-[500px]">
          <img 
            src={product.image_url || currentItem.product_image || '/placeholder-camera.jpg'} 
            alt={product.name} 
            className="max-h-full max-w-full object-contain" 
          />
        </div>

        {/* Khối thông tin chi tiết */}
        <div className="flex flex-col justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider font-extrabold text-amber-600 block mb-2">
              {product.brand?.name || product.brand_name || 'Chính hãng'}
            </span>
            <h1 className="text-2xl font-black text-gray-900 leading-tight mb-4">{product.name}</h1>
            <div className="flex items-baseline gap-4 mb-6 bg-gray-50 p-4 rounded-xl">
              <span className="text-2xl font-black text-amber-500">
                {Number(currentItem.price || product.price).toLocaleString('vi-VN')}₫
              </span>
            </div>
          </div>

          <div>
            {/* Bộ điều khiển số lượng mua */}
            <div className="flex items-center gap-3 mb-6">
              <button 
                onClick={() => setQuantity(q => Math.max(1, q - 1))} 
                className="p-2 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="px-4 font-bold text-gray-800">{quantity}</span>
              <button 
                onClick={() => setQuantity(q => q + 1)} 
                className="p-2 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Khối các nút hành động (Mua & Thả tim) */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <button 
                disabled={currentStock === 0} 
                className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-bold py-3.5 px-6 rounded-xl text-sm transition-all shadow-md"
              >
                Mua ngay lập tức
              </button>
              
              {/* NÚT FAVORITE ĐÃ ĐƯỢC TÍNH HỢP SẠCH SẼ LỖI ESLINT */}
              <button 
                onClick={toggleFavorite}
                type="button"
                className={`px-5 py-3.5 border rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                  isFavorite 
                    ? 'bg-red-50 border-red-200 text-red-600' 
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Heart className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                <span className="text-sm">{isFavorite ? 'Đã thích' : 'Yêu thích'}</span>
              </button>
            </div>

            {/* Khối cam kết chính sách */}
            <div className="grid grid-cols-3 gap-2 border-t border-gray-100 pt-6 text-[11px] text-gray-500">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" /> Bảo hành 12 tháng
              </div>
              <div className="flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-blue-500" /> Giao hỏa tốc
              </div>
              <div className="flex items-center gap-1.5">
                <RefreshCw className="w-4 h-4 text-amber-500" /> Đổi trả 7 ngày
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}