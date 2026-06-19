import { Eye, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ProductCard({ product }) {
  const navigate = useNavigate();

  const items = product?.items || [];
  const availableItems = items.filter((item) => Number(item.qty_in_stock) > 0);
  const displayItems = availableItems.length > 0 ? availableItems : items;
  const primaryItem = displayItems[0] || {};
  const prices = displayItems
    .map((item) => Number(item.price))
    .filter(Number.isFinite);
  const price = prices.length > 0 ? Math.min(...prices) : undefined;
  const oldPrice = primaryItem.old_price || product?.oldPrice;
  const image = primaryItem.product_image || product?.image;
  const stockQuantity = items.reduce(
    (total, item) => total + (Number(item.qty_in_stock) || 0),
    0,
  );

  // Xử lý hiển thị tên thương hiệu (Backend trả về object brand: { name, ... })
  const brandName = product?.brand?.name || product?.brand || 'Chính hãng';

  const formatVND = (value) => {
    if (value === undefined || value === null) return 'Liên hệ';
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return 'Liên hệ';
    return numericValue.toLocaleString('vi-VN', {
      style: 'currency',
      currency: 'VND',
    });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 relative group hover:shadow-xl hover:border-transparent transition-all duration-300 flex flex-col justify-between">
      {product?.discount > 0 && (
        <span className="absolute top-3 left-3 bg-red-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-md z-10">
          -{product.discount}%
        </span>
      )}

      <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-50 mb-4 flex items-center justify-center p-2">
        <img
          src={image}
          alt={product?.name}
          className="object-contain w-full h-full group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => navigate(`/products/${product.id}`)}
            title="Xem chi tiết"
            className="bg-white p-2.5 rounded-full text-gray-900 shadow-md hover:bg-amber-500 hover:text-white transition-all transform translate-y-2 group-hover:translate-y-0 duration-300"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => navigate(`/products/${product.id}`)}
            title="Chọn phiên bản để thêm vào giỏ"
            className="bg-white p-2.5 rounded-full text-gray-900 shadow-md hover:bg-gray-900 hover:text-white transition-all transform translate-y-2 group-hover:translate-y-0 duration-300 delay-75"
          >
            <ShoppingCart className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-grow flex flex-col justify-between">
        <div>
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

        <div className="mt-4 pt-3 border-t border-gray-50">
          <div className="flex items-baseline flex-wrap gap-x-2">
            <span className="text-red-500 font-black text-base">{formatVND(price)}</span>
            {oldPrice && (
              <span className="text-xs text-gray-400 line-through">{formatVND(oldPrice)}</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => navigate(`/products/${product.id}`)}
            className="w-full mt-3 bg-gray-50 border border-gray-100 text-gray-800 py-2 rounded-lg text-xs font-bold hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-all"
          >
            Xem chi tiết
          </button>
        </div>
      </div>
    </div>
  );
}
