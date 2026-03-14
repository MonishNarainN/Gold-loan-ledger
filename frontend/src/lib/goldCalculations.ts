// Gold loan calculation utilities
export interface GoldLoanData {
  weight: number;
  purity: number;
  goldRate: number;
  interestRate: number;
  duration: number;
}

export interface LoanCalculations {
  principal: number;
  interest: number;
  totalRepayment: number;
}

/**
 * Calculate gold value based on weight, purity, and rate
 * Formula: Gold Value = Weight × (Purity/100) × Gold Rate
 */
export const calculateGoldValue = (weight: number, purity: number, goldRate: number): number => {
  if (!weight || !purity || !goldRate) return 0;
  return weight * (purity / 100) * goldRate;
};

/**
 * Calculate principal amount based on gold weight, purity, and rate
 * Formula: Principal = Gold Value × 0.8 (80% LTV - Loan to Value ratio)
 * The principal is capped at 80% of the gold value as per business rules
 */
export const calculatePrincipal = (weight: number, purity: number, goldRate: number): number => {
  const goldValue = calculateGoldValue(weight, purity, goldRate);
  // Apply 80% LTV cap
  return goldValue * 0.8;
};

/**
 * Calculate interest amount
 * Formula: Interest = Principal × (Interest Rate/100) × (Duration/30)
 */
export const calculateInterest = (principal: number, interestRate: number, duration: number): number => {
  if (!principal || !interestRate || !duration) return 0;
  return principal * (interestRate / 100) * (duration / 30);
};

/**
 * Calculate total repayment amount
 * Formula: Total = Principal + Interest
 */
export const calculateTotalRepayment = (principal: number, interest: number): number => {
  return principal + interest;
};

/**
 * Calculate all loan values at once
 */
export const calculateAllValues = (data: GoldLoanData): LoanCalculations => {
  const principal = calculatePrincipal(data.weight, data.purity, data.goldRate);
  const interest = calculateInterest(principal, data.interestRate, data.duration);
  const totalRepayment = calculateTotalRepayment(principal, interest);

  return {
    principal,
    interest,
    totalRepayment
  };
};

/**
 * Format currency for display
 */
export const formatCurrency = (amount: number): string => {
  if (amount >= 10000000) { // 1 Crore
    return `₹${(amount / 10000000).toFixed(2)}Cr`;
  } else if (amount >= 100000) { // 1 Lakh
    return `₹${(amount / 100000).toFixed(2)}L`;
  } else if (amount >= 1000) { // 1 Thousand
    return `₹${(amount / 1000).toFixed(2)}K`;
  } else {
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  }
};

/**
 * Calculate loan-to-value ratio
 */
export const calculateLTV = (loanAmount: number, goldValue: number): number => {
  if (goldValue === 0) return 0;
  return (loanAmount / goldValue) * 100;
};

/**
 * Validate gold loan form data
 */
export const validateGoldLoanData = (data: Partial<GoldLoanData>): string[] => {
  const errors: string[] = [];

  if (!data.weight || data.weight <= 0) {
    errors.push('Weight must be greater than 0');
  }

  if (!data.purity || data.purity <= 0 || data.purity > 100) {
    errors.push('Purity must be between 0 and 100');
  }

  if (!data.goldRate || data.goldRate <= 0) {
    errors.push('Gold rate must be greater than 0');
  }

  if (!data.interestRate || data.interestRate <= 0) {
    errors.push('Interest rate must be greater than 0');
  }

  if (!data.duration || data.duration <= 0) {
    errors.push('Duration must be greater than 0');
  }

  // Validate LTV (Loan-to-Value) ratio - should not exceed 80%
  if (data.weight && data.purity && data.goldRate) {
    const goldValue = calculateGoldValue(data.weight, data.purity, data.goldRate);
    const principal = calculatePrincipal(data.weight, data.purity, data.goldRate);
    const ltv = calculateLTV(principal, goldValue);
    
    if (ltv > 80) {
      errors.push(`Loan amount cannot exceed 80% of gold value. Maximum allowed: ₹${(goldValue * 0.8).toLocaleString()}`);
    }
  }

  return errors;
};
