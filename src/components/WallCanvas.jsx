import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { FractionWallScene } from '../three/FractionWallScene.js';

/**
 * Host for the WebGL scene. The scene is created once and then fed new configs;
 * React never owns anything inside it.
 */
const WallCanvas = forwardRef(function WallCanvas(
  { config, selection, onHover, onPick, onStats },
  ref,
) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const handlers = useRef({});
  handlers.current = { onHover, onPick, onStats };

  useEffect(() => {
    const scene = new FractionWallScene(containerRef.current, {
      onHover: (info) => handlers.current.onHover?.(info),
      onPick: (info) => handlers.current.onPick?.(info),
      onStats: (stats) => handlers.current.onStats?.(stats),
    });
    sceneRef.current = scene;
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.update(config, selection);
  }, [config, selection]);

  useImperativeHandle(
    ref,
    () => ({
      fitView: (preset) => sceneRef.current?.fitView(preset),
    }),
    [],
  );

  return (
    <div
      className="fw-stage"
      ref={containerRef}
      role="application"
      aria-label="Three dimensional fraction wall. Drag to orbit, scroll to zoom, click a block to add it to the selection."
    />
  );
});

export default WallCanvas;
