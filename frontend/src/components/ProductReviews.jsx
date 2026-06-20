import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import reviewApi from "../api/reviewApi";

export default function ProductReviews({ productId }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["productReviews", productId],
    queryFn: () => reviewApi.getProductReviews(productId),
    enabled: Boolean(productId),
  });
  const reviews = data?.results || [];

  return (
    <section className="mt-12 border-t border-gray-200 pt-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold text-gray-900">Đánh giá từ khách hàng</h2>
        {!isLoading && <span className="flex items-center gap-1 text-sm font-semibold text-gray-700"><Star className="h-4 w-4 fill-amber-400 text-amber-400" /> {Number(data?.average_rating || 0).toFixed(1)} / 5</span>}
      </div>
      {isLoading && <p className="text-sm text-gray-500">Đang tải đánh giá...</p>}
      {isError && <p className="text-sm text-red-600">Không thể tải đánh giá.</p>}
      <div className="divide-y divide-gray-200">
        {reviews.map((review) => (
          <article key={review.id} className="py-5">
            <div className="flex items-center justify-between gap-3"><strong className="text-sm text-gray-900">{review.user?.display_name}</strong><span className="text-xs text-gray-500">{new Date(review.created_at).toLocaleDateString("vi-VN")}</span></div>
            <div className="my-2 flex gap-0.5" aria-label={`${review.rating} sao`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} className={`h-4 w-4 ${index < review.rating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />)}</div>
            <p className="text-sm leading-6 text-gray-600">{review.comment || "Khách hàng không để lại bình luận."}</p>
          </article>
        ))}
        {!isLoading && reviews.length === 0 && <p className="py-8 text-sm text-gray-500">Sản phẩm chưa có đánh giá.</p>}
      </div>
    </section>
  );
}
