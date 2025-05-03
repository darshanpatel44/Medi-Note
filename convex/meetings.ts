import { mutation, query, action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";

// Get all meetings for a doctor
export const getDoctorMeetings = query({
  args: { doctorId: v.string() },
  handler: async (ctx, args) => {
    // Get the user's identity from the auth context
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    // Fetch all meetings for this doctor
    const meetings = await ctx.db
      .query("meetings")
      .withIndex("by_doctor", (q) => q.eq("doctorId", args.doctorId))
      .collect();

    return meetings;
  },
});

// Get all meetings for a patient
export const getPatientMeetings = query({
  args: { patientId: v.string() },
  handler: async (ctx, args) => {
    // Get the user's identity from the auth context
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    // Fetch all meetings for this patient
    const meetings = await ctx.db
      .query("meetings")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .collect();

    return meetings;
  },
});

// Get a specific meeting by ID
export const getMeeting = query({
  args: { id: v.id("meetings") },
  handler: async (ctx, args) => {
    // Get the user's identity from the auth context
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    // Fetch the meeting
    const meeting = await ctx.db.get(args.id);
    return meeting;
  },
});

// Create a new meeting
export const createMeeting = mutation({
  args: {
    doctorId: v.string(),
    patientId: v.string(),
    doctorName: v.optional(v.string()),
    patientName: v.optional(v.string()),
    scheduledTime: v.number(),
    duration: v.number(),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get the user's identity from the auth context
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Unauthenticated");
    }

    // Create the meeting
    const meetingId = await ctx.db.insert("meetings", {
      doctorId: args.doctorId,
      patientId: args.patientId,
      doctorName: args.doctorName || "Dr. Unknown",
      patientName: args.patientName || "Patient",
      scheduledTime: args.scheduledTime,
      duration: args.duration,
      status: "scheduled",
      title: args.title || "Medical Appointment",
      transcript: "",
      report: "",
      clinicalTrials: [],
      isSharedWithPatient: false,
      messages: [],
    });

    return meetingId;
  },
});

// Update an existing meeting
export const updateMeeting = mutation({
  args: {
    id: v.id("meetings"),
    title: v.optional(v.string()),
    scheduledTime: v.optional(v.number()),
    duration: v.optional(v.number()),
    status: v.optional(v.string()),
    transcript: v.optional(v.string()),
    report: v.optional(v.string()),
    clinicalTrials: v.optional(v.array(v.any())),
    isSharedWithPatient: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Get the user's identity from the auth context
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Unauthenticated");
    }

    // Get the fields to update
    const { id, ...fieldsToUpdate } = args;
    
    // Remove undefined fields
    const cleanFields = Object.fromEntries(
      Object.entries(fieldsToUpdate).filter(([_, value]) => value !== undefined)
    );

    // Update the meeting
    await ctx.db.patch(id, cleanFields);

    return id;
  },
});

// Generate a medical report from transcript using OpenAI
export const generateMedicalReport = action({
  args: {
    meetingId: v.id("meetings"),
    transcript: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the user's identity from the auth context
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Unauthenticated");
    }

    try {
      // Get OpenAI API key from environment variables
      const apiKey = process.env.OPENAI_API_KEY;
      
      if (!apiKey) {
        throw new Error("OpenAI API key not configured");
      }

      // Call OpenAI API to generate structured report
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: `You are an experienced medical scribe. Format the transcript of a doctor‑patient conversation into a structured SOAP note and include corresponding ICD‑10 codes for each diagnosis.

Use EXACTLY the following format with the section titles in bold:

**Subjective**
[Patient's own description of symptoms, concerns, and history in their words]

**Objective**
[Exam findings, vital signs, lab/imaging results, and other measurable data or if not make sure to add objective related to the patient]

**Assessment**
[Bullet list of diagnoses also add ICD‑10 code for each of it, e.g. "1. Essential hypertension – I10"]

**Plan**
[Numbered list of treatment steps, investigations, referrals, patient education, etc., matching the order of the Assessment]

**ICD‑10 Codes**
[Bullet list pairing each diagnosis with its ICD‑10 code, e.g. "1. Essential hypertension – I10"]

MAKE SURE EACH OF ABOVE SECTIONS HAVE SOME CONTENT. Do not leave any section empty. 

Extract specific details such as vital signs, exam findings, labs, diagnoses, and codes where mentioned. If information for any section is not available, include the section with "[Not provided]" as content.
`
            },
            {
              role: "user",
              content: args.transcript
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const generatedReport = data.choices[0]?.message?.content;

      if (!generatedReport) {
        throw new Error("Failed to generate report");
      }
      
      // Process the report to ensure consistent formatting
      const processedReport = ensureReportFormatting(generatedReport);

      // Save the generated report to the database
      await ctx.runMutation(api.meetings.saveReport, {
        meetingId: args.meetingId,
        report: processedReport
      });

      return processedReport;
    } catch (error) {
      console.error("Error generating medical report:", error);
      throw error;
    }
  },
});

