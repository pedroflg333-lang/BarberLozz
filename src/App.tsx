import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Recovery } from './pages/Recovery';
import { Dashboard } from './pages/Dashboard';
import { Assistant } from './pages/Assistant';
import { IaLab } from './pages/IaLab';
import { Calendar } from './pages/Calendar';
import { NewAppointment } from './pages/NewAppointment';
import { Customers } from './pages/Customers';
import { Services } from './pages/Services';
import { Settings } from './pages/Settings';
import { Statistics } from './pages/Statistics';
import { BookingRequests } from './pages/BookingRequests';
import { PublicBooking } from './pages/PublicBooking';
import { Scissors } from 'lucide-react';

// Protected Route Wrapper
const ProtectedRoutes = () => {
  const { user, loading } = useAuthStore();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#111111] flex flex-col items-center justify-center text-white">
        <div className="h-16 w-16 rounded-2xl bg-neutral-900 border-2 border-gold flex items-center justify-center animate-spin">
          <Scissors className="h-8 w-8 text-gold" />
        </div>
        <p className="mt-4 text-lg font-semibold tracking-tight text-neutral-400">
          Cargando BarberLozz...
        </p>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
};

// Public Route Wrapper (prevent logged-in users from seeing login again)
const PublicRoutes = () => {
  const { user, loading } = useAuthStore();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#111111] flex flex-col items-center justify-center text-white">
        <div className="h-16 w-16 rounded-2xl bg-neutral-900 border-2 border-gold flex items-center justify-center animate-spin">
          <Scissors className="h-8 w-8 text-gold" />
        </div>
        <p className="mt-4 text-lg font-semibold tracking-tight text-neutral-400">
          Cargando BarberLozz...
        </p>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

function App() {
  const { init } = useAuthStore();

  useEffect(() => {
    init();
  }, [init]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public auth screens */}
        <Route element={<PublicRoutes />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/recovery" element={<Recovery />} />
        </Route>

        {/* Public booking page (no auth, no Layout) */}
        <Route path="/book/:slug" element={<PublicBooking />} />

        {/* Protected SaaS application screens */}
        <Route element={<ProtectedRoutes />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/lab" element={<IaLab />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/new-appointment" element={<NewAppointment />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/services" element={<Services />} />
          <Route path="/booking-requests" element={<BookingRequests />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/settings" element={<Settings />} />
          
          {/* Default fallback redirects */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
