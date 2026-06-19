import { useEffect, useState } from 'react';
import catalogApi from '../api/catalogApi'; 
import ProductCard from '../components/ProductCard';

export default function ProductListPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // States quản lý bộ lọc
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');

  // 1. Lấy dữ liệu danh mục và thương hiệu đổ vào bộ lọc đầu vào
  useEffect(() => {
    Promise.all([
      catalogApi.getCategories(),
      catalogApi.getBrands()
    ])
      .then(([catData, brandData]) => {
        setCategories(catData?.results || catData || []);
        setBrands(brandData?.results || brandData || []);
      })
      .catch((err) => console.error('Lỗi lấy danh mục bộ lọc:', err));
  }, []);

  // 2. Tự động gọi lại danh sách sản phẩm bất cứ khi nào bộ lọc thay đổi
  useEffect(() => {
    setLoading(true);
    catalogApi.getProducts({
      categoryId: selectedCategory || undefined,
      brandId: selectedBrand || undefined
    })
      .then((data) => {
        setProducts(data?.results || data || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Không thể lấy dữ liệu sản phẩm từ API Backend.');
        setLoading(false);
      });
  }, [selectedCategory, selectedBrand]);

  if (loading && products.length === 0) return <div className="text-center py-20 text-sm text-gray-500">Đang tải danh sách máy ảnh...</div>;
  if (error) return <div className="text-center py-20 text-brand-accent text-sm font-bold">Lỗi kết nối: {error}</div>;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-6">
        <h1 className="font-black text-xl text-brand-dark uppercase m-0 tracking-tight">Danh mục thiết bị công nghệ</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* THANH BỘ LỌC ĐỘNG (DỰA TRÊN API) */}
        <div className="w-full md:w-1/4 bg-white p-5 rounded-xl border border-gray-100 shadow-sm h-fit">
          <h2 className="font-bold text-sm text-gray-800 uppercase tracking-wider mb-4 pb-2 border-b">Bộ lọc sản phẩm</h2>
          
          {/* Lọc danh mục */}
          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Theo Danh Mục</label>
            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full p-2.5 text-xs border border-gray-200 rounded-lg bg-gray-50 focus:outline-none"
            >
              <option value="">Tất cả danh mục</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Lọc thương hiệu */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Theo Thương Hiệu</label>
            <select 
              value={selectedBrand} 
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full p-2.5 text-xs border border-gray-200 rounded-lg bg-gray-50 focus:outline-none"
            >
              <option value="">Tất cả hãng</option>
              {brands.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* DANH SÁCH HIỂN THỊ SẢN PHẨM */}
        <div className="w-full md:w-3/4">
          {products.length === 0 ? (
            <div className="bg-white text-center py-12 rounded-xl border border-gray-100 text-gray-400 text-sm">
              Không tìm thấy sản phẩm nào khớp với bộ lọc hiện tại.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}