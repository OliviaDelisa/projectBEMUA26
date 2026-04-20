import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, allowedRoles }) {
  const stored = localStorage.getItem("user") || sessionStorage.getItem("user");
  const user = stored ? JSON.parse(stored) : null;

  if (!user) return <Navigate to="/" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === "user") return <Navigate to="/home" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}