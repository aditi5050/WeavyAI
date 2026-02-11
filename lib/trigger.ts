// import { TriggerClient } from "@trigger.dev/sdk";

export const client = {
  // Mock client for Phase 1
  defineJob: () => {},
  defineTask: () => {}
};

/*
export const client = new TriggerClient({
  id: "weavy-phase-1",
  apiKey: process.env.TRIGGER_API_KEY || "tr_dev_mock_key",
  apiUrl: process.env.TRIGGER_API_URL || "https://api.trigger.dev",
});
*/

// Mock Tasks
// In a real app these would be client.defineJob or defineTask
// For Phase 1 stubs, we'll simulate the interface

export const llmTask = async (payload: any) => {
  console.log("Executing LLM Task", payload);
  await new Promise(r => setTimeout(r, 1000)); // Simulate delay
  return { text: "This is a mocked LLM response for " + payload.prompt };
};

export const cropImageTask = async (payload: any) => {
  console.log("Executing Crop Task", payload);
  await new Promise(r => setTimeout(r, 1500));
  return { url: "https://via.placeholder.com/500x500?text=Cropped+Image" };
};

export const extractFrameTask = async (payload: any) => {
  console.log("Executing Extract Frame Task", payload);
  await new Promise(r => setTimeout(r, 2000));
  return { url: "https://via.placeholder.com/1920x1080?text=Extracted+Frame" };
};

export const uploadProxyTask = async (payload: any) => {
  console.log("Executing Upload Task", payload);
  await new Promise(r => setTimeout(r, 500));
  return { url: "https://via.placeholder.com/original?text=Uploaded+Asset" };
};

// This function bridges the API route to the execution engine
import { runWorkflowEngine } from "@/lib/engine";

export const triggerWorkflow = async (runId: string, inputs: any) => {
  // In real Trigger.dev, this would send an event.
  // Here we just call the engine directly (async).
  runWorkflowEngine(runId, inputs);
};
