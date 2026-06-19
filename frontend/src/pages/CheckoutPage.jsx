import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import cartApi from "../api/cartApi";
import orderApi from "../api/orderApi";
import LoadingState from "../components/common/LoadingState";
import ErrorState from "../components/common/ErrorState";

// Hàm hỗ trợ đọc lỗi phức tạp từ Django REST Framework (DRF)
const parseDrfError = (errData) => {
  if (typeof errData === "string") return errData;
  if (errData && typeof errData === "object") {
    return Object.entries(errData)
      .map(
        ([key, value]) =>
          `${key}: ${Array.isArray(value) ? value.join(", ") : value}`,
      )
      .join(" | ");
  }
  return "Lỗi không xác định";
};

const CheckoutPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // STATE LƯU ID ĐƯỢC CHỌN (Không lưu string)
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [selectedShippingId, setSelectedShippingId] = useState("");
  const [paymentGateway, setPaymentGateway] = useState("vnpay"); // VNPay hoặc Stripe
  const [formError, setFormError] = useState("");

  // FETCH DỮ LIỆU TỪ BACKEND
  const { data: cartData, isLoading: isCartLoading } = useQuery({
    queryKey: ["cart"],
    queryFn: () => cartApi.getCart(),
  });
  const { data: addressesData, isLoading: isAddrLoading } = useQuery({
    queryKey: ["addresses"],
    queryFn: () => orderApi.getAddresses(),
  });
  const { data: shippingData, isLoading: isShipLoading } = useQuery({
    queryKey: ["shippingMethods"],
    queryFn: () => orderApi.getShippingMethods(),
  });

  const cartItems = cartData?.cart_items || [];
  const addresses = addressesData?.results || addressesData || [];
  const shippingMethods = shippingData?.results || shippingData || [];

  // TÍNH TOÁN TIỀN
  const subTotal = cartItems.reduce(
    (acc, item) =>
      acc + (item.product_item?.price || item.price || 0) * item.quantity,
    0,
  );

  // Lấy phí ship dựa trên ID phương thức user đang chọn (Không hardcode nữa)
  const activeShippingMethod = shippingMethods.find(
    (m) => m.id.toString() === selectedShippingId.toString(),
  );
  const shippingFee = activeShippingMethod
    ? Number(activeShippingMethod.price || activeShippingMethod.fee || 0)
    : 0;
  const finalTotal = subTotal + shippingFee;

  // MUTATION: 1. TẠO ĐƠN HÀNG
  const checkoutMutation = useMutation({
    mutationFn: (payload) => orderApi.checkout(payload),
    onSuccess: (orderResponse) => {
      queryClient.invalidateQueries({ queryKey: ["cart"] }); // Giỏ đã trống

      // Sau khi tạo đơn, gọi tiếp API Payment (Bước 4 của leader)
      const orderCode = orderResponse.order_code || orderResponse.id;
      paymentMutation.mutate({ orderCode, gateway: paymentGateway });
    },
    onError: (error) => {
      setFormError(parseDrfError(error.data) || "Lỗi tạo đơn hàng.");
    },
  });

  // MUTATION: 2. GỌI CỔNG THANH TOÁN
  const paymentMutation = useMutation({
    mutationFn: ({ orderCode, gateway }) =>
      orderApi.createPayment(orderCode, gateway),
    onSuccess: (paymentRes, variables) => {
      if (variables.gateway === "vnpay" && paymentRes.redirect_url) {
        // Chuyển hướng user sang trang thanh toán VNPay
        window.location.href = paymentRes.redirect_url;
      } else {
        // Tạm thời nếu là Stripe hoặc lỗi thiếu URL thì về trang xác nhận
        navigate(`/order-success?order_code=${variables.orderCode}`);
      }
    },
    onError: (error) => {
      setFormError(
        "Tạo đơn thành công nhưng lỗi khởi tạo cổng thanh toán: " +
          (error.data?.detail || ""),
      );
    },
  });

  // SUBMIT FORM (Đã chuyển button vào trong form)
  const handleSubmitOrder = (e) => {
    e.preventDefault();
    setFormError("");

    if (!selectedAddressId)
      return setFormError("Vui lòng chọn địa chỉ giao hàng.");
    if (!selectedShippingId)
      return setFormError("Vui lòng chọn phương thức vận chuyển.");
    if (cartItems.length === 0) return setFormError("Giỏ hàng trống.");

    // Gửi ĐÚNG payload backend cần (Không gửi name, phone, email...)
    checkoutMutation.mutate({
      shipping_address_id: Number(selectedAddressId),
      shipping_method_id: Number(selectedShippingId),
      promotion_code: null, // Hoặc lấy từ state nếu bạn có ô nhập mã giảm giá
    });
  };

  const isLoading = isCartLoading || isAddrLoading || isShipLoading;
  if (isLoading)
    return <LoadingState message="Đang tải thông tin thanh toán..." />;

  return (
    <div className="container max-w-6xl px-4 py-12 mx-auto">
      <h1 className="mb-8 text-2xl font-bold text-slate-800">
        Thanh toán đơn hàng
      </h1>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Form chọn thông tin */}
        <div className="w-full lg:w-2/3">
          <div className="p-6 bg-white border rounded-lg shadow-sm">
            {formError && (
              <div
                className="p-3 mb-6 text-sm text-red-600 bg-red-50 rounded-md border border-red-100"
                role="alert"
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitOrder} className="space-y-6">
              {/* CHỌN ĐỊA CHỈ */}
              <div>
                <h2 className="mb-4 text-lg font-bold text-slate-800">
                  1. Chọn địa chỉ giao hàng
                </h2>
                {addresses.length === 0 ? (
                  <p className="text-sm text-red-500">
                    Bạn chưa có địa chỉ nào. Vui lòng vào trang cá nhân để thêm
                    địa chỉ.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {addresses.map((addr) => (
                      <label
                        key={addr.id}
                        className={`flex items-start p-4 border rounded-lg cursor-pointer ${selectedAddressId === addr.id.toString() ? "border-orange-500 bg-orange-50" : "hover:bg-gray-50"}`}
                      >
                        <input
                          type="radio"
                          name="address"
                          value={addr.id}
                          onChange={(e) => setSelectedAddressId(e.target.value)}
                          className="mt-1 mr-3 accent-orange-500"
                        />
                        <div>
                          <p className="font-semibold text-slate-800">
                            {addr.receiver_name} - {addr.phone_number}
                          </p>
                          <p className="text-sm text-slate-600">
                            {addr.street_address}, {addr.ward}, {addr.district},{" "}
                            {addr.city}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* CHỌN PHƯƠNG THỨC GIAO HÀNG (Dữ liệu thật) */}
              <div className="pt-6 border-t border-gray-100">
                <h2 className="mb-4 text-lg font-bold text-slate-800">
                  2. Đơn vị vận chuyển
                </h2>
                <div className="space-y-3">
                  {shippingMethods.map((method) => (
                    <label
                      key={method.id}
                      className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer ${selectedShippingId === method.id.toString() ? "border-orange-500 bg-orange-50" : "hover:bg-gray-50"}`}
                    >
                      <div className="flex items-center">
                        <input
                          type="radio"
                          name="shipping"
                          value={method.id}
                          onChange={(e) =>
                            setSelectedShippingId(e.target.value)
                          }
                          className="mr-3 accent-orange-500"
                        />
                        <span className="font-medium text-slate-800">
                          {method.name || method.method_name}
                        </span>
                      </div>
                      <span className="font-bold text-orange-600">
                        {Number(method.price || method.fee).toLocaleString(
                          "vi-VN",
                        )}{" "}
                        ₫
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* CHỌN CỔNG THANH TOÁN */}
              <div className="pt-6 border-t border-gray-100">
                <h2 className="mb-4 text-lg font-bold text-slate-800">
                  3. Phương thức thanh toán
                </h2>
                <div className="space-y-3">
                  <label
                    className={`flex items-center p-4 border rounded-lg cursor-pointer ${paymentGateway === "vnpay" ? "border-blue-500 bg-blue-50" : "hover:bg-gray-50"}`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value="vnpay"
                      checked={paymentGateway === "vnpay"}
                      onChange={(e) => setPaymentGateway(e.target.value)}
                      className="mr-3 accent-blue-500"
                    />
                    <span className="font-medium text-slate-800">
                      Thanh toán qua VNPay
                    </span>
                  </label>
                  <label
                    className={`flex items-center p-4 border rounded-lg cursor-pointer ${paymentGateway === "stripe" ? "border-purple-500 bg-purple-50" : "hover:bg-gray-50"}`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value="stripe"
                      checked={paymentGateway === "stripe"}
                      onChange={(e) => setPaymentGateway(e.target.value)}
                      className="mr-3 accent-purple-500"
                    />
                    <span className="font-medium text-slate-800">
                      Thanh toán thẻ quốc tế (Stripe)
                    </span>
                  </label>
                </div>
              </div>

              {/* Nút Submit nằm TRONG form theo yêu cầu leader */}
              <button
                type="submit"
                disabled={
                  checkoutMutation.isPending ||
                  paymentMutation.isPending ||
                  cartItems.length === 0
                }
                className="w-full py-4 mt-6 text-lg font-semibold text-white transition duration-200 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 flex justify-center items-center gap-2 shadow-md"
              >
                {checkoutMutation.isPending || paymentMutation.isPending
                  ? "Đang chuyển hướng đến cổng thanh toán..."
                  : "Tiến hành thanh toán"}
              </button>
            </form>
          </div>
        </div>

        {/* Khối tóm tắt Đơn Hàng (Giữ nguyên giao diện của bạn) */}
        <div className="w-full lg:w-1/3">
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg shadow-sm sticky top-6">
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
                      <span className="font-medium text-slate-800">
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
                      {shippingFee === 0
                        ? "Chưa tính"
                        : `${shippingFee.toLocaleString("vi-VN")} ₫`}
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
