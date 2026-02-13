import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const run = await prisma.workflowRun.findUnique({
      where: { id: params.id },
      include: {
        nodeExecutions: true
      }
    });

    if (!run) {
      return new NextResponse("Not Found", { status: 404 });
    }

    if (run.userId !== userId) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    return NextResponse.json(run);
  } catch (error) {
    console.error("[RUN_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
