import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { VehicleWithClient, listVehicles } from '../lib/api';

function formatVehicle(vehicle: VehicleWithClient): string {
  return [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ') || 'Unnamed vehicle';
}

function VehiclesPage() {
  const [vehicles, setVehicles] = useState<VehicleWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const data = await listVehicles();
        if (active) {
          setVehicles(data);
          setError(null);
        }
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
          <h2 className="text-3xl font-semibold tracking-tight text-white">Vehicles</h2>
          <p className="mt-1 text-sm text-slate-400">Client vehicles and identification details.</p>
        </div>
        <Link
          to="/vehicles/new"
          className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600"
        >
          New Vehicle
        </Link>
      </div>
      <div className="space-y-3">
        {vehicles.map((vehicle) => (
          <Link
            key={vehicle.id}
            to={`/vehicles/${vehicle.id}`}
            className="block rounded-xl border border-slate-800 bg-slate-950/70 p-5 hover:border-slate-700"
          >
            <h3 className="text-lg font-semibold text-white">{formatVehicle(vehicle)}</h3>
            <p className="mt-1 text-sm text-slate-300">{vehicle.vin || 'No VIN'}</p>
            <p className="mt-1 text-sm text-slate-400">{vehicle.client.name}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default VehiclesPage;
