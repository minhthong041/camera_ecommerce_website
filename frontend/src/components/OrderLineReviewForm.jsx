import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { EyeOff, Pencil, Star, Trash2 } from "lucide-react";
import reviewApi from "../api/reviewApi";

const getError = (error) => String((error?.data && Object.values(error.data).flat().find(Boolean)) || error?.message || "Không thể lưu đánh giá.");

export default function OrderLineReviewForm({ line, orderId }) {
  const queryClient = useQueryClient();
  const review = line.review;
  const [editing, setEditing] = useState(!review);
  const [rating, setRating] = useState(review?.rating || 5);
  const [comment, setComment] = useState(review?.comment || "");
  const [error, setError] = useState("");

  const refresh = (productId) => {
    queryClient.invalidateQueries({ queryKey: ["order", String(orderId)] });
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    if (productId) queryClient.invalidateQueries({ queryKey: ["productReviews", productId] });
  };
  const saveMutation = useMutation({
    mutationFn: () => review ? reviewApi.updateReview(review.id, { rating, comment: comment.trim() }) : reviewApi.createReview({ order_line_id: line.id, rating, comment: comment.trim() }),
    onSuccess: (savedReview) => { setError(""); setEditing(false); refresh(savedReview.product_item?.product_id); },
    onError: (requestError) => setError(getError(requestError)),
  });
  const deleteMutation = useMutation({
    mutationFn: () => reviewApi.deleteReview(review.id),
    onSuccess: () => { setError(""); refresh(line.product_item?.product_id); },
    onError: (requestError) => setError(getError(requestError)),
  });

  if (review && !editing) return <div className="mt-4 border-l-2 border-amber-400 pl-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex gap-1" aria-label={`${review.rating} sao`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} className={`h-4 w-4 ${index < review.rating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />)}</div><p className="mt-2 text-sm text-gray-600">{review.comment || "Bạn không để lại nhận xét."}</p>{!review.is_visible && <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-gray-500"><EyeOff className="h-3.5 w-3.5" /> Đánh giá đang được ẩn khỏi trang sản phẩm</p>}</div><div className="flex gap-1"><button type="button" onClick={() => setEditing(true)} title="Sửa đánh giá" className="p-2 text-gray-700 hover:bg-gray-100"><Pencil className="h-4 w-4" /></button><button type="button" onClick={() => window.confirm("Xóa đánh giá này?") && deleteMutation.mutate()} title="Xóa đánh giá" className="p-2 text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></div></div>{error && <p className="mt-2 text-sm text-red-600">{error}</p>}</div>;

  return <form onSubmit={(event) => { event.preventDefault(); saveMutation.mutate(); }} className="mt-4 space-y-3 border-l-2 border-amber-400 pl-4"><div><p className="mb-2 text-xs font-semibold text-gray-600">Đánh giá sản phẩm</p><div className="flex gap-1">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" onClick={() => setRating(value)} aria-label={`${value} sao`} className="p-0.5"><Star className={`h-6 w-6 ${value <= rating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} /></button>)}</div></div><textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength="2000" rows="3" placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />{error && <p className="text-sm text-red-600">{error}</p>}<div className="flex gap-2"><button disabled={saveMutation.isPending} className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saveMutation.isPending ? "Đang lưu..." : review ? "Cập nhật đánh giá" : "Gửi đánh giá"}</button>{review && <button type="button" onClick={() => setEditing(false)} className="px-3 py-2 text-sm font-semibold text-gray-600">Hủy</button>}</div></form>;
}
