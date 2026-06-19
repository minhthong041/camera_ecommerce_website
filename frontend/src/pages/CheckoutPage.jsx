import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import cartApi from "../api/cartApi";
import orderApi from "../api/orderApi";
import LoadingState from "../components/common/LoadingState";
import ErrorState from "../components/common/ErrorState";

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

// Hàm format địa chỉ chuẩn theo yêu cầu của Leader
const formatAddress = (address) => {
  if (!address) return "";
  return [
    address.address_line1,
    address.address_line2,
    address.ward?.name,
    address.ward?.district?.name,
    address.ward?.district?.city?.name,
  ]
    .filter(Boolean)
    .join(", ");
};

const CheckoutPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [selectedShippingId, setSelectedShippingId] = useState("");
  const [selectedPaymentId, setSelectedPaymentId] = useState("");
  const [formError, setFormError] = useState("");

  // FETCH DỮ LIỆU
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
  const { data: paymentMethodsData, isLoading: isPaymentLoading } = useQuery({
    queryKey: ["paymentMethods"],
    queryFn: () => orderApi.getPaymentMethods(),
  });

  const cartItems = cartData?.cart_items || [];
  const addresses = addressesData?.results || addressesData || [];
  const shippingMethods = shippingData?.results || shippingData || [];
  const paymentMethods =
    paymentMethodsData?.results || paymentMethodsData || [];

  // Tự động chọn giá trị mặc định đầu tiên nếu có dữ liệu
  useEffect(() => {
    if (addresses.length > 0 && !selectedAddressId)
      setSelectedAddressId(addresses[0].id.toString());
    if (shippingMethods.length > 0 && !selectedShippingId)
      setSelectedShippingId(shippingMethods[0].id.toString());
    if (paymentMethods.length > 0 && !selectedPaymentId)
      setSelectedPaymentId(paymentMethods[0].id.toString());
  }, [
    addresses,
    shippingMethods,
    paymentMethods,
    selectedAddressId,
    selectedShippingId,
    selectedPaymentId,
  ]);

  const subTotal = cartItems.reduce(
    (acc, item) =>
      acc + (item.product_item?.price || item.price || 0) * item.quantity,
    0,
  );

  const activeShippingMethod = shippingMethods.find(
    (m) => m.id.toString() === selectedShippingId.toString(),
  );
  const shippingFee = activeShippingMethod
    ? Number(activeShippingMethod.price || activeShippingMethod.fee || 0)
    : 0;
  const finalTotal = subTotal + shippingFee;

  // MUTATION 1: TẠO ĐƠN
  const checkoutMutation = useMutation({
    mutationFn: (payload) => orderApi.checkout(payload),
    onSuccess: (orderResponse) => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      // Lấy ID trả về để truyền cho hàm Payment
      const orderId = orderResponse.id;
      paymentMutation.mutate({
        orderId,
        paymentMethodId: Number(selectedPaymentId),
      });
    },
    onError: (error) => {
      setFormError(parseDrfError(error.data) || "Lỗi tạo đơn hàng.");
    },
  });

  // MUTATION 2: TẠO THANH TOÁN
  const paymentMutation = useMutation({
    mutationFn: ({ orderId, paymentMethodId }) =>
      orderApi.createPayment({ orderId, paymentMethodId }),
    onSuccess: (paymentRes) => {
      // Chuyển hướng VNPay nếu có redirect_url, ngược lại chuyển sang trang kết quả
      if (paymentRes.redirect_url) {
        window.location.href = paymentRes.redirect_url;
      } else {
        navigate("/payment-result?status=success");
      }
    },
    onError: (error) => {
      setFormError(
        "Tạo đơn thành công nhưng lỗi thanh toán: " +
          (error.data?.detail || "Vui lòng thử lại trong lịch sử đơn hàng."),
      );
    },
  });

  const handleSubmitOrder = (e) => {
    e.preventDefault();
    setFormError("");

    if (!selectedAddressId)
      return setFormError("Vui lòng chọn địa chỉ giao hàng.");
    if (!selectedShippingId)
      return setFormError("Vui lòng chọn phương thức vận chuyển.");
    if (!selectedPaymentId)
      return setFormError("Vui lòng chọn phương thức thanh toán.");
    if (cartItems.length === 0) return setFormError("Giỏ hàng trống.");

    checkoutMutation.mutate({
      shipping_address_id: Number(selectedAddressId),
      shipping_method_id: Number(selectedShippingId),
      promotion_code: null,
    });
  };

  const isLoading =
    isCartLoading || isAddrLoading || isShipLoading || isPaymentLoading;
  if (isLoading)
    return <LoadingState message="Đang tải thông tin thanh toán..." />;

  return (
    <div className="container max-w-6xl px-4 py-12 mx-auto">
      <h1 className="mb-8 text-2xl font-bold text-slate-800">
        Thanh toán đơn hàng
      </h1>
      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="w-full lg:w-2/3">
          <div className="p-6 bg-white border rounded-lg shadow-sm">
            {formError && (
              <div className="p-3 mb-6 text-sm text-red-600 bg-red-50 rounded-md border border-red-100">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitOrder} className="space-y-6">
              {/* ĐỊA CHỈ */}
              <div>
                <h2 className="mb-4 text-lg font-bold text-slate-800">
                  1. Chọn địa chỉ giao hàng
                </h2>
                {addresses.length === 0 ? (
                  <p className="text-sm text-red-500">
                    Bạn chưa có địa chỉ. Vui lòng thêm trong trang cá nhân.
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
                          value={addr.id}
                          checked={selectedAddressId === addr.id.toString()}
                          onChange={(e) => setSelectedAddressId(e.target.value)}
                          className="mt-1 mr-3 accent-orange-500"
                        />
                        <div>
                          <p className="font-semibold text-slate-800">
                            {addr.receiver_name} - {addr.phone_number}
                          </p>
                          <p className="text-sm text-slate-600">
                            {formatAddress(addr)}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* VẬN CHUYỂN */}
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
                          value={method.id}
                          checked={selectedShippingId === method.id.toString()}
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

              {/* THANH TOÁN (Render linh động từ backend, tạm ẩn Stripe nếu có) */}
              <div className="pt-6 border-t border-gray-100">
                <h2 className="mb-4 text-lg font-bold text-slate-800">
                  3. Phương thức thanh toán
                </h2>
                <div className="space-y-3">
                  {paymentMethods
                    .filter((p) => !p.name?.toLowerCase().includes("stripe"))
                    .map((method) => (
                      <label
                        key={method.id}
                        className={`flex items-center p-4 border rounded-lg cursor-pointer ${selectedPaymentId === method.id.toString() ? "border-blue-500 bg-blue-50" : "hover:bg-gray-50"}`}
                      >
                        <input
                          type="radio"
                          value={method.id}
                          checked={selectedPaymentId === method.id.toString()}
                          onChange={(e) => setSelectedPaymentId(e.target.value)}
                          className="mr-3 accent-blue-500"
                        />
                        <span className="font-medium text-slate-800">
                          {method.name || method.gateway_name}
                        </span>
                      </label>
                    ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={
                  checkoutMutation.isPending ||
                  paymentMutation.isPending ||
                  cartItems.length === 0
                }
                className="w-full py-4 mt-6 text-lg font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:bg-gray-400"
              >
                {checkoutMutation.isPending || paymentMutation.isPending
                  ? "Đang xử lý..."
                  : "Tiến hành thanh toán"}
              </button>
            </form>
          </div>
        </div>

        {/* TÓM TẮT ĐƠN HÀNG */}
        <div className="w-full lg:w-1/3">
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg shadow-sm sticky top-6">
            <h3 className="pb-4 mb-4 text-lg font-bold border-b border-slate-200 text-slate-800">
              Đơn hàng của bạn
            </h3>
            {cartItems.map((item) => {
              const productData = item.product_item || item;
              return (
                <div
                  key={item.id}
                  className="flex justify-between text-sm mb-4"
                >
                  <span className="pr-4 text-slate-600 line-clamp-2">
                    {productData.product_name || productData.product?.name}{" "}
                    <span className="font-medium text-slate-800">
                      x{item.quantity}
                    </span>
                  </span>
                  <span className="font-medium text-slate-800">
                    {((productData.price || 0) * item.quantity).toLocaleString(
                      "vi-VN",
                    )}{" "}
                    ₫
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
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
