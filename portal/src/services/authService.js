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

  getApplications: async () => {
    try {
      const response = await api.get('/candidate/applications');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch applications' };
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
  },

  submitCompanyReview: async (companyId, payload) => {
    try {
      const response = await api.post(`/candidate/companies/${companyId}/reviews`, payload);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to submit review' };
    }
  },

  getLandingHome: async () => {
    try {
      const response = await api.get('/landing/home');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch landing data' };
    }
  },

  searchPublicJobs: async (params) => {
    try {
      const response = await api.get('/landing/jobs', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to search jobs' };
    }
  },

  getPublicCompanyDetail: async (companyId) => {
    try {
      const response = await api.get(`/landing/companies/${companyId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch company profile' };
    }
  },

  getEmployerLanding: async () => {
    try {
      const response = await api.get('/landing/employer');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch employer landing data' };
    }
  },

  employerRegister: async (payload) => {
    try {
      const response = await api.post('/company-panel/auth/register', payload);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Employer registration failed' };
    }
  },

  getEmployerDashboard: async () => {
    try {
      const response = await api.get('/company-panel/dashboard');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch employer dashboard' };
    }
  },

  getEmployerApplications: async () => {
    try {
      const response = await api.get('/company-panel/applications');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch employer applications' };
    }
  },

  employerCreateJob: async (payload) => {
    try {
      const response = await api.post('/company-panel/jobs', payload);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Job creation failed' };
    }
  },

  getEmployerChats: async () => {
    try {
      const response = await api.get('/company-panel/chats');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch employer chats' };
    }
  },

  getEmployerChatMessages: async (threadId) => {
    try {
      const response = await api.get(`/company-panel/chats/${threadId}/messages`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch chat messages' };
    }
  },

  sendEmployerChatMessage: async (threadId, payload) => {
    try {
      const response = await api.post(`/company-panel/chats/${threadId}/messages`, payload);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to send chat message' };
    }
  },

  markEmployerChatRead: async (threadId) => {
    try {
      const response = await api.patch(`/company-panel/chats/${threadId}/read`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to mark chat as read' };
    }
  },

  getEmployerProfile: async () => {
    try {
      const response = await api.get('/company-panel/profile');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch employer profile' };
    }
  },

  updateEmployerProfile: async (payload) => {
    try {
      const response = await api.patch('/company-panel/profile', payload);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update employer profile' };
    }
  },

  uploadEmployerMedia: async (kind, file) => {
    try {
      const formData = new FormData();
      formData.append('kind', kind);
      formData.append('image', file);
      const response = await api.patch('/company-panel/profile/media', formData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to upload company image' };
    }
  },

  submitEmployerEnquiry: async (payload) => {
    try {
      const response = await api.post('/lead-generator/client-intakes', payload);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to submit employer enquiry' };
    }
  },

  employerLogin: async (email, password) => {
    try {
      const response = await api.post('/company-panel/auth/login', { email, password });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Employer login failed' };
    }
  },

  getQuizNotification: async () => {
    try {
      const response = await api.get('/candidate/dashboard');
      return response.data?.data?.quiz || null;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch quiz notification' };
    }
  },

  getTodayQuiz: async () => {
    try {
      const response = await api.get('/candidate/quiz/today');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch quiz' };
    }
  },

  submitTodayQuiz: async (answers) => {
    try {
      const response = await api.post('/candidate/quiz/today/submit', { answers });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to submit quiz' };
    }
  },

  getQuizRanking: async () => {
    try {
      const response = await api.get('/candidate/quiz/ranking');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch ranking' };
    }
  },

  getCandidateChats: async () => {
    try {
      const response = await api.get('/candidate/chats');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch candidate chats' };
    }
  },

  getCandidateChatMessages: async (threadId) => {
    try {
      const response = await api.get(`/candidate/chats/${threadId}/messages`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch candidate chat messages' };
    }
  },

  sendCandidateChatMessage: async (threadId, payload) => {
    try {
      const response = await api.post(`/candidate/chats/${threadId}/messages`, payload);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to send candidate chat message' };
    }
  },

  markCandidateChatRead: async (threadId) => {
    try {
      const response = await api.patch(`/candidate/chats/${threadId}/read`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to mark candidate chat as read' };
    }
  },

  getCandidateNotifications: async () => {
    try {
      const response = await api.get('/candidate/notifications');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch notifications' };
    }
  },

  markCandidateNotificationRead: async (notificationId) => {
    try {
      const response = await api.patch(`/candidate/notifications/${notificationId}/read`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to mark notification as read' };
    }
  }
};

export default authService;
