import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
// BƯỚC THÊM MỚI 1: Import React Query
import { QueryClient, QueryClientProvider } from '@tanstack/react-query' 
import './index.css'
import App from './App.jsx'

// BƯỚC THÊM MỚI 2: Khởi tạo Query Client với cấu hình mặc định tối ưu
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Không gọi lại API khi chuyển tab trình duyệt
      retry: 1, // Thử lại 1 lần nếu lỗi mạng
      staleTime: 5 * 60 * 1000, // Dữ liệu được coi là mới trong 5 phút
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* BƯỚC THÊM MỚI 3: Bọc QueryClientProvider ra ngoài toàn bộ App */}
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)