import { useEffect, useState, useCallback } from 'react';
import catalogApi from '../api/catalogApi';
import ProductCard from '../components/ProductCard';
import { Search, SlidersHorizontal, RotateCcw } from 'lucide-react';

export default function ProductListPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // States dành cho Bộ lọc (Filter)
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [searchInput, setSearchInput] = useState(''); // State tạm cho khung input

  // Lấy dữ liệu danh mục và thương hiệu (chỉ chạy 1 lần khi mount)
  useEffect(() => {
    Promise.all([catalogApi.getCategories(), catalogApi.getBrands()])
      .then(([categoriesData, brandsData]) => {
        setCategories(categoriesData?.results || categoriesData || []);
        setBrands(brandsData?.results || brandsData || []);
      })
      .catch((err) => {
        console.error('Lỗi lấy dữ liệu bộ lọc:', err);
      });
  }, []);

  // Hàm fetch danh sách sản phẩm theo bộ lọc
  const fetchProducts = useCallback(() => {
    setLoading(true);
    const queryParams = {
      categoryId: selectedCategory || undefined,
      brandId: selectedBrand || undefined,
      search: search || undefined,
    };

    catalogApi.getProducts(queryParams)
      .then((data) => {
        setProducts(data?.results || data || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Không thể lấy dữ liệu sản phẩm từ API Backend.');
        setLoading(false);
      });
  }, [selectedCategory, selectedBrand, search]);

  // Thực thi gọi lại API mỗi khi filter thay đổi
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Xử lý tìm kiếm khi nhấn Enter hoặc click nút Kính lúp
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  // Reset toàn bộ bộ lọc về mặc định
  const handleResetFilters = () => {
    setSelectedCategory('');
    setSelectedBrand('');
    setSearch('');
    setSearchInput('');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Tiêu đề trang */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="font-black text-xl text-brand-dark uppercase m-0 tracking-tight">
          Danh mục thiết bị công nghệ
        </h1>
        
        {/* Form tìm kiếm */}
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Tìm kiếm máy ảnh, ống kính..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
          />
          <button type="submit" className="absolute left-3 top-2.5 text-gray-400 hover:text-amber-500">
            <Search className="w-4 h-4" />
          </button>
        </form>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* SIDEBAR FILTER */}
        <aside className="w-full lg:w-64 shrink-0 space-y-6">
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
              <span className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-amber-500" /> Bộ lọc tìm kiếm
              </span>
              {(selectedCategory || selectedBrand || search) && (
                <button 
                  onClick={handleResetFilters}
                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 font-medium transition-colors"
                >
                  <RotateCcw className="w-3 h-3" /> Xóa lọc
                </button>
              )}
            </div>

            {/* Lọc theo Danh mục */}
            <div className="mb-6">
              <h3 className="font-bold text-xs text-gray-400 uppercase tracking-wider mb-3">Danh mục sản phẩm</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer group">
                  <input
                    type="radio"
                    name="category"
                    checked={selectedCategory === ''}
                    onChange={() => setSelectedCategory('')}
                    className="accent-amber-500 w-4 h-4"
                  />
                  <span className={selectedCategory === '' ? 'font-bold text-amber-500' : 'group-hover:text-amber-500 transition-colors'}>
                    Tất cả danh mục
                  </span>
                </label>
                {categories.map((cat) => (
                  <label key={cat.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer group">
                    <input
                      type="radio"
                      name="category"
                      checked={selectedCategory === cat.id}
                      onChange={() => setSelectedCategory(cat.id)}
                      className="accent-amber-500 w-4 h-4"
                    />
                    <span className={selectedCategory === cat.id ? 'font-bold text-amber-500' : 'group-hover:text-amber-500 transition-colors'}>
                      {cat.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Lọc theo Thương hiệu */}
            <div>
              <h3 className="font-bold text-xs text-gray-400 uppercase tracking-wider mb-3">Thương hiệu</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer group">
                  <input
                    type="radio"
                    name="brand"
                    checked={selectedBrand === ''}
                    onChange={() => setSelectedBrand('')}
                    className="accent-amber-500 w-4 h-4"
                  />
                  <span className={selectedBrand === '' ? 'font-bold text-amber-500' : 'group-hover:text-amber-500 transition-colors'}>
                    Tất cả thương hiệu
                  </span>
                </label>
                {brands.map((b) => (
                  <label key={b.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer group">
                    <input
                      type="radio"
                      name="brand"
                      checked={selectedBrand === b.id}
                      onChange={() => setSelectedBrand(b.id)}
                      className="accent-amber-500 w-4 h-4"
                    />
                    <span className={selectedBrand === b.id ? 'font-bold text-amber-500' : 'group-hover:text-amber-500 transition-colors'}>
                      {b.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* DANH SÁCH SẢN PHẨM */}
        <div className="flex-grow">
          {loading ? (
            <div className="text-center py-20 text-sm text-gray-500">
              Đang tải danh sách thiết bị từ máy chủ...
            </div>
          ) : error ? (
            <div className="text-center py-20 text-red-500 text-sm font-bold">
              Lỗi kết nối: {error}
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white text-center py-20 rounded-xl border border-gray-100 text-gray-400 text-sm shadow-sm">
              Không tìm thấy sản phẩm nào khớp với bộ lọc hiện tại.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6">
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