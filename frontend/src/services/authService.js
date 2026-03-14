import { API_ENDPOINTS, apiRequest } from '../config/api';

class AuthService {
  // Login user
  static async login(email, password) {
    return apiRequest(API_ENDPOINTS.AUTH.LOGIN, 'POST', { email, password });
  }

  // Register new user
  static async register(userData) {
    return apiRequest(API_ENDPOINTS.AUTH.REGISTER, 'POST', userData);
  }

  // Logout user
  static async logout() {
    return apiRequest(API_ENDPOINTS.AUTH.LOGOUT, 'POST');
  }

  // Get current user
  static async getCurrentUser() {
    return apiRequest(API_ENDPOINTS.AUTH.ME);
  }

  // Verify email
  static async verifyEmail(token) {
    return apiRequest(`${API_ENDPOINTS.AUTH.VERIFY_EMAIL}?token=${token}`, 'GET');
  }

  // Resend verification email
  static async resendVerificationEmail() {
    return apiRequest(API_ENDPOINTS.AUTH.RESEND_VERIFICATION, 'POST');
  }

  // Store user data in localStorage
  static setUser(user) {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }

  // Get user data from localStorage
  static getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }
}

export default AuthService;
