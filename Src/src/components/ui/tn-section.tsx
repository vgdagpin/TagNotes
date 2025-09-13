import { Textarea } from '@/components/ui/textarea';
import { Section } from '@shared/models';
import { useState, useCallback, useRef } from 'react';

type TnSectionProps = {
	section: Section;
	isNew: boolean;
	onSaveSection?: (content: string, language?: string) => void;
	onDeleteSection?: (sectionId: string) => void;
};

const TnSection = ({ section, isNew, onSaveSection, onDeleteSection }: TnSectionProps) => {
	const [sectionEdit, setSectionEdit] = useState(isNew);
	const [content, setContent] = useState(section.content);
	const rootRef = useRef<HTMLDivElement | null>(null);

	const handleSave = useCallback(() => {
		onSaveSection?.call(null, content, undefined);
		setSectionEdit(false);
	}, [content]);

	const handleDelete = () => {
		onDeleteSection?.call(null, section.id);
	};

	const handleBlur: React.FocusEventHandler<HTMLDivElement> = (e) => {
		if (!sectionEdit) return;
		const next = e.relatedTarget as Node | null;
		if (rootRef.current && next && rootRef.current.contains(next)) return; // focus still inside
		handleSave();
	};

	const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
		if (!sectionEdit && e.key === 'Delete') {
			e.preventDefault();
			handleDelete();
		}
	};

	return (
		<div
			ref={rootRef}
			className="note-section rounded-md p-2 transition-colors min-w-0 w-full bg-transparent focus:outline-none focus:ring-1 focus:ring-accent cursor-default"
			style={{ background: 'white' }}
			onDoubleClick={() => !sectionEdit && setSectionEdit(true)}
			tabIndex={0}
			onBlur={handleBlur}
			onKeyDown={handleKeyDown}
		>
			{sectionEdit ? (
				<Textarea
					value={content}
					onChange={(e) => setContent(e.target.value)}
					placeholder={`Enter ${section.type} content...`}
					className="min-h-32 resize-vertical"
					onKeyDown={(e) => {
						if (e.ctrlKey && e.key === 's') {
							e.preventDefault();
							handleSave();
						}
						if (e.key === 'Escape') {
							e.preventDefault();
							handleSave();
						}
					}}
					autoFocus={!section.content.trim()}
				/>
			) : (
				<div
					className="whitespace-pre-wrap text-sm leading-relaxed"
					style={{ background: 'white' }}
				>
					{section.content || (
						<span className="text-muted-foreground italic">Blank..</span>
					)}
				</div>
			)}
		</div>
	);
};

export default TnSection;
