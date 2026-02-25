import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ClassList from './pages/ClassList'
import BookingForm from './pages/BookingForm'
import BookingSuccess from './pages/BookingSuccess'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import AdminClassForm from './pages/AdminClassForm'
import AdminClassDetail from './pages/AdminClassDetail'

function AdminRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return isAuthenticated ? children : <Navigate to="/admin/login" />
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<ClassList />} />
      <Route path="/book/:id" element={<BookingForm />} />
      <Route path="/booking-success" element={<BookingSuccess />} />

      {/* Admin routes */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/class/new"
        element={
          <AdminRoute>
            <AdminClassForm />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/class/:id"
        element={
          <AdminRoute>
            <AdminClassDetail />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/class/:id/edit"
        element={
          <AdminRoute>
            <AdminClassForm />
          </AdminRoute>
        }
      />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gradient-to-br from-dark-800 via-dark-900 to-dark-950">
        <AppRoutes />
      </div>
    </AuthProvider>
  )
}
