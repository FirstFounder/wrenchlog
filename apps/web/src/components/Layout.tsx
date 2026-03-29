import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

function Layout() {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <Sidebar />
      <main className="h-screen flex-1 overflow-y-auto bg-slate-900 px-6 py-8 md:px-10">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
