// Utility functions for managing loan data

export enum LoanStatus {
  ACTIVE = 'Active',
  OVERDUE = 'Overdue',
  COMPLETED = 'Completed',
  PENDING = 'Pending'
}

export const LoanStatusConfig = {
  [LoanStatus.ACTIVE]: {
    label: 'Active',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    nextStatus: [LoanStatus.COMPLETED, LoanStatus.OVERDUE]
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
    nextStatus: [LoanStatus.ACTIVE, LoanStatus.COMPLETED]
  }
} as const;

export interface Loan {
  id: string;
  customer: string;
  amount: string;
  dueDate: string;
  status: LoanStatus;
  createdDate: string;
  interestRate: number;
  collateral?: string;
  // Gold-specific fields
  weight?: number;
  purity?: number;
  goldRate?: number;
  principal?: number;
  interest?: number;
  totalRepayment?: number;
}
// Function to add a new loan
export const addLoan = (
  customer: string,
  amount: string,
  dueDate: string,
  status: LoanStatus = LoanStatus.ACTIVE,
  interestRate?: number,
  collateral?: string,
  goldData?: {
    weight: number;
    purity: number;
    goldRate: number;
    principal: number;
    interest: number;
    totalRepayment: number;
  }
): void => {
  const existingLoans = getLoans();
  
  const newLoan: Loan = {
    id: `GL${String(Date.now()).slice(-6)}`, // Generate ID like GL123456
    customer,
    amount,
    status: status || LoanStatus.ACTIVE,
    dueDate,
    createdDate: new Date().toISOString().split('T')[0],
    interestRate: interestRate || 0,
    collateral,
    // Add gold-specific fields if provided
    ...(goldData && {
      weight: goldData.weight,
      purity: goldData.purity,
      goldRate: goldData.goldRate,
      principal: goldData.principal,
      interest: goldData.interest,
      totalRepayment: goldData.totalRepayment
    })
  };

  const updatedLoans = [...existingLoans, newLoan];
  localStorage.setItem('recentLoans', JSON.stringify(updatedLoans));
  
  // Trigger a custom event to notify the admin dashboard
  window.dispatchEvent(new CustomEvent('newLoan', { detail: newLoan }));
};

// Function to determine loan status based on due date
const getLoanStatus = (currentStatus: LoanStatus, dueDate?: string): { status: LoanStatus; daysUntilDue: number | null } => {
  if (currentStatus === LoanStatus.COMPLETED || currentStatus === LoanStatus.PENDING) {
    return { status: currentStatus, daysUntilDue: null };
  }

  try {
    if (!dueDate) return { status: LoanStatus.ACTIVE, daysUntilDue: null };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    
    const daysUntilDue = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue < 0) {
      return { status: LoanStatus.OVERDUE, daysUntilDue };
    }
    
    return { status: LoanStatus.ACTIVE, daysUntilDue };
  } catch (e) {
    console.error('Error calculating loan status:', e);
    return { status: LoanStatus.ACTIVE, daysUntilDue: null };
  }
};

// Function to get all loans with automatic status updates based on due date
export const getLoans = (): Loan[] => {
  const loansStr = localStorage.getItem('recentLoans');
  if (!loansStr) return [];
  
  const loans: Loan[] = JSON.parse(loansStr);
  const today = new Date().toISOString().split('T')[0];
  
  // Check if we need to update any loan statuses
  const updatedLoans = loans.map(loan => {
    if (loan.status === LoanStatus.COMPLETED) return loan;
    
    const { status: newStatus } = getLoanStatus(loan.status, loan.dueDate);
    if (newStatus !== loan.status) {
      return { ...loan, status: newStatus };
    }
    return loan;
  });
  
  // Save back the updated statuses if any changed
  if (JSON.stringify(loans) !== JSON.stringify(updatedLoans)) {
    localStorage.setItem('recentLoans', JSON.stringify(updatedLoans));
  }
  
  return updatedLoans;
};

// Function to update loan status
export const updateLoanStatus = (id: string, status: LoanStatus): void => {
  const existingLoans = getLoans();
  const updatedLoans = existingLoans.map(loan => 
    loan.id === id ? { ...loan, status } : loan
  );
  localStorage.setItem('recentLoans', JSON.stringify(updatedLoans));
};

// Function to remove a loan
export const removeLoan = (id: string): void => {
  const existingLoans = getLoans();
  const updatedLoans = existingLoans.filter(loan => loan.id !== id);
  localStorage.setItem('recentLoans', JSON.stringify(updatedLoans));
};

// Function to get recent loans (last 10)
export const getRecentLoans = (): Loan[] => {
  const allLoans = getLoans();
  return allLoans
    .sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime())
    .slice(0, 10);
};

// Function to clear all loans
export const clearAllLoans = (): void => {
  localStorage.removeItem('recentLoans');
};
