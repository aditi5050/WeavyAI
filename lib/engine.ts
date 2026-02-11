import prisma from './prisma';
import { llmTask, cropImageTask, extractFrameTask, uploadProxyTask } from './trigger';

// 7. Implement Parallel Execution Engine (Server Side)

export async function runWorkflowEngine(runId: string, initialInputs: any) {
  console.log(`[ENGINE] Starting run ${runId}`);
  
  // 1. Load Workflow and Run State
  const run = await prisma.workflowRun.findUnique({
    where: { id: runId },
    include: {
      workflow: {
        include: {
          nodes: true,
          edges: true
        }
      },
      nodeExecutions: true
    }
  });

  if (!run) {
    console.error(`[ENGINE] Run ${runId} not found`);
    return;
  }

  // Update status to RUNNING
  await prisma.workflowRun.update({
    where: { id: runId },
    data: { status: 'RUNNING', startedAt: new Date() }
  });

  const nodes = run.workflow.nodes;
  const edges = run.workflow.edges;
  let nodeExecutions = run.nodeExecutions;

  // Helper to get execution for a node
  const getExecution = (nodeId: string) => nodeExecutions.find((ne: any) => ne.nodeId === nodeId);

  // Helper to check if node is ready (all parents completed)
  const isReady = (nodeId: string) => {
    const parentEdges = edges.filter((e: any) => e.targetId === nodeId);
    if (parentEdges.length === 0) return true; // No parents, ready to run (if not already running/done)

    return parentEdges.every((edge: any) => {
      const parentExec = getExecution(edge.sourceId);
      return parentExec?.status === 'COMPLETED';
    });
  };

  // Execution Loop
  // In a real system, this might be event-driven. Here we'll simulate a loop or recursion.
  // We'll iterate until all are processed or stuck.
  
  let changed = true;
  while (changed) {
    changed = false;
    
    // Refresh executions state in memory (in real app, re-fetch from DB if distributed)
    // Here we just use the local array which we update.

    // Find nodes that are PENDING and Ready
    const readyNodes = nodes.filter((node: any) => {
      const exec = getExecution(node.id);
      return exec?.status === 'PENDING' && isReady(node.id);
    });

    if (readyNodes.length > 0) {
      console.log(`[ENGINE] Found ${readyNodes.length} ready nodes: ${readyNodes.map((n: any) => n.label).join(', ')}`);
      
      // Execute them in parallel
      await Promise.all(readyNodes.map(async (node: any) => {
        const exec = getExecution(node.id)!;
        
        // Update to RUNNING
        await prisma.nodeExecution.update({
          where: { id: exec.id },
          data: { status: 'RUNNING', startedAt: new Date() }
        });
        exec.status = 'RUNNING'; // update local state

        try {
          // Gather Inputs
          const parentEdges = edges.filter((e: any) => e.targetId === node.id);
          const nodeInputs = { ...initialInputs, ...node.config as any }; // Merge config
          
          for (const edge of parentEdges) {
            const parentExec = getExecution(edge.sourceId);
            if (parentExec?.outputs) {
              // Simple merging strategy: merge all parent outputs
              // In real graph, we'd map handles
              Object.assign(nodeInputs, parentExec.outputs);
            }
          }

          // Execute Task
          let output = {};
          const startTime = Date.now();
          
          switch (node.type) {
            case 'llm':
              output = await llmTask({ prompt: nodeInputs.text || nodeInputs.prompt || "Default Prompt" });
              break;
            case 'crop_image':
              output = await cropImageTask({ imageUrl: nodeInputs.url });
              break;
            case 'extract_frame':
              output = await extractFrameTask({ videoUrl: nodeInputs.url });
              break;
            case 'upload_image':
            case 'upload_video':
              output = await uploadProxyTask({ filename: "upload" });
              break;
            case 'text':
              // Pass through config text
              output = { text: (node.config as any)?.text };
              break;
            default:
              console.warn(`Unknown node type ${node.type}`);
              output = { status: "skipped" };
          }

          const duration = Date.now() - startTime;

          // Update to COMPLETED
          await prisma.nodeExecution.update({
            where: { id: exec.id },
            data: { 
              status: 'COMPLETED', 
              completedAt: new Date(),
              duration,
              inputs: nodeInputs,
              outputs: output as any
            }
          });
          
          // Update local state
          exec.status = 'COMPLETED';
          exec.outputs = output as any;
          changed = true; // State changed, might unlock new nodes

        } catch (error) {
          console.error(`[ENGINE] Node ${node.id} failed`, error);
          await prisma.nodeExecution.update({
            where: { id: exec.id },
            data: { status: 'FAILED', error: String(error), completedAt: new Date() }
          });
          exec.status = 'FAILED';
          // If a node fails, we might want to stop or continue. 
          // For now, we continue but dependents won't run.
        }
      }));
    }
  }

  // Check final status
  const allCompleted = nodeExecutions.every((ne: any) => ne.status === 'COMPLETED' || ne.status === 'SKIPPED'); // Simplification
  const anyFailed = nodeExecutions.some((ne: any) => ne.status === 'FAILED');

  if (anyFailed) {
    await prisma.workflowRun.update({
      where: { id: runId },
      data: { status: 'FAILED', completedAt: new Date() }
    });
  } else if (allCompleted) {
    await prisma.workflowRun.update({
      where: { id: runId },
      data: { status: 'COMPLETED', completedAt: new Date() }
    });
  }
  
  console.log(`[ENGINE] Run ${runId} finished`);
}
