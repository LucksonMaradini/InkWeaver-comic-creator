import React, { useState, useEffect } from 'react';
import { BookOpen, Image as ImageIcon, Wand2, Smartphone, Monitor, Feather } from 'lucide-react';
import ComicMaker from './components/ComicMaker';
import ImageAnalyzer from './components/ImageAnalyzer';
import { AppMode } from './types';

const SplashScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] bg-ink-950 flex items-center justify-center animate-fade-out" style={{ animationDelay: '2s', animationFillMode: 'forwards' }}>
      <div className="text-center space-y-6 relative">
        <div className="absolute inset-0 bg-purple-500/20 blur-[100px] rounded-full animate-pulse-slow"></div>
        <div className="relative">
          <div className="relative inline-block mb-4 animate-float">
             <Feather className="w-20 h-20 text-purple-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
             <Wand2 className="w-10 h-10 text-blue-400 absolute -bottom-2 -right-2 animate-pulse" />
          </div>
          <h1 className="font-bangers text-6xl text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-300 to-purple-400 tracking-wider animate-slide-up">
            InkWeaver
          </h1>
          <p className="text-ink-400 font-hand text-xl mt-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            Weaving stories into art...
          </p>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.COMIC_MAKER);
  const [showSplash, setShowSplash] = useState(true);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

  return (
    <>
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      
      <div className="min-h-screen flex flex-col md:flex-row text-white selection:bg-purple-500/30 selection:text-purple-200">
        
        {/* Navigation - Responsive: Sidebar on Desktop, Bottom Tab on Mobile */}
        <aside className="
          fixed bottom-0 left-0 w-full h-16 z-50 glass-panel border-t border-white/5 flex flex-row justify-around items-center px-4
          md:relative md:w-24 lg:w-64 md:h-screen md:flex-col md:justify-start md:border-r md:border-t-0 md:p-0
          transition-all duration-300
        ">
          {/* Logo Area (Hidden on Mobile) */}
          <div className="hidden md:flex p-6 items-center justify-center md:justify-start gap-3 border-b border-white/5 mb-4">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg blur opacity-25 group-hover:opacity-75 transition duration-200"></div>
              <div className="relative w-10 h-10 bg-ink-900 rounded-lg flex items-center justify-center ring-1 ring-white/10 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-blue-500/10"></div>
                <Feather className="w-6 h-6 text-purple-400 group-hover:-rotate-12 transition-transform duration-300 z-10" />
              </div>
            </div>
            <div className="hidden lg:flex flex-col">
              <span className="font-bangers text-2xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-300 drop-shadow-sm leading-none">
                InkWeaver
              </span>
              <span className="text-[9px] text-ink-400 font-bold tracking-[0.2em] uppercase mt-1">AI Comic Studio</span>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 flex md:flex-col gap-2 md:p-4 w-full justify-around md:justify-start">
            <button
              onClick={() => setMode(AppMode.COMIC_MAKER)}
              className={`relative group flex-1 md:flex-none flex items-center justify-center md:justify-start gap-4 px-4 py-2 md:py-3 rounded-xl transition-all duration-300 overflow-hidden ${
                mode === AppMode.COMIC_MAKER
                  ? 'bg-purple-500/10 text-white shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                  : 'text-ink-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {mode === AppMode.COMIC_MAKER && (
                <div className="absolute bottom-0 md:bottom-auto md:left-0 md:top-0 h-1 w-full md:h-full md:w-1 bg-purple-500 rounded-full md:rounded-r-full" />
              )}
              <BookOpen className={`w-6 h-6 md:w-5 md:h-5 transition-transform duration-300 ${mode === AppMode.COMIC_MAKER ? 'scale-110 text-purple-400' : 'group-hover:scale-110'}`} />
              <span className="hidden lg:block font-medium font-hand text-lg tracking-wide">Comic Maker</span>
            </button>

            <button
              onClick={() => setMode(AppMode.ANALYZER)}
              className={`relative group flex-1 md:flex-none flex items-center justify-center md:justify-start gap-4 px-4 py-2 md:py-3 rounded-xl transition-all duration-300 overflow-hidden ${
                mode === AppMode.ANALYZER
                  ? 'bg-blue-500/10 text-white shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                  : 'text-ink-400 hover:bg-white/5 hover:text-white'
              }`}
            >
               {mode === AppMode.ANALYZER && (
                <div className="absolute bottom-0 md:bottom-auto md:left-0 md:top-0 h-1 w-full md:h-full md:w-1 bg-blue-500 rounded-full md:rounded-r-full" />
              )}
              <ImageIcon className={`w-6 h-6 md:w-5 md:h-5 transition-transform duration-300 ${mode === AppMode.ANALYZER ? 'scale-110 text-blue-400' : 'group-hover:scale-110'}`} />
              <span className="hidden lg:block font-medium font-hand text-lg tracking-wide">Analyzer</span>
            </button>
          </nav>

          {/* Device Toggle (Desktop Only) */}
          <div className="hidden md:flex p-4 w-full flex-col gap-2 border-t border-white/5">
             <p className="text-[10px] font-bold text-ink-400 uppercase tracking-widest px-2">Preview View</p>
             <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
                <button 
                  onClick={() => setViewMode('mobile')}
                  className={`flex-1 flex items-center justify-center p-2 rounded-md transition-all ${viewMode === 'mobile' ? 'bg-ink-700 text-white shadow-md' : 'text-ink-500 hover:text-white'}`}
                  title="Mobile View"
                >
                  <Smartphone className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setViewMode('desktop')}
                  className={`flex-1 flex items-center justify-center p-2 rounded-md transition-all ${viewMode === 'desktop' ? 'bg-ink-700 text-white shadow-md' : 'text-ink-500 hover:text-white'}`}
                  title="Desktop View"
                >
                  <Monitor className="w-4 h-4" />
                </button>
             </div>
          </div>

          {/* Footer (Hidden on Mobile) */}
          <div className="p-6 border-t border-white/5 hidden md:block">
            <div className="bg-black/20 rounded-xl p-4 backdrop-blur-md border border-white/5">
              <h3 className="text-[10px] font-bold text-ink-400 uppercase tracking-widest mb-2">Powered By</h3>
              <div className="flex items-center gap-2 text-xs text-ink-300 font-mono">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]"></div>
                Gemini 2.5 & Imagen
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area with Viewport Simulation */}
        <main className="flex-1 overflow-y-auto h-screen relative scroll-smooth pb-20 md:pb-0 bg-ink-950/50">
           <div className={`transition-all duration-500 ease-in-out mx-auto min-h-full ${
             viewMode === 'mobile' 
              ? 'max-w-[400px] border-x border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.5)] bg-ink-950' 
              : 'w-full'
           }`}>
             {mode === AppMode.COMIC_MAKER ? (
               <div className="animate-slide-up">
                 <ComicMaker />
               </div>
             ) : (
                <div className="animate-slide-up">
                  <ImageAnalyzer />
                </div>
             )}
           </div>
        </main>
      </div>
    </>
  );
};

export default App;