import axios from 'axios';
import socketService from './socketService';

// Always use HTTPS for API calls when on HTTPS site
const apiUrl = process.env.REACT_APP_API_URL || `https://${window.location.hostname}:5000/api`;

const api = axios.create({
  baseURL: apiUrl,
  timeout: 10000
});

const getStoredToken = () => localStorage.getItem('token');
const initialToken = getStoredToken();
if (initialToken) {
  api.defaults.headers.common.Authorization = `Bearer ${initialToken}`;
}

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (config.headers?.Authorization) {
    delete config.headers.Authorization;
  }
  return config;
});

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

export const initializeSocket = (token) => socketService.connect(token);
export const getSocket = () => socketService.getSocket();
export const registerSocket = (userId, name) => socketService.register(userId, name);
export const requestOTP = (data) => api.post('/otp/request', data);
export const verifyOTPAndRegister = (data) => api.post('/otp/verify', data);
export const resendOTP = (data) => api.post('/otp/resend', data);
export const getCallHistory = () => api.get('/calls/history');
export const getCallStats = () => api.get('/calls/stats');

// Export socketService as named export
export { socketService };
export default api;
