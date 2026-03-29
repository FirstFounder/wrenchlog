import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Client, listClients } from '../lib/api';

function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const data = await listClients();
        if (active) {
          setClients(data);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load clients');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <p>Loading...</p>;
  }

  if (error) {
    return <p>Error: {error}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-white">Clients</h2>
          <p className="mt-1 text-sm text-slate-400">Customer directory for active and past work.</p>
        </div>
        <Link
          to="/clients/new"
          className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600"
        >
          New Client
        </Link>
      </div>
      <div className="space-y-3">
        {clients.map((client) => (
          <Link
            key={client.id}
            to={`/clients/${client.id}`}
            className="block rounded-xl border border-slate-800 bg-slate-950/70 p-5 hover:border-slate-700"
          >
            <h3 className="text-lg font-semibold text-white">{client.name}</h3>
            <p className="mt-1 text-sm text-slate-300">{client.email || 'No email'}</p>
            <p className="mt-1 text-sm text-slate-400">{client.phone || 'No phone'}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default ClientsPage;
