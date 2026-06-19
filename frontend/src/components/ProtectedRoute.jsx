// src/components/ProtectedRoute.jsx
import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user } = useContext(AuthContext);

  if (!user) {
    // Nếu chưa đăng nhập, chuyển hướng về login
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;