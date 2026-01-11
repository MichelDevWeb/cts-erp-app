import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute, GuestOnlyRoute, AdminRoute } from './ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { Login } from '@/pages/Login'
import { Register } from '@/pages/Register'
import { GuestLandingPage } from '@/pages/GuestLandingPage'
import { Dashboard } from '@/pages/Dashboard'
import { OrdersPage } from '@/pages/OrdersPage'
import { OrderDetailPage } from '@/pages/OrderDetailPage'
import { InvoicesPage } from '@/pages/InvoicesPage'
import { ShipmentsPage } from '@/pages/ShipmentsPage'
import { CustomersPage } from '@/pages/CustomersPage'
import { ProductsPage } from '@/pages/ProductsPage'
import { AdminTenantRequestsPage } from '@/pages/AdminTenantRequestsPage'

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Guest onboarding route */}
        <Route
          path="/onboarding"
          element={
            <GuestOnlyRoute>
              <GuestLandingPage />
            </GuestOnlyRoute>
          }
        />

        {/* Protected routes with layout (require tenant) */}
        <Route
          element={
            <ProtectedRoute requireTenant={true}>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/orders/:id" element={<OrderDetailPage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/shipments" element={<ShipmentsPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/products" element={<ProductsPage />} />
          
          {/* Admin routes */}
          <Route
            path="/admin/tenant-requests"
            element={
              <AdminRoute>
                <AdminTenantRequestsPage />
              </AdminRoute>
            }
          />
        </Route>

        {/* Redirect root to dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* Catch all - redirect to dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
