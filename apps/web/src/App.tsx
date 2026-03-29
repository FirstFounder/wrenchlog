import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AuthGuard from './components/AuthGuard';
import Layout from './components/Layout';
import ClientCreatePage from './pages/ClientCreatePage';
import ClientDetailPage from './pages/ClientDetailPage';
import ClientsPage from './pages/ClientsPage';
import JobCreatePage from './pages/JobCreatePage';
import JobDetailPage from './pages/JobDetailPage';
import JobsPage from './pages/JobsPage';
import LoginPage from './pages/LoginPage';
import VehicleCreatePage from './pages/VehicleCreatePage';
import VehicleDetailPage from './pages/VehicleDetailPage';
import VehiclesPage from './pages/VehiclesPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AuthGuard />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/jobs" replace />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/jobs/new" element={<JobCreatePage />} />
            <Route path="/jobs/:id" element={<JobDetailPage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/clients/new" element={<ClientCreatePage />} />
            <Route path="/clients/:id" element={<ClientDetailPage />} />
            <Route path="/vehicles" element={<VehiclesPage />} />
            <Route path="/vehicles/new" element={<VehicleCreatePage />} />
            <Route path="/vehicles/:id" element={<VehicleDetailPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
