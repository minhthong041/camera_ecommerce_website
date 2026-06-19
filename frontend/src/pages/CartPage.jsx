import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import cartApi from "../api/cartApi";
import LoadingState from "../components/common/LoadingState";
import ErrorState from "../components/common/ErrorState";

const CartPage = () => {
  const queryClient = useQueryClient();

  // 1. LẤY DỮ LIỆU GIỎ HÀNG TỪ API THẬT
  const {
    data: cartData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["cart"],
    queryFn: () => cartApi.getCart(),
  });

  // Backend thường trả về { id, user, items: [...] }, ta trích xuất mảng items
  const cartItems = cartData?.cart_items || [];

  // 2. MUTATION: Xóa sản phẩm khỏi giỏ hàng
  const removeMutation = useMutation({
    mutationFn: (itemId) => cartApi.removeItem(itemId),
    onSuccess: () => {
      // Gọi lại API giỏ hàng để cập nhật giao diện
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
    onError: (error) => {
      alert(
        error.data?.detail || error.message || "Lỗi: Không thể xóa sản phẩm.",
      );
    },
  });

  // 3. MUTATION: Cập nhật số lượng sản phẩm
  const updateQuantityMutation = useMutation({
    mutationFn: ({ itemId, quantity }) =>
      cartApi.updateItemQuantity(itemId, quantity),
    onSuccess: () => {
      // Gọi lại API giỏ hàng để cập nhật giao diện
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
    onError: (error) => {
      alert(
        error.data?.detail ||
          error.message ||
          "Lỗi: Không thể cập nhật số lượng.",
      );
    },
  });

  // 4. Các hàm xử lý giao diện (gọi Mutation tương ứng)
  const handleRemoveItem = (idToRemove) => {
    // Tránh spam click khi đang xóa
    if (removeMutation.isPending) return;
    removeMutation.mutate(idToRemove);
  };

  const handleUpdateQuantity = (item, change) => {
    if (updateQuantityMutation.isPending) return;

    const newQuantity = item.quantity + change;
    // Không cho phép số lượng giảm xuống dưới 1
    if (newQuantity < 1) return;

    updateQuantityMutation.mutate({ itemId: item.id, quantity: newQuantity });
  };

  // 5. TÍNH SUBTOTAL Ở FRONTEND (Theo yêu cầu leader)
  // Tính dựa trên danh sách items thực tế vừa trả về từ server
  const total = cartItems.reduce(
    (acc, item) =>
      acc + (item.product_item?.price || item.price || 0) * item.quantity,
    0,
  );

  // Xử lý các trạng thái tải dữ liệu
  if (isLoading) return <LoadingState message="Đang tải giỏ hàng của bạn..." />;

  if (isError) {
    if (error?.status === 401) {
      return (
        <div className="py-20 text-center">
          <p className="mb-4 text-gray-500">
            Vui lòng đăng nhập để xem giỏ hàng
          </p>
          <Link
            to="/login"
            className="px-6 py-2 font-bold text-white bg-amber-500 rounded-xl hover:bg-amber-600"
          >
            Đăng nhập ngay
          </Link>
        </div>
      );
    }
    return (
      <ErrorState
        message="Lỗi tải giỏ hàng, vui lòng thử lại."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="container max-w-6xl px-4 py-12 mx-auto">
      <h1 className="mb-8 text-2xl font-bold text-slate-800">
        Giỏ hàng của bạn
      </h1>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Danh sách sản phẩm */}
        <div className="w-full lg:w-2/3">
          <div className="overflow-hidden bg-white border rounded-lg shadow-sm">
            {cartItems.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Giỏ hàng của bạn đang trống.
              </div>
            ) : (
              cartItems.map((item) => {
                // Tùy theo cấu trúc backend, dữ liệu sản phẩm có thể bọc trong product_item
                const productData = item.product_item || item;
                const imageUrl =
                  productData.product_image ||
                  productData.product?.image ||
                  productData.image;

                // ĐÃ SỬA LỖI 2: Lấy đúng trường product_name từ serializer
                const productName = productData.product_name;
                const price = productData.price || 0;

                return (
                  <div
                    key={item.id}
                    className="flex items-center p-6 border-b last:border-b-0"
                  >
                    <img
                      src={imageUrl}
                      alt={productName}
                      className="object-cover w-24 h-24 rounded-md"
                    />
                    <div className="flex-1 ml-6">
                      <h3 className="text-lg font-medium text-slate-800">
                        {productName}
                      </h3>
                      {productData.sku && (
                        <p className="text-xs text-gray-400">
                          Phân loại: {productData.sku}
                        </p>
                      )}
                      <p className="mt-1 font-semibold text-orange-600">
                        {Number(price).toLocaleString("vi-VN")} ₫
                      </p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center border border-gray-300 rounded">
                        <button
                          onClick={() => handleUpdateQuantity(item, -1)}
                          disabled={
                            item.quantity <= 1 ||
                            updateQuantityMutation.isPending
                          }
                          className="px-3 py-1 bg-gray-50 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          -
                        </button>
                        <input
                          type="text"
                          value={item.quantity}
                          readOnly
                          className="w-12 text-center border-x"
                        />
                        <button
                          onClick={() => handleUpdateQuantity(item, 1)}
                          // ĐÃ SỬA LỖI 3: Khóa nút nếu quantity >= qty_in_stock
                          disabled={
                            updateQuantityMutation.isPending || 
                            item.quantity >= productData.qty_in_stock
                          }
                          className="px-3 py-1 bg-gray-50 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={removeMutation.isPending}
                        className="text-sm font-medium text-red-500 hover:text-red-700 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {removeMutation.isPending &&
                        removeMutation.variables === item.id
                          ? "Đang xóa..."
                          : "Xóa"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Tóm tắt đơn hàng */}
        <div className="w-full lg:w-1/3">
          <div className="p-6 bg-white border rounded-lg shadow-sm">
            <h3 className="pb-4 mb-4 text-lg font-bold border-b text-slate-800">
              Tóm tắt đơn hàng
            </h3>
            <div className="flex justify-between mb-4 text-slate-600">
              <span>Tạm tính:</span>
              <span className="font-medium text-slate-800">
                {total.toLocaleString("vi-VN")} ₫
              </span>
            </div>
            <Link to="/checkout" className="block w-full">
              <button
                disabled={cartItems.length === 0}
                className="w-full py-3 mt-4 font-semibold text-white transition duration-200 bg-orange-500 rounded-md hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Tiến hành thanh toán
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
