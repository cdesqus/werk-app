import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import StaffDashboard from './pages/StaffDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminLayout from './components/AdminLayout';
import PlaceholderPage from './pages/PlaceholderPage';
import AdminUsers from './pages/AdminUsers';
import AdminOvertimes from './pages/AdminOvertimes';
import AdminClaims from './pages/AdminClaims';
import AdminPayroll from './pages/AdminPayroll';
import AdminLeaves from './pages/AdminLeaves';
import AdminQuests from './pages/AdminQuests';
import AdminVibeCheck from './pages/AdminVibeCheck';

import { ToastProvider } from './context/ToastContext';

const HomeRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return ['admin', 'super_admin'].includes(user.role) ? <Navigate to="/admin" replace /> : <Navigate to="/staff" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Staff Routes */}
            <Route element={<ProtectedRoute allowedRoles={['staff', 'admin', 'super_admin']} />}>
              <Route element={<Layout />}>
                <Route path="/staff" element={<StaffDashboard />} />
              </Route>
            </Route>

            {/* Admin Routes */}
            <Route element={<ProtectedRoute allowedRoles={['admin', 'super_admin']} />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/leaves" element={<AdminLeaves />} />
                <Route path="/admin/payroll" element={<AdminPayroll />} />
                <Route path="/admin/overtimes" element={<AdminOvertimes />} />
                <Route path="/admin/claims" element={<AdminClaims />} />
                <Route path="/admin/quests" element={<AdminQuests />} />
                <Route path="/admin/vibes" element={<AdminVibeCheck />} />
              </Route>
            </Route>

            {/* Default Redirect */}
            <Route path="/" element={<HomeRedirect />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
