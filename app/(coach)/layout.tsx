import { CoachLayout } from '@/components/layout/CoachLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { STAFF_ROLES } from '@/constants/roles';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={STAFF_ROLES}>
      <CoachLayout>{children}</CoachLayout>
    </ProtectedRoute>
  );
}
