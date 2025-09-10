import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Note, Section } from '@shared/models';
import { Button } from '@/components/ui/button';
import { Plus, Type, Hash, Code } from '@/components/tn-icons';
import TnDraggableSection from './tn-draggable-section';
import TnSection from './tn-section';
import TnSectionMarkdown from './tn-section-markdown';
import TnSectionCode from './tn-section-code';
import TnSectionImage from './tn-section-image';

interface CanvasViewerProps {
  note: Note;
  newSectionId: string | null;
  onAddSection: (x: number, y: number, type: Section['type']) => void;
  onSaveSection: (sectionId: string, content: string, language?: string | null) => void;
  onDeleteSection: (sectionId: string) => void;
  onPositionChange: (sectionId: string, x: number, y: number) => void;
  onDimensionChange: (sectionId: string, width: number, height: number) => void;
  onTypeChange: (sectionId: string, newType: Section['type']) => void;
  forwardCanvasRef?: React.RefObject<HTMLDivElement>; // external scroll container ref
}

const TnCanvasViewer: React.FC<CanvasViewerProps> = ({
  note,
  newSectionId,
  onAddSection,
  onSaveSection,
  onDeleteSection,
  onPositionChange,
  onDimensionChange,
  // ...removed onTypeChange...
  forwardCanvasRef,
}) => {
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [createMenuPosition, setCreateMenuPosition] = useState({ x: 0, y: 0 });
  // Drag-to-create state
  const [isCreating, setIsCreating] = useState(false);
  const [createRect, setCreateRect] = useState<null | { x: number; y: number; width: number; height: number }>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const pendingRectRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const internalCanvasRef = useRef<HTMLDivElement>(null);
  const canvasRef = forwardCanvasRef || internalCanvasRef;

  // Assign default positions to sections without coordinates
  const sectionsWithPositions = note.sections.map((section, index) => ({
    ...section,
    x: section.x ?? 50 + (index % 3) * 420, // Arrange in columns
    y: section.y ?? 50 + Math.floor(index / 3) * 250, // Arrange in rows
    width: section.width ?? 400,
    height: section.height ?? 200,
  }));

  // Compute maximum bottom edge of all sections to extend scrollable area
  const maxBottom = sectionsWithPositions.reduce((acc, s) => {
    const bottom = (s.y ?? 0) + (s.height ?? 200);
    return bottom > acc ? bottom : acc;
  }, 0);
  // Compute maximum right edge for horizontal expansion
  const maxRight = sectionsWithPositions.reduce((acc, s) => {
    const right = (s.x ?? 0) + (s.width ?? 400);
    return right > acc ? right : acc;
  }, 0);
  // Add generous buffer so resize handles & future drag space are accessible
  const spacerHeight = Math.max(maxBottom + 600, 1000); // at least 1000px
  const contentWidth = Math.max(maxRight + 800, 1600); // horizontal free space

  // Begin drag-to-create rectangle
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // left click only
    const target = e.target as HTMLElement;
    // Ignore if clicking inside an existing section or its controls
    // Also ignore clicks inside the creation menu so choosing a type doesn't start a new rectangle
    if (target.closest('.note-section') || target.closest('.drag-handle') || target.classList.contains('resize-handle') || target.closest('.create-menu')) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    dragStartRef.current = { x, y };
    setCreateRect({ x, y, width: 0, height: 0 });
    setIsCreating(true);
    setShowCreateMenu(false);
    setSelectedSectionId(null);
  }, []);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isCreating || !dragStartRef.current) return;
    const scrollEl = canvasRef.current;
    if (!scrollEl) return;
    let rect = scrollEl.getBoundingClientRect();

    // Auto-pan when near edges while creating
    const edge = 40; // px threshold
    let panX = 0;
    let panY = 0;
    if (e.clientX > rect.right - edge) panX = 40;
    else if (e.clientX < rect.left + edge) panX = -40;
    if (e.clientY > rect.bottom - edge) panY = 40;
    else if (e.clientY < rect.top + edge) panY = -40;
    if (panX !== 0 || panY !== 0) {
      scrollEl.scrollBy({ left: panX, top: panY });
      // After scrolling, recalc rect for accurate position
      rect = scrollEl.getBoundingClientRect();
    }
    const x = e.clientX - rect.left + scrollEl.scrollLeft;
    const y = e.clientY - rect.top + scrollEl.scrollTop;
    const start = dragStartRef.current;
    const left = Math.min(start.x, x);
    const top = Math.min(start.y, y);
    const width = Math.abs(x - start.x);
    const height = Math.abs(y - start.y);
    setCreateRect({ x: left, y: top, width, height });
  }, [isCreating]);

  const finishCreation = useCallback(() => {
    if (!isCreating) return;
    setIsCreating(false);
    if (createRect && createRect.width > 10 && createRect.height > 10) {
      // Anchor menu at the beginning (top-left) of the drawn rectangle
      const canvas = canvasRef.current?.getBoundingClientRect();
      let menuX = createRect.x;
      let menuY = createRect.y - 44; // raise slightly above selection
      if (canvas) {
        // Clamp so it stays in view
        menuX = Math.min(Math.max(0, menuX), canvas.width - 160);
        menuY = Math.min(Math.max(0, menuY), canvas.height - 140);
      }
      setCreateMenuPosition({ x: menuX, y: menuY });
      setShowCreateMenu(true);
    } else {
      // Too small: cancel
      setCreateRect(null);
    }
    dragStartRef.current = null;
  }, [isCreating, createRect]);

  const handleCanvasMouseUp = useCallback(() => {
    finishCreation();
  }, [finishCreation]);

  const handleCanvasMouseLeave = useCallback(() => {
    // If user leaves canvas while creating, finish
    finishCreation();
  }, [finishCreation]);

  // ESC to cancel creation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCreating) {
        setIsCreating(false);
        setCreateRect(null);
        dragStartRef.current = null;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isCreating]);

  const handleCreateSection = useCallback((type: Section['type']) => {
    if (createRect) {
      onAddSection(createRect.x, createRect.y, type);
      pendingRectRef.current = { ...createRect };
    } else {
      // fallback to menu position
      onAddSection(createMenuPosition.x, createMenuPosition.y, type);
    }
    setShowCreateMenu(false);
    setCreateRect(null);
  }, [createRect, createMenuPosition, onAddSection]);

  // After new section id appears, apply dimensions from pending rect
  useEffect(() => {
    if (newSectionId && pendingRectRef.current) {
      const r = pendingRectRef.current;
      onDimensionChange(newSectionId, Math.max(50, r.width), Math.max(30, r.height));
      pendingRectRef.current = null;
    }
  }, [newSectionId, onDimensionChange]);

  const handleSectionSelect = useCallback((sectionId: string) => {
    setSelectedSectionId(sectionId);
    setShowCreateMenu(false);
  }, []);

  const renderSection = useCallback((section: Section) => {
    const isNew = section.id === newSectionId;
    const isSelected = section.id === selectedSectionId;

    const sectionComponent = (() => {
      switch (section.type) {
        case 'code':
          return (
            <TnSectionCode
              section={section}
              isNew={isNew}
              onSaveSection={(content, language) => onSaveSection(section.id, content, language)}
              onDeleteSection={() => onDeleteSection(section.id)}
            />
          );
        case 'markdown':
          return (
            <TnSectionMarkdown
              section={section}
              isNew={isNew}
              onSaveSection={(content, language) => onSaveSection(section.id, content, language)}
              onDeleteSection={() => onDeleteSection(section.id)}
            />
          );
        case 'image':
          return (
            <TnSectionImage
              section={section}
              isNew={isNew}
              onSaveSection={(content, language) => onSaveSection(section.id, content, language)}
              onDeleteSection={() => onDeleteSection(section.id)}
            />
          );
        default:
          return (
            <TnSection
              section={section}
              isNew={isNew}
              onSaveSection={(content, language) => onSaveSection(section.id, content, language)}
              onDeleteSection={() => onDeleteSection(section.id)}
            />
          );
      }
    })();

    return (
      <TnDraggableSection
        key={section.id}
        section={section}
        onPositionChange={onPositionChange}
        onDimensionChange={onDimensionChange}
  // ...removed onTypeChange prop...
        isSelected={isSelected}
        onSelect={handleSectionSelect}
      >
        {sectionComponent}
      </TnDraggableSection>
    );
  }, [newSectionId, selectedSectionId, onSaveSection, onDeleteSection, onPositionChange, onDimensionChange, handleSectionSelect]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Canvas */}
      <div
        ref={canvasRef}
        className="relative w-full h-full min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 overflow-auto cursor-crosshair"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
        }}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseLeave}
      >
        <div
          className="relative"
          style={{ width: contentWidth, height: spacerHeight }}
        >
          {/* Creation rectangle overlay */}
          {isCreating && createRect && (
            <div
              className="absolute border-2 border-blue-500/70 bg-blue-500/10 pointer-events-none"
              style={{
                left: createRect.x,
                top: createRect.y,
                width: createRect.width,
                height: createRect.height,
              }}
            />
          )}
          {/* Render all sections */}
          {sectionsWithPositions.map(renderSection)}
        </div>

        {/* Create menu */}
  {showCreateMenu && (
          <div
            className="absolute z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-2 create-menu"
            style={{
              left: `${createMenuPosition.x}px`,
              top: `${createMenuPosition.y}px`,
            }}
          >
            <div className="flex flex-col gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="justify-start gap-2 h-8"
                onClick={() => handleCreateSection('text')}
              >
                <Type className="h-4 w-4" />
                Text
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start gap-2 h-8"
                onClick={() => handleCreateSection('markdown')}
              >
                <Hash className="h-4 w-4" />
                Markdown
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start gap-2 h-8"
                onClick={() => handleCreateSection('code')}
              >
                <Code className="h-4 w-4" />
                Code
              </Button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {note.sections.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-gray-500">
              <Plus className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Click anywhere to add content</p>
              <p className="text-sm">Create text, markdown, or code sections by clicking on the canvas</p>
            </div>
          </div>
        )}
      </div>

      {/* Instructions overlay */}
      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-gray-200 text-xs text-gray-600 max-w-xs">
        <div className="space-y-1">
          <div>• Drag empty canvas to draw new section</div>
          <div>• Drag sections by handle to move them</div>
          <div>• Hover sections for controls</div>
        </div>
      </div>
    </div>
  );
};

export default TnCanvasViewer;