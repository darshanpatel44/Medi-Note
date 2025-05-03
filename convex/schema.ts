import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
    tokenIdentifier: v.string(),
    role: v.optional(v.string()), // "doctor" or "patient"
    specialization: v.optional(v.string()), // For doctors
    licenseNumber: v.optional(v.string()), // License number for doctors
    zipCode: v.optional(v.string()),
    age: v.optional(v.number()),
    sex: v.optional(v.string()), // "male", "female", "other"
    location: v.optional(v.string()), // Location/address information
  }).index("by_token", ["tokenIdentifier"]),
  meetings: defineTable({
    doctorId: v.string(),
    patientId: v.string(),
    doctorName: v.optional(v.string()),
    patientName: v.optional(v.string()),
    scheduledTime: v.number(),
    duration: v.number(), // in minutes
    status: v.string(), // "scheduled", "in-progress", "completed", "cancelled"
    title: v.optional(v.string()),
    notes: v.optional(v.string()),
    audioUrl: v.optional(v.string()),
    transcript: v.optional(v.string()),
    report: v.optional(v.string()), // structured medical report as text
    clinicalTrials: v.optional(v.array(
      v.object({
        id: v.string(),
        title: v.string(),
        description: v.string(),
        status: v.string(),
        location: v.string(),
        eligibility: v.optional(v.string()),
        url: v.string(),
        approved: v.optional(v.boolean()), // whether the trial is approved by the doctor
      })
    )), // recommended trials
    isSharedWithPatient: v.optional(v.boolean()), // whether the report is shared with the patient
    messages: v.optional(v.array(v.any())), // messages between doctor and patient
    recordingStartTime: v.optional(v.number()), // timestamp when recording started
    recordingEndTime: v.optional(v.number()), // timestamp when recording ended
    followUpRecommendations: v.optional(v.array(
      v.object({
        text: v.string(),
        date: v.optional(v.number()), // store as timestamp
        time: v.optional(v.string()),
        dismissed: v.optional(v.boolean()),
        scheduled: v.optional(v.boolean()),
        scheduledMeetingId: v.optional(v.id("meetings")),
      })
    )), // follow-up recommendations from report and transcript
  })
    .index("by_doctor", ["doctorId"])
    .index("by_patient", ["patientId"])
    .index("by_status", ["status"]),
  subscriptions: defineTable({
    userId: v.string(),
    status: v.string(),
    planId: v.optional(v.string()),
    subscriptionId: v.optional(v.string()), // Changed to optional
    customerId: v.string(),
    polarId: v.optional(v.string()),
    polarPriceId: v.optional(v.string()),
    currentPeriodStart: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    cancelAt: v.optional(v.number()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    canceledAt: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
    trialStart: v.optional(v.number()),
    trialEnd: v.optional(v.number()),
    interval: v.optional(v.string()),
    currency: v.optional(v.string()),
    amount: v.optional(v.number()),
    metadata: v.optional(v.any()),
    customFieldData: v.optional(v.any()),
    customerCancellationReason: v.optional(v.string()),
    customerCancellationComment: v.optional(v.string()),
    accessLevel: v.optional(v.string()),
  }).index("by_user", ["userId"]).index("polarId", ["polarId"]),
  pendingUploads: defineTable({
    storageId: v.string(),
    meetingId: v.id("meetings"),
    createdAt: v.number(),
  }).index("by_meeting", ["meetingId"]),
});
