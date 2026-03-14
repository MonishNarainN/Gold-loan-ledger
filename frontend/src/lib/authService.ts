// Authentication service using backend API
import { authAPI, User } from './api';

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

class AuthService {
  private authState: AuthState = {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
  };

  private listeners: ((state: AuthState) => void)[] = [];

  constructor() {
    this.initializeAuth();
  }

  // Initialize authentication state from localStorage
  private initializeAuth() {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        this.authState = {
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        };
        this.notifyListeners();
      } catch (error) {
        console.error('Error parsing user data:', error);
        this.clearAuth();
      }
    }
  }

  // Subscribe to auth state changes
  subscribe(listener: (state: AuthState) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notify all listeners of state changes
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.authState));
  }

  // Get current auth state
  getAuthState(): AuthState {
    return { ...this.authState };
  }

  // Register new user
  async register(userData: {
    name: string;
    email: string;
    phone: string;
    password: string;
    address?: string;
    city?: string;
    pincode?: string;
    aadharNumber?: string;
    panNumber?: string;
  }) {
    this.authState.isLoading = true;
    this.notifyListeners();

    try {
      const response = await authAPI.register(userData);
      
      if (response.success && response.data) {
        // Registration successful, but user needs admin approval
        this.authState.isLoading = false;
        this.notifyListeners();
        return { success: true, message: 'Registration successful! Please wait for admin approval.' };
      } else {
        this.authState.isLoading = false;
        this.notifyListeners();
        return { success: false, message: response.error || 'Registration failed' };
      }
    } catch (error) {
      this.authState.isLoading = false;
      this.notifyListeners();
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Registration failed' 
      };
    }
  }

  // Login user
  async login(email: string, password: string) {
    this.authState.isLoading = true;
    this.notifyListeners();

    try {
      const response = await authAPI.login({ email, password });
      
      if (response.success && response.data) {
        const { user, token } = response.data;
        
        // Store auth data
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        // Update state
        this.authState = {
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        };
        this.notifyListeners();
        
        return { success: true, user };
      } else {
        this.authState.isLoading = false;
        this.notifyListeners();
        return { success: false, message: response.error || 'Login failed' };
      }
    } catch (error) {
      console.error('AuthService: Login error:', error);
      this.authState.isLoading = false;
      this.notifyListeners();
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Login failed' 
      };
    }
  }

  // Logout user
  async logout() {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      this.clearAuth();
    }
  }

  // Clear authentication data
  private clearAuth() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.authState = {
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    };
    this.notifyListeners();
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.authState.user;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.authState.isAuthenticated;
  }

  // Check if user is admin
  isAdmin(): boolean {
    return this.authState.user?.role === 'ADMIN';
  }

  // Check if user is approved
  isApproved(): boolean {
    return this.authState.user?.role === 'USER' || this.authState.user?.role === 'ADMIN';
  }

  // Check if user is pending approval
  isPending(): boolean {
    return this.authState.user?.role === 'PENDING';
  }

  // Refresh user data from server
  async refreshUser() {
    if (!this.authState.token) return;

    try {
      const response = await authAPI.getCurrentUser();
      
      if (response.success && response.data) {
        const user = response.data;
        localStorage.setItem('user', JSON.stringify(user));
        this.authState.user = user;
        this.notifyListeners();
        return user;
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
      // If token is invalid, logout
      this.clearAuth();
    }
  }

  // Get auth token
  getToken(): string | null {
    return this.authState.token;
  }

  // Check if loading
  isLoading(): boolean {
    return this.authState.isLoading;
  }
}

// Create singleton instance
const authService = new AuthService();

export default authService;
