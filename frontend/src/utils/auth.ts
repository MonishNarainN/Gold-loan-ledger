// Get authentication token from localStorage
export const getAuthToken = (): string | null => {
  return localStorage.getItem('token');
};

// Set authentication token in localStorage
export const setAuthToken = (token: string): void => {
  localStorage.setItem('token', token);
};

// Remove authentication token from localStorage
export const removeAuthToken = (): void => {
  localStorage.removeItem('token');
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  return !!getAuthToken();
};
