import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { JobSummary, VehicleWithClient, deleteVehicle, getVehicle, listJobs, updateVehicle } from '../lib/api';

function formatVehicle(vehicle: VehicleWithClient): string {
  return [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ') || 'Unnamed vehicle';
}

function VehicleDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState<VehicleWithClient | null>(null);
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [year, setYear] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [vin, setVin] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const [vehicleData, jobData] = await Promise.all([getVehicle(id), listJobs({ vehicleId: id })]);
        if (!active) {
          return;
        }
        setVehicle(vehicleData);
        setJobs(jobData);
        setYear(vehicleData.year?.toString() ?? '');
        setMake(vehicleData.make ?? '');
        setModel(vehicleData.model ?? '');
        setVin(vehicleData.vin ?? '');
        setNotes(vehicleData.notes ?? '');
        setError(null);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load vehicle');
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
      const updated = await updateVehicle(id, {
        year: year ? Number(year) : undefined,
        make,
        model,
        vin,
        notes,
      });

      if (vehicle) {
        setVehicle({ ...vehicle, ...updated });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update vehicle');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this vehicle?')) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      await deleteVehicle(id);
      navigate('/vehicles');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete vehicle');
      setDeleting(false);
    }
  }

  if (loading) {
    return <p>Loading...</p>;
  }

  if (error && !vehicle) {
    return <p>Error: {error}</p>;
  }

  if (!vehicle) {
    return <p>Error: Not found</p>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-white">{formatVehicle(vehicle)}</h2>
          <p className="mt-1 text-sm text-slate-400">
            Client:{' '}
            <Link to={`/clients/${vehicle.client.id}`} className="hover:text-white">
              {vehicle.client.name}
            </Link>
          </p>
        </div>
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
          <span className="text-sm text-slate-300">Year</span>
          <input
            type="number"
            value={year}
            onChange={(event) => setYear(event.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-slate-300">Make</span>
          <input
            value={make}
            onChange={(event) => setMake(event.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-slate-300">Model</span>
          <input
            value={model}
            onChange={(event) => setModel(event.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-slate-300">VIN</span>
          <input
            value={vin}
            onChange={(event) => setVin(event.target.value)}
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
          <h3 className="text-xl font-semibold text-white">Jobs</h3>
          <Link to="/jobs/new" className="text-sm text-slate-400 hover:text-white">
            Add Job
          </Link>
        </div>
        <div className="space-y-3">
          {jobs.map((job) => (
            <Link
              key={job.id}
              to={`/jobs/${job.id}`}
              className="block rounded-xl border border-slate-800 bg-slate-950/70 p-4 hover:border-slate-700"
            >
              <p className="font-medium text-white">{job.title}</p>
              <p className="mt-1 text-sm text-slate-400">{job.status.replace('_', ' ')}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export default VehicleDetailPage;
