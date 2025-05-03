import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getUserByToken = query({
  args: { tokenIdentifier: v.string() },
  handler: async (ctx, args) => {
    // Get the user's identity from the auth context
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    // Check if we've already stored this identity before
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (user !== null) {
      return user;
    }

    return null;
  },
});

export const createOrUpdateUser = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    // Check if user exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (existingUser) {
      // Update if needed
      if (
        existingUser.name !== identity.name ||
        existingUser.email !== identity.email
      ) {
        await ctx.db.patch(existingUser._id, {
          name: identity.name,
          email: identity.email,
        });
      }
      return existingUser;
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      name: identity.name,
      email: identity.email,
      tokenIdentifier: identity.subject,
    });

    return await ctx.db.get(userId);
  },
});

// New mutation to update user profile with role and additional details
export const updateUserProfile = mutation({
  args: {
    role: v.string(),
    age: v.number(),
    sex: v.string(),
    location: v.string(),
    specialization: v.optional(v.string()), // Optional for doctors
    licenseNumber: v.optional(v.string()), // Optional for doctors
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Find the user in the database
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Update user with profile information
    const updateData = {
      role: args.role,
      age: args.age,
      sex: args.sex,
      location: args.location,
    };

    // Add specialization and licenseNumber if provided (for doctors)
    if (args.role === "doctor") {
      if (args.specialization) {
        updateData.specialization = args.specialization;
      }
      if (args.licenseNumber) {
        updateData.licenseNumber = args.licenseNumber;
      }
    }

    await ctx.db.patch(user._id, updateData);

    return await ctx.db.get(user._id);
  },
});

// Query to check if user has completed profile setup
export const checkUserProfileStatus = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return { isAuthenticated: false };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) {
      return { isAuthenticated: true, profileComplete: false };
    }

    // Check if the user has completed their profile (has role and other required fields)
    const profileComplete = Boolean(user.role && user.age && user.sex && user.location);

    return {
      isAuthenticated: true,
      profileComplete,
      user,
    };
  },
});

// Get all patients for doctor appointment scheduling
export const getPatients = query({
  handler: async (ctx) => {
    // Get the user's identity from the auth context
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return [];
    }

    // Check if requesting user is a doctor
    const requestingUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();
      
    // Only allow doctors to fetch patients
    if (!requestingUser || requestingUser.role !== "doctor") {
      return [];
    }

    // Fetch all users with role "patient"
    const patients = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "patient"))
      .collect();

    return patients;
  },
});
