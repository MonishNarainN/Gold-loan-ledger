// Loan service using backend API
import { loansAPI, transactionsAPI, Loan, Transaction } from './api';

class LoanService {
  // Get all loans
  async getAllLoans(): Promise<Loan[]> {
    try {
      const response = await loansAPI.getAllLoans();
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Error fetching loans:', error);
      return [];
    }
  }

  // Get loans by user ID
  async getUserLoans(userId: string): Promise<Loan[]> {
    try {
      const response = await loansAPI.getUserLoans(userId);
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Error fetching user loans:', error);
      return [];
    }
  }

  // Create new loan
  async createLoan(loanData: {
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
  }): Promise<{ success: boolean; data?: Loan; message?: string }> {
    try {
      const response = await loansAPI.createLoan(loanData);
      if (response.success && response.data) {
        return { success: true, data: response.data };
      }
      return { success: false, message: response.error || 'Failed to create loan' };
    } catch (error) {
      console.error('Error creating loan:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to create loan' 
      };
    }
  }

  // Get loan by ID
  async getLoan(loanId: string): Promise<Loan | null> {
    try {
      const response = await loansAPI.getLoan(loanId);
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching loan:', error);
      return null;
    }
  }

  // Update loan
  async updateLoan(loanId: string, loanData: Partial<Loan>): Promise<{ success: boolean; data?: Loan; message?: string }> {
    try {
      const response = await loansAPI.updateLoan(loanId, loanData);
      if (response.success && response.data) {
        return { success: true, data: response.data };
      }
      return { success: false, message: response.error || 'Failed to update loan' };
    } catch (error) {
      console.error('Error updating loan:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to update loan' 
      };
    }
  }

  // Delete loan
  async deleteLoan(loanId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await loansAPI.deleteLoan(loanId);
      if (response.success) {
        return { success: true };
      }
      return { success: false, message: response.error || 'Failed to delete loan' };
    } catch (error) {
      console.error('Error deleting loan:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to delete loan' 
      };
    }
  }

  // Update loan status
  async updateLoanStatus(loanId: string, status: Loan['status']): Promise<{ success: boolean; data?: Loan; message?: string }> {
    try {
      const response = await loansAPI.updateLoanStatus(loanId, status);
      if (response.success && response.data) {
        return { success: true, data: response.data };
      }
      return { success: false, message: response.error || 'Failed to update loan status' };
    } catch (error) {
      console.error('Error updating loan status:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to update loan status' 
      };
    }
  }

  // Get loan transactions
  async getLoanTransactions(loanId: string): Promise<Transaction[]> {
    try {
      const response = await transactionsAPI.getLoanTransactions(loanId);
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Error fetching loan transactions:', error);
      return [];
    }
  }

  // Get user transactions
  async getUserTransactions(userId: string): Promise<Transaction[]> {
    try {
      const response = await transactionsAPI.getUserTransactions(userId);
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Error fetching user transactions:', error);
      return [];
    }
  }

  // Create transaction
  async createTransaction(transactionData: {
    loanId: string;
    userId: string;
    amount: number;
    type: Transaction['type'];
    description?: string;
    reference?: string;
    paymentMethod?: string;
  }): Promise<{ success: boolean; data?: Transaction; message?: string }> {
    try {
      const response = await transactionsAPI.createTransaction(transactionData);
      if (response.success && response.data) {
        return { success: true, data: response.data };
      }
      return { success: false, message: response.error || 'Failed to create transaction' };
    } catch (error) {
      console.error('Error creating transaction:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to create transaction' 
      };
    }
  }

  // Update transaction status
  async updateTransactionStatus(transactionId: string, status: Transaction['status']): Promise<{ success: boolean; data?: Transaction; message?: string }> {
    try {
      const response = await transactionsAPI.updateTransactionStatus(transactionId, status);
      if (response.success && response.data) {
        return { success: true, data: response.data };
      }
      return { success: false, message: response.error || 'Failed to update transaction status' };
    } catch (error) {
      console.error('Error updating transaction status:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to update transaction status' 
      };
    }
  }

  // Get recent loans (for dashboard)
  async getRecentLoans(limit: number = 5): Promise<Loan[]> {
    try {
      const loans = await this.getAllLoans();
      return loans
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('Error fetching recent loans:', error);
      return [];
    }
  }

  // Get loans by status
  async getLoansByStatus(status: Loan['status']): Promise<Loan[]> {
    try {
      const loans = await this.getAllLoans();
      return loans.filter(loan => loan.status === status);
    } catch (error) {
      console.error('Error fetching loans by status:', error);
      return [];
    }
  }

  // Get overdue loans
  async getOverdueLoans(): Promise<Loan[]> {
    try {
      const loans = await this.getAllLoans();
      const now = new Date();
      return loans.filter(loan => {
        const dueDate = new Date(loan.dueDate);
        return dueDate < now && loan.status === 'ACTIVE';
      });
    } catch (error) {
      console.error('Error fetching overdue loans:', error);
      return [];
    }
  }

  // Calculate loan statistics
  async getLoanStatistics(): Promise<{
    totalLoans: number;
    activeLoans: number;
    overdueLoans: number;
    completedLoans: number;
    totalLoanAmount: number;
    totalInterestEarned: number;
  }> {
    try {
      const loans = await this.getAllLoans();
      const transactions = await transactionsAPI.getAllTransactions();
      
      const totalLoans = loans.length;
      const activeLoans = loans.filter(loan => loan.status === 'ACTIVE').length;
      const overdueLoans = loans.filter(loan => loan.status === 'OVERDUE').length;
      const completedLoans = loans.filter(loan => loan.status === 'COMPLETED').length;
      
      const totalLoanAmount = loans.reduce((sum, loan) => sum + loan.principalAmount, 0);
      const totalInterestEarned = transactions
        .filter(t => t.type === 'INTEREST_PAYMENT' && t.status === 'COMPLETED')
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        totalLoans,
        activeLoans,
        overdueLoans,
        completedLoans,
        totalLoanAmount,
        totalInterestEarned,
      };
    } catch (error) {
      console.error('Error calculating loan statistics:', error);
      return {
        totalLoans: 0,
        activeLoans: 0,
        overdueLoans: 0,
        completedLoans: 0,
        totalLoanAmount: 0,
        totalInterestEarned: 0,
      };
    }
  }
}

// Create singleton instance
const loanService = new LoanService();

export default loanService;
