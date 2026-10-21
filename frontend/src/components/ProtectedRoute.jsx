import React, { useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user } = useAuth();
  const location = useLocation();

  // 1. Guest opening /manage-events, /admin, /admin/venues or /admin/vendors -> redirect to /login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const role = user.role?.toLowerCase();

  // 2. Organizer opening any /admin route -> redirect to /manage-events with a toast "Admins only"
  if (adminOnly && role !== 'admin') {
    return (
      <RedirectWithMessage
        to="/manage-events"
        message="Admins only"
        type="error"
      />
    );
  }

  return children;
}

function RedirectWithMessage({ to, message, type = 'error' }) {
  const toast = useToast();
  const firedRef = useRef(false);

  useEffect(() => {
    if (!firedRef.current) {
      firedRef.current = true;
      if (type === 'error') {
        toast.error(message);
      } else {
        toast.info(message);
      }
    }
  }, [toast, message, type]);

  return <Navigate to={to} replace />;
}
