import React from 'react';
import { SimulationState } from '../types';
import { Timer, Gauge, ArrowUpRight, Activity } from 'lucide-react';

interface Props {
  state: SimulationState;
}

const DataPanel: React.FC<Props> = ({ state }) => {
  const vTotal = Math.sqrt(state.velocity.x ** 2 + state.velocity.y ** 2);
  const angle = Math.atan2(state.velocity.y, state.velocity.x) * (180 / Math.PI);

  const DataItem = ({ label, value, unit, color = "text-slate-700", icon }: any) => (
    <div className="flex flex-col justify-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center gap-1.5 mb-1">
        {icon && <div className="text-slate-400">{icon}</div>}
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-lg font-mono font-bold ${color}`}>
            {value}
        </span>
        <span className="text-xs text-slate-400 font-sans">{unit}</span>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 w-full">
      <div className="col-span-1 lg:col-span-1">
         <DataItem 
            label="时间 t" 
            value={state.t.toFixed(2)} 
            unit="s" 
            icon={<Timer size={12}/>}
            color="text-slate-900"
         />
      </div>
      
      <div className="col-span-1 lg:col-span-2">
         <DataItem 
            label="合速度 v" 
            value={vTotal.toFixed(2)} 
            unit="m/s" 
            icon={<Activity size={12}/>}
            color="text-red-600"
         />
      </div>

      <DataItem label="水平分速度 vx" value={state.velocity.x.toFixed(2)} unit="m/s" color="text-blue-600" />
      <DataItem label="竖直分速度 vy" value={state.velocity.y.toFixed(2)} unit="m/s" color="text-blue-600" />
      
      <DataItem label="水平位移 x" value={state.position.x.toFixed(2)} unit="m" />
      <DataItem label="竖直位移 y" value={state.position.y.toFixed(2)} unit="m" />
      
      <DataItem 
        label="速度偏角 θ" 
        value={angle.toFixed(1)} 
        unit="°" 
        icon={<Gauge size={12}/>}
        color="text-purple-600" 
      />
    </div>
  );
};

export default DataPanel;