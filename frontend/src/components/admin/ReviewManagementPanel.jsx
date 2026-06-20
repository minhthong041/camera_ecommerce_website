import { useContext, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Star, Trash2 } from "lucide-react";
import adminApi from "../../api/adminApi";
import { AuthContext } from "../../context/AuthContext";
import LoadingState from "../common/LoadingState";

const asList = (value) => value?.results || value || [];

export default function ReviewManagementPanel() {
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role_name?.toLowerCase() === "admin";
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ search: "", rating: "", visibility: "" });
  const [error, setError] = useState("");
  const reviewsQuery = useQuery({
    queryKey: ["adminReviews", filters],
    queryFn: () => adminApi.getReviews({
      search: filters.search || undefined,
      rating: filters.rating || undefined,
      visibility: filters.visibility || undefined,
    }),
  });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["adminReviews"] });
    queryClient.invalidateQueries({ queryKey: ["productReviews"] });
  };
  const visibilityMutation = useMutation({
    mutationFn: ({ id, visible }) => adminApi.updateReviewVisibility(id, visible),
    onSuccess: () => { setError(""); refresh(); },
    onError: (requestError) => setError(requestError.data?.detail || requestError.message),
  });
  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteReview,
    onSuccess: () => { setError(""); refresh(); },
    onError: (requestError) => setError(requestError.data?.detail || requestError.message),
  });

  if (reviewsQuery.isLoading) return <LoadingState message="Đang tải đánh giá..." />;
  const reviews = asList(reviewsQuery.data);

  return <div className="space-y-5">
    <div className="flex flex-wrap gap-3 border-b border-gray-200 pb-4">
      <input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Sản phẩm, khách hàng, mã đơn" className="min-w-64 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm" />
      <select value={filters.rating} onChange={(event) => setFilters((current) => ({ ...current, rating: event.target.value }))} className="rounded-md border border-gray-300 px-3 py-2 text-sm"><option value="">Tất cả số sao</option>{[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} sao</option>)}</select>
      <select value={filters.visibility} onChange={(event) => setFilters((current) => ({ ...current, visibility: event.target.value }))} className="rounded-md border border-gray-300 px-3 py-2 text-sm"><option value="">Tất cả trạng thái</option><option value="visible">Đang hiển thị</option><option value="hidden">Đã ẩn</option></select>
    </div>
    {error && <p className="border-l-4 border-red-500 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    <div className="divide-y divide-gray-200 border-y border-gray-200">
      {reviews.map((review) => <article key={review.id} className="grid gap-4 py-5 lg:grid-cols-[1fr_180px_auto] lg:items-center"><div><div className="flex flex-wrap items-center gap-2"><strong className="text-sm text-gray-900">{review.product_name}</strong><span className={`px-2 py-0.5 text-xs font-semibold ${review.is_visible ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>{review.is_visible ? "Đang hiển thị" : "Đã ẩn"}</span></div><div className="my-2 flex gap-0.5" aria-label={`${review.rating} sao`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} className={`h-4 w-4 ${index < review.rating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />)}</div><p className="text-sm leading-6 text-gray-600">{review.comment || "Không có nhận xét."}</p><p className="mt-2 text-xs text-gray-400">{review.user_name || review.user_email} · {review.order_code} · SKU {review.sku}</p></div><div className="text-xs text-gray-500 lg:text-right">{new Date(review.created_at).toLocaleString("vi-VN")}</div><div className="flex justify-end gap-1"><button type="button" onClick={() => visibilityMutation.mutate({ id: review.id, visible: !review.is_visible })} title={review.is_visible ? "Ẩn đánh giá" : "Hiện đánh giá"} className="p-2 text-gray-700 hover:bg-gray-100">{review.is_visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>{isAdmin && <button type="button" onClick={() => window.confirm("Xóa vĩnh viễn đánh giá này?") && deleteMutation.mutate(review.id)} title="Xóa đánh giá" className="p-2 text-red-700 hover:bg-red-50"><Trash2 className="h-5 w-5" /></button>}</div></article>)}
      {reviews.length === 0 && <p className="py-12 text-center text-sm text-gray-500">Không tìm thấy đánh giá.</p>}
    </div>
  </div>;
}