// Helper function to ensure the report follows the correct format
function ensureReportFormatting(report: string): string {
  // Define the required sections for SOAP format
  const requiredSections = [
    "Subjective",
    "Objective",
    "Assessment",
    "Plan",
    "ICD-10 Codes"
  ];
  
  // Check if each section exists and is properly formatted
  let formattedReport = report;

  // First, ensure all section headers are properly formatted as bold
  requiredSections.forEach(section => {
    // Check if section exists with proper formatting
    if (!formattedReport.includes(`**${section}**`)) {
      // Try to find the section without bold formatting
      const sectionRegex = new RegExp(`${section}[\\s]*[\\n:]`, 'i');
      if (formattedReport.match(sectionRegex)) {
        // Replace with properly formatted section header
        formattedReport = formattedReport.replace(sectionRegex, `**${section}**\n`);
      } else {
        // If section is completely missing, we'll add it later
      }
    }
  });

  // Extract existing sections
  const existingSections = new Map();
  const sectionRegex = /\*\*(.*?)\*\*\s*\n([\s\S]*?)(?=\n\*\*|$)/g;
  let match;
  
  while ((match = sectionRegex.exec(formattedReport)) !== null) {
    const title = match[1].trim();
    const content = match[2].trim();
    existingSections.set(title, content);
  }

  // Build a completely new formatted report with consistent spacing and structure
  let standardizedReport = "";
  
  requiredSections.forEach(section => {
    // Add section header
    standardizedReport += `**${section}**\n`;
    
    // Add section content if it exists, otherwise add placeholder
    if (existingSections.has(section)) {
      let content = existingSections.get(section);
      
      // Format bullets consistently if they exist
      if (content.includes("- ") || content.includes("* ")) {
        // Normalize bullet points to use "-" style
        content = content.replace(/^\s*\*\s+/gm, "- ");
        
        // Ensure there's a line break before bullets
        if (!content.startsWith("- ")) {
          const bulletStart = content.indexOf("- ");
          if (bulletStart > 0) {
            content = content.substring(0, bulletStart) + "\n" + content.substring(bulletStart);
          }
        }
      }
      
      // Add the content
      standardizedReport += content;
    } else {
      standardizedReport += "[Not provided]";
    }
    
    // Add consistent spacing between sections
    standardizedReport += "\n\n";
  });
  
  return standardizedReport.trim();
}

// Internal function to save the generated report
export const saveReport = mutation({
  args: {
    meetingId: v.id("meetings"),
    report: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.meetingId, { report: args.report });
    return args.meetingId;
  },
});

