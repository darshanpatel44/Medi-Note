import { useUser } from "@clerk/clerk-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Footer } from "../../components/footer";
import { Calendar } from "../../components/ui/calendar";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addHours,
  setHours,
  setMinutes,
} from "date-fns";
import { CalendarIcon, Clock } from "lucide-react";
import { useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { useNavigate } from "react-router-dom";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";

export default function DoctorDashboard() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [date, setDate] = useState<Date>(new Date());
  const [view, setView] = useState<"day" | "month">("month");
  
  // Scheduling dialog state
  const [isSchedulingOpen, setIsSchedulingOpen] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState<Date | undefined>(new Date());
  const [appointmentTime, setAppointmentTime] = useState<string>("09:00");
  const [patientId, setPatientId] = useState<string>("");
  const [patientName, setPatientName] = useState<string>("");
  const [appointmentTitle, setAppointmentTitle] = useState<string>("Medical Appointment");
  const [appointmentDuration, setAppointmentDuration] = useState<number>(30);
  const [isScheduling, setIsScheduling] = useState(false);

  // Get user data from Convex
  const userData = useQuery(
    api.users.getUserByToken,
    user?.id ? { tokenIdentifier: user.id } : "skip",
  );

  // Get meetings for this doctor
  const meetings = useQuery(
    api.meetings.getDoctorMeetings,
    user?.id ? { doctorId: user.id } : "skip",  // Use Clerk auth ID instead of Convex DB ID
  );
  
  // Get patients
  const patients = useQuery(
    api.users.getPatients,
    {}
  );
  
  // Create meeting mutation
  const createMeeting = useMutation(api.meetings.createMeeting);

  // Filter meetings for the selected date
  const selectedDateMeetings = meetings?.filter((meeting) => {
    const meetingDate = new Date(meeting.scheduledTime);
    return isSameDay(meetingDate, date);
  });

  // Generate calendar days with meeting indicators
  const calendarDays = eachDayOfInterval({
    start: startOfMonth(date),
    end: endOfMonth(date),
  });

  // Check if a day has meetings
  const hasMeetings = (day: Date) => {
    return meetings?.some((meeting) => {
      const meetingDate = new Date(meeting.scheduledTime);
      return isSameDay(meetingDate, day);
    });
  };
  
  // Schedule new appointment
  const handleScheduleAppointment = async () => {
    if (!appointmentDate || !patientId || !user) return;
    
    try {
      setIsScheduling(true);
      
      // Parse time string and combine with date
      const [hours, minutes] = appointmentTime.split(':').map(Number);
      const scheduledTime = new Date(appointmentDate);
      scheduledTime.setHours(hours, minutes, 0, 0);
      
      const meetingId = await createMeeting({
        doctorId: user.id,
        patientId,
        doctorName: user.fullName || "Doctor",
        patientName,
        scheduledTime: scheduledTime.getTime(),
        duration: appointmentDuration,
        title: appointmentTitle,
      });
      
      // Reset form and close dialog
      setAppointmentDate(new Date());
      setAppointmentTime("09:00");
      setPatientId("");
      setPatientName("");
      setAppointmentTitle("Medical Appointment");
      setAppointmentDuration(30);
      setIsSchedulingOpen(false);
      
      // If the appointment is scheduled for today, update the calendar view to show it
      if (isSameDay(scheduledTime, date)) {
        // Force a refresh of the meetings list
        setDate(new Date(date));
      }
      
    } catch (error) {
      console.error("Error scheduling appointment:", error);
    } finally {
      setIsScheduling(false);
    }
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
                {format(date, "EEEE, MMMM d, yyyy")}
              </p>
            </div>
            <Button 
              size="sm" 
              onClick={() => setIsSchedulingOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              New Appointment
            </Button>
          </div>

          {/* Dashboard Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Calendar */}
            <div className="lg:col-span-2">
              <Card className="shadow-sm hover:shadow-md transition-all">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Appointment Calendar</CardTitle>
                      <CardDescription>
                        Manage your upcoming appointments
                      </CardDescription>
                    </div>
                    <div>
                      <Tabs
                        defaultValue={view}
                        onValueChange={(value) =>
                          setView(value as "day" | "month")
                        }
                      >
                        <TabsList>
                          <TabsTrigger
                            value="month"
                            className={
                              view === "month"
                                ? "bg-primary text-primary-foreground"
                                : ""
                            }
                          >
                            Month
                          </TabsTrigger>
                          <TabsTrigger
                            value="day"
                            className={
                              view === "day"
                                ? "bg-primary text-primary-foreground"
                                : ""
                            }
                          >
                            Day
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs
                    value={view}
                    onValueChange={(value) => setView(value as "day" | "month")}
                  >
                    <div className="flex flex-col md:flex-row gap-6">
                      {/* Calendar Component */}
                      <div className="md:w-[45%]">
                        <TabsContent
                          value="month"
                          className="flex flex-col space-y-6"
                        >
                          <Calendar
                            mode="single"
                            selected={date}
                            onSelect={(date) => date && setDate(date)}
                            className="rounded-md border w-full"
                            modifiers={{
                              hasMeetings: calendarDays.filter((day) =>
                                hasMeetings(day),
                              ),
                            }}
                            modifiersStyles={{
                              hasMeetings: {
                                fontWeight: "bold",
                                backgroundColor: "rgba(59, 130, 246, 0.1)",
                              },
                            }}
                          />
                        </TabsContent>
                        <TabsContent
                          value="day"
                          className="flex flex-col space-y-6"
                        >
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium">
                              {format(date, "MMMM d, yyyy")}
                            </h3>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setIsSchedulingOpen(true)}
                            >
                              New Appointment
                            </Button>
                          </div>
                        </TabsContent>
                      </div>

                      {/* Today's schedule - Always visible regardless of tab */}
                      <div className="md:w-[55%] md:border-l md:pl-6">
                        <div className="mb-4">
                          <h3 className="text-lg font-medium mb-2">
                            {format(date, "MMMM d, yyyy")} - Schedule
                          </h3>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Clock className="h-4 w-4 mr-1" />
                            <span>All appointments for selected date</span>
                          </div>
                        </div>

                        {selectedDateMeetings && selectedDateMeetings.length > 0 ? (
                          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                            {selectedDateMeetings.map((meeting) => (
                              <div
                                key={meeting._id}
                                className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                                onClick={() =>
                                  navigate(`/doctor/meetings/${meeting._id}`)
                                }
                              >
                                <div className="flex justify-between items-center">
                                  <div>
                                    <h4 className="font-medium">
                                      {meeting.title || "Appointment"}
                                    </h4>
                                    <div className="flex items-center text-sm text-gray-500 mt-1">
                                      <Clock className="h-3 w-3 mr-1" />
                                      {format(
                                        new Date(meeting.scheduledTime),
                                        "h:mm a",
                                      )}{" "}
                                      -
                                      {format(
                                        new Date(
                                          meeting.scheduledTime +
                                            meeting.duration * 60 * 1000,
                                        ),
                                        "h:mm a",
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-500 mt-1">
                                      Patient: {meeting.patientName || "Unknown"}
                                    </p>
                                  </div>
                                  <Badge
                                    variant={
                                      meeting.status === "completed"
                                        ? "success"
                                        : meeting.status === "in-progress"
                                          ? "warning"
                                          : meeting.status === "cancelled"
                                            ? "destructive"
                                            : "outline"
                                    }
                                  >
                                    {meeting.status}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12 border rounded-lg bg-gray-50">
                            <p className="text-gray-500">No appointments scheduled for this day</p>
                            <Button 
                              variant="outline"
                              size="sm"
                              className="mt-4"
                              onClick={() => setIsSchedulingOpen(true)}
                            >
                              New Appointment
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Previous list of appointments - hidden */}
                    <TabsContent
                      value="month"
                      className="hidden"
                    >
                      {/* Hidden content */}
                    </TabsContent>
                    <TabsContent
                      value="day"
                      className="hidden"
                    >
                      {/* Hidden content */}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Stats & Quick Actions */}
            <div className="space-y-6">
              {/* Stats Card */}
              <Card className="shadow-sm hover:shadow-md transition-all h-full">
                <CardHeader>
                  <CardTitle>At a Glance</CardTitle>
                  <CardDescription>Your appointment statistics</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col justify-center h-[calc(100%-110px)]">
                  <div className="grid grid-cols-2 gap-4">
                    <StatCard
                      title="Today"
                      value={
                        meetings?.filter((m) =>
                          isSameDay(new Date(m.scheduledTime), new Date()),
                        ).length || 0
                      }
                      label="appointments"
                    />
                    <StatCard
                      title="This Week"
                      value={meetings?.length || 0}
                      label="appointments"
                    />
                    <StatCard
                      title="Completed"
                      value={
                        meetings?.filter((m) => m.status === "completed")
                          .length || 0
                      }
                      label="appointments"
                    />
                    <StatCard
                      title="Upcoming"
                      value={
                        meetings?.filter((m) => m.status === "scheduled")
                          .length || 0
                      }
                      label="appointments"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
      
      {/* Scheduling Dialog */}
      <Dialog open={isSchedulingOpen} onOpenChange={setIsSchedulingOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>New Appointment</DialogTitle>
            <DialogDescription>
              Create a new appointment with a patient. Fill out the details below.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Patient Selection */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="patient" className="text-right">
                Patient
              </Label>
              <div className="col-span-3">
                <Select
                  value={patientId}
                  onValueChange={(value) => {
                    setPatientId(value);
                    // Find the patient name for the selected ID
                    const selectedPatient = patients?.find(p => p._id === value);
                    if (selectedPatient) {
                      setPatientName(selectedPatient.name || "Unknown");
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients?.filter(p => p.role === 'patient').map((patient) => (
                      <SelectItem key={patient._id} value={patient._id}>
                        {patient.name}
                      </SelectItem>
                    ))}
                    {/* Fallback if no patients are available */}
                    {(!patients || patients.length === 0) && (
                      <SelectItem value="placeholder">No patients available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Appointment Title */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Title
              </Label>
              <Input
                id="title"
                value={appointmentTitle}
                onChange={(e) => setAppointmentTitle(e.target.value)}
                className="col-span-3"
              />
            </div>
            
            {/* Appointment Date */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">
                Date
              </Label>
              <div className="col-span-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {appointmentDate ? format(appointmentDate, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={appointmentDate}
                      onSelect={setAppointmentDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            {/* Appointment Time */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="time" className="text-right">
                Time
              </Label>
              <div className="col-span-3">
                <Select
                  value={appointmentTime}
                  onValueChange={(value) => setAppointmentTime(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="09:00">9:00 AM</SelectItem>
                    <SelectItem value="09:30">9:30 AM</SelectItem>
                    <SelectItem value="10:00">10:00 AM</SelectItem>
                    <SelectItem value="10:30">10:30 AM</SelectItem>
                    <SelectItem value="11:00">11:00 AM</SelectItem>
                    <SelectItem value="11:30">11:30 AM</SelectItem>
                    <SelectItem value="13:00">1:00 PM</SelectItem>
                    <SelectItem value="13:30">1:30 PM</SelectItem>
                    <SelectItem value="14:00">2:00 PM</SelectItem>
                    <SelectItem value="14:30">2:30 PM</SelectItem>
                    <SelectItem value="15:00">3:00 PM</SelectItem>
                    <SelectItem value="15:30">3:30 PM</SelectItem>
                    <SelectItem value="16:00">4:00 PM</SelectItem>
                    <SelectItem value="16:30">4:30 PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Duration */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="duration" className="text-right">
                Duration
              </Label>
              <div className="col-span-3">
                <Select
                  value={appointmentDuration.toString()}
                  onValueChange={(value) => setAppointmentDuration(parseInt(value, 10))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              onClick={() => setIsSchedulingOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleScheduleAppointment}
              disabled={isScheduling || !appointmentDate || !patientId}
            >
              {isScheduling ? "Scheduling..." : "Schedule Appointment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  title,
  value,
  label,
}: {
  title: string;
  value: number;
  label: string;
}) {
  return (
    <div className="bg-gray-50 p-4 rounded-lg text-center">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}
