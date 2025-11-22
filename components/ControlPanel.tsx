import React from 'react';
import { SimulationConfig, PresetScenario, AppMode } from '../types';
import { Play, Pause, RotateCcw, Zap, ChevronRight, Anchor, Settings2, Plus, Minus } from 'lucide-react';

interface Props {
  mode: AppMode;
  config: SimulationConfig;
  setConfig: (c: SimulationConfig) => void;
  isPlaying: boolean;
  togglePlay: () => void;
  onReset: () => void;
  activePreset: PresetScenario;
  onPresetChange: (p: PresetScenario) => void;
}

// -- Precision Slider Component --
// MOVED OUTSIDE ControlPanel to prevent re-mounting on every render (which kills drag focus)
const PrecisionSlider = ({ label, value, min, max, step, onChange, colorClass, unit = '' }: any) => {
    const safeValue = Number(value) || 0;

    const handleStep = (direction: number) => {
        let next = safeValue + direction * step;
        next = Math.min(max, Math.max(min, next));
        next = parseFloat(next.toFixed(2));
        onChange(next);
    };

    const handleRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(parseFloat(e.target.value));
    };

    return (
        <div className="mb-3 select-none">
            <div className="flex justify-between text-xs font-medium text-slate-600 mb-1.5 items-center">
                <span>{label}</span>
                <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 min-w-[3.5rem] text-center">
                    {safeValue.toFixed(step < 0.1 ? 2 : 1)} {unit}
                </span>
            </div>
            <div className="flex items-center gap-3">
                <button 
                    onClick={() => handleStep(-1)}
                    className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors flex-shrink-0 active:scale-90"
                >
                    <Minus size={12} />
                </button>
                <div className="relative flex-1 flex items-center">
                    {/* IMPORTANT: h-5 ensures the thumb hit area is large enough. appearance-auto allows browser native drag. */}
                    <input 
                        type="range" 
                        min={min} max={max} step={step} 
                        value={safeValue} 
                        onChange={handleRangeChange} 
                        className={`w-full h-5 bg-transparent cursor-pointer ${colorClass}`}
                    />
                </div>
                <button 
                    onClick={() => handleStep(1)}
                    className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors flex-shrink-0 active:scale-90"
                >
                    <Plus size={12} />
                </button>
            </div>
        </div>
    );
};

