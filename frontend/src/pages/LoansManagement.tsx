import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft,
  Search,
  Filter,
  Edit,
  Trash2,
  DollarSign,
  Calendar,
  Weight,
  Gem,
  TrendingUp,
  Plus,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { calculateAllValues, formatCurrency, validateGoldLoanData, calculateGoldValue, calculateLTV } from "@/lib/goldCalculations";
import loanService from "@/lib/loanService";
import { Loan, User } from "@/lib/api";
import { adminAPI } from "@/lib/api";
import authService from "@/lib/authService";

const LoansManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [filteredLoans, setFilteredLoans] = useState<Loan[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | "all">("all");
  const [isLoading, setIsLoading] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [createData, setCreateData] = useState({
    assignedUserId: "",
    customer: "",
    amount: "",
    dueDate: "",
    collateral: "",
    interestRate: "12",
    weight: "",
    purity: "",
    goldRate: "",
  });
  const [editData, setEditData] = useState({
    assignedUserId: "",
    customer: "",
    amount: "",
    dueDate: "",
    collateral: "",
    interestRate: "12",
    weight: "",
    purity: "",
    goldRate: "",
  });
  const [calculations, setCalculations] = useState({
    principal: 0,
    interest: 0,
    totalRepayment: 0,
    goldValue: 0,
    maxAllowedPrincipal: 0,
    ltv: 0,
  });

  // --- Helpers ---
  const fetchApprovedUsers = async () => {
    try {
      const response = await adminAPI.getAllCustomers();
      if (response.success && response.data) {
        const approvedUsers = response.data.filter((user) => user.role !== "PENDING");
        setAvailableUsers(approvedUsers);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "Failed to load users list",
        variant: "destructive",
      });
    }
  };

  const resolveLoanUserId = (loan: Loan | null | undefined): string => {
    if (!loan || !loan.userId) return "";
    if (typeof loan.userId === "string") return loan.userId;
    const userObj = loan.userId as any;
    return userObj?.id || userObj?._id || "";
  };

  const resolveLoanUserName = (loan: Loan | null | undefined): string => {
    if (!loan) return "";
    if (typeof loan.userId === "object" && loan.userId !== null) {
      const userObj = loan.userId as any;
      return userObj?.name || loan.customer || "";
    }
    return loan.customer || "";
  };

  const resolveLoanId = (loan: Loan | null | undefined): string => {
    if (!loan) return "";
    return loan.id || (loan as any)?._id || "";
  };

  const handleCreateUserSelect = (userId: string) => {
    const selectedUser = availableUsers.find((user) => user.id === userId);
    setCreateData((prev) => ({
      ...prev,
      assignedUserId: userId,
      customer: selectedUser?.name || prev.customer,
    }));
  };

  const handleEditUserSelect = (userId: string) => {
    const selectedUser = availableUsers.find((user) => user.id === userId);
    setEditData((prev) => ({
      ...prev,
      assignedUserId: userId,
      customer: selectedUser?.name || prev.customer,
    }));
  };

  const toUpperStatus = (s: string): string => {
    return String(s || "").toUpperCase();
  };

  // Check authentication and load loans
  useEffect(() => {
    // Check if user is authenticated
    if (!authService.isAuthenticated()) {
      toast({
        title: "Authentication Required",
        description: "Please log in to access loans management",
        variant: "destructive"
      });
      navigate("/login");
      return;
    }

    // first load
    void loadLoans();
    const interval = setInterval(() => {
      void loadLoans();
    }, 5 * 60 * 1000); // 5 minutes
    return () => clearInterval(interval);
  }, [navigate, toast]);

  useEffect(() => {
    if (!authService.isAuthenticated()) return;
    const user = authService.getCurrentUser();
    setCurrentUser(user);

    if (user?.role === "ADMIN") {
      void fetchApprovedUsers();
    } else if (user?.id) {
      setCreateData((prev) => ({
        ...prev,
        assignedUserId: prev.assignedUserId || user.id,
        customer: prev.customer || user.name || "",
      }));
      setEditData((prev) => ({
        ...prev,
        assignedUserId: user.id,
      }));
    }
  }, []);

  useEffect(() => {
    filterLoans();
  }, [loans, searchTerm, statusFilter]);

  // Calculate loan values when create form data changes
  useEffect(() => {
    if (
      createData.weight &&
      createData.purity &&
      createData.goldRate &&
      createData.interestRate &&
      createData.dueDate
    ) {
      const goldLoanData = {
        weight: parseFloat(createData.weight),
        purity: parseFloat(createData.purity),
        goldRate: parseFloat(createData.goldRate),
        interestRate: parseFloat(createData.interestRate),
        duration: createData.dueDate
          ? Math.ceil(
              (new Date(createData.dueDate).getTime() - new Date().getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : 30,
      };

      const calculatedValues = calculateAllValues(goldLoanData);
      const goldValue = calculateGoldValue(
        goldLoanData.weight,
        goldLoanData.purity,
        goldLoanData.goldRate
      );
      const maxAllowedPrincipal = goldValue * 0.8;
      const ltv = calculateLTV(calculatedValues.principal, goldValue);
      
      setCalculations({
        ...calculatedValues,
        goldValue,
        maxAllowedPrincipal,
        ltv,
      });

      // Auto-update amount field with calculated principal (80% of gold value)
      setCreateData((prev) => ({
        ...prev,
        amount: formatCurrency(calculatedValues.principal),
      }));
    }
  }, [
    createData.weight,
    createData.purity,
    createData.goldRate,
    createData.interestRate,
    createData.dueDate,
  ]);

  // Calculate loan values when edit form data changes
  useEffect(() => {
    if (
      editData.weight &&
      editData.purity &&
      editData.goldRate &&
      editData.interestRate &&
      editData.dueDate
    ) {
      const goldLoanData = {
        weight: parseFloat(editData.weight),
        purity: parseFloat(editData.purity),
        goldRate: parseFloat(editData.goldRate),
        interestRate: parseFloat(editData.interestRate),
        duration: editData.dueDate
          ? Math.ceil(
              (new Date(editData.dueDate).getTime() - new Date().getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : 30,
      };

      const calculatedValues = calculateAllValues(goldLoanData);
      const goldValue = calculateGoldValue(
        goldLoanData.weight,
        goldLoanData.purity,
        goldLoanData.goldRate
      );
      const maxAllowedPrincipal = goldValue * 0.8;
      const ltv = calculateLTV(calculatedValues.principal, goldValue);
      
      setCalculations({
        ...calculatedValues,
        goldValue,
        maxAllowedPrincipal,
        ltv,
      });

      // Auto-update amount field with calculated principal (80% of gold value)
      setEditData((prev) => ({
        ...prev,
        amount: formatCurrency(calculatedValues.principal),
      }));
    }
  }, [
    editData.weight,
    editData.purity,
    editData.goldRate,
    editData.interestRate,
    editData.dueDate,
  ]);

  // --- Load loans from backend ---
  const loadLoans = async () => {
    try {
      setIsLoading(true);
      const allLoans = await loanService.getAllLoans();
      const normalizedLoans = allLoans.map((loan, index) => ({
        ...loan,
        id: loan.id || (loan as any)?._id || loan.loanNumber || `loan-${index}`,
      }));
      setLoans(normalizedLoans);
    } catch (error) {
      console.error('Error loading loans:', error);
      toast({
        title: "Error",
        description: "Failed to load loans",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterLoans = () => {
    let filtered = loans;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (loan) =>
          loan.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
          loan.loanNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          loan.principalAmount.toString().includes(searchTerm)
      );
    }

    // Filter by status (normalize to uppercase for comparison)
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (loan) => toUpperStatus(loan.status) === statusFilter
      );
    }

    setFilteredLoans(filtered);
  };

  const handleDeleteLoan = async (loanId: string) => {
    if (!confirm("Are you sure you want to delete this loan?")) return;
    const normalizedId = loanId?.trim();
    if (!normalizedId) {
      toast({
        title: "Error",
        description: "Loan ID not found",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const result = await loanService.deleteLoan(normalizedId);
      if (result.success) {
    await loadLoans();
    toast({
      title: "Loan Deleted",
      description: "Loan has been removed successfully",
    });
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to delete loan",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete loan",
        variant: "destructive",
      });
    }
  };

  const handleEditLoan = (loan: Loan) => {
    if (currentUser?.role === "ADMIN" && availableUsers.length === 0) {
      void fetchApprovedUsers();
    }
    setEditingLoan(loan);
    const dueDate = loan.dueDate ? new Date(loan.dueDate).toISOString().split('T')[0] : '';
    setEditData({
      assignedUserId: resolveLoanUserId(loan),
      customer: loan.customer,
      amount: loan.principalAmount?.toString() || "",
      dueDate: dueDate,
      collateral: loan.collateral || "",
      interestRate: loan.interestRate?.toString() || "12",
      weight: loan.goldWeight?.toString() || "",
      purity: loan.goldPurity?.toString() || "",
      goldRate: loan.goldRate?.toString() || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleCreateLoan = async () => {
    // Validate required fields
    if (!createData.dueDate) {
      toast({
        title: "Error",
        description: "Please select a due date",
        variant: "destructive",
      });
      return;
    }

    const authUser = authService.getCurrentUser();
    setCurrentUser(authUser);
    if (!authUser || !authUser.id) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      });
      return;
    }

    const isAdmin = authUser.role === "ADMIN";
    const targetUserId = isAdmin ? createData.assignedUserId : authUser.id;
    if (!targetUserId) {
      toast({
        title: "Error",
        description: "Please select a user to assign this loan",
        variant: "destructive",
      });
      return;
    }

    const targetUser = isAdmin
      ? availableUsers.find((user) => user.id === targetUserId)
      : authUser;

    const customerName = createData.customer || targetUser?.name || "";
    if (!customerName) {
      toast({
        title: "Error",
        description: "Customer name is required",
        variant: "destructive",
      });
      return;
    }

    // Calculate term days
    const termDays = createData.dueDate
      ? Math.ceil(
          (new Date(createData.dueDate).getTime() - new Date().getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 30;

    // If gold loan fields are provided, validate them
    if (createData.weight || createData.purity || createData.goldRate) {
      const goldData = {
        weight: parseFloat(createData.weight) || 0,
        purity: parseFloat(createData.purity) || 0,
        goldRate: parseFloat(createData.goldRate) || 0,
        interestRate: parseFloat(createData.interestRate) || 12,
        duration: termDays,
      };

      const validationErrors = validateGoldLoanData(goldData);
      if (validationErrors.length > 0) {
        toast({
          title: "Validation Error",
          description: validationErrors[0],
          variant: "destructive",
        });
        return;
      }

      // Create loan with gold calculations
      const calculatedValues = calculateAllValues(goldData);
      try {
        setIsCreating(true);
        const result = await loanService.createLoan({
          userId: targetUserId,
          customer: customerName,
          principalAmount: calculatedValues.principal,
          interestRate: parseFloat(createData.interestRate),
          termDays: termDays,
          goldWeight: goldData.weight,
          goldPurity: goldData.purity,
              goldRate: goldData.goldRate,
          collateral: createData.collateral || undefined,
        });

        if (result.success) {
        await loadLoans();
        setIsCreateDialogOpen(false);
        setCreateData({
            assignedUserId: isAdmin ? "" : authUser.id,
          customer: "",
          amount: "",
          dueDate: "",
          collateral: "",
          interestRate: "12",
          weight: "",
          purity: "",
          goldRate: "",
        });
        toast({
          title: "Loan Created",
          description: "New loan has been created successfully",
        });
        } else {
          toast({
            title: "Error",
            description: result.message || "Failed to create loan",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error creating loan:", error);
        toast({
          title: "Error",
          description: "Failed to create loan. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsCreating(false);
      }
    } else {
      // Create simple loan without gold calculations
      const principalAmount = parseFloat(createData.amount.replace(/[₹,]/g, '')) || 0;
      if (principalAmount <= 0) {
        toast({
          title: "Error",
          description: "Please enter a valid principal amount",
          variant: "destructive",
        });
        return;
      }

      try {
        setIsCreating(true);
        const result = await loanService.createLoan({
          userId: targetUserId,
          customer: customerName,
          principalAmount: principalAmount,
          interestRate: parseFloat(createData.interestRate),
          termDays: termDays,
          collateral: createData.collateral || undefined,
        });

        if (result.success) {
        await loadLoans();
        setIsCreateDialogOpen(false);
        setCreateData({
            assignedUserId: isAdmin ? "" : authUser.id,
          customer: "",
          amount: "",
          dueDate: "",
          collateral: "",
          interestRate: "12",
          weight: "",
          purity: "",
          goldRate: "",
        });
        toast({
          title: "Loan Created",
          description: "New loan has been created successfully",
        });
        } else {
          toast({
            title: "Error",
            description: result.message || "Failed to create loan",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error creating loan:", error);
        toast({
          title: "Error",
          description: "Failed to create loan. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsCreating(false);
      }
    }
  };

  const handleUpdateLoan = async () => {
    if (!editingLoan) return;
    const editingLoanId = resolveLoanId(editingLoan);
    if (!editingLoanId) {
      toast({
        title: "Error",
        description: "Loan ID missing. Please refresh and try again.",
        variant: "destructive",
      });
      return;
    }

    // Validate required fields
    if (!editData.customer || !editData.dueDate) {
      toast({
        title: "Error",
        description: "Please fill in customer name and due date",
        variant: "destructive",
      });
      return;
    }

    try {
      // Calculate term days
      const termDays = editData.dueDate
        ? Math.ceil(
          (new Date(editData.dueDate).getTime() - new Date().getTime()) /
            (1000 * 60 * 60 * 24)
          )
        : 30;

      const updateData: Partial<Loan> = {
        customer: editData.customer,
        interestRate: parseFloat(editData.interestRate),
        termDays: termDays,
        collateral: editData.collateral || undefined,
      };

      const authUser = authService.getCurrentUser();
      const isAdmin = authUser?.role === "ADMIN";
      if (isAdmin && editData.assignedUserId) {
        updateData.userId = editData.assignedUserId;
      }

      // If gold loan fields are provided, include them
      if (editData.weight || editData.purity || editData.goldRate) {
        updateData.goldWeight = parseFloat(editData.weight) || undefined;
        updateData.goldPurity = parseFloat(editData.purity) || undefined;
        updateData.goldRate = parseFloat(editData.goldRate) || undefined;
      }

      // If amount is provided, update principal
      if (editData.amount) {
        const principalAmount = parseFloat(editData.amount.replace(/[₹,]/g, '')) || 0;
        if (principalAmount > 0) {
          updateData.principalAmount = principalAmount;
        }
      }

      const result = await loanService.updateLoan(editingLoanId, updateData);

      if (result.success) {
    await loadLoans();
    setIsEditDialogOpen(false);
    setEditingLoan(null);
    toast({
      title: "Loan Updated",
      description: "Loan details have been updated successfully",
    });
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to update loan",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating loan:", error);
      toast({
        title: "Error",
        description: "Failed to update loan. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getLoanStatus = (
    status: string,
    dueDate: string | undefined
  ): { status: string; daysUntilDue: number | null } => {
    // Never auto-change COMPLETED or PENDING
    if (status === 'COMPLETED' || status === 'PENDING') {
      return { status, daysUntilDue: null };
    }

    try {
      if (!dueDate) return { status: 'ACTIVE', daysUntilDue: null };

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const due = new Date(dueDate);
      due.setHours(0, 0, 0, 0);

      const daysUntilDue = Math.ceil(
        (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilDue < 0) {
        return { status: 'OVERDUE', daysUntilDue };
      }

      return { status: 'ACTIVE', daysUntilDue };
    } catch (e) {
      console.error("Error calculating loan status:", e);
      return { status: 'ACTIVE', daysUntilDue: null };
    }
  };

  const getStatusDisplay = (status: string, daysUntilDue: number | null) => {
    const statusLabels: Record<string, string> = {
      'ACTIVE': 'Active',
      'OVERDUE': 'Overdue',
      'COMPLETED': 'Completed',
      'PENDING': 'Pending',
      'CANCELLED': 'Cancelled'
    };

    if (daysUntilDue !== null) {
      if (status === 'OVERDUE') {
        return `Overdue (${Math.abs(daysUntilDue)}d)`;
      } else if (daysUntilDue <= 3) {
        return `Due in ${daysUntilDue}d`;
      }
    }

    return statusLabels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      'ACTIVE': { bg: 'bg-blue-100', text: 'text-blue-800' },
      'OVERDUE': { bg: 'bg-red-100', text: 'text-red-800' },
      'COMPLETED': { bg: 'bg-green-100', text: 'text-green-800' },
      'PENDING': { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      'CANCELLED': { bg: 'bg-gray-100', text: 'text-gray-800' }
    };
    return colors[status] || { bg: 'bg-gray-100', text: 'text-gray-800' };
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="border border-white/30 bg-transparent backdrop-blur-sm sticky top-0 z-50 text-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/admin")}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Dashboard</span>
              </Button>
              <h1 className="text-2xl font-bold bg-gradient-gold bg-clip-text text-transparent">
                Loans Management
              </h1>
            </div>
            <div className="text-sm text-muted-foreground">Total Loans: {loans.length}</div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Search and Filter Controls */}
        <Card className="mb-6 bg-transparent border border-white/30 backdrop-blur-md shadow-none text-white font-semibold">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Search className="h-5 w-5" />
              <span>Search & Filter</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="search">Search Loans</Label>
                <Input
                  id="search"
                  placeholder="Search by customer name, loan ID, or amount..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mt-1 bg-transparent text-white placeholder:text-white/60 border border-white/40 focus-visible:ring-white focus-visible:ring-offset-0"
                />
              </div>
              <div className="w-full md:w-48">
                <Label htmlFor="status-filter">Filter by Status</Label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                  }}
                  className="mt-1 flex h-10 w-full rounded-md border border-white/40 bg-transparent px-3 py-2 text-sm text-white ring-offset-0 placeholder:text-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="all">All Status</option>
                  <option value="PENDING">Pending</option>
                  <option value="ACTIVE">Active</option>
                  <option value="OVERDUE">Overdue</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Create New Loan Card */}
          <Card 
            className="cursor-pointer transition-all duration-300 border border-white/30 bg-transparent backdrop-blur-md hover:border-primary/70 hover:shadow-xl hover:-translate-y-1 text-black font-semibold"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <CardContent className="flex flex-col items-center justify-center p-8 h-full">
              <div className="rounded-full bg-primary/10 p-4 mb-4">
                <Plus className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Create New Loan</h3>
              <p className="text-sm text-black/70 text-center">
                Click to add a new loan to the system
              </p>
            </CardContent>
          </Card>

          {/* Existing Loans */}
          {filteredLoans.map((loan) => {
            const normalized = toUpperStatus(loan.status);
            const { status, daysUntilDue } = getLoanStatus(normalized, loan.dueDate);
            const statusColor = getStatusColor(status);
            
            return (
              <Card 
                key={loan.id} 
                className="overflow-hidden transition-all duration-300 border border-white/30 bg-transparent backdrop-blur-md hover:-translate-y-1 hover:shadow-xl text-black font-semibold"
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg text-black">{loan.customer}</CardTitle>
                      <p className="text-sm text-black/70">
                        {loan.loanNumber || loan.id}
                      </p>
                    </div>
                    <div 
                      className={`${statusColor.bg} ${statusColor.text} px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap`}
                    >
                      {getStatusDisplay(status, daysUntilDue)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-black">Amount</span>
                      <span className="font-medium">{formatCurrency(loan.principalAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-black">Due Date</span>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3.5 w-3.5 text-black/70" />
                        <span className="text-sm">{new Date(loan.dueDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {loan.interestRate && (
                      <div className="flex justify-between">
                        <span className="text-sm text-black">Interest Rate</span>
                        <span className="text-sm">{loan.interestRate}%</span>
                      </div>
                    )}
                    {loan.collateral && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-black/70 mb-1">Collateral</p>
                        <p className="text-sm text-black">{loan.collateral}</p>
                      </div>
                    )}
                    <div className="flex justify-end space-x-2 pt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="bg-white text-black border-white hover:bg-white/90 hover:text-black"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditLoan(loan);
                        }}
                      >
                        <Edit className="h-3.5 w-3.5 mr-1.5" />
                        Edit
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLoan(resolveLoanId(loan));
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        {/* Empty State */}
        {filteredLoans.length === 0 && (
          <div className="col-span-full text-center py-12">
            <DollarSign className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No loans found</h3>
            <p className="text-muted-foreground">
              {searchTerm || statusFilter !== "all"
                ? "Try adjusting your search or filter criteria"
                : "No loans have been created yet"}
            </p>
          </div>
        )}
      </div>

      {/* Create Loan Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Loan</DialogTitle>
            <DialogDescription>
              Fill in the details below to create a new loan
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {currentUser?.role === "ADMIN" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Assign User</Label>
                <Select
                  value={createData.assignedUserId}
                  onValueChange={handleCreateUserSelect}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="create-customer" className="text-right">
                Customer Name
              </Label>
              <Input
                id="create-customer"
                value={createData.customer}
                onChange={(e) => setCreateData(prev => ({ ...prev, customer: e.target.value }))}
                className="col-span-3"
                placeholder="Enter customer name"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="create-weight" className="text-right">
                Gold Weight (grams)
              </Label>
              <Input
                id="create-weight"
                type="number"
                value={createData.weight}
                onChange={(e) => setCreateData(prev => ({ ...prev, weight: e.target.value }))}
                className="col-span-3"
                placeholder="10.5"
                step="0.01"
                min="0"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="create-purity" className="text-right">
                Purity (%)
              </Label>
              <Input
                id="create-purity"
                type="number"
                value={createData.purity}
                onChange={(e) => setCreateData(prev => ({ ...prev, purity: e.target.value }))}
                className="col-span-3"
                placeholder="99.9"
                step="0.1"
                min="0"
                max="100"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="create-goldRate" className="text-right">
                Gold Rate (per gram)
              </Label>
              <Input
                id="create-goldRate"
                type="number"
                value={createData.goldRate}
                onChange={(e) => setCreateData(prev => ({ ...prev, goldRate: e.target.value }))}
                className="col-span-3"
                placeholder="6500"
                step="0.01"
                min="0"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="create-amount" className="text-right">
                Principal Amount
              </Label>
              <Input
                id="create-amount"
                value={createData.amount}
                readOnly
                className="col-span-3"
                placeholder="Auto-calculated"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="create-dueDate" className="text-right">
                Due Date
              </Label>
              <Input
                id="create-dueDate"
                type="date"
                value={createData.dueDate}
                onChange={(e) => setCreateData(prev => ({ ...prev, dueDate: e.target.value }))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="create-collateral" className="text-right">
                Collateral
              </Label>
              <select
                id="create-collateral"
                value={createData.collateral}
                onChange={(e) => setCreateData(prev => ({ ...prev, collateral: e.target.value }))}
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select collateral type</option>
                <option value="Gold Jewelry">Gold Jewelry</option>
                <option value="Gold Coins">Gold Coins</option>
                <option value="Gold Bars">Gold Bars</option>
                <option value="Gold Ornaments">Gold Ornaments</option>
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="create-interestRate" className="text-right">
                Interest Rate (%)
              </Label>
              <Input
                id="create-interestRate"
                type="number"
                value={createData.interestRate}
                onChange={(e) => setCreateData(prev => ({ ...prev, interestRate: e.target.value }))}
                className="col-span-3"
                placeholder="12"
                min="1"
                max="36"
              />
            </div>
          </div>

          {/* Real-time Calculations */}
          {(createData.weight || createData.purity || createData.goldRate) && (
            <div className="mt-4 p-4 bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200 rounded-lg">
              <h3 className="text-lg font-semibold text-yellow-800 mb-4 flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Live Calculations
              </h3>
              <div className="space-y-3">
                {calculations.goldValue > 0 && (
                  <>
                <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Gold Value:</span>
                      <span className="font-semibold text-base text-gray-800">
                        {formatCurrency(calculations.goldValue)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Maximum Allowed (80% LTV):</span>
                      <span className="font-semibold text-base text-blue-600">
                        {formatCurrency(calculations.maxAllowedPrincipal)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Principal Amount (80% LTV):</span>
                  <span className="font-semibold text-lg">
                    {createData.amount || formatCurrency(0)}
                  </span>
                </div>
                    {calculations.ltv > 0 && (
                      <div className="text-xs text-gray-500 italic">
                        LTV: {calculations.ltv.toFixed(2)}%
                      </div>
                    )}
                    <div className="border-t border-yellow-200 pt-2 mt-2"></div>
                  </>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Interest Amount:</span>
                  <span className="font-semibold text-lg">
                    {calculations.interest > 0 
                      ? formatCurrency(calculations.interest)
                      : formatCurrency(0)}
                  </span>
                </div>
                <div className="border-t border-yellow-200 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Total Repayment:</span>
                    <span className="font-bold text-xl text-green-600">
                      {calculations.totalRepayment > 0 
                        ? formatCurrency(calculations.totalRepayment)
                        : formatCurrency(0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateLoan}
              disabled={isCreating}
            >
              {isCreating ? 'Creating...' : 'Create Loan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Loan Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Loan</DialogTitle>
            <DialogDescription>
              Update the loan details. Gold calculations will be performed automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {currentUser?.role === "ADMIN" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Assign User</Label>
                <Select
                  value={editData.assignedUserId || resolveLoanUserId(editingLoan)}
                  onValueChange={handleEditUserSelect}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-customer" className="text-right">
                Customer Name
              </Label>
              <Input
                id="edit-customer"
                value={editData.customer}
                onChange={(e) => setEditData((prev) => ({ ...prev, customer: e.target.value }))}
                className="col-span-3"
                placeholder="Enter customer name"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-weight" className="text-right">
                Gold Weight (grams)
              </Label>
              <Input
                id="edit-weight"
                type="number"
                value={editData.weight}
                onChange={(e) => setEditData((prev) => ({ ...prev, weight: e.target.value }))}
                className="col-span-3"
                placeholder="10.5"
                step="0.01"
                min="0"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-purity" className="text-right">
                Purity (%)
              </Label>
              <Input
                id="edit-purity"
                type="number"
                value={editData.purity}
                onChange={(e) => setEditData((prev) => ({ ...prev, purity: e.target.value }))}
                className="col-span-3"
                placeholder="99.9"
                step="0.1"
                min="0"
                max="100"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-goldRate" className="text-right">
                Gold Rate (per gram)
              </Label>
              <Input
                id="edit-goldRate"
                type="number"
                value={editData.goldRate}
                onChange={(e) => setEditData((prev) => ({ ...prev, goldRate: e.target.value }))}
                className="col-span-3"
                placeholder="6500"
                step="0.01"
                min="0"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-amount" className="text-right">
                Principal Amount
              </Label>
              <Input
                id="edit-amount"
                value={editData.amount}
                onChange={(e) => setEditData((prev) => ({ ...prev, amount: e.target.value }))}
                className="col-span-3"
                placeholder="Auto-calculated"
                readOnly={!!(editData.weight && editData.purity && editData.goldRate)}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-dueDate" className="text-right">
                Due Date
              </Label>
              <Input
                id="edit-dueDate"
                type="date"
                value={editData.dueDate}
                onChange={(e) => setEditData((prev) => ({ ...prev, dueDate: e.target.value }))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-collateral" className="text-right">
                Collateral
              </Label>
              <select
                id="edit-collateral"
                value={editData.collateral}
                onChange={(e) => setEditData((prev) => ({ ...prev, collateral: e.target.value }))}
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select collateral type</option>
                <option value="Gold Jewelry">Gold Jewelry</option>
                <option value="Gold Coins">Gold Coins</option>
                <option value="Gold Bars">Gold Bars</option>
                <option value="Gold Ornaments">Gold Ornaments</option>
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-interestRate" className="text-right">
                Interest Rate (%)
              </Label>
              <Input
                id="edit-interestRate"
                type="number"
                value={editData.interestRate}
                onChange={(e) => setEditData((prev) => ({ ...prev, interestRate: e.target.value }))}
                className="col-span-3"
                placeholder="12"
                min={1}
                max={36}
              />
            </div>
          </div>

          {/* Real-time Calculations Sidebar */}
          {(editData.weight || editData.purity || editData.goldRate) && (
            <div className="mt-6 p-4 bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200 rounded-lg">
              <h3 className="text-lg font-semibold text-yellow-800 mb-4 flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Live Calculations
              </h3>
              <div className="space-y-3">
                {calculations.goldValue > 0 && (
                  <>
                <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Gold Value:</span>
                      <span className="font-semibold text-base text-gray-800">
                        {formatCurrency(calculations.goldValue)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Maximum Allowed (80% LTV):</span>
                      <span className="font-semibold text-base text-blue-600">
                        {formatCurrency(calculations.maxAllowedPrincipal)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Principal Amount (80% LTV):</span>
                  <span className="font-semibold text-lg">{formatCurrency(calculations.principal)}</span>
                </div>
                    {calculations.ltv > 0 && (
                      <div className="text-xs text-gray-500 italic">
                        LTV: {calculations.ltv.toFixed(2)}%
                      </div>
                    )}
                    <div className="border-t border-yellow-200 pt-2 mt-2"></div>
                  </>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Interest Amount:</span>
                  <span className="font-semibold text-lg">{formatCurrency(calculations.interest)}</span>
                </div>
                <div className="border-t border-yellow-200 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Total Repayment:</span>
                    <span className="font-bold text-xl text-green-600">
                      {formatCurrency(calculations.totalRepayment)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleUpdateLoan()}>Update Loan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LoansManagement;
