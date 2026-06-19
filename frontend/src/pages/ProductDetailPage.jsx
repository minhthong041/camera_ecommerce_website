import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { catalogApi } from "../api/catalogApi";
import cartApi from "../api/cartApi";
import {
  ShieldCheck,
  Truck,
  RefreshCw,
  Minus,
  Plus,
  ShoppingCart,
  ChevronRight,
  Home,
} from "lucide-react";

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);

  // Quản lý biến thể được chọn từ trường dữ liệu API thật
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);
  const [cartAction, setCartAction] = useState(null);
  const [cartMessage, setCartMessage] = useState("");

  const queryClient = useQueryClient();

  useEffect(() => {
    let isMounted = true;

    catalogApi
      .getProduct(id)
      .then((data) => {
        if (isMounted) {
          setProduct(data);
          const productItems = data.product_items || data.items || [];
          const firstAvailableIndex = productItems.findIndex(
            (item) => Number(item.qty_in_stock) > 0,
          );
          setSelectedItemIndex(
            firstAvailableIndex >= 0 ? firstAvailableIndex : 0,
          );
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "Không thể lấy thông vị chi tiết sản phẩm.");
          setLoading(false);
        }
      });

    // Hàm dọn dẹp (Cleanup Function)
    return () => {
      isMounted = false;
      setLoading(true);
      setProduct(null);
      setError(null);
      setSelectedItemIndex(0);
      setQuantity(1);
      setCartAction(null);
      setCartMessage("");
    };
  }, [id]);

  const formatVND = (price) => {
    if (price === undefined || price === null) return "Liên hệ";
    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice)) return "Liên hệ";
    return numericPrice.toLocaleString("vi-VN", {
      style: "currency",
      currency: "VND",
    });
  };

  const handleQuantityChange = (type, maxStock) => {
    if (type === "decrease" && quantity > 1) {
      setQuantity((currentQuantity) => currentQuantity - 1);
    } else if (type === "increase" && quantity < maxStock) {
      setQuantity((currentQuantity) => currentQuantity + 1);
    }
  };

  const getApiErrorMessage = (apiError) => {
    const errorData = apiError.data;
    if (errorData?.detail) return errorData.detail;

    if (errorData && typeof errorData === "object") {
      const firstError = Object.values(errorData).flat().find(Boolean);
      if (firstError) return String(firstError);
    }

    return apiError.message || "Không thể cập nhật giỏ hàng.";
  };

  // --- SỬ DỤNG REACT QUERY MUTATION ĐỂ XỬ LÝ THÊM VÀO GIỎ ---
  const addToCartMutation = useMutation({
    // ĐÃ SỬA: Chỉ lấy product_item_id và quantity để gửi API. Biến goToCheckout bị loại bỏ khỏi request.
    mutationFn: ({ product_item_id, quantity }) =>
      cartApi.addToCart({ product_item_id, quantity }),

    // variables ở đây vẫn chứa đầy đủ { product_item_id, quantity, goToCheckout } từ lúc gọi mutate()
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });

      if (variables.goToCheckout) {
        navigate("/checkout");
      } else {
        setCartMessage("✅ Đã thêm sản phẩm vào giỏ hàng.");
        setTimeout(() => setCartMessage(""), 3000); // Tự tắt thông báo sau 3s
      }
    },
    onError: (apiError) => {
      if (apiError.status === 401) {
        navigate("/login", { state: { from: `/products/${id}` } });
        return;
      }
      setCartMessage(`❌ Lỗi: ${getApiErrorMessage(apiError)}`);
    },
    onSettled: () => {
      setCartAction(null);
    },
  });

  const handleAddToCart = (goToCheckout = false) => {
    // currentItem và currentStock được lấy ở phía dưới phần render
    const items = product?.product_items || product?.items || [];
    const currentItem = items[selectedItemIndex] || {};
    const currentStock = Number(currentItem.qty_in_stock) || 0;

    if (!currentItem.id || currentStock <= 0) return;

    setCartAction(goToCheckout ? "checkout" : "cart");
    setCartMessage("");

    addToCartMutation.mutate({
      product_item_id: currentItem.id,
      quantity: quantity,
      goToCheckout: goToCheckout,
    });
  };
  // ------------------------------------------------------------

  if (loading)
    return (
      <div className="py-32 text-sm text-center text-gray-500">
        Đang tải cấu hình sản phẩm thực tế...
      </div>
    );
  if (error)
    return (
      <div className="py-32 text-sm font-bold text-center text-red-500">
        Lỗi: {error}
      </div>
    );
  if (!product)
    return (
      <div className="py-32 text-sm text-center text-gray-400">
        Sản phẩm không tồn tại.
      </div>
    );

  // Trích xuất dữ liệu thật từ các cấu trúc mảng Backend trả về
  const items = product.product_items || product.items || [];
  const currentItem = items[selectedItemIndex] || {};

  const currentPrice = currentItem.price || product.price;
  const currentOldPrice = currentItem.old_price || product.oldPrice;
  const currentImage = currentItem.product_image || product.image;
  const currentStock = Number(currentItem.qty_in_stock) || 0;

  const brandName = product.brand?.name || product.brand || "Chính hãng";
  const specifications = product.tech_specs || {};

  return (
    <div className="container max-w-7xl px-4 py-6 mx-auto">
      <nav className="flex items-center gap-2 px-4 py-2.5 mb-6 text-xs text-gray-500 bg-white border border-gray-100 rounded-lg shadow-sm">
        <Link
          to="/"
          className="flex items-center gap-1 transition-colors hover:text-amber-500"
        >
          <Home className="w-3.5 h-3.5" /> Trang chủ
        </Link>
        <ChevronRight className="w-3 h-3 text-gray-300" />
        <Link to="/products" className="transition-colors hover:text-amber-500">
          Sản phẩm
        </Link>
        <ChevronRight className="w-3 h-3 text-gray-300" />
        <span className="max-w-[200px] font-medium text-gray-800 truncate sm:max-w-xs">
          {product.name}
        </span>
      </nav>

      <div className="grid grid-cols-1 p-4 bg-white border border-gray-100 shadow-sm lg:grid-cols-12 gap-8 sm:p-8 rounded-2xl">
        {/* Khối Ảnh Bên Trái */}
        <div className="flex flex-col gap-4 lg:col-span-5">
          <div className="relative flex items-center justify-center p-4 overflow-hidden border border-gray-100 aspect-square rounded-xl bg-gray-50 group">
            {product.discount > 0 && (
              <span className="absolute z-10 px-2.5 py-1 text-xs font-black text-white bg-red-500 rounded-md top-4 left-4">
                GIẢM {product.discount}%
              </span>
            )}
            <img
              src={currentImage}
              alt={product.name}
              className="object-contain w-full h-full transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        </div>

        {/* Khối Thông Tin Chi Tiết */}
        <div className="flex flex-col justify-between lg:col-span-7">
          <div>
            <span className="px-2.5 py-1 text-xs font-bold tracking-wider uppercase rounded-md bg-amber-500/10 text-amber-600">
              {brandName}
            </span>

            <h1 className="mt-3 text-xl font-black leading-snug text-gray-900 sm:text-2xl">
              {product.name}
            </h1>

            <div className="flex items-center gap-4 pb-4 mt-3 text-xs border-b border-gray-100">
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400">Trạng thái kho:</span>
                <span
                  className={`font-bold ${currentStock > 0 ? "text-green-600" : "text-red-500"}`}
                >
                  {currentStock > 0
                    ? `Còn hàng (${currentStock} sản phẩm)`
                    : "Hết hàng tạm thời"}
                </span>
              </div>
              <div className="w-px h-3 bg-gray-200"></div>
              <div>
                <span className="text-gray-400">Mã thiết bị:</span>
                <span className="ml-1 font-mono text-gray-700">
                  #SKU-{currentItem.id || product.id}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-baseline gap-3 p-4 mt-4 bg-gray-50 rounded-xl">
              <span className="text-2xl font-black text-red-500 sm:text-3xl">
                {formatVND(currentPrice)}
              </span>
              {currentOldPrice && (
                <span className="text-sm text-gray-400 line-through">
                  {formatVND(currentOldPrice)}
                </span>
              )}
            </div>

            {/* HIỂN THỊ CÁC BIẾN THỂ DỮ LIỆU THẬT TỪ BACKEND */}
            {items.length > 1 && (
              <div className="p-4 mt-5 border rounded-xl bg-amber-50/40 border-amber-50">
                <h3 className="mb-2.5 text-xs font-bold tracking-wider text-gray-500 uppercase">
                  Tùy chọn cấu hình
                </h3>
                <div className="flex flex-wrap gap-2">
                  {items.map((item, idx) => (
                    <button
                      type="button"
                      key={item.id || idx}
                      onClick={() => {
                        setSelectedItemIndex(idx);
                        setQuantity(1);
                        setCartMessage("");
                      }}
                      className={`px-3 py-2 border text-xs font-semibold rounded-lg transition-all ${
                        selectedItemIndex === idx
                          ? "border-amber-500 bg-amber-500 text-white shadow-sm"
                          : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
                      }`}
                    >
                      {item.sku || `Phiên bản ${idx + 1}`} (
                      {formatVND(item.price)})
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5">
              <h3 className="mb-2 text-xs font-bold tracking-wider text-gray-400 uppercase">
                Mô tả sản phẩm
              </h3>
              <p className="text-sm leading-relaxed text-gray-600">
                {product.description ||
                  "Thiết bị công nghệ cao cấp chính hãng, sở hữu cấu hình mạnh mẽ đáp ứng toàn diện nhu cầu công việc quay chụp hình ảnh chất lượng cao."}
              </p>
            </div>

            {/* HIỂN THỊ THÔNG SỐ KỸ THUẬT THẬT (TECH SPECS) TỪ BACKEND */}
            {Object.keys(specifications).length > 0 && (
              <div className="p-4 mt-5 border border-gray-100 bg-gray-50 rounded-xl">
                <h3 className="mb-3 text-xs font-bold tracking-wider text-gray-700 uppercase">
                  Thông số kỹ thuật chi tiết
                </h3>
                <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 text-xs">
                  {Object.entries(specifications).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex justify-between py-1 border-b last:border-0 border-gray-200/60"
                    >
                      <span className="capitalize text-gray-400">
                        {key.replace("_", " ")}
                      </span>
                      <span className="font-semibold text-right text-gray-800">
                        {String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-6 mt-8 space-y-4 border-t border-gray-100">
            <div className="flex items-center gap-4">
              <span className="text-sm font-bold text-gray-700">
                Số lượng đặt:
              </span>
              <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50">
                <button
                  disabled={currentStock === 0}
                  onClick={() => handleQuantityChange("decrease", currentStock)}
                  className="p-2 text-gray-600 transition-colors rounded-l-lg hover:bg-gray-200 disabled:opacity-30"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-12 text-sm font-bold text-center text-gray-800">
                  {currentStock === 0 ? 0 : quantity}
                </span>
                <button
                  disabled={currentStock === 0}
                  onClick={() => handleQuantityChange("increase", currentStock)}
                  className="p-2 text-gray-600 transition-colors rounded-r-lg hover:bg-gray-200 disabled:opacity-30"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                disabled={currentStock === 0 || cartAction !== null}
                onClick={() => handleAddToCart(false)}
                className="flex items-center justify-center flex-1 gap-2 px-6 text-sm font-bold text-white transition-all bg-gray-900 shadow-md py-3.5 rounded-xl hover:bg-amber-500 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-gray-900/10"
              >
                <ShoppingCart className="w-4 h-4" />
                {cartAction === "cart" ? "Đang thêm..." : "Thêm vào giỏ hàng"}
              </button>
              <button
                type="button"
                disabled={currentStock === 0 || cartAction !== null}
                onClick={() => handleAddToCart(true)}
                className="flex-1 px-6 text-sm font-bold text-white transition-all shadow-md bg-amber-500 py-3.5 rounded-xl hover:bg-amber-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed shadow-amber-500/10"
              >
                {cartAction === "checkout"
                  ? "Đang xử lý..."
                  : "Mua ngay lập tức"}
              </button>
            </div>
            {cartMessage && (
              <p
                className={`text-sm font-medium ${cartMessage.includes("❌") ? "text-red-500" : "text-green-600"}`}
                role="status"
              >
                {cartMessage}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 pt-6 mt-6 border-t border-gray-100 sm:grid-cols-3 text-[11px] text-gray-500">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>Bảo hành 12 tháng chính hãng</span>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-500 shrink-0" />
              <span>Giao hàng hỏa tốc toàn quốc</span>
            </div>
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 shrink-0 text-amber-500" />
              <span>Đổi trả miễn phí trong 7 ngày</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
