import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({
  allowedRoles,
  children,
  allowGuest = false,
}) {
  const { user, role } = useAuth();

  // Allow guest users for selected pages
  if (!user && !allowGuest) {
    return <Navigate to="/login" />;
  }

  // If guest is allowed, continue without role checking
  if (!user && allowGuest) {
    return children;
  }

  // Authenticated users must have the required role
  if (
    allowedRoles &&
    !allowedRoles.includes(role)
  ) {
    return <Navigate to="/dashboard" />;
  }

  return children;
}