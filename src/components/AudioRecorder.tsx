import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "./ui/button";
import { Mic, Square, Loader2, Clock } from "lucide-react";
import { Id } from "../../convex/_generated/dataModel";

interface AudioRecorderProps {
  meetingId: Id<"meetings">;
  onRecordingComplete?: () => void;
}

export function AudioRecorder({
  meetingId,
  onRecordingComplete,
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  // Get current user
  const currentUser = useQuery(api.users.getCurrentUser);

  // Check if user is a doctor
  const isDoctor = currentUser?.role === "doctor";

  // Convex mutations
  const generateUploadUrl = useMutation(api.meetings.generateAudioUploadUrl);
  const confirmAudioUpload = useMutation(api.meetings.confirmAudioUpload);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === "recording"
      ) {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Format recording time as MM:SS
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  // Start recording
  const startRecording = async () => {
    try {
      setError(null);

      // Verify user is a doctor before starting
      if (!isDoctor) {
        setError("Only doctors can record consultations. Please check your account settings.");
        return;
      }
      
      audioChunksRef.current = [];

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      // Set up event handlers
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Create audio blob from chunks
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/mp3",
        });

        // Upload the audio file
        await uploadAudio(audioBlob);
      };

      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);

      // Start timer
      let seconds = 0;
      timerRef.current = window.setInterval(() => {
        seconds += 1;
        setRecordingTime(seconds);
      }, 1000);
    } catch (err) {
      console.error("Error starting recording:", err);
      setError("Could not access microphone. Please check permissions.");
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Stop all audio tracks
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream
          .getTracks()
          .forEach((track) => track.stop());
      }
    }
  };

  // Upload audio to Convex
  const uploadAudio = async (audioBlob: Blob) => {
    try {
      setIsUploading(true);

      // Get upload URL from Convex
      const { storageId } = await generateUploadUrl({ meetingId });

      // Upload the file directly to Convex storage
      const uploadResponse = await fetch(`/api/storage/upload/${storageId}`, {
        method: "POST",
        headers: {
          "Content-Type": audioBlob.type,
        },
        body: audioBlob,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }

      // Confirm the upload to start processing
      await confirmAudioUpload({ meetingId, storageId });

      // Call the completion callback if provided
      if (onRecordingComplete) {
        onRecordingComplete();
      }
    } catch (err: any) {
      console.error("Error uploading audio:", err);
      
      // Check for doctor role error
      if (err.message && err.message.includes("Only doctors can upload audio recordings")) {
        setError("Only doctors can record consultations. Please check your role settings in your profile.");
      } else {
        setError("Failed to upload recording. Please try again.");
      }
    } finally {
      setIsUploading(false);
    }
  };

  // If user data is still loading, show loading state
  if (currentUser === undefined) {
    return (
      <div className="flex flex-col items-center space-y-4 p-4 border rounded-lg bg-white">
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">Audio Recording</h3>
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-4 p-4 border rounded-lg bg-white">
      <div className="text-center">
        <h3 className="text-lg font-medium mb-2">Audio Recording</h3>
        <p className="text-sm text-gray-500">
          {isRecording
            ? "Recording in progress..."
            : isUploading
              ? "Uploading recording..."
              : !isDoctor
                ? "Only doctors can record consultations"
                : "Click to start recording the consultation"}
        </p>
      </div>

      {/* Recording timer - Always visible with appropriate styling */}
      <div className={`flex items-center justify-center ${isRecording ? 'text-red-600 animate-pulse' : 'text-gray-400'}`}>
        <Clock className="h-5 w-5 mr-2" />
        <div className="text-2xl font-mono font-semibold">
          {isRecording ? formatTime(recordingTime) : "00:00"}
        </div>
      </div>

      {/* Recording controls */}
      <div className="flex justify-center mt-2">
        {isRecording ? (
          <Button
            variant="destructive"
            size="lg"
            className="rounded-full h-16 w-16 flex items-center justify-center"
            onClick={stopRecording}
            disabled={isUploading}
          >
            <Square className="h-6 w-6" />
          </Button>
        ) : (
          <Button
            variant="default"
            size="lg"
            className="rounded-full h-16 w-16 flex items-center justify-center bg-blue-600 hover:bg-blue-700"
            onClick={startRecording}
            disabled={isUploading || !isDoctor}
          >
            {isUploading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <Mic className="h-6 w-6" />
            )}
          </Button>
        )}
      </div>

      {/* Error message */}
      {error && <div className="text-red-500 text-sm mt-2">{error}</div>}

      {/* Recording tips */}
      <div className="text-xs text-gray-500 mt-4">
        <p>Tips:</p>
        <ul className="list-disc list-inside">
          <li>Ensure you're in a quiet environment</li>
          <li>Speak clearly and at a normal pace</li>
          <li>Position the microphone properly</li>
        </ul>
      </div>
    </div>
  );
}
