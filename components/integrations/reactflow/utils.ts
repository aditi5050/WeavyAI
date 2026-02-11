// Node Type Registry and Utilities for React Flow Integration

export const nodeTypes = {
  // Define mapping from DB type to React Flow component (stubbed for now or mapped to existing)
  // In a real integration, we would import the actual node components here.
  // For Phase 1 non-visual wiring, we just define the interface.
  llm: 'llmNode',
  crop_image: 'cropNode',
  text: 'textNode',
  // ...
};

// Handle Typing
export type HandleType = 'source' | 'target';
export type DataType = 'image' | 'text' | 'video' | 'any';

export interface ValidConnection {
  sourceHandle: string;
  targetHandle: string;
  sourceType: DataType;
  targetType: DataType;
}

export function validateConnection(connection: any, nodes: any[], edges: any[]) {
  // DAG Cycle Detection Logic would go here
  return true; 
}

export function getExecutionClass(status: string | undefined) {
  switch (status) {
    case 'RUNNING': return 'node--running';
    case 'COMPLETED': return 'node--success';
    case 'FAILED': return 'node--error';
    default: return '';
  }
}
