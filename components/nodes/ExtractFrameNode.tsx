import React, { useCallback, useEffect } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { Film, Trash2, Loader2, ArrowRight } from 'lucide-react';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useWorkflowRuntimeStore } from '@/stores/workflowRuntimeStore';

export function ExtractFrameNode({ id, data, selected }: NodeProps) {
  const { getNodes, getEdges } = useReactFlow();
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const deleteNode = useWorkflowStore((state) => state.deleteNode);
  const saveToDatabase = useWorkflowStore((state) => state.saveToDatabase);
  const workflowId = useWorkflowStore((state) => state.workflowId);

  const { startSingleNodeRun, nodeStatuses, nodeOutputs } = useWorkflowRuntimeStore();

  // Helper to update this node's data using Zustand store
  const updateData = useCallback((newData: Record<string, any>) => {
    updateNodeData(id, newData);
  }, [id, updateNodeData]);

  // Helper to delete this node from React Flow
  const deleteThisNode = useCallback(() => {
    deleteNode(id);
  }, [id, deleteNode]);

  // Watch for execution completion
  useEffect(() => {
    if (nodeStatuses[id] === 'COMPLETED' && nodeOutputs[id]) {
      const output = nodeOutputs[id];
      const newUrl = output.output || output.url || output.image;
      if (newUrl) {
        updateData({ 
            extractedFrameUrl: newUrl, 
            isLoading: false,
            error: null
        });
      }
    } else if (nodeStatuses[id] === 'FAILED') {
        const errorMsg = nodeOutputs[id]?.error || 'Extract frame failed on server';
        updateData({ isLoading: false, error: errorMsg });
    }
  }, [nodeStatuses, nodeOutputs, id, updateData]);

  const onTimestampChange = useCallback((evt: React.ChangeEvent<HTMLInputElement>) => {
    updateData({ timestamp: evt.target.value });
  }, [updateData]);

  const onDelete = useCallback(() => {
    deleteThisNode();
  }, [deleteThisNode]);

  // Get input video from connected source node
  const getInputVideo = useCallback(() => {
    const nodes = getNodes();
    const edges = getEdges();
    
    // Find edges where this node is the target
    for (const edge of edges) {
      if (edge.target === id) {
        const sourceNode = nodes.find(n => n.id === edge.source) as any;
        if (!sourceNode) continue;
        
        // Check for video data from video node
        if (sourceNode.type === 'video' && sourceNode.data?.videoUrl) {
          return sourceNode.data.videoUrl;
        }
      }
    }
    return null;
  }, [id, getNodes, getEdges]);

  const handleExtract = useCallback(async () => {
    if (!data) return;
    
    const videoUrl = getInputVideo();
    if (!videoUrl) {
        updateData({
          error: 'No video connected. Connect a video node.',
          isLoading: false,
        });
        return;
    }

    updateData({ isLoading: true, error: null, extractedFrameUrl: null });

    const timestamp = data.timestamp || '0';
    updateData({ timestamp }); 

    // Save workflow to DB first so backend has latest config
    await saveToDatabase();

    // Trigger server-side execution via Trigger.dev
    await startSingleNodeRun(workflowId, id, {
        video: videoUrl
    });

  }, [data, updateData, getInputVideo, saveToDatabase, startSingleNodeRun, workflowId, id]);

  if (!data) return null;

  return (
    <div className={`relative bg-[#1A1A23] rounded-lg shadow-lg border w-64 ${selected ? 'border-[#6F42C1] ring-2 ring-[#6F42C1]/20' : 'border-[#2A2A2F]'} ${data.isLoading ? 'ring-4 ring-[#6366F1]/50 border-[#6366F1] animate-pulse' : ''}`}>
      <div className="flex items-center justify-between px-3 py-2 border-b bg-[#6366F1]/10 rounded-t-lg border-[#2A2A2F]">
        <div className="flex items-center">
          <Film className="w-4 h-4 mr-2 text-[#6366F1]" />
          <span className="text-sm font-medium text-white">Extract Frame</span>
          {data.isLoading && (
            <Loader2 className="ml-2 w-3 h-3 animate-spin text-[#6366F1]" />
          )}
        </div>
        <button
          onClick={onDelete}
          className="p-1 hover:bg-red-900/30 rounded text-gray-600 hover:text-red-600 transition-colors"
          title="Delete node"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
      
      <div className="p-3 space-y-2">
        <div>
          <label className="block text-xs font-medium text-white mb-1">Timestamp</label>
          <input 
            type="text" 
            placeholder="e.g. 50% or 10" 
            className="w-full text-xs border border-gray-300 rounded p-1 bg-white text-black placeholder-gray-400" 
            style={{ color: '#000000' }}
            value={data?.timestamp ?? ''} 
            onChange={onTimestampChange}
            disabled={data.isLoading}
          />
          <p className="text-[10px] text-gray-300 mt-1">Seconds or Percentage (%)</p>
        </div>

        {/* Error Display */}
        {data.error && (
          <div className="mt-2 bg-red-900/20 p-2 rounded text-xs text-red-400 border border-red-800/50">
            {data.error}
          </div>
        )}

        {/* Output Preview */}
        {data.extractedFrameUrl && (
          <div className="mt-2 pt-2 border-t border-[#2A2A2F]">
            <label className="block text-xs font-medium text-gray-300 mb-1">Extracted Frame</label>
            <img 
              src={data.extractedFrameUrl} 
              alt="Extracted frame" 
              className="w-full h-auto rounded border border-[#2A2A2F] max-h-32 object-contain bg-black/20"
            />
          </div>
        )}

        {/* Extract Button */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2A2A2F]">
          <button
            onClick={handleExtract}
            disabled={data.isLoading}
            className="flex items-center gap-2 px-3 py-2 bg-[#6366F1] hover:bg-[#5558E3] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-all"
            title="Extract frame on server"
          >
            {data.isLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <ArrowRight className="w-3 h-3" />
            )}
            <span>{data.isLoading ? 'Extracting...' : 'Extract Frame'}</span>
          </button>
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        id="video_url"
        className="w-3 h-3 bg-red-500 border-2 border-red-500"
        style={{ top: 40 }}
      />
      <div className="absolute left-[-50px] top-[33px] text-[10px] text-gray-400 w-[40px] text-right pointer-events-none">Video</div>

      <Handle
        type="target"
        position={Position.Left}
        id="timestamp"
        className="w-3 h-3 bg-blue-500 border-2 border-blue-500"
        style={{ top: 80 }}
      />
      <div className="absolute left-[-50px] top-[73px] text-[10px] text-gray-400 w-[40px] text-right pointer-events-none">Time</div>

      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="w-3 h-3 bg-green-500 border-2 border-green-500"
      />
    </div>
  );
}
