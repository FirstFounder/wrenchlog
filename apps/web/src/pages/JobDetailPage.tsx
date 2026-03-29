import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  JobDetail,
  JobStatus,
  MediaAsset,
  TimeEntry,
  createTimeEntry,
  deleteJob,
  deleteMediaAsset,
  deleteTimeEntry,
  generateInvoice,
  getInvoiceDownloadUrl,
  getJob,
  getMediaAssets,
  getMediaUrl,
  getTimeEntries,
  invoiceExists,
  updateJob,
  updateTimeEntry,
  uploadPhoto,
} from '../lib/api';

const statuses: JobStatus[] = ['open', 'in_progress', 'complete', 'invoiced'];

function toDateValue(value: string | null): string {
  return value ? new Date(value).toISOString().slice(0, 10) : '';
}

function formatVehicle(job: JobDetail): string {
  return (
    [job.vehicle.year, job.vehicle.make, job.vehicle.model]
      .filter(Boolean)
      .join(' ') || 'Unnamed vehicle'
  );
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return 'N/A';
  }

  return new Date(value).toLocaleString();
}

function formatDate(value: string | null): string {
  if (!value) {
    return 'N/A';
  }

  return new Date(value).toLocaleDateString();
}

function formatTime(value: string | null): string {
  if (!value) {
    return 'running';
  }

  return new Date(value).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours} hr ${minutes} min`;
}

function JobDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<JobStatus>('open');
  const [notes, setNotes] = useState('');
  const [openedAt, setOpenedAt] = useState('');
  const [manualStartedAt, setManualStartedAt] = useState('');
  const [manualEndedAt, setManualEndedAt] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [timeBusy, setTimeBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [invoiceBusy, setInvoiceBusy] = useState(false);
  const [hasInvoice, setHasInvoice] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const [data, entries, assets, existingInvoice] = await Promise.all([
          getJob(id),
          getTimeEntries(id),
          getMediaAssets(id),
          invoiceExists(id),
        ]);

        if (!active) {
          return;
        }

        setJob(data);
        setTimeEntries(entries);
        setMediaAssets(assets);
        setHasInvoice(existingInvoice);
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

  const runningEntry = timeEntries.find((entry) => entry.endedAt === null);
  const completedMinutes = timeEntries.reduce(
    (total, entry) => total + (entry.durationMinutes ?? 0),
    0,
  );
  const invoiceDownloadUrl = getInvoiceDownloadUrl(id);

  async function refreshTimeEntries() {
    const entries = await getTimeEntries(id);
    setTimeEntries(entries);
  }

  async function refreshMediaAssets() {
    const assets = await getMediaAssets(id);
    setMediaAssets(assets);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const updated = await updateJob(id, {
        title,
        status,
        notes,
        openedAt: openedAt
          ? new Date(`${openedAt}T00:00:00`).toISOString()
          : undefined,
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

  async function handleStartTimer() {
    setTimeBusy(true);
    setError(null);

    try {
      await createTimeEntry({
        jobId: id,
        startedAt: new Date().toISOString(),
      });
      await refreshTimeEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start timer');
    } finally {
      setTimeBusy(false);
    }
  }

  async function handleStopTimer() {
    if (!runningEntry) {
      return;
    }

    setTimeBusy(true);
    setError(null);

    try {
      await updateTimeEntry(runningEntry.id, {
        endedAt: new Date().toISOString(),
      });
      await refreshTimeEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop timer');
    } finally {
      setTimeBusy(false);
    }
  }

  async function handleManualEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTimeBusy(true);
    setError(null);

    try {
      await createTimeEntry({
        jobId: id,
        startedAt: new Date(manualStartedAt).toISOString(),
        endedAt: manualEndedAt
          ? new Date(manualEndedAt).toISOString()
          : undefined,
        notes: manualNotes,
      });
      setManualStartedAt('');
      setManualEndedAt('');
      setManualNotes('');
      await refreshTimeEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add time entry');
    } finally {
      setTimeBusy(false);
    }
  }

  async function handleDeleteTimeEntry(entryId: string) {
    if (!window.confirm('Delete this time entry?')) {
      return;
    }

    setTimeBusy(true);
    setError(null);

    try {
      await deleteTimeEntry(entryId);
      await refreshTimeEntries();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete time entry',
      );
    } finally {
      setTimeBusy(false);
    }
  }

  async function handlePhotoSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setUploading(true);
    setError(null);

    try {
      await uploadPhoto(id, file);
      await refreshMediaAssets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload photo');
    } finally {
      event.target.value = '';
      setUploading(false);
    }
  }

  async function handleDeletePhoto(assetId: string) {
    if (!window.confirm('Delete this photo?')) {
      return;
    }

    setUploading(true);
    setError(null);

    try {
      await deleteMediaAsset(assetId);
      await refreshMediaAssets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete photo');
    } finally {
      setUploading(false);
    }
  }

  async function handleGenerateInvoice() {
    setInvoiceBusy(true);
    setError(null);

    try {
      await generateInvoice(id);
      setHasInvoice(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to generate invoice',
      );
    } finally {
      setInvoiceBusy(false);
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
          <h2 className="text-3xl font-semibold tracking-tight text-white">
            {job.title}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            <Link
              to={`/vehicles/${job.vehicle.id}`}
              className="hover:text-white"
            >
              {formatVehicle(job)}
            </Link>{' '}
            for{' '}
            <Link
              to={`/clients/${job.vehicle.client.id}`}
              className="hover:text-white"
            >
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
      <form
        onSubmit={handleSave}
        className="space-y-5 rounded-xl border border-slate-800 bg-slate-950/70 p-6"
      >
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
      <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/70 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-white">Time</h3>
            <p className="text-sm text-slate-400">
              {formatDuration(completedMinutes)} total
            </p>
          </div>
          <button
            type="button"
            onClick={handleStartTimer}
            disabled={timeBusy || Boolean(runningEntry)}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            Start Timer
          </button>
        </div>
        {runningEntry ? (
          <div className="flex flex-col gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-emerald-100">
              Timer running - started at{' '}
              {formatDateTime(runningEntry.startedAt)}
            </p>
            <button
              type="button"
              onClick={handleStopTimer}
              disabled={timeBusy}
              className="rounded-lg border border-emerald-400/40 px-4 py-2 text-sm font-medium text-emerald-100 disabled:opacity-60"
            >
              Stop
            </button>
          </div>
        ) : null}
        <details className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <summary className="cursor-pointer text-sm font-medium text-slate-200">
            Add manual entry
          </summary>
          <form onSubmit={handleManualEntry} className="mt-4 space-y-4">
            <label className="block space-y-2">
              <span className="text-sm text-slate-300">Started At</span>
              <input
                type="datetime-local"
                value={manualStartedAt}
                onChange={(event) => setManualStartedAt(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                required
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm text-slate-300">Ended At</span>
              <input
                type="datetime-local"
                value={manualEndedAt}
                onChange={(event) => setManualEndedAt(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm text-slate-300">Notes</span>
              <input
                value={manualNotes}
                onChange={(event) => setManualNotes(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
              />
            </label>
            <button
              type="submit"
              disabled={timeBusy}
              className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              Save Entry
            </button>
          </form>
        </details>
        <div className="space-y-3">
          {timeEntries.length === 0 ? (
            <p className="text-sm text-slate-400">No time entries yet.</p>
          ) : (
            timeEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="space-y-1 text-sm text-slate-300">
                  <p className="font-medium text-white">
                    {formatDate(entry.startedAt)}
                  </p>
                  <p>
                    {formatTime(entry.startedAt)} to {formatTime(entry.endedAt)}
                  </p>
                  <p>
                    {entry.durationMinutes === null
                      ? 'Running'
                      : formatDuration(entry.durationMinutes)}
                  </p>
                  <p>{entry.notes?.trim() ? entry.notes : 'No notes'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteTimeEntry(entry.id)}
                  disabled={timeBusy}
                  className="rounded-lg border border-red-500/40 px-3 py-2 text-sm font-medium text-red-200 disabled:opacity-60"
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      </section>
      <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/70 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-white">Photos</h3>
            <p className="text-sm text-slate-400">
              Upload one image at a time.
            </p>
          </div>
          <label className="inline-flex cursor-pointer items-center rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white">
            <span>{uploading ? 'Uploading...' : 'Upload Photo'}</span>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoSelected}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>
        {mediaAssets.length === 0 ? (
          <p className="text-sm text-slate-400">No photos uploaded yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {mediaAssets.map((asset) => (
              <div
                key={asset.id}
                className="group relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900"
              >
                <a
                  href={getMediaUrl(asset.id)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <img
                    src={getMediaUrl(asset.id)}
                    alt={`Job photo ${asset.id}`}
                    className="h-40 w-full object-cover transition duration-200 group-hover:scale-[1.02]"
                  />
                </a>
                <button
                  type="button"
                  onClick={() => handleDeletePhoto(asset.id)}
                  className="absolute right-2 top-2 rounded-full bg-slate-950/80 px-2 py-1 text-xs font-semibold text-white"
                >
                  X
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/70 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-white">Invoice</h3>
            <p className="text-sm text-slate-400">
              Generate a PDF summary for this job.
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerateInvoice}
            disabled={invoiceBusy}
            className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {hasInvoice ? 'Regenerate' : 'Generate Invoice'}
          </button>
        </div>
        {hasInvoice ? (
          <a
            href={invoiceDownloadUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex text-sm font-medium text-sky-300 hover:text-sky-200"
          >
            Download Invoice (PDF)
          </a>
        ) : (
          <p className="text-sm text-slate-400">No invoice generated yet.</p>
        )}
      </section>
    </div>
  );
}

export default JobDetailPage;
