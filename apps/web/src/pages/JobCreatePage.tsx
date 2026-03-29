import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { JobStatus, VehicleWithClient, createJob, listVehicles } from '../lib/api';

const statuses: JobStatus[] = ['open', 'in_progress', 'complete', 'invoiced'];

function todayValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function JobCreatePage() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<VehicleWithClient[]>([]);
  const [vehicleId, setVehicleId] = useState('');
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<JobStatus>('open');
  const [notes, setNotes] = useState('');
  const [openedAt, setOpenedAt] = useState(todayValue());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const data = await listVehicles();
        if (!active) {
          return;
        }
        setVehicles(data);
        setVehicleId(data[0]?.id ?? '');
        setError(null);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load vehicles');
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await createJob({
        vehicleId,
        title,
        status,
        notes,
        openedAt: new Date(`${openedAt}T00:00:00`).toISOString(),
      });
      navigate('/jobs');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create job');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p>Loading...</p>;
  }

  if (error && vehicles.length === 0) {
    return <p>Error: {error}</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-3xl font-semibold tracking-tight text-white">Create Job</h2>
        <Link to="/jobs" className="text-sm text-slate-400 hover:text-white">
          Back to Jobs
        </Link>
      </div>
      {error ? <p>Error: {error}</p> : null}
      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-slate-800 bg-slate-950/70 p-6">
        <label className="block space-y-2">
          <span className="text-sm text-slate-300">Vehicle</span>
          <select
            value={vehicleId}
            onChange={(event) => setVehicleId(event.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            required
          >
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ') || 'Unnamed vehicle'} - {vehicle.client.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-slate-300">Title</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            required
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-slate-300">Status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as JobStatus)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          >
            {statuses.map((entry) => (
              <option key={entry} value={entry}>
                {entry.replace('_', ' ')}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-slate-300">Opened At</span>
          <input
            type="date"
            value={openedAt}
            onChange={(event) => setOpenedAt(event.target.value)}
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
          Save Job
        </button>
      </form>
    </div>
  );
}

export default JobCreatePage;