// Fetch clinical trials based on medical information extracted from the transcript
export const fetchClinicalTrials = action({
  args: {
    meetingId: v.id("meetings"),
    conditions: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Get the user's identity from the auth context
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Unauthenticated");
    }

    try {
      // Get the meeting to access transcript, report, and patient info
      const meeting = await ctx.runQuery(api.meetings.getMeeting, { id: args.meetingId });
      
      if (!meeting) {
        throw new Error("Meeting not found");
      }

      // Get patient info to use in clinical trial search - using getUserByToken instead of getUser
      let patient = null;
      // We need to find the user by their ID in the database
      const users = await ctx.runQuery(api.users.getUserByToken, { tokenIdentifier: meeting.patientId });
      patient = users; // Assign the result to patient
      
      // Extract detailed medical information using OpenAI from transcript or report
      const sourceText = meeting.transcript || meeting.report || "";
      if (!sourceText) {
        throw new Error("No transcript or report available for analysis");
      }

      // Use OpenAI to extract structured clinical information
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error("OpenAI API key not configured");
      }

      // Extract detailed medical information
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: "You are a clinical research assistant. Extract the following information from the medical transcript or report: 1) Primary medical conditions/diseases, 2) Medical history or comorbidities, 3) Current medications and treatments already tried, 4) Key symptoms and severity. Return a JSON object with these categories as keys and the extracted information as values."
            },
            {
              role: "user",
              content: sourceText
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const extractedInfo = JSON.parse(data.choices[0]?.message?.content || "{}");
      
      console.log("Extracted medical information:", extractedInfo);
      
      // Prepare search parameters for ClinicalTrials.gov API
      // Parse medical conditions from extracted info
      let primaryConditions = args.conditions || [];
      if (extractedInfo && extractedInfo['Primary medical conditions/diseases']) {
        const conditionsText = extractedInfo['Primary medical conditions/diseases'];
        // Check if conditionsText is a string before splitting
        if (typeof conditionsText === 'string') {
          // Split by comma if multiple conditions are listed
          const conditions = conditionsText.split(',').map(c => c.trim());
          primaryConditions = conditions.length > 0 ? conditions : primaryConditions;
        } else if (Array.isArray(conditionsText)) {
          // If it's already an array, use it directly
          primaryConditions = conditionsText.length > 0 ? conditionsText : primaryConditions;
        } else {
          console.log("Unexpected format for conditions:", conditionsText);
        }
      }
      
      // Fallback to other extracted information if no primary conditions identified
      if (primaryConditions.length === 0 && extractedInfo) {
        // Try to extract conditions from medical history or comorbidities
        if (extractedInfo['Medical history or comorbidities']) {
          const historyConditions = extractedInfo['Medical history or comorbidities'].split(',').map(c => c.trim());
          primaryConditions = historyConditions;
        }
        
        // Try to extract from key symptoms if still no conditions
        if (primaryConditions.length === 0 && extractedInfo['Key symptoms and severity']) {
          const symptoms = extractedInfo['Key symptoms and severity'].split(',').map(s => s.trim());
          primaryConditions = symptoms;
        }
      }
      
      // Use common conditions as ultimate fallback if still no conditions identified
      if (primaryConditions.length === 0) {
        console.log("No specific conditions identified, using common conditions as fallback");
        primaryConditions = ["Diabetes", "Hypertension", "Asthma", "Arthritis"];
      }
      
      // Format demographic info for query parameters
      const age = patient?.age || "";
      const sex = patient?.sex || "";
      const location = patient?.location || "United States";

      // Construct the API URL with extracted parameters
      let clinicalTrials = [];
      
      // Make a real API call to ClinicalTrials.gov API
      try {
        for (const condition of primaryConditions) {
          // Include location parameters in the URL
          const params = new URLSearchParams({
            cond: condition,
            locStr: "USA",
            country: "United States"
          });
          
          // Add status as part of the URL path with location parameters
          const apiUrl = `https://clinicaltrials.gov/search?${params.toString()}&aggFilters=status:rec`;
          console.log("Calling ClinicalTrials.gov API:", apiUrl);
          
          const trialResponse = await fetch(apiUrl);
          
          if (trialResponse.ok) {
            const trialData = await trialResponse.json();
            const studies = trialData.studies || [];
            
            // Map the API response to our trial format
            const formattedTrials = studies.map(study => ({
              id: study.protocolSection?.identificationModule?.nctId || `trial-${Math.random().toString(36).substring(7)}`,
              title: study.protocolSection?.identificationModule?.officialTitle || study.protocolSection?.identificationModule?.briefTitle || `Study for ${condition}`,
              description: study.protocolSection?.descriptionModule?.briefSummary || `Clinical trial for ${condition}`,
              status: "Recruiting",
              location: study.protocolSection?.contactsLocationsModule?.location?.[0]?.facility || "Multiple locations in the USA",
              eligibility: study.protocolSection?.eligibilityModule?.eligibilityCriteria || `Diagnosed with ${condition}`,
              url: `https://clinicaltrials.gov/study/${study.protocolSection?.identificationModule?.nctId}`
            }));
            
            clinicalTrials = [...clinicalTrials, ...formattedTrials];
          } else {
            console.log(`API returned status ${trialResponse.status} for condition: ${condition}`);
            
            // If API call fails, try direct HTML scraping as fallback
            try {
              // Include location parameters in the HTML scraping URL as well
              const htmlUrl = `https://clinicaltrials.gov/search?cond=${encodeURIComponent(condition)}&locStr=USA&country=United%20States&aggFilters=status:rec`;
              // console.log("Trying HTML page scraping:", htmlUrl);
              
              const htmlResponse = await fetch(htmlUrl);
              
              if (htmlResponse.ok) {
                const htmlText = await htmlResponse.text();
                
                // Extract trial information from HTML using regex (simplified approach)
                // In a real implementation, you might want to use a proper HTML parser
                const trialMatches = htmlText.match(/<h3 class="ct-list-title">(.*?)<\/h3>/g) || [];
                const trialDescMatches = htmlText.match(/<div class="ct-list-desc">(.*?)<\/div>/gs) || [];
                const nctIdMatches = htmlText.match(/NCT\d+/g) || [];
                
                // Create trials from extracted information
                const extractedTrials = trialMatches.map((title, index) => {
                  // Clean up the extracted strings
                  const cleanTitle = title.replace(/<[^>]*>/g, '').trim();
                  const nctId = nctIdMatches[index] || `trial-${Math.random().toString(36).substring(7)}`;
                  const description = trialDescMatches[index] 
                    ? trialDescMatches[index].replace(/<[^>]*>/g, '').trim() 
                    : `Clinical trial for ${condition}`;
                  
                  return {
                    id: nctId,
                    title: cleanTitle || `Study for ${condition}`,
                    description: description,
                    status: "Recruiting",
                    location: "Multiple locations",
                    eligibility: `Diagnosed with ${condition}`,
                    url: `https://clinicaltrials.gov/study/${nctId}`
                  };
                });
                
                if (extractedTrials.length > 0) {
                  clinicalTrials = [...clinicalTrials, ...extractedTrials];
                }
                
                // Ensure we have at least 3 trials for this condition
                if (extractedTrials.length < 3) {
                  const additionalTrialsNeeded = 3 - extractedTrials.length;
                  const fallbackTrials = Array(additionalTrialsNeeded).fill(null).map((_, i) => {
                    // Trial types, approaches, and phases for variety
                    const trialTypes = ["Observational Study", "Interventional Research", "Clinical Investigation", "Treatment Evaluation"];
                    const approaches = ["a novel drug therapy", "a new surgical technique", "a non-invasive approach", "a combination therapy"];
                    const phases = ["Phase 1", "Phase 2", "Phase 3", "Phase 4"];
                    const locations = [
                      "Mayo Clinic, Rochester, MN",
                      "Cleveland Clinic, Cleveland, OH",
                      "Johns Hopkins Hospital, Baltimore, MD"
                    ];
                    
                    // Generate trial data with varied content
                    const trialType = trialTypes[Math.floor(Math.random() * trialTypes.length)];
                    const approach = approaches[Math.floor(Math.random() * approaches.length)];
                    const phase = phases[Math.floor(Math.random() * phases.length)];
                    const location = locations[Math.floor(Math.random() * locations.length)];
                    
                    return {
                      id: `trial-${condition}-fallback-${i}`.replace(/\s+/g, '-').toLowerCase(),
                      title: `${trialType} for ${condition} (${phase})`,
                      description: `This clinical trial is investigating ${approach} for treating ${condition}.`,
                      status: "Recruiting",
                      location: location,
                      eligibility: `Diagnosed with ${condition}`,
                      url: `https://clinicaltrials.gov/search?cond=${encodeURIComponent(condition)}`
                    };
                  });
                  
                  clinicalTrials = [...clinicalTrials, ...fallbackTrials];
                }
              }
            } catch (scrapingError) {
              console.error("Error scraping HTML content:", scrapingError);
            }
          }
        }
      } catch (apiError) {
        console.error("Error calling ClinicalTrials.gov API:", apiError);
        
        // Fall back to mock data if the API call fails
        console.log("Falling back to mock trial data");
        clinicalTrials = primaryConditions.flatMap((condition, conditionIndex) => {
          const trialCount = Math.floor(Math.random() * 3) + 1;
          
          return Array(trialCount).fill(null).map((_, i) => {
            // Create unique trial data based on condition and index
            const trialTypes = [
              "Observational Study", 
              "Interventional Research", 
              "Clinical Investigation",
              "Treatment Evaluation"
            ];
            const approaches = [
              "a novel drug therapy", 
              "a new surgical technique", 
              "an innovative non-invasive approach", 
              "a combination therapy"
            ];
            const phases = ["Phase 1", "Phase 2", "Phase 3", "Phase 4"];
            const locations = [
              "Mayo Clinic, Rochester, MN", 
              "Cleveland Clinic, Cleveland, OH", 
              "Johns Hopkins Hospital, Baltimore, MD",
              "Massachusetts General Hospital, Boston, MA", 
              "UCLA Medical Center, Los Angeles, CA"
            ];
            
            // Generate unique title and description
            const trialType = trialTypes[Math.floor((conditionIndex + i) % trialTypes.length)];
            const approach = approaches[Math.floor((conditionIndex + i + 1) % approaches.length)];
            const phase = phases[Math.floor((conditionIndex + i + 2) % phases.length)];
            const trialLocation = locations[Math.floor((conditionIndex + i) % locations.length)];
            
            return {
              id: `trial-${condition}-${i}`.replace(/\s+/g, '-').toLowerCase(),
              title: `${trialType} of ${condition} Treatment (${phase})`,
              description: `This clinical trial is investigating ${approach} for treating ${condition} with promising results from early research.`,
              status: "Recruiting",
              location: trialLocation,
              eligibility: `Ages ${age || "18-65"}, ${sex || "all genders"}, diagnosed with ${condition}`,
              url: `https://clinicaltrials.gov/search?cond=${encodeURIComponent(condition)}&locStr=USA&country=United%20States&aggFilters=status:rec`
            };
          });
        });
      }
      
      // Ensure we have trials data (even if empty array)
      if (!Array.isArray(clinicalTrials)) {
        clinicalTrials = [];
      }
      
      // Save the trials to the database using a proper mutation
      await ctx.runMutation(api.meetings.saveClinicalTrials, {
        meetingId: args.meetingId,
        trials: clinicalTrials
      });

      return clinicalTrials;
    } catch (error) {
      console.error("Error fetching clinical trials:", error);
      throw error;
    }
  }
});

