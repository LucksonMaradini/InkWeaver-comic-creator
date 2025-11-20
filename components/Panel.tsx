import React from 'react';
import { Edit2, Download, Wand2, X } from 'lucide-react';
import { ComicPanel } from '../types';

interface PanelProps {
  panel: ComicPanel;
  onEditStart: (id: string) => void;
}

const Panel: React.FC<PanelProps> = ({ panel, onEditStart }) => {

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (panel.imageUrl) {
      const link = document.createElement('a');
      link.href = panel.imageUrl;
      link.download = `panel-${panel.id}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const aspectRatioClass = 
    panel.aspectRatio === '1:1' ? 'aspect-square' :
    panel.aspectRatio === '3:4' ? 'aspect-[3/4]' :
    panel.aspectRatio === '4:3' ? 'aspect-[4/3]' :
    'aspect-video';

  return (
    <div className="group relative bg-white rounded-lg shadow-xl transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl overflow-hidden">
        
      {/* "Sketchy" border effect */}
      <div className="absolute inset-0 border-[6px] border-white rounded-lg z-10 pointer-events-none"></div>
      <div className="absolute inset-[4px] border-[2px] border-black rounded-sm z-10 pointer-events-none opacity-90"></div>

      {/* Image Area */}
      <div className={`relative w-full bg-ink-100 ${aspectRatioClass} overflow-hidden`}>
        {/* Content Layer: Image or Placeholder */}
        {panel.imageUrl ? (
          <img
            src={panel.imageUrl}
            alt={panel.description}
            className={`w-full h-full object-cover transition-all duration-1000 ease-out ${
              panel.isLoading ? 'blur-lg scale-105' : 'blur-0 scale-100'
            }`}
          />
        ) : (
          <div className={`absolute inset-0 w-full h-full ${panel.isLoading ? 'loading-shimmer' : 'bg-ink-900'}`} />
        )}

        {/* Loading Overlay Layer */}
        {panel.isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/20 backdrop-blur-[2px]">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin shadow-[0_0_15px_rgba(168,85,247,0.4)]"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                  <Wand2 className="w-5 h-5 text-purple-300 animate-pulse" />
              </div>
            </div>
            <span className="text-sm font-hand mt-3 tracking-wide text-purple-200 drop-shadow-md font-bold animate-pulse">
              {panel.imageUrl ? "Refining Details..." : "Manifesting Image..."}
            </span>
          </div>
        )}
        
        {/* Error State */}
        {!panel.isLoading && !panel.imageUrl && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-ink-500 bg-ink-900 p-4 text-center">
            <div className="w-12 h-12 bg-red-900/20 rounded-full flex items-center justify-center mb-2">
              <X className="w-6 h-6 text-red-400" />
            </div>
            <span className="text-sm font-medium">Generation Failed</span>
          </div>
        )}
      </div>

      {/* Hover Controls */}
      {!panel.isLoading && panel.imageUrl && (
        <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 translate-x-4 group-hover:translate-x-0">
          <button
            onClick={() => onEditStart(panel.id)}
            className="p-3 bg-white text-black rounded-full hover:bg-purple-500 hover:text-white transition-colors shadow-lg hover:scale-110 active:scale-95"
            title="Edit Panel"
          >
            <Edit2 className="w-5 h-5" />
          </button>
          <button
            onClick={handleDownload}
            className="p-3 bg-white text-black rounded-full hover:bg-green-500 hover:text-white transition-colors shadow-lg hover:scale-110 active:scale-95"
            title="Download Panel"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      )}
      
      {/* Description Tooltip */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-6 pt-12 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
        <p className="text-sm text-white font-medium font-hand leading-relaxed drop-shadow-md line-clamp-3">
          {panel.description}
        </p>
      </div>
    </div>
  );
};

export default Panel;