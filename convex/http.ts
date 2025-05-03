import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./meetings";

const http = httpRouter();

// Handle storage upload webhook callback
http.route({
  path: "/storage_webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    
    // Validate webhook body
    if (!body.storageId || !body.status) {
      return new Response("Invalid webhook payload", { status: 400 });
    }
    
    if (body.status !== "completed") {
      return new Response("Acknowledged non-complete status", { status: 200 });
    }
    
    // Find the pending upload record
    const pendingUploads = await ctx.db
      .query("pendingUploads")
      .filter((q) => q.eq(q.field("storageId"), body.storageId))
      .collect();
    
    if (pendingUploads.length === 0) {
      return new Response("No pending upload found", { status: 404 });
    }
    
    const pendingUpload = pendingUploads[0];
    
    try {
      // Get the URL of the uploaded file
      const url = await ctx.storage.getUrl(body.storageId);
      
      if (!url) {
        throw new Error("Failed to get URL for uploaded file");
      }
      
      // Save the URL to the meeting
      await ctx.runMutation(internal.meetings.saveRecordingUrl, {
        meetingId: pendingUpload.meetingId,
        audioUrl: url
      });
      
      // Delete the pending upload record
      await ctx.db.delete(pendingUpload._id);
      
      return new Response("Recording URL saved successfully", { status: 200 });
    } catch (error) {
      console.error("Error processing storage webhook:", error);
      return new Response("Internal server error", { status: 500 });
    }
  })
});

export default http;
