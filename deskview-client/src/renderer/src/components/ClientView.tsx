import { useCallback, useEffect, useRef } from 'react';

interface ClientViewProps {
  remoteStream: MediaStream | null;
  onControl: (msg: Record<string, unknown>) => void;
}

const BUTTON_MAP: Record<number, string> = { 0: 'left', 1: 'middle', 2: 'right' };

export default function ClientView({ remoteStream, onControl }: ClientViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const focusedRef = useRef(false);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  const getRatio = useCallback((e: React.MouseEvent<HTMLVideoElement>) => {
    const video = videoRef.current;
    if (!video) return { x: 0, y: 0 };
    const rect = video.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLVideoElement>) => {
    const { x, y } = getRatio(e);
    onControl({ type: 'mouse-move', x, y });
  }, [getRatio, onControl]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLVideoElement>) => {
    const { x, y } = getRatio(e);
    onControl({ type: 'mouse-move', x, y });
    onControl({ type: 'mouse-down', button: BUTTON_MAP[e.button] || 'left' });
  }, [getRatio, onControl]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLVideoElement>) => {
    onControl({ type: 'mouse-up', button: BUTTON_MAP[e.button] || 'left' });
  }, [onControl]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLVideoElement>) => {
    e.preventDefault();
    onControl({ type: 'mouse-wheel', deltaX: e.deltaX, deltaY: e.deltaY });
  }, [onControl]);

  const handleKey = useCallback((action: 'key-down' | 'key-up', e: React.KeyboardEvent<HTMLVideoElement>) => {
    if (!focusedRef.current) return;
    e.preventDefault();
    onControl({
      type: action,
      key: e.key,
      code: e.code,
      shiftKey: e.shiftKey,
      ctrlKey: e.ctrlKey,
      altKey: e.altKey,
      metaKey: e.metaKey,
    });
  }, [onControl]);

  const handleFocus = useCallback(() => { focusedRef.current = true; }, []);
  const handleBlur = useCallback(() => { focusedRef.current = false; }, []);

  return (
    <div className="main-area">
      <div className="screen-container">
        {remoteStream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            tabIndex={0}
            onMouseMove={handleMouseMove}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
            onKeyDown={(e) => handleKey('key-down', e)}
            onKeyUp={(e) => handleKey('key-up', e)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={{ outline: 'none' }}
          />
        ) : (
          <span className="placeholder">Waiting for remote screen...</span>
        )}
      </div>
    </div>
  );
}
