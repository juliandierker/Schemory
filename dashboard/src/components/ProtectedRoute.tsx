import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: JSX.Element;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { sessionToken } = useAuth();

  if (!sessionToken) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
