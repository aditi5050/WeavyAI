import { create } from 'zustand';

interface NodeStatus {
  [nodeId: string]: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
}

interface WorkflowRuntimeState {
  nodeStatuses: NodeStatus;
  runId: string | null;
  executionScope: any;
  runningNodes: string[];
  errors: string[];
  
  startRun: (workflowId: string, inputs?: any) => Promise<void>;
  pollRun: (runId: string) => Promise<void>;
  reset: () => void;
}

export const useWorkflowRuntimeStore = create<WorkflowRuntimeState>((set, get) => ({
  nodeStatuses: {},
  runId: null,
  executionScope: {},
  runningNodes: [],
  errors: [],

  startRun: async (workflowId, inputs = {}) => {
    try {
      set({ runId: null, nodeStatuses: {}, errors: [] });
      
      const response = await fetch('/api/runs/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId, inputs }),
      });

      if (!response.ok) throw new Error('Failed to start run');

      const data = await response.json();
      set({ runId: data.runId });

      // Start polling
      get().pollRun(data.runId);
    } catch (error: any) {
      set({ errors: [error.message] });
    }
  },

  pollRun: async (runId) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/runs/${runId}`);
        if (!response.ok) return;

        const run = await response.json();
        
        // Map execution status to store format
        const newStatuses: NodeStatus = {};
        run.nodeExecutions.forEach((exec: any) => {
          newStatuses[exec.nodeId] = exec.status;
        });

        set({ nodeStatuses: newStatuses });

        if (run.status === 'COMPLETED' || run.status === 'FAILED') {
          clearInterval(interval);
        }
      } catch (error) {
        console.error("Polling error", error);
      }
    }, 1000);
  },

  reset: () => set({ nodeStatuses: {}, runId: null, errors: [] })
}));
