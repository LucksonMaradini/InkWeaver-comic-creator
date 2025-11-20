import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, ScanSearch, Sparkles, Terminal } from 'lucide-react';
import { analyzeUploadedImage } from '../services/geminiService';

// --- Markdown Renderer Helper ---
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split('\n');
  
  // Helper to parse inline styles like **bold** and *italic*
  const formatInline = (text: string) => {
    // Split by bold markers first
    const parts = text.split(/(\*\*.*?\*\*)/g);
    
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx} className="text-purple-300 font-bold tracking-wide drop-shadow-sm">{part.slice(2, -2)}</strong>;
      }
      
      // Check for single asterisks for italic/emphasis within non-bold parts
      // We split by space-bounded * or start/end string * to avoid matching mid-word chars if we wanted to be strict,
      // but for this simple case, we assume *word* pattern.
      const subParts = part.split(/(\*[^*]+?\*)/g);
      if (subParts.length > 1) {
         return subParts.map((subPart, subIdx) => {
            if (subPart.startsWith('*') && subPart.endsWith('*') && subPart.length > 2) {
                 return <em key={`${idx}-${subIdx}`} className="text-blue-200 not-italic font-medium">{subPart.slice(1, -1)}</em>;
            }
            return subPart;
         });
      }
      
      return part;
    });
  };

  return (
    <div className="space-y-4 font-sans text-base">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-2" />;

        // Headings (e.g. ## Title)
        if (trimmed.startsWith('#')) {
          const level = trimmed.match(/^#+/)?.[0].length || 1;
          const text = trimmed.slice(level).trim();
          
          if (level === 1 || level === 2) {
             return (
                 <h2 key={i} className="text-2xl font-bangers tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 mt-6 mb-3 border-b border-white/10 pb-2">
                     {formatInline(text)}
                 </h2>
             );
          }
          return (
              <h3 key={i} className="text-lg font-bold text-purple-200 mt-4 mb-2 uppercase tracking-widest text-xs">
                  {formatInline(text)}
              </h3>
          );
        }

        // List Items (e.g. * Item or - Item)
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
           return (
             <div key={i} className="flex items-start gap-3 ml-2 group">
               <div className="mt-2 w-1.5 h-1.5 rounded-full bg-blue-500 group-hover:bg-purple-400 transition-colors shadow-[0_0_8px_rgba(59,130,246,0.5)] shrink-0"></div>
               <div className="text-gray-300 leading-relaxed">
                  {formatInline(trimmed.slice(2))}
               </div>
             </div>
           );
        }

        // Regular Paragraphs
        return (
          <p key={i} className="text-gray-300 leading-relaxed font-light tracking-wide">
            {formatInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
};

const ImageAnalyzer: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setAnalysis('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!image) return;
    
    setIsAnalyzing(true);
    setAnalysis(''); // Clear previous results
    try {
      const result = await analyzeUploadedImage(
        image, 
        "Analyze this image. Identify the art style, composition techniques, color palette, and key subjects. Use headings (start with ##), bullet points (start with *), and bold text (using **) to structure your response effectively for a creative user."
      );
      setAnalysis(result);
    } catch (error) {
      console.error(error);
      setAnalysis("Failed to analyze image. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="p-6 md:p-12 max-w-6xl mx-auto h-full flex flex-col">
      <div className="mb-10 text-center md:text-left">
        <div className="flex items-center justify-center md:justify-start gap-3 mb-3">
            <div className="bg-blue-500/20 p-2 rounded-lg border border-blue-500/30">
                <ScanSearch className="w-6 h-6 text-blue-400" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bangers tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Visual Cortex</h1>
        </div>
        <p className="text-ink-400 text-lg font-hand max-w-2xl">
            Decode the artistic DNA of any image. Upload sketches, photos, or panels to get AI-powered stylistic breakdowns.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 flex-1 min-h-0">
        {/* Left Column: Upload & Preview */}
        <div className="flex flex-col gap-6">
          <div 
            onClick={() => !image && fileInputRef.current?.click()}
            className={`group flex-1 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center relative overflow-hidden transition-all cursor-pointer ${
              image 
                ? 'border-ink-700 bg-black shadow-2xl' 
                : 'border-ink-600 bg-ink-900/50 hover:border-blue-500 hover:bg-ink-800 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]'
            }`}
            style={{ minHeight: '450px' }}
          >
            {image ? (
              <img src={image} alt="Upload preview" className="absolute inset-0 w-full h-full object-contain p-6 animate-pop" />
            ) : (
              <div className="text-center p-8 transition-transform duration-300 group-hover:scale-105">
                <div className="w-20 h-20 bg-ink-800 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-blue-900/30 transition-colors ring-1 ring-white/10 group-hover:ring-blue-500/50">
                  <Upload className="w-8 h-8 text-ink-400 group-hover:text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2 font-bangers tracking-wide">Drop Image Here</h3>
                <p className="text-sm text-ink-400 mb-6 font-hand text-lg">or click to browse files</p>
                <button 
                  className="px-6 py-2 bg-ink-700 hover:bg-blue-600 text-white rounded-xl text-sm font-bold transition-colors shadow-lg"
                >
                  Select File
                </button>
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange} 
              accept="image/*" 
              className="hidden" 
            />
            
            {image && (
              <button 
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                className="absolute top-6 right-6 p-3 bg-black/60 text-white rounded-full hover:bg-blue-600 transition-all backdrop-blur-md shadow-lg hover:scale-110 z-10 border border-white/10"
              >
                <Upload className="w-5 h-5" />
              </button>
            )}
          </div>

          <button
            onClick={handleAnalyze}
            disabled={!image || isAnalyzing}
            className={`w-full py-4 rounded-2xl font-bangers text-2xl tracking-wider flex items-center justify-center gap-3 shadow-xl transition-all duration-300 relative overflow-hidden group ${
              !image || isAnalyzing
                ? 'bg-ink-800 text-ink-600 cursor-not-allowed opacity-50'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-1'
            }`}
          >
            {isAnalyzing ? (
              <>
                <ScanSearch className="w-6 h-6 animate-spin" />
                <span className="animate-pulse">Scanning Neural Patterns...</span>
              </>
            ) : (
              <>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <Sparkles className="w-6 h-6" />
                <span>Run Analysis</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: Results HUD */}
        <div className="glass-panel rounded-3xl p-8 overflow-y-auto flex flex-col shadow-2xl border border-white/10 relative min-h-[400px] backdrop-blur-xl bg-ink-900/40">
           
           {/* HUD Corners */}
           <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-blue-500/50 rounded-tl-xl"></div>
           <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-purple-500/50 rounded-tr-xl"></div>
           <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-purple-500/50 rounded-bl-xl"></div>
           <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-blue-500/50 rounded-br-xl"></div>

           <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-full blur-3xl -z-10 pointer-events-none"></div>
          
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3 uppercase tracking-widest border-b border-white/10 pb-4">
            <ImageIcon className="w-5 h-5 text-blue-400" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 font-bangers tracking-widest text-xl">Visual Cortex Data</span>
          </h3>
          
          {analysis ? (
            <div className="animate-slide-up custom-scrollbar pr-2">
               <MarkdownRenderer content={analysis} />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-ink-600 opacity-40">
              {isAnalyzing ? (
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                    <p className="font-mono text-sm text-blue-400 animate-pulse">PROCESSING_IMAGE_DATA...</p>
                </div>
              ) : (
                <>
                    <Terminal className="w-16 h-16 mb-4 stroke-1" />
                    <p className="font-hand text-xl">Awaiting Input Data...</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageAnalyzer;