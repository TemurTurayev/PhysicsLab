import { useEffect, useRef, useState } from 'react';
import { Application } from 'pixi.js';
import { useAppStore } from '../../store/useAppStore';

export default function SimulationCanvas() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const worldState = useAppStore((state) => state.worldState);

  useEffect(() => {
    if (!canvasRef.current) return;

    let mounted = true;
    const app = new Application();
    appRef.current = app;

    (async () => {
      try {
        await app.init({
          width: canvasRef.current?.clientWidth || 800,
          height: canvasRef.current?.clientHeight || 600,
          backgroundColor: 0x0d1117,
          antialias: true,
        });

        if (!mounted) {
          app.destroy(true);
          return;
        }

        if (canvasRef.current && app.canvas) {
          canvasRef.current.appendChild(app.canvas as HTMLCanvasElement);
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('Failed to initialize PixiJS:', error);
      }
    })();

    // Cleanup
    return () => {
      mounted = false;
      setIsInitialized(false);
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
    };
  }, []);

  // Handle window resize
  useEffect(() => {
    if (!isInitialized) return;

    const handleResize = () => {
      if (appRef.current && canvasRef.current) {
        appRef.current.renderer.resize(
          canvasRef.current.clientWidth,
          canvasRef.current.clientHeight
        );
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isInitialized]);

  // Render world state (will implement later)
  useEffect(() => {
    if (!appRef.current || !worldState || !isInitialized) return;

    // TODO: Render physics bodies based on worldState
    // This will be implemented when we build the renderer

  }, [worldState, isInitialized]);

  return (
    <div
      ref={canvasRef}
      className="w-full h-full relative"
      style={{ touchAction: 'none' }}
    >
      {!worldState && isInitialized && (
        <div className="absolute inset-0 flex items-center justify-center text-[var(--color-text-secondary)] pointer-events-none">
          <div className="text-center">
            <div className="text-6xl mb-4">🚀</div>
            <p className="text-lg">Запусти код, чтобы начать симуляцию</p>
          </div>
        </div>
      )}
      {!isInitialized && (
        <div className="absolute inset-0 flex items-center justify-center text-[var(--color-text-secondary)]">
          <div className="text-center">
            <p className="text-lg">Инициализация визуализации...</p>
          </div>
        </div>
      )}
    </div>
  );
}
