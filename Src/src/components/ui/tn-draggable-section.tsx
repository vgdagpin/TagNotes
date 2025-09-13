import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Section } from '@shared/models';

interface DraggableSectionProps {
	section: Section;
	children: React.ReactNode;
	onPositionChange: (sectionId: string, x: number, y: number) => void;
	onDimensionChange: (sectionId: string, width: number, height: number) => void;
	isSelected?: boolean;
	onSelect?: (sectionId: string) => void;
	onProvisionalExtentChange?: (right: number, bottom: number) => void; // report ghost extents while dragging/resizing
}

type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

// Hover sensitivity constants
const RESIZE_HOVER_THRESHOLD = 28; // previously 14 – larger = easier to trigger
const RESIZE_HOVER_OUTSIDE_ALLOW = 10; // px allowance outside the element bounds
const HANDLE_OUTSIDE_OFFSET = 6; // reduced (was 10) to bring handles a bit closer

const TnDraggableSection: React.FC<DraggableSectionProps> = ({
	section,
	children,
	onPositionChange,
	onDimensionChange,
	isSelected = false,
	onSelect,
	onProvisionalExtentChange,
}) => {
	const [isDragging, setIsDragging] = useState(false);
	const [isResizing, setIsResizing] = useState(false);
	const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null);
	const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
	const [resizeStart, setResizeStart] = useState({
		x: 0,
		y: 0,
		width: 0,
		height: 0,
	});
	const sectionRef = useRef<HTMLDivElement>(null);
	const animationFrameRef = useRef<number | null>(null);
	const ghostRef = useRef<HTMLDivElement | null>(null);
	const ghostDataRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
	const lastCommitRef = useRef<{
		x: number;
		y: number;
		width: number;
		height: number;
	} | null>(null);
	const [hideUntilSync, setHideUntilSync] = useState(false);
	const [hoverCorner, setHoverCorner] = useState<ResizeHandle | null>(null);

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
			ghostDataRef.current = {
				x: x,
				y: y,
				width: width as number,
				height: height as number,
			};
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
			ghostDataRef.current = {
				x: x,
				y: y,
				width: rect.width,
				height: rect.height,
			};
		}
		onSelect?.(section.id);
	};

	// Corner + edge hover detection
	const handleSectionMouseMove = (e: React.MouseEvent) => {
		if (!isSelected) return; // only track hover when focused
		if (isDragging || isResizing) return;
		const rect = sectionRef.current?.getBoundingClientRect();
		if (!rect) return;
		// Raw relative coords (can be slightly outside)
		const rawLX = e.clientX - rect.left;
		const rawLY = e.clientY - rect.top;
		// Allow a small outside zone so users don't need pixel‑perfect inside positioning
		const lx = Math.min(
			Math.max(rawLX, -RESIZE_HOVER_OUTSIDE_ALLOW),
			rect.width + RESIZE_HOVER_OUTSIDE_ALLOW,
		);
		const ly = Math.min(
			Math.max(rawLY, -RESIZE_HOVER_OUTSIDE_ALLOW),
			rect.height + RESIZE_HOVER_OUTSIDE_ALLOW,
		);
		const threshold = RESIZE_HOVER_THRESHOLD;
		let corner: ResizeHandle | null = null;
		if (lx <= threshold && ly <= threshold) corner = 'nw';
		else if (lx >= rect.width - threshold && ly <= threshold) corner = 'ne';
		else if (lx >= rect.width - threshold && ly >= rect.height - threshold) corner = 'se';
		else if (lx <= threshold && ly >= rect.height - threshold) corner = 'sw';
		else if (ly <= threshold) corner = 'n';
		else if (ly >= rect.height - threshold) corner = 's';
		else if (lx <= threshold) corner = 'w';
		else if (lx >= rect.width - threshold) corner = 'e';
		if (corner !== hoverCorner) setHoverCorner(corner);
	};
	const handleSectionMouseLeave = () => {
		if (!isResizing) setHoverCorner(null);
	};

	// Drag and resize logic with requestAnimationFrame
	const dragPositionRef = useRef({ x, y });
	const resizeDimensionRef = useRef({ width, height });
	const updatePosition = useCallback(
		(newX: number, newY: number) => {
			dragPositionRef.current = { x: newX, y: newY };
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current);
			}
			animationFrameRef.current = requestAnimationFrame(() => {
				onPositionChange(section.id, newX, newY);
			});
		},
		[onPositionChange, section.id],
	);
	const updateDimension = useCallback(
		(newWidth: number, newHeight: number) => {
			resizeDimensionRef.current = { width: newWidth, height: newHeight };
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current);
			}
			animationFrameRef.current = requestAnimationFrame(() => {
				onDimensionChange(section.id, newWidth, newHeight);
			});
		},
		[onDimensionChange, section.id],
	);

	// Immediate commit helpers (no rAF) to avoid flicker when releasing
	const commitPosition = useCallback(
		(newX: number, newY: number) => {
			dragPositionRef.current = { x: newX, y: newY };
			onPositionChange(section.id, newX, newY);
		},
		[onPositionChange, section.id],
	);
	const commitDimension = useCallback(
		(newWidth: number, newHeight: number) => {
			resizeDimensionRef.current = { width: newWidth, height: newHeight };
			onDimensionChange(section.id, newWidth, newHeight);
		},
		[onDimensionChange, section.id],
	);

	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			if (isDragging) {
				const canvas = sectionRef.current?.parentElement;
				if (!canvas) return;
				const canvasRect = canvas.getBoundingClientRect();
				const newX = e.clientX - canvasRect.left - dragOffset.x;
				const newY = e.clientY - canvasRect.top - dragOffset.y;
				const constrainedX = Math.max(
					0,
					Math.min(newX, canvasRect.width - (sectionRef.current?.offsetWidth || 400)),
				);
				const constrainedY = Math.max(
					0,
					Math.min(newY, canvasRect.height - (sectionRef.current?.offsetHeight || 200)),
				);
				ghostDataRef.current.x = constrainedX;
				ghostDataRef.current.y = constrainedY;
				if (ghostRef.current) {
					ghostRef.current.style.left = constrainedX + 'px';
					ghostRef.current.style.top = constrainedY + 'px';
				}
				onProvisionalExtentChange?.(
					constrainedX + ghostDataRef.current.width,
					constrainedY + ghostDataRef.current.height,
				);
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
				onProvisionalExtentChange?.(newX + newWidth, newY + newHeight);
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
			// Clear provisional on release
			onProvisionalExtentChange?.(0, 0);
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
	}, [
		isDragging,
		dragOffset,
		updatePosition,
		isResizing,
		resizeHandle,
		resizeStart,
		x,
		y,
		updateDimension,
		commitDimension,
		commitPosition,
		onProvisionalExtentChange,
	]);

	// Reveal content only when parent-supplied section props match committed values
	useEffect(() => {
		if (!hideUntilSync || !lastCommitRef.current) return;
		const committed = lastCommitRef.current;
		const sx = section.x ?? 50;
		const sy = section.y ?? 50;
		const sw = section.width ?? 400;
		const sh = section.height ?? 200;

		if (
			committed.x === 0 &&
			committed.y === 0 &&
			committed.width === 0 &&
			committed.height === 0
		) {
			setHideUntilSync(false);
			lastCommitRef.current = null;
		} else if (
			sx === committed.x &&
			sy === committed.y &&
			sw === committed.width &&
			sh === committed.height
		) {
			setHideUntilSync(false);
			lastCommitRef.current = null;
		}
	}, [hideUntilSync, section.x, section.y, section.width, section.height]);

	return (
		<>
			{(isDragging || isResizing) && (
				<div
					ref={ghostRef}
					className={`absolute pointer-events-none border-2 border-dashed ${isSelected ? 'border-blue-500' : 'border-gray-400'} ${isDragging || isResizing ? 'z-50' : ''} transition-opacity duration-75`}
					style={{
						left: ghostDataRef.current.x,
						top: ghostDataRef.current.y,
						width: ghostDataRef.current.width,
						height: ghostDataRef.current.height,
						background: 'hsl(var(--card))',
						opacity: 1,
					}}
				/>
			)}
			<div
				ref={sectionRef}
				className={`border border-border absolute ${isSelected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''} group ${isDragging || isResizing || hideUntilSync ? '' : 'z-10'} cursor-default`}
				style={{
					left: `${x}px`,
					top: `${y}px`,
					width: typeof width === 'number' ? `${width}px` : width,
					height: typeof height === 'number' ? `${height}px` : height,
					display: isDragging || isResizing || hideUntilSync ? 'none' : 'block',
					background: 'white', // Fill unused space so canvas doesn't show through
				}}
				onMouseDown={handleContainerMouseDown}
				onMouseMove={handleSectionMouseMove}
				onMouseLeave={handleSectionMouseLeave}
			>
				<div
					className="drag-handle absolute top-1 left-1 w-4 h-4 rounded-sm bg-blue-500/70 hover:bg-blue-500 cursor-move opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] text-white select-none"
					onMouseDown={handleDragHandleMouseDown}
					title="Drag section"
				>
					⋮
				</div>
				{isSelected &&
					(['nw', 'ne', 'se', 'sw', 'n', 's', 'e', 'w'] as ResizeHandle[]).map(
						(handle) => {
							const size = 14;
							const style: React.CSSProperties = {
								position: 'absolute',
								width: size,
								height: size,
								background:
									(isResizing && resizeHandle === handle) ||
									hoverCorner === handle
										? '#1d4ed8'
										: '#2563eb',
								borderRadius: 6,
								zIndex: 40,
								boxShadow: '0 0 0 1px #fff',
								cursor:
									handle === 'ne'
										? 'nesw-resize'
										: handle === 'nw'
											? 'nwse-resize'
											: handle === 'se'
												? 'nwse-resize'
												: handle === 'sw'
													? 'nesw-resize'
													: handle === 'n' || handle === 's'
														? 'ns-resize'
														: handle === 'e' || handle === 'w'
															? 'ew-resize'
															: 'pointer',
								// Position handles: corners keep previous logic; edges centered on their side
								// Place handles further outside: center sits HANDLE_OUTSIDE_OFFSET beyond border
								top:
									handle === 'nw' || handle === 'ne'
										? -(size / 2 + HANDLE_OUTSIDE_OFFSET)
										: handle === 'sw' || handle === 'se'
											? height - size / 2 + HANDLE_OUTSIDE_OFFSET
											: handle === 'n'
												? -(size / 2 + HANDLE_OUTSIDE_OFFSET)
												: handle === 's'
													? height - size / 2 + HANDLE_OUTSIDE_OFFSET
													: handle === 'e' || handle === 'w'
														? height / 2 - size / 2
														: 0,
								left:
									handle === 'nw' || handle === 'sw'
										? -(size / 2 + HANDLE_OUTSIDE_OFFSET)
										: handle === 'ne' || handle === 'se'
											? width - size / 2 + HANDLE_OUTSIDE_OFFSET
											: handle === 'w'
												? -(size / 2 + HANDLE_OUTSIDE_OFFSET)
												: handle === 'e'
													? width - size / 2 + HANDLE_OUTSIDE_OFFSET
													: handle === 'n' || handle === 's'
														? width / 2 - size / 2
														: 0,
								transition: 'background 120ms',
							};
							return (
								<div
									key={handle}
									className={`resize-handle resize-handle-${handle}`}
									style={style}
									onMouseDown={(e) => handleResizeMouseDown(handle, e)}
								/>
							);
						},
					)}
				{!(isDragging || isResizing || hideUntilSync) && (
					<div
						style={{ width: '100%', height: '100%', overflow: 'auto' }}
						className="tn-section-scroll"
					>
						{children}
					</div>
				)}
			</div>
		</>
	);
};

export default TnDraggableSection;
