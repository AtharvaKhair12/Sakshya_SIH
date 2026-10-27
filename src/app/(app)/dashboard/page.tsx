'use client';

import React from 'react';
import { useAuth } from '@/components/auth-context';
import { normalizeRole } from '@/lib/permissions';
import InstitutionDashboard from '@/components/dashboards/InstitutionDashboard';
import ScrutinyDashboard from '@/components/dashboards/ScrutinyDashboard';
import SeniorOfficerDashboard from '@/components/dashboards/SeniorOfficerDashboard';
import AuditorDashboard from '@/components/dashboards/AuditorDashboard';
import AdminDashboard from '@/components/dashboards/AdminDashboard';

export default function DashboardPage() {
  const { user, session } = useAuth();

  if (!user || !session) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-7 h-7 border-2 border-forest-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const role = normalizeRole(session.role);

  switch (role) {
    case 'institution':
      return <InstitutionDashboard session={session} user={user} />;
    case 'scrutiny_officer':
      return <ScrutinyDashboard session={session} user={user} />;
    case 'senior_officer':
      return <SeniorOfficerDashboard session={session} user={user} />;
    case 'auditor':
      return <AuditorDashboard session={session} user={user} />;
    case 'admin':
      return <AdminDashboard session={session} user={user} />;
    default:
      return <InstitutionDashboard session={session} user={user} />;
  }
}
