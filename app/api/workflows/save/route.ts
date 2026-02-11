import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { saveWorkflowSchema } from '@/lib/validations/workflow';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const result = saveWorkflowSchema.safeParse(body);

    if (!result.success) {
      return new NextResponse("Invalid request body", { status: 400 });
    }

    const { id, name, description, definition, nodes, edges } = result.data;

    // Ensure user exists in our DB (sync with Clerk)
    // In a real app, use webhooks. For Phase 1, upsert on save.
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: 'placeholder@weavy.ai', // We don't have email in auth() by default without session claims or lookup
      }
    });

    // Transaction to update workflow and its structure
    const workflowId = id || uuidv4();

    const workflow = await prisma.$transaction(async (tx) => {
      // 1. Upsert Workflow
      const wf = await tx.workflow.upsert({
        where: { id: workflowId },
        update: {
          name,
          description,
          definition: definition as any,
          updatedAt: new Date()
        },
        create: {
          id: workflowId,
          userId,
          name,
          description,
          definition: definition as any
        }
      });

      // 2. Verify ownership if updating
      if (wf.userId !== userId) {
        throw new Error("Unauthorized access to workflow");
      }

      // 3. Re-create nodes (simplest strategy for sync: delete all and recreate)
      // Note: This loses history if we track it by node ID, but we want to sync UI state to DB.
      // Ideally we should diff, but for Phase 1, full replacement is safer for DAG consistency.
      await tx.workflowEdge.deleteMany({ where: { workflowId } });
      await tx.workflowNode.deleteMany({ where: { workflowId } });

      for (const node of nodes) {
        await tx.workflowNode.create({
          data: {
            id: node.id,
            workflowId,
            type: node.type,
            label: node.label,
            positionX: node.position.x,
            positionY: node.position.y,
            config: (node.data || {}) as any
          }
        });
      }

      for (const edge of edges) {
        await tx.workflowEdge.create({
          data: {
            id: edge.id,
            workflowId,
            sourceId: edge.source,
            targetId: edge.target,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle
          }
        });
      }

      return wf;
    });

    return NextResponse.json(workflow);
  } catch (error) {
    console.error("[WORKFLOW_SAVE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