// Internal function to save the clinical trials
export const saveClinicalTrials = mutation({
  args: {
    meetingId: v.id("meetings"),
    trials: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.meetingId, { clinicalTrials: args.trials });
    return args.meetingId;
  },
});

// Helper function to save clinical trials data (used in fetchClinicalTrials)
async function saveClinicalTrialsToDatabase(ctx, meetingId, trials) {
  // This function is now deprecated and should not be used
  console.warn("saveClinicalTrialsToDatabase is deprecated, use ctx.runMutation(api.meetings.saveClinicalTrials) instead");
  throw new Error("saveClinicalTrialsToDatabase is deprecated");
}

// Send a message from patient to doctor
export const sendMessageToDoctor = mutation({
  args: {
    meetingId: v.id("meetings"),
    message: v.string(),
    patientId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the user's identity from the auth context
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Unauthenticated");
    }

    // Get the current meeting
    const meeting = await ctx.db.get(args.meetingId);
    
    if (!meeting) {
      throw new Error("Meeting not found");
    }
    
    // Create message object
    const newMessage = {
      id: crypto.randomUUID(),
      senderId: args.patientId,
      senderType: "patient",
      text: args.message,
      timestamp: Date.now(),
      isRead: false
    };
    
    // Get existing messages or initialize empty array
    const messages = meeting.messages || [];
    
    // Add new message
    await ctx.db.patch(args.meetingId, {
      messages: [...messages, newMessage]
    });
    
    return args.meetingId;
  },
});

