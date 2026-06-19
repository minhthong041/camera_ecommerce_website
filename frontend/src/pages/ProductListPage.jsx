import { useEffect, useState, useCallback } from 'react';
import { catalogApi } from '../api/catalogApi';
import ProductCard from '../components/ProductCard';
import { Search, SlidersHorizontal, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ProductListPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Trạng thái phục vụ bộ lọc và phân trang
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [searchInput, setSearchInput] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const pageSize = 12; // Số sản phẩm hiển thị trên mỗi trang

  // Lấy dữ liệu bộ lọc tĩnh khi component khởi chạy lần đầu
  useEffect(() => {
    let isMounted = true;
    Promise.all([catalogApi.getCategories(), catalogApi.getBrands()])
      .then(([categoriesData, brandsData]) => {
        if (isMounted) {
          setCategories(categoriesData?.results || categoriesData || []);
          setBrands(brandsData?.results || brandsData || []);
        }
      })
      .catch((err) => {
        console.error('Lỗi lấy dữ liệu bộ lọc:', err);
      });
    return () => { isMounted = false; };
  }, []);

  // Đóng gói hàm gọi API bất đồng bộ theo chuẩn
  const fetchProducts = useCallback(() => {
    const queryParams = {
      categoryId: selectedCategory || undefined,
      brandId: selectedBrand || undefined,
      search: search || undefined,
      page: currentPage,
      pageSize: pageSize,
    };

    catalogApi.getProducts(queryParams)
      .then((data) => {
        // Tách cấu trúc Object phân trang thực tế từ DRF backend
        if (data && typeof data === 'object' && 'results' in data) {
          setProducts(data.results || []);
          setTotalCount(data.count || 0);
          setHasNext(!!data.next);
          setHasPrevious(!!data.previous);
        } else {
          // Fallback nếu API trả về mảng thô trực tiếp
          setProducts(Array.isArray(data) ? data : []);
          setTotalCount(Array.isArray(data) ? data.length : 0);
          setHasNext(false);
          setHasPrevious(false);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Không thể lấy dữ liệu sản phẩm từ API Backend.');
        setLoading(false);
      });
  }, [selectedCategory, selectedBrand, search, currentPage]);

  useEffect(() => {
    let isMounted = true;
    if (isMounted) {
      fetchProducts();
    }
    return () => { isMounted = false; };
  }, [fetchProducts]);

  const handleCategoryChange = (id) => {
    setLoading(true);
    setSelectedCategory(id);
    setCurrentPage(1); // Reset về trang 1 khi lọc lại
  };

  const handleBrandChange = (id) => {
    setLoading(true);
    setSelectedBrand(id);
    setCurrentPage(1);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setSearch(searchInput);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setLoading(true);
    setSelectedCategory('');
    setSelectedBrand('');
    setSearch('');
    setSearchInput('');
    setCurrentPage(1);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="font-black text-xl text-brand-dark uppercase m-0 tracking-tight">
          Danh mục thiết bị công nghệ
        </h1>
        
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

            <div className="mb-6">
              <h3 className="font-bold text-xs text-gray-400 uppercase tracking-wider mb-3">Danh mục sản phẩm</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer group">
                  <input
                    type="radio"
                    name="category"
                    checked={selectedCategory === ''}
                    onChange={() => handleCategoryChange('')}
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
                      onChange={() => handleCategoryChange(cat.id)}
                      className="accent-amber-500 w-4 h-4"
                    />
                    <span className={selectedCategory === cat.id ? 'font-bold text-amber-500' : 'group-hover:text-amber-500 transition-colors'}>
                      {cat.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-bold text-xs text-gray-400 uppercase tracking-wider mb-3">Thương hiệu</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer group">
                  <input
                    type="radio"
                    name="brand"
                    checked={selectedBrand === ''}
                    onChange={() => handleBrandChange('')}
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
                      onChange={() => handleBrandChange(b.id)}
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

        {/* DANH SÁCH SẢN PHẨM & PHÂN TRANG */}
        <div className="flex-grow flex flex-col justify-between">
          <div>
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

          {/* THANH ĐIỀU HƯỚNG PHÂN TRANG (PAGINATION CONTROLS) */}
          {!loading && !error && totalCount > pageSize && (
            <div className="mt-12 flex items-center justify-center gap-4 border-t border-gray-100 pt-6">
              <button
                disabled={!hasPrevious}
                onClick={() => { setLoading(true); setCurrentPage(prev => prev - 1); }}
                className="flex items-center gap-1 px-4 py-2 text-xs font-bold bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white transition-all"
              >
                <ChevronLeft className="w-4 h-4" /> Trang trước
              </button>
              <span className="text-xs font-bold text-gray-500">
                Trang {currentPage} / {Math.ceil(totalCount / pageSize)}
              </span>
              <button
                disabled={!hasNext}
                onClick={() => { setLoading(true); setCurrentPage(prev => prev + 1); }}
                className="flex items-center gap-1 px-4 py-2 text-xs font-bold bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white transition-all"
              >
                Trang sau <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}