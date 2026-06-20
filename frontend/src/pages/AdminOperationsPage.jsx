import { useContext, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, Boxes, ClipboardList, PackageCheck, RotateCcw, Tags, Users } from "lucide-react";
import adminApi from "../api/adminApi";
import LoadingState from "../components/common/LoadingState";
import { AuthContext } from "../context/AuthContext";
import AccountManagementPanel from "../components/admin/AccountManagementPanel";
import CatalogManagementPanel from "../components/admin/CatalogManagementPanel";
import PromotionsManagementPanel from "../components/admin/PromotionsManagementPanel";
import StatisticsPanel from "../components/admin/StatisticsPanel";

const asList = (value) => value?.results || value || [];
const ORDER_STATUSES = ["pending", "confirmed", "processing", "shipping", "delivered", "cancelled", "refunded"];

function OrdersPanel() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const ordersQuery = useQuery({ queryKey: ["adminOrders", statusFilter, search], queryFn: () => adminApi.getOrders({ status: statusFilter || undefined, search: search || undefined }) });
  const mutation = useMutation({ mutationFn: ({ id, status }) => adminApi.updateOrderStatus(id, status), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adminOrders"] }) });
  if (ordersQuery.isLoading) return <LoadingState message="Đang tải đơn hàng..." />;
  return <div><div className="mb-4 flex flex-wrap gap-3"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm mã đơn" className="rounded-md border border-gray-300 px-3 py-2 text-sm" /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm"><option value="">Tất cả trạng thái</option>{ORDER_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-y border-gray-200 bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-3 py-3">Mã đơn</th><th className="px-3 py-3">Khách hàng</th><th className="px-3 py-3">Tổng tiền</th><th className="px-3 py-3">Trạng thái</th><th className="px-3 py-3">Cập nhật</th></tr></thead><tbody className="divide-y divide-gray-200">{asList(ordersQuery.data).map((order) => <tr key={order.id}><td className="px-3 py-3 font-semibold">{order.order_code}</td><td className="px-3 py-3">#{order.user_id}</td><td className="px-3 py-3">{Number(order.total_amount).toLocaleString("vi-VN")} đ</td><td className="px-3 py-3 uppercase">{order.status_name}</td><td className="px-3 py-3"><select defaultValue={order.status_name?.toLowerCase()} onChange={(event) => mutation.mutate({ id: order.id, status: event.target.value })} className="rounded-md border border-gray-300 px-2 py-1">{ORDER_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></td></tr>)}</tbody></table></div></div>;
}

function ReturnsPanel() {
  const queryClient = useQueryClient();
  const returnsQuery = useQuery({ queryKey: ["adminReturns"], queryFn: adminApi.getReturns });
  const mutation = useMutation({ mutationFn: ({ id, status }) => adminApi.updateReturnStatus(id, status), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["adminReturns"] }); queryClient.invalidateQueries({ queryKey: ["adminOrders"] }); } });
  if (returnsQuery.isLoading) return <LoadingState message="Đang tải yêu cầu đổi trả..." />;
  return <div className="divide-y divide-gray-200 border-y border-gray-200">{asList(returnsQuery.data).map((request) => <article key={request.id} className="grid gap-3 py-5 md:grid-cols-[160px_1fr_140px_auto]"><div><strong>{request.order_code}</strong><p className="text-xs text-gray-500">{request.user_email}</p></div><p className="text-sm text-gray-700">{request.reason}</p><span className="text-sm font-semibold uppercase">{request.status}</span><div className="flex gap-2">{request.status?.toLowerCase() === "pending" && <><button onClick={() => mutation.mutate({ id: request.id, status: "Approved" })} className="rounded-md bg-green-700 px-3 py-2 text-xs font-semibold text-white">Duyệt</button><button onClick={() => mutation.mutate({ id: request.id, status: "Rejected" })} className="rounded-md border border-red-300 px-3 py-2 text-xs font-semibold text-red-700">Từ chối</button></>}</div></article>)}{asList(returnsQuery.data).length === 0 && <p className="py-10 text-center text-sm text-gray-500">Không có yêu cầu đổi trả.</p>}</div>;
}

