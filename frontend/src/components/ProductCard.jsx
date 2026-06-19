import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, Heart, ShoppingCart } from 'lucide-react';

export default function ProductCard({ product }) {
  const navigate = useNavigate();

  // Khởi tạo state bằng callback để không gây render tuần hoàn (Sạch lỗi ESLint)
  const [isFavorite, setIsFavorite] = useState(() => {
    const local = JSON.parse(localStorage.getItem('wishlist_local')) || [];
    return local.some(item => item.id === product?.id);
  });

  useEffect(() => {
    const syncFavoriteState = () => {
      const local = JSON.parse(localStorage.getItem('wishlist_local')) || [];
      setIsFavorite(local.some(item => item.id === product?.id));
    };
    window.addEventListener('wishlistUpdated', syncFavoriteState);
    return () => window.removeEventListener('wishlistUpdated', syncFavoriteState);
  }, [product?.id]);

  const toggleFavorite = (e) => {
    e.preventDefault();
    e.stopPropagation();
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

  const items = product?.items || [];
  const availableItems = items.filter((item) => Number(item.qty_in_stock) > 0);
  const displayItems = availableItems.length > 0 ? availableItems : items;
  const primaryItem = displayItems[0] || {};
  const prices = displayItems.map((item) => Number(item.price)).filter(Number.isFinite);
  const price = prices.length > 0 ? Math.min(...prices) : undefined;
  const oldPrice = primaryItem.old_price || product?.oldPrice;
  const image = primaryItem.product_image || product?.image_url || product?.image;
  const stockQuantity = items.reduce((total, item) => total + (Number(item.qty_in_stock) || 0), 0);
  const brandName = product?.brand?.name || product?.brand_name || 'Chính hãng';

  const formatVND = (value) => {
    if (value === undefined || value === null) return 'Liên hệ';
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return 'Liên hệ';
    return numericValue.toLocaleString('vi-VN') + '₫';
  };

  return (
    <div className="group bg-white rounded-2xl border border-gray-100 p-3 flex flex-col justify-between hover:shadow-xl hover:border-amber-500/20 transition-all duration-300 relative overflow-hidden">
      
      {/* NÚT FAVORITE TRÊN PRODUCT CARD */}
      <button 
        onClick={toggleFavorite}
        type="button"
        className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm border border-gray-100 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-white shadow-sm transition-all"
      >
        <Heart className={`w-4 h-4 transition-transform active:scale-125 ${isFavorite ? 'text-red-500 fill-red-500' : ''}`} />
      </button>

      <div className="relative aspect-square rounded-xl bg-gray-50 overflow-hidden mb-4 flex items-center justify-center p-2">
        <img
          src={image || '/placeholder-camera.jpg'}
          alt={product?.name}
          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gray-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Link to={`/products/${product?.id}`} className="p-2 bg-white rounded-full text-gray-700 hover:text-amber-500 hover:scale-110 shadow-md transition-all">
            <Eye className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="flex flex-col flex-1 px-1">
        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest block">
          {brandName}
        </span>
        <h3 className="font-bold text-sm text-gray-800 line-clamp-2 mt-1 min-h-[40px] group-hover:text-amber-500 transition-colors">
          {product?.name}
        </h3>
        <div className="flex items-center gap-2 mt-2 text-xs">
          <span className="text-gray-400">Kho hàng:</span>
          <span className={`font-semibold ${stockQuantity > 0 ? 'text-green-600' : 'text-amber-600'}`}>
            {stockQuantity > 0 ? `Còn hàng (${stockQuantity})` : 'Hết hàng'}
          </span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between">
        <div className="flex flex-col">
          {oldPrice && <span className="text-xs text-gray-400 line-through">{formatVND(oldPrice)}</span>}
          <span className="text-red-500 font-black text-base">{formatVND(price)}</span>
        </div>
        <button onClick={() => navigate(`/products/${product?.id}`)} className="p-2 bg-gray-900 hover:bg-amber-500 text-white hover:text-gray-900 rounded-xl transition-colors shadow-sm">
          <ShoppingCart className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}