import { useState, useEffect, useCallback } from "react";
import ReadFolder from "./read";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type AppNotification = {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  date: string;
  isRead: boolean;
  source?: 'BACKEND' | 'LOCAL';
};
import { Progress } from "@/components/ui/progress";
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  AlertCircle, 
  FileText, 
  CreditCard, 
  Settings, 
  Bell, 
  LogOut, 
  Gem, 
  Calendar, 
  Download, 
  Eye, 
  RefreshCw, 
  Edit, 
  Save, 
  X, 
  Shield, 
  AlertTriangle,
  BarChart3,
  Clock,
  Wallet,
  Lock,
  User
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/goldCalculations";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import authService from "@/lib/authService";
import loanService from "@/lib/loanService";
import { paymentService } from "@/services/paymentService";
import { Loan, Transaction, Notification as ApiNotification, notificationsAPI } from "@/lib/api";
import { loadRazorpayScript } from "@/utils/razorpay";

const UserDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("overview");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userLoans, setUserLoans] = useState<Loan[]>([]);
  const [userTransactions, setUserTransactions] = useState<Transaction[]>([]);
  const [userNotifications, setUserNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [isLoanDetailOpen, setIsLoanDetailOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: ''
  });
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    pincode: ''
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const mapNotificationType = (type?: string): AppNotification['type'] => {
    switch ((type || '').toUpperCase()) {
      case 'SUCCESS':
        return 'success';
      case 'WARNING':
      case 'PAYMENT_DUE':
      case 'APPROVAL':
        return 'warning';
      case 'ERROR':
        return 'error';
      default:
        return 'info';
    }
  };

  const fetchFinancialData = useCallback(async (userId: string) => {
    let loans = await loanService.getUserLoans(userId);

    if (!loans || loans.length === 0) {
      const allLoans = await loanService.getAllLoans();
      loans = allLoans.filter((loan) => {
        const loanUserId =
          typeof loan.userId === "string"
            ? loan.userId
            : (loan.userId as any)?.id || (loan.userId as any)?._id || "";
        return loanUserId === userId;
      });
    }
    setUserLoans(loans);
    const transactions = await loanService.getUserTransactions(userId);
    setUserTransactions(transactions);
    return loans;
  }, []);

  const buildLocalNotifications = useCallback((loans: Loan[]): AppNotification[] => {
    const notifications: AppNotification[] = [];

    loans.forEach(loan => {
      if (loan.status === "ACTIVE") {
        const dueDate = new Date(loan.dueDate);
        const today = new Date();
        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilDue <= 7 && daysUntilDue > 0) {
          notifications.push({
            id: `notif-${loan.id}`,
            title: "Payment Due Soon",
            message: `Your loan payment is due in ${daysUntilDue} days.`,
            type: "warning",
            date: new Date().toISOString(),
            isRead: false,
            source: 'LOCAL'
          });
        } else if (daysUntilDue <= 0) {
          notifications.push({
            id: `overdue-${loan.id}`,
            title: "Payment Overdue",
            message: `Your loan payment is overdue. Please make payment immediately.`,
            type: "error",
            date: new Date().toISOString(),
            isRead: false,
            source: 'LOCAL'
          });
        }
      }
    });

    return notifications;
  }, []);

  const fetchNotifications = useCallback(async (userId: string, loans: Loan[]) => {
    try {
      const response = await notificationsAPI.getUserNotifications(userId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to load notifications');
      }

      const backendNotifications: AppNotification[] = (response.data || []).map((notification: ApiNotification & { _id?: string }) => ({
        id: notification.id || notification._id || `notif-${Math.random().toString(36).slice(2)}`,
        title: notification.title,
        message: notification.message,
        type: mapNotificationType(notification.type),
        date: notification.createdAt || new Date().toISOString(),
        isRead: notification.isRead ?? false,
        source: 'BACKEND'
      }));

      const localNotifications = buildLocalNotifications(loans);
      setUserNotifications([...backendNotifications, ...localNotifications]);
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast({
        title: "Notifications unavailable",
        description: "We couldn't load system notifications. Showing local alerts only.",
        variant: "destructive"
      });
      setUserNotifications(buildLocalNotifications(loans));
    }
  }, [buildLocalNotifications, toast]);

  // Load user-specific data
  useEffect(() => {
    const loadUserData = async () => {
      setLoading(true);
      
      // Check if user is authenticated
      if (!authService.isAuthenticated()) {
        navigate("/login");
        return;
      }

      const user = authService.getCurrentUser();
      if (!user) {
        navigate("/login");
        return;
      }
      
      setCurrentUser(user);
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        city: user.city || '',
        pincode: user.pincode || ''
      });
      
      try {
        const loans = await fetchFinancialData(user.id);
        await fetchNotifications(user.id, loans);
      } catch (error) {
        console.error('Error loading user data:', error);
        toast({
          title: "Error",
          description: "Failed to load your data. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [navigate, toast, fetchFinancialData, fetchNotifications]);

  const handleLogout = async () => {
    await authService.logout();
    navigate("/");
  };

  const handleRazorpayPayment = async () => {
    if (!selectedLoan || !currentUser) {
      toast({
        title: "Error",
        description: "No loan selected",
        variant: "destructive"
      });
      return;
    }

    const selectedLoanAny = selectedLoan as any;
    const normalizedLoanId =
      selectedLoan.id ||
      selectedLoanAny?._id ||
      (typeof selectedLoanAny?.loanId === "string"
        ? selectedLoanAny.loanId
        : selectedLoanAny?.loanId?._id);

    if (!normalizedLoanId) {
      toast({
        title: "Error",
        description: "Unable to determine loan ID. Please contact support.",
        variant: "destructive"
      });
      return;
    }

    const amount = parseFloat(paymentData.amount);
    if (!amount || amount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid payment amount",
        variant: "destructive"
      });
      return;
    }

    setIsProcessingPayment(true);

    try {
      const orderResponse = await paymentService.createOrder({
        loanId: normalizedLoanId,
        amount,
        paymentType: 'INTEREST_PAYMENT'
      });

      if (!orderResponse.success || !orderResponse.data) {
        throw new Error(orderResponse.message || "Failed to initiate payment");
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error("Unable to load Razorpay. Please try again.");
      }

      const { orderId, amount: orderAmount, currency, keyId, transactionId, customer } = orderResponse.data;

      const options = {
        key: keyId,
        amount: orderAmount,
        currency,
        name: "GoldLoan Pro",
        description: `Loan ${selectedLoan.loanNumber}`,
        order_id: orderId,
        prefill: {
          name: customer?.name || currentUser.name,
          email: customer?.email || currentUser.email,
          contact: customer?.phone || currentUser.phone
        },
        theme: {
          color: "#f5c146"
        },
        handler: async (response: any) => {
          const verifyResponse = await paymentService.verifyPayment({
            transactionId,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
          });

          if (verifyResponse.success) {
            toast({
              title: "Payment Successful",
              description: "Your payment has been processed successfully."
            });
            setIsPaymentOpen(false);
            setPaymentData({ amount: '' });
            if (currentUser?.id) {
              const loans = await fetchFinancialData(currentUser.id);
              await fetchNotifications(currentUser.id, loans);
            }
          } else {
            toast({
              title: "Verification Failed",
              description: verifyResponse.message || "Payment verification failed",
              variant: "destructive"
            });
          }
          setIsProcessingPayment(false);
        },
        modal: {
          ondismiss: () => {
            setIsProcessingPayment(false);
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", () => {
        toast({
          title: "Payment Failed",
          description: "Your payment could not be completed.",
          variant: "destructive"
        });
        setIsProcessingPayment(false);
      });
      razorpay.open();
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Error",
        description: error instanceof Error ? error.message : "Failed to process payment",
        variant: "destructive"
      });
      setIsProcessingPayment(false);
    }
  };

  const handleProfileUpdate = async () => {
    try {
      // Update profile logic would go here
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
      setIsEditingProfile(false);
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update profile",
        variant: "destructive"
      });
    }
  };

  // Calculate dashboard statistics
  const totalLoanAmount = userLoans.reduce((sum, loan) => sum + loan.principalAmount, 0);
  const activeLoans = userLoans.filter(loan => loan.status === 'ACTIVE').length;
  const overdueLoans = userLoans.filter(loan => loan.status === 'OVERDUE').length;
  const totalPaid = userTransactions
    .filter(t => t.type === 'INTEREST_PAYMENT' && t.status === 'COMPLETED')
    .reduce((sum, t) => sum + t.amount, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading your dashboard...</p>
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
                <p className="text-white/80">User Dashboard</p>
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
            Welcome back, {currentUser?.name}!
          </h2>
          <p className="text-white/80">
            Here's an overview of your gold loan portfolio
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm">Total Loan Amount</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(totalLoanAmount)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-gold-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm">Active Loans</p>
                  <p className="text-2xl font-bold text-white">{activeLoans}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm">Overdue Loans</p>
                  <p className="text-2xl font-bold text-white">{overdueLoans}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm">Total Paid</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(totalPaid)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6">
          {[
            { id: "overview", label: "Overview", icon: BarChart3 },
            { id: "loans", label: "My Loans", icon: FileText },
            { id: "transactions", label: "Transactions", icon: CreditCard },
            { id: "profile", label: "Profile", icon: User }
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={selectedTab === tab.id ? "default" : "ghost"}
              className={`$
                {selectedTab === tab.id
                  ? "bg-gradient-gold text-white"
                  : "text-white/80 hover:text-white hover:bg-white/20"}
              `}
              onClick={() => setSelectedTab(tab.id)}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Tab Content */}
        {selectedTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Loans */}
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Recent Loans</CardTitle>
              </CardHeader>
              <CardContent>
                {userLoans.slice(0, 3).map((loan, index) => (
                  <div key={loan.id || `loan-${index}`} className="flex items-center justify-between py-3 border-b border-white/10 last:border-b-0">
                    <div>
                      <p className="text-white font-medium">{loan.loanNumber}</p>
                      <p className="text-white/60 text-sm">{formatCurrency(loan.principalAmount)}</p>
                    </div>
                    <Badge 
                      variant={loan.status === 'ACTIVE' ? 'default' : 'secondary'}
                      className={loan.status === 'ACTIVE' ? 'bg-green-500' : ''}
                    >
                      {loan.status}
                    </Badge>
                  </div>
                ))}
                {userLoans.length === 0 && (
                  <p className="text-white/60 text-center py-4">No loans found</p>
                )}
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Notifications</CardTitle>
              </CardHeader>
              <CardContent>
                {userNotifications.slice(0, 3).map((notification, index) => (
                  <div key={notification.id || `notification-${index}`} className="flex items-start space-x-3 py-3 border-b border-white/10 last:border-b-0">
                    <Bell className="h-4 w-4 text-gold-400 mt-1" />
                    <div>
                      <p className="text-white text-sm font-medium">{notification.title}</p>
                      <p className="text-white/60 text-xs">{notification.message}</p>
                    </div>
                  </div>
                ))}
                {userNotifications.length === 0 && (
                  <p className="text-white/60 text-center py-4">No notifications</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {selectedTab === "loans" && (
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="text-[#FFD56F]">My Loans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userLoans.map((loan, index) => (
                  <div key={loan.id || `loan-${index}`} className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-[#FFE6A7] font-semibold tracking-wide">{loan.loanNumber}</h3>
                        <p className="text-[#FFD56F]/80 text-sm">Customer: {loan.customer}</p>
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
                        <p className="text-[#FFE8B5]/70 text-xs uppercase tracking-wide">Principal</p>
                        <p className="text-[#FFF1C9] font-semibold">{formatCurrency(loan.principalAmount)}</p>
                      </div>
                      <div>
                        <p className="text-[#FFE8B5]/70 text-xs uppercase tracking-wide">Interest Rate</p>
                        <p className="text-[#FFF1C9] font-semibold">{loan.interestRate}%</p>
                      </div>
                      <div>
                        <p className="text-[#FFE8B5]/70 text-xs uppercase tracking-wide">Due Date</p>
                        <p className="text-[#FFF1C9] font-semibold">{new Date(loan.dueDate).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-[#FFE8B5]/70 text-xs uppercase tracking-wide">Total Repayment</p>
                        <p className="text-[#FFF1C9] font-semibold">{formatCurrency(loan.totalRepayment || 0)}</p>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-500 text-gray-900 font-semibold shadow-lg hover:shadow-amber-500/40 focus-visible:ring-amber-300"
                        onClick={() => {
                          setSelectedLoan(loan);
                          setIsLoanDetailOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                      {['ACTIVE', 'PENDING', 'OVERDUE'].includes(loan.status) && (
                        <Button
                          size="sm"
                          className="bg-gradient-gold text-gray-900 font-semibold shadow-lg hover:shadow-amber-500/40 focus-visible:ring-amber-300"
                          onClick={() => {
                            setSelectedLoan(loan);
                            setPaymentData({ amount: '' });
                            setIsPaymentOpen(true);
                          }}
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          Pay with Razorpay
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {userLoans.length === 0 && (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-white/40 mx-auto mb-4" />
                    <p className="text-white/60">No loans found</p>
                    <p className="text-white/40 text-sm">Contact admin to create a new loan</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {selectedTab === "transactions" && (
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {userTransactions.map((transaction, index) => (
                  <div key={transaction.id || `transaction-${index}`} className="flex items-center justify-between py-3 border-b border-white/10 last:border-b-0">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-white/10 rounded-lg">
                        <CreditCard className="h-4 w-4 text-white" />
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
                {userTransactions.length === 0 && (
                  <div className="text-center py-8">
                    <CreditCard className="h-12 w-12 text-white/40 mx-auto mb-4" />
                    <p className="text-white/60">No transactions found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}


        {selectedTab === "stock" && (
          <>
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 mb-4">
              <CardHeader>
                <CardTitle className="text-white">Stock Register</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  <Button
                    className="bg-gradient-gold text-white"
                    onClick={() => setSelectedTab("read-folder")}
                  >
                    Go to Read Folder
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {selectedTab === "read-folder" && (
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Read Folder</CardTitle>
            </CardHeader>
            <CardContent>
              <ReadFolder />
            </CardContent>
          </Card>
        )}

        {selectedTab === "profile" && (
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Profile Information</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-white border-white/20 hover:bg-white/20"
                  onClick={() => setIsEditingProfile(!isEditingProfile)}
                >
                  {isEditingProfile ? <X className="h-4 w-4 mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
                  {isEditingProfile ? 'Cancel' : 'Edit'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-white/80">Full Name</Label>
                  <Input
                    value={profileData.name}
                    onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                    disabled={!isEditingProfile}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
                <div>
                  <Label className="text-white/80">Email</Label>
                  <Input
                    value={profileData.email}
                    disabled
                    className="bg-white/10 border-white/20 text-white/60"
                  />
                </div>
                <div>
                  <Label className="text-white/80">Phone</Label>
                  <Input
                    value={profileData.phone}
                    onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                    disabled={!isEditingProfile}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
                <div>
                  <Label className="text-white/80">Address</Label>
                  <Input
                    value={profileData.address}
                    onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                    disabled={!isEditingProfile}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
                <div>
                  <Label className="text-white/80">City</Label>
                  <Input
                    value={profileData.city}
                    onChange={(e) => setProfileData({...profileData, city: e.target.value})}
                    disabled={!isEditingProfile}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
                <div>
                  <Label className="text-white/80">Pincode</Label>
                  <Input
                    value={profileData.pincode}
                    onChange={(e) => setProfileData({...profileData, pincode: e.target.value})}
                    disabled={!isEditingProfile}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
              </div>
              
              {isEditingProfile && (
                <div className="mt-6 flex space-x-2">
                  <Button
                    onClick={handleProfileUpdate}
                    className="bg-gradient-gold hover:opacity-90"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditingProfile(false)}
                    className="text-white border-white/20 hover:bg-white/20"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Loan Detail Dialog */}
      <Dialog open={isLoanDetailOpen} onOpenChange={setIsLoanDetailOpen}>
        <DialogContent className="bg-white/95 backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle>Loan Details</DialogTitle>
          </DialogHeader>
          {selectedLoan && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Loan Number</Label>
                  <p className="font-medium">{selectedLoan.loanNumber}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <Badge>{selectedLoan.status}</Badge>
                </div>
                <div>
                  <Label>Principal Amount</Label>
                  <p className="font-medium">{formatCurrency(selectedLoan.principalAmount)}</p>
                </div>
                <div>
                  <Label>Interest Rate</Label>
                  <p className="font-medium">{selectedLoan.interestRate}%</p>
                </div>
                <div>
                  <Label>Start Date</Label>
                  <p className="font-medium">{new Date(selectedLoan.startDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label>Due Date</Label>
                  <p className="font-medium">{new Date(selectedLoan.dueDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label>Gold Weight</Label>
                  <p className="font-medium">{selectedLoan.goldWeight || 'N/A'} grams</p>
                </div>
                <div>
                  <Label>Gold Purity</Label>
                  <p className="font-medium">{selectedLoan.goldPurity || 'N/A'}%</p>
                </div>
              </div>
              {selectedLoan.comments && (
                <div>
                  <Label>Comments</Label>
                  <p className="text-sm text-gray-600">{selectedLoan.comments}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog
        open={isPaymentOpen}
        onOpenChange={(open) => {
          setIsPaymentOpen(open);
          if (!open) {
            setIsProcessingPayment(false);
            setPaymentData({ amount: '' });
          }
        }}
      >
        <DialogContent className="bg-white/95 backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle>Pay with Razorpay</DialogTitle>
          </DialogHeader>
          {selectedLoan && (
            <div className="space-y-5">
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                <p className="text-sm text-amber-800 font-medium">Loan Number: {selectedLoan.loanNumber}</p>
                <p className="text-xs text-amber-600">Status: {selectedLoan.status}</p>
                <p className="text-sm text-gray-600 mt-2">Total Repayment: {formatCurrency(selectedLoan.totalRepayment || 0)}</p>
              </div>

              <div>
                <Label htmlFor="amount" className="text-sm font-medium text-gray-700">Payment Amount (₹)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ amount: e.target.value })}
                  placeholder="Enter amount"
                  min="1"
                  step="0.01"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">Minimum ₹1.00</p>
              </div>

              <div className="flex space-x-2">
                <Button
                  onClick={handleRazorpayPayment}
                  disabled={isProcessingPayment}
                  className="bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-500 text-gray-900 font-semibold shadow-lg hover:shadow-amber-500/40"
                >
                  {isProcessingPayment ? (
                    <>
                      <CreditCard className="h-4 w-4 mr-2 animate-pulse" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Pay with Razorpay
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsPaymentOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserDashboard;
