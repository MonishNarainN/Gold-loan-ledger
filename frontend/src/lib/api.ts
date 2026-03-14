// API service for connecting frontend to backend
// Force IPv4 by using 127.0.0.1 instead of localhost
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Log API base URL for debugging - this will help identify if cache is the issue
console.log('🔗 API Base URL:', API_BASE_URL);
console.log('🔗 If you see port 5001, clear browser cache and restart dev server');

// Types
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'ADMIN' | 'USER' | 'PENDING';
  address?: string;
  city?: string;
  pincode?: string;
  aadharNumber?: string;
  panNumber?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
}

export interface Loan {
  id: string;
  loanNumber: string;
  userId: string;
  customer: string;
  principalAmount: number;
  interestRate: number;
  termDays: number;
  startDate: string;
  dueDate: string;
  status: 'PENDING' | 'ACTIVE' | 'OVERDUE' | 'COMPLETED' | 'CANCELLED';
  collateral?: string;
  goldWeight?: number;
  goldPurity?: number;
  goldRate?: number;
  goldValue?: number;
  interestAmount?: number;
  totalRepayment?: number;
  comments?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  loanId: string;
  userId: string;
  amount: number;
  type: 'LOAN_DISBURSEMENT' | 'INTEREST_PAYMENT' | 'PRINCIPAL_PAYMENT' | 'PENALTY' | 'PROCESSING_FEE' | 'RENEWAL_FEE';
  description?: string;
  reference?: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  paymentMethod?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RenewalRequest {
  id: string;
  loanId: string;
  userId: string;
  requestType: string;
  requestedExtensionDays: number;
  reason: string;
  currentStatus: string;
  originalAmount: number;
  originalDueDate: string;
  interestAccrued: number;
  additionalInterest: number;
  processingFee: number;
  totalPayable: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  processedAt?: string;
  processedBy?: string;
  comments?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SystemSettings {
  id: string;
  defaultInterestRate: number;
  currentGoldRate: number;
  maxLoanAmount: number;
  minLoanAmount: number;
  defaultLoanDuration: number;
  autoApprovalLimit: number;
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  businessHours: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  overdueReminders: boolean;
  approvalAlerts: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId?: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  data?: any;
  createdAt: string;
  updatedAt: string;
}

// API Response wrapper
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Helper function to make API calls
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const token = localStorage.getItem('token');
    const fullUrl = `${API_BASE_URL}${endpoint}`;
    
    const response = await fetch(fullUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
      // Only include credentials for authenticated requests
      ...(token ? { credentials: 'include' } : {}),
    });

    // Handle 401 Unauthorized
    if (response.status === 401) {
      // Clear auth data but don't redirect automatically
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      throw new Error('Session expired. Please log in again.');
    }

    const data = await response.json();

