import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { JobSummary, listJobs } from '../lib/api';

const statusClasses: Record<JobSummary['status'], string> = {
  open: 'bg-blue-500/20 text-blue-200 ring-1 ring-blue-400/30',
  in_progress: 'bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/30',
  complete: 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/30',
  invoiced: 'bg-violet-500/20 text-violet-200 ring-1 ring-violet-400/30',
};

function formatVehicle(job: JobSummary): string {
  return [job.vehicle.year, job.vehicle.make, job.vehicle.model].filter(Boolean).join(' ') || 'Unnamed vehicle';
}

function JobsPage() {
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const data = await listJobs();
        if (active) {
          setJobs(data);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load jobs');
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
          <h2 className="text-3xl font-semibold tracking-tight text-white">Jobs</h2>
          <p className="mt-1 text-sm text-slate-400">Recent work orders across all clients and vehicles.</p>
        </div>
        <Link
          to="/jobs/new"
          className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600"
        >
          New Job
        </Link>
      </div>
      <div className="space-y-3">
        {jobs.map((job) => (
          <Link
            key={job.id}
            to={`/jobs/${job.id}`}
            className="block rounded-xl border border-slate-800 bg-slate-950/70 p-5 hover:border-slate-700"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{job.title}</h3>
                <p className="mt-1 text-sm text-slate-300">{formatVehicle(job)}</p>
                <p className="mt-1 text-sm text-slate-400">{job.client.name}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusClasses[job.status]}`}>
                {job.status.replace('_', ' ')}
              </span>
            </div>
            <p className="mt-4 text-sm text-slate-400">
              Opened {job.openedAt ? new Date(job.openedAt).toLocaleDateString() : 'N/A'}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default JobsPage;
