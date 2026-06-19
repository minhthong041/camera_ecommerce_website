// src/components/common/LoadingState.jsx
const LoadingState = ({ message = "Đang tải dữ liệu..." }) => {
  return (
    <div className="flex flex-col items-center justify-center w-full min-h-[40vh] p-8">
      {/* Vòng tròn xoay xoay */}
      <div className="w-10 h-10 border-4 border-gray-200 rounded-full border-t-amber-500 animate-spin"></div>
      <p className="mt-4 font-medium text-gray-500">{message}</p>
    </div>
  );
};

export default LoadingState;