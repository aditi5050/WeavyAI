import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { startRunSchema } from '@/lib/validations/workflow';
import { triggerWorkflow } from '@/lib/trigger'; // We will create this

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const result = startRunSchema.safeParse(body);

    if (!result.success) {
      return new NextResponse("Invalid request body", { status: 400 });
    }

    const { workflowId, inputs } = result.data;

    // Verify ownership
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: { nodes: true }
    });

    if (!workflow) return new NextResponse("Not Found", { status: 404 });
    if (workflow.userId !== userId) return new NextResponse("Forbidden", { status: 403 });

    // Create Run Record
    const run = await prisma.workflowRun.create({
      data: {
        workflowId,
        userId,
        status: 'PENDING',
        // Initialize node executions
        nodeExecutions: {
          create: workflow.nodes.map(node => ({
            nodeId: node.id,
            status: 'PENDING'
          }))
        }
      }
    });

    // Trigger Execution Engine
    // In Phase 1, we simulate this call or call our internal execution logic.
    // For now, let's call a lib function that will eventually call Trigger.dev
    
    // Fire and forget execution logic so we return runId immediately
    triggerWorkflow(run.id, inputs).catch(err => {
      console.error("Failed to trigger workflow", err);
      // In production, we'd want to update the run status to FAILED here if trigger fails
    });

    return NextResponse.json({ runId: run.id });
  } catch (error) {
    console.error("[RUN_START]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
