import React, { useState, useRef, useCallback } from 'react';
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
  onSaveSection: (sectionId: string, content: string, language?: string | null, title?: string) => void;
  onDeleteSection: (sectionId: string) => void;
  onPositionChange: (sectionId: string, x: number, y: number) => void;
  onTypeChange: (sectionId: string, newType: Section['type']) => void;
}

const TnCanvasViewer: React.FC<CanvasViewerProps> = ({
  note,
  newSectionId,
  onAddSection,
  onSaveSection,
  onDeleteSection,
  onPositionChange,
  onTypeChange,
}) => {
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [createMenuPosition, setCreateMenuPosition] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Assign default positions to sections without coordinates
  const sectionsWithPositions = note.sections.map((section, index) => ({
    ...section,
    x: section.x ?? 50 + (index % 3) * 420, // Arrange in columns
    y: section.y ?? 50 + Math.floor(index / 3) * 250, // Arrange in rows
    width: section.width ?? 400,
    height: section.height ?? 200,
  }));

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    // Only handle clicks on the canvas itself, not on sections
    if (e.target !== canvasRef.current) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Clear any selected section
    setSelectedSectionId(null);

    // Show create menu at click position
    setCreateMenuPosition({ x, y });
    setShowCreateMenu(true);
  }, []);

  const handleCreateSection = useCallback((type: Section['type']) => {
    onAddSection(createMenuPosition.x, createMenuPosition.y, type);
    setShowCreateMenu(false);
  }, [createMenuPosition, onAddSection]);

  const handleSectionSelect = useCallback((sectionId: string) => {
    setSelectedSectionId(sectionId);
    setShowCreateMenu(false);
  }, []);

  const renderSection = (section: Section) => {
    const isNew = section.id === newSectionId;
    const isSelected = section.id === selectedSectionId;

    const sectionComponent = (() => {
      switch (section.type) {
        case 'code':
          return (
            <TnSectionCode
              section={section}
              isNew={isNew}
              onSaveSection={(content, language, title) => onSaveSection(section.id, content, language, title)}
              onDeleteSection={() => onDeleteSection(section.id)}
            />
          );
        case 'markdown':
          return (
            <TnSectionMarkdown
              section={section}
              isNew={isNew}
              onSaveSection={(content, language, title) => onSaveSection(section.id, content, language, title)}
              onDeleteSection={() => onDeleteSection(section.id)}
            />
          );
        case 'image':
          return (
            <TnSectionImage
              section={section}
              isNew={isNew}
              onSaveSection={(content, language, title) => onSaveSection(section.id, content, language, title)}
              onDeleteSection={() => onDeleteSection(section.id)}
            />
          );
        default:
          return (
            <TnSection
              section={section}
              isNew={isNew}
              onSaveSection={(content, language, title) => onSaveSection(section.id, content, language, title)}
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
        onTypeChange={onTypeChange}
        isSelected={isSelected}
        onSelect={handleSectionSelect}
      >
        {sectionComponent}
      </TnDraggableSection>
    );
  };

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
        onClick={handleCanvasClick}
      >
        {/* Render all sections */}
        {sectionsWithPositions.map(renderSection)}

        {/* Create menu */}
        {showCreateMenu && (
          <div
            className="absolute z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-2"
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
          <div>• Click empty space to create sections</div>
          <div>• Drag sections to move them</div>
          <div>• Hover sections for type conversion</div>
        </div>
      </div>
    </div>
  );
};

export default TnCanvasViewer;