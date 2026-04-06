import { useRef, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { App as CapApp } from '@capacitor/app';
import AuthGuard from './components/AuthGuard';
import BottomNav from './components/BottomNav';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Rents from './pages/Rents';
import Messages from './pages/Messages';
import Chat from './pages/Chat';
import Incidents from './pages/Incidents';
import Manage from './pages/Manage';
import Buildings from './pages/Buildings';
import BuildingDetail from './pages/BuildingDetail';
import Tenants from './pages/Tenants';
import TenantForm from './pages/TenantForm';
import TenantDetail from './pages/TenantDetail';
import Apartments from './pages/Apartments';
import ApartmentDetail from './pages/ApartmentDetail';
import ApartmentForm from './pages/ApartmentForm';
import Leases from './pages/Leases';
import LeaseDetail from './pages/LeaseDetail';
import LeaseForm from './pages/LeaseForm';
import Companies from './pages/Companies';

const TABS = ['/', '/rents', '/messages', '/incidents', '/manage'];

function AppShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    const handler = CapApp.addListener('backButton', () => {
      const isRootTab = TABS.includes(location.pathname);
      if (isRootTab) {
        if (location.pathname !== '/') navigate('/');
        else CapApp.exitApp();
      } else {
        navigate(-1);
      }
    });
    return () => { handler.then(h => h.remove()); };
  }, [location.pathname, navigate]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;
    const currentIdx = TABS.findIndex(t =>
      t === '/' ? location.pathname === '/' : location.pathname.startsWith(t)
    );
    if (currentIdx === -1) return;
    if (dx < 0 && currentIdx < TABS.length - 1) navigate(TABS[currentIdx + 1]);
    else if (dx > 0 && currentIdx > 0) navigate(TABS[currentIdx - 1]);
  };

  return (
    <div
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {children}
      </div>
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthGuard>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<AppShell><Dashboard /></AppShell>} />
          <Route path="/rents" element={<AppShell><Rents /></AppShell>} />
          <Route path="/messages" element={<AppShell><Messages /></AppShell>} />
          <Route path="/messages/:tenantId" element={<AppShell><Chat /></AppShell>} />
          <Route path="/incidents" element={<AppShell><Incidents /></AppShell>} />
          <Route path="/manage" element={<AppShell><Manage /></AppShell>} />
          <Route path="/buildings" element={<AppShell><Buildings /></AppShell>} />
          <Route path="/buildings/:id" element={<AppShell><BuildingDetail /></AppShell>} />
          <Route path="/tenants" element={<AppShell><Tenants /></AppShell>} />
          <Route path="/tenants/new" element={<AppShell><TenantForm /></AppShell>} />
          <Route path="/tenants/:id" element={<AppShell><TenantDetail /></AppShell>} />
          <Route path="/tenants/:id/edit" element={<AppShell><TenantForm /></AppShell>} />
          <Route path="/apartments" element={<AppShell><Apartments /></AppShell>} />
          <Route path="/apartments/new" element={<AppShell><ApartmentForm /></AppShell>} />
          <Route path="/apartments/:id" element={<AppShell><ApartmentDetail /></AppShell>} />
          <Route path="/apartments/:id/edit" element={<AppShell><ApartmentForm /></AppShell>} />
          <Route path="/companies" element={<AppShell><Companies /></AppShell>} />
          <Route path="/leases" element={<AppShell><Leases /></AppShell>} />
          <Route path="/leases/new" element={<AppShell><LeaseForm /></AppShell>} />
          <Route path="/leases/:id" element={<AppShell><LeaseDetail /></AppShell>} />
          <Route path="/leases/:id/edit" element={<AppShell><LeaseForm /></AppShell>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthGuard>
    </BrowserRouter>
  );
}
