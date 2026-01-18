import ForceChangePassword from './pages/Auth/ForceChangePassword';

// ... (imports)

// Simple wrapper to check auth but NOT password status (to avoid loops)
const RequireAuth = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null; // or spinner
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// ... (HomeRedirect)

function App() {
  return (
    <BrowserRouter>
      {/* ... */}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/force-change-password" element={
          <RequireAuth>
            <ForceChangePassword />
          </RequireAuth>
        } />

        {/* Staff Routes */}
        {/* ... */}
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
            <Route path="/admin/attendance" element={<AdminAttendance />} />
            <Route path="/admin/logs" element={<AdminAuditLogs />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
          </Route>
        </Route>

        {/* Default Redirect */}
        <Route path="/" element={<HomeRedirect />} />
      </Routes>
    </ToastProvider>
      </AuthProvider >
    </BrowserRouter >
  );
}

export default App;
