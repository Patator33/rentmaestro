import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getToken } from '../lib/storage';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    getToken().then(token => {
      if (!token && location.pathname !== '/login') {
        navigate('/login', { replace: true });
      }
      setChecking(false);
    });
  }, []);

  if (checking) {
    return (
      <div className="min-h-full flex items-center justify-center bg-bg">
        <div className="text-text-muted text-sm">Chargement...</div>
      </div>
    );
  }

  return <>{children}</>;
}