function InventoryPanel() {
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState({});
  const itemsQuery = useQuery({ queryKey: ["adminProductItems"], queryFn: adminApi.getProductItems });
  const ledgerQuery = useQuery({ queryKey: ["inventoryLedger"], queryFn: () => adminApi.getInventoryLedger({ page_size: 20 }) });
  const mutation = useMutation({ mutationFn: ({ id, quantity }) => adminApi.updateStock(id, quantity, "Updated from operations dashboard"), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["adminProductItems"] }); queryClient.invalidateQueries({ queryKey: ["inventoryLedger"] }); } });
  if (itemsQuery.isLoading) return <LoadingState message="Đang tải tồn kho..." />;
  return <div className="grid gap-8 lg:grid-cols-2"><section><h2 className="mb-3 font-bold">Tồn kho SKU</h2><div className="divide-y divide-gray-200 border-y border-gray-200">{asList(itemsQuery.data).map((item) => <div key={item.id} className="grid grid-cols-[1fr_90px_auto] items-center gap-3 py-3"><div><strong className="text-sm">{item.sku}</strong><p className="text-xs text-gray-500">{item.product_name}</p></div><input type="number" min="0" value={drafts[item.id] ?? item.qty_in_stock} onChange={(event) => setDrafts((current) => ({ ...current, [item.id]: event.target.value }))} className="w-full rounded-md border border-gray-300 px-2 py-1" /><button onClick={() => mutation.mutate({ id: item.id, quantity: Number(drafts[item.id] ?? item.qty_in_stock) })} className="rounded-md bg-gray-900 px-3 py-2 text-xs font-semibold text-white">Lưu</button></div>)}</div></section><section><h2 className="mb-3 font-bold">Biến động gần nhất</h2><div className="divide-y divide-gray-200 border-y border-gray-200">{asList(ledgerQuery.data).map((entry) => <div key={entry.id} className="flex justify-between gap-3 py-3 text-sm"><div><strong>{entry.sku}</strong><p className="text-xs text-gray-500">{entry.reason} · {entry.note}</p></div><span className={entry.quantity_change > 0 ? "font-bold text-green-700" : "font-bold text-red-600"}>{entry.quantity_change > 0 ? "+" : ""}{entry.quantity_change}</span></div>)}</div></section></div>;
}

export default function AdminOperationsPage() {
  const { user } = useContext(AuthContext);
  const [tab, setTab] = useState("orders");
  const isAdmin = user?.role_name?.toLowerCase() === "admin";
  const sharedTabs = [
    { id: "orders", label: "Đơn hàng", icon: ClipboardList },
    { id: "returns", label: "Đổi trả", icon: RotateCcw },
    { id: "inventory", label: "Tồn kho", icon: PackageCheck },
    { id: "catalog", label: "Catalog", icon: Boxes },
    { id: "customers", label: "Khách hàng", icon: Users },
  ];
  const adminTabs = [
    { id: "statistics", label: "Thống kê", icon: BarChart3 },
    { id: "promotions", label: "Khuyến mãi", icon: Tags },
    { id: "employees", label: "Nhân viên", icon: Users },
  ];
  const tabs = isAdmin ? [...adminTabs, ...sharedTabs] : sharedTabs;

  return <main className="mx-auto max-w-7xl px-4 py-10"><div className="mb-6"><h1 className="text-2xl font-bold text-gray-900">Vận hành cửa hàng</h1><p className="mt-1 text-sm text-gray-500">Quyền hiện tại: <strong>{user?.role_name}</strong></p></div><div className="mb-6 flex overflow-x-auto border-b border-gray-200">{tabs.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setTab(id)} className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold ${tab === id ? "border-orange-600 text-orange-700" : "border-transparent text-gray-500"}`}><Icon className="h-4 w-4" /> {label}</button>)}</div>{tab === "statistics" && isAdmin && <StatisticsPanel />}{tab === "promotions" && isAdmin && <PromotionsManagementPanel />}{tab === "employees" && isAdmin && <AccountManagementPanel type="employees" />}{tab === "orders" && <OrdersPanel />}{tab === "returns" && <ReturnsPanel />}{tab === "inventory" && <InventoryPanel />}{tab === "catalog" && <CatalogManagementPanel />}{tab === "customers" && <AccountManagementPanel type="customers" />}</main>;
}
