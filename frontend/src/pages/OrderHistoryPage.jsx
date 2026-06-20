import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import orderApi from "../api/orderApi";
import LoadingState from "../components/common/LoadingState";

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString("vi-VN", {
    style: "currency",
    currency: "VND",
  });

const OrderHistoryPage = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["orders"],
    queryFn: orderApi.getOrders,
  });
  const orders = data?.results || data || [];

  if (isLoading) return <LoadingState message="Đang tải lịch sử đơn hàng..." />;

  if (isError) {
    return (
      <div className="py-20 text-center text-sm font-medium text-red-600">
        Không thể tải lịch sử đơn hàng. Vui lòng thử lại.
      </div>
    );
  }

  return (
    <div className="container max-w-6xl px-4 py-12 mx-auto">
      <h1 className="mb-8 text-2xl font-bold text-slate-800">
        Lịch sử đơn hàng
      </h1>
      {orders.length === 0 ? (
        <div className="p-8 text-center bg-white border border-gray-100 rounded-lg shadow-sm">
          <p className="mb-4 text-gray-500">Bạn chưa có đơn hàng nào.</p>
          <Link to="/products" className="font-semibold text-orange-600">
            Tiếp tục mua sắm
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const lines = order.order_lines || order.lines || [];
            return (
              <article
                key={order.id}
                className="rounded-lg border border-gray-100 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-4">
                  <div>
                    <h2 className="font-bold text-gray-900">
                      {order.order_code}
                    </h2>
                    <p className="mt-1 text-xs text-gray-500">
                      {new Date(order.created_at).toLocaleString("vi-VN")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-orange-600">
                      {formatCurrency(order.total_amount)}
                    </p>
                    <p className="mt-1 text-xs font-semibold uppercase text-gray-500">
                      {order.status_name}
                    </p>
                  </div>
                </div>
                <div className="space-y-2 pt-4">
                  {lines.map((line) => (
                    <div
                      key={line.id}
                      className="flex justify-between gap-4 text-sm text-gray-600"
                    >
                      <span>
                        {line.product_name || line.product_item?.product_name} x
                        {line.quantity}
                      </span>
                      <span>{formatCurrency(line.line_total)}</span>
                    </div>
                  ))}
                </div>
                <Link to={`/profile/orders/${order.id}`} className="mt-4 inline-block text-sm font-semibold text-orange-600">{order.status_name?.toLowerCase() === "delivered" ? "Đánh giá sản phẩm / Xem chi tiết" : "Xem chi tiết"}</Link>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrderHistoryPage;
