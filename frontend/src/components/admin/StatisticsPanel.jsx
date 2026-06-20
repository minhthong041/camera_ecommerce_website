import { useQuery } from "@tanstack/react-query";
import adminApi from "../../api/adminApi";
import LoadingState from "../common/LoadingState";

const money = (value) => Number(value || 0).toLocaleString("vi-VN", { style: "currency", currency: "VND" });

export default function StatisticsPanel() {
  const { data, isLoading, isError } = useQuery({ queryKey: ["businessStatistics"], queryFn: adminApi.getStatistics });
  if (isLoading) return <LoadingState message="Đang tổng hợp số liệu..." />;
  if (isError) return <p className="text-sm text-red-600">Không thể tải thống kê.</p>;
  const metrics = [{ label: "Doanh thu", value: money(data.revenue) }, { label: "Doanh thu hôm nay", value: money(data.revenue_today) }, { label: "Tổng đơn", value: data.orders }, { label: "Đơn hôm nay", value: data.orders_today }, { label: "Khách hàng hoạt động", value: data.active_customers }, { label: "Nhân viên", value: data.employees }, { label: "Sản phẩm đang bán", value: data.active_products }, { label: "SKU sắp hết", value: data.low_stock_items }];
  return <div className="space-y-8"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{metrics.map((metric) => <article key={metric.label} className="border-l-4 border-orange-500 bg-gray-50 p-4"><p className="text-xs font-semibold uppercase text-gray-500">{metric.label}</p><p className="mt-2 text-xl font-bold text-gray-900">{metric.value}</p></article>)}</div><section><h2 className="mb-3 font-bold">Đơn hàng theo trạng thái</h2><div className="divide-y border-y">{Object.entries(data.order_status_counts || {}).map(([status, count]) => <div key={status} className="flex justify-between py-3 text-sm"><span className="uppercase text-gray-600">{status}</span><strong>{count}</strong></div>)}</div></section></div>;
}
