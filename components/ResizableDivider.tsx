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

  return (
    <div
      className={`bg-gray-700 hover:bg-blue-600 w-2 cursor-col-resize select-none shrink-0 ${className || ''}`}
      onMouseDown={handleMouseDown}
      title="Arrastrar para redimensionar"
      aria-label="Redimensionar panel"
      style={{ touchAction: 'none' }} // Prevent scrolling on touch devices when dragging
    />
  );
};