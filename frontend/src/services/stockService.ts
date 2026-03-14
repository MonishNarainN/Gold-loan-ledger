import axios from 'axios';
import { getAuthToken } from '../utils/auth';

const API_URL = 'http://localhost:5000/api';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// Get all loans with their stock items
export const getAllLoansWithStock = async () => {
  try {
    const response = await axios.get<ApiResponse<any>>(`${API_URL}/loans/with-stock`, {
      headers: { Authorization: `Bearer ${getAuthToken()}` }
    });
    return response.data.data;
  } catch (error) {
    console.error('Error fetching loans with stock:', error);
    throw error;
  }
};

// Get loan details by ID with stock items
export const getLoanWithStock = async (loanId: string) => {
  try {
    // Use the existing loan endpoint since stock endpoint doesn't exist
    const response = await axios.get<ApiResponse<any>>(`${API_URL}/loans/${loanId}`, {
      headers: { Authorization: `Bearer ${getAuthToken()}` }
    });
    const loan = response.data.data;
    // Initialize stockItems as empty array if not present
    return {
      ...loan,
      stockItems: loan.stockItems || []
    };
  } catch (error) {
    console.error(`Error fetching loan ${loanId} with stock:`, error);
    throw error;
  }
};

// Update stock items for a loan
export const updateLoanStock = async (loanId: string, stockItems: any[]) => {
  try {
    const response = await axios.put<ApiResponse<any>>(
      `${API_URL}/loans/${loanId}/stock`,
      { items: stockItems },
      { headers: { Authorization: `Bearer ${getAuthToken()}` } }
    );
    return response.data.data;
  } catch (error) {
    console.error('Error updating loan stock:', error);
    throw error;
  }
};
