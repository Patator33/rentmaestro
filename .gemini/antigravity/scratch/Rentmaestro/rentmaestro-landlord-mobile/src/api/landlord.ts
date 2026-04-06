import { getToken, getServerUrl } from '../lib/storage';

async function apiFetch(path: string, options?: RequestInit) {
  const [token, baseUrl] = await Promise.all([getToken(), getServerUrl()]);
  const res = await fetch(`${baseUrl}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res;
}

export const api = {
  login: async (email: string, password: string) => {
    const baseUrl = await getServerUrl();
    const res = await fetch(`${baseUrl}/api/auth/mobile-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Erreur réseau' }));
      throw new Error(err.error || 'Identifiants incorrects');
    }
    return res.json() as Promise<{ token: string; email: string }>;
  },

  dashboard: async () => {
    const res = await apiFetch('/api/landlord/dashboard');
    return res.json();
  },

  getRents: async (month?: string) => {
    const res = await apiFetch(`/api/landlord/rents${month ? `?month=${month}` : ''}`);
    return res.json();
  },

  markPaid: async (leaseId: string, period: string, amount: number) => {
    const res = await apiFetch('/api/landlord/rents/pay', {
      method: 'POST',
      body: JSON.stringify({ leaseId, period, amount }),
    });
    return res.json();
  },

  sendReminder: async (leaseId: string, period: string) => {
    const res = await apiFetch('/api/landlord/rents/remind', {
      method: 'POST',
      body: JSON.stringify({ leaseId, period }),
    });
    return res.json();
  },

  markUnpaid: async (paymentId: string) => {
    const res = await apiFetch('/api/landlord/rents/unpay', {
      method: 'POST',
      body: JSON.stringify({ paymentId }),
    });
    return res.json();
  },

  getConversations: async () => {
    const res = await apiFetch('/api/landlord/messages');
    return res.json();
  },

  getMessages: async (tenantId: string) => {
    const res = await apiFetch(`/api/landlord/messages/${tenantId}`);
    return res.json();
  },

  sendMessage: async (tenantId: string, content: string) => {
    const res = await apiFetch(`/api/landlord/messages/${tenantId}`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
    return res.json();
  },

  getIncidents: async (all = false) => {
    const res = await apiFetch(`/api/landlord/incidents${all ? '?all=1' : ''}`);
    return res.json();
  },

  updateIncident: async (id: string, status: string) => {
    const res = await apiFetch(`/api/landlord/incidents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return res.json();
  },

  getTasks: async (all = false) => {
    const res = await apiFetch(`/api/landlord/tasks${all ? '?all=1' : ''}`);
    return res.json();
  },

  updateTask: async (id: string, status: string) => {
    const res = await apiFetch(`/api/landlord/incidents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return res.json();
  },

  getTenants: async () => {
    const res = await apiFetch('/api/landlord/tenants');
    return res.json();
  },

  getTenant: async (id: string) => {
    const res = await apiFetch(`/api/landlord/tenants/${id}`);
    return res.json();
  },

  createTenant: async (data: Record<string, string>) => {
    const res = await apiFetch('/api/landlord/tenants', { method: 'POST', body: JSON.stringify(data) });
    return res.json();
  },

  updateTenant: async (id: string, data: Record<string, string>) => {
    const res = await apiFetch(`/api/landlord/tenants/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    return res.json();
  },

  deleteTenant: async (id: string) => {
    const res = await apiFetch(`/api/landlord/tenants/${id}`, { method: 'DELETE' });
    return res.json();
  },

  getBuildings: async () => {
    const res = await apiFetch('/api/landlord/buildings');
    return res.json();
  },

  getCompanies: async () => {
    const res = await apiFetch('/api/landlord/companies');
    return res.json();
  },

  search: async (q: string) => {
    const res = await apiFetch(`/api/landlord/search?q=${encodeURIComponent(q)}`);
    return res.json();
  },

  getApartments: async () => {
    const res = await apiFetch('/api/landlord/apartments');
    return res.json();
  },

  getApartment: async (id: string) => {
    const res = await apiFetch(`/api/landlord/apartments/${id}`);
    return res.json();
  },

  createApartment: async (data: Record<string, string>) => {
    const res = await apiFetch('/api/landlord/apartments', { method: 'POST', body: JSON.stringify(data) });
    return res.json();
  },

  updateApartment: async (id: string, data: Record<string, string>) => {
    const res = await apiFetch(`/api/landlord/apartments/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    return res.json();
  },

  markRentReviewSent: async (leaseId: string) => {
    const res = await apiFetch(`/api/landlord/leases/${leaseId}/rent-review`, { method: 'POST' });
    return res.json();
  },

  getAgenda: async () => {
    const res = await apiFetch('/api/landlord/agenda');
    return res.json();
  },

  getLeases: async () => {
    const res = await apiFetch('/api/landlord/leases');
    return res.json();
  },

  getLease: async (id: string) => {
    const res = await apiFetch(`/api/landlord/leases/${id}`);
    return res.json();
  },

  createLease: async (data: Record<string, string>) => {
    const res = await apiFetch('/api/landlord/leases', { method: 'POST', body: JSON.stringify(data) });
    return res.json();
  },

  updateLease: async (id: string, data: Record<string, string>) => {
    const res = await apiFetch(`/api/landlord/leases/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    return res.json();
  },

  payDeposit: async (leaseId: string, paidAmount: number) => {
    const res = await apiFetch(`/api/landlord/leases/${leaseId}`, {
      method: 'POST',
      body: JSON.stringify({ action: 'depositPay', paidAmount }),
    });
    return res.json();
  },
};
