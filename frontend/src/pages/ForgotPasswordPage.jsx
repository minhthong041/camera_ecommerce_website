import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const ForgotPasswordPage = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [email, setEmail] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Ở đây sau này bạn sẽ gọi API gửi email khôi phục. 
    // Tạm thời mình sẽ set state để đổi giao diện thành công.
    if (email) {
      setIsSubmitted(true);
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
                className="w-full px-4 py-2 font-semibold text-white transition duration-200 bg-orange-500 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
              >
                Gửi liên kết khôi phục
              </button>
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
              <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Kiểm tra email của bạn</h2>
              <p className="mt-2 text-sm text-gray-500">
                Chúng tôi đã gửi hướng dẫn đặt lại mật khẩu tới <br/>
                <span className="font-medium text-slate-800">{email}</span>
              </p>
            </div>
            <Link to="/login" className="block w-full">
              <button className="w-full px-4 py-2 font-semibold text-slate-700 transition duration-200 border border-slate-300 rounded-md hover:bg-slate-50">
                Quay lại trang đăng nhập
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;