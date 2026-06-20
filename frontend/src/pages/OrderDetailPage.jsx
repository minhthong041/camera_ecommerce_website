import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Package, RotateCcw, Star } from "lucide-react";
import orderApi from "../api/orderApi";
import reviewApi from "../api/reviewApi";
import LoadingState from "../components/common/LoadingState";

const formatCurrency = (value) => Number(value || 0).toLocaleString("vi-VN", { style: "currency", currency: "VND" });
const getError = (error) => String((error?.data && Object.values(error.data).flat().find(Boolean)) || error?.message || "Không thể hoàn tất thao tác.");

export default function OrderDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [returnReason, setReturnReason] = useState("");
  const [reviewDrafts, setReviewDrafts] = useState({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const orderQuery = useQuery({ queryKey: ["order", id], queryFn: () => orderApi.getOrder(id) });
  const returnsQuery = useQuery({ queryKey: ["returns"], queryFn: orderApi.getReturns });
  const order = orderQuery.data;
  const statusName = order?.status_name?.toLowerCase();
  const lines = order?.order_lines || [];
  const existingReturn = (returnsQuery.data?.results || returnsQuery.data || []).find((entry) => entry.order_id === Number(id));

  const refreshOrder = () => {
    queryClient.invalidateQueries({ queryKey: ["order", id] });
    queryClient.invalidateQueries({ queryKey: ["orders"] });
  };
  const cancelMutation = useMutation({
    mutationFn: () => orderApi.cancelOrder(id),
    onSuccess: () => { setMessage("Đơn hàng đã được hủy và tồn kho đã được hoàn lại."); setError(""); refreshOrder(); },
    onError: (requestError) => setError(getError(requestError)),
  });
  const returnMutation = useMutation({
    mutationFn: () => orderApi.createReturn({ order_id: Number(id), reason: returnReason.trim() }),
    onSuccess: () => { setMessage("Yêu cầu đổi trả đã được gửi."); setError(""); setReturnReason(""); queryClient.invalidateQueries({ queryKey: ["returns"] }); },
    onError: (requestError) => setError(getError(requestError)),
  });
  const reviewMutation = useMutation({
    mutationFn: ({ lineId, rating, comment }) => reviewApi.createReview({ order_line_id: lineId, rating, comment }),
    onSuccess: (review) => { setMessage("Đánh giá đã được ghi nhận."); setError(""); queryClient.invalidateQueries({ queryKey: ["productReviews", review.product_item?.product_id] }); },
    onError: (requestError) => setError(getError(requestError)),
  });

  if (orderQuery.isLoading) return <LoadingState message="Đang tải đơn hàng..." />;
  if (orderQuery.isError || !order) return <p className="py-20 text-center text-red-600">Không thể tải đơn hàng.</p>;

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <Link to="/profile/orders" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-gray-600"><ArrowLeft className="h-4 w-4" /> Lịch sử đơn hàng</Link>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 pb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">{order.order_code}</h1><p className="mt-1 text-sm text-gray-500">{new Date(order.created_at).toLocaleString("vi-VN")}</p></div>
        <div className="text-right"><span className="text-sm font-bold uppercase text-orange-700">{order.status_name}</span><p className="mt-1 text-xl font-bold">{formatCurrency(order.total_amount)}</p></div>
      </div>
      <section className="divide-y divide-gray-200">
        {lines.map((line) => {
          const draft = reviewDrafts[line.id] || { rating: 5, comment: "" };
          return (
            <article key={line.id} className="py-5">
              <div className="flex gap-4"><img src={line.product_item?.product_image || "/placeholder-camera.jpg"} alt={line.product_name} className="h-20 w-20 rounded-md object-cover" /><div className="flex-1"><h2 className="font-semibold text-gray-900">{line.product_name}</h2><p className="mt-1 text-sm text-gray-500">SKU: {line.sku} · Số lượng: {line.quantity}</p><p className="mt-2 font-semibold">{formatCurrency(line.line_total)}</p></div></div>
              {statusName === "delivered" && (
                <div className="mt-4 grid gap-3 border-l-2 border-amber-400 pl-4 sm:grid-cols-[120px_1fr_auto]">
                  <label className="text-xs font-semibold text-gray-600">Số sao<select value={draft.rating} onChange={(event) => setReviewDrafts((current) => ({ ...current, [line.id]: { ...draft, rating: Number(event.target.value) } }))} className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2">{[5,4,3,2,1].map((rating) => <option key={rating} value={rating}>{rating} sao</option>)}</select></label>
                  <label className="text-xs font-semibold text-gray-600">Nhận xét<input value={draft.comment} onChange={(event) => setReviewDrafts((current) => ({ ...current, [line.id]: { ...draft, comment: event.target.value } }))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" /></label>
                  <button onClick={() => reviewMutation.mutate({ lineId: line.id, ...draft })} disabled={reviewMutation.isPending} className="mt-auto flex items-center justify-center gap-1 rounded-md border border-amber-400 px-3 py-2 text-sm font-semibold"><Star className="h-4 w-4" /> Gửi</button>
                </div>
              )}
            </article>
          );
        })}
      </section>
      {message && <p className="my-4 text-sm font-medium text-green-700">{message}</p>}
      {error && <p className="my-4 text-sm font-medium text-red-600">{error}</p>}
      {["pending", "confirmed"].includes(statusName) && <button onClick={() => window.confirm("Bạn chắc chắn muốn hủy đơn hàng?") && cancelMutation.mutate()} disabled={cancelMutation.isPending} className="flex items-center gap-2 rounded-md border border-red-300 px-4 py-2 font-semibold text-red-700"><RotateCcw className="h-4 w-4" /> Hủy đơn hàng</button>}
      {statusName === "delivered" && (
        <section className="mt-8 border-t border-gray-200 pt-6">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><Package className="h-5 w-5" /> Yêu cầu đổi trả</h2>
          {existingReturn ? <p className="text-sm text-gray-600">Trạng thái yêu cầu: <strong>{existingReturn.status}</strong></p> : <div className="flex flex-col gap-3 sm:flex-row"><textarea value={returnReason} onChange={(event) => setReturnReason(event.target.value)} placeholder="Mô tả lý do đổi trả" className="min-h-24 flex-1 rounded-md border border-gray-300 px-3 py-2" /><button onClick={() => returnReason.trim() && returnMutation.mutate()} disabled={returnMutation.isPending} className="rounded-md bg-gray-900 px-4 py-2 font-semibold text-white">Gửi yêu cầu</button></div>}
        </section>
      )}
    </main>
  );
}