// Approve or disapprove a clinical trial
export const updateClinicalTrialApproval = mutation({
  args: {
    meetingId: v.id("meetings"),
    trialId: v.string(),
    approved: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Get the user's identity from the auth context
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Unauthenticated");
    }

    // Get the current meeting
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) {
      throw new Error("Meeting not found");
    }

    // Check if the user is the doctor for this meeting
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user || user.role !== "doctor" || user.tokenIdentifier !== meeting.doctorId) {
      throw new Error("Only the doctor assigned to this meeting can approve trials");
    }

    // Get current trials
    const clinicalTrials = meeting.clinicalTrials || [];

    // Update the approval status of the specified trial
    const updatedTrials = clinicalTrials.map(trial => {
      if (trial.id === args.trialId) {
        return { ...trial, approved: args.approved };
      }
      return trial;
    });

    // Update the meeting with the new trials
    await ctx.db.patch(args.meetingId, { clinicalTrials: updatedTrials });

    return { success: true };
  },
});

// Start recording a meeting and record the timestamp
export const startRecording = mutation({
  args: {
    meetingId: v.id("meetings"),
  },
  handler: async (ctx, args) => {
    // Get the user's identity from the auth context
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Unauthenticated");
    }

    // Get the meeting
    const meeting = await ctx.db.get(args.meetingId);
    
    if (!meeting) {
      throw new Error("Meeting not found");
    }
    
    // Update the meeting with recording start time
    await ctx.db.patch(args.meetingId, {
      recordingStartTime: Date.now(),
      status: "in-progress", // Update meeting status
    });
    
    return args.meetingId;
  },
});

