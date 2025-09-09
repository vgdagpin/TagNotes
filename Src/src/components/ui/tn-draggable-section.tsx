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
  // Ghost (skeleton) element and data (mutable, no re-render during interaction)
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const ghostDataRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  // Track last commit and delay content remount until parent reflects values
  const lastCommitRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const [hideUntilSync, setHideUntilSync] = useState(false);

  // Default positioning for sections without coordinates
  // Helper: icon for section type
  // ...existing code...
  const x = section.x ?? 50;
  const y = section.y ?? 50;
  const width = section.width ?? 400;
  const height = section.height ?? 200;

  // Drag only when using explicit handle
  const handleDragHandleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    onSelect?.(section.id);
    const rect = sectionRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      ghostDataRef.current = { x: x, y: y, width: width as number, height: height as number };
    }
    e.preventDefault();
  };

  // Container click just selects
  const handleContainerMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.drag-handle') || target.classList.contains('resize-handle')) return; // handled elsewhere
    onSelect?.(section.id);
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
      ghostDataRef.current = { x: x, y: y, width: rect.width, height: rect.height };
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

  // Immediate commit helpers (no rAF) to avoid flicker when releasing
  const commitPosition = useCallback((newX: number, newY: number) => {
    dragPositionRef.current = { x: newX, y: newY };
    onPositionChange(section.id, newX, newY);
  }, [onPositionChange, section.id]);
  const commitDimension = useCallback((newWidth: number, newHeight: number) => {
    resizeDimensionRef.current = { width: newWidth, height: newHeight };
    onDimensionChange(section.id, newWidth, newHeight);
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
        ghostDataRef.current.x = constrainedX;
        ghostDataRef.current.y = constrainedY;
        if (ghostRef.current) {
          ghostRef.current.style.left = constrainedX + 'px';
          ghostRef.current.style.top = constrainedY + 'px';
        }
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
        ghostDataRef.current.width = newWidth;
        ghostDataRef.current.height = newHeight;
        ghostDataRef.current.x = newX;
        ghostDataRef.current.y = newY;
        if (ghostRef.current) {
          ghostRef.current.style.width = newWidth + 'px';
          ghostRef.current.style.height = newHeight + 'px';
          ghostRef.current.style.left = newX + 'px';
          ghostRef.current.style.top = newY + 'px';
        }
      }
    };
    const handleMouseUp = () => {
      if (isDragging) {
        commitPosition(ghostDataRef.current.x, ghostDataRef.current.y);
      }
      if (isResizing) {
        commitDimension(ghostDataRef.current.width, ghostDataRef.current.height);
        if (ghostDataRef.current.x !== x || ghostDataRef.current.y !== y) {
          commitPosition(ghostDataRef.current.x, ghostDataRef.current.y);
        }
      }
      // Record committed values and keep content hidden until parent props sync
      lastCommitRef.current = { ...ghostDataRef.current };

      setHideUntilSync(isDragging || isResizing);
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

  // Reveal content only when parent-supplied section props match committed values
  useEffect(() => {
    if (!hideUntilSync || !lastCommitRef.current) return;
    const committed = lastCommitRef.current;
    const sx = section.x ?? 50;
    const sy = section.y ?? 50;
    const sw = section.width ?? 400;
    const sh = section.height ?? 200;

    if (committed.x === 0 && committed.y === 0 && committed.width === 0 && committed.height === 0) {
      setHideUntilSync(false);
      lastCommitRef.current = null;
    } else 
      if (sx === committed.x && sy === committed.y && sw === committed.width && sh === committed.height) {
      setHideUntilSync(false);
      lastCommitRef.current = null;
    }
  }, [hideUntilSync, section.x, section.y, section.width, section.height]);

  return (
    <>
      {(isDragging || isResizing) && (
        <div
          ref={ghostRef}
          className={`absolute pointer-events-none border-2 border-dashed ${isSelected ? 'border-blue-500' : 'border-gray-400'} ${(isDragging || isResizing) ? 'z-50' : ''} transition-opacity duration-75`}
          style={{
            left: ghostDataRef.current.x,
            top: ghostDataRef.current.y,
            width: ghostDataRef.current.width,
            height: ghostDataRef.current.height,
            background: 'rgba(59,130,246,0.05)',
            opacity: 1,
          }}
        />
      )}
      <div
        ref={sectionRef}
        className={`absolute ${isSelected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
          } group ${(isDragging || isResizing || hideUntilSync) ? '' : 'z-10'}`}
        style={{
          left: `${x}px`,
          top: `${y}px`,
          width: typeof width === 'number' ? `${width}px` : width,
          height: typeof height === 'number' ? `${height}px` : height,
          display: (isDragging || isResizing || hideUntilSync) ? 'none' : 'block',
        }}
        onMouseDown={handleContainerMouseDown}
      >
        {/* Drag handle (only visible on hover) */}
        <div
          className="drag-handle absolute top-1 left-1 w-4 h-4 rounded-sm bg-blue-500/70 hover:bg-blue-500 cursor-move opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] text-white select-none"
          onMouseDown={handleDragHandleMouseDown}
          title="Drag section"
        >
          ⋮
        </div>
        {/* Resize handles */}
        {(['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] as ResizeHandle[]).map((handle) => {
          const size = handle.length === 2 ? 12 : 8;
          return (
            <div
              key={handle}
              className={`resize-handle resize-handle-${handle} ${isResizing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
              style={{
                position: 'absolute',
                width: size,
                height: size,
                background: '#2563eb', // tailwind blue-600 equivalent
                borderRadius: 4,
                zIndex: 20,
                boxShadow: '0 0 0 1px #fff',
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
          );
        })}
        {/* ...removed type selector UI... */}
        {/* Section content (not rendered while dragging/resizing for perf) */}
        {!(isDragging || isResizing || hideUntilSync) && (
          <div style={{ width: '100%', height: '100%' }}>
            {children}
          </div>
        )}
      </div>
    </>
  );
};

export default TnDraggableSection;