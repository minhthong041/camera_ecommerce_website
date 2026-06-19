import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle, XCircle } from "lucide-react";

export default function PaymentResultPage() {
  const [searchParams] = useSearchParams();
  
  // Thông thường VNPay trả về vnp_ResponseCode (00 là thành công)
  const vnpResponseCode = searchParams.get("vnp_ResponseCode");
  const isSuccess = vnpResponseCode === "00" || searchParams.get("status") === "success";

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      {isSuccess ? (
        <>
          <CheckCircle className="w-20 h-20 mb-6 text-green-500" />
          <h1 className="mb-2 text-3xl font-black text-gray-800">Thanh toán thành công!</h1>
          <p className="mb-6 text-gray-600">Đơn hàng của bạn đã được ghi nhận và thanh toán.</p>
        </>
      ) : (
        <>
          <XCircle className="w-20 h-20 mb-6 text-red-500" />
          <h1 className="mb-2 text-3xl font-black text-gray-800">Thanh toán thất bại</h1>
          <p className="mb-6 text-gray-600">Giao dịch của bạn bị hủy hoặc đã xảy ra lỗi.</p>
        </>
      )}

      <div className="flex gap-4 mt-4">
        <Link to="/" className="px-6 py-3 font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
          Trang chủ
        </Link>
        <Link to="/profile/orders" className="px-6 py-3 font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600">
          Xem lịch sử đơn hàng
        </Link>
      </div>
    </div>
  );
}