const ControlPanel: React.FC<Props> = ({
  mode,
  config,
  setConfig,
  isPlaying,
  togglePlay,
  onReset,
  activePreset,
  onPresetChange,
}) => {
  
  // Helper to handle nested updates (e.g. 'v0.x')
  const updateConfigValue = (field: string, value: number) => {
    const newConfig = { ...config };
    if (field.includes('.')) {
        const [parent, child] = field.split('.');
        // @ts-ignore
        newConfig[parent] = { ...newConfig[parent], [child]: value };
    } else {
        // @ts-ignore
        newConfig[field] = value;
    }
    setConfig(newConfig);
  };

  const handleToggle = (field: keyof SimulationConfig) => {
    setConfig({ ...config, [field]: !config[field] });
  };

  const primaryBtnClass = `flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold transition-all shadow-sm ${
    isPlaying 
      ? 'bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100' 
      : 'bg-blue-600 text-white hover:bg-blue-700 border border-transparent shadow-blue-200'
  }`;
  
  const secondaryBtnClass = "flex-1 flex items-center justify-center gap-2 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm";

  // -- BOAT Mode --
  if (mode === AppMode.Boat) {
      return (
        <div className="p-5 space-y-6 font-sans">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Anchor size={20} />
                </div>
                <div>
                    <h2 className="font-bold text-slate-800">小船渡河模型</h2>
                    <p className="text-xs text-slate-400">运动的独立性与等时性</p>
                </div>
            </div>

            <div className="flex gap-3">
                <button onClick={togglePlay} className={primaryBtnClass}>
                    {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                    {isPlaying ? '暂停' : '开始渡河'}
                </button>
                <button onClick={onReset} className={secondaryBtnClass}>
                    <RotateCcw size={18} /> 重置
                </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">基础参数</h3>
                <PrecisionSlider 
                    label="船在静水中速度 (v_船)" 
                    value={config.boatSpeed} 
                    min={1} max={20} step={0.1} unit="m/s"
                    onChange={(v: number) => updateConfigValue('boatSpeed', v)}
                    colorClass="accent-indigo-600"
                />
                <PrecisionSlider 
                    label="水流速度 (v_水)" 
                    value={config.riverVelocity} 
                    min={0} max={15} step={0.1} unit="m/s"
                    onChange={(v: number) => updateConfigValue('riverVelocity', v)}
                    colorClass="accent-emerald-500"
                />
                <div className="pt-2 border-t border-slate-200 mt-2">
                    <PrecisionSlider 
                        label="船头朝向角度 (θ)" 
                        value={config.boatHeading} 
                        min={0} max={180} step={1} unit="°"
                        onChange={(v: number) => updateConfigValue('boatHeading', v)}
                        colorClass="accent-purple-500"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">快捷模式</h3>
                <button 
                    onClick={() => setConfig({...config, boatHeading: 90})}
                    className="w-full flex items-center justify-between p-3 bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-sm rounded-lg text-slate-600 transition-all text-sm group"
                >
                    <span>最短时间模式</span>
                    <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded group-hover:bg-indigo-100">θ = 90°</span>
                </button>
                <button 
                    onClick={() => {
                        if (config.boatSpeed > config.riverVelocity) {
                            const angle = Math.acos(-config.riverVelocity / config.boatSpeed) * (180 / Math.PI);
                            setConfig({...config, boatHeading: Math.round(angle)});
                        } else {
                            alert("船速小于水速，无法垂直渡河！");
                        }
                    }}
                    className="w-full flex items-center justify-between p-3 bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-sm rounded-lg text-slate-600 transition-all text-sm group"
                >
                    <span>最短位移模式</span>
                    <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded group-hover:bg-indigo-100">垂直渡河</span>
                </button>
            </div>
            
            <div className="pt-2">
                 <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                    <input type="checkbox" checked={config.showTrace} onChange={() => handleToggle('showTrace')} className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"/>
                    <span className="text-sm text-slate-700 font-medium">显示运动轨迹</span>
                </label>
            </div>
        </div>
      );
  }

  // -- VECTOR Mode --
  if (mode === AppMode.Vectors) {
      const v1Mag = config.v0.x; 
      const v2Mag = Math.sqrt(config.a.x ** 2 + config.a.y ** 2);
      let angleDeg = Math.atan2(config.a.y, config.a.x) * (180 / Math.PI);
      if (angleDeg < 0) angleDeg += 360;

      const handleV1MagChange = (newMag: number) => {
          const newConfig = { ...config };
          newConfig.v0 = { x: newMag, y: 0 };
          setConfig(newConfig);
      };

      // Atomic update to prevent partial state issues
      const updateV2 = (mag: number, deg: number) => {
          const rad = deg * (Math.PI / 180);
          const newAx = mag * Math.cos(rad);
          const newAy = mag * Math.sin(rad);
          
          const newConfig = { ...config };
          newConfig.a = { x: newAx, y: newAy };
          setConfig(newConfig);
      };

      return (
        <div className="p-5 space-y-6 font-sans">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Zap size={20} />
                </div>
                <div>
                    <h2 className="font-bold text-slate-800">平行四边形定则</h2>
                    <p className="text-xs text-slate-400">矢量的合成与分解</p>
                </div>
            </div>
            
            {/* Vector 1 */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                 <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                 <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <span className="text-blue-500">●</span> 分矢量 V1 (水平)
                 </h3>
                 <PrecisionSlider 
                    label="大小 |V1|" value={v1Mag} min={1} max={20} step={0.1} unit="m/s"
                    onChange={handleV1MagChange} colorClass="accent-blue-500"
                 />
            </div>

            {/* Vector 2 Magnitude */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                 <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
                 <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <span className="text-emerald-500">●</span> 分矢量 V2 大小
                 </h3>
                 <PrecisionSlider 
                    label="大小 |V2|" value={v2Mag} min={1} max={20} step={0.1} unit="m/s"
                    onChange={(m: number) => updateV2(m, angleDeg)} colorClass="accent-emerald-500"
                 />
            </div>

            {/* Vector 2 Angle */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                 <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500"></div>
                 <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <span className="text-purple-500">●</span> 分矢量 V2 角度
                 </h3>
                 <PrecisionSlider 
                    label="夹角 θ" value={angleDeg} min={0} max={360} step={1} unit="°"
                    onChange={(a: number) => updateV2(v2Mag, a)} colorClass="accent-purple-500"
                 />
            </div>

            <div className="p-4 bg-slate-800 text-white rounded-xl shadow-md flex justify-between items-center">
                 <span className="text-sm font-medium text-slate-300">合矢量大小 |V_total|</span>
                 <span className="text-xl font-bold font-mono text-white">
                    {Math.sqrt( Math.pow(config.v0.x + config.a.x, 2) + Math.pow(config.v0.y + config.a.y, 2) ).toFixed(2)}
                 </span>
            </div>
        </div>
      );
  }

  // -- KINEMATICS Mode (Function 1) --
  return (
    <div className="p-5 space-y-6 font-sans">
      <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <Settings2 size={20} />
        </div>
        <div>
            <h2 className="font-bold text-slate-800">运动合成与分解</h2>
            <p className="text-xs text-slate-400">自定义初速度与加速度</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button onClick={togglePlay} className={primaryBtnClass}>
          {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          {isPlaying ? '暂停' : '开始运行'}
        </button>
        <button onClick={onReset} className={secondaryBtnClass}>
          <RotateCcw size={18} /> 重置
        </button>
      </div>

      {/* Presets */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Zap size={12} /> 快速场景预设
        </label>
        <div className="relative">
            <select 
            value={activePreset}
            onChange={(e) => onPresetChange(e.target.value as PresetScenario)}
            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm appearance-none"
            >
            <option value={PresetScenario.HorizontalProjectile}>平抛运动 (vx=const, ay=g)</option>
            <option value={PresetScenario.ObliqueProjectile}>斜抛运动 (vx=const, ay=g)</option>
            <option value={PresetScenario.FreeFall}>自由落体 (v0=0, ay=g)</option>
            <option value={PresetScenario.UniformLinear}>匀速直线运动 (a=0)</option>
            <option value={PresetScenario.UniformAccelLinear}>匀加速直线运动</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <ChevronRight size={16} className="rotate-90" />
            </div>
        </div>
      </div>

      {/* Physics Controls */}
      <div className="space-y-4">
        {/* Initial Velocity Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-colors">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
          <div className="flex items-center gap-2 mb-3">
             <h3 className="font-bold text-slate-700 text-sm">初速度 (v₀)</h3>
             <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">m/s</span>
          </div>
          <div className="space-y-1">
            <PrecisionSlider 
                label="水平初速度 (v₀x)" value={config.v0.x} min={-20} max={20} step={0.1} unit="m/s"
                onChange={(v: number) => updateConfigValue('v0.x', v)} colorClass="accent-blue-500"
            />
            <PrecisionSlider 
                label="竖直初速度 (v₀y)" value={config.v0.y} min={-20} max={20} step={0.1} unit="m/s"
                onChange={(v: number) => updateConfigValue('v0.y', v)} colorClass="accent-blue-500"
            />
          </div>
        </div>

        {/* Acceleration Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-red-300 transition-colors">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
          <div className="flex items-center gap-2 mb-3">
             <h3 className="font-bold text-slate-700 text-sm">加速度 (a)</h3>
             <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-100">m/s²</span>
          </div>
          <div className="space-y-1">
            <PrecisionSlider 
                label="水平加速度 (ax)" value={config.a.x} min={-10} max={10} step={0.1} unit="m/s²"
                onChange={(v: number) => updateConfigValue('a.x', v)} colorClass="accent-red-500"
            />
            <PrecisionSlider 
                label="竖直加速度 (ay)" value={config.a.y} min={-20} max={20} step={0.1} unit="m/s²"
                onChange={(v: number) => updateConfigValue('a.y', v)} colorClass="accent-red-500"
            />
             <p className="text-[10px] text-slate-400 text-right pt-1">* 向下为负, 向上为正</p>
          </div>
        </div>
      </div>

      {/* Visual Toggles */}
      <div className="pt-4 border-t border-slate-100">
        <h3 className="font-bold text-slate-400 text-xs uppercase tracking-wider mb-3">视觉辅助</h3>
        <div className="space-y-2">
            {[
                { key: 'showTrace', label: '显示运动轨迹 (Trajectory)' },
                { key: 'showComponents', label: '显示分速度矢量 (Vx, Vy)' },
                { key: 'showVelocity', label: '显示合速度矢量 (V total)' },
                { key: 'showShadowBalls', label: '显示分运动投影球' }
            ].map((item) => (
                <label key={item.key} className="flex items-center gap-3 p-2 rounded hover:bg-slate-50 cursor-pointer transition-colors group">
                    <div className="relative flex items-center">
                        <input 
                            type="checkbox" 
                            checked={config[item.key as keyof SimulationConfig] as boolean} 
                            onChange={() => handleToggle(item.key as keyof SimulationConfig)} 
                            className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-slate-300 shadow-sm checked:border-indigo-600 checked:bg-indigo-600 focus:ring-2 focus:ring-indigo-500 transition-all" 
                        />
                        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 peer-checked:opacity-100 text-white pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        </span>
                    </div>
                    <span className="text-sm text-slate-600 group-hover:text-slate-900 font-medium">{item.label}</span>
                </label>
            ))}
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;