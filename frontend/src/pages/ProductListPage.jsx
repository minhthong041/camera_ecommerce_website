import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import catalogApi from "../api/catalogApi";
import ProductCard from "../components/ProductCard";
import LoadingState from "../components/common/LoadingState";
import ErrorState from "../components/common/ErrorState";
import {
  Search,
  SlidersHorizontal,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const PAGE_SIZE = 12;

export default function ProductListPage() {
  // 1. CHỈ GIỮ LẠI CÁC STATE DÙNG CHO LỌC & PHÂN TRANG (UI)
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // 2. SỬ DỤNG REACT QUERY ĐỂ LẤY DANH MỤC & THƯƠNG HIỆU
  const {
    data: categoriesData,
    isError: isCategoriesError,
    isLoading: isCategoriesLoading,
    refetch: refetchCategories,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: () => catalogApi.getCategories(),
    staleTime: 5 * 60 * 1000,
  });
  const categories = categoriesData?.results || categoriesData || [];

  const {
    data: brandsData,
    isError: isBrandsError,
    isLoading: isBrandsLoading,
    refetch: refetchBrands,
  } = useQuery({
    queryKey: ["brands"],
    queryFn: () => catalogApi.getBrands(),
    staleTime: 5 * 60 * 1000,
  });
  const brands = brandsData?.results || brandsData || [];

  // 3. SỬ DỤNG REACT QUERY ĐỂ LẤY SẢN PHẨM (Tự động gọi lại khi biến trong mảng queryKey thay đổi)
  const queryParams = {
    categoryId: selectedCategory || undefined,
    brandId: selectedBrand || undefined,
    search: search || undefined,
    page: currentPage,
    pageSize: PAGE_SIZE,
  };

  const {
    data: productsData,
    isLoading: isProductsLoading,
    isError: isProductsError,
    error: productsError,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: ["products", queryParams], // Gắn params vào key, hễ params đổi là tự fetch lại!
    queryFn: () => catalogApi.getProducts(queryParams),
  });

  // Trích xuất dữ liệu sản phẩm từ response
  const products =
    productsData?.results || (Array.isArray(productsData) ? productsData : []);
  const totalCount =
    productsData?.count ||
    (Array.isArray(productsData) ? productsData.length : 0);
  const hasNext = !!productsData?.next;
  const hasPrevious = !!productsData?.previous;

  // 4. CÁC HÀM XỬ LÝ SỰ KIỆN RẤT GỌN NHẸ (Chỉ cần set State, React Query sẽ tự lo phần gọi API)
  const handleCategoryChange = (id) => {
    setSelectedCategory(id);
    setCurrentPage(1);
  };

  const handleBrandChange = (id) => {
    setSelectedBrand(id);
    setCurrentPage(1);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSelectedCategory("");
    setSelectedBrand("");
    setSearch("");
    setSearchInput("");
    setCurrentPage(1);
  };

  return (
    <div className="container px-4 py-8 mx-auto max-w-7xl">
      <div className="flex flex-col gap-4 p-4 mb-6 bg-white border border-gray-100 shadow-sm rounded-xl sm:flex-row sm:items-center sm:justify-between">
        <h1 className="m-0 text-xl font-black tracking-tight uppercase text-brand-dark">
          Danh mục thiết bị công nghệ
        </h1>

        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Tìm kiếm máy ảnh, ống kính..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full py-2 pl-10 pr-4 text-sm transition-all border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
          <button
            type="submit"
            className="absolute text-gray-400 left-3 top-2.5 hover:text-amber-500"
          >
            <Search className="w-4 h-4" />
          </button>
        </form>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* SIDEBAR FILTER */}
        <aside className="w-full space-y-6 lg:w-64 shrink-0">
          <div className="p-5 bg-white border border-gray-100 shadow-sm rounded-xl">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
              <span className="flex items-center gap-2 text-sm font-bold text-gray-800">
                <SlidersHorizontal className="w-4 h-4 text-amber-500" /> Bộ lọc
                tìm kiếm
              </span>
              {(selectedCategory || selectedBrand || search) && (
                <button
                  onClick={handleResetFilters}
                  className="flex items-center gap-1 text-xs font-medium text-red-500 transition-colors hover:text-red-700"
                >
                  <RotateCcw className="w-3 h-3" /> Xóa lọc
                </button>
              )}
            </div>

            {/* PHẦN DANH MỤC */}
            <div className="mb-6">
              <h3 className="mb-3 text-xs font-bold tracking-wider text-gray-400 uppercase">
                Danh mục sản phẩm
              </h3>
              {isCategoriesLoading ? (
                <LoadingState message="Đang tải..." compact />
              ) : isCategoriesError ? (
                <ErrorState
                  message="Lỗi tải danh mục"
                  onRetry={() => refetchCategories()}
                  compact
                />
              ) : (
                <div className="pr-1 space-y-2 overflow-y-auto max-h-48">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer group">
                    <input
                      type="radio"
                      name="category"
                      checked={selectedCategory === ""}
                      onChange={() => handleCategoryChange("")}
                      className="w-4 h-4 accent-amber-500"
                    />
                    <span
                      className={
                        selectedCategory === ""
                          ? "font-bold text-amber-500"
                          : "group-hover:text-amber-500 transition-colors"
                      }
                    >
                      Tất cả danh mục
                    </span>
                  </label>
                  {categories.map((cat) => (
                    <label
                      key={cat.id}
                      className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer group"
                    >
                      <input
                        type="radio"
                        name="category"
                        checked={selectedCategory === cat.id}
                        onChange={() => handleCategoryChange(cat.id)}
                        className="w-4 h-4 accent-amber-500"
                      />
                      <span
                        className={
                          selectedCategory === cat.id
                            ? "font-bold text-amber-500"
                            : "group-hover:text-amber-500 transition-colors"
                        }
                      >
                        {cat.name}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* PHẦN THƯƠNG HIỆU */}
            <div>
              <h3 className="mb-3 text-xs font-bold tracking-wider text-gray-400 uppercase">
                Thương hiệu
              </h3>
              {isBrandsLoading ? (
                <LoadingState message="Đang tải..." compact />
              ) : isBrandsError ? (
                <ErrorState
                  message="Lỗi tải thương hiệu"
                  onRetry={() => refetchBrands()}
                  compact
                />
              ) : (
                <div className="pr-1 space-y-2 overflow-y-auto max-h-48">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer group">
                    <input
                      type="radio"
                      name="brand"
                      checked={selectedBrand === ""}
                      onChange={() => handleBrandChange("")}
                      className="w-4 h-4 accent-amber-500"
                    />
                    <span
                      className={
                        selectedBrand === ""
                          ? "font-bold text-amber-500"
                          : "group-hover:text-amber-500 transition-colors"
                      }
                    >
                      Tất cả thương hiệu
                    </span>
                  </label>
                  {brands.map((b) => (
                    <label
                      key={b.id}
                      className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer group"
                    >
                      <input
                        type="radio"
                        name="brand"
                        checked={selectedBrand === b.id}
                        onChange={() => handleBrandChange(b.id)}
                        className="w-4 h-4 accent-amber-500"
                      />
                      <span
                        className={
                          selectedBrand === b.id
                            ? "font-bold text-amber-500"
                            : "group-hover:text-amber-500 transition-colors"
                        }
                      >
                        {b.name}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>{" "}
          {/* ĐÃ FIX: Thêm thẻ đóng div cho Sidebar */}
        </aside>{" "}
        {/* ĐÃ FIX: Thêm thẻ đóng aside cho Sidebar */}
        {/* DANH SÁCH SẢN PHẨM & PHÂN TRANG */}
        <div className="flex flex-col justify-between flex-grow">
          <div>
            {/* GẮN COMPONENT DÙNG CHUNG VÀO ĐÂY */}
            {isProductsLoading ? (
              <LoadingState message="Đang tải danh sách thiết bị từ máy chủ..." />
            ) : isProductsError ? (
              <ErrorState
                message={
                  productsError?.message ||
                  "Lỗi kết nối. Không thể lấy dữ liệu sản phẩm."
                }
                onRetry={() =>
                  refetchProducts()
                } /* ĐÃ FIX: Thêm arrow function theo lời leader */
              />
            ) : products.length === 0 ? (
              <div className="py-20 text-sm text-center text-gray-400 bg-white border border-gray-100 shadow-sm rounded-xl">
                Không tìm thấy sản phẩm nào khớp với bộ lọc hiện tại.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>

          {/* THANH ĐIỀU HƯỚNG PHÂN TRANG */}
          {!isProductsLoading && !isProductsError && totalCount > PAGE_SIZE && (
            <div className="flex items-center justify-center gap-4 pt-6 mt-12 border-t border-gray-100">
              <button
                disabled={!hasPrevious}
                onClick={() => setCurrentPage((page) => page - 1)}
                className="flex items-center gap-1 px-4 py-2 text-xs font-bold text-gray-700 transition-all bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white"
              >
                <ChevronLeft className="w-4 h-4" /> Trang trước
              </button>
              <span className="text-xs font-bold text-gray-500">
                Trang {currentPage} / {Math.ceil(totalCount / PAGE_SIZE)}
              </span>
              <button
                disabled={!hasNext}
                onClick={() => setCurrentPage((page) => page + 1)}
                className="flex items-center gap-1 px-4 py-2 text-xs font-bold text-gray-700 transition-all bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white"
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
