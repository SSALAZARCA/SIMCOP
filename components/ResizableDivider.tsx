import React, { useCallback } from 'react';

interface ResizableDividerProps {
  onDrag: (deltaX: number) => void;
  className?: string;
}

export const ResizableDivider: React.FC<ResizableDividerProps> = ({ onDrag, className }) => {
  const handleMouseDown = useCallback((mouseDownEvent: React.MouseEvent<HTMLDivElement>) => {
    mouseDownEvent.preventDefault();
    document.body.style.userSelect = 'none'; // Prevent text selection during drag

    const handleMouseMove = (mouseMoveEvent: MouseEvent) => {
      // Calculate deltaX based on movementX for better precision across different scenarios
      // movementX provides the difference in the X coordinate from the last mousemove event
      onDrag(mouseMoveEvent.movementX);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = ''; // Re-enable text selection
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
  }, [onDrag]);

  const handleTouchStart = useCallback((touchStartEvent: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartEvent.touches.length !== 1) return;
    touchStartEvent.preventDefault();
    document.body.style.userSelect = 'none';

    let lastClientX = touchStartEvent.touches[0].clientX;

    const handleTouchMove = (touchMoveEvent: TouchEvent) => {
      if (touchMoveEvent.touches.length !== 1) return;
      touchMoveEvent.preventDefault();
      const currentClientX = touchMoveEvent.touches[0].clientX;
      const deltaX = currentClientX - lastClientX;
      lastClientX = currentClientX;
      onDrag(deltaX);
    };

    const handleTouchEnd = () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
      document.body.style.userSelect = '';
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);
  }, [onDrag]);

  return (
    <div
      className={`bg-gray-700 hover:bg-blue-600 w-2 cursor-col-resize select-none shrink-0 relative after:absolute after:-left-3 after:-right-3 after:top-0 after:bottom-0 after:z-10 ${className || ''}`}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      title="Arrastrar para redimensionar"
      aria-label="Redimensionar panel"
      style={{ touchAction: 'none' }} // Prevent scrolling on touch devices when dragging
    />
  );
};