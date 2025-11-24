import React, { useState, useRef, useEffect } from 'react';
import { Edit2, Download, Wand2, X, Check, Sliders, Crop, RotateCw, Info, Type, MessageSquare, Cloud, Sidebar, Trash2, ArrowLeft, Sparkles, RefreshCw } from 'lucide-react';
import { ComicPanel, TextBubble } from '../types';

interface PanelEditorProps {
  panel: ComicPanel;
  onSave: (id: string, newImageUrl: string) => void;
  onMagicEdit: (id: string, prompt: string) => void;
  onClose: () => void;
}

const PanelEditor: React.FC<PanelEditorProps> = ({ panel, onSave, onMagicEdit, onClose }) => {
  const [activeTab, setActiveTab] = useState<'magic' | 'adjust' | 'transform' | 'text'>('magic');
  const [magicPrompt, setMagicPrompt] = useState('');
  
  // Adjustment State
  const [adjustments, setAdjustments] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100,
  });

  // Transform State
  const [transform, setTransform] = useState({
    rotation: 0,
    zoom: 1,
    panX: 0,
    panY: 0,
    outputScale: 100,
  });

  // Bubbles State
  const [bubbles, setBubbles] = useState<TextBubble[]>(panel.bubbles || []);
  const [selectedBubbleId, setSelectedBubbleId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<string | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // --- Canvas Helper Functions ---
  const wrapText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
    const words = text.split(' ');
    let line = '';
    let testLine = '';
    let lineArray = [];

    for(let n = 0; n < words.length; n++) {
      testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        lineArray.push(line);
        line = words[n] + ' ';
      } else {
        line = testLine;
      }
    }
    lineArray.push(line);

    const totalHeight = lineArray.length * lineHeight;
    let startY = y - (totalHeight / 2) + (lineHeight / 2); 

    for (let k = 0; k < lineArray.length; k++) {
        ctx.fillText(lineArray[k], x, startY + (k * lineHeight));
    }
  };

  const drawBubbleOnCanvas = (ctx: CanvasRenderingContext2D, bubble: TextBubble) => {
      ctx.save();
      
      ctx.fillStyle = bubble.type === 'caption' ? '#FEF9C3' : '#FFFFFF'; 
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;

      const cx = bubble.x + bubble.width / 2;
      const cy = bubble.y + bubble.height / 2;
      const rx = bubble.width / 2;
      const ry = bubble.height / 2;

      ctx.beginPath();
      
      if (bubble.type === 'caption') {
          ctx.rect(bubble.x, bubble.y, bubble.width, bubble.height);
      } else if (bubble.type === 'thought') {
          ctx.setLineDash([5, 5]);
          ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
      } else {
          ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
      }

      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]); 

      ctx.fillStyle = '#000000';
      ctx.font = `bold ${Math.max(12, bubble.height / 6)}px "Comic Sans MS", cursive, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      wrapText(ctx, bubble.text, cx, cy, bubble.width * 0.8, Math.max(14, bubble.height / 5));

      ctx.restore();
  };

  const handleManualSave = async () => {
    if (!panel.imageUrl) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = panel.imageUrl;
    
    await new Promise((resolve) => {
      img.onload = resolve;
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const previewWidth = 500;
    const ratioParts = panel.aspectRatio.split(':').map(Number);
    const ratioVal = ratioParts[0] / ratioParts[1];
    const previewHeight = previewWidth / ratioVal;

    const outputW = previewWidth * (transform.outputScale / 100);
    const outputH = previewHeight * (transform.outputScale / 100);

    canvas.width = outputW;
    canvas.height = outputH;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(transform.outputScale / 100, transform.outputScale / 100);
    ctx.beginPath();
    ctx.rect(0, 0, previewWidth, previewHeight);
    ctx.clip();

    ctx.translate(previewWidth / 2, previewHeight / 2);
    ctx.filter = `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%)`;
    ctx.translate(transform.panX, transform.panY);
    ctx.scale(transform.zoom, transform.zoom);
    ctx.rotate((transform.rotation * Math.PI) / 180);
    
    const imgRatio = img.width / img.height;
    const containerRatio = previewWidth / previewHeight;
    
    let drawW, drawH;
    if (imgRatio > containerRatio) {
      drawH = previewHeight;
      drawW = drawH * imgRatio;
    } else {
      drawW = previewWidth;
      drawH = drawW / imgRatio;
    }

    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    ctx.save();
    ctx.scale(transform.outputScale / 100, transform.outputScale / 100);
    bubbles.forEach(bubble => {
      drawBubbleOnCanvas(ctx, bubble);
    });
    ctx.restore();

    const newUrl = canvas.toDataURL('image/jpeg', 0.95);
    onSave(panel.id, newUrl);
    onClose();
  };

  // --- Bubble Interactions ---

  const addBubble = (type: 'speech' | 'thought' | 'caption') => {
    const newBubble: TextBubble = {
      id: Date.now().toString(),
      type,
      text: type === 'caption' ? 'Meanwhile...' : 'Hey!',
      x: 50,
      y: 50,
      width: 150,
      height: type === 'caption' ? 60 : 100
    };
    setBubbles([...bubbles, newBubble]);
    setSelectedBubbleId(newBubble.id);
  };

  const removeBubble = (id: string) => {
    setBubbles(bubbles.filter(b => b.id !== id));
    if (selectedBubbleId === id) setSelectedBubbleId(null);
  };

  const updateBubbleText = (id: string, text: string) => {
    setBubbles(bubbles.map(b => b.id === id ? { ...b, text } : b));
  };

  const handleBubbleMouseDown = (e: React.MouseEvent, id: string, direction: string | null = null) => {
    e.stopPropagation();
    setSelectedBubbleId(id);
    if (direction) {
      setResizeDirection(direction);
      setIsDragging(false);
    } else {
      setIsDragging(true);
      setResizeDirection(null);
    }
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleGlobalMouseMove = (e: MouseEvent) => {
    if (!selectedBubbleId) return;
    if (!isDragging && !resizeDirection) return;

    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;
    dragStartRef.current = { x: e.clientX, y: e.clientY };

    setBubbles(prev => prev.map(b => {
      if (b.id !== selectedBubbleId) return b;

      if (resizeDirection) {
        let { x, y, width, height } = b;
        const minSize = 30;

        if (resizeDirection.includes('e')) {
          width = Math.max(minSize, width + deltaX);
        }
        if (resizeDirection.includes('w')) {
          const oldWidth = width;
          width = Math.max(minSize, width - deltaX);
          x += (oldWidth - width);
        }
        if (resizeDirection.includes('s')) {
          height = Math.max(minSize, height + deltaY);
        }
        if (resizeDirection.includes('n')) {
          const oldHeight = height;
          height = Math.max(minSize, height - deltaY);
          y += (oldHeight - height);
        }
        
        return { ...b, x, y, width, height };
      } else {
         return { ...b, x: b.x + deltaX, y: b.y + deltaY };
      }
    }));
  };

  const handleGlobalMouseUp = () => {
    setIsDragging(false);
    setResizeDirection(null);
  };

  useEffect(() => {
    if (isDragging || resizeDirection) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    } else {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, resizeDirection, selectedBubbleId]);

  // --- AI Remix Handlers ---
  const handleUseOriginalPrompt = () => {
    setMagicPrompt(panel.description);
  };

  const handleRegenerate = () => {
    onMagicEdit(panel.id, panel.description);
    onClose();
  };

  const handleMagicSubmit = () => {
      if (!magicPrompt.trim()) return;
      onMagicEdit(panel.id, magicPrompt);
      onClose(); // Close to show loading state in grid
  };

  // Dimensions
  const previewW = 500;
  const ratioParts = panel.aspectRatio.split(':').map(Number);
  const previewH = previewW / (ratioParts[0] / ratioParts[1]);
  const selectedBubble = bubbles.find(b => b.id === selectedBubbleId);

  return (
    <div className="h-full flex flex-col bg-ink-950 animate-slide-up">
      {/* Header */}
      <div className="h-16 border-b border-ink-700 flex items-center justify-between px-6 bg-ink-900">
          <div className="flex items-center gap-4">
              <button onClick={onClose} className="p-2 hover:bg-ink-800 rounded-full text-ink-400 hover:text-white transition-colors">
                  <ArrowLeft className="w-6 h-6" />
              </button>
              <h2 className="font-bangers text-xl text-white tracking-wide">Panel Editor</h2>
          </div>
          <div className="flex gap-3">
              <button 
                  onClick={handleManualSave}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium flex items-center gap-2 shadow-lg shadow-purple-500/20 hover:scale-105 transition-transform"
              >
                  <Check className="w-4 h-4" /> Save Changes
              </button>
          </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Canvas Area */}
        <div className="flex-1 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-ink-950 relative overflow-auto flex items-center justify-center p-8" onClick={() => setSelectedBubbleId(null)}>
            <div 
                ref={containerRef}
                className="relative shadow-[0_0_50px_rgba(0,0,0,0.5)] border-[8px] border-white bg-white overflow-hidden shrink-0"
                style={{
                    width: `${previewW}px`,
                    height: `${previewH}px`,
                }}
            >
                 {panel.imageUrl ? (
                    <img 
                    src={panel.imageUrl} 
                    alt="Editing" 
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none origin-center" 
                    style={{
                        filter: `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%)`,
                        transform: `translate(${transform.panX}px, ${transform.panY}px) scale(${transform.zoom}) rotate(${transform.rotation}deg)`
                    }}
                    />
                 ) : (
                     <div className="absolute inset-0 flex items-center justify-center text-ink-900">No Image</div>
                 )}

                {bubbles.map((bubble) => (
                <div
                    key={bubble.id}
                    onMouseDown={(e) => handleBubbleMouseDown(e, bubble.id)}
                    className={`absolute cursor-move flex items-center justify-center text-center leading-tight p-2 select-none ${selectedBubbleId === bubble.id ? 'z-50' : 'z-10'}`}
                    style={{
                        left: `${bubble.x}px`,
                        top: `${bubble.y}px`,
                        width: `${bubble.width}px`,
                        height: `${bubble.height}px`,
                        backgroundColor: bubble.type === 'caption' ? '#FEF9C3' : '#FFFFFF',
                        color: 'black',
                        border: selectedBubbleId === bubble.id ? '2px dashed #A855F7' : '2px solid black',
                        borderRadius: bubble.type === 'caption' ? '0px' : '50%',
                        borderStyle: bubble.type === 'thought' ? 'dashed' : selectedBubbleId === bubble.id ? 'dashed' : 'solid',
                        fontFamily: '"Comic Sans MS", "Chalkboard SE", sans-serif',
                        fontSize: `${Math.max(10, bubble.height / 6)}px`,
                        boxShadow: '4px 4px 0px rgba(0,0,0,0.2)'
                    }}
                >
                    {bubble.text}
                    {selectedBubbleId === bubble.id && (
                        <>
                           {/* Corner Handles */}
                           <div onMouseDown={(e) => handleBubbleMouseDown(e, bubble.id, 'nw')} className="absolute top-0 left-0 w-4 h-4 bg-purple-500 border-2 border-white rounded-full -translate-x-1/2 -translate-y-1/2 cursor-nw-resize z-50 shadow-md" />
                           <div onMouseDown={(e) => handleBubbleMouseDown(e, bubble.id, 'ne')} className="absolute top-0 right-0 w-4 h-4 bg-purple-500 border-2 border-white rounded-full translate-x-1/2 -translate-y-1/2 cursor-ne-resize z-50 shadow-md" />
                           <div onMouseDown={(e) => handleBubbleMouseDown(e, bubble.id, 'sw')} className="absolute bottom-0 left-0 w-4 h-4 bg-purple-500 border-2 border-white rounded-full -translate-x-1/2 translate-y-1/2 cursor-sw-resize z-50 shadow-md" />
                           <div onMouseDown={(e) => handleBubbleMouseDown(e, bubble.id, 'se')} className="absolute bottom-0 right-0 w-4 h-4 bg-purple-500 border-2 border-white rounded-full translate-x-1/2 translate-y-1/2 cursor-se-resize z-50 shadow-md" />
                           
                           {/* Edge Handles */}
                           <div onMouseDown={(e) => handleBubbleMouseDown(e, bubble.id, 'n')} className="absolute top-0 left-1/2 w-4 h-4 bg-purple-500 border-2 border-white rounded-full -translate-x-1/2 -translate-y-1/2 cursor-n-resize z-50 shadow-md" />
                           <div onMouseDown={(e) => handleBubbleMouseDown(e, bubble.id, 's')} className="absolute bottom-0 left-1/2 w-4 h-4 bg-purple-500 border-2 border-white rounded-full -translate-x-1/2 translate-y-1/2 cursor-s-resize z-50 shadow-md" />
                           <div onMouseDown={(e) => handleBubbleMouseDown(e, bubble.id, 'w')} className="absolute top-1/2 left-0 w-4 h-4 bg-purple-500 border-2 border-white rounded-full -translate-x-1/2 -translate-y-1/2 cursor-w-resize z-50 shadow-md" />
                           <div onMouseDown={(e) => handleBubbleMouseDown(e, bubble.id, 'e')} className="absolute top-1/2 right-0 w-4 h-4 bg-purple-500 border-2 border-white rounded-full translate-x-1/2 -translate-y-1/2 cursor-e-resize z-50 shadow-md" />
                        </>
                    )}
                </div>
                ))}
            </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-96 bg-ink-900 border-l border-ink-700 flex flex-col h-[50vh] lg:h-full">
            {/* Tabs */}
            <div className="flex border-b border-ink-700">
                <button onClick={() => setActiveTab('magic')} className={`flex-1 p-4 flex justify-center ${activeTab === 'magic' ? 'text-purple-400 border-b-2 border-purple-400 bg-ink-800' : 'text-ink-400 hover:text-white'}`}><Wand2 className="w-5 h-5" /></button>
                <button onClick={() => setActiveTab('text')} className={`flex-1 p-4 flex justify-center ${activeTab === 'text' ? 'text-purple-400 border-b-2 border-purple-400 bg-ink-800' : 'text-ink-400 hover:text-white'}`}><Type className="w-5 h-5" /></button>
                <button onClick={() => setActiveTab('adjust')} className={`flex-1 p-4 flex justify-center ${activeTab === 'adjust' ? 'text-purple-400 border-b-2 border-purple-400 bg-ink-800' : 'text-ink-400 hover:text-white'}`}><Sliders className="w-5 h-5" /></button>
                <button onClick={() => setActiveTab('transform')} className={`flex-1 p-4 flex justify-center ${activeTab === 'transform' ? 'text-purple-400 border-b-2 border-purple-400 bg-ink-800' : 'text-ink-400 hover:text-white'}`}><Crop className="w-5 h-5" /></button>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 overflow-y-auto">
                
                {activeTab === 'magic' && (
                    <div className="space-y-6 animate-slide-up">
                        <div className="space-y-2">
                             <div className="flex items-center justify-between">
                                <label className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-purple-400" /> AI Remix
                                </label>
                             </div>
                             <p className="text-xs text-ink-400">Describe changes you want to see in this panel.</p>
                        </div>
                        <textarea
                            value={magicPrompt}
                            onChange={(e) => setMagicPrompt(e.target.value)}
                            placeholder="Make it raining, change background to sunset..."
                            className="w-full h-32 bg-ink-950 border border-ink-700 rounded-xl p-4 text-white focus:ring-2 focus:ring-purple-500/50 outline-none resize-none font-hand text-lg"
                        />
                         <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={handleUseOriginalPrompt}
                                className="px-4 py-3 bg-ink-800 hover:bg-ink-700 text-ink-300 rounded-xl font-medium transition-colors text-xs flex items-center justify-center gap-2 border border-ink-700"
                            >
                                <Info className="w-3 h-3" /> Use Prompt
                            </button>
                             <button
                                onClick={handleRegenerate}
                                className="px-4 py-3 bg-blue-900/30 hover:bg-blue-900/50 text-blue-300 rounded-xl font-medium transition-colors text-xs flex items-center justify-center gap-2 border border-blue-500/30"
                            >
                                <RefreshCw className="w-3 h-3" /> Regenerate
                            </button>
                        </div>
                        <button
                            onClick={handleMagicSubmit}
                            disabled={!magicPrompt.trim()}
                            className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-bangers tracking-wide text-lg shadow-lg hover:shadow-purple-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Generate Edit
                        </button>
                    </div>
                )}

                {activeTab === 'text' && (
                    <div className="space-y-6 animate-slide-up">
                         <div className="grid grid-cols-3 gap-3">
                             <button onClick={() => addBubble('speech')} className="flex flex-col items-center gap-2 p-3 bg-ink-800 rounded-xl hover:bg-ink-700 transition-colors border border-ink-700 hover:border-purple-500/50">
                                 <MessageSquare className="w-6 h-6 text-white" />
                                 <span className="text-[10px] uppercase font-bold text-ink-400">Speech</span>
                             </button>
                             <button onClick={() => addBubble('thought')} className="flex flex-col items-center gap-2 p-3 bg-ink-800 rounded-xl hover:bg-ink-700 transition-colors border border-ink-700 hover:border-purple-500/50">
                                 <Cloud className="w-6 h-6 text-white" />
                                 <span className="text-[10px] uppercase font-bold text-ink-400">Thought</span>
                             </button>
                             <button onClick={() => addBubble('caption')} className="flex flex-col items-center gap-2 p-3 bg-ink-800 rounded-xl hover:bg-ink-700 transition-colors border border-ink-700 hover:border-purple-500/50">
                                 <Sidebar className="w-6 h-6 text-white" />
                                 <span className="text-[10px] uppercase font-bold text-ink-400">Caption</span>
                             </button>
                         </div>

                         {selectedBubble ? (
                             <div className="space-y-3 bg-ink-800/50 p-4 rounded-xl border border-ink-700">
                                 <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold text-ink-400 uppercase">Edit Text</label>
                                    <button onClick={() => removeBubble(selectedBubble.id)} className="text-red-400 hover:text-red-300 p-1">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                 </div>
                                 <textarea
                                    value={selectedBubble.text}
                                    onChange={(e) => updateBubbleText(selectedBubble.id, e.target.value)}
                                    className="w-full h-24 bg-ink-950 border border-ink-700 rounded-lg p-3 text-white focus:border-purple-500 outline-none resize-none font-comic"
                                 />
                             </div>
                         ) : (
                             <div className="text-center text-ink-500 py-8 text-sm">
                                 Select a bubble to edit text
                             </div>
                         )}
                    </div>
                )}

                {activeTab === 'adjust' && (
                    <div className="space-y-6 animate-slide-up">
                        <div className="space-y-4">
                            <label className="text-sm font-bold text-ink-300 flex justify-between">
                                Brightness <span>{adjustments.brightness}%</span>
                            </label>
                            <input 
                                type="range" min="0" max="200" 
                                value={adjustments.brightness}
                                onChange={(e) => setAdjustments({...adjustments, brightness: Number(e.target.value)})}
                                className="w-full accent-purple-500 h-2 bg-ink-800 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                        <div className="space-y-4">
                            <label className="text-sm font-bold text-ink-300 flex justify-between">
                                Contrast <span>{adjustments.contrast}%</span>
                            </label>
                            <input 
                                type="range" min="0" max="200" 
                                value={adjustments.contrast}
                                onChange={(e) => setAdjustments({...adjustments, contrast: Number(e.target.value)})}
                                className="w-full accent-purple-500 h-2 bg-ink-800 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                        <div className="space-y-4">
                            <label className="text-sm font-bold text-ink-300 flex justify-between">
                                Saturation <span>{adjustments.saturation}%</span>
                            </label>
                            <input 
                                type="range" min="0" max="200" 
                                value={adjustments.saturation}
                                onChange={(e) => setAdjustments({...adjustments, saturation: Number(e.target.value)})}
                                className="w-full accent-purple-500 h-2 bg-ink-800 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'transform' && (
                     <div className="space-y-6 animate-slide-up">
                        <div className="space-y-4">
                            <label className="text-sm font-bold text-ink-300 flex justify-between">
                                <span className="flex items-center gap-2"><RotateCw className="w-4 h-4"/> Rotation</span> 
                                <span>{transform.rotation}°</span>
                            </label>
                            <input 
                                type="range" min="-180" max="180" 
                                value={transform.rotation}
                                onChange={(e) => setTransform({...transform, rotation: Number(e.target.value)})}
                                className="w-full accent-purple-500 h-2 bg-ink-800 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                        <div className="space-y-4">
                            <label className="text-sm font-bold text-ink-300 flex justify-between">
                                Zoom <span>{transform.zoom}x</span>
                            </label>
                            <input 
                                type="range" min="0.5" max="3" step="0.1"
                                value={transform.zoom}
                                onChange={(e) => setTransform({...transform, zoom: Number(e.target.value)})}
                                className="w-full accent-purple-500 h-2 bg-ink-800 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                        <div className="pt-4 border-t border-ink-700">
                             <div className="space-y-2">
                                <label className="text-xs font-bold text-ink-400 uppercase">Pan Image</label>
                                <div className="grid grid-cols-2 gap-4">
                                     <input 
                                        type="range" min="-200" max="200"
                                        value={transform.panX}
                                        onChange={(e) => setTransform({...transform, panX: Number(e.target.value)})}
                                        className="w-full accent-blue-500 h-1 bg-ink-800 rounded-lg appearance-none cursor-pointer"
                                        title="Pan X"
                                    />
                                     <input 
                                        type="range" min="-200" max="200"
                                        value={transform.panY}
                                        onChange={(e) => setTransform({...transform, panY: Number(e.target.value)})}
                                        className="w-full accent-blue-500 h-1 bg-ink-800 rounded-lg appearance-none cursor-pointer"
                                        title="Pan Y"
                                    />
                                </div>
                             </div>
                        </div>
                     </div>
                )}

            </div>
        </div>
      </div>
    </div>
  );
};

export default PanelEditor;