import { useUser } from "@clerk/clerk-react";
import { useMutation, useAction, useQuery } from "convex/react";
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
import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Send, Edit, Check, X, Clock, CalendarPlus, CalendarIcon, CheckCircle, Circle } from "lucide-react";
import { LoadingSpinner } from "../../components/loading-spinner";
import { Textarea } from "../../components/ui/textarea";
import { useToast } from "../../components/ui/use-toast";
import { FormattedMedicalReport } from "../../components/FormattedMedicalReport";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Popover, PopoverTrigger, PopoverContent } from "../../components/ui/popover";
import { Calendar } from "../../components/ui/calendar";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../components/ui/select";
import { format } from "date-fns";

export default function DoctorMeeting() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const { toast } = useToast();
  
  // Check if we're creating a new meeting
  const isNewMeeting = meetingId === 'new';
  
  // State variables
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isEditingReport, setIsEditingReport] = useState(false);
  const [reportContent, setReportContent] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  
  // Follow-up scheduling state
  const [isSchedulingFollowUp, setIsSchedulingFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState<Date | undefined>(new Date());
  const [followUpTime, setFollowUpTime] = useState<string>("09:00");
  const [followUpDuration, setFollowUpDuration] = useState<number>(30);
  const [followUpTitle, setFollowUpTitle] = useState<string>("Follow-up Appointment");
  const [followUpPatientId, setFollowUpPatientId] = useState<string>("");
  const [followUpPatientName, setFollowUpPatientName] = useState<string>("");
  const [isCreatingAppointment, setIsCreatingAppointment] = useState(false);
  const [selectedRecommendationIndex, setSelectedRecommendationIndex] = useState<number>(-1);
  
  // Follow-up recommendations state (loaded from database)
  const [followUpRecommendations, setFollowUpRecommendations] = useState<Array<{
    text: string;
    date?: Date | number;
    time?: string;
    dismissed?: boolean;
    scheduled?: boolean;
    scheduledMeetingId?: string;
  }>>([]);
  const [isSavingRecommendations, setIsSavingRecommendations] = useState(false);
  
  // Dismissed recommendations tracking
  const [dismissedRecommendations, setDismissedRecommendations] = useState<string[]>([]);
  
  // References
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  
  console.log("Meeting ID from URL:", meetingId);
  
  // Fetch meeting data with proper error handling
  const meeting = useQuery(
    api.meetings.getMeeting, 
    !isNewMeeting && meetingId ? { id: meetingId as any } : "skip"
  );
  
  console.log("Meeting data:", meeting);
  
  // Mutations for backend operations
  const updateMeeting = useMutation(api.meetings.updateMeeting);
  const generateMedicalReport = useAction(api.meetings.generateMedicalReport);
  const fetchClinicalTrials = useAction(api.meetings.fetchClinicalTrials);
  const createMeeting = useMutation(api.meetings.createMeeting);
  const startRecordingMutation = useMutation(api.meetings.startRecording);
  const generateUploadUrl = useMutation(api.meetings.generateUploadUrl);
  const saveRecordingUrl = useMutation(api.meetings.saveRecordingUrl);
  const transcribeAudioAction = useAction(api.meetings.transcribeAudio);
  
  // Mutations for follow-up recommendations
  const saveFollowUpRecommendations = useMutation(api.meetings.saveFollowUpRecommendations);
  const dismissFollowUpRecommendation = useMutation(api.meetings.dismissFollowUpRecommendation);
  const markFollowUpAsScheduled = useMutation(api.meetings.markFollowUpAsScheduled);
  
  // Mutation for clinical trial approval
  const updateClinicalTrialApproval = useMutation(api.meetings.updateClinicalTrialApproval);
  
  // Initialize reportContent when meeting data is loaded
  useEffect(() => {
    if (meeting?.report) {
      setReportContent(meeting.report);
    }
    
    // Load follow-up recommendations from the database if available
    if (meeting?.followUpRecommendations) {
      // Convert timestamps to Date objects
      const recommendations = meeting.followUpRecommendations.map(rec => ({
        ...rec,
        date: rec.date ? new Date(rec.date) : undefined
      }));
      
      setFollowUpRecommendations(recommendations);
      
      // Also set dismissed recommendations
      const dismissed = recommendations
        .filter(rec => rec.dismissed)
        .map(rec => rec.text);
      
      setDismissedRecommendations(dismissed);
    }
  }, [meeting?.report, meeting?.followUpRecommendations]);
  
  // Save recommendations to database when they change
  useEffect(() => {
    const saveRecommendationsToDatabase = async () => {
      if (!meetingId || !meeting || isSavingRecommendations) return;
      
      try {
        setIsSavingRecommendations(true);
        
        // Get recommendations from both the report and transcript
        const reportRecommendations = extractFollowUpRecommendations(reportContent || meeting.report || "");
        const transcriptRecommendations = extractFollowUpFromTranscript(transcript || meeting.transcript || "");
        
        // Merge recommendations, removing duplicates
        const allRecommendations = [...reportRecommendations];
        
        // Add transcript recommendations if they're not already included
        for (const rec of transcriptRecommendations) {
          const isDuplicate = allRecommendations.some(existingRec => 
            existingRec.text.toLowerCase().includes(rec.text.toLowerCase()) || 
            rec.text.toLowerCase().includes(existingRec.text.toLowerCase())
          );
          
          if (!isDuplicate) {
            allRecommendations.push(rec);
          }
        }
        
        // Mark dismissed recommendations
        const recommendations = allRecommendations.map(rec => ({
          text: rec.text,
          date: rec.date instanceof Date ? rec.date.getTime() : undefined, // Convert Date to timestamp
          time: rec.time,
          dismissed: dismissedRecommendations.some(dismissed => 
            dismissed === rec.text || 
            dismissed.includes(rec.text) || 
            rec.text.includes(dismissed)
          ),
          scheduled: false // Will be marked as true when scheduled
        }));
        
        // Save to Convex
        await saveFollowUpRecommendations({
          meetingId: meetingId as any,
          recommendations
        });
        
        // Update local state
        setFollowUpRecommendations(recommendations);
        
      } catch (error) {
        console.error("Error saving follow-up recommendations:", error);
        toast({
          title: "Error saving recommendations",
          description: "There was a problem saving the follow-up recommendations.",
          variant: "destructive",
          duration: 3000,
        });
      } finally {
        setIsSavingRecommendations(false);
      }
    };
    
    // Save recommendations when report, transcript or dismissed recommendations change
    const timer = setTimeout(saveRecommendationsToDatabase, 1000);
    return () => clearTimeout(timer);
    
  }, [meetingId, meeting, reportContent, transcript, dismissedRecommendations]);
  
  // Function to share the medical report with the patient
  const shareWithPatient = async () => {
    if (!meetingId) return;
    
    try {
      setIsSharing(true);
      
      await updateMeeting({
        id: meetingId,
        isSharedWithPatient: true
      });
      
      toast({
        title: "Report shared with patient",
        description: "The patient can now access this medical report",
        duration: 3000,
      });
    } catch (error) {
      console.error("Error sharing report with patient:", error);
      
      toast({
        title: "Error sharing report",
        description: "There was a problem sharing the report with the patient.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsSharing(false);
    }
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format recording time as MM:SS
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  };
  
  // Start recording function
  const startRecording = async () => {
    try {
      setError(null);
      
      // If this is a new meeting, create it first
      let actualMeetingId: string | undefined = meetingId;
      
      if (isNewMeeting) {
        // Create a new meeting for the current doctor
        if (user?.id) {
          actualMeetingId = await createMeeting({
            doctorId: user.id,
            patientId: "pending-assignment", // Will be assigned later
            scheduledTime: Date.now(),
            duration: 30, // Default 30-minute meeting
            title: "New Consultation",
            doctorName: user.fullName || "Doctor"
          });
          
          // Navigate to the new meeting page
          navigate(`/doctor/meetings/${actualMeetingId}`, { replace: true });
          return; // Don't continue with recording until we're on the new page
        }
      }

      // Call the startRecording mutation to record the timestamp
      if (actualMeetingId) {
        await startRecordingMutation({ meetingId: actualMeetingId as any });
      }

      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        
        // Upload the recording
        await uploadRecording(audioBlob, actualMeetingId as any);
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      
      // Start timer
      let seconds = 0;
      timerRef.current = window.setInterval(() => {
        seconds += 1;
        setRecordingTime(seconds);
      }, 1000);
    } catch (error) {
      console.error("Error starting recording:", error);
      setError("Failed to start recording. Please check microphone access.");
    }
  };
  
  // Upload recording to storage
  const uploadRecording = async (audioBlob: Blob, meetingId: string) => {
    try {
      setUploadError(null);
      
      // Step 1: Get a short-lived upload URL
      const postUrl = await generateUploadUrl({
        meetingId: meetingId as any, // Cast to the correct type
        contentType: audioBlob.type,
      });
      
      // Step 2: POST the file to the URL
      const result = await fetch(postUrl, {
        method: 'POST',
        headers: { 'Content-Type': audioBlob.type },
        body: audioBlob,
      });
      
      if (!result.ok) {
        throw new Error(`Upload failed with status ${result.status}`);
      }
      
      // Step 3: Extract the storage ID from the response
      const { storageId } = await result.json();
      
      console.log('Successfully uploaded recording, storageId:', storageId);

      // Step 4: Save the storage ID in the database
      await saveRecordingUrl({
        meetingId: meetingId as any, // Cast to the correct type
        storageId,
      });

      console.log('Successfully saved recording URL');

      // Step 5: Automatically start transcription
      toast({
        title: "Recording saved successfully",
        description: "Starting transcription with OpenAI Whisper...",
        duration: 3000,
      });
      
      transcribeAudio(meetingId);
    } catch (error) {
      console.error("Error uploading recording:", error);
      setUploadError("Failed to upload recording. Please try again.");
    }
  };
  
  // Stop recording function
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Stop all audio tracks
      const tracks = mediaRecorderRef.current.stream.getTracks();
      tracks.forEach(track => track.stop());
    }
  };
  
  // Function to transcribe audio
  const transcribeAudio = async (meetingId: string) => {
    try {
      setIsTranscribing(true);
      
      // Call the Convex transcribe function
      const transcriptText = await transcribeAudioAction({
        meetingId: meetingId as any,
      });
      
      setTranscript(transcriptText);
      toast({
        title: "Audio transcription complete",
        description: "Your recording has been successfully transcribed",
        duration: 3000,
      });
      
      // Generate report automatically
      generateReport(transcriptText);
    } catch (error) {
      console.error("Error transcribing audio:", error);
      toast({
        title: "Transcription failed",
        description: "There was an issue transcribing your audio. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsTranscribing(false);
    }
  };
  
  // Function to generate medical report
  const generateReport = async (transcriptionText: string) => {
    if (!meetingId) return;
    
    setIsGeneratingReport(true);
    toast({
      title: "Generating medical report",
      description: "Creating structured report from transcript...",
      duration: 3000,
    });
    
    try {
      const report = await generateMedicalReport({
        meetingId,
        transcript: transcriptionText
      });
      
      setReportContent(report);
      toast({
        title: "Medical report generated",
        description: "Your structured medical report is ready",
        duration: 3000,
      });
      
      // Also fetch clinical trials based on the generated report
      await fetchClinicalTrials({
        meetingId,
        conditions: extractConditions(report)
      });
      
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "Report generation failed",
        description: "There was an issue creating the medical report.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };
  
  // Helper function to extract medical conditions from report
  const extractConditions = (report: string): string[] => {
    // This is a simplified version - in a real app, you'd use NLP or a more sophisticated approach
    const conditions: string[] = [];
    
    // Extract anything that looks like a condition (very basic implementation)
    const possibleConditions = report.match(/(?:diagnosed with|has|suffers from|exhibits) ([^,.]+)/gi);
    
    if (possibleConditions) {
      possibleConditions.forEach(match => {
        const condition = match.replace(/(?:diagnosed with|has|suffers from|exhibits) /i, '').trim();
        conditions.push(condition);
      });
    }
    
    return conditions;
  };

  // Function to extract follow-up recommendations from transcript
  const extractFollowUpFromTranscript = (transcript: string): { text: string; date?: Date; time?: string }[] => {
    if (!transcript) return [];
    
    const recommendations: { text: string; date?: Date; time?: string }[] = [];
    
    // Use meeting date as the base date for relative follow-up times
    const baseDate = meeting?.scheduledTime ? new Date(meeting.scheduledTime) : new Date();
    
    // Split transcript into sentences for analysis
    const sentences = transcript.split(/[.!?]+/).filter(sent => sent.trim().length > 0);
    
    // Look for sentences mentioning follow-ups
    const followUpSentences = sentences.filter(sentence => {
      const lowerSentence = sentence.toLowerCase();
      
      return (
        (lowerSentence.includes("follow") && (lowerSentence.includes("up") || lowerSentence.includes("-up"))) ||
        (lowerSentence.includes("come back") || lowerSentence.includes("come in")) ||
        (lowerSentence.includes("schedule") && (lowerSentence.includes("appointment") || lowerSentence.includes("visit"))) ||
        (lowerSentence.includes("see me") && (lowerSentence.includes("again") || lowerSentence.includes("in"))) ||
        (lowerSentence.includes("visit") && (lowerSentence.includes("again") || lowerSentence.includes("next"))) ||
        (lowerSentence.includes("check") && lowerSentence.includes("again")) ||
        (lowerSentence.includes("return") && (lowerSentence.includes("clinic") || lowerSentence.includes("office"))) ||
        ((lowerSentence.includes("next") || lowerSentence.includes("another")) && lowerSentence.includes("appointment"))
      );
    });
    
    // Process each potential follow-up sentence
    for (const sentence of followUpSentences) {
      let recommendationDate: Date | undefined = undefined;
      let recommendationTime: string | undefined = undefined;
      
      // Extract date/time information using our existing patterns
      
      // Check for relative time periods (X days/weeks/months)
      const relativeTimeMatch = sentence.match(/(?:in|after|within)\s+(\d+)\s+(day|days|week|weeks|month|months)/i);
      if (relativeTimeMatch) {
        const quantity = parseInt(relativeTimeMatch[1]);
        const unit = relativeTimeMatch[2].toLowerCase();
        
        if (!isNaN(quantity)) {
          // Clone the base date to avoid modifying it
          const recommendDate = new Date(baseDate.getTime());
          
          if (unit.includes('day')) {
            recommendationDate = new Date(recommendDate.setDate(recommendDate.getDate() + quantity));
          } else if (unit.includes('week')) {
            recommendationDate = new Date(recommendDate.setDate(recommendDate.getDate() + (quantity * 7)));
          } else if (unit.includes('month')) {
            recommendationDate = new Date(recommendDate.setMonth(recommendDate.getMonth() + quantity));
          }
        }
      }
      
      // Check for specific time mentions
      const timeMatch = sentence.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|AM|PM)/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        const period = timeMatch[3].toLowerCase();
        
        // Convert to 24-hour format
        if (period === 'pm' && hours < 12) {
          hours += 12;
        } else if (period === 'am' && hours === 12) {
          hours = 0;
        }
        
        recommendationTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }
      
      // Check for specific date mentions
      const potentialDateTexts = sentence.match(/(?:on|next|this)\s+([^,.]+)/i);
      if (potentialDateTexts && !recommendationDate) {
        const dateText = potentialDateTexts[1].trim();
        
        // Handle relative day references
        if (dateText.match(/tomorrow/i)) {
          const tomorrow = new Date(baseDate.getTime());
          tomorrow.setDate(tomorrow.getDate() + 1);
          recommendationDate = tomorrow;
        } else if (dateText.match(/next week/i)) {
          const nextWeek = new Date(baseDate.getTime());
          nextWeek.setDate(nextWeek.getDate() + 7);
          recommendationDate = nextWeek;
        } else if (dateText.match(/next month/i)) {
          const nextMonth = new Date(baseDate.getTime());
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          recommendationDate = nextMonth;
        } else {
          // Try to parse specific date formats
          try {
            const possibleDate = new Date(dateText);
            if (!isNaN(possibleDate.getTime())) {
              recommendationDate = possibleDate;
            }
          } catch (e) {
            // If date parsing fails, keep undefined
          }
        }
      }
      
      // Add to recommendations if not already included
      const alreadyIncluded = recommendations.some(rec => 
        rec.text.toLowerCase().includes(sentence.toLowerCase()) || 
        sentence.toLowerCase().includes(rec.text.toLowerCase())
      );
      
      if (!alreadyIncluded) {
        recommendations.push({
          text: sentence.trim(),
          date: recommendationDate,
          time: recommendationTime
        });
      }
    }
    
    return recommendations;
  };

  // Function to extract follow-up recommendations from report
  const extractFollowUpRecommendations = (report: string): { text: string; date?: Date; time?: string }[] => {
    const recommendations: { text: string; date?: Date; time?: string }[] = [];
    
    // Common phrases that indicate follow-up recommendations
    const followUpRegexes = [
      // Format: "follow up in X weeks/months/days"
      /follow(?:\s|-)?up (?:in|after) (\d+) (day|days|week|weeks|month|months)/gi,
      
      // Format: "schedule appointment in X weeks/months/days"
      /schedule (?:a |another |follow-up )?appointment (?:in|after) (\d+) (day|days|week|weeks|month|months)/gi,
      
      // Format: "return to clinic/office on <date>"
      /return to (?:clinic|office|hospital) (?:on|in) ([^,.]+)/gi,
      
      // Format: "see me again on <date>" or "visit again on <date>"
      /(?:see me|visit|come back) again (?:on|in) ([^,.]+)/gi,
      
      // Format: "next appointment on <date>"
      /next appointment (?:on|for) ([^,.]+)/gi,
      
      // Format: "follow-up visit in X time"
      /follow(?:\s|-)?up visit (?:in|after) (\d+) (day|days|week|weeks|month|months)/gi,
      
      // Additional patterns to catch more variations
      /(?:recommended|recommend|advised|suggested|suggest) (?:a )?follow(?:\s|-)?up (?:in|after|on|within) ([^,.]+)/gi,
      
      // "Patient should return" format
      /(?:patient|pt)(?:'s?)? should (?:return|follow up|come back) (?:in|after|on|within) ([^,.]+)/gi,
      
      // "Schedule for next week/month" format
      /schedule(?:d)? (?:for|in) (?:the )?(?:next|coming|following) ([^,.]+)/gi,
      
      // "Visit in X weeks" with optional "to" preposition
      /visit (?:in|after|within) (\d+) (day|days|week|weeks|month|months)/gi,
      
      // Catch direct date mentions in the Plan section
      /(?:follow(?:\s|-)?up|appointment|visit|check(?:\s|-)?up|checkup|review|re-assessment) (?:date|scheduled for|set for|on): ?([^,.]+)/gi,
      
      // "Will see again" format used by doctors
      /will (?:see|check|review|assess|evaluate) (?:patient|pt|again) (?:in|after|on|within) ([^,.]+)/gi
    ];
    
    // Use meeting date as the base date for relative follow-up times
    const baseDate = meeting?.scheduledTime ? new Date(meeting.scheduledTime) : new Date();
    
    // Extract all matches from the report
    for (const regex of followUpRegexes) {
      const matches = [...report.matchAll(new RegExp(regex, 'gi'))];
      
      for (const match of matches) {
        const fullText = match[0].trim();
        let recommendationDate: Date | undefined = undefined;
        let recommendationTime: string | undefined = undefined;
        
        // Try to parse date information
        if (match[1] && match[2]) {
          // Handle relative dates like "2 weeks" or "1 month"
          const quantity = parseInt(match[1]);
          const unit = match[2].toLowerCase();
          
          if (!isNaN(quantity)) {
            // Clone the base date to avoid modifying it
            const recommendDate = new Date(baseDate.getTime());
            
            if (unit.includes('day')) {
              recommendationDate = new Date(recommendDate.setDate(recommendDate.getDate() + quantity));
            } else if (unit.includes('week')) {
              recommendationDate = new Date(recommendDate.setDate(recommendDate.getDate() + (quantity * 7)));
            } else if (unit.includes('month')) {
              recommendationDate = new Date(recommendDate.setMonth(recommendDate.getMonth() + quantity));
            }
          }
        } else if (match[1]) {
          // Try to extract a specific date or day
          const dateText = match[1].trim();
          
          // Check for time mentions in the text
          const timeMatch = dateText.match(/(\d{1,2}:\d{2}|(?:\d{1,2})(?:am|pm|AM|PM))/);
          if (timeMatch) {
            recommendationTime = timeMatch[0];
          }
          
          // Check for relative time periods like "next week", "next month"
          if (dateText.match(/next week/i)) {
            const nextWeek = new Date(baseDate.getTime());
            nextWeek.setDate(nextWeek.getDate() + 7);
            recommendationDate = nextWeek;
          } else if (dateText.match(/next month/i)) {
            const nextMonth = new Date(baseDate.getTime());
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            recommendationDate = nextMonth;
          } else if (dateText.match(/tomorrow/i)) {
            const tomorrow = new Date(baseDate.getTime());
            tomorrow.setDate(tomorrow.getDate() + 1);
            recommendationDate = tomorrow;
          } else {
            // Try to parse specific date formats
            try {
              const possibleDate = new Date(dateText);
              if (!isNaN(possibleDate.getTime())) {
                recommendationDate = possibleDate;
              }
            } catch (e) {
              // If date parsing fails, just keep the text
            }
          }
        }
        
        recommendations.push({
          text: fullText,
          date: recommendationDate,
          time: recommendationTime
        });
      }
    }
    
    // Special handling for the Plan section - often contains follow-up info
    const planSectionMatch = report.match(/\*\*Plan\*\*([^*]+)/i);
    if (planSectionMatch && planSectionMatch[1]) {
      const planSection = planSectionMatch[1];
      
      // Look for sentences mentioning follow-up in the Plan section
      const planFollowUpSentences = planSection.split(/[.;\n]/).filter(sentence => 
        sentence.toLowerCase().includes("follow") || 
        sentence.toLowerCase().includes("appointment") || 
        sentence.toLowerCase().includes("visit") ||
        sentence.toLowerCase().includes("schedule") ||
        sentence.toLowerCase().includes("return") ||
        sentence.toLowerCase().includes("check") ||
        sentence.toLowerCase().includes("see me") ||
        sentence.toLowerCase().includes("see again")
      );
      
      // Add any follow-up sentences from Plan section that weren't caught by regular expressions
      for (const sentence of planFollowUpSentences) {
        const trimmedSentence = sentence.trim();
        
        // Check if this sentence is already included in our recommendations
        const alreadyIncluded = recommendations.some(rec => 
          rec.text.toLowerCase().includes(trimmedSentence.toLowerCase()) || 
          trimmedSentence.toLowerCase().includes(rec.text.toLowerCase())
        );
        
        if (trimmedSentence && !alreadyIncluded) {
          recommendations.push({
            text: trimmedSentence,
            date: undefined,
            time: undefined
          });
        }
      }
    }
    
    return recommendations;
  };

  const saveReport = async () => {
    if (!meetingId) return;
    
    try {
      await updateMeeting({
        id: meetingId,
        report: reportContent
      });
      
      setIsEditingReport(false);
      
      toast({
        title: "Report saved",
        description: "Your medical report has been updated.",
        duration: 3000,
      });
    } catch (error) {
      console.error("Error saving report:", error);
      
      toast({
        title: "Error saving report",
        description: "There was a problem saving your changes.",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  // Handle follow-up scheduling
  const handleScheduleFollowUp = (recommendation: { text: string; date?: Date; time?: string }, patientId?: string, patientName?: string, index?: number) => {
    if (!patientId) {
      toast({
        title: "Cannot schedule follow-up",
        description: "No patient information available for this appointment.",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    // Store the recommendation index for later
    setSelectedRecommendationIndex(index !== undefined ? index : -1);

    // Set default values for follow-up appointment
    setFollowUpTitle(`Follow-up: ${meeting.title || "Appointment"}`);
    setFollowUpPatientId(patientId);
    setFollowUpPatientName(patientName || "Patient");
    
    // Set recommended date if available, otherwise default to +2 weeks
    if (recommendation.date) {
      setFollowUpDate(recommendation.date);
    } else {
      const currentDate = new Date();
      const twoWeeksFromNow = new Date(currentDate);
      twoWeeksFromNow.setDate(currentDate.getDate() + 14);
      setFollowUpDate(twoWeeksFromNow);
    }
    
    // Set recommended time if available, otherwise default to morning appointment
    if (recommendation.time) {
      // Try to parse time from recommendation
      const timeMatch = recommendation.time.match(/(\d{1,2})(?::(\d{2}))?(?:\s*(am|pm|AM|PM))/);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1], 10);
        const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
        const period = timeMatch[3]?.toLowerCase();
        
        // Convert to 24-hour format
        if (period === 'pm' && hours < 12) {
          hours += 12;
        } else if (period === 'am' && hours === 12) {
          hours = 0;
        }
        
        setFollowUpTime(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
      } else {
        setFollowUpTime("09:00");
      }
    } else {
      setFollowUpTime("09:00");
    }
    
    // Set default duration (30 minutes)
    setFollowUpDuration(30);
    
    // Open the scheduling dialog
    setIsSchedulingFollowUp(true);
  };
  
  // Create a new follow-up appointment
  const scheduleFollowUpAppointment = async () => {
    if (!user?.id || !followUpPatientId || !followUpDate) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    
    try {
      setIsCreatingAppointment(true);
      
      // Parse time string and combine with date
      const [hours, minutes] = followUpTime.split(':').map(Number);
      const scheduledTime = new Date(followUpDate);
      scheduledTime.setHours(hours, minutes, 0, 0);
      
      // Create the follow-up meeting
      const newMeetingId = await createMeeting({
        doctorId: user.id,
        patientId: followUpPatientId,
        doctorName: user.fullName || "Doctor",
        patientName: followUpPatientName,
        scheduledTime: scheduledTime.getTime(),
        duration: followUpDuration,
        title: followUpTitle,
      });
      
      // If we have a selected recommendation index, mark it as scheduled
      if (selectedRecommendationIndex >= 0 && meetingId) {
        try {
          await markFollowUpAsScheduled({
            meetingId: meetingId as any,
            index: selectedRecommendationIndex,
            scheduledMeetingId: newMeetingId as any
          });
          
          // Update the local state to reflect the scheduled status
          const updatedRecommendations = [...followUpRecommendations];
          if (updatedRecommendations[selectedRecommendationIndex]) {
            updatedRecommendations[selectedRecommendationIndex] = {
              ...updatedRecommendations[selectedRecommendationIndex],
              scheduled: true,
              scheduledMeetingId: newMeetingId
            };
            setFollowUpRecommendations(updatedRecommendations);
          }
        } catch (error) {
          console.error("Error marking recommendation as scheduled:", error);
        }
      }
      
      // Show success message
      toast({
        title: "Follow-up appointment scheduled",
        description: `Appointment created for ${scheduledTime.toLocaleDateString()} at ${followUpTime}`,
        duration: 3000,
      });
      
      // Close dialog
      setIsSchedulingFollowUp(false);
      
    } catch (error) {
      console.error("Error scheduling follow-up:", error);
      toast({
        title: "Scheduling error",
        description: "There was a problem scheduling the appointment.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsCreatingAppointment(false);
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);
  
  // Function to handle approving or disapproving clinical trials
  const handleToggleTrialApproval = async (trialId: string, approved: boolean) => {
    if (!meetingId) return;
    
    try {
      await updateClinicalTrialApproval({
        meetingId: meetingId as any,
        trialId,
        approved
      });
      
      toast({
        title: approved ? "Trial approved" : "Trial approval removed",
        description: approved 
          ? "This clinical trial will be visible to the patient" 
          : "This clinical trial will not be shown to the patient",
        duration: 3000,
      });
      
    } catch (error) {
      console.error("Error updating trial approval:", error);
      toast({
        title: "Error updating trial",
        description: "There was a problem updating the trial approval status.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  // For new meetings, show a simplified interface
  if (isNewMeeting) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FBFBFD]">
        <main className="flex-grow">
          <div className="container mx-auto px-4 pb-24 pt-12">
            {/* Header Section */}
            <div className="relative flex flex-col space-y-6 pb-16">
              <div className="absolute inset-x-0 -top-24 -bottom-24 bg-gradient-to-b from-[#FBFBFD] via-white to-[#FBFBFD] opacity-80 blur-3xl -z-10" />
              <Button 
                variant="outline"
                onClick={() => navigate("/doctor/dashboard")}
              >
                Back to Dashboard
              </Button>
            </div>

            {/* New Meeting UI */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Start New Appointment</CardTitle>
                <CardDescription>
                  Record your appointment conversation to automatically generate a medical report.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex justify-center py-12">
                  <Button 
                    variant="default" 
                    className="bg-blue-600 hover:bg-blue-700 rounded-full p-8"
                    onClick={startRecording}
                  >
                    <Mic className="w-12 h-12" />
                  </Button>
                </div>
                <div className="text-center">
                  <p className="text-gray-500">Click to start recording a new appointment</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // For existing meetings with no data yet
  if (!meeting) {
    return <LoadingSpinner />;
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
                {meeting.title || "Appointment"}
              </h1>
              
              <div>
                <Button 
                  variant="outline"
                  onClick={() => navigate("/doctor/dashboard")}
                  className="mr-2"
                >
                  Back to Dashboard
                </Button>
                
                {meeting.status !== "completed" && (
                  <Button
                    onClick={shareWithPatient}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Share with Patient
                  </Button>
                )}
              </div>
            </div>
            
            <div className="flex space-x-4">
              <div className="text-gray-500">
                Patient: {meeting.patientName || "Unknown"}
              </div>
              <div className="text-gray-500">
                Date: {new Date(meeting.scheduledTime).toLocaleDateString()}
              </div>
              <div className="text-gray-500">
                Status: {meeting.status}
              </div>
              {meeting.recordingStartTime && (
                <div className="text-gray-500">
                  Recording Time: {formatTimestamp(meeting.recordingStartTime)}
                </div>
              )}
            </div>
          </div>

          {/* Tabs for different sections */}
          <Tabs defaultValue="recording" className="space-y-8">
            <TabsList className="grid grid-cols-3 w-full max-w-md">
              <TabsTrigger value="recording">Recording</TabsTrigger>
              <TabsTrigger value="report">Medical Report</TabsTrigger>
              <TabsTrigger value="trials">Clinical Trials</TabsTrigger>
            </TabsList>
            
            {/* Recording Tab */}
            <TabsContent value="recording" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Audio Recording</CardTitle>
                  <CardDescription>
                    Record your appointment conversation for transcription
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Recording Times */}
                  {meeting.recordingStartTime && !isRecording && (
                    <div className="flex justify-center items-center space-x-2 text-sm text-gray-600 mb-2">
                      <Clock className="h-4 w-4" />
                      <span>Recording started at: {formatTimestamp(meeting.recordingStartTime)}</span>
                      {meeting.recordingEndTime && (
                        <span> • Ended at: {formatTimestamp(meeting.recordingEndTime)}</span>
                      )}
                    </div>
                  )}
                  
                  {/* Live Recording Timer */}
                  {isRecording && (
                    <div className="flex flex-col items-center justify-center mb-4">
                      <div className="flex items-center justify-center text-red-600 animate-pulse">
                        <Clock className="h-5 w-5 mr-2" />
                        <div className="text-3xl font-mono font-semibold">
                          {formatTime(recordingTime)}
                        </div>
                      </div>
                      <p className="text-sm text-red-600 mt-1">Recording in progress</p>
                    </div>
                  )}
                  
                  {/* Upload Error */}
                  {uploadError && (
                    <div className="text-red-500 text-center mb-4">{uploadError}</div>
                  )}
                  
                  {/* Recording Controls */}
                  <div className="flex justify-center">
                    {isRecording ? (
                      <Button 
                        variant="destructive" 
                        className="rounded-full p-8" 
                        onClick={stopRecording}
                      >
                        <MicOff className="w-12 h-12" />
                      </Button>
                    ) : (
                      <Button 
                        variant="default" 
                        className="bg-blue-600 hover:bg-blue-700 rounded-full p-8" 
                        onClick={startRecording}
                      >
                        <Mic className="w-12 h-12" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="text-center">
                    {!isRecording && (
                      <p className="text-gray-500">Click to {meeting.audioUrl ? "re-record" : "start recording"}</p>
                    )}
                  </div>
                  
                  {/* Audio Player if recording exists */}
                  {meeting.audioUrl && !isRecording && (
                    <div className="mt-4">
                      <h3 className="text-lg font-semibold mb-2">Recording Playback</h3>
                      <audio controls className="w-full">
                        <source src={meeting.audioUrl} type="audio/webm" />
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  )}
                  
                  {/* Transcript Display */}
                  {(transcript || meeting.transcript) && (
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold mb-2">Transcript</h3>
                      <div className="bg-gray-50 p-4 rounded-md max-h-96 overflow-y-auto">
                        <p className="whitespace-pre-wrap">
                          {transcript || meeting.transcript}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Medical Report Tab */}
            <TabsContent value="report" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Medical Report</CardTitle>
                      <CardDescription>
                        AI-generated structured medical report
                      </CardDescription>
                    </div>
                    
                    {!isGeneratingReport && !isEditingReport && (
                      <Button 
                        variant="outline" 
                        onClick={() => setIsEditingReport(true)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Report
                      </Button>
                    )}
                    
                    {isEditingReport && (
                      <div className="space-x-2">
                        <Button 
                          variant="default"
                          onClick={saveReport}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Save
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => {
                            setIsEditingReport(false);
                            setReportContent(meeting.report || "");
                          }}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {isGeneratingReport ? (
                    <div className="flex flex-col items-center justify-center p-12">
                      <LoadingSpinner />
                      <p className="mt-4 text-gray-500">Generating medical report...</p>
                    </div>
                  ) : !reportContent && !meeting.report ? (
                    <div className="text-center p-12">
                      <p className="text-gray-500">No report generated yet. Record an appointment first.</p>
                    </div>
                  ) : (
                    <>
                      {isEditingReport ? (
                        <Textarea
                          value={reportContent}
                          onChange={(e) => setReportContent(e.target.value)}
                          className="min-h-[300px]"
                        />
                      ) : (
                        <>
                          <FormattedMedicalReport reportText={reportContent || meeting.report} />
                          
                          {/* Follow-up Recommendations Section */}
                          <div className="mt-8 pt-6 border-t border-gray-200">
                            <h3 className="text-lg font-semibold mb-4 flex items-center">
                              <CalendarPlus className="h-5 w-5 mr-2 text-blue-600" />
                              Follow-up Recommendations
                            </h3>
                            
                            {(() => {
                              // Get recommendations from both the report and transcript
                              const reportRecommendations = extractFollowUpRecommendations(reportContent || meeting.report || "");
                              const transcriptRecommendations = extractFollowUpFromTranscript(transcript || meeting.transcript || "");
                              
                              // Merge recommendations, removing duplicates
                              const allRecommendations = [...reportRecommendations];
                              
                              // Add transcript recommendations if they're not already included
                              for (const rec of transcriptRecommendations) {
                                const isDuplicate = allRecommendations.some(existingRec => 
                                  existingRec.text.toLowerCase().includes(rec.text.toLowerCase()) || 
                                  rec.text.toLowerCase().includes(existingRec.text.toLowerCase())
                                );
                                
                                if (!isDuplicate) {
                                  allRecommendations.push(rec);
                                }
                              }
                              
                              // Filter out dismissed recommendations
                              const filteredRecommendations = allRecommendations.filter(
                                rec => !dismissedRecommendations.some(dismissed => 
                                  dismissed === rec.text || 
                                  dismissed.includes(rec.text) || 
                                  rec.text.includes(dismissed)
                                )
                              );
                              
                              if (filteredRecommendations.length === 0) {
                                return (
                                  <p className="text-gray-500 text-sm">
                                    {allRecommendations.length > 0 ? 
                                      "All follow-up recommendations have been dismissed." : 
                                      "No follow-up recommendations detected in the report or transcript."}
                                  </p>
                                );
                              }
                              
                              return (
                                <div className="space-y-4">
                                  {filteredRecommendations.map((recommendation, index) => {
                                    // Look up the recommendation in our persistent state
                                    const persistedRecommendation = followUpRecommendations.find(rec => 
                                      rec.text === recommendation.text
                                    );
                                    
                                    // Check if this recommendation is already scheduled
                                    const isScheduled = persistedRecommendation?.scheduled && 
                                                       persistedRecommendation?.scheduledMeetingId;
                                    
                                    // Get the scheduled meeting ID if it exists
                                    const scheduledMeetingId = persistedRecommendation?.scheduledMeetingId;
                                    
                                    return (
                                      <div key={index} className="border rounded-lg p-4 bg-blue-50/50">
                                        <div className="flex items-start justify-between">
                                          <div className="space-y-1">
                                            <p className="font-medium">{recommendation.text}</p>
                                            {recommendation.date && (
                                              <p className="text-sm text-gray-600">
                                                <CalendarIcon className="inline h-4 w-4 mr-1" />
                                                Suggested date: {recommendation.date instanceof Date ? recommendation.date.toLocaleDateString() : (new Date(recommendation.date || 0)).toLocaleDateString()}
                                                {recommendation.time && ` at ${recommendation.time}`}
                                              </p>
                                            )}
                                          </div>
                                          <div className="flex space-x-2">
                                            {isScheduled ? (
                                              <Button
                                                onClick={() => navigate(`/doctor/meetings/${scheduledMeetingId}`)}
                                                className="bg-green-600 hover:bg-green-700"
                                                size="sm"
                                              >
                                                <CalendarIcon className="h-4 w-4 mr-2" />
                                                View Meeting
                                              </Button>
                                            ) : (
                                              <Button 
                                                onClick={() => handleScheduleFollowUp(recommendation, meeting.patientId, meeting.patientName, followUpRecommendations.findIndex(rec => rec.text === recommendation.text))}
                                                className="bg-blue-600 hover:bg-blue-700"
                                                size="sm"
                                              >
                                                <CalendarPlus className="h-4 w-4 mr-2" />
                                                Schedule
                                              </Button>
                                            )}
                                            <Button 
                                              variant="outline"
                                              size="sm"
                                              onClick={() => setDismissedRecommendations([...dismissedRecommendations, recommendation.text])}
                                            >
                                              <X className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </div>
                        </>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Clinical Trials Tab */}
            <TabsContent value="trials" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recommended Clinical Trials</CardTitle>
                  <CardDescription>
                    Trials matched to patient's conditions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {(meeting.clinicalTrials && meeting.clinicalTrials.length > 0) ? (
                    <div className="space-y-4">
                      {meeting.clinicalTrials.map((trial, index) => (
                        <div key={index} className="border rounded-md p-4 hover:bg-gray-50">
                          <h3 className="font-medium text-lg">{trial.title}</h3>
                          <p className="text-gray-500 mt-1">{trial.description}</p>
                          <div className="mt-2 flex justify-between items-center">
                            <div className="text-sm text-gray-500">
                              Status: <span className="font-medium text-green-600">{trial.status}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              {/* Approval Toggle Button */}
                              <Button
                                variant={trial.approved ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleToggleTrialApproval(trial.id, !trial.approved)}
                                className={trial.approved ? "bg-green-600 hover:bg-green-700" : ""}
                              >
                                {trial.approved ? (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Approved
                                  </>
                                ) : (
                                  <>
                                    <Circle className="h-4 w-4 mr-2" />
                                    Not Approved
                                  </>
                                )}
                              </Button>
                              <a 
                                href={trial.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                View Details
                              </a>
                            </div>
                          </div>
                          <div className="mt-2">
                            <span className="text-sm text-gray-500">Location: </span>
                            <span className="text-sm">{trial.location}</span>
                          </div>
                          {trial.eligibility && (
                            <div className="mt-2 text-sm">
                              <span className="text-gray-500">Eligibility: </span>
                              <span>{trial.eligibility}</span>
                            </div>
                          )}
                          {trial.approved && (
                            <div className="mt-2">
                              <span className="text-xs text-green-600 flex items-center">
                                <Check className="h-3 w-3 mr-1" /> Visible to patient
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-12">
                      <p className="text-gray-500">No clinical trials found or generated yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
      
      {/* Follow-up Scheduling Dialog */}
      <Dialog open={isSchedulingFollowUp} onOpenChange={setIsSchedulingFollowUp}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Schedule Follow-up Appointment</DialogTitle>
            <DialogDescription>
              Schedule a follow-up appointment based on the recommendation in the medical report.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Appointment Title */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="followUpTitle" className="text-right">
                Title
              </Label>
              <Input
                id="followUpTitle"
                value={followUpTitle}
                onChange={(e) => setFollowUpTitle(e.target.value)}
                className="col-span-3"
              />
            </div>
            
            {/* Patient Information (read-only) */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="patient" className="text-right">
                Patient
              </Label>
              <div className="col-span-3">
                <Input
                  id="patient"
                  value={followUpPatientName}
                  readOnly
                  className="bg-gray-50"
                />
              </div>
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
                      {followUpDate ? format(followUpDate, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={followUpDate}
                      onSelect={setFollowUpDate}
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
                  value={followUpTime}
                  onValueChange={(value) => setFollowUpTime(value)}
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
                  value={followUpDuration.toString()}
                  onValueChange={(value) => setFollowUpDuration(parseInt(value, 10))}
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
              onClick={() => setIsSchedulingFollowUp(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button 
              onClick={scheduleFollowUpAppointment}
              disabled={isCreatingAppointment || !followUpDate || !followUpPatientId}
            >
              {isCreatingAppointment ? "Scheduling..." : "Schedule Appointment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}