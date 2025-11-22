import React, { useState, useRef, useEffect } from 'react';
import { Edit2, Download, Wand2, X, Check, Sliders, Crop, RotateCw, Info, Type, MessageSquare, Cloud, Sidebar, Trash2, ArrowLeft, Sparkles } from 'lucide-react';
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

        {/* Sidebar Controls */}
        <div className="w-full lg:w-[350px] bg-ink-900 border-l border-ink-700 flex flex-col z-20 shadow-2xl">
            <div className="flex border-b border-ink-700 bg-ink-800">
            {['magic', 'text', 'adjust', 'transform'].map((tab) => (
                <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`flex-1 py-4 text-sm font-medium flex items-center justify-center transition-all relative ${activeTab === tab ? 'text-purple-300 bg-ink-900' : 'text-ink-500 hover:text-white hover:bg-ink-800'}`}
                >
                {tab === 'magic' && <Wand2 className="w-5 h-5" />}
                {tab === 'text' && <Type className="w-5 h-5" />}
                {tab === 'adjust' && <Sliders className="w-5 h-5" />}
                {tab === 'transform' && <Crop className="w-5 h-5" />}
                {activeTab === tab && <div className="absolute top-0 left-0 w-full h-1 bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]" />}
                </button>
            ))}
            </div>

            <div className="flex-1 p-6 overflow-y-auto space-y-8 bg-ink-900 custom-scrollbar">
                {activeTab === 'magic' && (
                    <div className="space-y-4 animate-slide-up">
                    <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-500/20 p-4 rounded-2xl text-sm text-purple-200">
                        <p className="flex items-center gap-2 mb-2 font-bold font-bangers tracking-wide text-lg"><Wand2 className="w-4 h-4"/> AI Remix</p>
                        <p className="mb-3 opacity-90">Describe changes to regenerate parts of the image.</p>
                        <p className="text-xs text-purple-300/80 flex items-start gap-2 bg-black/20 p-2 rounded-lg mb-4">
                            <Info className="w-3 h-3 mt-0.5 shrink-0" />
                            <span>Tip: "Make the sky purple", "Add a cat"</span>
                        </p>
                        <button 
                           onClick={() => setMagicPrompt(panel.description)}
                           className="w-full py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors flex items-center justify-center gap-2"
                        >
                           <Sparkles className="w-3 h-3" /> Use Original Description
                        </button>
                    </div>
                    <textarea
                        value={magicPrompt}
                        onChange={(e) => setMagicPrompt(e.target.value)}
                        placeholder="What would you like to change?"
                        className="w-full h-32 bg-ink-950 border border-ink-700 rounded-xl p-4 text-white placeholder-ink-600 focus:ring-2 focus:ring-purple-500 outline-none resize-none font-hand text-lg"
                    />
                    <button
                        onClick={handleMagicSubmit}
                        disabled={!magicPrompt.trim()}
                        className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
                    >
                        <Wand2 className="w-4 h-4" /> Cast Spell
                    </button>
                    </div>
                )}

                {activeTab === 'text' && (
                    <div className="space-y-6 animate-slide-up">
                    <div className="grid grid-cols-3 gap-3">
                        <button onClick={() => addBubble('speech')} className="group flex flex-col items-center gap-2 p-3 bg-ink-800 hover:bg-ink-700 rounded-xl text-ink-300 hover:text-white transition-colors border border-transparent hover:border-white/10">
                        <MessageSquare className="w-6 h-6 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-medium">Speech</span>
                        </button>
                        <button onClick={() => addBubble('thought')} className="group flex flex-col items-center gap-2 p-3 bg-ink-800 hover:bg-ink-700 rounded-xl text-ink-300 hover:text-white transition-colors border border-transparent hover:border-white/10">
                        <Cloud className="w-6 h-6 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-medium">Thought</span>
                        </button>
                        <button onClick={() => addBubble('caption')} className="group flex flex-col items-center gap-2 p-3 bg-ink-800 hover:bg-ink-700 rounded-xl text-ink-300 hover:text-white transition-colors border border-transparent hover:border-white/10">
                        <Sidebar className="w-6 h-6 rotate-90 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-medium">Caption</span>
                        </button>
                    </div>

                    <div className="border-t border-ink-800 pt-6">
                        {selectedBubble ? (
                        <div className="space-y-4">
                            <label className="block text-xs font-bold text-ink-400 uppercase tracking-widest">
                            Bubble Content
                            </label>
                            <textarea
                            value={selectedBubble.text}
                            onChange={(e) => updateBubbleText(selectedBubble.id, e.target.value)}
                            className="w-full h-28 bg-ink-950 border border-ink-700 rounded-xl p-4 text-white focus:ring-2 focus:ring-purple-500 outline-none resize-none font-comic text-sm"
                            placeholder="Type dialogue here..."
                            />
                            <button
                            onClick={() => removeBubble(selectedBubble.id)}
                            className="w-full py-3 flex items-center justify-center gap-2 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl transition-colors text-sm font-medium border border-red-500/20"
                            >
                            <Trash2 className="w-4 h-4" /> Remove Bubble
                            </button>
                        </div>
                        ) : (
                        <div className="flex flex-col items-center justify-center py-10 text-ink-600 border-2 border-dashed border-ink-800 rounded-xl">
                            <Type className="w-8 h-8 mb-2 opacity-50" />
                            <span className="text-sm font-hand text-lg">Select a bubble to edit</span>
                        </div>
                        )}
                    </div>
                    </div>
                )}

                {(activeTab === 'adjust' || activeTab === 'transform') && (
                    <div className="space-y-6 animate-slide-up">
                            {activeTab === 'adjust' && (
                                <>
                                {['brightness', 'contrast', 'saturation'].map((adj) => (
                                    <div key={adj}>
                                        <label className="flex justify-between text-xs font-bold text-ink-400 uppercase tracking-widest mb-3">
                                            <span>{adj}</span>
                                            <span className="text-purple-400 font-mono">{adjustments[adj as keyof typeof adjustments]}%</span>
                                        </label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="200"
                                            value={adjustments[adj as keyof typeof adjustments]}
                                            onChange={(e) => setAdjustments({ ...adjustments, [adj]: Number(e.target.value) })}
                                            className="w-full h-2 bg-ink-950 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                        />
                                    </div>
                                ))}
                                </>
                            )}
                            {activeTab === 'transform' && (
                                <>
                                <div>
                                    <label className="flex justify-between text-xs font-bold text-ink-400 uppercase tracking-widest mb-3">
                                        <span>Zoom</span>
                                        <span className="text-purple-400 font-mono">{Math.round(transform.zoom * 100)}%</span>
                                    </label>
                                    <input
                                        type="range"
                                        min="1"
                                        max="3"
                                        step="0.1"
                                        value={transform.zoom}
                                        onChange={(e) => setTransform({ ...transform, zoom: Number(e.target.value) })}
                                        className="w-full h-2 bg-ink-950 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                    />
                                </div>
                                <div>
                                    <label className="flex justify-between text-xs font-bold text-ink-400 uppercase tracking-widest mb-3">
                                        <span>Rotation</span>
                                        <span className="text-purple-400 font-mono">{transform.rotation}°</span>
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="range"
                                            min="-180"
                                            max="180"
                                            value={transform.rotation}
                                            onChange={(e) => setTransform({ ...transform, rotation: Number(e.target.value) })}
                                            className="flex-1 h-2 bg-ink-950 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                        />
                                        <button 
                                            onClick={() => setTransform({...transform, rotation: (transform.rotation + 90) % 360})}
                                            className="p-2 bg-ink-800 rounded-lg hover:bg-ink-700 text-white transition-colors"
                                        >
                                            <RotateCw className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                {['panX', 'panY'].map((pan) => (
                                    <div key={pan}>
                                        <label className="flex justify-between text-xs font-bold text-ink-400 uppercase tracking-widest mb-3">
                                            <span>{pan === 'panX' ? 'Horizontal Pan' : 'Vertical Pan'}</span>
                                            <span className="text-purple-400 font-mono">{transform[pan as keyof typeof transform]}px</span>
                                        </label>
                                        <input
                                            type="range"
                                            min="-250"
                                            max="250"
                                            value={transform[pan as keyof typeof transform]}
                                            onChange={(e) => setTransform({ ...transform, [pan]: Number(e.target.value) })}
                                            className="w-full h-2 bg-ink-950 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                        />
                                    </div>
                                ))}
                                </>
                            )}
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default PanelEditor;