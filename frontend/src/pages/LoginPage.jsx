import React from 'react';
import { Link } from 'react-router-dom';

const LoginPage = () => {
  return (
    <div className="flex items-center justify-center py-16 bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-800">Đăng nhập</h2>
          <p className="mt-2 text-sm text-gray-500">Chào mừng bạn trở lại với CameraShop</p>
        </div>
        <form className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              className="w-full px-4 py-2 mt-1 border rounded-md focus:ring-orange-500 focus:border-orange-500"
              placeholder="email@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Mật khẩu</label>
            <input
              type="password"
              className="w-full px-4 py-2 mt-1 border rounded-md focus:ring-orange-500 focus:border-orange-500"
              placeholder="••••••••"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input type="checkbox" className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500" />
              <label className="block ml-2 text-sm text-gray-700">Ghi nhớ tôi</label>
            </div>
            <Link to="/forgot-password" className="text-sm font-medium text-orange-600 hover:text-orange-500">Quên mật khẩu?</Link>
          </div>
          <button
            type="submit"
            className="w-full px-4 py-2 font-semibold text-white transition duration-200 bg-orange-500 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
          >
            Đăng nhập
          </button>
        </form>
        <p className="text-sm text-center text-gray-600">
          Chưa có tài khoản? <Link to="/register" className="font-medium text-orange-600 hover:text-orange-500">Đăng ký ngay</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;