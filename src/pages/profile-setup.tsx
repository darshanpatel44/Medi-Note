import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useToast } from "../components/ui/use-toast";

// List of medical specializations
const SPECIALIZATIONS = [
  "Allergy and Immunology",
  "Anesthesiology",
  "Cardiology",
  "Dermatology",
  "Emergency Medicine",
  "Endocrinology",
  "Family Medicine",
  "Gastroenterology",
  "General Surgery",
  "Geriatrics",
  "Hematology",
  "Infectious Disease",
  "Internal Medicine",
  "Nephrology",
  "Neurology",
  "Neurosurgery",
  "Obstetrics and Gynecology",
  "Oncology",
  "Ophthalmology",
  "Orthopedic Surgery",
  "Otolaryngology",
  "Pathology",
  "Pediatrics",
  "Plastic Surgery",
  "Psychiatry",
  "Pulmonology",
  "Radiology",
  "Rheumatology",
  "Sports Medicine",
  "Urology",
  "Other"
];

export default function ProfileSetup() {
  const { user } = useUser();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const updateUserProfile = useMutation(api.users.updateUserProfile);
  const userStatus = useQuery(api.users.checkUserProfileStatus);
  
  // Form state
  const [role, setRole] = useState<string>("");
  const [age, setAge] = useState<string>("");
  const [sex, setSex] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [specialization, setSpecialization] = useState<string>("");
  const [licenseNumber, setLicenseNumber] = useState<string>("");
  
  // Loading state
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // If user already has a complete profile, redirect them to their dashboard
  if (userStatus?.profileComplete) {
    const dashboardRoute = userStatus.user.role === "doctor" 
      ? "/doctor/dashboard" 
      : "/patient/dashboard";
    navigate(dashboardRoute, { replace: true });
    return null;
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!role || !age || !sex || !location) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    if (role === "doctor") {
      if (!specialization) {
        toast({
          title: "Missing information",
          description: "Please select your medical specialization",
          variant: "destructive",
        });
        return;
      }
      
      if (!licenseNumber) {
        toast({
          title: "Missing information",
          description: "Please enter your license number",
          variant: "destructive",
        });
        return;
      }
    }
    
    try {
      setIsSubmitting(true);
      
      await updateUserProfile({
        role,
        age: parseInt(age),
        sex,
        location,
        specialization: role === "doctor" ? specialization : undefined,
        licenseNumber: role === "doctor" ? licenseNumber : undefined
      });
      
      // Redirect to the appropriate dashboard based on role
      const dashboardRoute = role === "doctor" ? "/doctor/dashboard" : "/patient/dashboard";
      navigate(dashboardRoute, { replace: true });
      
      toast({
        title: "Profile updated",
        description: "Your profile has been set up successfully!",
      });
    } catch (error) {
      console.error("Profile update error:", error);
      toast({
        title: "Error",
        description: "There was a problem setting up your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
          <CardDescription>
            Please provide some additional information to complete your registration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Role Selection */}
            <div className="space-y-3">
              <Label htmlFor="role">I am a:</Label>
              <RadioGroup id="role" value={role} onValueChange={setRole} className="flex flex-col space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="doctor" id="doctor" />
                  <Label htmlFor="doctor">Doctor</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="patient" id="patient" />
                  <Label htmlFor="patient">Patient</Label>
                </div>
              </RadioGroup>
            </div>
            
            {/* Doctor-specific fields */}
            {role === "doctor" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="specialization">Medical Specialization</Label>
                  <Select value={specialization} onValueChange={setSpecialization}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your specialization" />
                    </SelectTrigger>
                    <SelectContent>
                      {SPECIALIZATIONS.map((spec) => (
                        <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="licenseNumber">Medical License Number</Label>
                  <Input 
                    id="licenseNumber"
                    placeholder="Enter your medical license number"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                  />
                </div>
              </div>
            )}
            
            {/* Common fields */}
            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input 
                id="age"
                type="number" 
                min="1" 
                max="120"
                placeholder="Enter your age"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sex">Sex</Label>
              <Select value={sex} onValueChange={setSex}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your sex" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input 
                id="location"
                placeholder="City, State/Province, Country"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Complete Registration"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}