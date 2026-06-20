const LoadingState = ({ message = "Đang tải dữ liệu...", compact = false }) => {
  return (
    <div
      className={`flex flex-col items-center justify-center w-full ${compact ? "py-6" : "min-h-[40vh] p-8"}`}
      role="status"
      aria-live="polite"
    >
      <div
        className={`border-4 border-gray-200 rounded-full border-t-amber-500 animate-spin ${compact ? "w-6 h-6" : "w-10 h-10"}`}
      ></div>
      <p
        className={`mt-4 font-medium text-gray-500 ${compact ? "text-sm mt-2" : ""}`}
      >
        {message}
      </p>
    </div>
  );
};

export default LoadingState;
