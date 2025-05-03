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
  BarChart,
  MessageSquare,
  Clock,
  Activity,
  Bell,
  Brain,
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { MedicalAIChatbot } from "../../components/MedicalAIChatbot";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { useState } from "react";

export default function PatientHome() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  
  const userData = useQuery(
    api.users.getUserByToken,
    user?.id ? { tokenIdentifier: user.id } : "skip"
  );
  
  // Get meetings for this patient
  const meetings = useQuery(
    api.meetings.getPatientMeetings,
    userData?._id ? { patientId: userData._id } : "skip"
  );

  // Filter shared meetings
  const sharedMeetings = meetings?.filter(meeting => meeting.isSharedWithPatient) || [];
  
  const quickAccessItems = [
    {
      title: "View Appointments",
      description: "Check your scheduled medical appointments",
      icon: <Calendar className="h-8 w-8 text-green-600" />,
      action: () => navigate("/patient/dashboard")
    },
    {
      title: "Medical Reports",
      description: "Access your medical documentation",
      icon: <FileText className="h-8 w-8 text-green-600" />,
      action: () => navigate("/patient/dashboard")
    },
    {
      title: "Clinical Trials",
      description: "Explore recommended clinical trials",
      icon: <BarChart className="h-8 w-8 text-green-600" />,
      action: () => navigate("/patient/dashboard")
    },
    {
      title: "AI Assistant",
      description: "Get help understanding your medical records",
      icon: <Brain className="h-8 w-8 text-green-600" />,
      action: () => setActiveTab("chatbot")
    }
  ];

  const upcomingAppointments = meetings?.filter(meeting => 
    meeting.status === "scheduled" || meeting.status === "confirmed"
  ).slice(0, 2) || [];

  const notifications = [
    {
      title: "New Medical Report",
      description: "Your doctor has shared a new medical report with you",
      time: "2 hours ago"
    },
    {
      title: "Appointment Reminder",
      description: "You have an upcoming appointment tomorrow at 10:00 AM",
      time: "5 hours ago"
    },
    {
      title: "Clinical Trial Match",
      description: "A new clinical trial matching your profile is available",
      time: "Yesterday"
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFD]">
      <main className="flex-grow">
        <div className="container mx-auto px-4 pb-24 pt-12">
          {/* Header Section */}
          <div className="relative flex flex-col space-y-6 pb-12">
            <div className="absolute inset-x-0 -top-24 -bottom-24 bg-gradient-to-b from-[#FBFBFD] via-white to-[#FBFBFD] opacity-80 blur-3xl -z-10" />
            
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
              <div>
                <h1 className="text-4xl font-semibold text-[#1D1D1F] tracking-tight">
                  Welcome, {user?.firstName || userData?.name?.split(' ')?.[0] || 'Patient'}
                </h1>
                <p className="text-xl text-[#86868B] leading-relaxed mt-2">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
              </div>
              
              <div className="flex space-x-3">
                <Button 
                  className={`h-12 px-6 ${activeTab === "dashboard" ? "bg-green-600 hover:bg-green-700 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-800"}`}
                  onClick={() => setActiveTab("dashboard")}
                >
                  My Dashboard
                </Button>
                <Button 
                  className={`h-12 px-6 ${activeTab === "chatbot" ? "bg-green-600 hover:bg-green-700 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-800"}`}
                  onClick={() => setActiveTab("chatbot")}
                >
                  <Brain className="mr-2 h-5 w-5" />
                  AI Assistant
                </Button>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsContent value="dashboard">
              {/* Quick Access Grid */}
              {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                {quickAccessItems.map((item, index) => (
                  <Card 
                    key={index} 
                    className="hover:shadow-md transition-all cursor-pointer"
                    onClick={item.action}
                  >
                    <CardContent className="p-6 flex flex-col items-center text-center">
                      <div className="p-3 bg-green-50 rounded-full mb-4">
                        {item.icon}
                      </div>
                      <h3 className="font-medium text-lg mb-2">{item.title}</h3>
                      <p className="text-gray-500 text-sm">{item.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div> */}
              
              {/* Dashboard Content */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Upcoming Appointments */}
                <div className="lg:col-span-2">
                  <Card className="shadow-sm">
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle>Upcoming Appointments</CardTitle>
                          <CardDescription>Your scheduled doctor visits</CardDescription>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate("/patient/dashboard")}
                        >
                          View All
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {upcomingAppointments.length > 0 ? (
                        <div className="space-y-4">
                          {upcomingAppointments.map((appointment, index) => (
                            <div 
                              key={appointment._id || index}
                              className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                              onClick={() => navigate(`/patient/meetings/${appointment._id}`)}
                            >
                              <div className="flex items-center">
                                <div className="p-2 bg-green-50 rounded-full mr-4">
                                  <Clock className="h-5 w-5 text-green-600" />
                                </div>
                                <div>
                                  <p className="font-medium">
                                    {appointment.title || "Appointment"}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    {new Date(appointment.scheduledTime).toLocaleDateString()} at{" "}
                                    {new Date(appointment.scheduledTime).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    Dr. {appointment.doctorName?.split(' ')?.[1] || appointment.doctorName || 'Unknown'}
                                  </p>
                                </div>
                              </div>
                              <Badge variant={appointment.status === "confirmed" ? "success" : "outline"}>
                                {appointment.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-8 text-center">
                          <p className="text-gray-500">You have no upcoming appointments.</p>
                          <Button
                            className="mt-4"
                            variant="outline"
                            onClick={() => navigate("/patient/dashboard")}
                          >
                            Schedule an Appointment
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Recent Reports */}
                  <Card className="shadow-sm mt-6">
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle>Recent Medical Reports</CardTitle>
                          <CardDescription>Your latest health documentation</CardDescription>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate("/patient/dashboard")}
                        >
                          View All
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {sharedMeetings.length > 0 ? (
                        <div className="space-y-4">
                          {sharedMeetings.slice(0, 2).map((meeting, index) => (
                            <div 
                              key={meeting._id || index}
                              className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                              onClick={() => navigate(`/patient/meetings/${meeting._id}`)}
                            >
                              <div className="flex items-center">
                                <div className="p-2 bg-green-50 rounded-full mr-4">
                                  <FileText className="h-5 w-5 text-green-600" />
                                </div>
                                <div>
                                  <p className="font-medium">
                                    {meeting.title || "Medical Report"}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    {new Date(meeting.scheduledTime).toLocaleDateString()}
                                  </p>
                                  <p className="text-sm text-gray-500 line-clamp-1">
                                    {meeting.report ? meeting.report.substring(0, 60) + "..." : "No details available"}
                                  </p>
                                </div>
                              </div>
                              <Button variant="ghost" size="sm">View</Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-8 text-center">
                          <p className="text-gray-500">You don't have any medical reports yet.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
                
                {/* Notifications */}
                <div>
                  <Card className="shadow-sm">
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle>Notifications</CardTitle>
                        <Bell className="h-4 w-4 text-gray-500" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {notifications.map((notification, index) => (
                          <div key={index} className="border-b pb-3 last:border-0 last:pb-0">
                            <div className="flex items-center">
                              <div className="p-1 bg-green-50 rounded-full mr-2">
                                <Activity className="h-3 w-3 text-green-600" />
                              </div>
                              <p className="text-sm font-medium">{notification.title}</p>
                            </div>
                            <p className="text-sm mt-1">{notification.description}</p>
                            <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Health Tips */}
                  <Card className="shadow-sm mt-6">
                    <CardHeader>
                      <CardTitle>Health Tips</CardTitle>
                      <CardDescription>Personalized for you</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="p-4 text-sm">
                        <ul className="list-disc pl-5 space-y-2">
                          <li>Remember to stay hydrated throughout the day</li>
                          <li>Take regular breaks from screen time to reduce eye strain</li>
                          <li>Maintain a consistent sleep schedule for better rest</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="chatbot">
              <Card className="shadow-md">
                <CardHeader>
                  <div className="flex items-center">
                    <Brain className="h-6 w-6 mr-2 text-green-600" />
                    <div>
                      <CardTitle>AI Medical Assistant</CardTitle>
                      <CardDescription>Ask questions about your medical records</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="min-h-[600px]">
                  {userData?._id ? (
                    <MedicalAIChatbot patientId={userData._id} />
                  ) : (
                    <div className="flex items-center justify-center h-64">
                      <p className="text-gray-500">Please sign in to use the AI assistant</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
}