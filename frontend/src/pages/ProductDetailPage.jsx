import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import catalogApi from '../api/catalogApi';
import { ChevronLeft, ShoppingCart } from 'lucide-react';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    catalogApi.getProduct(id)
      .then((data) => {
        setProduct(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Không tìm thấy thông tin sản phẩm này.');
        setLoading(false);
      });
  }, [id]);

  const formatVND = (price) => price ? price.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' }) : 'Liên hệ';

  if (loading) return <div className="text-center py-20 text-sm text-gray-500">Đang xử lý thông tin kỹ thuật sản phẩm...</div>;
  if (error) return <div className="text-center py-20 text-red-500 font-bold">{error}</div>;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-amber-500 transition-colors uppercase tracking-wider">
        <ChevronLeft className="w-4 h-4" /> Quay lại danh sách
      </button>

      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-center aspect-square border overflow-hidden">
          <img src={product?.image} alt={product?.name} className="object-contain max-h-full transition-transform duration-300 hover:scale-105" />
        </div>

        <div className="flex flex-col justify-between">
          <div>
            <span className="text-xs text-amber-500 uppercase font-black tracking-widest">{product?.brand || 'Chính hãng'}</span>
            <h1 className="text-xl font-bold text-gray-800 mt-1 mb-4">{product?.name}</h1>
            <div className="bg-gray-50 p-4 rounded-xl text-xl font-black text-red-500 mb-4 w-fit px-6">
              {formatVND(product?.price)}
            </div>
            <p className="text-gray-600 text-sm leading-relaxed border-t pt-4">{product?.description || 'Thông số kỹ thuật đang được cập nhật thêm từ nhà sản xuất.'}</p>
          </div>

          <button className="w-full mt-6 bg-gray-900 hover:bg-black text-white font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all">
            <ShoppingCart className="w-4 h-4" /> Thêm vào giỏ hàng thành công
          </button>
        </div>
      </div>
    </div>
  );
}