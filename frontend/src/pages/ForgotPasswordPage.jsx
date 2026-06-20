import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Loader2 } from 'lucide-react';
import authApi from '../api/authApi';

const ForgotPasswordPage = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await authApi.requestPasswordReset(email.trim());
      setIsSubmitted(true);
    } catch (requestError) {
      const apiMessage = requestError.data?.email?.[0] || requestError.message;
      setError(apiMessage || 'Không thể gửi email khôi phục mật khẩu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center py-16 bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        {!isSubmitted ? (
          // Form nhập email
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-800">Quên mật khẩu?</h2>
              <p className="mt-2 text-sm text-gray-500">
                Đừng lo lắng! Vui lòng nhập địa chỉ email bạn đã đăng ký, chúng tôi sẽ gửi cho bạn một liên kết để đặt lại mật khẩu.
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700">Email của bạn</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 mt-1 border rounded-md focus:ring-orange-500 focus:border-orange-500"
                  placeholder="email@example.com"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-orange-500 px-4 py-2 font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Gửi email khôi phục
              </button>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </form>
            <div className="text-center text-sm">
              <Link to="/login" className="font-medium text-slate-600 hover:text-orange-500">
                ← Quay lại đăng nhập
              </Link>
            </div>
          </div>
        ) : (
          // Giao diện thông báo thành công
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <Mail className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Kiểm tra email của bạn</h2>
              <p className="mt-2 text-sm text-gray-500">
                Chúng tôi đã gửi hướng dẫn đặt lại mật khẩu tới <br/>
                <span className="font-medium text-slate-800">{email}</span>
              </p>
            </div>
            <Link to={`/reset-password?email=${encodeURIComponent(email)}`} className="block w-full rounded-md bg-gray-900 px-4 py-2 font-semibold text-white">
              Nhập token và đặt mật khẩu mới
            </Link>
            <Link to="/login" className="block text-sm font-medium text-gray-600">Quay lại đăng nhập</Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
