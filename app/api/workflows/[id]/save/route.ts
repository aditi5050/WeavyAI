import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { saveWorkflowSchema } from "@/lib/validations/api";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const body = await req.json();

    // Validate with Zod
    const parsed = saveWorkflowSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { name, definition } = parsed.data;

    // Find or create workflow
    let workflow = await prisma.workflow.findUnique({
      where: { id: params.id },
    });

    if (!workflow) {
      // Create new workflow if it doesn't exist
      workflow = await prisma.workflow.create({
        data: {
          id: params.id,
          name: name || 'Untitled Workflow',
          definition,
          userId,
        },
      });
    } else if (workflow.userId !== userId) {
      // Verify ownership if workflow exists
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Delete existing nodes and edges
    await prisma.workflowEdge.deleteMany({
      where: { workflowId: params.id },
    });

    await prisma.workflowNode.deleteMany({
      where: { workflowId: params.id },
    });

    // Create new nodes
    const nodeMap = new Map<string, string>();
    for (const node of definition.nodes) {
      const dbNode = await prisma.workflowNode.create({
        data: {
          workflowId: params.id,
          type: node.type,
          label: node.data?.label || node.type,
          config: node.data || {},
          positionX: node.position?.x || 0,
          positionY: node.position?.y || 0,
          id: node.id, // Use the same ID from React Flow
        },
      });
      nodeMap.set(node.id, dbNode.id);
    }

    // Create new edges
    for (const edge of definition.edges) {
      await prisma.workflowEdge.create({
        data: {
          workflowId: params.id,
          sourceId: edge.source,
          targetId: edge.target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
        },
      });
    }

    // Update workflow
    const updatedWorkflow = await prisma.workflow.update({
      where: { id: params.id },
      data: {
        name,
        definition,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(updatedWorkflow);
  } catch (error) {
    console.error("[WORKFLOW_SAVE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
