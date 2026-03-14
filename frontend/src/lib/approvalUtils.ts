// Utility functions for managing approval requests

export interface ApprovalRequest {
  id: number;
  name: string;
  email: string;
  phone: string;
  date: string;
  requestType: string;
}

// Function to add a new approval request
export const addApprovalRequest = (
  name: string,
  email: string,
  phone: string,
  requestType: string = "Account Access"
): void => {
  const existingRequests = getApprovalRequests();
  
  const newRequest: ApprovalRequest = {
    id: Date.now(), // Simple ID generation
    name,
    email,
    phone,
    date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
    requestType
  };

  const updatedRequests = [...existingRequests, newRequest];
  localStorage.setItem('pendingApprovals', JSON.stringify(updatedRequests));
  
  // Trigger a custom event to notify the admin dashboard
  window.dispatchEvent(new CustomEvent('newApprovalRequest', { detail: newRequest }));
};

// Function to get all approval requests
export const getApprovalRequests = (): ApprovalRequest[] => {
  const requests = localStorage.getItem('pendingApprovals');
  return requests ? JSON.parse(requests) : [];
};

// Function to remove an approval request
export const removeApprovalRequest = (id: number): void => {
  const existingRequests = getApprovalRequests();
  const updatedRequests = existingRequests.filter(request => request.id !== id);
  localStorage.setItem('pendingApprovals', JSON.stringify(updatedRequests));
};

// Function to clear all approval requests
export const clearAllApprovalRequests = (): void => {
  localStorage.removeItem('pendingApprovals');
};
