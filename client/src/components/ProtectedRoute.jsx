import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ allowedRoles }) => {
    const { user } = useAuth();

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Redirect to appropriate dashboard if role not allowed
        return <Navigate to={user.role === 'admin' ? '/admin' : '/staff'} replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
