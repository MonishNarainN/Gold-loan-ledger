import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { 
  Shield, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  Coins, 
  Users,
  BarChart3,
  Lock
} from "lucide-react";
import { getLoans } from "@/lib/loanUtils";

const Index = () => {
  // Dynamic dashboard statistics
  const [totalPledged, setTotalPledged] = useState(0);
  const [activeLoans, setActiveLoans] = useState(0);

  // Calculate real statistics from actual loan data
  useEffect(() => {
    const calculateRealStats = () => {
      try {
        const loans = getLoans();
        
        // Calculate total pledged amount (sum of all loan amounts)
        const totalAmount = loans.reduce((sum, loan) => {
          const candidateAmount =
            loan?.amount ??
            loan?.principal ??
            (loan as any)?.principalAmount ??
            (loan as any)?.totalRepayment ??
            0;

          const numericAmount = Number(
            typeof candidateAmount === "string"
              ? candidateAmount.replace(/[^\d.-]/g, "")
              : candidateAmount
          );

          const safeAmount = Number.isFinite(numericAmount) ? numericAmount : 0;

          return sum + safeAmount;
        }, 0);
        
        // Count active loans
        const activeLoanCount = loans.filter((loan) => {
          const status = (loan.status || "").toString().toUpperCase();
          return status === "ACTIVE" || status === "PENDING";
        }).length;
        
        setTotalPledged(totalAmount);
        setActiveLoans(activeLoanCount);
      } catch (error) {
        // Fallback to default values if no data exists
        setTotalPledged(0);
        setActiveLoans(0);
      }
    };

    // Calculate initial stats
    calculateRealStats();
    
    // Update stats every 5 seconds to reflect real-time changes
    const interval = setInterval(calculateRealStats, 5000);

    return () => clearInterval(interval);
  }, []);

  // Format currency
  const formatCurrency = (amount: number) => {
    const safeAmount = Number.isFinite(amount) ? amount : 0;

    if (amount >= 10000000) {
      return `₹${(safeAmount / 10000000).toFixed(1)}Cr`;
    } else if (amount >= 100000) {
      return `₹${(safeAmount / 100000).toFixed(1)}L`;
    } else {
      return `₹${(safeAmount / 1000).toFixed(0)}K`;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Background Image Section - Until "Why Choose GoldLoan Pro" */}
      <div 
        className="relative bg-cover bg-center bg-no-repeat min-h-screen flex flex-col"
        style={{ 
          backgroundImage: 'url(/gold-background.jpg)',
          backgroundAttachment: 'fixed'
        }}
      >
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-black/40"></div>
        
        {/* Navigation */}
        <nav className="relative z-50 bg-black/20 backdrop-blur-sm sticky top-0">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Coins className="h-8 w-8 text-yellow-400" />
              <h1 className="text-2xl font-bold text-white">
                GoldLoan Pro
              </h1>
            </div>
            <div className="flex space-x-4">
              <Link to="/login">
                <Button variant="outline" className="border-white text-white hover:bg-white hover:text-black font-medium bg-white/10 backdrop-blur-sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/signup">
                <Button className="bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-black font-semibold shadow-lg">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero Section - Centered */}
        <section className="relative z-10 flex-1 flex items-center justify-center px-4">
          <div className="container mx-auto text-center">
            <div className="animate-fade-in">
              <h2 className="text-5xl md:text-6xl font-bold mb-6 text-white drop-shadow-lg">
                Secure Gold Loan Management
              </h2>
              <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto drop-shadow-md">
                Professional pawn broker and gold loan management system with secure transactions, 
                real-time tracking, and comprehensive reporting.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/signup">
                  <Button 
                    size="lg" 
                    className="bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-black font-semibold text-lg px-8 shadow-lg"
                  >
                    Start Your Journey
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="outline" className="text-lg px-8 border-white text-white hover:bg-white hover:text-black font-medium bg-white/10 backdrop-blur-sm shadow-lg">
                    Admin Login
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Features Section */}
      <section className="py-16 px-4 bg-muted/50">
        <div className="container mx-auto">
          <div className="text-center mb-12 animate-fade-in">
            <h3 className="text-3xl font-bold mb-4">Why Choose GoldLoan Pro?</h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Built for modern pawn brokers and financial institutions with security, compliance, and efficiency in mind.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Shield,
                title: "Bank-Level Security",
                description: "End-to-end encryption and secure data handling"
              },
              {
                icon: TrendingUp,
                title: "Real-Time Analytics", 
                description: "Live dashboards and comprehensive reporting"
              },
              {
                icon: Clock,
                title: "Instant Processing",
                description: "Quick loan approvals and payment processing"
              },
              {
                icon: CheckCircle,
                title: "Compliance Ready",
                description: "Built to meet regulatory requirements"
              }
            ].map((feature, index) => (
              <Card 
                key={index} 
                className="animate-scale-in hover:shadow-card transition-all duration-300 hover:-translate-y-1"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardHeader className="text-center">
                  <feature.icon className="h-12 w-12 text-primary mx-auto mb-4" />
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Admin Features Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-slide-in">
              <h3 className="text-3xl font-bold mb-6">
                Powerful Admin Dashboard
              </h3>
              <div className="space-y-4">
                {[
                  "Customer management & KYC verification",
                  "Pledge tracking & inventory management", 
                  "Automated interest calculations",
                  "Financial reporting & cash book",
                  "SMS/Email notifications",
                  "Auction management system"
                ].map((feature, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <Card className="p-6 shadow-elegant animate-float">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gradient-gold/10 rounded-lg transition-all duration-500">
                  <BarChart3 className="h-8 w-8 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold transition-all duration-500">
                    {formatCurrency(totalPledged)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Pledged</div>
                </div>
                <div className="text-center p-4 bg-gradient-blue/10 rounded-lg transition-all duration-500">
                  <Users className="h-8 w-8 text-secondary mx-auto mb-2" />
                  <div className="text-2xl font-bold transition-all duration-500">
                    {activeLoans.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Active Loans</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-gradient-hero">
        <div className="container mx-auto text-center">
          <div className="animate-fade-in">
            <h3 className="text-3xl font-bold text-white mb-6">
              Ready to Transform Your Gold Loan Business?
            </h3>
            <p className="text-white/80 mb-8 max-w-2xl mx-auto">
              Join hundreds of pawn brokers who trust GoldLoan Pro for their daily operations.
            </p>
            <Link to="/signup">
              <Button 
                size="lg" 
                className="bg-white text-secondary hover:bg-white/90 transition-colors text-lg px-8"
              >
                Get Started Today
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="container mx-auto text-center text-muted-foreground">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Lock className="h-4 w-4" />
            <span>Secure • Compliant • Trusted</span>
          </div>
          <p>&copy; 2024 GoldLoan Pro. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;