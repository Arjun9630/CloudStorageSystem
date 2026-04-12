import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
export function ProtectedRoute({ children }) {
    const { isAuthenticated } = useAuth();
    if (!isAuthenticated) {
        return <Navigate to="/login" replace/>;
    }
    return <>{children}</>;
}
export function AdminProtectedRoute({ children }) {
    const { isAuthenticated, user } = useAuth();
    const location = useLocation();
    if (!isAuthenticated || !user?.isAdmin) {
        // If not authenticated or not admin, redirect to login with admin flag
        return <Navigate to="/login?admin=true" state={{ from: location }} replace/>;
    }
    return <>{children}</>;
}
