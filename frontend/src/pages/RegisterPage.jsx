import { Link } from "react-router-dom";

const RegisterPage = () => {
  return (
    <div className="flex items-center justify-center py-16 bg-gray-50">
      <div className="w-full max-w-xl p-8 bg-white rounded-lg shadow-md">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-slate-800">Tạo tài khoản</h2>
          <p className="mt-2 text-sm text-gray-500">
            Đăng ký để nhận nhiều ưu đãi từ CameraShop
          </p>
        </div>

        <form className="space-y-4">
          {/* Tên đăng nhập */}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Tên đăng nhập (Username)
            </label>
            <input
              type="text"
              className="w-full px-4 py-2 mt-1 border rounded-md focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          {/* Họ và tên */}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Họ và tên
            </label>
            <input
              type="text"
              className="w-full px-4 py-2 mt-1 border rounded-md focus:ring-orange-500 focus:border-orange-500"
              placeholder="Nguyen Van A"
            />
          </div>

          {/* Email và Số điện thoại (Chia 2 cột) */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                type="email"
                className="w-full px-4 py-2 mt-1 border rounded-md focus:ring-orange-500 focus:border-orange-500"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Số điện thoại
              </label>
              <input
                type="tel"
                className="w-full px-4 py-2 mt-1 border rounded-md focus:ring-orange-500 focus:border-orange-500"
                placeholder="84+"
              />
            </div>
          </div>

          {/* Ngày sinh */}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Ngày sinh
            </label>
            <input
              type="date"
              className="w-full px-4 py-2 mt-1 border rounded-md focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          {/* Mật khẩu và Xác nhận mật khẩu (Chia 2 cột) */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Mật khẩu
              </label>
              <input
                type="password"
                className="w-full px-4 py-2 mt-1 border rounded-md focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Xác nhận mật khẩu
              </label>
              <input
                type="password"
                className="w-full px-4 py-2 mt-1 border rounded-md focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full px-4 py-2 mt-6 font-semibold text-white transition duration-200 rounded-md bg-slate-800 hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:ring-offset-2"
          >
            Đăng ký tài khoản
          </button>
        </form>

        <p className="mt-6 text-sm text-center text-gray-600">
          Đã có tài khoản?{" "}
          <Link
            to="/login"
            className="font-medium text-orange-600 hover:text-orange-500"
          >
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
