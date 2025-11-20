import React, { useState, useEffect, useRef } from 'react';
import { Wand2, Layout, RefreshCw, Info, Sparkles, Palette, Ratio, Grid, Maximize, Columns, LayoutGrid, Grid3x3, Save, FileDown, FileText, XCircle, Trash2, Brain, Zap, MessageCircle, CheckCircle } from 'lucide-react';
import { ComicPanel, StylePreset, AspectRatio } from '../types';
import { generateComicScript, generatePanelImage, editPanelImage, improveStoryScript, generateStoryIdea, reviewStoryPlan } from '../services/geminiService';
import Panel from './Panel';
import PanelEditor from './PanelEditor';
import { jsPDF } from 'jspdf';

const STYLES: StylePreset[] = [
  { id: 'manga', name: 'Manga (B&W)', promptModifier: 'manga style, black and white ink, highly detailed, screentones, dynamic action lines', thumbnailColor: '#1a1a1a' },
  { id: 'western', name: 'Western Comic', promptModifier: 'classic american comic book style, bold outlines, vibrant cel shading, halftone patterns, superman style', thumbnailColor: '#2563eb' },
  { id: 'noir', name: 'Film Noir', promptModifier: 'film noir style, high contrast, dramatic shadows, moody, cinematic lighting, monochromatic', thumbnailColor: '#404040' },
  { id: 'watercolor', name: 'Watercolor', promptModifier: 'soft watercolor painting, dreamy atmosphere, pastel colors, artistic textures, ghibli style', thumbnailColor: '#f472b6' },
  { id: 'cyberpunk', name: 'Cyberpunk', promptModifier: 'cyberpunk aesthetic, neon lights, futuristic city, high tech, purple and blue color palette, digital art', thumbnailColor: '#a855f7' },
  { id: 'sketch', name: 'Pencil Sketch', promptModifier: 'rough graphite pencil sketch, textured paper, artistic shading, loose lines, expressive', thumbnailColor: '#78716c' },
];

const LAYOUT_PRESETS = [
  { id: 'splash', label: 'Splash', panels: 1, icon: Maximize, description: 'Single full-page panel' },
  { id: 'strip', label: 'Strip', panels: 3, icon: Columns, description: 'Classic 3-panel row' },
  { id: 'grid', label: 'Grid', panels: 4, icon: LayoutGrid, description: '2x2 Standard grid' },
  { id: 'page', label: 'Page', panels: 6, icon: Grid3x3, description: 'Full 6-panel page' },
];

