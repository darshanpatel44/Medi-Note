import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Footer } from "../../components/footer";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Calendar, FileText, BarChart } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { format } from "date-fns";
import { useToast } from "../../components/ui/use-toast";

export default function PatientDashboard() {
  const { user } = useUser();
  const navigate = useNavigate();
  const { toast } = useToast();
  const today = new Date();

  // Get user data from Convex
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

  // Handle navigation with toast notification
  const handleViewReport = (meetingId: string, title: string) => {
    toast({
      title: "Opening medical report",
      description: `Loading ${title || "medical report"}...`,
      duration: 2000,
    });
    navigate(`/patient/meetings/${meetingId}`);
  };

  // Handle new appointment request
  const handleNewAppointment = () => {
    toast({
      title: "Creating new appointment",
      description: "Preparing to schedule a new appointment...",
      duration: 2000,
    });
    navigate("/patient/meetings/new");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFD]">
      <main className="flex-grow">
        <div className="container mx-auto px-4 pb-16 pt-8">
          {/* Simplified Header Section */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-[#1D1D1F] tracking-tight">
                Dashboard
              </h1>
              <p className="text-sm text-[#86868B]">
                {format(today, "EEEE, MMMM d, yyyy")}
              </p>
            </div>
            <Button 
              size="sm" 
              onClick={handleNewAppointment}
              className="bg-green-600 hover:bg-green-700"
            >
              <Calendar className="h-4 w-4 mr-2" />
              New Appointment
            </Button>
          </div>

          <Tabs defaultValue="appointments" className="space-y-6">
            <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto">
              <TabsTrigger value="appointments">Appointments</TabsTrigger>
              <TabsTrigger value="reports">Medical Reports</TabsTrigger>
            </TabsList>
            
            {/* Appointments Tab */}
            <TabsContent value="appointments">
              <div className="grid grid-cols-1 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Your Appointments</CardTitle>
                    <CardDescription>
                      View all your scheduled and past appointments
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {meetings && meetings.length > 0 ? (
                      <div className="space-y-4">
                        {meetings.map((meeting) => (
                          <div
                            key={meeting._id}
                            className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2 text-blue-600" />
                                <h3 className="font-medium">
                                  {meeting.title || "Appointment"}
                                </h3>
                              </div>
                              <div className="text-sm text-gray-500">
                                {new Date(meeting.scheduledTime).toLocaleDateString()} at{" "}
                                {new Date(meeting.scheduledTime).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                              <div className="text-sm text-gray-500">
                                Doctor: {meeting.doctorName || "Unknown"}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge
                                variant={
                                  meeting.status === "completed"
                                    ? "success"
                                    : meeting.status === "in-progress"
                                    ? "default"
                                    : meeting.status === "cancelled"
                                    ? "destructive"
                                    : "outline"
                                }
                              >
                                {meeting.status}
                              </Badge>
                              
                              {meeting.isSharedWithPatient && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewReport(meeting._id, meeting.title)}
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  View Report
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <p className="text-gray-500">
                          No appointments found. Your future appointments will appear here.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            {/* Medical Reports Tab */}
            <TabsContent value="reports">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sharedMeetings.length > 0 ? (
                  sharedMeetings.map((meeting) => (
                    <Card key={meeting._id} className="hover:shadow-md transition-all">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle>{meeting.title || "Medical Report"}</CardTitle>
                            <CardDescription>
                              {new Date(meeting.scheduledTime).toLocaleDateString()}
                            </CardDescription>
                          </div>
                          <Badge variant="outline">{meeting.status}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <FileText className="h-4 w-4 mr-2 text-blue-600" />
                            <span className="font-medium">Medical Report</span>
                          </div>
                          <p className="text-sm text-gray-500 line-clamp-2">
                            {meeting.report 
                              ? `${meeting.report.substring(0, 100)}...` 
                              : "No detailed report available."}
                          </p>
                        </div>
                        
                        {meeting.clinicalTrials && meeting.clinicalTrials.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center">
                              <BarChart className="h-4 w-4 mr-2 text-blue-600" />
                              <span className="font-medium">Clinical Trials</span>
                            </div>
                            <p className="text-sm text-gray-500">
                              {meeting.clinicalTrials.length} trial(s) recommended
                            </p>
                          </div>
                        )}
                        
                        <Button
                          onClick={() => handleViewReport(meeting._id, meeting.title)}
                          className="w-full"
                        >
                          View Full Report
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-2 text-center py-12">
                    <Card>
                      <CardContent className="pt-6">
                        <p className="text-gray-500">
                          No medical reports have been shared with you yet. When your doctor shares a report, it will appear here.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
}