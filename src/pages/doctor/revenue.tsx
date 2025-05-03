import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Footer } from "../../components/footer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import {
  format,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  parseISO,
} from "date-fns";
import { useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { useNavigate } from "react-router-dom";

export default function DoctorRevenue() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<"week" | "month" | "year">("month");

  // Get user data from Convex
  const userData = useQuery(
    api.users.getUserByToken,
    user?.id ? { tokenIdentifier: user.id } : "skip",
  );

  // This would be implemented in a real app to fetch payments
  // For now, we'll use mock data
  const mockPayments = [
    {
      _id: "1",
      amount: 15000,
      currency: "USD",
      timestamp: Date.now() - 1000 * 60 * 60 * 24 * 2,
      status: "completed",
    },
    {
      _id: "2",
      amount: 12500,
      currency: "USD",
      timestamp: Date.now() - 1000 * 60 * 60 * 24 * 5,
      status: "completed",
    },
    {
      _id: "3",
      amount: 15000,
      currency: "USD",
      timestamp: Date.now() - 1000 * 60 * 60 * 24 * 8,
      status: "completed",
    },
    {
      _id: "4",
      amount: 15000,
      currency: "USD",
      timestamp: Date.now() - 1000 * 60 * 60 * 24 * 12,
      status: "completed",
    },
    {
      _id: "5",
      amount: 12500,
      currency: "USD",
      timestamp: Date.now() - 1000 * 60 * 60 * 24 * 15,
      status: "completed",
    },
    {
      _id: "6",
      amount: 15000,
      currency: "USD",
      timestamp: Date.now() - 1000 * 60 * 60 * 24 * 20,
      status: "completed",
    },
    {
      _id: "7",
      amount: 12500,
      currency: "USD",
      timestamp: Date.now() - 1000 * 60 * 60 * 24 * 25,
      status: "completed",
    },
    {
      _id: "8",
      amount: 15000,
      currency: "USD",
      timestamp: Date.now() - 1000 * 60 * 60 * 24 * 28,
      status: "completed",
    },
  ];

  // Calculate total revenue
  const totalRevenue = mockPayments.reduce(
    (sum, payment) => sum + payment.amount,
    0,
  );

  // Calculate average per appointment
  const averageRevenue =
    mockPayments.length > 0 ? totalRevenue / mockPayments.length : 0;

  // Group payments by month for the chart
  const paymentsByMonth: Record<string, number> = {};
  mockPayments.forEach((payment) => {
    const date = new Date(payment.timestamp);
    const monthKey = format(date, "MMM yyyy");
    if (!paymentsByMonth[monthKey]) {
      paymentsByMonth[monthKey] = 0;
    }
    paymentsByMonth[monthKey] += payment.amount;
  });

  // Convert to array for rendering
  const chartData = Object.entries(paymentsByMonth).map(([month, amount]) => ({
    month,
    amount,
  }));

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFD]">
      <main className="flex-grow">
        <div className="container mx-auto px-4 pb-24 pt-12">
          {/* Header Section */}
          <div className="relative flex flex-col items-center text-center space-y-6 pb-16">
            <div className="absolute inset-x-0 -top-24 -bottom-24 bg-gradient-to-b from-[#FBFBFD] via-white to-[#FBFBFD] opacity-80 blur-3xl -z-10" />
            <h1 className="text-4xl font-semibold text-[#1D1D1F] tracking-tight">
              Revenue Dashboard
            </h1>
            <p className="text-xl text-[#86868B] max-w-[600px] leading-relaxed">
              Track your earnings, view payment history, and analyze revenue
              trends.
            </p>
          </div>

          {/* Revenue Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="shadow-sm hover:shadow-md transition-all">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(totalRevenue)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Lifetime earnings
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-sm hover:shadow-md transition-all">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Appointments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mockPayments.length}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total completed
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-sm hover:shadow-md transition-all">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Average Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(averageRevenue)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Per appointment
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Chart */}
          <Card className="shadow-sm hover:shadow-md transition-all mb-8">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Revenue Over Time</CardTitle>
                  <CardDescription>Monthly revenue breakdown</CardDescription>
                </div>
                <Tabs defaultValue="month" className="w-[400px]">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="week" onClick={() => setPeriod("week")}>
                      Week
                    </TabsTrigger>
                    <TabsTrigger
                      value="month"
                      onClick={() => setPeriod("month")}
                    >
                      Month
                    </TabsTrigger>
                    <TabsTrigger value="year" onClick={() => setPeriod("year")}>
                      Year
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                {/* This would be a real chart component in a production app */}
                <div className="flex h-full items-end gap-2">
                  {chartData.map((data, i) => (
                    <div
                      key={i}
                      className="relative flex flex-col items-center"
                    >
                      <div
                        className="bg-primary rounded-t w-12"
                        style={{
                          height: `${(data.amount / Math.max(...chartData.map((d) => d.amount))) * 250}px`,
                          minHeight: "20px",
                        }}
                      ></div>
                      <span className="text-xs mt-2">{data.month}</span>
                      <span className="absolute -top-6 text-xs">
                        {formatCurrency(data.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Payments */}
          <Card className="shadow-sm hover:shadow-md transition-all">
            <CardHeader>
              <CardTitle>Recent Payments</CardTitle>
              <CardDescription>Your latest transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Date
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Amount
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {mockPayments.map((payment) => (
                      <tr key={payment._id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {format(new Date(payment.timestamp), "MMM d, yyyy")}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge
                            variant={
                              payment.status === "completed"
                                ? "success"
                                : "outline"
                            }
                          >
                            {payment.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function formatCurrency(amount: number, currency: string = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(amount / 100);
}
