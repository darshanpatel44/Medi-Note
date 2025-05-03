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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { useParams, useNavigate } from "react-router-dom";
import { LoadingSpinner } from "../../components/loading-spinner";
import { MessageSquare, Brain } from "lucide-react";
import { useState } from "react";
import { Textarea } from "../../components/ui/textarea";
import { useMutation } from "convex/react";
import { useToast } from "../../components/ui/use-toast";
import { FormattedMedicalReport } from "../../components/FormattedMedicalReport";
import { MedicalAIChatbot } from "../../components/MedicalAIChatbot";

export default function PatientMeeting() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  // Check if we're creating a new meeting
  const isNewMeeting = meetingId === 'new';
  
  console.log("Meeting ID from URL:", meetingId);
  
  // Get user data from Convex to get the database patient ID
  const userData = useQuery(
    api.users.getUserByToken,
    user?.id ? { tokenIdentifier: user.id } : "skip"
  );
  
  // Fetch meeting data with error handling
  const meeting = useQuery(
    api.meetings.getMeeting, 
    !isNewMeeting && meetingId ? { id: meetingId as any } : "skip"
  );
  
  // Log when meeting data changes
  console.log("Meeting data:", meeting);
  console.log("User data:", userData);
  
  // Check if this meeting is shared with the patient
  const canViewMeeting = meeting && meeting.isSharedWithPatient;
  
  // Mutation for sending a message to the doctor
  const sendMessage = useMutation(api.meetings.sendMessageToDoctor);
  
  // Function to handle sending a message
  const handleSendMessage = async () => {
    if (!meetingId || !message.trim() || isNewMeeting) return;
    
    try {
      await sendMessage({
        meetingId,
        message: message.trim(),
        patientId: user?.id || ""
      });
      
      setMessage("");
      setError(null);
      
      // Show toast notification instead of alert
      toast({
        title: "Message sent successfully",
        description: "Your doctor will be notified of your question.",
        duration: 3000,
      });
    } catch (error) {
      console.error("Error sending message:", error);
      setError("Failed to send message. Please try again.");
      
      toast({
        title: "Failed to send message",
        description: "There was a problem sending your message. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  // For new meetings, show a simplified interface
  if (isNewMeeting) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FBFBFD]">
        <main className="flex-grow flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>No Meeting Selected</CardTitle>
              <CardDescription>
                There is no active meeting with this ID
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                You need to be invited to a meeting by your doctor to view a medical report.
                Please return to your dashboard and select an available meeting.
              </p>
              <Button 
                onClick={() => navigate("/patient/dashboard")}
                className="w-full"
              >
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  if (!meeting) {
    return <LoadingSpinner />;
  }
  
  if (!canViewMeeting) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FBFBFD]">
        <main className="flex-grow flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>
                This medical report has not been shared with you yet.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                The doctor has not yet shared this medical report. Please check back later or contact your doctor.
              </p>
              <Button 
                onClick={() => navigate("/patient/dashboard")}
                className="w-full"
              >
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFD]">
      <main className="flex-grow">
        <div className="container mx-auto px-4 pb-24 pt-12">
          {/* Header Section */}
          <div className="relative flex flex-col space-y-6 pb-16">
            <div className="absolute inset-x-0 -top-24 -bottom-24 bg-gradient-to-b from-[#FBFBFD] via-white to-[#FBFBFD] opacity-80 blur-3xl -z-10" />
            
            <div className="flex justify-between items-center">
              <h1 className="text-4xl font-semibold text-[#1D1D1F] tracking-tight">
                {meeting.title || "Medical Appointment"}
              </h1>
              
              <Button 
                variant="outline"
                onClick={() => navigate("/patient/dashboard")}
              >
                Back to Dashboard
              </Button>
            </div>
            
            <div className="flex space-x-4">
              <div className="text-gray-500">
                Doctor: {meeting.doctorName || "Unknown"}
              </div>
              <div className="text-gray-500">
                Date: {new Date(meeting.scheduledTime).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Tabs for different sections */}
          <Tabs defaultValue="report" className="space-y-8">
            <TabsList className="grid grid-cols-3 w-full max-w-lg">
              <TabsTrigger value="report">Medical Report</TabsTrigger>
              <TabsTrigger value="trials">Clinical Trials</TabsTrigger>
              <TabsTrigger value="ai-chat" className="flex items-center">
                <Brain className="w-4 h-4 mr-2" />
                AI Assistant
              </TabsTrigger>
            </TabsList>
            
            {/* Medical Report Tab */}
            <TabsContent value="report" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Medical Report</CardTitle>
                  <CardDescription>
                    Your medical report from this appointment
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {meeting.report ? (
                    <FormattedMedicalReport reportText={meeting.report} />
                  ) : (
                    <div className="text-center p-12">
                      <p className="text-gray-500">No report available for this appointment.</p>
                    </div>
                  )}
                  
                  {/* Questions/Message Section */}
                  <div className="mt-8 pt-8 border-t">
                    <h3 className="text-lg font-medium mb-4">Questions for your Doctor</h3>
                    <Textarea
                      placeholder="Type any questions you have about your medical report..."
                      className="mb-4"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                    <Button 
                      onClick={handleSendMessage}
                      className="bg-blue-600 hover:bg-blue-700"
                      disabled={!message.trim()}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Send Message
                    </Button>
                    {error && (
                      <div className="mt-4 text-red-600">
                        {error}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Clinical Trials Tab */}
            <TabsContent value="trials" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recommended Clinical Trials</CardTitle>
                  <CardDescription>
                    Clinical trials that may be relevant to your condition
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {(meeting.clinicalTrials && meeting.clinicalTrials.length > 0) ? (
                    <div className="space-y-4">
                      {meeting.clinicalTrials
                        .filter(trial => trial.approved === true)
                        .map((trial, index) => (
                          <div key={index} className="border rounded-md p-4 hover:bg-gray-50">
                            <h3 className="font-medium text-lg">{trial.title}</h3>
                            <p className="text-gray-500 mt-1">{trial.description}</p>
                            <div className="mt-2 flex justify-between items-center">
                              <div>
                                <span className="text-sm text-gray-500">Location: </span>
                                <span className="text-sm">{trial.location || "Various locations"}</span>
                              </div>
                              <a 
                                href={trial.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                Learn More
                              </a>
                            </div>
                            <div className="mt-2">
                              <span className="text-sm text-gray-500">Status: </span>
                              <span className="text-sm font-medium text-green-600">
                                {trial.status || "Recruiting"}
                              </span>
                            </div>
                            {trial.eligibility && (
                              <div className="mt-2">
                                <span className="text-sm text-gray-500">Eligibility: </span>
                                <span className="text-sm">{trial.eligibility}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      {meeting.clinicalTrials.filter(trial => trial.approved === true).length === 0 && (
                        <div className="text-center p-12">
                          <p className="text-gray-500">No approved clinical trials available yet.</p>
                          <p className="text-sm text-gray-400 mt-2">Your doctor will approve relevant trials for you to review.</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center p-12">
                      <p className="text-gray-500">No clinical trials have been recommended.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* AI Chatbot Tab */}
            <TabsContent value="ai-chat" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>AI Medical Assistant</CardTitle>
                  <CardDescription>
                    Ask questions about your medical records and get AI-powered insights
                  </CardDescription>
                </CardHeader>
                <CardContent className="min-h-[600px]">
                  {userData && meeting ? (
                    <MedicalAIChatbot patientId={meeting.patientId} />
                  ) : (
                    <div className="text-center p-12">
                      <p className="text-gray-500">Loading your medical records...</p>
                      <LoadingSpinner size="default" className="mt-4" />
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