// src/api/services.js
import apiClient from '@/api/apiClient';

/**
 * User-related API services
 */
export const userService = {
  // Get current user profile
  getCurrentUser: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
  
  // Update current user profile
  updateProfile: async (userData) => {
    const response = await apiClient.put('/users/me', userData);
    return response.data;
  },
  
  // Change password
  changePassword: async (passwordData) => {
    const response = await apiClient.put('/users/me/change-password', passwordData);
    return response.data;
  }
};

/**
 * Observer-related API services
 */
export const observerService = {
  // Get current observer profile
  getMyObserver: async () => {
    const response = await apiClient.get('/observers/me');
    return response.data;
  },
  
  // Update current observer profile
  updateMyObserver: async (data) => {
    const response = await apiClient.put('/observers/me', data);
    return response.data;
  }
};

/**
 * Instrument-related API services
 */
export const instrumentService = {
  // Get all instruments for the current user
  getMyInstruments: async () => {
    const response = await apiClient.get('/instruments');
    return response.data;
  },
  
  // Get a specific instrument by ID
  getInstrument: async (id) => {
    const response = await apiClient.get(`/instruments/${id}`);
    return response.data;
  },
  
  // Create a new instrument
  createInstrument: async (data) => {
    const response = await apiClient.post('/instruments', data);
    return response.data;
  },
  
  // Update an existing instrument
  updateInstrument: async (id, data) => {
    const response = await apiClient.put(`/instruments/${id}`, data);
    return response.data;
  },
  
  // Delete an instrument
  deleteInstrument: async (id) => {
    const response = await apiClient.delete(`/instruments/${id}`);
    return response.data;
  }
};

/**
 * Observation-related API services
 */
export const observationService = {
  // Get all observations (user's and public ones)
  getObservations: async () => {
    const response = await apiClient.get('/observations');
    return response.data;
  },
  
  // Get a specific observation by ID
  getObservation: async (id) => {
    const response = await apiClient.get(`/observations/${id}`);
    return response.data;
  },
  
  // Create a new observation
  createObservation: async (data) => {
    const response = await apiClient.post('/observations', data);
    return response.data;
  },
  
  // Update an existing observation
  updateObservation: async (id, data) => {
    const response = await apiClient.put(`/observations/${id}`, data);
    return response.data;
  },
  
  // Change the public status of an observation
  updatePublicStatus: async (id, isPublic) => {
    const response = await apiClient.put(`/observations/${id}/publicize`, { is_public: isPublic });
    return response.data;
  },
  
  // Update the verification status (for labelers only)
  updateVerificationStatus: async (id, isVerified) => {
    const response = await apiClient.put(`/observations/${id}/verify`, { verified: isVerified });
    return response.data;
  },
  
  // Delete an observation
  deleteObservation: async (id) => {
    const response = await apiClient.delete(`/observations/${id}`);
    return response.data;
  }
};

/**
 * Day Data related API services
 */
export const dayDataService = {
  // Get day data for a specific observation
  getDayDataByObservation: async (observationId) => {
    const response = await apiClient.get(`/day-data/observation/${observationId}`);
    return response.data;
  },
  
  // Get day data by ID
  getDayData: async (id) => {
    const response = await apiClient.get(`/day-data/${id}`);
    return response.data;
  },
  
  // Create new day data
  createDayData: async (data) => {
    const response = await apiClient.post('/day-data', data);
    return response.data;
  },
  
  // Update existing day data
  updateDayData: async (id, data) => {
    const response = await apiClient.put(`/day-data/${id}`, data);
    return response.data;
  },
  
  // Delete day data
  deleteDayData: async (id) => {
    const response = await apiClient.delete(`/day-data/${id}`);
    return response.data;
  }
};

/**
 * Group Data related API services
 */
export const groupDataService = {
  // Get all group data for an observation
  getGroupDataByObservation: async (observationId) => {
    const response = await apiClient.get(`/group-data/observation/${observationId}`);
    return response.data;
  },
  
  // Get all group data for a day data entry
  getGroupDataByDayData: async (dayDataId) => {
    const response = await apiClient.get(`/group-data/day-data/${dayDataId}`);
    return response.data;
  },
  
  // Get specific group data by ID
  getGroupData: async (id) => {
    const response = await apiClient.get(`/group-data/${id}`);
    return response.data;
  },
  
  // Create new group data
  createGroupData: async (data) => {
    const response = await apiClient.post('/group-data', data);
    return response.data;
  },
  
  // Update existing group data
  updateGroupData: async (id, data) => {
    const response = await apiClient.put(`/group-data/${id}`, data);
    return response.data;
  },
  
  // Update just the rectangle coordinates
  updateRectangle: async (id, rectangleData) => {
    const response = await apiClient.put(`/group-data/${id}/rectangle`, rectangleData);
    return response.data;
  },
  
  // Delete group data
  deleteGroupData: async (id) => {
    const response = await apiClient.delete(`/group-data/${id}`);
    return response.data;
  }
};