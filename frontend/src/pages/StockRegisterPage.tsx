import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Search, Filter, Download, ArrowLeft } from "lucide-react";
import * as XLSX from "xlsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { getLoans } from "@/services/loanService";
import { Loan as ApiLoan } from "@/lib/api";
import { formatCurrency } from "@/lib/goldCalculations";

// Helper function to safely get customer name
const getCustomerName = (customer: string | { name?: string } | undefined): string => {
  if (!customer) return 'Unknown Customer';
  if (typeof customer === 'string') return customer;
  return customer.name || 'Unknown Customer';
};

// Helper function to parse date safely (defined outside component)
const parseLoanDate = (dateString: string | undefined): Date | null => {
  if (!dateString) return null;
  const date = new Date(dateString);
  // Check if date is valid
  if (isNaN(date.getTime())) {
    console.warn('Invalid date string:', dateString);
    return null;
  }
  return date;
};

// Use the ApiLoan type from lib/api
type Loan = ApiLoan & {
  _id?: string;
};

const StockRegisterPage = () => {
  const [allLoans, setAllLoans] = useState<Loan[]>([]);
  const [filteredLoans, setFilteredLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  
  const navigate = useNavigate();
  const { toast } = useToast();

  // Fetch all loans on component mount
  useEffect(() => {
    const fetchLoans = async () => {
      try {
        setIsLoading(true);
        console.log('Fetching loans...');
        const loans = await getLoans();
        console.log('Loans response:', loans);
        
        // Process the loans data
        const processedLoans: Loan[] = loans.map(loan => ({
          ...loan,
          _id: loan.id || (loan as any)._id,
        }));
        
        // Debug: Log date information
        console.log('Processed loans data:', processedLoans);
        if (processedLoans.length > 0) {
          console.log('Sample loan dates:', processedLoans.slice(0, 3).map(loan => {
            const startDate = parseLoanDate(loan.startDate);
            const createdDate = parseLoanDate(loan.createdAt);
            return {
              loanNumber: loan.loanNumber,
              startDate: loan.startDate,
              createdAt: loan.createdAt,
              parsedStartDate: startDate ? `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}` : 'invalid',
              parsedCreatedAt: createdDate ? `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}-${String(createdDate.getDate()).padStart(2, '0')}` : 'invalid',
              startYear: startDate?.getFullYear(),
              startMonth: startDate ? startDate.getMonth() + 1 : null,
              createdYear: createdDate?.getFullYear(),
              createdMonth: createdDate ? createdDate.getMonth() + 1 : null
            };
          }));
          
          // Log all unique years found
          const years = new Set<number>();
          processedLoans.forEach(loan => {
            const startDate = parseLoanDate(loan.startDate);
            const createdDate = parseLoanDate(loan.createdAt);
            if (startDate) years.add(startDate.getFullYear());
            if (createdDate) years.add(createdDate.getFullYear());
          });
          console.log('All unique years found:', Array.from(years).sort((a, b) => b - a));
        }
        
        setAllLoans(processedLoans);
        setFilteredLoans(processedLoans);
      } catch (error) {
        console.error("Error fetching loans:", error);
        toast({
          title: "Error",
          description: "Failed to fetch loans",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchLoans();
  }, [toast]);

  // Filter loans based on search term, month, and year
  useEffect(() => {
    let filtered = [...allLoans];

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (loan) =>
          loan.loanNumber?.toLowerCase().includes(term) ||
          getCustomerName(loan.customer).toLowerCase().includes(term) ||
          loan.collateral?.toLowerCase().includes(term)
      );
    }

    // Filter by month
    if (selectedMonth) {
      const monthNum = parseInt(selectedMonth);
      filtered = filtered.filter((loan) => {
        const loanDate = parseLoanDate(loan.startDate || loan.createdAt);
        if (!loanDate) return false;
        // getMonth() returns 0-11, so we add 1 to match our 1-12 month selection
        return loanDate.getMonth() + 1 === monthNum;
      });
    }

    // Filter by year
    if (selectedYear) {
      const yearNum = parseInt(selectedYear);
      filtered = filtered.filter((loan) => {
        const loanDate = parseLoanDate(loan.startDate || loan.createdAt);
        if (!loanDate) return false;
        return loanDate.getFullYear() === yearNum;
      });
    }

    setFilteredLoans(filtered);
  }, [allLoans, searchTerm, selectedMonth, selectedYear]);

  // Get unique years from loans
  const getAvailableYears = (): number[] => {
    const years = new Set<number>();
    allLoans.forEach((loan) => {
      // Try startDate first, then createdAt
      const startDate = parseLoanDate(loan.startDate);
      const createdDate = parseLoanDate(loan.createdAt);
      
      if (startDate && !isNaN(startDate.getTime())) {
        years.add(startDate.getFullYear());
      } else if (createdDate && !isNaN(createdDate.getTime())) {
        years.add(createdDate.getFullYear());
      }
    });
    const yearsArray = Array.from(years).sort((a, b) => b - a);
    // If no years found, add current year and previous year as defaults
    if (yearsArray.length === 0) {
      const currentYear = new Date().getFullYear();
      yearsArray.push(currentYear);
      yearsArray.push(currentYear - 1);
    }
    return yearsArray;
  };

  // Get status badge color
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

  // Format date
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    const date = parseLoanDate(dateString);
    if (!date || isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Calculate totals
  const totalPrincipal = filteredLoans.reduce((sum, loan) => sum + (loan.principalAmount || 0), 0);
  const totalGoldWeight = filteredLoans.reduce((sum, loan) => sum + (loan.goldWeight || 0), 0);
  const totalGoldValue = filteredLoans.reduce((sum, loan) => sum + (loan.goldValue || 0), 0);

  // Export to Excel function
  const exportToExcel = () => {
    if (filteredLoans.length === 0) {
      toast({
        title: "No Data",
        description: "No loans to export",
        variant: "destructive",
      });
      return;
    }

    try {
      // Prepare data for Excel
      const excelData = filteredLoans.map((loan) => {
        const startDate = parseLoanDate(loan.startDate);
        const dueDate = parseLoanDate(loan.dueDate);
        const createdDate = parseLoanDate(loan.createdAt);
        
        return {
          "Gold Loan No": loan.loanNumber || "N/A",
          "Customer": getCustomerName(loan.customer),
          "Start Date": startDate ? formatDate(loan.startDate) : "N/A",
          "Due Date": dueDate ? formatDate(loan.dueDate) : "N/A",
          "Principal Amount (₹)": loan.principalAmount || 0,
          "Interest Rate (%)": loan.interestRate || 0,
          "Gold Weight (g)": loan.goldWeight || 0,
          "Gold Purity (%)": loan.goldPurity || 0,
          "Gold Rate (₹/g)": loan.goldRate || 0,
          "Gold Value (₹)": loan.goldValue || 0,
          "Interest Amount (₹)": loan.interestAmount || 0,
          "Total Repayment (₹)": loan.totalRepayment || 0,
          "Status": loan.status || "N/A",
          "Collateral": loan.collateral || "N/A",
          "Term Days": loan.termDays || 0,
          "Created Date": createdDate ? formatDate(loan.createdAt) : "N/A",
        };
      });

      // Add summary row
      const summaryRow = {
        "Gold Loan No": "SUMMARY",
        "Customer": "",
        "Start Date": "",
        "Due Date": "",
        "Principal Amount (₹)": totalPrincipal,
        "Interest Rate (%)": "",
        "Gold Weight (g)": totalGoldWeight,
        "Gold Purity (%)": "",
        "Gold Rate (₹/g)": "",
        "Gold Value (₹)": totalGoldValue,
        "Interest Amount (₹)": "",
        "Total Repayment (₹)": "",
        "Status": `Total Loans: ${filteredLoans.length}`,
        "Collateral": "",
        "Term Days": "",
        "Created Date": "",
      };

      // Combine data with summary
      const worksheetData = [...excelData, summaryRow];

      // Create workbook and worksheet
      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Stock Register");

      // Set column widths
      const columnWidths = [
        { wch: 15 }, // Gold Loan No
        { wch: 20 }, // Customer
        { wch: 12 }, // Start Date
        { wch: 12 }, // Due Date
        { wch: 18 }, // Principal Amount
        { wch: 15 }, // Interest Rate
        { wch: 15 }, // Gold Weight
        { wch: 15 }, // Gold Purity
        { wch: 15 }, // Gold Rate
        { wch: 15 }, // Gold Value
        { wch: 18 }, // Interest Amount
        { wch: 18 }, // Total Repayment
        { wch: 12 }, // Status
        { wch: 25 }, // Collateral
        { wch: 10 }, // Term Days
        { wch: 12 }, // Created Date
      ];
      worksheet["!cols"] = columnWidths;

      // Generate filename with current date
      const currentDate = new Date().toISOString().split("T")[0];
      const filename = `Stock_Register_${currentDate}.xlsx`;

      // Write and download file
      XLSX.writeFile(workbook, filename);

      toast({
        title: "Success",
        description: `Exported ${filteredLoans.length} loans to Excel`,
      });
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast({
        title: "Error",
        description: "Failed to export to Excel",
        variant: "destructive",
      });
    }
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
                Stock Register
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="default"
                onClick={exportToExcel}
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={filteredLoans.length === 0 || isLoading}
              >
                <Download className="mr-2 h-4 w-4" />
                Download Excel
              </Button>
              <div className="text-sm text-muted-foreground">Total Loans: {allLoans.length}</div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 space-y-6">

        {/* Filters */}
        <Card className="shadow-none bg-transparent border border-white/30 backdrop-blur-md text-black font-semibold">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by loan number, customer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-transparent text-black placeholder:text-black/60 border border-white/40 focus-visible:ring-white focus-visible:ring-offset-0"
                />
              </div>

              {/* Month Filter */}
          <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="flex h-10 w-full rounded-md border border-white/40 bg-transparent px-3 py-2 text-sm text-black ring-offset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-0"
              >
                <option value="">All Months</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <option key={month} value={month}>
                    {new Date(2000, month - 1).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </select>

              {/* Year Filter */}
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="flex h-10 w-full rounded-md border border-white/40 bg-transparent px-3 py-2 text-sm text-black ring-offset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-0"
              >
                <option value="">All Years</option>
                {getAvailableYears().map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>

              {/* Clear Filters */}
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedMonth("");
                  setSelectedYear("");
                }}
                className="w-full"
              >
                Clear Filters
          </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-transparent border border-white/30 backdrop-blur-md text-black font-semibold">
            <CardContent className="pt-6">
              <div className="text-sm font-medium text-white/70">Total Loans</div>
              <div className="text-2xl font-bold">{filteredLoans.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-transparent border border-white/30 backdrop-blur-md text-black font-semibold">
            <CardContent className="pt-6">
              <div className="text-sm font-medium text-white/70">Total Principal</div>
              <div className="text-2xl font-bold">{formatCurrency(totalPrincipal)}</div>
            </CardContent>
          </Card>
          <Card className="bg-transparent border border-white/30 backdrop-blur-md text-black font-semibold">
            <CardContent className="pt-6">
              <div className="text-sm font-medium text-white/70">Total Gold Weight</div>
              <div className="text-2xl font-bold">{totalGoldWeight.toFixed(2)}g</div>
            </CardContent>
          </Card>
          <Card className="bg-transparent border border-white/30 backdrop-blur-md text-black font-semibold">
            <CardContent className="pt-6">
              <div className="text-sm font-medium text-white/70">Total Gold Value</div>
              <div className="text-2xl font-bold">{formatCurrency(totalGoldValue)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-center py-6">
            <Loader2 className="animate-spin h-6 w-6 text-blue-600" />
          </div>
        )}

        {/* Loans Table */}
        {!isLoading && (
          <Card className="shadow-none bg-transparent border border-white/30 backdrop-blur-md text-black font-semibold">
            <CardHeader>
              <CardTitle className="text-black">All Loans</CardTitle>
              <CardDescription className="text-black/70">
                Complete list of all loans with gold details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-black">Gold Loan No</TableHead>
                      <TableHead className="text-black">Customer</TableHead>
                      <TableHead className="text-black">Start Date</TableHead>
                      <TableHead className="text-black">Due Date</TableHead>
                      <TableHead className="text-black">Principal Amount</TableHead>
                      <TableHead className="text-black">Gold Weight (g)</TableHead>
                      <TableHead className="text-black">Gold Purity (%)</TableHead>
                      <TableHead className="text-black">Gold Rate</TableHead>
                      <TableHead className="text-black">Gold Value</TableHead>
                      <TableHead className="text-black">Status</TableHead>
                      <TableHead className="text-black">Collateral</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLoans.length === 0 ? (
                    <TableRow className="transition-colors duration-200 hover:bg-white/10">
                        <TableCell colSpan={11} className="text-center text-gray-500 py-8">
                          No loans found
                      </TableCell>
                    </TableRow>
                  ) : (
                      filteredLoans.map((loan) => {
                        const statusColor = getStatusColor(loan.status);
                        return (
                          <TableRow 
                            key={loan.id || loan._id}
                            className="transition-all duration-200 hover:bg-white/10 hover:shadow-md"
                          >
                            <TableCell className="font-semibold text-blue-600">
                              {loan.loanNumber}
                            </TableCell>
                            <TableCell>{getCustomerName(loan.customer)}</TableCell>
                            <TableCell>{formatDate(loan.startDate)}</TableCell>
                            <TableCell>{formatDate(loan.dueDate)}</TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(loan.principalAmount)}
                        </TableCell>
                        <TableCell>
                              {loan.goldWeight ? `${loan.goldWeight.toFixed(2)}g` : 'N/A'}
                        </TableCell>
                        <TableCell>
                              {loan.goldPurity ? `${loan.goldPurity}%` : 'N/A'}
                        </TableCell>
                        <TableCell>
                              {loan.goldRate ? formatCurrency(loan.goldRate) : 'N/A'}
                            </TableCell>
                            <TableCell className="font-medium text-green-600">
                              {loan.goldValue ? formatCurrency(loan.goldValue) : 'N/A'}
                        </TableCell>
                        <TableCell>
                              <Badge className={`${statusColor.bg} ${statusColor.text}`}>
                                {loan.status}
                              </Badge>
                        </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {loan.collateral || 'N/A'}
                        </TableCell>
                      </TableRow>
                        );
                      })
                  )}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default StockRegisterPage;
