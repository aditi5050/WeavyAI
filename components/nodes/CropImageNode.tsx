import React, { useCallback, useEffect } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { Crop, Trash2, Loader2, ArrowRight } from 'lucide-react';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useWorkflowRuntimeStore } from '@/stores/workflowRuntimeStore';

export function CropImageNode({ id, data, selected }: NodeProps) {
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
            croppedImageUrl: newUrl, 
            isLoading: false,
            error: null
        });
      }
    } else if (nodeStatuses[id] === 'FAILED') {
        // Check for specific error message in outputs if available
        const errorMsg = nodeOutputs[id]?.error || 'Crop failed on server';
        updateData({ isLoading: false, error: errorMsg });
    }
  }, [nodeStatuses, nodeOutputs, id, updateData]);

  const onParamChange = useCallback((evt: React.ChangeEvent<HTMLInputElement>) => {
    updateData({ [evt.target.name]: parseInt(evt.target.value) || 0 });
  }, [updateData]);

  const onDelete = useCallback(() => {
    deleteThisNode();
  }, [deleteThisNode]);

  // Get input image from connected source node
  const getInputImage = useCallback(() => {
    const nodes = getNodes();
    const edges = getEdges();
    
    // Find edges where this node is the target
    for (const edge of edges) {
      if (edge.target === id) {
        const sourceNode = nodes.find(n => n.id === edge.source) as any;
        if (!sourceNode) continue;
        
        // Check for image data from various node types
        if (sourceNode.type === 'image' && sourceNode.data) {
          return sourceNode.data.imageBase64 || sourceNode.data.imageUrl;
        }
        if (sourceNode.type === 'crop' && sourceNode.data?.croppedImageUrl) {
          return sourceNode.data.croppedImageUrl;
        }
        if (sourceNode.type === 'extract' && sourceNode.data?.extractedFrameUrl) {
          return sourceNode.data.extractedFrameUrl;
        }
      }
    }
    return null;
  }, [id, getNodes, getEdges]);

  const handleRun = useCallback(async () => {
    if (!data) return;
    
    const inputImage = getInputImage();
    if (!inputImage) {
        updateData({
          error: 'No input image connected. Connect an image node.',
          isLoading: false,
        });
        return;
    }

    updateData({ isLoading: true, error: null, croppedImageUrl: null });

    // Parse as numbers and clamp to valid ranges
    let xPercent = Number(data.x_percent) || 0;
    let yPercent = Number(data.y_percent) || 0;
    let widthPercent = Number(data.width_percent) || 100;
    let heightPercent = Number(data.height_percent) || 100;

    // Clamp values
    xPercent = Math.max(0, Math.min(100, xPercent));
    yPercent = Math.max(0, Math.min(100, yPercent));
    widthPercent = Math.max(1, widthPercent);
    heightPercent = Math.max(1, heightPercent);

    if (xPercent + widthPercent > 100) widthPercent = 100 - xPercent;
    if (yPercent + heightPercent > 100) heightPercent = 100 - yPercent;

    // Save config
    updateData({
        x_percent: xPercent,
        y_percent: yPercent,
        width_percent: widthPercent,
        height_percent: heightPercent
    });

    // Save workflow to DB first so backend has latest config
    await saveToDatabase();

    // Trigger server-side execution via Trigger.dev
    await startSingleNodeRun(workflowId, id, {
        image: inputImage, // Pass input image explicitly to override any stale upstream data if needed
    });

  }, [data, updateData, getInputImage, saveToDatabase, startSingleNodeRun, workflowId, id]);

  if (!data) return null;

  return (
    <div className={`relative bg-[#1A1A23] rounded-lg shadow-lg border w-64 ${selected ? 'border-[#6F42C1] ring-2 ring-[#6F42C1]/20' : 'border-[#2A2A2F]'} ${data.isLoading ? 'ring-4 ring-[#FBBF24]/50 border-[#FBBF24] animate-pulse' : ''}`}>
      <div className="flex items-center justify-between px-3 py-2 border-b bg-[#FBBF24]/10 rounded-t-lg border-[#2A2A2F]">
        <div className="flex items-center">
          <Crop className="w-4 h-4 mr-2 text-[#FBBF24]" />
          <span className="text-sm font-medium text-white">Crop Image</span>
          {data.isLoading && (
            <Loader2 className="ml-2 w-3 h-3 animate-spin text-[#FBBF24]" />
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
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-white">X (%)</label>
            <input type="number" name="x_percent" className="w-full text-xs border border-gray-300 rounded p-1 bg-white text-black placeholder-gray-400" style={{ color: '#000000' }} value={data?.x_percent ?? 0} onChange={onParamChange} disabled={data.isLoading} />
          </div>
          <div>
            <label className="block text-xs font-medium text-white">Y (%)</label>
            <input type="number" name="y_percent" className="w-full text-xs border border-gray-300 rounded p-1 bg-white text-black placeholder-gray-400" style={{ color: '#000000' }} value={data?.y_percent ?? 0} onChange={onParamChange} disabled={data.isLoading} />
          </div>
          <div>
            <label className="block text-xs font-medium text-white">Width (%)</label>
            <input type="number" name="width_percent" className="w-full text-xs border border-gray-300 rounded p-1 bg-white text-black placeholder-gray-400" style={{ color: '#000000' }} value={data?.width_percent ?? 100} onChange={onParamChange} disabled={data.isLoading} />
          </div>
          <div>
            <label className="block text-xs font-medium text-white">Height (%)</label>
            <input type="number" name="height_percent" className="w-full text-xs border border-gray-300 rounded p-1 bg-white text-black placeholder-gray-400" style={{ color: '#000000' }} value={data?.height_percent ?? 100} onChange={onParamChange} disabled={data.isLoading} />
          </div>
        </div>

        {/* Error Display */}
        {data.error && (
          <div className="mt-2 bg-red-900/20 p-2 rounded text-xs text-red-400 border border-red-800/50">
            {data.error}
          </div>
        )}

        {/* Output Preview */}
        {data.croppedImageUrl && (
          <div className="mt-2 pt-2 border-t border-[#2A2A2F]">
            <label className="block text-xs font-medium text-gray-300 mb-1">Output</label>
            <img 
              src={data.croppedImageUrl} 
              alt="Cropped output" 
              className="w-full h-auto rounded border border-[#2A2A2F] max-h-32 object-contain bg-black/20"
            />
          </div>
        )}

        {/* Run Button */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2A2A2F]">
          <button
            onClick={handleRun}
            disabled={data.isLoading}
            className="flex items-center gap-2 px-3 py-2 bg-[#FBBF24] hover:bg-[#F59E0B] disabled:opacity-50 disabled:cursor-not-allowed text-black text-xs font-medium rounded-lg transition-all"
            title="Crop image on server"
          >
            {data.isLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <ArrowRight className="w-3 h-3" />
            )}
            <span>{data.isLoading ? 'Cropping...' : 'Run Crop'}</span>
          </button>
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        id="image_url"
        className="w-3 h-3 bg-green-500 border-2 border-green-500"
      />
      <div className="absolute left-[-50px] top-[40px] text-[10px] text-gray-400 w-[40px] text-right pointer-events-none">Image</div>

      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="w-3 h-3 bg-green-500 border-2 border-green-500"
      />
    </div>
  );
}
