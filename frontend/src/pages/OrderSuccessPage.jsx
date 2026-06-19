import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle } from "lucide-react";

export default function OrderSuccessPage() {
  const [searchParams] = useSearchParams();
  const orderCode = searchParams.get("order_code");

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <CheckCircle className="w-20 h-20 mb-6 text-green-500" />
      <h1 className="mb-2 text-3xl font-black text-gray-800">
        Đặt hàng thành công!
      </h1>
      <p className="mb-6 text-gray-600">
        Cảm ơn bạn đã mua sắm tại hệ thống của chúng tôi.
      </p>

      {orderCode && (
        <div className="p-4 mb-8 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-500 mb-1">Mã đơn hàng của bạn là:</p>
          <p className="text-xl font-bold tracking-widest text-slate-800">
            #{orderCode}
          </p>
        </div>
      )}

      <div className="flex gap-4">
        <Link
          to="/products"
          className="px-6 py-3 font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Tiếp tục mua sắm
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
