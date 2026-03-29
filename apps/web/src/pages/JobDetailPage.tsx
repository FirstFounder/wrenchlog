import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { JobDetail, JobStatus, deleteJob, getJob, updateJob } from '../lib/api';

const statuses: JobStatus[] = ['open', 'in_progress', 'complete', 'invoiced'];

function toDateValue(value: string | null): string {
  return value ? new Date(value).toISOString().slice(0, 10) : '';
}

function formatVehicle(job: JobDetail): string {
  return [job.vehicle.year, job.vehicle.make, job.vehicle.model].filter(Boolean).join(' ') || 'Unnamed vehicle';
}

function JobDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<JobStatus>('open');
  const [notes, setNotes] = useState('');
  const [openedAt, setOpenedAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const data = await getJob(id);
        if (!active) {
          return;
        }
        setJob(data);
        setTitle(data.title);
        setStatus(data.status);
        setNotes(data.notes ?? '');
        setOpenedAt(toDateValue(data.openedAt));
        setError(null);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load job');
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
      const updated = await updateJob(id, {
        title,
        status,
        notes,
        openedAt: openedAt ? new Date(`${openedAt}T00:00:00`).toISOString() : undefined,
      });

      if (job) {
        setJob({ ...job, ...updated });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update job');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this job?')) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      await deleteJob(id);
      navigate('/jobs');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete job');
      setDeleting(false);
    }
  }

  if (loading) {
    return <p>Loading...</p>;
  }

  if (error && !job) {
    return <p>Error: {error}</p>;
  }

  if (!job) {
    return <p>Error: Not found</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-white">{job.title}</h2>
          <p className="mt-1 text-sm text-slate-400">
            <Link to={`/vehicles/${job.vehicle.id}`} className="hover:text-white">
              {formatVehicle(job)}
            </Link>{' '}
            for{' '}
            <Link to={`/clients/${job.vehicle.client.id}`} className="hover:text-white">
              {job.vehicle.client.name}
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
          Save Changes
        </button>
      </form>
    </div>
  );
}

export default JobDetailPage;
