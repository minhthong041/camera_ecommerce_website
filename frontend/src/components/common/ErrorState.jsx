// src/components/common/ErrorState.jsx
const ErrorState = ({ message = "Đã có lỗi xảy ra", onRetry }) => {
  return (
    <div className="flex flex-col items-center justify-center w-full min-h-[40vh] p-8 text-center">
      <div className="flex items-center justify-center w-16 h-16 mb-4 bg-red-100 rounded-full">
        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="mb-2 text-lg font-bold text-gray-900">Không thể tải dữ liệu</h3>
      <p className="max-w-md mb-6 text-gray-500">{message}</p>
      
      {/* Nút thử lại nếu có truyền hàm onRetry */}
      {onRetry && (
        <button 
          onClick={onRetry}
          className="px-6 py-2 font-medium text-white transition-colors rounded-md bg-amber-500 hover:bg-amber-600"
        >
          Thử lại
        </button>
      )}
    </div>
  );
};

export default ErrorState;