import { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    const result = await login(email, password);
    if (!result.success) {
      setError(result.message);
    }
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-16 bg-gray-50">
      
      {/* 1. THÊM NÚT QUAY LẠI TRANG CHỦ Ở PHÍA TRÊN FORM */}
      <div className="w-full max-w-md mb-4 text-left">
        <Link 
          to="/" 
          className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-orange-500 transition duration-200"
        >
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Quay lại trang chủ
        </Link>
      </div>

      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-800">Đăng nhập</h2>
          <p className="mt-2 text-sm text-gray-500">Chào mừng bạn trở lại với CameraShop</p>
        </div>
        
        {error && <div className="p-3 text-sm text-red-600 bg-red-100 rounded-md">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700">Email hoặc tên đăng nhập</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 mt-1 border rounded-md focus:ring-orange-500 focus:border-orange-500"
              
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-700">Mật khẩu</label>
              <Link to="/forgot-password" className="text-sm font-medium text-orange-600 hover:text-orange-500">
                Quên mật khẩu?
              </Link>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 mt-1 border rounded-md focus:ring-orange-500 focus:border-orange-500"
              
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-2 font-semibold text-white transition bg-orange-500 rounded-md hover:bg-orange-600 disabled:bg-gray-400"
          >
            {isLoading ? 'Đang xử lý...' : 'Đăng nhập'}
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