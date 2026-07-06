import { CoachLayout } from '@/components/layout/CoachLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRole="COACH">
      <CoachLayout>{children}</CoachLayout>
    </ProtectedRoute>
  );
}
