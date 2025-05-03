import { useState, useRef, useEffect, useMemo } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useUser } from "@clerk/clerk-react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { LoadingSpinner } from "./loading-spinner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { MessageSquare, Send, Brain, Clock, CalendarIcon, FileTextIcon, FileIcon } from "lucide-react";
import { Badge } from "./ui/badge";

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface MedicalAIChatbotProps {
  patientId: string;
}

export function MedicalAIChatbot({ patientId }: MedicalAIChatbotProps) {
  const { user } = useUser();
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMeetings, setSelectedMeetings] = useState<Id<"meetings">[]>([]);
  const [timeRange, setTimeRange] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [viewMode, setViewMode] = useState<"filtered" | "all">("filtered");
  
  // Get all shared meetings for this patient
  const sharedMeetings = useQuery(api.meetings.getSharedMeetingsForPatient, 
    patientId ? { patientId } : "skip"
  );
  
  // Filter meetings based on selected time range
  const filteredMeetings = useMemo(() => {
    if (!sharedMeetings) return [];
    
    if (!timeRange) {
      // If no time range is selected, show all meetings
      return sharedMeetings;
    }
    
    // Calculate cutoff date based on time range (in days)
    const cutoffDate = Date.now() - (timeRange * 24 * 60 * 60 * 1000);
    
    // Return meetings that are newer than the cutoff date
    return sharedMeetings.filter(meeting => meeting.scheduledTime >= cutoffDate);
  }, [sharedMeetings, timeRange]);
  
  // Meetings to display in the UI based on view mode
  const displayedMeetings = useMemo(() => {
    return viewMode === "filtered" ? filteredMeetings : sharedMeetings || [];
  }, [viewMode, filteredMeetings, sharedMeetings]);
  
  // Add debug logs
  useEffect(() => {
    console.log("Patient ID:", patientId);
    console.log("Shared meetings data:", sharedMeetings);
    console.log("Time range:", timeRange);
    console.log("Filtered meetings:", filteredMeetings);
    console.log("View mode:", viewMode);
    console.log("Displayed meetings:", displayedMeetings);
    
    if (!sharedMeetings || sharedMeetings.length === 0) {
      console.log("No shared meetings found for patient ID:", patientId);
    } else {
      console.log("Found", sharedMeetings.length, "shared meetings for patient");
    }
  }, [patientId, sharedMeetings, timeRange, filteredMeetings, viewMode, displayedMeetings]);
  
  // On initial load, select all available meetings by default
  useEffect(() => {
    if (initialLoad && sharedMeetings?.length > 0) {
      setSelectedMeetings(sharedMeetings.map(meeting => meeting._id));
      setInitialLoad(false);
    }
  }, [sharedMeetings, initialLoad]);
  
  // Action to get AI chat response
  const getAIChatResponse = useAction(api.meetings.getAIChatResponse);
  
  // Add a welcome message when component mounts
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: 'Hello! I\'m your Medical AI Assistant. I can help answer questions about your medical records. Please select which medical records you want me to reference, then ask me a question.',
        timestamp: Date.now()
      }]);
    }
  }, [messages.length]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!question.trim() || selectedMeetings.length === 0) {
      setError("Please select at least one medical record and enter a question.");
      return;
    }
    
    setError(null);
    setIsProcessing(true);
    
    // Add user question to messages
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setQuestion("");
    
    try {
      // Log the request params for debugging
      console.log("Sending request to AI with params:", {
        patientId,
        meetingIds: selectedMeetings,
        timeRange
      });
      
      const response = await getAIChatResponse({
        patientId,
        question: question.trim(),
        meetingIds: selectedMeetings,
        timeRange: timeRange || undefined
      });
      
      // Add AI response to messages
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (err: any) {
      console.error("Error getting AI chat response:", err);
      setError(err.message || "Failed to get a response. Please try again.");
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `I'm sorry, I encountered an error: ${err.message || "Unknown error"}. Please try again or select different medical records.`,
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleMeetingToggle = (meetingId: Id<"meetings">) => {
    setSelectedMeetings(prev => {
      if (prev.some(id => id === meetingId)) {
        return prev.filter(id => id !== meetingId);
      } else {
        return [...prev, meetingId];
      }
    });
  };
  
  const handleSelectAll = () => {
    if (displayedMeetings && displayedMeetings.length > 0) {
      const currentDisplayedIds = displayedMeetings.map(meeting => meeting._id);
      const allSelected = currentDisplayedIds.every(id => selectedMeetings.includes(id));
      
      if (allSelected) {
        // Deselect all displayed meetings
        setSelectedMeetings(prev => 
          prev.filter(id => !currentDisplayedIds.includes(id))
        );
      } else {
        // Select all displayed meetings (keeping any previously selected from other filters)
        const newSelected = [...selectedMeetings];
        currentDisplayedIds.forEach(id => {
          if (!newSelected.includes(id)) {
            newSelected.push(id);
          }
        });
        setSelectedMeetings(newSelected);
      }
    }
  };
  
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };
  
  // Check if all meetings in the current display are selected
  const isAllSelected = displayedMeetings && 
    displayedMeetings.length > 0 && 
    displayedMeetings.every(meeting => selectedMeetings.includes(meeting._id));
  
  if (!sharedMeetings) {
    return <LoadingSpinner size="default" />;
  }

  // Count how many meetings are showing vs total available
  const displayedMeetingsCount = displayedMeetings.length;
  const totalMeetingsCount = sharedMeetings ? sharedMeetings.length : 0;
  const selectedCount = selectedMeetings.length;
  
  return (
    <div className="flex flex-col h-full">
      {/* Context Selection Panel */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-lg">Select Medical Records Context</CardTitle>
          <CardDescription>
            Choose which medical records you want the AI to reference when answering your questions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Time Range Filter */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-medium">Filter by time range:</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === "filtered" ? "all" : "filtered")}
                className="text-xs h-8"
              >
                {viewMode === "filtered" ? "Show All Records" : "Show Filtered Records"}
              </Button>
            </div>
            <RadioGroup 
              value={timeRange?.toString() || "all"} 
              onValueChange={(value) => {
                setTimeRange(value === "all" ? null : Number(value));
                // Switch to filtered view when selecting a time range
                if (value !== "all") {
                  setViewMode("filtered");
                }
              }}
              className="flex flex-wrap gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all">All time</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="30" id="30days" />
                <Label htmlFor="30days">Last 30 days</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="90" id="90days" />
                <Label htmlFor="90days">Last 90 days</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="365" id="year" />
                <Label htmlFor="year">Last year</Label>
              </div>
            </RadioGroup>
          </div>
          
          {/* Meeting Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium">
                Medical Records: 
                <span className="text-gray-500 ml-1 text-xs">
                  (Selected {selectedCount} of {displayedMeetingsCount} shown / {totalMeetingsCount} total)
                </span>
              </h4>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSelectAll}
                className="text-xs"
                disabled={displayedMeetings.length === 0}
              >
                {isAllSelected ? "Deselect All" : "Select All"}
              </Button>
            </div>
            
            {viewMode === "filtered" && filteredMeetings.length === 0 && totalMeetingsCount > 0 && (
              <div className="text-amber-500 bg-amber-50 p-2 rounded-md text-sm mb-2">
                <p>No records found in the selected time range. <Button variant="link" className="p-0 h-auto" onClick={() => setViewMode("all")}>Show all records</Button></p>
              </div>
            )}
            
            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
              {displayedMeetings.length > 0 ? (
                displayedMeetings.map((meeting) => (
                  <div key={meeting._id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                    <Checkbox 
                      checked={selectedMeetings.includes(meeting._id)} 
                      id={meeting._id.toString()}
                      onCheckedChange={() => handleMeetingToggle(meeting._id)}
                    />
                    <Label htmlFor={meeting._id.toString()} className="flex-1 cursor-pointer">
                      <div className="font-medium">{meeting.title || "Appointment"}</div>
                      <div className="text-xs text-gray-500 flex items-center">
                        <CalendarIcon className="h-3 w-3 mr-1" />
                        {new Date(meeting.scheduledTime).toLocaleDateString()} - Dr. {meeting.doctorName}
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <div className="flex items-center">
                          <FileIcon className="h-3 w-3 mr-1" />
                          {meeting.report ? (
                            <Badge className="text-xs" variant="success">Report Available</Badge>
                          ) : (
                            <Badge className="text-xs" variant="outline">No Report</Badge>
                          )}
                        </div>
                        
                        {meeting.transcript && (
                          <Badge className="text-xs ml-2" variant="secondary">Transcript Available</Badge>
                        )}
                      </div>
                    </Label>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">
                  {sharedMeetings && sharedMeetings.length > 0 
                    ? "No medical records found in the selected time range" 
                    : "No shared medical records available. Ask your doctor to share your medical reports with you."}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Chat Messages Area */}
      <div className="flex-1 mb-4 overflow-y-auto bg-white border rounded-md p-4 min-h-[300px] max-h-[500px]">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[80%] p-3 rounded-lg ${
                  msg.role === 'user' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex items-center mb-1">
                    <Brain className="w-4 h-4 mr-1" />
                    <span className="text-xs font-medium">Medical AI</span>
                  </div>
                )}
                <div className="whitespace-pre-wrap">{msg.content}</div>
                <div className="text-xs opacity-70 mt-1 text-right">
                  {formatDate(msg.timestamp)}
                </div>
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-800 p-3 rounded-lg max-w-[80%]">
                <div className="flex items-center space-x-2">
                  <LoadingSpinner size="sm" />
                  <span>Analyzing your medical records...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Input Form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        {error && (
          <div className="text-red-500 text-sm p-2 bg-red-50 rounded">
            {error}
          </div>
        )}
        
        <div className="flex space-x-2">
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about your medical records..."
            className="flex-1"
            rows={2}
            disabled={isProcessing || !sharedMeetings?.length || selectedMeetings.length === 0}
          />
          <Button 
            type="submit" 
            className={`self-end ${isProcessing ? 'opacity-50' : ''}`}
            disabled={isProcessing || !question.trim() || selectedMeetings.length === 0}
          >
            {isProcessing ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send
              </>
            )}
          </Button>
        </div>
        
        <div className="text-xs text-gray-500">
          <p>Note: This AI assistant can only reference information from your selected medical records.</p>
        </div>
      </form>
    </div>
  );
}