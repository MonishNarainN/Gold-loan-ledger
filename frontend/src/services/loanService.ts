import { loansAPI } from '../lib/api';
import { Loan } from '../lib/api';

export enum LoanStatus {
  ACTIVE = 'ACTIVE',
  OVERDUE = 'OVERDUE',
  COMPLETED = 'COMPLETED',
  PENDING = 'PENDING',
  CANCELLED = 'CANCELLED'
}

export const LoanStatusConfig = {
  [LoanStatus.ACTIVE]: {
    label: 'Active',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    nextStatus: [LoanStatus.COMPLETED, LoanStatus.OVERDUE, LoanStatus.CANCELLED]
  },
  [LoanStatus.OVERDUE]: {
    label: 'Overdue',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    nextStatus: [LoanStatus.COMPLETED, LoanStatus.ACTIVE]
  },
  [LoanStatus.COMPLETED]: {
    label: 'Completed',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    nextStatus: [LoanStatus.ACTIVE]
  },
  [LoanStatus.PENDING]: {
    label: 'Pending',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    nextStatus: [LoanStatus.ACTIVE, LoanStatus.CANCELLED]
  },
  [LoanStatus.CANCELLED]: {
    label: 'Cancelled',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
    nextStatus: []
  }
};
/**
 * Fetches all loans from the API
 * @returns Promise with array of loans
 */
export const getLoans = async (): Promise<Loan[]> => {
  try {
    console.log('Fetching loans...');
    const response = await loansAPI.getAllLoans();
    console.log('Loans API response:', response);
    
    // Handle different response formats
    if (Array.isArray(response)) {
      return response;
    }
    
    // Handle success/failure response format
    if (response && typeof response === 'object') {
      if (response.success === false) {
        console.error('API returned error:', response.error);
        return [];
      }
      
      if (Array.isArray(response.data)) {
        return response.data;
      }
      
      if (response.data) {
        return [response.data];
      }
      
      // If no data property but response is an object, return as array
      return [response as unknown as Loan];
    }
    
    console.error('Unexpected API response format:', response);
    return [];
  } catch (error) {
    console.error('Error fetching loans:', error);
    throw error;
  }
};

export const getLoanDetails = async (loanId: string): Promise<Loan | null> => {
  try {
    const response = await loansAPI.getLoan(loanId);
    
    if (!response.success) {
      console.error('Failed to fetch loan details:', response.error);
      return null;
    }
    
    return response.data || null;
  } catch (error) {
    console.error('Error fetching loan details:', error);
    throw error;
  }
};

// Export all functions
export default {
  getLoanDetails,
  getLoans,  // Changed from getAllLoans to getLoans
  LoanStatus,
  LoanStatusConfig
};
