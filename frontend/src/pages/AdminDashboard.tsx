import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { 
  Users, 
  TrendingUp, 
  AlertCircle, 
  DollarSign,
  UserCheck,
  FileText,
  Settings,
  LogOut,
  Bell,
  Search,
  Filter,
  MoreVertical,
  CheckCircle,
  XCircle,
  User,
  Edit,
  Trash2,
  Calendar,
  Weight,
  Gem,
  RefreshCw,
  Wallet,
  Eye,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { calculateAllValues, formatCurrency, validateGoldLoanData } from "@/lib/goldCalculations";
import authService from "@/lib/authService";
import loanService from "@/lib/loanService";
import { authAPI, adminAPI } from "@/lib/api";
import { Loan, User as UserType, Transaction, SystemSettings } from "@/lib/api";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  
  // Dashboard data
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [pendingUsers, setPendingUsers] = useState<UserType[]>([]);
  const [allUsers, setAllUsers] = useState<UserType[]>([]);
  const [allLoans, setAllLoans] = useState<Loan[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [settingsForm, setSettingsForm] = useState({
    defaultInterestRate: "",
    currentGoldRate: "",
    maxLoanAmount: "",
    minLoanAmount: "",
    defaultLoanDuration: "",
    autoApprovalLimit: "",
    companyName: "",
    companyEmail: "",
    companyPhone: "",
    businessHours: "",
    emailNotifications: true,
    smsNotifications: false,
    overdueReminders: true,
    approvalAlerts: true,
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsDirty, setSettingsDirty] = useState(false);
  const notificationToggleConfig: Array<{
    label: string;
    field: "emailNotifications" | "smsNotifications" | "overdueReminders" | "approvalAlerts";
    description: string;
  }> = [
    { label: "Email Notifications", field: "emailNotifications", description: "Send critical updates to admins and customers." },
    { label: "SMS Notifications", field: "smsNotifications", description: "Enable SMS alerts for time-sensitive events." },
    { label: "Overdue Reminders", field: "overdueReminders", description: "Automatically remind customers when payments are overdue." },
    { label: "Approval Alerts", field: "approvalAlerts", description: "Notify admins whenever a new approval is required." }
  ];
  
  // UI states
  const [isCreateLoanOpen, setIsCreateLoanOpen] = useState(false);
  const [isUserApprovalOpen, setIsUserApprovalOpen] = useState(false);
  const [isUserDashboardOpen, setIsUserDashboardOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [selectedUserDashboardData, setSelectedUserDashboardData] = useState<any>(null);
  const [loadingUserDashboard, setLoadingUserDashboard] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  
  // Form data
  const [newLoanData, setNewLoanData] = useState({
    customer: "",
    principalAmount: "",
    interestRate: "12",
    termDays: "30",
    goldWeight: "",
    goldPurity: "22",
    goldRate: "6500",
    collateral: "",
    comments: ""
  });

  // Load dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      
      // Check if user is authenticated and is admin
      if (!authService.isAuthenticated()) {
        navigate("/login");
        return;
      }

      const user = authService.getCurrentUser();
      
      if (!user || user.role !== 'ADMIN') {
        navigate("/login");
        return;
      }
      
      setCurrentUser(user);
      
      try {
        // Load dashboard data
        const dashboardResponse = await adminAPI.getDashboardData();
        if (dashboardResponse.success && dashboardResponse.data) {
          setDashboardData(dashboardResponse.data);
          setAllLoans(dashboardResponse.data.recentLoans || []);
          setRecentTransactions(dashboardResponse.data.recentTransactions || []);
        }
        
        // Load pending users
        const pendingResponse = await authAPI.getPendingUsers();
        if (pendingResponse.success && pendingResponse.data) {
          setPendingUsers(pendingResponse.data);
        }
        
        // Load all users
        const usersResponse = await adminAPI.getAllCustomers();
        if (usersResponse.success && usersResponse.data) {
          setAllUsers(usersResponse.data);
        }

        // Load system settings
        setSettingsLoading(true);
        const settingsResponse = await adminAPI.getSystemSettings();
        if (settingsResponse.success && settingsResponse.data) {
          setSystemSettings(settingsResponse.data);
          populateSettingsForm(settingsResponse.data);
        }
        setSettingsLoading(false);
        
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        toast({
          title: "Error",
          description: "Failed to load dashboard data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
        setSettingsLoading(false);
      }
    };

    loadDashboardData();
  }, [navigate, toast]);

  const handleLogout = async () => {
    await authService.logout();
    navigate("/");
  };

  const handleSettingsInputChange = (field: keyof typeof settingsForm, value: string) => {
    setSettingsForm((prev) => ({ ...prev, [field]: value }));
    setSettingsDirty(true);
  };

  const handleSettingsToggleChange = (field: keyof typeof settingsForm, value: boolean) => {
    setSettingsForm((prev) => ({ ...prev, [field]: value }));
    setSettingsDirty(true);
  };

  const handleResetSettings = () => {
    if (systemSettings) {
      populateSettingsForm(systemSettings);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSettingsSaving(true);
      const payload: Partial<SystemSettings> = {
        defaultInterestRate: parseFloat(settingsForm.defaultInterestRate) || 0,
        currentGoldRate: parseFloat(settingsForm.currentGoldRate) || 0,
        maxLoanAmount: parseFloat(settingsForm.maxLoanAmount) || 0,
        minLoanAmount: parseFloat(settingsForm.minLoanAmount) || 0,
        defaultLoanDuration: parseInt(settingsForm.defaultLoanDuration) || 0,
        autoApprovalLimit: parseFloat(settingsForm.autoApprovalLimit) || 0,
        companyName: settingsForm.companyName,
        companyEmail: settingsForm.companyEmail,
        companyPhone: settingsForm.companyPhone,
        businessHours: settingsForm.businessHours,
        emailNotifications: settingsForm.emailNotifications,
        smsNotifications: settingsForm.smsNotifications,
        overdueReminders: settingsForm.overdueReminders,
        approvalAlerts: settingsForm.approvalAlerts,
      };

      const response = await adminAPI.updateSystemSettings(payload);
      if (response.success && response.data) {
        setSystemSettings(response.data);
        populateSettingsForm(response.data);
        toast({
          title: "Settings updated",
          description: "System settings have been saved successfully.",
        });
      } else {
        throw new Error(response.error || "Failed to update settings");
      }
    } catch (error) {
      console.error("Update settings error:", error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSettingsSaving(false);
    }
  };

  const populateSettingsForm = (settings: SystemSettings) => {
    setSettingsForm({
      defaultInterestRate: settings.defaultInterestRate?.toString() || "",
      currentGoldRate: settings.currentGoldRate?.toString() || "",
      maxLoanAmount: settings.maxLoanAmount?.toString() || "",
      minLoanAmount: settings.minLoanAmount?.toString() || "",
      defaultLoanDuration: settings.defaultLoanDuration?.toString() || "",
      autoApprovalLimit: settings.autoApprovalLimit?.toString() || "",
      companyName: settings.companyName || "",
      companyEmail: settings.companyEmail || "",
      companyPhone: settings.companyPhone || "",
      businessHours: settings.businessHours || "",
      emailNotifications: Boolean(settings.emailNotifications),
      smsNotifications: Boolean(settings.smsNotifications),
      overdueReminders: Boolean(settings.overdueReminders),
      approvalAlerts: Boolean(settings.approvalAlerts),
    });
    setSettingsDirty(false);
  };

  const handleApproveUser = async (userId: string, approved: boolean, comments?: string) => {
    try {
      if (!userId) {
        toast({
          title: "Error",
          description: "User ID not found",
          variant: "destructive"
        });
        return;
      }
      
      const result = await authAPI.approveUser(userId, approved, comments);
      if (result.success) {
        toast({
          title: approved ? "User Approved" : "User Rejected",
          description: `User has been ${approved ? 'approved' : 'rejected'} successfully.`,
        });
        
        // Refresh pending users
        const pendingResponse = await authAPI.getPendingUsers();
        if (pendingResponse.success && pendingResponse.data) {
          setPendingUsers(pendingResponse.data);
        }
        
        setIsUserApprovalOpen(false);
        setSelectedUser(null);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to process user approval",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process user approval",
        variant: "destructive"
      });
    }
  };

  const handleCreateLoan = async () => {
    // Validate form data
    if (!newLoanData.customer || !newLoanData.principalAmount) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      // Find user by name (in real app, you'd have a user selector)
      const user = allUsers.find(u => u.name.toLowerCase().includes(newLoanData.customer.toLowerCase()));
      if (!user) {
        toast({
          title: "Error",
          description: "Customer not found. Please check the customer name.",
          variant: "destructive"
        });
        return;
      }

      const result = await loanService.createLoan({
        userId: user.id,
        customer: newLoanData.customer,
        principalAmount: parseFloat(newLoanData.principalAmount),
        interestRate: parseFloat(newLoanData.interestRate),
        termDays: parseInt(newLoanData.termDays),
        goldWeight: newLoanData.goldWeight ? parseFloat(newLoanData.goldWeight) : undefined,
        goldPurity: newLoanData.goldPurity ? parseFloat(newLoanData.goldPurity) : undefined,
        goldRate: newLoanData.goldRate ? parseFloat(newLoanData.goldRate) : undefined,
        collateral: newLoanData.collateral || undefined,
        comments: newLoanData.comments || undefined
      });

      if (result.success) {
        toast({
          title: "Loan Created",
          description: "New loan has been created successfully.",
        });
        
        // Reset form
        setNewLoanData({
          customer: "",
          principalAmount: "",
          interestRate: "12",
          termDays: "30",
          goldWeight: "",
          goldPurity: "22",
          goldRate: "6500",
          collateral: "",
          comments: ""
        });
        
        setIsCreateLoanOpen(false);
        
        // Refresh data
        window.location.reload();
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to create loan",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create loan",
        variant: "destructive"
      });
    }
  };

  const handleUpdateLoanStatus = async (loanId: string, status: Loan['status']) => {
    try {
      const result = await loanService.updateLoanStatus(loanId, status);
      if (result.success) {
        toast({
          title: "Status Updated",
          description: "Loan status has been updated successfully.",
        });
        
        // Refresh loans
        const loans = await loanService.getAllLoans();
        setAllLoans(loans);
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to update loan status",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update loan status",
        variant: "destructive"
      });
    }
  };

  const handleDeleteLoan = async (loanId: string) => {
    if (!confirm("Are you sure you want to delete this loan?")) return;
    
    try {
      const result = await loanService.deleteLoan(loanId);
      if (result.success) {
        toast({
          title: "Loan Deleted",
          description: "Loan has been deleted successfully.",
        });
        
        // Refresh loans
        const loans = await loanService.getAllLoans();
        setAllLoans(loans);
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to delete loan",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete loan",
        variant: "destructive"
      });
    }
  };

  // Filter loans based on search and status
  const filteredLoans = allLoans.filter(loan => {
    const matchesSearch = loan.loanNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         loan.customer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || loan.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-gradient-gold rounded-lg">
                <Gem className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">GoldLoan Pro</h1>
                <p className="text-white/80">Admin Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">
            Welcome, {currentUser?.name}!
          </h2>
          <p className="text-white/80">
            Manage your gold loan business efficiently
          </p>
        </div>

        {/* Stats Cards */}
        {dashboardData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm">Total Users</p>
                    <p className="text-2xl font-bold text-white">{dashboardData.totalUsers || 0}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm">Total Loans</p>
                    <p className="text-2xl font-bold text-white">{dashboardData.totalLoans || 0}</p>
                  </div>
                  <FileText className="h-8 w-8 text-green-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm">Active Loans</p>
                    <p className="text-2xl font-bold text-white">{dashboardData.activeLoans || 0}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-yellow-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm">Pending Approvals</p>
                    <p className="text-2xl font-bold text-white">{dashboardData.pendingApprovals || 0}</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-red-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <div className="flex space-x-1 mb-6">
          {[
            { id: "overview", label: "Overview", icon: TrendingUp },
            { id: "users", label: "User Management", icon: Users },
            { id: "loans", label: "Loans Management", icon: FileText, path: "/admin/loans" },
            { id: "transactions", label: "Transactions", icon: DollarSign },
            { id: "stock", label: "Stock Register", icon: Wallet, path: "/admin/stock-register" },
            { id: "settings", label: "Settings", icon: Settings }
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={selectedTab === tab.id ? "default" : "ghost"}
              className={`${
                selectedTab === tab.id
                  ? "bg-gradient-gold text-white"
                  : "text-white/80 hover:text-white hover:bg-white/20"
              }`}
              onClick={() => {
                if (tab.path) {
                  navigate(tab.path);
                } else {
                  setSelectedTab(tab.id);
                }
              }}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Tab Content */}
        {selectedTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pending Approvals */}
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    Pending User Approvals
                    {pendingUsers.length > 0 && (
                      <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-300">
                        {pendingUsers.length}
                      </Badge>
                    )}
                  </CardTitle>
                  {pendingUsers.length > 0 && (
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white"
                      onClick={() => {
                        setSelectedTab("users");
                        setFilterStatus("pending");
                      }}
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      Manage All
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {pendingUsers.length > 0 ? (
                  <div className="space-y-3">
                    {pendingUsers.slice(0, 3).map((user, index) => (
                      <div key={user.id || `user-${index}`} className="flex items-center justify-between py-3 border-b border-white/10 last:border-b-0">
                        <div>
                          <p className="text-white font-medium">{user.name}</p>
                          <p className="text-white/60 text-sm">{user.email}</p>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            className="bg-green-500 hover:bg-green-600"
                            onClick={() => {
                              setSelectedUser(user);
                              setIsUserApprovalOpen(true);
                            }}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedUser(user);
                              setIsUserApprovalOpen(true);
                            }}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {pendingUsers.length > 3 && (
                      <p className="text-white/60 text-sm text-center">
                        +{pendingUsers.length - 3} more pending approvals
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-white/60 text-center py-4">No pending approvals</p>
                )}
              </CardContent>
            </Card>

            {/* Recent Loans */}
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Recent Loans</CardTitle>
              </CardHeader>
              <CardContent>
                {allLoans.slice(0, 3).map((loan, index) => (
                  <div key={loan.id || `loan-${index}`} className="flex items-center justify-between py-3 border-b border-white/10 last:border-b-0">
                    <div>
                      <p className="text-white font-medium">{loan.loanNumber}</p>
                      <p className="text-white/60 text-sm">{loan.customer}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-medium">{formatCurrency(loan.principalAmount)}</p>
                      <Badge 
                        variant={loan.status === 'ACTIVE' ? 'default' : 'secondary'}
                        className={loan.status === 'ACTIVE' ? 'bg-green-500' : ''}
                      >
                        {loan.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {allLoans.length === 0 && (
                  <p className="text-white/60 text-center py-4">No loans found</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {selectedTab === "users" && (
          <div className="space-y-6">
            {/* User Management Header */}
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="text-white">User Management</CardTitle>
                <CardDescription className="text-white/60">
                  Manage all users and approve pending registrations
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Filters */}
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Search users by name, email, or phone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={filterStatus === "all" ? "default" : "outline"}
                      onClick={() => setFilterStatus("all")}
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                    >
                      All Users
                    </Button>
                    <Button
                      variant={filterStatus === "pending" ? "default" : "outline"}
                      onClick={() => setFilterStatus("pending")}
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                    >
                      Pending
                    </Button>
                    <Button
                      variant={filterStatus === "approved" ? "default" : "outline"}
                      onClick={() => setFilterStatus("approved")}
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                    >
                      Approved
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Users List */}
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {(() => {
                    // Filter users based on search term and status
                    let filteredUsers = allUsers;
                    
                    if (searchTerm) {
                      filteredUsers = filteredUsers.filter(user =>
                        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        user.phone.includes(searchTerm)
                      );
                    }
                    
                    if (filterStatus === "pending") {
                      filteredUsers = filteredUsers.filter(user => user.role === "PENDING");
                    } else if (filterStatus === "approved") {
                      filteredUsers = filteredUsers.filter(user => user.role === "USER" || user.role === "ADMIN");
                    }
                    
                    return filteredUsers.map((user, index) => (
                      <div key={user.id || `user-${index}`} className="p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-white font-medium">{user.name}</h3>
                              <Badge 
                                variant={
                                  user.role === "PENDING" ? "secondary" :
                                  user.role === "USER" ? "default" : "destructive"
                                }
                                className={
                                  user.role === "PENDING" ? "bg-yellow-500/20 text-yellow-300" :
                                  user.role === "USER" ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"
                                }
                              >
                                {user.role}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-white/60">
                              <p><span className="font-medium">Email:</span> {user.email}</p>
                              <p><span className="font-medium">Phone:</span> {user.phone}</p>
                              {user.address && <p><span className="font-medium">Address:</span> {user.address}</p>}
                              {user.city && <p><span className="font-medium">City:</span> {user.city}</p>}
                            </div>
                            <p className="text-xs text-white/40 mt-2">
                              Joined: {new Date(user.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex flex-col gap-2 ml-4">
                            {user.role === "PENDING" ? (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-green-500 hover:bg-green-600"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setIsUserApprovalOpen(true);
                                  }}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setIsUserApprovalOpen(true);
                                  }}
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Reject
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30"
                                  onClick={async () => {
                                    setSelectedUser(user);
                                    setLoadingUserDashboard(true);
                                    setIsUserDashboardOpen(true);
                                    try {
                                      const response = await adminAPI.getUserDashboardData(user.id);
                                      if (response.success && response.data) {
                                        setSelectedUserDashboardData(response.data);
                                      } else {
                                        toast({
                                          title: "Error",
                                          description: "Failed to load user dashboard data",
                                          variant: "destructive"
                                        });
                                      }
                                    } catch (error) {
                                      console.error('Error loading user dashboard:', error);
                                      toast({
                                        title: "Error",
                                        description: "Failed to load user dashboard data",
                                        variant: "destructive"
                                      });
                                    } finally {
                                      setLoadingUserDashboard(false);
                                    }
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Dashboard
                                </Button>
                                <div className="text-center mt-2">
                                <Badge 
                                  variant="outline"
                                  className="bg-green-500/20 text-green-300 border-green-500/30"
                                >
                                  {user.role === "USER" ? "Active User" : "Admin"}
                                </Badge>
                              </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                  
                  {(() => {
                    let filteredUsers = allUsers;
                    if (searchTerm) {
                      filteredUsers = filteredUsers.filter(user =>
                        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        user.phone.includes(searchTerm)
                      );
                    }
                    if (filterStatus === "pending") {
                      filteredUsers = filteredUsers.filter(user => user.role === "PENDING");
                    } else if (filterStatus === "approved") {
                      filteredUsers = filteredUsers.filter(user => user.role === "USER" || user.role === "ADMIN");
                    }
                    
                    if (filteredUsers.length === 0) {
                      return (
                        <div className="text-center py-8">
                          <Users className="h-12 w-12 text-white/40 mx-auto mb-4" />
                          <p className="text-white/60">
                            {searchTerm ? "No users found matching your search" : 
                             filterStatus === "pending" ? "No pending user approvals" :
                             filterStatus === "approved" ? "No approved users" : "No users found"}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {selectedTab === "loans" && (
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Loan Management</CardTitle>
                <Button
                  className="bg-gradient-gold hover:opacity-90"
                  onClick={() => setIsCreateLoanOpen(true)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Create Loan
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search and Filter */}
              <div className="flex space-x-4 mb-6">
                <div className="flex-1">
                  <Input
                    placeholder="Search loans..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder-white/60"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 bg-white/10 border border-white/20 text-white rounded-md"
                >
                  <option value="all">All Status</option>
                  <option value="PENDING">Pending</option>
                  <option value="ACTIVE">Active</option>
                  <option value="OVERDUE">Overdue</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>

              <div className="space-y-4">
                {filteredLoans.map((loan, index) => (
                  <div key={loan.id || `loan-${index}`} className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-white font-medium">{loan.loanNumber}</h3>
                        <p className="text-white/60 text-sm">Customer: {loan.customer}</p>
                      </div>
                      <Badge 
                        variant={loan.status === 'ACTIVE' ? 'default' : 'secondary'}
                        className={loan.status === 'ACTIVE' ? 'bg-green-500' : ''}
                      >
                        {loan.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                      <div>
                        <p className="text-white/60 text-xs">Principal</p>
                        <p className="text-white font-medium">{formatCurrency(loan.principalAmount)}</p>
                      </div>
                      <div>
                        <p className="text-white/60 text-xs">Interest Rate</p>
                        <p className="text-white font-medium">{loan.interestRate}%</p>
                      </div>
                      <div>
                        <p className="text-white/60 text-xs">Due Date</p>
                        <p className="text-white font-medium">{new Date(loan.dueDate).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-white/60 text-xs">Total Repayment</p>
                        <p className="text-white font-medium">{formatCurrency(loan.totalRepayment || 0)}</p>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <select
                        value={loan.status}
                        onChange={(e) => handleUpdateLoanStatus(loan.id, e.target.value as Loan['status'])}
                        className="px-2 py-1 bg-white/10 border border-white/20 text-white rounded text-sm"
                      >
                        <option value="PENDING">Pending</option>
                        <option value="ACTIVE">Active</option>
                        <option value="OVERDUE">Overdue</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteLoan(loan.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {filteredLoans.length === 0 && (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-white/40 mx-auto mb-4" />
                    <p className="text-white/60">No loans found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {selectedTab === "transactions" && (
          <>
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
              <CardTitle className="text-white">Transaction History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentTransactions.map((transaction, index) => (
                    <div key={transaction.id || `transaction-${index}`} className="flex items-center justify-between py-3 border-b border-white/10 last:border-b-0">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-white/10 rounded-lg">
                          <DollarSign className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{transaction.type.replace('_', ' ')}</p>
                          <p className="text-white/60 text-sm">{new Date(transaction.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-medium">{formatCurrency(transaction.amount)}</p>
                        <Badge 
                          variant={transaction.status === 'COMPLETED' ? 'default' : 'secondary'}
                          className={transaction.status === 'COMPLETED' ? 'bg-green-500' : ''}
                        >
                          {transaction.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {recentTransactions.length === 0 && (
                    <div className="text-center py-8">
                      <DollarSign className="h-12 w-12 text-white/40 mx-auto mb-4" />
                      <p className="text-white/60">No transactions found</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick User Approval Section */}
            {pendingUsers.length > 0 && (
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 mt-6">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <UserCheck className="h-5 w-5" />
                    Pending User Approvals
                    <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-300">
                      {pendingUsers.length}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-white/60">
                    Quick approval actions for pending user registrations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pendingUsers.slice(0, 3).map((user, index) => (
                      <div key={user.id || `user-${index}`} className="p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="text-white font-medium">{user.name}</h4>
                              <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-300">
                                PENDING
                              </Badge>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-white/60">
                              <p><span className="font-medium">Email:</span> {user.email}</p>
                              <p><span className="font-medium">Phone:</span> {user.phone}</p>
                            </div>
                            <p className="text-xs text-white/40 mt-1">
                              Registered: {new Date(user.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex flex-col gap-2 ml-4">
                            <Button
                              size="sm"
                              className="bg-green-500 hover:bg-green-600"
                              onClick={() => {
                                setSelectedUser(user);
                                setIsUserApprovalOpen(true);
                              }}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedUser(user);
                                setIsUserApprovalOpen(true);
                              }}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {pendingUsers.length > 3 && (
                      <div className="text-center pt-4 border-t border-white/10">
                        <Button
                          variant="outline"
                          className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                          onClick={() => {
                            setSelectedTab("users");
                            setFilterStatus("pending");
                          }}
                        >
                          View All {pendingUsers.length} Pending Users
                          <Users className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {selectedTab === "settings" && (
          <div className="space-y-6">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Current Configuration</CardTitle>
                <CardDescription className="text-white/70">
                  Review the key limits and notification policies applied across the platform.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {systemSettings ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <p className="text-white/60 text-sm">Default Interest Rate</p>
                      <p className="text-2xl text-white font-semibold">
                        {systemSettings.defaultInterestRate}% p.a.
                      </p>
                    </div>
                    <div>
                      <p className="text-white/60 text-sm">Current Gold Rate</p>
                      <p className="text-2xl text-white font-semibold">
                        ₹{systemSettings.currentGoldRate?.toLocaleString()}/g
                      </p>
                    </div>
                    <div>
                      <p className="text-white/60 text-sm">Auto Approval Limit</p>
                      <p className="text-2xl text-white font-semibold">
                        ₹{systemSettings.autoApprovalLimit?.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-white/60 text-sm">Loan Range</p>
                      <p className="text-lg text-white font-semibold">
                        ₹{systemSettings.minLoanAmount?.toLocaleString()} - ₹{systemSettings.maxLoanAmount?.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-white/60 text-sm">Default Duration</p>
                      <p className="text-lg text-white font-semibold">
                        {systemSettings.defaultLoanDuration} days
                      </p>
                    </div>
                    <div>
                      <p className="text-white/60 text-sm">Notification Policy</p>
                      <p className="text-sm text-white">
                        {systemSettings.emailNotifications ? "Email alerts enabled" : "Email alerts disabled"} ·{" "}
                        {systemSettings.overdueReminders ? "Overdue reminders ON" : "Overdue reminders OFF"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-white/60">Loading settings...</p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Update System Settings
                </CardTitle>
                <CardDescription className="text-white/70">
                  Tune operational limits and automated alerts. Changes take effect immediately.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white/80">Default Interest Rate (%)</Label>
                    <Input
                      type="number"
                      value={settingsForm.defaultInterestRate}
                      onChange={(e) => handleSettingsInputChange("defaultInterestRate", e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      disabled={settingsLoading}
                    />
                  </div>
                  <div>
                    <Label className="text-white/80">Current Gold Rate (₹/g)</Label>
                    <Input
                      type="number"
                      value={settingsForm.currentGoldRate}
                      onChange={(e) => handleSettingsInputChange("currentGoldRate", e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      disabled={settingsLoading}
                    />
                  </div>
                  <div>
                    <Label className="text-white/80">Minimum Loan Amount (₹)</Label>
                    <Input
                      type="number"
                      value={settingsForm.minLoanAmount}
                      onChange={(e) => handleSettingsInputChange("minLoanAmount", e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      disabled={settingsLoading}
                    />
                  </div>
                  <div>
                    <Label className="text-white/80">Maximum Loan Amount (₹)</Label>
                    <Input
                      type="number"
                      value={settingsForm.maxLoanAmount}
                      onChange={(e) => handleSettingsInputChange("maxLoanAmount", e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      disabled={settingsLoading}
                    />
                  </div>
                  <div>
                    <Label className="text-white/80">Default Loan Duration (days)</Label>
                    <Input
                      type="number"
                      value={settingsForm.defaultLoanDuration}
                      onChange={(e) => handleSettingsInputChange("defaultLoanDuration", e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      disabled={settingsLoading}
                    />
                  </div>
                  <div>
                    <Label className="text-white/80">Auto Approval Limit (₹)</Label>
                    <Input
                      type="number"
                      value={settingsForm.autoApprovalLimit}
                      onChange={(e) => handleSettingsInputChange("autoApprovalLimit", e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      disabled={settingsLoading}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white/80">Company Name</Label>
                    <Input
                      value={settingsForm.companyName}
                      onChange={(e) => handleSettingsInputChange("companyName", e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      disabled={settingsLoading}
                    />
                  </div>
                  <div>
                    <Label className="text-white/80">Company Email</Label>
                    <Input
                      type="email"
                      value={settingsForm.companyEmail}
                      onChange={(e) => handleSettingsInputChange("companyEmail", e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      disabled={settingsLoading}
                    />
                  </div>
                  <div>
                    <Label className="text-white/80">Company Phone</Label>
                    <Input
                      value={settingsForm.companyPhone}
                      onChange={(e) => handleSettingsInputChange("companyPhone", e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      disabled={settingsLoading}
                    />
                  </div>
                  <div>
                    <Label className="text-white/80">Business Hours</Label>
                    <Input
                      value={settingsForm.businessHours}
                      onChange={(e) => handleSettingsInputChange("businessHours", e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      disabled={settingsLoading}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {notificationToggleConfig.map((toggle) => (
                    <div key={toggle.field} className="flex items-start justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                      <div>
                        <p className="text-white font-medium">{toggle.label}</p>
                        <p className="text-white/60 text-sm">{toggle.description}</p>
                      </div>
                      <Switch
                        checked={Boolean(settingsForm[toggle.field])}
                        onCheckedChange={(checked) => handleSettingsToggleChange(toggle.field, checked)}
                        disabled={settingsLoading}
                      />
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-3">
                  <Button
                    variant="outline"
                    className="text-white border-white/30 hover:bg-white/10"
                    onClick={handleResetSettings}
                    disabled={!settingsDirty || settingsLoading || settingsSaving}
                  >
                    Reset
                  </Button>
                  <Button
                    className="bg-gradient-gold text-white disabled:opacity-50"
                    onClick={handleSaveSettings}
                    disabled={!settingsDirty || settingsSaving}
                  >
                    {settingsSaving ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </span>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Create Loan Dialog */}
      <Dialog open={isCreateLoanOpen} onOpenChange={setIsCreateLoanOpen}>
        <DialogContent className="bg-white/95 backdrop-blur-sm max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Loan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customer">Customer Name</Label>
                <Input
                  id="customer"
                  value={newLoanData.customer}
                  onChange={(e) => setNewLoanData({...newLoanData, customer: e.target.value})}
                  placeholder="Enter customer name"
                />
              </div>
              <div>
                <Label htmlFor="principalAmount">Principal Amount</Label>
                <Input
                  id="principalAmount"
                  type="number"
                  value={newLoanData.principalAmount}
                  onChange={(e) => setNewLoanData({...newLoanData, principalAmount: e.target.value})}
                  placeholder="Enter amount"
                />
              </div>
              <div>
                <Label htmlFor="interestRate">Interest Rate (%)</Label>
                <Input
                  id="interestRate"
                  type="number"
                  value={newLoanData.interestRate}
                  onChange={(e) => setNewLoanData({...newLoanData, interestRate: e.target.value})}
                  placeholder="12"
                />
              </div>
              <div>
                <Label htmlFor="termDays">Term (Days)</Label>
                <Input
                  id="termDays"
                  type="number"
                  value={newLoanData.termDays}
                  onChange={(e) => setNewLoanData({...newLoanData, termDays: e.target.value})}
                  placeholder="30"
                />
              </div>
              <div>
                <Label htmlFor="goldWeight">Gold Weight (grams)</Label>
                <Input
                  id="goldWeight"
                  type="number"
                  value={newLoanData.goldWeight}
                  onChange={(e) => setNewLoanData({...newLoanData, goldWeight: e.target.value})}
                  placeholder="Enter weight"
                />
              </div>
              <div>
                <Label htmlFor="goldPurity">Gold Purity (%)</Label>
                <Input
                  id="goldPurity"
                  type="number"
                  value={newLoanData.goldPurity}
                  onChange={(e) => setNewLoanData({...newLoanData, goldPurity: e.target.value})}
                  placeholder="22"
                />
              </div>
              <div>
                <Label htmlFor="goldRate">Gold Rate (per gram)</Label>
                <Input
                  id="goldRate"
                  type="number"
                  value={newLoanData.goldRate}
                  onChange={(e) => setNewLoanData({...newLoanData, goldRate: e.target.value})}
                  placeholder="6500"
                />
              </div>
              <div>
                <Label htmlFor="collateral">Collateral Description</Label>
                <Input
                  id="collateral"
                  value={newLoanData.collateral}
                  onChange={(e) => setNewLoanData({...newLoanData, collateral: e.target.value})}
                  placeholder="Enter collateral details"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="comments">Comments</Label>
              <Input
                id="comments"
                value={newLoanData.comments}
                onChange={(e) => setNewLoanData({...newLoanData, comments: e.target.value})}
                placeholder="Additional comments"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateLoanOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateLoan}
              className="bg-gradient-gold hover:opacity-90"
            >
              Create Loan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Approval Dialog */}
      <Dialog open={isUserApprovalOpen} onOpenChange={setIsUserApprovalOpen}>
        <DialogContent className="bg-white/95 backdrop-blur-sm max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Approval - {selectedUser?.name}</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              {/* User Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Full Name</Label>
                    <p className="text-sm text-gray-900">{selectedUser.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Email</Label>
                    <p className="text-sm text-gray-900">{selectedUser.email}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Phone</Label>
                    <p className="text-sm text-gray-900">{selectedUser.phone}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {selectedUser.address && (
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Address</Label>
                      <p className="text-sm text-gray-900">{selectedUser.address}</p>
                    </div>
                  )}
                  {selectedUser.city && (
                    <div>
                      <Label className="text-sm font-medium text-gray-700">City</Label>
                      <p className="text-sm text-gray-900">{selectedUser.city}</p>
                    </div>
                  )}
                  {selectedUser.pincode && (
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Pincode</Label>
                      <p className="text-sm text-gray-900">{selectedUser.pincode}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Registration Date</Label>
                    <p className="text-sm text-gray-900">{new Date(selectedUser.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              {(selectedUser.aadharNumber || selectedUser.panNumber) && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Identity Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedUser.aadharNumber && (
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Aadhar Number</Label>
                        <p className="text-sm text-gray-900">{selectedUser.aadharNumber}</p>
                      </div>
                    )}
                    {selectedUser.panNumber && (
                      <div>
                        <Label className="text-sm font-medium text-gray-700">PAN Number</Label>
                        <p className="text-sm text-gray-900">{selectedUser.panNumber}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Current Status */}
              <div className="border-t pt-4">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium text-gray-700">Current Status:</Label>
                  <Badge 
                    variant="secondary"
                    className="bg-yellow-500/20 text-yellow-700"
                  >
                    Pending Approval
                  </Badge>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setIsUserApprovalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleApproveUser(selectedUser.id, false)}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject User
                </Button>
                <Button
                  onClick={() => handleApproveUser(selectedUser.id, true)}
                  className="bg-green-500 hover:bg-green-600"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve User
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* User Dashboard Dialog */}
      <Dialog open={isUserDashboardOpen} onOpenChange={setIsUserDashboardOpen}>
        <DialogContent className="bg-white/95 backdrop-blur-sm max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Dashboard - {selectedUser?.name}</DialogTitle>
          </DialogHeader>
          {loadingUserDashboard ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : selectedUserDashboardData ? (
            <div className="space-y-6">
              {/* User Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Name</Label>
                  <p className="text-sm text-gray-900">{selectedUserDashboardData.user.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Email</Label>
                  <p className="text-sm text-gray-900">{selectedUserDashboardData.user.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Phone</Label>
                  <p className="text-sm text-gray-900">{selectedUserDashboardData.user.phone}</p>
                </div>
              </div>

              {/* Statistics Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm font-medium text-gray-500">Total Loans</div>
                    <div className="text-2xl font-bold">{selectedUserDashboardData.stats.totalLoans}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm font-medium text-gray-500">Active Loans</div>
                    <div className="text-2xl font-bold text-blue-600">{selectedUserDashboardData.stats.activeLoans}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm font-medium text-gray-500">Total Loan Amount</div>
                    <div className="text-2xl font-bold text-green-600">{formatCurrency(selectedUserDashboardData.stats.totalLoanAmount)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm font-medium text-gray-500">Total Paid</div>
                    <div className="text-2xl font-bold text-purple-600">{formatCurrency(selectedUserDashboardData.stats.totalPaid)}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Loans Table */}
              <div>
                <h3 className="text-lg font-semibold mb-4">User Loans</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Loan No</th>
                        <th className="text-left p-2">Customer</th>
                        <th className="text-left p-2">Principal</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">Due Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedUserDashboardData.loans.length > 0 ? (
                        selectedUserDashboardData.loans.map((loan: Loan) => (
                          <tr key={loan.id} className="border-b">
                            <td className="p-2">{loan.loanNumber}</td>
                            <td className="p-2">{loan.customer}</td>
                            <td className="p-2">{formatCurrency(loan.principalAmount)}</td>
                            <td className="p-2">
                              <Badge 
                                variant={loan.status === 'ACTIVE' ? 'default' : 'secondary'}
                                className={loan.status === 'ACTIVE' ? 'bg-green-500' : ''}
                              >
                                {loan.status}
                              </Badge>
                            </td>
                            <td className="p-2">{new Date(loan.dueDate).toLocaleDateString()}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-gray-500">No loans found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Transactions Table */}
              <div>
                <h3 className="text-lg font-semibold mb-4">User Transactions</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Type</th>
                        <th className="text-left p-2">Amount</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedUserDashboardData.transactions.length > 0 ? (
                        selectedUserDashboardData.transactions.map((transaction: Transaction) => (
                          <tr key={transaction.id} className="border-b">
                            <td className="p-2">{transaction.type.replace('_', ' ')}</td>
                            <td className="p-2">{formatCurrency(transaction.amount)}</td>
                            <td className="p-2">
                              <Badge 
                                variant={transaction.status === 'COMPLETED' ? 'default' : 'secondary'}
                                className={transaction.status === 'COMPLETED' ? 'bg-green-500' : ''}
                              >
                                {transaction.status}
                              </Badge>
                            </td>
                            <td className="p-2">{new Date(transaction.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-gray-500">No transactions found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No data available</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUserDashboardOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
