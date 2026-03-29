import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Client, VehicleWithClient, deleteClient, getClient, listVehicles, updateClient } from '../lib/api';

function formatVehicle(vehicle: VehicleWithClient): string {
  return [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ') || 'Unnamed vehicle';
}

function ClientDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [vehicles, setVehicles] = useState<VehicleWithClient[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const [clientData, vehicleData] = await Promise.all([getClient(id), listVehicles({ clientId: id })]);
        if (!active) {
          return;
        }
        setClient(clientData);
        setVehicles(vehicleData);
        setName(clientData.name);
        setEmail(clientData.email ?? '');
        setPhone(clientData.phone ?? '');
        setNotes(clientData.notes ?? '');
        setError(null);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load client');
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
  }, [id]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const updated = await updateClient(id, { name, email, phone, notes });
      setClient(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update client');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this client?')) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      await deleteClient(id);
      navigate('/clients');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete client');
      setDeleting(false);
    }
  }

  if (loading) {
    return <p>Loading...</p>;
  }

  if (error && !client) {
    return <p>Error: {error}</p>;
  }

  if (!client) {
    return <p>Error: Not found</p>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-3xl font-semibold tracking-tight text-white">{client.name}</h2>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="rounded-lg border border-red-500/50 px-4 py-2 text-sm font-medium text-red-200 disabled:opacity-60"
        >
          Delete
        </button>
      </div>
      {error ? <p>Error: {error}</p> : null}
      <form onSubmit={handleSave} className="space-y-5 rounded-xl border border-slate-800 bg-slate-950/70 p-6">
        <label className="block space-y-2">
          <span className="text-sm text-slate-300">Name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            required
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-slate-300">Email</span>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-slate-300">Phone</span>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-slate-300">Notes</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={6}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          Save Changes
        </button>
      </form>
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-xl font-semibold text-white">Vehicles</h3>
          <Link to="/vehicles/new" className="text-sm text-slate-400 hover:text-white">
            Add Vehicle
          </Link>
        </div>
        <div className="space-y-3">
          {vehicles.map((vehicle) => (
            <Link
              key={vehicle.id}
              to={`/vehicles/${vehicle.id}`}
              className="block rounded-xl border border-slate-800 bg-slate-950/70 p-4 hover:border-slate-700"
            >
              <p className="font-medium text-white">{formatVehicle(vehicle)}</p>
              <p className="mt-1 text-sm text-slate-400">{vehicle.vin || 'No VIN'}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export default ClientDetailPage;
