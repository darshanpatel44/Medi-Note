import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { SignInButton, useUser } from "@clerk/clerk-react";
import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  ArrowRight,
  Mic,
  FileText,
  FlaskConical,
  Calendar,
  Shield,
  Brain,
  ChevronRight,
  MessageSquare,
} from "lucide-react";
import { useNavigate, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const FEATURES = [
  {
    icon: <Mic className="h-6 w-6 text-blue-600" />,
    title: "Audio Recording",
    description:
      "Easily record patient appointments with high-quality audio capture",
  },
  {
    icon: <FileText className="h-6 w-6 text-blue-600" />,
    title: "AI Transcription",
    description: "Real-time transcription powered by OpenAI Whisper technology",
  },
  {
    icon: <FlaskConical className="h-6 w-6 text-blue-600" />,
    title: "Clinical Trials",
    description: "Automatically match patients with relevant clinical trials",
  },
  {
    icon: <Brain className="h-6 w-6 text-blue-600" />,
    title: "Medical AI Chatbot",
    description: "Interactive AI assistant for understanding medical records",
  },
] as const;

// Sample AI chatbot conversation for demo purposes
const SAMPLE_CHAT = [
  {
    role: "assistant",
    content: "Hello! I'm your Medical AI Assistant. How can I help you understand your medical records today?",
  },
  {
    role: "user",
    content: "Can you explain what my cholesterol levels mean from my last appointment?"
  },
  {
    role: "assistant",
    content: "Based on your last appointment on April 10, 2025, your total cholesterol was 195 mg/dL, which is within the desirable range (below 200 mg/dL). Your HDL or 'good' cholesterol was 58 mg/dL, which is considered good (above 40 mg/dL for men and above 50 mg/dL for women). Your LDL or 'bad' cholesterol was 120 mg/dL, which is borderline (optimal is below 100 mg/dL). Your doctor recommended dietary changes to improve your LDL levels."
  },
  {
    role: "user",
    content: "What dietary changes were suggested?"
  },
  {
    role: "assistant",
    content: "According to your appointment notes, Dr. Williams suggested reducing saturated fat intake by limiting red meat and full-fat dairy, increasing soluble fiber (oats, beans, fruits), adding more omega-3 rich foods like salmon and walnuts, and exercising at least 30 minutes daily. They also mentioned scheduling a follow-up in 3 months to reassess your cholesterol levels after these dietary changes."
  }
];

const TESTIMONIALS = [];

// Sample AI chatbot conversation for demo purposes

function App() {
  const { user, isLoaded: isUserLoaded } = useUser();
  const navigate = useNavigate();
  
  // Query user profile status
  const userProfileStatus = useQuery(api.users.checkUserProfileStatus);
  
  // Handle redirects for authenticated users
  if (isUserLoaded && user && userProfileStatus?.profileComplete) {
    if (userProfileStatus.user.role === "doctor") {
      return <Navigate to="/doctor/home" replace />;
    } else if (userProfileStatus.user.role === "patient") {
      return <Navigate to="/patient/home" replace />;
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <Navbar />
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-24">
          {/* Hero Section */}
          <div className="relative flex flex-col items-center text-center space-y-6 pb-24">
            <div className="absolute inset-x-0 -top-24 -bottom-24 bg-gradient-to-b from-[#F8FAFC] via-white to-[#F8FAFC] opacity-80 blur-3xl -z-10" />
            <div className="inline-flex items-center gap-2 rounded-[20px] bg-blue-100 px-4 py-2">
              <Mic className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-600">
                Medical Transcription
              </span>
            </div>
            <h1 className="text-6xl font-semibold text-[#1D1D1F] tracking-tight max-w-[800px] leading-[1.1]">
              MediNote
            </h1>
            <p className="text-xl text-[#64748B] max-w-[600px] leading-relaxed">
              Streamline your medical practice with AI-powered transcription,
              structured reports, and clinical trial matching.
            </p>

            {!isUserLoaded ? (
              <div className="flex gap-4">
                <div className="px-8 py-3 w-[145px] h-[38px] rounded-[14px] bg-gray-200 animate-pulse"></div>
              </div>
            ) : (
              <div className="flex items-center gap-5 pt-4">
                <Unauthenticated>
                  <SignInButton mode="modal" signUpFallbackRedirectUrl="/">
                    <Button className="h-12 px-8 text-base rounded-[14px] bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all">
                      Get Started
                    </Button>
                  </SignInButton>
                </Unauthenticated>
                <Authenticated>
                  <Button
                    className="h-12 px-8 text-base rounded-[14px] bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
                    onClick={() => {
                      if (userProfileStatus?.user?.role === "doctor") {
                        navigate("/doctor/home");
                      } else if (userProfileStatus?.user?.role === "patient") {
                        navigate("/patient/home");
                      } else {
                        navigate("/dashboard");
                      }
                    }}
                  >
                    Go to Dashboard
                  </Button>
                </Authenticated>
              </div>
            )}
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 py-24">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-[20px] bg-white p-6 transition-all hover:scale-[1.02] hover:shadow-lg border border-gray-100"
              >
                <div className="mb-4 p-3 bg-blue-50 rounded-full inline-block">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-[#1D1D1F] mb-2">
                  {feature.title}
                </h3>
                <p className="text-base text-[#64748B] leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* How It Works Section */}
          <div className="py-24">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-semibold text-[#1D1D1F] mb-3">
                How MediNote Works
              </h2>
              <p className="text-xl text-[#64748B]">
                Simplifying the medical documentation process
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-[20px] border border-gray-100 shadow-sm">
                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                  <span className="text-xl font-bold text-blue-600">1</span>
                </div>
                <h3 className="text-xl font-semibold mb-3">
                  Record Appointment
                </h3>
                <p className="text-[#64748B]">
                  Start recording your patient appointment with a single click.
                  Our system captures high-quality audio for accurate
                  transcription.
                </p>
              </div>

              <div className="bg-white p-8 rounded-[20px] border border-gray-100 shadow-sm">
                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                  <span className="text-xl font-bold text-blue-600">2</span>
                </div>
                <h3 className="text-xl font-semibold mb-3">AI Transcription</h3>
                <p className="text-[#64748B]">
                  Our AI automatically transcribes the conversation and
                  structures it into a comprehensive medical report with key
                  findings highlighted.
                </p>
              </div>

              <div className="bg-white p-8 rounded-[20px] border border-gray-100 shadow-sm">
                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                  <span className="text-xl font-bold text-blue-600">3</span>
                </div>
                <h3 className="text-xl font-semibold mb-3">
                  Share & Collaborate
                </h3>
                <p className="text-[#64748B]">
                  Share reports with patients and suggest relevant clinical
                  trials based on the appointment data, all within a secure
                  HIPAA-compliant platform.
                </p>
              </div>
            </div>
          </div>

          {/* AI Chatbot Section */}
          <div className="py-24">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 rounded-[20px] bg-blue-100 px-4 py-2 mb-4">
                <Brain className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-600">
                  NEW FEATURE
                </span>
              </div>
              <h2 className="text-3xl font-semibold text-[#1D1D1F] mb-3">
                AI Medical Assistant
              </h2>
              <p className="text-xl text-[#64748B] max-w-2xl mx-auto">
                Your personal medical AI chatbot that helps you understand your medical records and reports
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-2xl font-semibold mb-6">Understand Your Medical Records</h3>
                <div className="space-y-4 mb-8">
                  <div className="flex items-start">
                    <div className="mt-1 mr-4 flex-shrink-0 h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center">
                      <ChevronRight className="h-4 w-4 text-blue-600" />
                    </div>
                    <p className="text-[#64748B]">
                      <span className="font-medium text-[#1D1D1F]">Select context from your shared medical records</span> - Choose which appointments and reports the AI can access to answer your questions.
                    </p>
                  </div>
                  <div className="flex items-start">
                    <div className="mt-1 mr-4 flex-shrink-0 h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center">
                      <ChevronRight className="h-4 w-4 text-blue-600" />
                    </div>
                    <p className="text-[#64748B]">
                      <span className="font-medium text-[#1D1D1F]">Filter by time range</span> - Focus on recent appointments or include your complete medical history.
                    </p>
                  </div>
                  <div className="flex items-start">
                    <div className="mt-1 mr-4 flex-shrink-0 h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center">
                      <ChevronRight className="h-4 w-4 text-blue-600" />
                    </div>
                    <p className="text-[#64748B]">
                      <span className="font-medium text-[#1D1D1F]">Ask questions in plain language</span> - Get clear explanations about your diagnoses, medications, and treatment plans.
                    </p>
                  </div>
                </div>
                <Button
                  className="h-12 px-8 text-base rounded-[14px] bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
                  onClick={() => navigate("/dashboard")}
                >
                  Try AI Assistant <Brain className="ml-2 h-5 w-5" />
                </Button>
              </div>
              
              <div className="bg-white rounded-[20px] shadow-lg border border-gray-100 p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Brain className="h-5 w-5 text-blue-600" />
                  <h3 className="font-medium">Medical AI Assistant</h3>
                </div>
                
                <div className="h-[450px] border rounded-lg p-4 bg-gray-50 overflow-y-auto flex flex-col space-y-4">
                  {SAMPLE_CHAT.map((message, index) => (
                    <div 
                      key={index} 
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-[80%] p-3 rounded-lg ${
                          message.role === 'user' 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-white text-gray-800 border border-gray-200'
                        }`}
                      >
                        {message.role === 'assistant' && (
                          <div className="flex items-center mb-1">
                            <Brain className="w-4 h-4 mr-1" />
                            <span className="text-xs font-medium">Medical AI</span>
                          </div>
                        )}
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 flex items-center">
                  <div className="flex-1 bg-white border rounded-lg px-4 py-2 text-gray-400">
                    Ask a question about your medical records...
                  </div>
                  <Button size="sm" className="ml-2 bg-blue-600">
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Testimonials Section */}
          <div className="py-24">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-semibold text-[#1D1D1F] mb-3">
                Trusted by Medical Professionals
              </h2>
              <p className="text-xl text-[#64748B]">
                See how MediNote is transforming medical practices.
              </p>
            </div>
            <div className="space-y-24">
              {TESTIMONIALS.map((testimonial, index) => (
                <div
                  key={index}
                  className={`flex flex-col md:flex-row items-center gap-16 ${index % 2 === 1 ? "md:flex-row-reverse" : ""}`}
                >
                  <div className="flex-1">
                    <div className="max-w-xl">
                      <p className="text-[32px] font-medium text-[#1D1D1F] mb-8 leading-tight">
                        {testimonial.content}
                      </p>
                      <div className="space-y-1">
                        <div className="text-xl font-semibold text-[#1D1D1F]">
                          {testimonial.author}
                        </div>
                        <div className="text-lg text-[#64748B]">
                          {testimonial.role} at {testimonial.company}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 mt-8 md:mt-0">
                    <div className="relative aspect-[4/3] rounded-[32px] overflow-hidden bg-[#F5F5F7]">
                      <img
                        src={testimonial.image}
                        alt={`${testimonial.author}'s workspace`}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-black/10" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dashboard Preview Section */}
          <div className="py-24 bg-white rounded-[32px] p-12">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-semibold text-[#1D1D1F] mb-3">
                Powerful Dashboards
              </h2>
              <p className="text-xl text-[#64748B] max-w-2xl mx-auto">
                Separate interfaces for doctors and patients, providing the
                right information to the right people.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="bg-[#F8FAFC] p-6 rounded-[20px] border border-gray-100">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                  Doctor Dashboard
                </h3>
                <ul className="space-y-3 text-[#64748B]">
                  <li className="flex items-center">
                    <div className="h-2 w-2 rounded-full bg-blue-600 mr-2"></div>
                    Appointment calendar with patient history
                  </li>
                  <li className="flex items-center">
                    <div className="h-2 w-2 rounded-full bg-blue-600 mr-2"></div>
                    One-click recording and transcription
                  </li>
                  <li className="flex items-center">
                    <div className="h-2 w-2 rounded-full bg-blue-600 mr-2"></div>
                    Clinical trial matching engine
                  </li>
                </ul>
                <div className="mt-6 bg-gray-800 rounded-lg p-4 aspect-video">
                  <div className="w-full h-full bg-gray-700 rounded flex items-center justify-center text-white opacity-60">
                    Doctor Dashboard Preview
                  </div>
                </div>
              </div>

              <div className="bg-[#F8FAFC] p-6 rounded-[20px] border border-gray-100">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-blue-600" />
                  Patient Portal
                </h3>
                <ul className="space-y-3 text-[#64748B]">
                  <li className="flex items-center">
                    <div className="h-2 w-2 rounded-full bg-blue-600 mr-2"></div>
                    Access to appointment transcripts
                  </li>
                  <li className="flex items-center">
                    <div className="h-2 w-2 rounded-full bg-blue-600 mr-2"></div>
                    Structured medical reports
                  </li>
                  <li className="flex items-center">
                    <div className="h-2 w-2 rounded-full bg-blue-600 mr-2"></div>
                    Clinical trial recommendations
                  </li>
                  <li className="flex items-center">
                    <div className="h-2 w-2 rounded-full bg-blue-600 mr-2"></div>
                    Secure messaging with doctors
                  </li>
                </ul>
                <div className="mt-6 bg-gray-800 rounded-lg p-4 aspect-video">
                  <div className="w-full h-full bg-gray-700 rounded flex items-center justify-center text-white opacity-60">
                    Patient Portal Preview
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="py-24">
            <div className="rounded-[32px] bg-gradient-to-b from-blue-600 to-blue-700 p-16 text-center text-white">
              <h2 className="text-4xl font-semibold mb-4">
                Ready to transform your practice?
              </h2>
              <p className="text-xl mb-8 text-white/90">
                Join thousands of medical professionals using MediNote to
                streamline their workflow.
              </p>
              <div className="flex flex-col md:flex-row items-center justify-center gap-5">
                <Button
                  variant="default"
                  className="h-12 px-8 text-base rounded-[14px] bg-white text-blue-600 hover:bg-white/90 transition-all"
                  onClick={() => navigate("/dashboard")}
                >
                  Get Started
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default App;
