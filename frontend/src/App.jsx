import { Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import MainLayout from "./layouts/MainLayout";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import ProductListPage from "./pages/ProductListPage";
import RegisterPage from "./pages/RegisterPage";
import PaymentResultPage from "./pages/PaymentResultPage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import WishlistPage from "./pages/WishlistPage";
import ProfilePage from "./pages/ProfilePage";
import EditProfilePage from "./pages/EditProfilePage";
import OrderHistoryPage from "./pages/OrderHistoryPage";
import StripePaymentPage from "./pages/StripePaymentPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import AccountSecurityPage from "./pages/AccountSecurityPage";
import AddressManagementPage from "./pages/AddressManagementPage";
import OrderDetailPage from "./pages/OrderDetailPage";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="products" element={<ProductListPage />} />
          <Route path="products/:id" element={<ProductDetailPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="contact" element={<ContactPage />} />

          <Route
            path="cart"
            element={
              <ProtectedRoute>
                <CartPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="checkout"
            element={
              <ProtectedRoute>
                <CheckoutPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="profile/edit"
            element={
              <ProtectedRoute>
                <EditProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="profile/orders"
            element={
              <ProtectedRoute>
                <OrderHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="profile/orders/:id"
            element={
              <ProtectedRoute>
                <OrderDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="profile/security"
            element={
              <ProtectedRoute>
                <AccountSecurityPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="profile/addresses"
            element={
              <ProtectedRoute>
                <AddressManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="payment/stripe"
            element={
              <ProtectedRoute>
                <StripePaymentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="wishlist"
            element={
              <ProtectedRoute>
                <WishlistPage />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/payment-result" element={<PaymentResultPage />} />
      </Routes>
    </AuthProvider>
  );
}
