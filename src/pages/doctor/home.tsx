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
import { Button } from "../../components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  FileText,
  Clock,
  Users,
  TrendingUp,
  Activity,
} from "lucide-react";

export default function DoctorHome() {
  const { user } = useUser();
  const navigate = useNavigate();
  
  const userData = useQuery(
    api.users.getUserByToken,
    user?.id ? { tokenIdentifier: user.id } : "skip"
  );
  
  const quickStartItems = [
    {
      title: "Schedule Appointments",
      description: "Manage your calendar and upcoming patient meetings",
      icon: <Calendar className="h-8 w-8 text-blue-600" />,
      action: () => navigate("/doctor/dashboard")
    },
    {
      title: "Start New Meeting",
      description: "Record and transcribe a patient appointment",
      icon: <FileText className="h-8 w-8 text-blue-600" />,
      action: () => navigate("/doctor/meeting")
    },
    {
      title: "Track Revenue",
      description: "Monitor earnings and financial analytics",
      icon: <TrendingUp className="h-8 w-8 text-blue-600" />,
      action: () => navigate("/doctor/revenue")
    },
    {
      title: "Patient Management",
      description: "Access patient records and history",
      icon: <Users className="h-8 w-8 text-blue-600" />,
      action: () => navigate("/doctor/dashboard")
    }
  ];

  const recentActivity = [
    {
      title: "Upcoming Appointment",
      time: "Today, 2:30 PM",
      patient: "Sarah Johnson",
      type: "Checkup"
    },
    {
      title: "Recent Report Generated",
      time: "Yesterday",
      patient: "Michael Brown",
      type: "Review"
    },
    {
      title: "Clinical Trial Match",
      time: "2 days ago",
      patient: "David Wilson",
      type: "Recommendation"
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFD]">
      <main className="flex-grow">
        <div className="container mx-auto px-4 pb-24 pt-12">
          {/* Header Section */}
          <div className="relative flex flex-col space-y-6 pb-16">
            <div className="absolute inset-x-0 -top-24 -bottom-24 bg-gradient-to-b from-[#FBFBFD] via-white to-[#FBFBFD] opacity-80 blur-3xl -z-10" />
            
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
              <div>
                <h1 className="text-4xl font-semibold text-[#1D1D1F] tracking-tight">
                  Welcome, Dr. {user?.lastName || userData?.name?.split(' ')?.[1] || ''}
                </h1>
                <p className="text-xl text-[#86868B] leading-relaxed mt-2">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  className="h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => navigate("/doctor/meeting")}
                >
                  New Appointment
                </Button>
                <Button 
                  variant="outline"
                  className="h-12 px-6"
                  onClick={() => navigate("/doctor/dashboard")}
                >
                  View Schedule
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Start Grid */}
          {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {quickStartItems.map((item, index) => (
              <Card 
                key={index} 
                className="hover:shadow-md transition-all cursor-pointer"
                onClick={item.action}
              >
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <div className="p-3 bg-blue-50 rounded-full mb-4">
                    {item.icon}
                  </div>
                  <h3 className="font-medium text-lg mb-2">{item.title}</h3>
                  <p className="text-gray-500 text-sm">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div> */}
          
          {/* Dashboard Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              <Card className="shadow-sm">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Today's Schedule</CardTitle>
                      <CardDescription>Your upcoming appointments</CardDescription>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate("/doctor/dashboard")}
                    >
                      View All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[...Array(3)].map((_, index) => (
                      <div 
                        key={index}
                        className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => navigate("/doctor/dashboard")}
                      >
                        <div className="flex items-center">
                          <div className="p-2 bg-blue-50 rounded-full mr-4">
                            <Clock className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">Patient {index + 1}</p>
                            <p className="text-sm text-gray-500">
                              {new Date(Date.now() + (index + 1) * 3600000).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })} - General Checkup
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">View</Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div>
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest updates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivity.map((activity, index) => (
                      <div key={index} className="border-b pb-3 last:border-0 last:pb-0">
                        <div className="flex items-center">
                          <div className="p-1 bg-blue-50 rounded-full mr-2">
                            <Activity className="h-3 w-3 text-blue-600" />
                          </div>
                          <p className="text-sm font-medium">{activity.title}</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                        <p className="text-sm mt-1">{activity.patient} - {activity.type}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}