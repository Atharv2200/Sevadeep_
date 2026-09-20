const API_BASE_URL = 'http://localhost:5000/api';

// Volunteers API
export const volunteersAPI = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/volunteers`);
    return response.json();
  },
  
  getById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/volunteers/${id}`);
    return response.json();
  },
  
  create: async (data) => {
    const response = await fetch(`${API_BASE_URL}/volunteers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  },
  
  update: async (id, data) => {
    const response = await fetch(`${API_BASE_URL}/volunteers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  }
};

// Attendance API
export const attendanceAPI = {
  getAll: async (date) => {
    const url = date ? `${API_BASE_URL}/attendance?date=${date}` : `${API_BASE_URL}/attendance`;
    const response = await fetch(url);
    return response.json();
  },
  
  getByVolunteer: async (volunteerId) => {
    const response = await fetch(`${API_BASE_URL}/attendance/volunteer/${volunteerId}`);
    return response.json();
  },
  
  create: async (data) => {
    const response = await fetch(`${API_BASE_URL}/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  },
  
  update: async (id, data) => {
    const response = await fetch(`${API_BASE_URL}/attendance/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  }
};

// Contributions API
export const contributionsAPI = {
  getAll: async (status, volunteerId) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (volunteerId) params.append('volunteerId', volunteerId);
    
    const url = params.toString() 
      ? `${API_BASE_URL}/contributions?${params.toString()}` 
      : `${API_BASE_URL}/contributions`;
    
    const response = await fetch(url);
    return response.json();
  },
  
  getById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/contributions/${id}`);
    return response.json();
  },
  
  create: async (data) => {
    const response = await fetch(`${API_BASE_URL}/contributions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  },
  
  update: async (id, data) => {
    const response = await fetch(`${API_BASE_URL}/contributions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  },
  
  delete: async (id) => {
    const response = await fetch(`${API_BASE_URL}/contributions/${id}`, {
      method: 'DELETE'
    });
    return response.json();
  }
};

// Verification API
export const verificationAPI = {
  getPending: async () => {
    const response = await fetch(`${API_BASE_URL}/verification/pending`);
    return response.json();
  },
  
  getVerified: async () => {
    const response = await fetch(`${API_BASE_URL}/verification/verified`);
    return response.json();
  },
  
  getRejected: async () => {
    const response = await fetch(`${API_BASE_URL}/verification/rejected`);
    return response.json();
  },
  
  approve: async (id) => {
    const response = await fetch(`${API_BASE_URL}/verification/approve/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    });
    return response.json();
  },
  
  reject: async (id, rejectionReason) => {
    const response = await fetch(`${API_BASE_URL}/verification/reject/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rejectionReason })
    });
    return response.json();
  },
  
  getStats: async () => {
    const response = await fetch(`${API_BASE_URL}/verification/stats`);
    return response.json();
  }
};
