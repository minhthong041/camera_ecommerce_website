import { Eye, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ProductCard({ product }) {
  const formatVND = (price) => {
    if (!price) return 'Liên hệ';
    return price.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 relative group hover:shadow-xl hover:border-transparent transition-all duration-300 flex flex-col justify-between">
      {product.discount > 0 && (
        <span className="absolute top-3 left-3 bg-red-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-md z-10">
          -{product.discount}%
        </span>
      )}

      {/* Bọc vùng hình ảnh bằng Link chuyển hướng */}
      <Link to={`/product/${product.id}`} className="relative aspect-square overflow-hidden rounded-lg bg-gray-50 mb-4 flex items-center justify-center p-2 block">
        <img
          src={product.image || 'https://via.placeholder.com/300'}
          alt={product.name}
          className="object-contain w-full h-full group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
      </Link>

      <div className="flex-grow flex flex-col justify-between">
        <div>
          <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest block">{product.brand}</span>
          
          {/* Bọc tiêu đề sản phẩm bằng Link */}
          <Link to={`/product/${product.id}`} className="block font-bold text-sm text-gray-800 line-clamp-2 mt-1 min-h-[40px] group-hover:text-amber-500 transition-colors">
            {product.name}
          </Link>
          
          <div className="flex items-center gap-2 mt-2 text-xs">
            <span className="text-gray-400">Tình trạng:</span>
            <span className={`font-semibold ${product.status === 'Còn hàng' ? 'text-green-600' : 'text-amber-600'}`}>
              {product.status || 'Còn hàng'}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-gray-50">
          <div className="flex items-baseline flex-wrap gap-x-2">
            <span className="text-red-500 font-black text-base">{formatVND(product.price)}</span>
            {product.oldPrice && (
              <span className="text-xs text-gray-400 line-through">{formatVND(product.oldPrice)}</span>
            )}
          </div>
          
          {/* Chuyển đổi button thành Link chi tiết */}
          <Link 
            to={`/product/${product.id}`}
            className="w-full mt-3 bg-gray-50 border border-gray-100 text-gray-800 py-2 rounded-lg text-xs font-bold hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-all text-center block"
          >
            Xem chi tiết
          </Link>
        </div>
      </div>
    </div>
  );
}