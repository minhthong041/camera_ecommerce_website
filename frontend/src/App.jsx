import { Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import HomePage from "./pages/HomePage";
import ProductListPage from "./pages/ProductListPage";
import ProductDetailPage from "./pages/ProductDetailPage"; // Import trang chi tiết mới tạo

// 1. Import 4 trang moi
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="products" element={<ProductListPage />} />
        {/* Đăng ký đường dẫn Dynamic parameter (:id) cho trang chi tiết sản phẩm */}
        <Route path="products/:id" element={<ProductDetailPage />} />

        {/* 2. Thêm trang Giỏ hàng và Thanh toán vào trong MainLayout */}
        <Route path="cart" element={<CartPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
      </Route>

      {/* 3. Thêm trang Đăng nhập và Đăng ký nằm NGOÀI MainLayout */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
    </Routes>
  );
}