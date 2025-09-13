import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

import { Field, Textarea } from '@fluentui/react-components';

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

import { Section } from '@shared/models';
import { useState, useCallback, useRef } from 'react';

type TnSectionCodeProps = {
	section: Section;
	isNew: boolean;

	onSaveSection?: (content: string, language?: string) => void;
	onDeleteSection?: (sectionId: string) => void;
};

const TnSectionCode = ({ section, isNew, onSaveSection, onDeleteSection }: TnSectionCodeProps) => {
	const [sectionEdit, setSectionEdit] = useState(isNew);

	const [language, setLanguage] = useState<string | undefined>(section.language || undefined);
	const [content, setContent] = useState(section.content);
	const rootRef = useRef<HTMLDivElement | null>(null);

	const handleSave = useCallback(() => {
		onSaveSection?.call(null, content, language || undefined);
		setSectionEdit(false);
	}, [content, language]);

	const handleDelete = () => {
		onDeleteSection?.call(null, section.id);
	};

	const handleBlur: React.FocusEventHandler<HTMLDivElement> = (e) => {
		if (!sectionEdit) return;
		const next = e.relatedTarget as Node | null;
		if (rootRef.current && next && rootRef.current.contains(next)) return;
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
			className="note-section border border-border rounded-md p-2 min-w-0 w-full focus:outline-none focus:ring-1 focus:ring-accent cursor-default"
			onDoubleClick={() => setSectionEdit(true)}
			tabIndex={0}
			style={{ background: 'white' }}
			onBlur={handleBlur}
			onKeyDown={handleKeyDown}
		>
			{sectionEdit && (
				<div className="flex justify-start items-start gap-2 mb-1">
					<Select
						value={language || ''}
						onValueChange={(value) => setLanguage(value || undefined)}
					>
						<SelectTrigger className="w-40 h-7 text-xs">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="javascript">JavaScript</SelectItem>
							<SelectItem value="typescript">TypeScript</SelectItem>
							<SelectItem value="python">Python</SelectItem>
							<SelectItem value="sql">SQL</SelectItem>
							<SelectItem value="csharp">C#</SelectItem>
							<SelectItem value="java">Java</SelectItem>
							<SelectItem value="css">CSS</SelectItem>
							<SelectItem value="html">HTML</SelectItem>
							<SelectItem value="json">JSON</SelectItem>
							<SelectItem value="bash">Bash</SelectItem>
						</SelectContent>
					</Select>
				</div>
			)}
			{sectionEdit ? (
				<Field size="medium">
					<Textarea
						value={content}
						onChange={(_, data) => setContent(data.value)}
						placeholder={`Enter ${section.type} content...`}
						className=""
						onKeyDown={(ev) => {
							if (ev.ctrlKey && ev.key === 's') {
								ev.preventDefault();
								handleSave();
							}
							if (ev.key === 'Escape') {
								ev.preventDefault();
								handleSave();
							}
						}}
						autoFocus={!section.content.trim()}
					/>
				</Field>
			) : (
				<div className="min-w-0 w-full h-full overflow-auto rounded border">
					<SyntaxHighlighter
						language={language || 'javascript'}
						style={oneLight}
						className="min-w-0 w-full h-full"
						customStyle={{
							margin: 0,
							background: 'transparent',
							minHeight: '100%',
						}}
						wrapLongLines={true}
					>
						{section.content}
					</SyntaxHighlighter>
				</div>
			)}
		</div>
	);
};

export default TnSectionCode;