    if (!response.ok) {
      // If there are validation errors, include them in the error message
      if (data.errors && Array.isArray(data.errors)) {
        const errorMessages = data.errors.map((err: any) => 
          err.msg || err.message || JSON.stringify(err)
        ).join(', ');
        throw new Error(data.message + ': ' + errorMessages);
      }
      throw new Error(data.message || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// Authentication API
export const authAPI = {
  // Register new user
  register: async (userData: {
    name: string;
    email: string;
    phone: string;
    password: string;
    address?: string;
    city?: string;
    pincode?: string;
    aadharNumber?: string;
    panNumber?: string;
  }) => {
    return apiCall<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  // Login user
  login: async (credentials: { email: string; password: string }) => {
    return apiCall<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  // Get current user
  getCurrentUser: async () => {
    return apiCall<User>('/auth/me');
  },

  // Logout user
  logout: async () => {
    return apiCall('/auth/logout', { method: 'POST' });
  },

  // Get pending users (Admin only)
  getPendingUsers: async () => {
    return apiCall<User[]>('/auth/pending-users');
  },

  // Approve/reject user (Admin only)
  approveUser: async (userId: string, approved: boolean, comments?: string) => {
    return apiCall<User>(`/auth/approve-user/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ approved, comments }),
    });
  },
};

// Users API
export const usersAPI = {
  // Get all users (Admin only)
  getAllUsers: async () => {
    return apiCall<User[]>('/users');
  },

  // Get user by ID
  getUser: async (userId: string) => {
    return apiCall<User>(`/users/${userId}`);
  },

  // Update user profile
  updateProfile: async (userId: string, userData: Partial<User>) => {
    return apiCall<User>(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },

  // Delete user (Admin only)
  deleteUser: async (userId: string) => {
    return apiCall(`/users/${userId}`, { method: 'DELETE' });
  },
};

// Loans API
export const loansAPI = {
  // Get all loans
  getAllLoans: () => apiCall<Loan[]>('/loans'),

  // Get loans by user ID
  getUserLoans: async (userId: string) => {
    return apiCall<Loan[]>(`/loans/user/${userId}`);
  },

  // Create new loan
  createLoan: async (loanData: {
    userId: string;
    customer: string;
    principalAmount: number;
    interestRate: number;
    termDays: number;
    collateral?: string;
    goldWeight?: number;
    goldPurity?: number;
    goldRate?: number;
    comments?: string;
  }) => {
    console.log('Creating loan with data:', loanData);
    console.log('API Base URL:', API_BASE_URL);
    const endpoint = '/loans';
    console.log('Full URL will be:', `${API_BASE_URL}${endpoint}`);
    return apiCall<Loan>(endpoint, {
      method: 'POST',
      body: JSON.stringify(loanData),
    });
  },

  // Get loan by ID
  getLoan: async (loanId: string) => {
    return apiCall<Loan>(`/loans/${loanId}`);
  },

  // Update loan
  updateLoan: async (loanId: string, loanData: Partial<Loan>) => {
    return apiCall<Loan>(`/loans/${loanId}`, {
      method: 'PUT',
      body: JSON.stringify(loanData),
    });
  },

  // Delete loan
  deleteLoan: async (loanId: string) => {
    return apiCall(`/loans/${loanId}`, { method: 'DELETE' });
  },

  // Update loan status
  updateLoanStatus: async (loanId: string, status: Loan['status']) => {
    return apiCall<Loan>(`/loans/${loanId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },
};

// Transactions API
export const transactionsAPI = {
  // Get all transactions
  getAllTransactions: async () => {
    return apiCall<Transaction[]>('/transactions');
  },

  // Get transactions by loan ID
  getLoanTransactions: async (loanId: string) => {
    return apiCall<Transaction[]>(`/transactions/loan/${loanId}`);
  },

  // Get transactions by user ID
  getUserTransactions: async (userId: string) => {
    return apiCall<Transaction[]>(`/transactions/user/${userId}`);
  },

  // Create new transaction
  createTransaction: async (transactionData: {
    loanId: string;
    userId: string;
    amount: number;
    type: Transaction['type'];
    description?: string;
    reference?: string;
    paymentMethod?: string;
  }) => {
    return apiCall<Transaction>('/transactions', {
      method: 'POST',
      body: JSON.stringify(transactionData),
    });
  },

  // Update transaction status
  updateTransactionStatus: async (transactionId: string, status: Transaction['status']) => {
    return apiCall<Transaction>(`/transactions/${transactionId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },
};

// Admin API
export const adminAPI = {
  // Get admin dashboard data
  getDashboardData: async () => {
    return apiCall<{
      totalUsers: number;
      totalLoans: number;
      totalTransactions: number;
      pendingApprovals: number;
      activeLoans: number;
      overdueLoans: number;
      totalLoanAmount: number;
      totalInterestEarned: number;
      recentLoans: Loan[];
      recentTransactions: Transaction[];
      pendingUsers: User[];
    }>('/admin/dashboard');
  },

  // Get all customers
  getAllCustomers: async () => {
    return apiCall<User[]>('/admin/customers');
  },

  // Get all loans with filters
  getAllLoansWithFilters: async (filters?: {
    status?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
    }
    const query = queryParams.toString();
    return apiCall<Loan[]>(`/admin/loans${query ? `?${query}` : ''}`);
  },

  // Update system settings
  updateSystemSettings: async (settings: Partial<SystemSettings>) => {
    return apiCall<SystemSettings>('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  // Get system settings
  getSystemSettings: async () => {
    return apiCall<SystemSettings>('/admin/settings');
  },

  // Get user dashboard data (for admin to view specific user)
  getUserDashboardData: async (userId: string) => {
    return apiCall<{
      user: User;
      stats: {
        totalLoans: number;
        activeLoans: number;
        completedLoans: number;
        overdueLoans: number;
        pendingLoans: number;
        totalLoanAmount: number;
        totalPaid: number;
        totalTransactions: number;
        totalGoldWeight: number;
        totalGoldValue: number;
      };
      loans: Loan[];
      transactions: Transaction[];
    }>(`/admin/users/${userId}/dashboard`);
  },
};

// Renewal Requests API
export const renewalAPI = {
  // Get all renewal requests
  getAllRenewalRequests: async () => {
    return apiCall<RenewalRequest[]>('/renewals');
  },

  // Get renewal requests by user ID
  getUserRenewalRequests: async (userId: string) => {
    return apiCall<RenewalRequest[]>(`/renewals/user/${userId}`);
  },

  // Create renewal request
  createRenewalRequest: async (renewalData: {
    loanId: string;
    userId: string;
    requestType: string;
    requestedExtensionDays: number;
    reason: string;
  }) => {
    return apiCall<RenewalRequest>('/renewals', {
      method: 'POST',
      body: JSON.stringify(renewalData),
    });
  },

  // Update renewal request status (Admin only)
  updateRenewalStatus: async (renewalId: string, status: RenewalRequest['status'], comments?: string) => {
    return apiCall<RenewalRequest>(`/renewals/${renewalId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, comments }),
    });
  },
};

// Notifications API
export const notificationsAPI = {
  // Get user notifications
  getUserNotifications: async (userId: string) => {
    return apiCall<Notification[]>(`/notifications/user/${userId}`);
  },

  // Mark notification as read
  markAsRead: async (notificationId: string) => {
    return apiCall<Notification>(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  },

  // Mark all notifications as read
  markAllAsRead: async (userId: string) => {
    return apiCall(`/notifications/user/${userId}/read-all`, {
      method: 'PUT',
    });
  },
};

// Payments API
export const paymentAPI = {
  createOrder: async (payload: { loanId: string; amount: number; paymentType?: Transaction['type']; }) => {
    return apiCall<{
      orderId: string;
      amount: number;
      currency: string;
      keyId: string;
      transactionId: string;
      customer: {
        name?: string;
        email?: string;
        phone?: string;
      };
    }>('/payments/create-order', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  verifyPayment: async (payload: {
    transactionId: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => {
    return apiCall<Transaction>('/payments/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

export default {
  auth: authAPI,
  users: usersAPI,
  loans: loansAPI,
  transactions: transactionsAPI,
  admin: adminAPI,
  renewals: renewalAPI,
  notifications: notificationsAPI,
  payments: paymentAPI,
};
