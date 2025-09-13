import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Section } from '@shared/models';

interface CanvasMinimapProps {
	sections: Section[];
	canvasRef: React.RefObject<HTMLDivElement>;
	width?: number;
	height?: number;
}

// A lightweight overview of the canvas showing all section rectangles and the current viewport.
// Inspired by IDE / plan minimaps. Click (or drag) to pan the main canvas.
const TnCanvasMinimap: React.FC<CanvasMinimapProps> = ({
	sections,
	canvasRef,
	width = 200,
	height = 140,
}) => {
	const [viewport, setViewport] = useState({
		x: 0,
		y: 0,
		w: 0,
		h: 0,
		scale: 1,
	});
	const [bounds, setBounds] = useState({
		minX: 0,
		minY: 0,
		maxX: 1000,
		maxY: 800,
	});
	const [collapsed, setCollapsed] = useState(false);
	const dragState = useRef<{
		active: boolean;
		startX: number;
		startY: number;
	} | null>(null);

	// Recompute bounds when sections change
	useEffect(() => {
		if (!sections.length) {
			setBounds({ minX: 0, minY: 0, maxX: 1000, maxY: 800 });
			return;
		}
		let minX = Infinity,
			minY = Infinity,
			maxX = -Infinity,
			maxY = -Infinity;
		for (const s of sections) {
			const sx = s.x ?? 0;
			const sy = s.y ?? 0;
			const sw = s.width ?? 400;
			const sh = s.height ?? 200;
			if (sx < minX) minX = sx;
			if (sy < minY) minY = sy;
			if (sx + sw > maxX) maxX = sx + sw;
			if (sy + sh > maxY) maxY = sy + sh;
		}
		// Add a little padding
		const pad = 50;
		if (minX === Infinity) {
			minX = 0;
			minY = 0;
			maxX = 1000;
			maxY = 800;
		}
		setBounds({
			minX: Math.max(0, minX - pad),
			minY: Math.max(0, minY - pad),
			maxX: maxX + pad,
			maxY: maxY + pad,
		});
	}, [sections]);

	// Update viewport on scroll / resize
	const updateViewport = useCallback(() => {
		const el = canvasRef.current;
		if (!el) return;
		const { scrollLeft, scrollTop, clientWidth, clientHeight } = el;
		const bw = bounds.maxX - bounds.minX || 1;
		const bh = bounds.maxY - bounds.minY || 1;
		const scale = Math.min(width / bw, height / bh);
		setViewport({
			x: (scrollLeft - bounds.minX) * scale,
			y: (scrollTop - bounds.minY) * scale,
			w: clientWidth * scale,
			h: clientHeight * scale,
			scale,
		});
	}, [canvasRef, bounds, width, height]);

	useEffect(() => {
		updateViewport();
	}, [updateViewport, sections]);

	useEffect(() => {
		const el = canvasRef.current;
		if (!el) return;
		const handler = () => updateViewport();
		el.addEventListener('scroll', handler, { passive: true });
		window.addEventListener('resize', handler);
		return () => {
			el.removeEventListener('scroll', handler);
			window.removeEventListener('resize', handler);
		};
	}, [canvasRef, updateViewport]);

	const centerOn = (relX: number, relY: number, smooth = true) => {
		const el = canvasRef.current;
		if (!el) return;
		const targetCanvasX = relX / viewport.scale + bounds.minX - el.clientWidth / 2;
		const targetCanvasY = relY / viewport.scale + bounds.minY - el.clientHeight / 2;
		el.scrollTo({
			left: Math.max(0, targetCanvasX),
			top: Math.max(0, targetCanvasY),
			behavior: smooth ? 'smooth' : 'auto',
		});
	};

	const handleClick = (e: React.MouseEvent) => {
		const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
		centerOn(e.clientX - rect.left, e.clientY - rect.top, true);
	};

	const handleMouseDown = (e: React.MouseEvent) => {
		const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
		dragState.current = {
			active: true,
			startX: e.clientX - rect.left,
			startY: e.clientY - rect.top,
		};
		centerOn(dragState.current.startX, dragState.current.startY, false);
	};
	const handleMouseMove = (e: React.MouseEvent) => {
		if (!dragState.current?.active) return;
		const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
		centerOn(e.clientX - rect.left, e.clientY - rect.top, false);
	};
	const handleMouseUp = () => {
		if (dragState.current) dragState.current.active = false;
	};

	return (
		<div
			className={`rounded-md border border-gray-300 bg-white/70 backdrop-blur-sm shadow-sm overflow-hidden group/minimap transition-all duration-200 ${collapsed ? 'opacity-60 hover:opacity-100 cursor-pointer' : ''}`}
			style={{ width: collapsed ? 90 : width, height: collapsed ? 32 : height }}
			title="Minimap"
		>
			<div
				className="relative w-full h-full"
				style={{
					background: collapsed
						? 'transparent'
						: 'repeating-linear-gradient(45deg,#f8fafc,#f8fafc 6px,#f1f5f9 6px,#f1f5f9 12px)',
				}}
				onClick={!collapsed ? handleClick : undefined}
				onMouseDown={!collapsed ? handleMouseDown : undefined}
				onMouseMove={!collapsed ? handleMouseMove : undefined}
				onMouseLeave={!collapsed ? handleMouseUp : undefined}
				onMouseUp={!collapsed ? handleMouseUp : undefined}
			>
				{/* Toggle button */}
				<button
					onClick={() => setCollapsed((c) => !c)}
					className="absolute top-1 right-1 z-50 text-[10px] px-1 py-0.5 rounded bg-white/80 hover:bg-white border border-gray-300 shadow-sm"
				>
					{collapsed ? '▢' : '–'}
				</button>
				{!collapsed && (
					<>
						{/* Sections */}
						{sections.map((s) => {
							const sx = s.x ?? 0;
							const sy = s.y ?? 0;
							const sw = s.width ?? 400;
							const sh = s.height ?? 200;
							const left = (sx - bounds.minX) * viewport.scale;
							const top = (sy - bounds.minY) * viewport.scale;
							const w = sw * viewport.scale;
							const h = sh * viewport.scale;
							// Skip if effectively off or tiny
							if (w <= 1 || h <= 1) return null;
							return (
								<div
									key={s.id}
									style={{
										position: 'absolute',
										left,
										top,
										width: Math.max(2, w),
										height: Math.max(2, h),
										background:
											s.type === 'image'
												? 'rgba(16,185,129,0.45)'
												: s.type === 'code'
													? 'rgba(59,130,246,0.45)'
													: s.type === 'markdown'
														? 'rgba(139,92,246,0.45)'
														: 'rgba(107,114,128,0.45)',
										border: '1px solid rgba(0,0,0,0.15)',
										boxSizing: 'border-box',
									}}
								/>
							);
						})}
						{/* Viewport rectangle */}
						<div
							style={{
								position: 'absolute',
								left: viewport.x,
								top: viewport.y,
								width: viewport.w,
								height: viewport.h,
								border: '2px solid rgba(37,99,235,0.9)',
								background: 'rgba(59,130,246,0.12)',
								boxShadow: '0 0 0 1px rgba(255,255,255,0.6)',
								pointerEvents: 'none',
							}}
						/>
						{/* Scale indicator */}
						<div className="absolute bottom-0 right-0 text-[10px] px-1 py-0.5 bg-white/70 text-gray-600 rounded-tl">
							{(1 / viewport.scale || 0).toFixed(1)}x
						</div>
					</>
				)}
			</div>
		</div>
	);
};

export default TnCanvasMinimap;
