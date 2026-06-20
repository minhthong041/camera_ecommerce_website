import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import cartApi from "../api/cartApi";
import orderApi from "../api/orderApi";
import LoadingState from "../components/common/LoadingState";

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
  const paymentMethodsRaw =
    paymentMethodsData?.results || paymentMethodsData || [];

  // Lọc bỏ phương thức Stripe không dùng tới
  const availablePaymentMethods = paymentMethodsRaw.filter(
    (p) =>
      !p.name?.toLowerCase().includes("stripe") &&
      !p.gateway_name?.toLowerCase().includes("stripe"),
  );

  const currentAddressId =
    selectedAddressId ||
    (addresses.length > 0 ? addresses[0].id.toString() : "");
  const currentShippingId =
    selectedShippingId ||
    (shippingMethods.length > 0 ? shippingMethods[0].id.toString() : "");
  const currentPaymentId =
    selectedPaymentId ||
    (availablePaymentMethods.length > 0
      ? availablePaymentMethods[0].id.toString()
      : "");

  const subTotal = cartItems.reduce(
    (acc, item) =>
      acc + (item.product_item?.price || item.price || 0) * item.quantity,
    0,
  );

  const activeShippingMethod = shippingMethods.find(
    (m) => m.id.toString() === currentShippingId,
  );
  const shippingFee = activeShippingMethod
    ? Number(activeShippingMethod.price || activeShippingMethod.fee || 0)
    : 0;
  const finalTotal = subTotal + shippingFee;

  // Gọi duy nhất 1 API Checkout, backend sẽ tự lo phần Payment
  const checkoutMutation = useMutation({
    mutationFn: (payload) => orderApi.checkout(payload),
    onSuccess: (orderResponse) => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });

      const paymentInfo = orderResponse.payment || {};
      if (paymentInfo.redirect_url) {
        window.location.href = paymentInfo.redirect_url;
      } else {
        navigate("/payment-result?status=success");
      }
    },
    onError: (error) => {
      setFormError(parseDrfError(error.data) || "Lỗi tạo đơn hàng.");
    },
  });

  const handleSubmitOrder = (e) => {
    e.preventDefault();
    setFormError("");

    if (!currentAddressId)
      return setFormError("Vui lòng chọn địa chỉ giao hàng.");
    if (!currentShippingId)
      return setFormError("Vui lòng chọn phương thức vận chuyển.");
    if (!currentPaymentId)
      return setFormError("Vui lòng chọn phương thức thanh toán.");
    if (cartItems.length === 0) return setFormError("Giỏ hàng trống.");

    checkoutMutation.mutate({
      shipping_address_id: Number(currentAddressId),
      shipping_method_id: Number(currentShippingId),
      payment_method_id: Number(currentPaymentId), // Đã bổ sung payment_method_id
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
                        className={`flex items-start p-4 border rounded-lg cursor-pointer ${currentAddressId === addr.id.toString() ? "border-orange-500 bg-orange-50" : "hover:bg-gray-50"}`}
                      >
                        <input
                          type="radio"
                          value={addr.id}
                          checked={currentAddressId === addr.id.toString()}
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
                      className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer ${currentShippingId === method.id.toString() ? "border-orange-500 bg-orange-50" : "hover:bg-gray-50"}`}
                    >
                      <div className="flex items-center">
                        <input
                          type="radio"
                          value={method.id}
                          checked={currentShippingId === method.id.toString()}
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

              {/* THANH TOÁN */}
              <div className="pt-6 border-t border-gray-100">
                <h2 className="mb-4 text-lg font-bold text-slate-800">
                  3. Phương thức thanh toán
                </h2>
                <div className="space-y-3">
                  {availablePaymentMethods.map((method) => (
                    <label
                      key={method.id}
                      className={`flex items-center p-4 border rounded-lg cursor-pointer ${currentPaymentId === method.id.toString() ? "border-blue-500 bg-blue-50" : "hover:bg-gray-50"}`}
                    >
                      <input
                        type="radio"
                        value={method.id}
                        checked={currentPaymentId === method.id.toString()}
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
                disabled={checkoutMutation.isPending || cartItems.length === 0}
                className="w-full py-4 mt-6 text-lg font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:bg-gray-400"
              >
                {checkoutMutation.isPending
                  ? "Đang xử lý..."
                  : "Tiến hành thanh toán"}
              </button>
            </form>
          </div>
        </div>

        {/* TÓM TẮT */}
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
