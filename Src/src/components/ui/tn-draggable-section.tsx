import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Section } from '@shared/models';
import { Button } from '@/components/ui/button';
import { Type, Hash, Code, Image } from '@/components/tn-icons';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DraggableSectionProps {
  section: Section;
  children: React.ReactNode;
  onPositionChange: (sectionId: string, x: number, y: number) => void;
  onDimensionChange: (sectionId: string, width: number, height: number) => void;
  onTypeChange: (sectionId: string, newType: Section['type']) => void;
  isSelected?: boolean;
  onSelect?: (sectionId: string) => void;
}

type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const TnDraggableSection: React.FC<DraggableSectionProps> = ({
  section,
  children,
  onPositionChange,
  onDimensionChange,
  onTypeChange,
  isSelected = false,
  onSelect,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const sectionRef = useRef<HTMLDivElement>(null);

  // Default positioning for sections without coordinates
  const x = section.x ?? 50;
  const y = section.y ?? 50;
  const width = section.width ?? 400;
  const height = section.height ?? 200;

  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't start dragging if clicking on interactive elements or resize handles
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.classList.contains('resize-handle')) {
      return;
    }

    setIsDragging(true);
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

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    setIsResizing(true);
    onSelect?.(section.id);

    const rect = sectionRef.current?.getBoundingClientRect();
    if (rect) {
      setResizeStart({
        x: e.clientX,
        y: e.clientY,
        width: rect.width,
        height: rect.height,
      });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !sectionRef.current) return;

    const canvas = sectionRef.current.parentElement;
    if (!canvas) return;

    const canvasRect = canvas.getBoundingClientRect();
    const newX = e.clientX - canvasRect.left - dragOffset.x;
    const newY = e.clientY - canvasRect.top - dragOffset.y;

    // Constrain to canvas bounds
    const constrainedX = Math.max(0, Math.min(newX, canvasRect.width - (sectionRef.current.offsetWidth || 400)));
    const constrainedY = Math.max(0, Math.min(newY, canvasRect.height - (sectionRef.current.offsetHeight || 200)));

    // Update position immediately for smooth dragging
    sectionRef.current.style.left = `${constrainedX}px`;
    sectionRef.current.style.top = `${constrainedY}px`;
  };

  const handleMouseUp = (e: MouseEvent) => {
    if (!isDragging || !sectionRef.current) return;

    const canvas = sectionRef.current.parentElement;
    if (!canvas) return;

    const canvasRect = canvas.getBoundingClientRect();
    const finalX = e.clientX - canvasRect.left - dragOffset.x;
    const finalY = e.clientY - canvasRect.top - dragOffset.y;

    // Constrain to canvas bounds
    const constrainedX = Math.max(0, Math.min(finalX, canvasRect.width - (sectionRef.current.offsetWidth || 400)));
    const constrainedY = Math.max(0, Math.min(finalY, canvasRect.height - (sectionRef.current.offsetHeight || 200)));

    onPositionChange(section.id, constrainedX, constrainedY);
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging, dragOffset]);

  const getSectionTypeIcon = (type: Section['type']) => {
    switch (type) {
      case 'text': return <Type className="h-3 w-3" />;
      case 'markdown': return <Hash className="h-3 w-3" />;
      case 'code': return <Code className="h-3 w-3" />;
      case 'image': return <Image className="h-3 w-3" />;
      default: return <Type className="h-3 w-3" />;
    }
  };

  const handleTypeChange = (newType: Section['type']) => {
    onTypeChange(section.id, newType);
    setShowTypeSelector(false);
  };

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
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Type conversion controls - top right corner */}
      <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
        {showTypeSelector ? (
          <Select value={section.type} onValueChange={handleTypeChange}>
            <SelectTrigger className="w-8 h-8 p-0 border-2 border-white bg-white shadow-lg">
              <SelectValue>
                {getSectionTypeIcon(section.type)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">
                <div className="flex items-center gap-2">
                  <Type className="h-3 w-3" />
                  Text
                </div>
              </SelectItem>
              <SelectItem value="markdown">
                <div className="flex items-center gap-2">
                  <Hash className="h-3 w-3" />
                  Markdown
                </div>
              </SelectItem>
              <SelectItem value="code">
                <div className="flex items-center gap-2">
                  <Code className="h-3 w-3" />
                  Code
                </div>
              </SelectItem>
              {section.type === 'image' && (
                <SelectItem value="image">
                  <div className="flex items-center gap-2">
                    <Image className="h-3 w-3" />
                    Image
                  </div>
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-8 h-8 p-0 border-2 border-white bg-white shadow-lg hover:bg-gray-50"
            onClick={(e) => {
              e.stopPropagation();
              setShowTypeSelector(true);
            }}
          >
            {getSectionTypeIcon(section.type)}
          </Button>
        )}
      </div>

      {/* Resize handle */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <div
          className="resize-handle absolute bottom-0 right-0 w-4 h-4 bg-blue-500 cursor-nw-resize rounded-tl-md"
          onMouseDown={handleResizeStart}
        />
      </div>

      {/* Section content */}
      <div className="relative w-full h-full overflow-hidden">
        {children}
      </div>
    </div>
  );
};

export default TnDraggableSection;