const ErrorState = ({
  message = "Đã có lỗi xảy ra",
  onRetry,
  compact = false,
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center w-full text-center ${compact ? "py-4" : "min-h-[40vh] p-8"}`}
      role="alert"
      aria-live="assertive"
    >
      <div
        className={`flex items-center justify-center mb-4 bg-red-100 rounded-full ${compact ? "w-10 h-10 mb-2" : "w-16 h-16"}`}
      >
        <svg
          className={`text-red-500 ${compact ? "w-5 h-5" : "w-8 h-8"}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      {!compact && (
        <h3 className="mb-2 text-lg font-bold text-gray-900">
          Không thể tải dữ liệu
        </h3>
      )}
      <p
        className={`max-w-md text-gray-500 ${compact ? "text-xs mb-3" : "mb-6"}`}
      >
        {message}
      </p>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={`font-medium text-white transition-colors rounded-md bg-amber-500 hover:bg-amber-600 ${compact ? "px-3 py-1 text-xs" : "px-6 py-2"}`}
        >
          Thử lại
        </button>
      )}
    </div>
  );
};

export default ErrorState;
