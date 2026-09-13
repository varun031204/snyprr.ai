import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../state/useAuthStore';
import { UserRole } from '../../types';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallbackPath?: string;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  allowedRoles,
  fallbackPath = '/dashboard',
}) => {
  const { activeRole } = useAuthStore();

  if (!allowedRoles.includes(activeRole)) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};
