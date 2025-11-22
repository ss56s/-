import React, { useRef, useEffect, useState, useCallback } from 'react';
import { SimulationState, SimulationConfig, Vector2, AppMode } from '../types';

interface Props {
  mode: AppMode;
  config: SimulationConfig;
  setConfig: (c: SimulationConfig) => void;
  isPlaying: boolean;
  onUpdateState: (newState: SimulationState) => void;
  resetSignal: number;
}

const SimulationCanvas: React.FC<Props> = ({ mode, config, setConfig, isPlaying, onUpdateState, resetSignal }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>();
  const lastFrameTime = useRef<number>(0);
  
  // To avoid stale closures in the animation loop, we track latest config/pan in refs
  const configRef = useRef(config);
  const panRef = useRef<Vector2>({ x: 50, y: 0 });

  useEffect(() => { configRef.current = config; }, [config]);

  // State Ref - This is the source of truth for the animation loop
  const stateRef = useRef<SimulationState>({
    t: 0,
    position: config.p0,
    velocity: config.v0,
    initialVelocity: config.v0,
    acceleration: config.a,
    path: [config.p0]
  });

  // Viewport State
  const [pan, setPan] = useState<Vector2>({ x: 50, y: 0 }); 
  useEffect(() => { panRef.current = pan; }, [pan]);

  const [isDragging, setIsDragging] = useState(false);
  const [dragTarget, setDragTarget] = useState<'pan' | 'ball' | 'vector1' | 'vector2' | null>(null);
  const lastMouseRef = useRef<Vector2>({ x: 0, y: 0 });
  const lastUiUpdateRef = useRef<number>(0);

  // Initialize Viewport based on mode
  useEffect(() => {
    if (containerRef.current) {
      const h = containerRef.current.clientHeight;
      const w = containerRef.current.clientWidth;
      if (mode === AppMode.Boat) {
        // Center the river vertically
        const riverPixels = config.riverWidth * config.scale;
        // pan.y = h / 2 + riverPixels / 2 ensures the river (0 to riverWidth) is centered
        setPan({ x: w / 2 - 150, y: h / 2 + riverPixels / 2 });
      } else if (mode === AppMode.Vectors) {
        setPan({ x: 100, y: h - 100 });
      } else {
        setPan({ x: 50, y: h - 50 });
      }
    }
  }, [mode]); 

  // --- Reset Logic ---
  const resetSimulation = useCallback(() => {
    let startPos = config.p0;
    let initialV = config.v0;

    if (mode === AppMode.Boat) {
      // Boat starts at y=0 (bottom bank)
      startPos = { x: 0, y: 0 };
      const vBoatX = config.boatSpeed * Math.cos(config.boatHeading * Math.PI / 180);
      const vBoatY = config.boatSpeed * Math.sin(config.boatHeading * Math.PI / 180);
      initialV = { 
        x: vBoatX + config.riverVelocity, 
        y: vBoatY
      };
    }

    stateRef.current = {
      t: 0,
      position: startPos,
      velocity: initialV,
      initialVelocity: initialV,
      acceleration: config.a,
      path: [startPos]
    };
    
    lastFrameTime.current = 0;
    onUpdateState(stateRef.current);
    
    // Force immediate redraw
    renderFrame();
  }, [config, resetSignal, mode]);

  useEffect(() => {
    resetSimulation();
  }, [resetSignal, mode]);

  // React to config changes while paused (for real-time slider updates)
  useEffect(() => {
    if (!isPlaying) {
        if (mode === AppMode.Vectors) {
            resetSimulation();
        } else if (mode === AppMode.Boat && stateRef.current.t === 0) {
            // Only reset boat if at start, to allow initial angle adjustment
            resetSimulation();
        } else if (mode === AppMode.Kinematics && stateRef.current.t === 0) {
            stateRef.current.velocity = config.v0;
            stateRef.current.acceleration = config.a;
        }
    } else {
       stateRef.current.acceleration = config.a;
    }
  }, [config.v0, config.a, config.boatHeading, config.boatSpeed, config.riverVelocity]);


  // --- Drawing Functions ---

  const getW2S = (x: number, y: number, p: Vector2, s: number) => ({
    x: p.x + x * s,
    y: p.y - y * s
  });

  const getS2W = (sx: number, sy: number, p: Vector2, s: number) => ({
    x: (sx - p.x) / s,
    y: (p.y - sy) / s
  });

  const drawArrow = (ctx: CanvasRenderingContext2D, from: Vector2, dx: number, dy: number, color: string, label?: string, dashed = false, width = 2) => {
    const headlen = 10;
    const endX = from.x + dx; 
    const endY = from.y - dy; 
    const angle = Math.atan2(endY - from.y, endX - from.x);
    const length = Math.sqrt(dx*dx + dy*dy);
    
    if (length < 2) return;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width;
    if (dashed) ctx.setLineDash([4, 3]);

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(endX - headlen * Math.cos(angle - Math.PI / 6), endY - headlen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(endX - headlen * Math.cos(angle + Math.PI / 6), endY - headlen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();

    if (label) {
      ctx.font = 'bold 14px "Segoe UI", Roboto, sans-serif';
      const textX = endX + 10;
      const textY = endY;
      ctx.fillStyle = color;
      ctx.fillText(label, textX, textY + 5);
    }
    ctx.restore();
  };

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number, cfg: SimulationConfig, p: Vector2) => {
    const { scale } = cfg;
    const minWorld = getS2W(0, height, p, scale);
    const maxWorld = getS2W(width, 0, p, scale);

    ctx.lineWidth = 1;
    ctx.strokeStyle = '#cbd5e1'; 
    
    let step = 1;
    if (scale < 15) step = 5;
    if (scale < 5) step = 10;
    if (scale > 40) step = 0.5;

    ctx.beginPath();
    for (let x = Math.floor(minWorld.x / step) * step; x <= maxWorld.x; x += step) {
      const s = getW2S(x, 0, p, scale);
      ctx.moveTo(s.x, 0);
      ctx.lineTo(s.x, height);
    }
    for (let y = Math.floor(minWorld.y / step) * step; y <= maxWorld.y; y += step) {
      const s = getW2S(0, y, p, scale);
      ctx.moveTo(0, s.y);
      ctx.lineTo(width, s.y);
    }
    ctx.stroke();

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const origin = getW2S(0, 0, p, scale);
    if (origin.x >= 0 && origin.x <= width) { ctx.moveTo(origin.x, 0); ctx.lineTo(origin.x, height); }
    if (origin.y >= 0 && origin.y <= height) { ctx.moveTo(0, origin.y); ctx.lineTo(width, origin.y); }
    ctx.stroke();
  };

  const drawBoatScene = (ctx: CanvasRenderingContext2D, width: number, height: number, cfg: SimulationConfig, p: Vector2) => {
    const { scale, riverWidth } = cfg;
    const bankY1 = getW2S(0, 0, p, scale).y; // Bottom bank
    const bankY2 = getW2S(0, riverWidth, p, scale).y; // Top bank
    const currentPos = stateRef.current.position;
    const isAtBank = currentPos.y >= riverWidth - 0.01;

    // 1. River water
    ctx.fillStyle = '#ecfeff';
    ctx.fillRect(0, bankY2, width, bankY1 - bankY2);
    
    // 2. Banks
    ctx.fillStyle = '#059669'; 
    ctx.fillRect(0, bankY1, width, 12); 
    ctx.fillRect(0, bankY2 - 12, width, 12); 

    // 2.5 PREDICTIVE Trajectory
    const vy = (cfg.boatSpeed * Math.sin(cfg.boatHeading * Math.PI/180));
    if (cfg.showTrace && vy > 0.1 && !isAtBank) {
       const vx = (cfg.boatSpeed * Math.cos(cfg.boatHeading * Math.PI/180) + cfg.riverVelocity);
       const timeToCross = (riverWidth - currentPos.y) / vy;
       const landingX = currentPos.x + vx * timeToCross;
       
       const startScreen = getW2S(currentPos.x, currentPos.y, p, scale);
       const endScreen = getW2S(landingX, riverWidth, p, scale);

       ctx.beginPath();
       ctx.strokeStyle = 'rgba(190, 24, 93, 0.4)'; 
       ctx.lineWidth = 2;
       ctx.setLineDash([5, 5]);
       ctx.moveTo(startScreen.x, startScreen.y);
       ctx.lineTo(endScreen.x, endScreen.y);
       ctx.stroke();
       ctx.setLineDash([]);
       
       ctx.beginPath();
       ctx.arc(endScreen.x, endScreen.y, 4, 0, Math.PI*2);
       ctx.fillStyle = 'rgba(190, 24, 93, 0.4)';
       ctx.fill();
    }

    // 3. Historical Trajectory
    const path = stateRef.current.path;
    if (cfg.showTrace && path.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = '#be185d'; 
      ctx.lineWidth = 4; 
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      const start = getW2S(path[0].x, path[0].y, p, scale);
      ctx.moveTo(start.x, start.y);
      
      for (let i = 1; i < path.length; i++) {
        const pt = getW2S(path[i].x, path[i].y, p, scale);
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();

      ctx.fillStyle = '#be185d';
      ctx.beginPath(); 
      ctx.arc(start.x, start.y, 4, 0, Math.PI * 2); 
      ctx.fill();
    }

    // 4. Boat
    const pos = getW2S(currentPos.x, currentPos.y, p, scale);
    
    ctx.save();
    ctx.translate(pos.x, pos.y);
    const angleRad = -cfg.boatHeading * (Math.PI / 180); 
    ctx.rotate(angleRad);
    
    ctx.fillStyle = '#3b82f6';
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.quadraticCurveTo(0, 10, -10, 8);
    ctx.lineTo(-10, -8);
    ctx.quadraticCurveTo(0, -10, 15, 0);
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();

    // Vectors - Only show if not at bank or if stationary but user is tweaking settings? 
    // To keep it clean: if at bank, stop showing velocity vectors.
    if (cfg.showVelocity && !isAtBank) {
        const vBoatRawX = cfg.boatSpeed * Math.cos(cfg.boatHeading * Math.PI / 180) * scale;
        const vBoatRawY = cfg.boatSpeed * Math.sin(cfg.boatHeading * Math.PI / 180) * scale;
        drawArrow(ctx, pos, vBoatRawX, vBoatRawY, '#3b82f6', 'v_船');

        const vwX = cfg.riverVelocity * scale;
        drawArrow(ctx, pos, vwX, 0, '#10b981', 'v_水');
        
        const vx = (cfg.boatSpeed * Math.cos(cfg.boatHeading * Math.PI/180) + cfg.riverVelocity) * scale;
        const vy = (cfg.boatSpeed * Math.sin(cfg.boatHeading * Math.PI/180)) * scale;
        drawArrow(ctx, pos, vx, vy, '#ef4444', 'v_合', false, 3);
    }
  };

  const drawVectorsScene = (ctx: CanvasRenderingContext2D, width: number, height: number, cfg: SimulationConfig, p: Vector2) => {
     const start = getW2S(cfg.p0.x, cfg.p0.y, p, cfg.scale);
     const s = cfg.scale;
     const v1 = { x: cfg.v0.x * s, y: 0 }; 
     const v2 = { x: cfg.a.x * s, y: cfg.a.y * s };
     const vSum = { x: v1.x + v2.x, y: v1.y + v2.y };

     ctx.setLineDash([4, 4]);
     ctx.strokeStyle = '#94a3b8';
     ctx.lineWidth = 1;
     ctx.beginPath();
     ctx.moveTo(start.x + v1.x, start.y - v1.y);
     ctx.lineTo(start.x + vSum.x, start.y - vSum.y);
     ctx.lineTo(start.x + v2.x, start.y - v2.y);
     ctx.stroke();
     ctx.setLineDash([]);

     drawArrow(ctx, start, v1.x, v1.y, '#3b82f6', 'V1', false, 4);
     drawArrow(ctx, start, v2.x, v2.y, '#10b981', 'V2', false, 4);
     drawArrow(ctx, start, vSum.x, vSum.y, '#ef4444', 'V_合', false, 4);
  };

  const drawKinematicsScene = (ctx: CanvasRenderingContext2D, cfg: SimulationConfig, p: Vector2) => {
    const currentPos = stateRef.current.position;
    const pos = getW2S(currentPos.x, currentPos.y, p, cfg.scale);
    const { scale } = cfg;

    if (cfg.showTrace && stateRef.current.path.length > 0) {
      ctx.strokeStyle = '#cbd5e1';
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 3;
      ctx.beginPath();
      const p0 = stateRef.current.path[0];
      const start = getW2S(p0.x, p0.y, p, scale);
      ctx.moveTo(start.x, start.y);
      for (let i = 1; i < stateRef.current.path.length; i++) {
        const pt = stateRef.current.path[i];
        const s = getW2S(pt.x, pt.y, p, scale);
        ctx.lineTo(s.x, s.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (cfg.showShadowBalls) {
      const projX = getW2S(currentPos.x, 0, p, scale);
      const projY = getW2S(0, currentPos.y, p, scale);

      ctx.strokeStyle = '#e2e8f0';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y); ctx.lineTo(projX.x, projX.y);
      ctx.moveTo(pos.x, pos.y); ctx.lineTo(projY.x, projY.y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath(); ctx.arc(projX.x, projX.y, 6, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(59, 130, 246, 0.5)'; ctx.fill();
      
      ctx.beginPath(); ctx.arc(projY.x, projY.y, 6, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(59, 130, 246, 0.5)'; ctx.fill();
    }

    if (cfg.showComponents && cfg.showVelocity) {
      const vx = stateRef.current.velocity.x * scale;
      const vy = stateRef.current.velocity.y * scale;
      drawArrow(ctx, pos, vx, 0, '#60a5fa', 'vx', true, 2);
      drawArrow(ctx, pos, 0, vy, '#60a5fa', 'vy', true, 2);
    }
    if (cfg.showVelocity) {
      const vx = stateRef.current.velocity.x * scale;
      const vy = stateRef.current.velocity.y * scale;
      drawArrow(ctx, pos, vx, vy, '#dc2626', 'v', false, 3);
    }
    if (cfg.showAcceleration) {
      const ax = stateRef.current.acceleration.x * scale;
      const ay = stateRef.current.acceleration.y * scale;
      drawArrow(ctx, {x: pos.x + 5, y: pos.y + 5}, ax, ay, '#fbbf24', 'a');
    }

    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 12, 0, 2 * Math.PI);
    const gradient = ctx.createRadialGradient(pos.x - 4, pos.y - 4, 2, pos.x, pos.y, 12);
    gradient.addColorStop(0, '#ff7c7c');
    gradient.addColorStop(1, '#ef4444');
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.stroke();
  };

  const renderFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentConfig = configRef.current;
    const currentPan = panRef.current;
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);
    drawGrid(ctx, width, height, currentConfig, currentPan);

    if (mode === AppMode.Boat) drawBoatScene(ctx, width, height, currentConfig, currentPan);
    else if (mode === AppMode.Vectors) drawVectorsScene(ctx, width, height, currentConfig, currentPan);
    else drawKinematicsScene(ctx, currentConfig, currentPan);
  };

  useEffect(() => {
    renderFrame();
  }, [config, pan, mode]);

  // --- Animation Loop ---
  const animate = (time: number) => {
    if (!lastFrameTime.current) lastFrameTime.current = time;
    const delta = (time - lastFrameTime.current) / 1000;
    lastFrameTime.current = time;
    const dt = Math.min(delta, 0.1); 

    const currentConfig = configRef.current;

    if (mode === AppMode.Boat) {
        // Check if already finished to prevent further calculation
        if (stateRef.current.position.y >= currentConfig.riverWidth) {
             // Ensure strictly clamped
             stateRef.current.position.y = currentConfig.riverWidth;
             stateRef.current.velocity = { x: 0, y: 0 };
        } else {
            const vBoatX = currentConfig.boatSpeed * Math.cos(currentConfig.boatHeading * Math.PI / 180);
            const vBoatY = currentConfig.boatSpeed * Math.sin(currentConfig.boatHeading * Math.PI / 180);
            const vx = vBoatX + currentConfig.riverVelocity;
            const vy = vBoatY;

            let nextX = stateRef.current.position.x + vx * dt;
            let nextY = stateRef.current.position.y + vy * dt;

            // Stop at opposite bank
            if (nextY >= currentConfig.riverWidth) {
                if (vy > 0) {
                    // Fraction of time step to reach wall
                    const frac = (currentConfig.riverWidth - stateRef.current.position.y) / vy;
                    nextX = stateRef.current.position.x + vx * Math.min(dt, Math.max(0, frac));
                }
                nextY = currentConfig.riverWidth;
                stateRef.current.velocity = { x: 0, y: 0 }; // Stop velocity
            } else {
                stateRef.current.velocity = { x: vx, y: vy };
            }

            // Only increment time if moving or just arrived
            if (stateRef.current.position.y < currentConfig.riverWidth) {
                stateRef.current.t += dt;
            }

            stateRef.current.position.x = nextX;
            stateRef.current.position.y = nextY;
        }

    } else if (mode === AppMode.Kinematics) {
        const newTime = stateRef.current.t + dt;
        const vx = currentConfig.v0.x + currentConfig.a.x * newTime;
        const vy = currentConfig.v0.y + currentConfig.a.y * newTime;
        const x = currentConfig.p0.x + currentConfig.v0.x * newTime + 0.5 * currentConfig.a.x * newTime * newTime;
        const y = currentConfig.p0.y + currentConfig.v0.y * newTime + 0.5 * currentConfig.a.y * newTime * newTime;
        stateRef.current.t = newTime;
        stateRef.current.velocity = { x: vx, y: vy };
        stateRef.current.position = { x, y };
    }
    
    // Record Path
    const lastP = stateRef.current.path[stateRef.current.path.length - 1];
    if (lastP) {
        const dx = stateRef.current.position.x - lastP.x;
        const dy = stateRef.current.position.y - lastP.y;
        if (Math.sqrt(dx*dx + dy*dy) > 0.1) {
           stateRef.current.path.push({ ...stateRef.current.position });
        }
    } else {
       stateRef.current.path.push({ ...stateRef.current.position });
    }

    if (time - lastUiUpdateRef.current > 100) {
        onUpdateState({ ...stateRef.current });
        lastUiUpdateRef.current = time;
    }
    
    renderFrame(); 
    if (isPlaying) requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (isPlaying) {
      lastFrameTime.current = 0;
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, mode]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    lastMouseRef.current = { x: mouseX, y: mouseY };
    setIsDragging(true);

    if (!isPlaying && mode === AppMode.Kinematics) {
        const ballScreen = getW2S(stateRef.current.position.x, stateRef.current.position.y, panRef.current, config.scale);
        if (Math.hypot(mouseX - ballScreen.x, mouseY - ballScreen.y) < 20) {
            setDragTarget('ball');
            document.body.style.cursor = 'grabbing';
            return;
        }
    }
    setDragTarget('pan');
    document.body.style.cursor = 'grabbing';
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    if (isDragging) {
      const dx = mouseX - lastMouseRef.current.x;
      const dy = mouseY - lastMouseRef.current.y;

      if (dragTarget === 'pan') {
        setPan(p => ({ x: p.x + dx, y: p.y + dy }));
      } 
      else if (dragTarget === 'ball') {
        const worldPos = getS2W(mouseX, mouseY, panRef.current, config.scale);
        const roundedX = Math.round(worldPos.x * 2) / 2;
        const roundedY = Math.round(worldPos.y * 2) / 2;
        const newPos = { x: roundedX, y: roundedY };
        
        setConfig({ ...config, p0: newPos });
        stateRef.current.position = newPos;
        stateRef.current.path = [newPos];
        renderFrame();
      }
      lastMouseRef.current = { x: mouseX, y: mouseY };
    } else {
       const ballScreen = getW2S(stateRef.current.position.x, stateRef.current.position.y, panRef.current, config.scale);
       if (mode === AppMode.Kinematics && Math.hypot(mouseX - ballScreen.x, mouseY - ballScreen.y) < 20) {
           document.body.style.cursor = 'grab';
       } else {
           document.body.style.cursor = 'default';
       }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragTarget(null);
    document.body.style.cursor = 'default';
  };

  const handleWheel = (e: React.WheelEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newScale = Math.max(2, Math.min(200, config.scale * zoomFactor));
    
    const worldUnderMouse = getS2W(mouseX, mouseY, pan, config.scale);
    const newPanX = mouseX - worldUnderMouse.x * newScale;
    const newPanY = mouseY + worldUnderMouse.y * newScale;
    
    setConfig({ ...config, scale: newScale });
    setPan({ x: newPanX, y: newPanY });
  };

  useEffect(() => {
    const handleResize = () => {
        if (containerRef.current && canvasRef.current) {
            canvasRef.current.width = containerRef.current.clientWidth;
            canvasRef.current.height = containerRef.current.clientHeight;
            renderFrame();
        }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [config, pan, mode]);

  return (
    <div ref={containerRef} className="w-full h-full relative bg-white">
      <canvas 
        ref={canvasRef} 
        className="block w-full h-full touch-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />
      {/* Overlay Hints */}
      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur px-3 py-2 rounded-lg border border-slate-200 shadow-sm text-[10px] text-slate-500 pointer-events-none select-none">
        {mode === AppMode.Kinematics && <p>💡 拖动背景平移，滚轮缩放。暂停时可拖动小球。</p>}
        {mode === AppMode.Boat && <p>💡 滚轮缩放视角。</p>}
        {mode === AppMode.Vectors && <p>💡 控制面板调整矢量大小和角度。</p>}
      </div>
    </div>
  );
};

export default SimulationCanvas;