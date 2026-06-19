import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import cartApi from "../api/cartApi";
import orderApi from "../api/orderApi";
import LoadingState from "../components/common/LoadingState";
import ErrorState from "../components/common/ErrorState";

const CheckoutPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // 1. STATE LƯU THÔNG TIN FORM
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    address: "",
    note: "",
    // Các trường mặc định do leader yêu cầu
    shippingMethod: "standard",
    paymentMethod: "cod",
  });

  const [formError, setFormError] = useState("");

  // 2. LẤY DỮ LIỆU GIỎ HÀNG THẬT
  const {
    data: cartData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["cart"],
    queryFn: () => cartApi.getCart(),
  });

  const cartItems = cartData?.cart_items || [];

  // Tính toán tiền
  const subTotal = cartItems.reduce(
    (acc, item) =>
      acc + (item.product_item?.price || item.price || 0) * item.quantity,
    0,
  );
  // Giả sử phí ship cố định là 50k nếu chọn tiêu chuẩn
  const shippingFee = formData.shippingMethod === "express" ? 100000 : 50000;
  const finalTotal = subTotal + shippingFee;

  // 3. MUTATION: TẠO ĐƠN HÀNG
  const createOrderMutation = useMutation({
    mutationFn: (orderPayload) => orderApi.createOrder(orderPayload),
    onSuccess: () => {
      // Báo cho React Query xóa cache giỏ hàng (vì đã mua xong, giỏ trống)
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      // Chuyển hướng sang trang thành công hoặc trang chủ tùy bạn
      alert("Đặt hàng thành công!");
      navigate("/");
    },
    onError: (error) => {
      setFormError(
        error.data?.detail ||
          error.message ||
          "Lỗi khi tạo đơn hàng. Vui lòng thử lại.",
      );
    },
  });

  // 4. XỬ LÝ SỰ KIỆN
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormError(""); // Xóa lỗi khi user bắt đầu gõ lại
  };

  const handleSubmitOrder = (e) => {
    e.preventDefault(); // Ngăn trình duyệt reload trang

    // Validate cơ bản
    if (!formData.fullName || !formData.phone || !formData.address) {
      setFormError("Vui lòng điền đầy đủ Họ tên, Số điện thoại và Địa chỉ.");
      return;
    }
    if (cartItems.length === 0) {
      setFormError("Giỏ hàng của bạn đang trống.");
      return;
    }

    // Đóng gói dữ liệu để gửi API
    const orderPayload = {
      shipping_address: formData.address,
      phone_number: formData.phone,
      email: formData.email,
      customer_name: formData.fullName,
      notes: formData.note,
      shipping_method: formData.shippingMethod,
      payment_method: formData.paymentMethod,
    };

    createOrderMutation.mutate(orderPayload);
  };

  // 5. RENDER TRẠNG THÁI LOADING/ERROR CỦA GIỎ HÀNG
  if (isLoading)
    return <LoadingState message="Đang chuẩn bị trang thanh toán..." />;
  if (isError)
    return (
      <ErrorState
        message="Lỗi kết nối. Không thể lấy thông tin giỏ hàng."
        onRetry={() => refetch()}
      />
    );

  return (
    <div className="container max-w-6xl px-4 py-12 mx-auto">
      <h1 className="mb-8 text-2xl font-bold text-slate-800">
        Thanh toán đơn hàng
      </h1>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Form thông tin */}
        <div className="w-full lg:w-2/3">
          <div className="p-6 bg-white border rounded-lg shadow-sm">
            <h2 className="mb-6 text-lg font-bold text-slate-800">
              Thông tin giao hàng
            </h2>

            {formError && (
              <div
                className="p-3 mb-6 text-sm text-red-600 bg-red-50 rounded-md border border-red-100"
                role="alert"
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitOrder} className="space-y-5">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Họ và tên <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 mt-1 border rounded-md focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Nguyễn Văn A"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Số điện thoại <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 mt-1 border rounded-md focus:ring-orange-500 focus:border-orange-500"
                    placeholder="09..."
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 mt-1 border rounded-md focus:ring-orange-500 focus:border-orange-500"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Địa chỉ cụ thể <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 mt-1 border rounded-md focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Số nhà, tên đường, phường/xã, quận/huyện..."
                />
              </div>

              {/* CÁC PHƯƠNG THỨC GIAO HÀNG & THANH TOÁN */}
              <div className="grid grid-cols-1 gap-5 pt-4 border-t border-gray-100 md:grid-cols-2">
                <div>
                  <label className="block mb-2 text-sm font-medium text-slate-700">
                    Phương thức giao hàng
                  </label>
                  <select
                    name="shippingMethod"
                    value={formData.shippingMethod}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border rounded-md focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="standard">
                      Giao hàng tiêu chuẩn (50.000đ)
                    </option>
                    <option value="express">
                      Giao hàng hỏa tốc (100.000đ)
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-slate-700">
                    Phương thức thanh toán
                  </label>
                  <select
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border rounded-md focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="cod">Thanh toán khi nhận hàng (COD)</option>
                    <option value="transfer">Chuyển khoản ngân hàng</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Ghi chú
                </label>
                <textarea
                  name="note"
                  value={formData.note}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full px-4 py-2 mt-1 border rounded-md resize-none focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Ghi chú thêm về đơn hàng..."
                ></textarea>
              </div>
            </form>
          </div>
        </div>

        {/* Khối tóm tắt */}
        <div className="w-full lg:w-1/3">
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg shadow-sm">
            <h3 className="pb-4 mb-4 text-lg font-bold border-b border-slate-200 text-slate-800">
              Đơn hàng của bạn
            </h3>

            {cartItems.length === 0 ? (
              <p className="text-sm text-center text-gray-500 py-4">
                Giỏ hàng trống.
              </p>
            ) : (
              <div className="space-y-4">
                {cartItems.map((item) => {
                  const productData = item.product_item || item;
                  const productName =
                    productData.product_name ||
                    productData.product?.name ||
                    "Sản phẩm";
                  const price = productData.price || 0;

                  return (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="pr-4 text-slate-600 line-clamp-2">
                        {productName}{" "}
                        <span className="font-medium text-slate-800">
                          x{item.quantity}
                        </span>
                      </span>
                      <span className="font-medium whitespace-nowrap text-slate-800">
                        {(price * item.quantity).toLocaleString("vi-VN")} ₫
                      </span>
                    </div>
                  );
                })}

                <div className="pt-4 border-t border-slate-200">
                  <div className="flex justify-between mb-2 text-sm text-slate-600">
                    <span>Tạm tính</span>
                    <span className="font-medium text-slate-800">
                      {subTotal.toLocaleString("vi-VN")} ₫
                    </span>
                  </div>
                  <div className="flex justify-between mb-2 text-sm text-slate-600">
                    <span>Phí vận chuyển</span>
                    <span className="font-medium text-slate-800">
                      {shippingFee.toLocaleString("vi-VN")} ₫
                    </span>
                  </div>
                  <div className="flex justify-between pt-4 mt-4 text-lg font-bold border-t border-slate-200">
                    <span className="text-slate-800">Tổng cộng</span>
                    <span className="text-orange-600">
                      {finalTotal.toLocaleString("vi-VN")} ₫
                    </span>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleSubmitOrder}
              disabled={createOrderMutation.isPending || cartItems.length === 0}
              className="w-full py-3 mt-6 font-semibold text-white transition duration-200 rounded-md bg-slate-800 hover:bg-slate-900 disabled:bg-gray-400 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            >
              {createOrderMutation.isPending ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Đang xử lý...
                </>
              ) : (
                "Đặt hàng ngay"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
