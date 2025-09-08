import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Section } from '@shared/models';
// ...existing code...

interface DraggableSectionProps {
  section: Section;
  children: React.ReactNode;
  onPositionChange: (sectionId: string, x: number, y: number) => void;
  onDimensionChange: (sectionId: string, width: number, height: number) => void;
  isSelected?: boolean;
  onSelect?: (sectionId: string) => void;
}

type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const TnDraggableSection: React.FC<DraggableSectionProps> = ({
  section,
  children,
  onPositionChange,
  onDimensionChange,
  isSelected = false,
  onSelect,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const sectionRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Default positioning for sections without coordinates
    // Helper: icon for section type
    // ...existing code...
  const x = section.x ?? 50;
  const y = section.y ?? 50;
  const width = section.width ?? 400;
  const height = section.height ?? 200;

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('resize-handle') || target.tagName === 'BUTTON' || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
      return;
    }
    setIsDragging(true);
    // Helper: handle type change
    onSelect?.(section.id);
    const rect = sectionRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
    e.preventDefault();
  };

  const handleResizeMouseDown = (handle: ResizeHandle, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeHandle(handle);
    const rect = sectionRef.current?.getBoundingClientRect();
    if (rect) {
      setResizeStart({
        x: e.clientX,
        y: e.clientY,
        width: rect.width,
        height: rect.height,
      });
    }
    onSelect?.(section.id);
  };

  // Drag and resize logic with requestAnimationFrame
  const dragPositionRef = useRef({ x, y });
  const resizeDimensionRef = useRef({ width, height });
  const updatePosition = useCallback((newX: number, newY: number) => {
    dragPositionRef.current = { x: newX, y: newY };
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(() => {
      onPositionChange(section.id, newX, newY);
    });
  }, [onPositionChange, section.id]);
  const updateDimension = useCallback((newWidth: number, newHeight: number) => {
    resizeDimensionRef.current = { width: newWidth, height: newHeight };
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(() => {
      onDimensionChange(section.id, newWidth, newHeight);
    });
  }, [onDimensionChange, section.id]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const canvas = sectionRef.current?.parentElement;
        if (!canvas) return;
        const canvasRect = canvas.getBoundingClientRect();
        const newX = e.clientX - canvasRect.left - dragOffset.x;
        const newY = e.clientY - canvasRect.top - dragOffset.y;
        const constrainedX = Math.max(0, Math.min(newX, canvasRect.width - (sectionRef.current?.offsetWidth || 400)));
        const constrainedY = Math.max(0, Math.min(newY, canvasRect.height - (sectionRef.current?.offsetHeight || 200)));
        updatePosition(constrainedX, constrainedY);
      }
      if (isResizing && resizeHandle) {
        const dx = e.clientX - resizeStart.x;
        const dy = e.clientY - resizeStart.y;
        let newWidth = resizeStart.width;
        let newHeight = resizeStart.height;
        let newX = x;
        let newY = y;
        if (resizeHandle.includes('e')) {
          newWidth = Math.max(100, resizeStart.width + dx);
        }
        if (resizeHandle.includes('s')) {
          newHeight = Math.max(50, resizeStart.height + dy);
        }
        if (resizeHandle.includes('w')) {
          newWidth = Math.max(100, resizeStart.width - dx);
          newX = x + dx;
        }
        if (resizeHandle.includes('n')) {
          newHeight = Math.max(50, resizeStart.height - dy);
          newY = y + dy;
        }
        updateDimension(newWidth, newHeight);
        if (resizeHandle.includes('w') || resizeHandle.includes('n')) {
          updatePosition(newX, newY);
        }
      }
    };
    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeHandle(null);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, updatePosition, isResizing, resizeHandle, resizeStart, x, y, updateDimension]);

  return (
    <div
      ref={sectionRef}
      className={`absolute cursor-move transition-all duration-200 ${
        isDragging ? 'z-50 shadow-2xl scale-105' : 'z-10'
      } ${
        isSelected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
      } hover:shadow-lg group`}
      style={{
        left: `${x}px`,
        top: `${y}px`,
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        willChange: isDragging || isResizing ? 'transform' : undefined,
        userSelect: isDragging || isResizing ? 'none' : 'auto',
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Resize handles */}
      {(['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] as ResizeHandle[]).map((handle) => (
        <div
          key={handle}
          className={`resize-handle resize-handle-${handle}`}
          style={{
            position: 'absolute',
            width: handle.length === 2 ? 12 : 8,
            height: handle.length === 2 ? 12 : 8,
            background: '#007bff',
            borderRadius: 4,
            zIndex: 20,
            cursor:
              handle === 'n' ? 'ns-resize' :
              handle === 's' ? 'ns-resize' :
              handle === 'e' ? 'ew-resize' :
              handle === 'w' ? 'ew-resize' :
              handle === 'ne' ? 'nesw-resize' :
              handle === 'nw' ? 'nwse-resize' :
              handle === 'se' ? 'nwse-resize' :
              handle === 'sw' ? 'nesw-resize' : 'pointer',
            top:
              handle.includes('n') ? -6 : handle.includes('s') ? height - 6 : (height / 2) - 4,
            left:
              handle.includes('w') ? -6 : handle.includes('e') ? width - 6 : (width / 2) - 4,
          }}
          onMouseDown={(e) => handleResizeMouseDown(handle, e)}
        />
      ))}
  {/* ...removed type selector UI... */}
      {/* Section content */}
      <div style={{ width: '100%', height: '100%' }}>{children}</div>
    </div>
  );
};

export default TnDraggableSection;