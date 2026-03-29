export interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle {
  id: string;
  clientId: string;
  year: number | null;
  make: string | null;
  model: string | null;
  vin: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleWithClient extends Vehicle {
  client: {
    id: string;
    name: string;
  };
}

export interface Job {
  id: string;
  vehicleId: string;
  title: string;
  status: JobStatus;
  openedAt: string | null;
  closedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobSummary extends Job {
  vehicle: {
    id: string;
    year: number | null;
    make: string | null;
    model: string | null;
  };
  client: {
    id: string;
    name: string;
  };
}

export interface JobDetail extends Job {
  vehicle: VehicleWithClient;
}

export type JobStatus = 'open' | 'in_progress' | 'complete' | 'invoiced';

export interface CreateClientInput {
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
}

export interface UpdateClientInput {
  name?: string;
  email?: string;
  phone?: string;
  notes?: string;
}

export interface CreateVehicleInput {
  clientId: string;
  year?: number;
  make?: string;
  model?: string;
  vin?: string;
  notes?: string;
}

export interface UpdateVehicleInput {
  clientId?: string;
  year?: number;
  make?: string;
  model?: string;
  vin?: string;
  notes?: string;
}

export interface CreateJobInput {
  vehicleId: string;
  title: string;
  status?: JobStatus;
  openedAt?: string;
  notes?: string;
}

export interface UpdateJobInput {
  vehicleId?: string;
  title?: string;
  status?: JobStatus;
  openedAt?: string;
  closedAt?: string;
  notes?: string;
}

type DataResponse<T> = {
  data: T;
};

type QueryParams = Record<string, string | undefined>;

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = 'Request failed';

    try {
      const body = (await response.json()) as { error?: string };
      if (typeof body.error === 'string' && body.error.length > 0) {
        message = body.error;
      }
    } catch {
      message = response.statusText || message;
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function withQuery(path: string, params?: QueryParams): string {
  if (!params) {
    return path;
  }

  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      searchParams.set(key, value);
    }
  }

  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
}

function toJsonBody(data: unknown): RequestInit {
  return {
    body: JSON.stringify(data),
  };
}

export async function listClients(): Promise<Client[]> {
  const response = await apiFetch<DataResponse<Client[]>>('/api/clients');
  return response.data;
}

export async function getClient(id: string): Promise<Client> {
  const response = await apiFetch<DataResponse<Client>>(`/api/clients/${id}`);
  return response.data;
}

export async function createClient(data: CreateClientInput): Promise<Client> {
  const response = await apiFetch<DataResponse<Client>>('/api/clients', {
    method: 'POST',
    ...toJsonBody(data),
  });
  return response.data;
}

export async function updateClient(id: string, data: UpdateClientInput): Promise<Client> {
  const response = await apiFetch<DataResponse<Client>>(`/api/clients/${id}`, {
    method: 'PATCH',
    ...toJsonBody(data),
  });
  return response.data;
}

export async function deleteClient(id: string): Promise<void> {
  await apiFetch<void>(`/api/clients/${id}`, {
    method: 'DELETE',
  });
}

export async function listVehicles(params?: {
  clientId?: string;
}): Promise<VehicleWithClient[]> {
  const response = await apiFetch<DataResponse<VehicleWithClient[]>>(
    withQuery('/api/vehicles', params),
  );
  return response.data;
}

export async function getVehicle(id: string): Promise<VehicleWithClient> {
  const response = await apiFetch<DataResponse<VehicleWithClient>>(`/api/vehicles/${id}`);
  return response.data;
}

export async function createVehicle(data: CreateVehicleInput): Promise<Vehicle> {
  const response = await apiFetch<DataResponse<Vehicle>>('/api/vehicles', {
    method: 'POST',
    ...toJsonBody(data),
  });
  return response.data;
}

export async function updateVehicle(id: string, data: UpdateVehicleInput): Promise<Vehicle> {
  const response = await apiFetch<DataResponse<Vehicle>>(`/api/vehicles/${id}`, {
    method: 'PATCH',
    ...toJsonBody(data),
  });
  return response.data;
}

export async function deleteVehicle(id: string): Promise<void> {
  await apiFetch<void>(`/api/vehicles/${id}`, {
    method: 'DELETE',
  });
}

export async function listJobs(params?: {
  vehicleId?: string;
  status?: string;
}): Promise<JobSummary[]> {
  const response = await apiFetch<DataResponse<JobSummary[]>>(withQuery('/api/jobs', params));
  return response.data;
}

export async function getJob(id: string): Promise<JobDetail> {
  const response = await apiFetch<DataResponse<JobDetail>>(`/api/jobs/${id}`);
  return response.data;
}

export async function createJob(data: CreateJobInput): Promise<Job> {
  const response = await apiFetch<DataResponse<Job>>('/api/jobs', {
    method: 'POST',
    ...toJsonBody(data),
  });
  return response.data;
}

export async function updateJob(id: string, data: UpdateJobInput): Promise<Job> {
  const response = await apiFetch<DataResponse<Job>>(`/api/jobs/${id}`, {
    method: 'PATCH',
    ...toJsonBody(data),
  });
  return response.data;
}

export async function deleteJob(id: string): Promise<void> {
  await apiFetch<void>(`/api/jobs/${id}`, {
    method: 'DELETE',
  });
}
