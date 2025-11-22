import React, { useState, useEffect } from 'react';
import SimulationCanvas from './components/SimulationCanvas';
import ControlPanel from './components/ControlPanel';
import DataPanel from './components/DataPanel';
import { SimulationConfig, SimulationState, PresetScenario, AppMode } from './types';
import { Beaker, RotateCcw } from 'lucide-react';

const DEFAULT_CONFIG: SimulationConfig = {
  v0: { x: 15, y: 0 },
  a: { x: 0, y: -9.8 },
  p0: { x: 0, y: 0 }, // Set to Origin
  scale: 20,
  boatHeading: 90,
  riverWidth: 50,
  riverVelocity: 3,
  boatSpeed: 4,
  showVelocity: true,
  showComponents: true,
  showAcceleration: false,
  showTrace: true,
  showShadowBalls: false,
};

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.Kinematics);
  const [config, setConfig] = useState<SimulationConfig>(DEFAULT_CONFIG);
  const [activePreset, setActivePreset] = useState<PresetScenario>(PresetScenario.HorizontalProjectile);
  const [isPlaying, setIsPlaying] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  
  const [simState, setSimState] = useState<SimulationState>({
    t: 0,
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    initialVelocity: { x: 0, y: 0 },
    acceleration: { x: 0, y: 0 },
    path: []
  });

  const switchMode = (newMode: AppMode) => {
    setIsPlaying(false);
    setMode(newMode);
    setResetSignal(s => s + 1);
    
    const newConfig = { ...config };
    if (newMode === AppMode.Boat) {
      newConfig.scale = 10; // Reduced scale to fit river better
      newConfig.showTrace = true;
      newConfig.showVelocity = true;
      newConfig.p0 = { x: 0, y: 0 };
      newConfig.riverWidth = 50;
    } else if (newMode === AppMode.Vectors) {
      newConfig.scale = 30;
      newConfig.p0 = { x: 5, y: 5 }; 
      newConfig.v0 = { x: 5, y: 0 }; 
      newConfig.a = { x: 3, y: 4 };  
    } else {
      newConfig.scale = 20;
      newConfig.v0 = { x: 15, y: 0 };
      newConfig.a = { x: 0, y: -9.8 };
      newConfig.p0 = { x: 0, y: 0 }; 
    }
    setConfig(newConfig);
  };

  const handlePresetChange = (preset: PresetScenario) => {
    setActivePreset(preset);
    setIsPlaying(false);
    let newConfig = { ...config };
    
    switch (preset) {
      case PresetScenario.FreeFall:
        newConfig.p0 = { x: 0, y: 20 }; 
        newConfig.v0 = { x: 0, y: 0 };
        newConfig.a = { x: 0, y: -9.8 };
        break;
      case PresetScenario.HorizontalProjectile:
        newConfig.p0 = { x: 0, y: 20 };
        newConfig.v0 = { x: 15, y: 0 };
        newConfig.a = { x: 0, y: -9.8 };
        break;
      case PresetScenario.ObliqueProjectile:
        newConfig.p0 = { x: 0, y: 0 };
        newConfig.v0 = { x: 15, y: 15 };
        newConfig.a = { x: 0, y: -9.8 };
        break;
      case PresetScenario.UniformLinear:
        newConfig.p0 = { x: 0, y: 5 };
        newConfig.v0 = { x: 10, y: 0 };
        newConfig.a = { x: 0, y: 0 };
        break;
      case PresetScenario.UniformAccelLinear:
        newConfig.p0 = { x: 0, y: 0 };
        newConfig.v0 = { x: 0, y: 0 };
        newConfig.a = { x: 5, y: 0 };
        break;
    }
    setConfig(newConfig);
    setResetSignal(s => s + 1);
  };

  const triggerReset = () => {
    setIsPlaying(false);
    if (mode === AppMode.Kinematics) {
        setConfig(c => ({ ...c, p0: { x: 0, y: 0 } }));
    }
    setResetSignal(s => s + 1);
  };

  const ModeButton = ({ m, label }: { m: AppMode, label: string }) => (
    <button
        onClick={() => switchMode(m)}
        className={`relative px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            mode === m 
            ? 'text-indigo-700 bg-indigo-50 shadow-sm ring-1 ring-indigo-200' 
            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
        }`}
    >
        {label}
        {mode === m && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-indigo-500 rounded-full mb-1"></span>}
    </button>
  );

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-800 overflow-hidden font-sans selection:bg-indigo-100">
      
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-20 relative">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-indigo-200 shadow-lg">
            <Beaker size={18} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-800 leading-tight">运动合成与分解演示仪</h1>
            <p className="text-[10px] text-slate-400 font-semibold tracking-wide uppercase">高中物理互动教学工具</p>
          </div>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 flex bg-white p-1 rounded-xl border border-slate-100 shadow-sm gap-1">
          <ModeButton m={AppMode.Kinematics} label="1. 运动合成与分解" />
          <ModeButton m={AppMode.Vectors} label="2. 平行四边形定则" />
          <ModeButton m={AppMode.Boat} label="3. 小船渡河" />
        </div>

        <div className="w-32 flex justify-end">
           <button onClick={triggerReset} className="p-2 text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1 text-xs font-bold">
              <RotateCcw size={14} /> 重置
           </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-96 bg-white border-r border-slate-200 flex-shrink-0 z-10 overflow-y-auto custom-scrollbar shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">
           <ControlPanel 
             mode={mode}
             config={config} 
             setConfig={setConfig}
             isPlaying={isPlaying}
             togglePlay={() => setIsPlaying(!isPlaying)}
             onReset={triggerReset}
             activePreset={activePreset}
             onPresetChange={handlePresetChange}
           />
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-50/50 relative">
          {/* Canvas Area */}
          <div className="flex-1 relative m-4 mb-0 rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white ring-4 ring-slate-50">
             <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '24px 24px'}}></div>
            <SimulationCanvas 
              mode={mode}
              config={config} 
              setConfig={setConfig}
              isPlaying={isPlaying}
              onUpdateState={setSimState}
              resetSignal={resetSignal}
            />
          </div>
          
          {/* Data Panel */}
          {mode !== AppMode.Vectors && (
            <div className="h-auto mx-4 my-4">
               <div className="bg-white rounded-xl p-1 shadow-sm border border-slate-200">
                 <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-100">
                    <div className="flex items-center gap-2 mb-3 px-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${simState.velocity.x === 0 && simState.velocity.y === 0 && simState.t > 0 ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`}></div>
                        <span className="text-xs font-bold text-slate-400 uppercase">实时数据 (Real-time Data)</span>
                    </div>
                    <DataPanel state={simState} />
                 </div>
               </div>
            </div>
          )}
           {mode === AppMode.Vectors && <div className="h-6"></div>}
        </main>
      </div>
    </div>
  );
};

export default App;