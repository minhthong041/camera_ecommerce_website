import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import App from "./App.jsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // ĐÃ XÓA: staleTime và refetchOnWindowFocus toàn cục

      // ĐÃ SỬA: Logic retry thông minh
      retry: (failureCount, error) => {
        // Không retry nếu là lỗi từ phía người dùng (400, 401, 403, 404...)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Các lỗi khác (lỗi mạng, server sập 5xx) thì thử lại tối đa 1 lần
        return failureCount < 1;
      },
    },
  },
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);