import { z } from 'zod';

export const saveWorkflowSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  definition: z.record(z.any()), // React Flow JSON
  nodes: z.array(z.object({
    id: z.string(),
    type: z.string(),
    label: z.string(),
    position: z.object({
      x: z.number(),
      y: z.number()
    }),
    data: z.record(z.any()).optional()
  })),
  edges: z.array(z.object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
    sourceHandle: z.string().nullable().optional(),
    targetHandle: z.string().nullable().optional()
  }))
});

export const startRunSchema = z.object({
  workflowId: z.string().uuid(),
  inputs: z.record(z.any()).optional() // Initial inputs for the workflow
});