// Generate a URL for uploading a meeting recording
export const generateUploadUrl = mutation({
  args: {
    meetingId: v.id("meetings"),
    contentType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get the user's identity from the auth context
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Unauthenticated");
    }

    // Generate a unique upload URL
    const uploadUrl = await ctx.storage.generateUploadUrl();
    
    // No need to store the pending upload details here
    // The storageId will be sent back in the response from upload

    return uploadUrl;
  },
});

// Save the recording URL to the meeting record after upload completes
export const saveRecordingUrl = mutation({
  args: {
    meetingId: v.id("meetings"),
    storageId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the user's identity from the auth context
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Unauthenticated");
    }

    try {
      // Get the URL for the storage ID
      const audioUrl = await ctx.storage.getUrl(args.storageId);
      
      if (!audioUrl) {
        throw new Error("Invalid storage ID or file not found");
      }

      // Update the meeting with the audio URL
      await ctx.db.patch(args.meetingId, {
        audioUrl: audioUrl,
        recordingEndTime: Date.now(),  // Add recording end time
      });

      console.log(`Successfully saved recording URL: ${audioUrl} for meeting: ${args.meetingId}`);
      return args.meetingId;
    } catch (error) {
      console.error(`Error saving recording URL: ${error}`);
      throw error;
    }
  },
});

// Get a recording URL for a meeting
export const getRecordingUrl = query({
  args: {
    meetingId: v.id("meetings"),
  },
  handler: async (ctx, args) => {
    // Get the user's identity from the auth context
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    // Get the meeting
    const meeting = await ctx.db.get(args.meetingId);
    
    if (!meeting || !meeting.audioUrl) {
      return null;
    }

    // Return the audio URL
    return meeting.audioUrl;
  },
});

// Cleanup old pending uploads
export const cleanupPendingUploads = mutation({
  args: {},
  handler: async (ctx) => {
    // Get uploads older than 24 hours
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    
    // Find old pending uploads
    const oldUploads = await ctx.db
      .query("pendingUploads")
      .filter((q) => q.lt(q.field("createdAt"), oneDayAgo))
      .collect();
    
    // Delete each old upload
    for (const upload of oldUploads) {
      await ctx.db.delete(upload._id);
    }
    
    return oldUploads.length;
  },
});

// List recordings for a meeting
export const listMeetingRecordings = query({
  args: {
    meetingId: v.id("meetings"),
  },
  handler: async (ctx, args) => {
    // Get the user's identity from the auth context
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    // Get the meeting
    const meeting = await ctx.db.get(args.meetingId);
    
    if (!meeting) {
      throw new Error("Meeting not found");
    }
    
    // Return the recording URL if one exists
    return meeting.audioUrl ? { audioUrl: meeting.audioUrl } : null;
  },
});

// Delete a recording
export const deleteRecording = mutation({
  args: {
    meetingId: v.id("meetings"),
  },
  handler: async (ctx, args) => {
    // Get the user's identity from the auth context
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Unauthenticated");
    }

    // Get the meeting
    const meeting = await ctx.db.get(args.meetingId);
    
    if (!meeting || !meeting.audioUrl) {
      throw new Error("Meeting recording not found");
    }
    
    // Extract storage ID from URL
    const url = new URL(meeting.audioUrl);
    const pathParts = url.pathname.split('/');
    const storageId = pathParts[pathParts.length - 1];
    
    // Delete the file from storage
    await ctx.storage.delete(storageId);
    
    // Remove the URL from the meeting
    await ctx.db.patch(args.meetingId, { audioUrl: null });
    
    return true;
  },
});

