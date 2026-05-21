import api from './api';

const authService = {
  login: async (email, password) => {
    try {
      const response = await api.post('/candidate/auth/login', { email, password });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Login failed' };
    }
  },

  register: async (userData) => {
    try {
      // Registration expects multipart/form-data for resume, but we can send JSON if no resume
      // Based on candidate.controller.js, it expects name, designation, phone, email, password
      const response = await api.post('/candidate/auth/register', userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Registration failed' };
    }
  },

  getMe: async () => {
    try {
      const response = await api.get('/candidate/auth/me');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch user data' };
    }
  },
  
  updateProfile: async (profileData) => {
    try {
      const response = await api.patch('/candidate/profile', profileData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Profile update failed' };
    }
  },

  uploadImage: async (formData) => {
    try {
      const response = await api.post('/candidate/profile/image', formData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Image upload failed' };
    }
  },

  getDashboard: async () => {
    try {
      const response = await api.get('/candidate/dashboard');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch dashboard data' };
    }
  },

  getJobs: async (params) => {
    try {
      const response = await api.get('/candidate/jobs', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch jobs' };
    }
  },

  getJobDetail: async (jobId) => {
    try {
      const response = await api.get(`/candidate/jobs/${jobId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch job details' };
    }
  },

  createApplication: async (applicationData) => {
    try {
      const response = await api.post('/candidate/applications', applicationData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Application failed' };
    }
  },

  getCompanies: async (params) => {
    try {
      const response = await api.get('/candidate/companies', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch companies' };
    }
  },

  getCompanyDetail: async (companyId) => {
    try {
      const response = await api.get(`/candidate/companies/${companyId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch company details' };
    }
  }
};

export default authService;