const ComicMaker: React.FC = () => {
  const [story, setStory] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [panels, setPanels] = useState<ComicPanel[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<StylePreset>(STYLES[1]);
  const [panelCount, setPanelCount] = useState(4);
  const [selectedLayoutId, setSelectedLayoutId] = useState('grid');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [statusMessage, setStatusMessage] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // AI Assist State
  const [isImproving, setIsImproving] = useState(false);
  const [storyReview, setStoryReview] = useState<string | null>(null);
  
  // Navigation State
  const [editingPanelId, setEditingPanelId] = useState<string | null>(null);

  const cancelledRef = useRef(false);

  // --- Auto-Save & Load ---
  useEffect(() => {
    const savedData = localStorage.getItem('inkweaver_draft');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setStory(parsed.story || '');
        setPanels(parsed.panels || []);
        const style = STYLES.find(s => s.id === parsed.selectedStyleId);
        if (style) setSelectedStyle(style);
        setPanelCount(parsed.panelCount || 4);
        setSelectedLayoutId(parsed.selectedLayoutId || 'grid');
        setAspectRatio(parsed.aspectRatio || '1:1');
        setLastSaved(new Date(parsed.timestamp));
      } catch (e) {
        console.error("Failed to load draft", e);
      }
    }
  }, []);

  useEffect(() => {
    if (story || panels.length > 0) {
      const timer = setTimeout(() => {
        saveWork(true);
      }, 5000); // Auto-save every 5s if changes
      return () => clearTimeout(timer);
    }
  }, [story, panels, selectedStyle, panelCount, aspectRatio]);

  const saveWork = (auto: boolean = false) => {
    const data = {
      story,
      panels,
      selectedStyleId: selectedStyle.id,
      panelCount,
      selectedLayoutId,
      aspectRatio,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('inkweaver_draft', JSON.stringify(data));
    setLastSaved(new Date());
    if (!auto) setStatusMessage('Work saved successfully!');
  };

  // --- AI Text Tools ---

  const handleGenerateIdea = async () => {
    setIsImproving(true);
    try {
      const idea = await generateStoryIdea();
      setStory(idea);
      setStoryReview(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsImproving(false);
    }
  };

  const handleImproveScript = async () => {
    if (!story.trim()) return;
    setIsImproving(true);
    try {
      const improved = await improveStoryScript(story);
      setStory(improved);
    } catch (e) {
      console.error(e);
    } finally {
      setIsImproving(false);
    }
  };

  const handleReviewStory = async () => {
    if (!story.trim()) return;
    setIsImproving(true);
    try {
      const review = await reviewStoryPlan(story);
      setStoryReview(review);
    } catch (e) {
      console.error(e);
    } finally {
      setIsImproving(false);
    }
  };


  // --- Generation Logic ---

  const handleGenerateFullComic = async () => {
    if (!story.trim()) return;
    
    setIsGenerating(true);
    setStoryReview(null); // Clear review on generate
    cancelledRef.current = false;
    setStatusMessage('Dreaming up the storyboard...');
    setPanels([]);

    try {
      // 1. Generate Script
      const script = await generateComicScript(story, panelCount, selectedStyle.promptModifier);
      
      if (cancelledRef.current) return;

      const initialPanels: ComicPanel[] = script.map((desc, index) => ({
        id: `panel-${Date.now()}-${index}`,
        order: index,
        description: `${desc}, ${selectedStyle.promptModifier}`,
        imageUrl: null,
        isLoading: true,
        aspectRatio: aspectRatio,
        bubbles: []
      }));
      setPanels(initialPanels);

      // 2. Generate Images
      setStatusMessage('Drawing panels (this takes a moment)...');
      
      for (let i = 0; i < initialPanels.length; i++) {
         if (cancelledRef.current) break;
         const panel = initialPanels[i];
         
         try {
            const imageUrl = await generatePanelImage(panel.description, aspectRatio);
            if (cancelledRef.current) break;
            
            setPanels(prev => prev.map(p => p.id === panel.id ? { ...p, imageUrl, isLoading: false } : p));
         } catch (e) {
             console.error(`Failed to generate panel ${panel.id}`, e);
             setPanels(prev => prev.map(p => p.id === panel.id ? { ...p, isLoading: false } : p));
         }
      }
      
      if (!cancelledRef.current) setStatusMessage('');
      else setStatusMessage('Generation cancelled.');
      
    } catch (error) {
      console.error("Full generation failed", error);
      setStatusMessage('Something went wrong. Please check your API key and try again.');
    } finally {
      setIsGenerating(false);
      cancelledRef.current = false;
    }
  };

  const cancelGeneration = () => {
    cancelledRef.current = true;
    setIsGenerating(false);
    setStatusMessage('Cancelling...');
    setPanels(prev => prev.map(p => ({ ...p, isLoading: false })));
  };

  const handleEditPanelMagic = async (panelId: string, prompt: string) => {
    const panel = panels.find(p => p.id === panelId);
    if (!panel || !panel.imageUrl) return;

    setEditingPanelId(null); // Return to grid view to show loading state
    setPanels(prev => prev.map(p => p.id === panelId ? { ...p, isLoading: true } : p));

    try {
      const newImageUrl = await editPanelImage(panel.imageUrl, prompt);
      setPanels(prev => prev.map(p => p.id === panelId ? { ...p, imageUrl: newImageUrl, isLoading: false } : p));
    } catch (error) {
       console.error("Edit failed", error);
       setPanels(prev => prev.map(p => p.id === panelId ? { ...p, isLoading: false } : p));
       alert("Failed to edit image. Please try again.");
    }
  };

  const handlePanelUpdate = (panelId: string, newImageUrl: string) => {
    setPanels(prev => prev.map(p => p.id === panelId ? { ...p, imageUrl: newImageUrl } : p));
  };

  const handleLayoutSelect = (presetId: string) => {
    const preset = LAYOUT_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setSelectedLayoutId(preset.id);
      setPanelCount(preset.panels);
    }
  };

  // --- Exports ---

  const exportPDF = () => {
    if (panels.length === 0) return;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let y = margin;

    doc.setFontSize(24);
    doc.text("InkWeaver Comic", margin, y + 10);
    y += 25;

    doc.setFontSize(12);
    doc.setTextColor(50);
    const splitStory = doc.splitTextToSize(story, pageWidth - (margin * 2));
    
    if (y + (splitStory.length * 7) > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
    doc.text(splitStory, margin, y);
    y += splitStory.length * 7 + 10;

    panels.forEach((panel, index) => {
      if (panel.imageUrl) {
        const imgProps = doc.getImageProperties(panel.imageUrl);
        const imgRatio = imgProps.width / imgProps.height;
        const availableWidth = pageWidth - (margin * 2);
        const availableHeight = pageHeight - (margin * 2);
        let printWidth = availableWidth;
        let printHeight = printWidth / imgRatio;

        if (printHeight > availableHeight) {
           printHeight = availableHeight;
           printWidth = printHeight * imgRatio;
        }

        if (y + printHeight + 20 > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
        
        try {
            doc.addImage(panel.imageUrl, 'JPEG', margin, y, printWidth, printHeight);
            doc.setDrawColor(0);
            doc.setLineWidth(0.5);
            doc.rect(margin, y, printWidth, printHeight);
            y += printHeight + 15;

        } catch (e) {
            console.error("Error adding image to PDF", e);
        }
      }
    });

    const timestamp = new Date().toISOString().split('T')[0];
    doc.save(`inkweaver-comic-${timestamp}.pdf`);
  };

  const downloadNovel = () => {
    let content = `TITLE: My Comic Story\n\nSTORY:\n${story}\n\n`;
    panels.forEach((p, i) => {
      content += `--- PANEL ${i + 1} ---\n`;
      content += `Visual: ${p.description}\n\n`;
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'comic-script.txt';
    link.click();
  };

  const getGridClass = (count: number) => {
    if (count === 1) return 'grid-cols-1 max-w-2xl mx-auto';
    if (count === 3) return 'grid-cols-1 md:grid-cols-3';
    if (count === 4) return 'grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto';
    if (count === 6) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
    return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
  };

  // --- Render ---

  const activeEditingPanel = panels.find(p => p.id === editingPanelId);

  if (activeEditingPanel) {
      return (
          <div className="h-full">
              <PanelEditor 
                  panel={activeEditingPanel}
                  onSave={handlePanelUpdate}
                  onMagicEdit={handleEditPanelMagic}
                  onClose={() => setEditingPanelId(null)}
              />
          </div>
      );
  }

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto space-y-10">
      
      {/* Toolbar & Status */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-ink-900/50 p-4 rounded-2xl border border-white/5 backdrop-blur-sm sticky top-0 z-30">
         <div className="flex items-center gap-4 text-xs text-ink-400">
            {lastSaved ? (
               <span className="flex items-center gap-1"><Save className="w-3 h-3" /> Saved {lastSaved.toLocaleTimeString()}</span>
            ) : <span>Unsaved</span>}
         </div>

         <div className="flex items-center gap-2">
             <button onClick={() => saveWork()} className="p-2 hover:bg-white/10 rounded-lg text-ink-300 hover:text-white transition-colors" title="Save Work">
                <Save className="w-5 h-5" />
             </button>
             <button onClick={exportPDF} className="p-2 hover:bg-white/10 rounded-lg text-ink-300 hover:text-white transition-colors" title="Export PDF">
                <FileDown className="w-5 h-5" />
             </button>
             <button onClick={downloadNovel} className="p-2 hover:bg-white/10 rounded-lg text-ink-300 hover:text-white transition-colors" title="Download Web Novel">
                <FileText className="w-5 h-5" />
             </button>
             <div className="w-px h-6 bg-white/10 mx-1"></div>
             <button onClick={() => { setPanels([]); setStory(''); localStorage.removeItem('inkweaver_draft'); }} className="p-2 hover:bg-red-500/20 rounded-lg text-ink-300 hover:text-red-400 transition-colors" title="Clear All">
                <Trash2 className="w-5 h-5" />
             </button>
         </div>
      </div>

      {/* Creative Control Center */}
      <div className="glass-panel rounded-3xl p-1 border border-white/10 shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        <div className="relative bg-ink-900/60 backdrop-blur-xl rounded-[20px] p-6 md:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Story Input */}
            <div className="lg:col-span-8 space-y-4">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-bold text-purple-300 uppercase tracking-widest font-bangers text-lg">
                  <Sparkles className="w-4 h-4" /> Your Narrative
                </label>
                
                {/* AI Toolbar */}
                <div className="flex items-center gap-1">
                   <button 
                     onClick={handleGenerateIdea}
                     disabled={isImproving}
                     className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 border border-purple-500/20 transition-all text-xs font-bold uppercase tracking-wide"
                     title="Generate a random creative idea"
                   >
                     <Brain className="w-3 h-3" />
                     Generate Idea
                   </button>
                   <button 
                     onClick={handleImproveScript}
                     disabled={!story.trim() || isImproving}
                     className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 border border-blue-500/20 transition-all text-xs font-bold uppercase tracking-wide disabled:opacity-50"
                     title="Enhance the text for comic adaptation"
                   >
                     <Zap className="w-3 h-3" />
                     Improve
                   </button>
                   <button 
                     onClick={handleReviewStory}
                     disabled={!story.trim() || isImproving}
                     className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-300 hover:bg-green-500/20 border border-green-500/20 transition-all text-xs font-bold uppercase tracking-wide disabled:opacity-50"
                     title="Analyze story potential"
                   >
                     <MessageCircle className="w-3 h-3" />
                     Review
                   </button>
                </div>
              </div>

              {/* AI Review Alert */}
              {storyReview && (
                <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4 relative animate-slide-up">
                    <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                        <div className="space-y-2">
                            <h4 className="text-green-400 font-bold text-sm uppercase tracking-wider">AI Critique</h4>
                            <div className="text-sm text-green-100/80 font-hand leading-relaxed whitespace-pre-wrap">{storyReview}</div>
                        </div>
                        <button 
                            onClick={() => setStoryReview(null)} 
                            className="absolute top-2 right-2 text-green-400 hover:text-green-200"
                        >
                            <XCircle className="w-4 h-4" />
                        </button>
                    </div>
                </div>
              )}

              <div className="relative group/input">
                <div className={`absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur opacity-20 group-hover/input:opacity-50 transition duration-500 ${isImproving ? 'animate-pulse' : ''}`}></div>
                <textarea
                  value={story}
                  onChange={(e) => setStory(e.target.value)}
                  disabled={isImproving}
                  placeholder="Describe your scene... A cyberpunk detective standing in the rain..."
                  className="relative w-full h-40 bg-ink-950 border border-ink-700/50 rounded-xl p-5 text-lg text-white placeholder-ink-600 focus:ring-0 focus:border-purple-500/50 focus:bg-ink-900 transition-all resize-none font-hand tracking-wide leading-relaxed"
                />
                {isImproving && (
                    <div className="absolute bottom-4 right-4 flex items-center gap-2 text-xs text-purple-400 animate-pulse">
                        <Wand2 className="w-3 h-3" />
                        <span>AI Working...</span>
                    </div>
                )}
              </div>
            </div>

            {/* Configuration */}
            <div className="lg:col-span-4 flex flex-col justify-between gap-6">
              
              <div className="space-y-5">
                {/* Style Select */}
                <div className="space-y-2">
                   <label className="flex items-center gap-2 text-xs font-bold text-ink-400 uppercase tracking-widest">
                     <Palette className="w-3 h-3" /> Art Style
                   </label>
                   <div className="relative">
                     <select 
                       value={selectedStyle.id}
                       onChange={(e) => setSelectedStyle(STYLES.find(s => s.id === e.target.value) || STYLES[0])}
                       className="w-full appearance-none bg-ink-950 border border-ink-700 text-white rounded-xl px-4 py-3 pr-10 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all font-medium cursor-pointer hover:bg-ink-900"
                     >
                       {STYLES.map(style => (
                         <option key={style.id} value={style.id}>{style.name}</option>
                       ))}
                     </select>
                     <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-ink-500">
                       <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                     </div>
                   </div>
                </div>

                {/* Layout Selection */}
                <div className="space-y-2">
                    <label className="flex items-center justify-between text-xs font-bold text-ink-400 uppercase tracking-widest">
                       <span className="flex items-center gap-2"><Layout className="w-3 h-3" /> Layout</span>
                       <span className="text-purple-400 font-mono text-[10px]">{panelCount} Panels</span>
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {LAYOUT_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => handleLayoutSelect(preset.id)}
                          className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl border transition-all ${
                            selectedLayoutId === preset.id
                              ? 'bg-purple-500/20 border-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                              : 'bg-ink-950 border-ink-700 text-ink-400 hover:border-ink-500 hover:text-white'
                          }`}
                          title={preset.description}
                        >
                          <preset.icon className={`w-5 h-5 ${selectedLayoutId === preset.id ? 'text-purple-400' : ''}`} />
                          <span className="text-[10px] font-medium uppercase tracking-wider">{preset.label}</span>
                        </button>
                      ))}
                    </div>
                </div>

                {/* Aspect Ratio */}
                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-bold text-ink-400 uppercase tracking-widest">
                      <Ratio className="w-3 h-3" /> Panel Ratio
                    </label>
                    <div className="relative">
                      <select 
                        value={aspectRatio}
                        onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                        className="w-full appearance-none bg-ink-950 border border-ink-700 text-white rounded-xl px-4 py-3 pr-10 focus:ring-2 focus:ring-purple-500/50 outline-none transition-all font-medium cursor-pointer hover:bg-ink-900"
                      >
                        <option value="1:1">Square (1:1)</option>
                        <option value="3:4">Portrait (3:4)</option>
                        <option value="4:3">Landscape (4:3)</option>
                        <option value="16:9">Cinematic (16:9)</option>
                      </select>
                       <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-ink-500">
                         <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                       </div>
                    </div>
                </div>
              </div>

              {isGenerating ? (
                <button
                  onClick={cancelGeneration}
                  className="w-full py-4 rounded-xl font-bangers text-2xl tracking-wider flex items-center justify-center gap-3 shadow-xl transition-all duration-300 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 group/btn"
                >
                  <XCircle className="w-6 h-6 group-hover/btn:scale-110 transition-transform" />
                  <span>Stop Generation</span>
                </button>
              ) : (
                <button
                  onClick={handleGenerateFullComic}
                  disabled={!story.trim()}
                  className={`w-full py-4 rounded-xl font-bangers text-2xl tracking-wider flex items-center justify-center gap-3 shadow-xl transition-all duration-300 relative overflow-hidden group/btn ${
                    !story.trim()
                      ? 'bg-ink-800 text-ink-600 cursor-not-allowed opacity-50'
                      : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-purple-500/25 hover:shadow-purple-500/50 transform hover:-translate-y-1 hover:scale-[1.02]'
                  }`}
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300"></div>
                  <Wand2 className="w-6 h-6" />
                  <span>Create Comic</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      {(statusMessage || isGenerating) && (
        <div className="flex justify-center animate-pop">
           <div className="bg-ink-900/80 backdrop-blur-md text-purple-200 px-6 py-3 rounded-full text-sm font-hand text-lg border border-purple-500/30 flex items-center gap-3 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
             <div className="relative w-3 h-3">
               {isGenerating && <div className="absolute inset-0 bg-purple-400 rounded-full animate-ping"></div>}
               <div className={`absolute inset-0 rounded-full ${isGenerating ? 'bg-purple-400' : 'bg-blue-400'}`}></div>
             </div>
             {statusMessage || (isGenerating ? 'Generating...' : '')}
           </div>
        </div>
      )}

      {/* Comic Grid */}
      {panels.length > 0 && (
        <div className={`grid gap-8 ${getGridClass(panels.length)}`}>
          {panels.map((panel, index) => (
            <div 
              key={panel.id} 
              className="animate-slide-up" 
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <Panel 
                panel={panel} 
                onEditStart={(id) => setEditingPanelId(id)}
              />
            </div>
          ))}
        </div>
      )}

      {panels.length === 0 && !isGenerating && (
        <div className="flex flex-col items-center justify-center py-20 text-ink-600 animate-float">
           <div className="w-24 h-24 rounded-full bg-ink-800/50 flex items-center justify-center mb-6 border-2 border-dashed border-ink-700">
             <Layout className="w-10 h-10 opacity-50" />
           </div>
           <p className="text-2xl font-bangers tracking-wide text-ink-500">The canvas awaits...</p>
           <p className="text-base font-hand text-ink-400 mt-2">Select a layout and cast the spell.</p>
        </div>
      )}
    </div>
  );
};

export default ComicMaker;