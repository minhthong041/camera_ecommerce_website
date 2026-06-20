import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function StaffRoute({ children }) {
  const { user } = useContext(AuthContext);
  const role = user?.role_name?.toLowerCase();
  if (!user) return <Navigate to="/login" replace />;
  if (!new Set(["admin", "staff"]).has(role)) return <Navigate to="/" replace />;
  return children;
}
