import { useEffect, useState } from 'react';
import catalogApi from '../api/catalogApi'; // Gọi trực tiếp API cũ của bạn
import ProductCard from '../components/ProductCard';

export default function ProductListPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    catalogApi.getProducts()
      .then((data) => {
        // Hỗ trợ cả trường hợp API trả về mảng trực tiếp hoặc dạng phân trang có trường .results
        setProducts(data?.results || data || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Không thể lấy dữ liệu sản phẩm từ API Backend.');
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="text-center py-20 text-sm text-gray-500">Đang tải danh sách máy ảnh từ máy chủ...</div>;
  if (error) return <div className="text-center py-20 text-brand-accent text-sm font-bold">Lỗi kết nối: {error}</div>;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-6">
        <h1 className="font-black text-xl text-brand-dark uppercase m-0 tracking-tight">Danh mục thiết bị công nghệ</h1>
      </div>

      {products.length === 0 ? (
        <div className="bg-white text-center py-12 rounded-xl border border-gray-100 text-gray-400 text-sm">
          API chạy thành công nhưng hiện chưa có sản phẩm nào trong cơ sở dữ liệu.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}