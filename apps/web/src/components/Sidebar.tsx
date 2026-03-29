import { NavLink, useNavigate } from 'react-router-dom';
import { clearToken } from '../lib/auth';
import { setToken } from '../lib/api';

const links = [
  { to: '/jobs', label: 'Jobs' },
  { to: '/vehicles', label: 'Vehicles' },
  { to: '/clients', label: 'Clients' },
];

function Sidebar() {
  const navigate = useNavigate();

  function handleSignOut() {
    clearToken();
    setToken(null);
    void navigate('/login');
  }

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-slate-800 bg-slate-950 px-5 py-6">
      <div className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.35em] text-slate-500">
          Garage OS
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">WrenchLog</h1>
      </div>
      <nav className="flex flex-1 flex-col gap-2">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              [
                'rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors',
                isActive ? 'bg-slate-700 text-white' : 'hover:bg-slate-800 hover:text-white',
              ].join(' ')
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
      <button
        type="button"
        onClick={handleSignOut}
        className="mt-6 rounded-lg border border-slate-800 px-3 py-2 text-left text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
      >
        Sign out
      </button>
    </aside>
  );
}

export default Sidebar;
