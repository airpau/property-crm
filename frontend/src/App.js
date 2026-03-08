import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ForgotPassword from './components/auth/ForgotPassword';
import Navbar from './components/Navbar';
import PropertyList from './pages/PropertyList';
import PropertyDetail from './pages/PropertyDetail';
import TenantList from './pages/TenantList';
import RentTracker from './pages/RentTracker';
import MTDLanding from './pages/MTDLanding';
import MTDDashboard from './pages/MTDDashboard';
import Reports from './pages/Reports';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <Routes>
            {/* Public routes */}
            <Route path="/mtd" element={<MTDLanding />} />
            
            {/* Public auth routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Protected app routes */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

function AppLayout() {
  return (
    <>
      <Navbar />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<PropertyList />} />
          <Route path="/properties/:id" element={<PropertyDetail />} />
          <Route path="/tenants" element={<TenantList />} />
          <Route path="/rent-tracker" element={<RentTracker />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/mtd-dashboard" element={<MTDDashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}

export default App;