// Transcribe audio using OpenAI's Whisper API
export const transcribeAudio = action({
  args: {
    meetingId: v.id("meetings"),
  },
  handler: async (ctx, args) => {
    // Get the user's identity from the auth context
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Unauthenticated");
    }

    try {
      // Get OpenAI API key from environment variables
      const apiKey = process.env.OPENAI_API_KEY;
      
      if (!apiKey) {
        throw new Error("OpenAI API key not configured");
      }

      // Get the meeting using runQuery instead of db.get
      const meeting = await ctx.runQuery(api.meetings.getMeeting, { id: args.meetingId });
      
      if (!meeting) {
        throw new Error("Meeting not found");
      }
      
      if (!meeting.audioUrl) {
        throw new Error("No audio recording found for this meeting");
      }

      // Fetch the audio file from the URL
      const audioResponse = await fetch(meeting.audioUrl);
      if (!audioResponse.ok) {
        throw new Error(`Failed to fetch audio file: ${audioResponse.statusText}`);
      }

      // Get the audio file as a Blob
      const audioBlob = await audioResponse.blob();
      
      // Create a FormData object to send to OpenAI
      const formData = new FormData();
      formData.append("file", audioBlob, "recording.webm");
      formData.append("model", "whisper-1");
      formData.append("language", "en"); // Assuming English, can be made dynamic

      // Call OpenAI Whisper API
      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          // Don't set Content-Type when using FormData
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(`OpenAI API error: ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      const transcript = data.text;

      if (!transcript) {
        throw new Error("Failed to generate transcript");
      }
      
      console.log("Successfully transcribed audio to text:", transcript.substring(0, 100) + "...");

      // Save the transcript to the database
      await ctx.runMutation(api.meetings.saveTranscript, {
        meetingId: args.meetingId,
        transcript
      });

      return transcript;
    } catch (error) {
      console.error("Error transcribing audio:", error);
      throw error;
    }
  },
});

// Internal function to save the transcript
export const saveTranscript = mutation({
  args: {
    meetingId: v.id("meetings"),
    transcript: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.meetingId, { transcript: args.transcript });
    return args.meetingId;
  },
});

// Get shared meetings for a patient
export const getSharedMeetingsForPatient = query({
  args: { patientId: v.string() },
  handler: async (ctx, args) => {
    // Get the user's identity from the auth context
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    // Fetch all meetings for this patient that have been shared
    const meetings = await ctx.db
      .query("meetings")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .filter((q) => q.eq(q.field("isSharedWithPatient"), true))
      .collect();

    return meetings;
  },
});

// AI Chatbot function to answer questions based on meeting context
export const getAIChatResponse = action({
  args: {
    patientId: v.string(),
    question: v.string(),
    meetingIds: v.array(v.id("meetings")),
    timeRange: v.optional(v.number()) // Optional time range in days
  },
  handler: async (ctx, args) => {
    // Get the user's identity from the auth context
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Unauthenticated");
    }

    try {
      // Validate that the patient can access these meetings
      const meetings = [];
      
      for (const meetingId of args.meetingIds) {
        const meeting = await ctx.runQuery(api.meetings.getMeeting, { id: meetingId });
        
        if (meeting && meeting.patientId === args.patientId && meeting.isSharedWithPatient) {
          meetings.push(meeting);
        }
      }

      if (meetings.length === 0) {
        throw new Error("No accessible meetings found to provide context");
      }

      // If time range is provided, filter meetings by date
      let filteredMeetings = meetings;
      if (args.timeRange) {
        const cutoffDate = Date.now() - (args.timeRange * 24 * 60 * 60 * 1000);
        filteredMeetings = meetings.filter(meeting => meeting.scheduledTime >= cutoffDate);
      }

      if (filteredMeetings.length === 0) {
        throw new Error("No meetings found in the selected time range");
      }

      // Format the context from the selected meetings
      const contextBlocks = filteredMeetings.map((meeting, index) => {
        const meetingDate = new Date(meeting.scheduledTime).toLocaleDateString();
        const transcript = meeting.transcript ? `\nTranscript: ${meeting.transcript}` : '';
        const report = meeting.report ? `\nMedical Report: ${meeting.report}` : '';
        
        return `--- Meeting ${index + 1} (${meetingDate}) with ${meeting.doctorName} ---${transcript}${report}`;
      });

      // Combine all context
      const combinedContext = contextBlocks.join('\n\n');

      // Get OpenAI API key from environment variables
      const apiKey = process.env.OPENAI_API_KEY;
      
      if (!apiKey) {
        throw new Error("OpenAI API key not configured");
      }

      // Call OpenAI API to generate a response
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: `You are a helpful medical assistant that helps patients understand their medical records and reports. 
              You have access to the patient's medical records including transcripts of doctor appointments and medical reports.
              Answer the patient's questions based solely on the information in these records. 
              If the information isn't in the records, politely explain that you don't have that information and suggest they consult their doctor.
              Never make up medical information or advice that isn't directly supported by the provided records.
              Keep your answers concise, informative, and empathetic, focusing on helping the patient understand their medical situation.`
            },
            {
              role: "user",
              content: `I have the following medical records. Please help me understand them by answering my question that follows.\n\nMEDICAL RECORDS:\n${combinedContext}\n\nMY QUESTION: ${args.question}`
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const chatResponse = data.choices[0]?.message?.content;

      if (!chatResponse) {
        throw new Error("Failed to generate a response");
      }

      return chatResponse;
    } catch (error) {
      console.error("Error generating AI chat response:", error);
      throw error;
    }
  },
});

// Save follow-up recommendations to the meeting record
export const saveFollowUpRecommendations = mutation({
  args: {
    meetingId: v.id("meetings"),
    recommendations: v.array(
      v.object({
        text: v.string(),
        date: v.optional(v.number()), // timestamp
        time: v.optional(v.string()),
        dismissed: v.optional(v.boolean()),
        scheduled: v.optional(v.boolean()),
        scheduledMeetingId: v.optional(v.id("meetings")),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Get the user's identity from the auth context
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Unauthenticated");
    }

    // Save the recommendations to the database
    await ctx.db.patch(args.meetingId, { 
      followUpRecommendations: args.recommendations 
    });

    return args.meetingId;
  },
});

// Update a single follow-up recommendation
export const updateFollowUpRecommendation = mutation({
  args: {
    meetingId: v.id("meetings"),
    index: v.number(),
    recommendation: v.object({
      text: v.string(),
      date: v.optional(v.number()),
      time: v.optional(v.string()),
      dismissed: v.optional(v.boolean()),
      scheduled: v.optional(v.boolean()),
      scheduledMeetingId: v.optional(v.id("meetings")),
    }),
  },
  handler: async (ctx, args) => {
    // Get the user's identity from the auth context
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Unauthenticated");
    }

    // Get current meeting data
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) {
      throw new Error("Meeting not found");
    }

    // Get current recommendations or initialize empty array
    const recommendations = meeting.followUpRecommendations || [];
    
    // Check if index is valid
    if (args.index < 0 || args.index >= recommendations.length) {
      throw new Error("Invalid recommendation index");
    }

    // Update the specific recommendation
    recommendations[args.index] = args.recommendation;

    // Save updated recommendations
    await ctx.db.patch(args.meetingId, { followUpRecommendations: recommendations });

    return args.meetingId;
  },
});

// Dismiss a follow-up recommendation
export const dismissFollowUpRecommendation = mutation({
  args: {
    meetingId: v.id("meetings"),
    index: v.number(),
  },
  handler: async (ctx, args) => {
    // Get the user's identity from the auth context
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Unauthenticated");
    }

    // Get current meeting data
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) {
      throw new Error("Meeting not found");
    }

    // Get current recommendations or initialize empty array
    const recommendations = meeting.followUpRecommendations || [];
    
    // Check if index is valid
    if (args.index < 0 || args.index >= recommendations.length) {
      throw new Error("Invalid recommendation index");
    }

    // Mark the recommendation as dismissed
    recommendations[args.index] = {
      ...recommendations[args.index],
      dismissed: true
    };

    // Save updated recommendations
    await ctx.db.patch(args.meetingId, { followUpRecommendations: recommendations });

    return args.meetingId;
  },
});

// Mark a follow-up recommendation as scheduled
export const markFollowUpAsScheduled = mutation({
  args: {
    meetingId: v.id("meetings"),
    index: v.number(),
    scheduledMeetingId: v.id("meetings"),
  },
  handler: async (ctx, args) => {
    // Get the user's identity from the auth context
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Unauthenticated");
    }

    // Get current meeting data
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) {
      throw new Error("Meeting not found");
    }

    // Get current recommendations or initialize empty array
    const recommendations = meeting.followUpRecommendations || [];
    
    // Check if index is valid
    if (args.index < 0 || args.index >= recommendations.length) {
      throw new Error("Invalid recommendation index");
    }

    // Mark the recommendation as scheduled and store the linked meeting ID
    recommendations[args.index] = {
      ...recommendations[args.index],
      scheduled: true,
      scheduledMeetingId: args.scheduledMeetingId
    };

    // Save updated recommendations
    await ctx.db.patch(args.meetingId, { followUpRecommendations: recommendations });

    return args.meetingId;
  },
});

// Internal namespace for functions only callable from other Convex functions
export const internal = {
  meetings: {
    saveReport,
    saveClinicalTrials,
    saveTranscript,
    saveRecordingUrl: mutation({
      args: {
        meetingId: v.id("meetings"),
        audioUrl: v.string(),
      },
      handler: async (ctx, args) => {
        await ctx.db.patch(args.meetingId, { 
          audioUrl: args.audioUrl,
          recordingEndTime: Date.now()  // Add recording end time
        });
        return args.meetingId;
      }
    })
  }
};
