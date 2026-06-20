import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, Clock3, XCircle } from "lucide-react";
import orderApi from "../api/orderApi";
import LoadingState from "../components/common/LoadingState";

export default function PaymentResultPage() {
  const location = useLocation();
  const queryString = location.search.substring(1);
  const searchParams = new URLSearchParams(location.search);
  const provider = searchParams.get("provider");
  const orderId = searchParams.get("order_id");
  const isVNPayReturn = Array.from(searchParams.keys()).some((key) =>
    key.startsWith("vnp_"),
  );

  const {
    data: vnpayResult,
    isLoading: isVNPayLoading,
    isError: isVNPayError,
  } = useQuery({
    queryKey: ["verifyVNPay", queryString],
    queryFn: () => orderApi.verifyPayment(queryString),
    enabled: isVNPayReturn,
    retry: 0,
  });

  const {
    data: order,
    isLoading: isOrderLoading,
    isError: isOrderError,
  } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => orderApi.getOrder(orderId),
    enabled: Boolean(orderId && ["cod", "stripe"].includes(provider)),
    refetchInterval: (query) => {
      const statusName = query.state.data?.status_name?.toLowerCase();
      return provider === "stripe" && statusName === "pending" ? 2000 : false;
    },
  });

  if (isVNPayLoading || isOrderLoading)
    return <LoadingState message="Đang xác thực giao dịch từ ngân hàng..." />;

  let result = {
    type: "error",
    title: "Không thể xác nhận thanh toán",
    message: "Thông tin kết quả thanh toán không hợp lệ.",
  };

  if (isVNPayReturn) {
    result = vnpayResult?.is_success
      ? {
          type: "success",
          title: "Thanh toán thành công!",
          message: `Đơn hàng ${vnpayResult.order_code} đã được thanh toán.`,
        }
      : {
          type: "error",
          title: "Thanh toán thất bại",
          message:
            vnpayResult?.Message ||
            (isVNPayError
              ? "Không thể xác thực giao dịch VNPay."
              : "Giao dịch VNPay không thành công."),
        };
  } else if (provider === "cod" && order) {
    result = {
      type: "success",
      title: "Đặt hàng thành công!",
      message: `Đơn hàng ${order.order_code} sẽ được thanh toán khi nhận hàng.`,
    };
  } else if (provider === "stripe" && order) {
    const orderStatus = order.status_name?.toLowerCase();
    if (["processing", "shipping", "delivered"].includes(orderStatus)) {
      result = {
        type: "success",
        title: "Thanh toán thành công!",
        message: `Đơn hàng ${order.order_code} đã được Stripe xác nhận.`,
      };
    } else if (orderStatus === "pending") {
      result = {
        type: "pending",
        title: "Đang xác nhận thanh toán",
        message: "Stripe đang xử lý giao dịch. Trạng thái sẽ tự động cập nhật.",
      };
    } else {
      result = {
        type: "error",
        title: "Thanh toán thất bại",
        message: "Giao dịch Stripe không thành công.",
      };
    }
  } else if (isOrderError) {
    result.message = "Không thể tải trạng thái đơn hàng.";
  }

  const ResultIcon =
    result.type === "success"
      ? CheckCircle
      : result.type === "pending"
        ? Clock3
        : XCircle;
  const iconColor =
    result.type === "success"
      ? "text-green-500"
      : result.type === "pending"
        ? "text-amber-500"
        : "text-red-500";

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <ResultIcon className={`mb-6 h-20 w-20 ${iconColor}`} />
      <h1 className="mb-2 text-3xl font-black text-gray-800">
        {result.title}
      </h1>
      <p className="mb-6 text-gray-600">{result.message}</p>

      <div className="flex gap-4 mt-4">
        <Link
          to="/"
          className="px-6 py-3 font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Trang chủ
        </Link>
        <Link
          to="/profile/orders"
          className="px-6 py-3 font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600"
        >
          Xem lịch sử đơn hàng
        </Link>
      </div>
    </div>
  );
}
