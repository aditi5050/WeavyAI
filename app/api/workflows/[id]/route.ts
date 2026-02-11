import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const workflow = await prisma.workflow.findUnique({
      where: { id: params.id },
      include: {
        nodes: true,
        edges: true
      }
    });

    if (!workflow) {
      return new NextResponse("Not Found", { status: 404 });
    }

    if (workflow.userId !== userId) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    return NextResponse.json(workflow);
  } catch (error) {
    console.error("[WORKFLOW_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
