import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Props {
  /** The suffix to append to /drop/:id when redirecting unauthenticated users, e.g. "/view" or "/info" */
  publicSuffix: '/view' | '/info';
  children: React.ReactNode;
}

/**
 * Like ProtectedRoute, but instead of redirecting to /login it redirects
 * unauthenticated users to the public version of the same drop page.
 */
export default function DropAuthRoute({ publicSuffix, children }: Props) {
  const { isAuthenticated, isLoading } = useAuth();
  const { id } = useParams<{ id: string }>();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={`/drop/${id}${publicSuffix}`} replace />;
  }

  return <>{children}</>;
}
