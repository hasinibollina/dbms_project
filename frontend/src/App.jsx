import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Home from './pages/Home';
import Events from './pages/Events';
import Venues from './pages/Venues';
import VenueDetail from './pages/VenueDetail';
import VenueForm from './pages/VenueForm';
import ManageEvents from './pages/ManageEvents';
import ManageVenues from './pages/ManageVenues';
import ManageVendors from './pages/ManageVendors';
import AdminPanel from './pages/AdminPanel';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <div className="min-h-screen flex flex-col bg-sand text-ink selection:bg-wine selection:text-sand font-sans">
            <Navbar />
            <main className="flex-1 flex flex-col">
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Home />} />
                <Route path="/events" element={<Events />} />
                <Route path="/venues" element={<Venues />} />
                <Route path="/venues/:id" element={<VenueDetail />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Organizer & Admin Routes */}
                <Route
                  path="/manage-events"
                  element={
                    <ProtectedRoute organizerOrAdmin={true}>
                      <ManageEvents />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/venues/new"
                  element={
                    <ProtectedRoute organizerOrAdmin={true}>
                      <VenueForm />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/venues/:id/edit"
                  element={
                    <ProtectedRoute organizerOrAdmin={true}>
                      <VenueForm />
                    </ProtectedRoute>
                  }
                />

                {/* Admin Only Routes */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute adminOnly={true}>
                      <AdminPanel />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/venues"
                  element={
                    <ProtectedRoute adminOnly={true}>
                      <ManageVenues />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/vendors"
                  element={
                    <ProtectedRoute adminOnly={true}>
                      <ManageVendors />
                    </ProtectedRoute>
                  }
                />

                {/* Fallback 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
