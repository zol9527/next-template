"use client";

import { useEffect, useState } from "react";

/**
 * CSS box-shadow 像素精灵渲染器
 * 使用 box-shadow 在单个 1px 元素上绘制像素图案
 * scale 控制每个像素的实际尺寸
 */
function PixelSprite({
	sprite,
	scale = 6,
	className = "",
	style,
}: {
	sprite: { x: number; y: number; color: string }[];
	scale?: number;
	className?: string;
	style?: React.CSSProperties;
}) {
	const shadows = sprite
		.map(({ x, y, color }) => `${x * scale}px ${y * scale}px 0 0 ${color}`)
		.join(", ");

	return (
		<div
			className={className}
			style={{
				width: scale,
				height: scale,
				boxShadow: shadows,
				imageRendering: "pixelated",
				...style,
			}}
		/>
	);
}

const P = (x: number, y: number, color: string) => ({ x, y, color });
const BL = "#0F0F23";
const BG = "#1A1A2E";
const CY = "#4CC9F0";
const BL2 = "#3A86FF";
const OR = "#FF6B35";
const WH = "#E8E8E8";
const GR = "#7B8794";
const GD = "#FFD700";
const GN = "#06D6A0";
const DP = "#2A2A4A";

export const heroRobotSprite = [
	P(0,0,BG),P(1,0,BG),P(2,0,BG),P(3,0,BG),P(4,0,BG),P(5,0,BG),P(6,0,BG),P(7,0,BG),P(8,0,BG),P(9,0,BG),P(10,0,BG),P(11,0,BG),
	P(0,1,BG),P(1,1,BG),P(2,1,CY),P(3,1,CY),P(4,1,CY),P(5,1,CY),P(6,1,CY),P(7,1,CY),P(8,1,CY),P(9,1,CY),P(10,1,BG),P(11,1,BG),
	P(0,2,BG),P(1,2,CY),P(2,2,CY),P(3,2,CY),P(4,2,WH),P(5,2,WH),P(6,2,CY),P(7,2,WH),P(8,2,WH),P(9,2,CY),P(10,2,CY),P(11,2,BG),
	P(0,3,BG),P(1,3,CY),P(2,3,CY),P(3,3,CY),P(4,3,BL),P(5,3,BL),P(6,3,CY),P(7,3,BL),P(8,3,BL),P(9,3,CY),P(10,3,CY),P(11,3,BG),
	P(0,4,BG),P(1,4,CY),P(2,4,CY),P(3,4,CY),P(4,4,CY),P(5,4,CY),P(6,4,CY),P(7,4,CY),P(8,4,CY),P(9,4,CY),P(10,4,CY),P(11,4,BG),
	P(0,5,BG),P(1,5,BG),P(2,5,CY),P(3,5,CY),P(4,5,OR),P(5,5,CY),P(6,5,CY),P(7,5,OR),P(8,5,CY),P(9,5,CY),P(10,5,BG),P(11,5,BG),
	P(0,6,BG),P(1,6,BG),P(2,6,BG),P(3,6,CY),P(4,6,CY),P(5,6,CY),P(6,6,CY),P(7,6,CY),P(8,6,CY),P(9,6,BG),P(10,6,BG),P(11,6,BG),
	P(0,7,BG),P(1,7,BG),P(2,7,CY),P(3,7,CY),P(4,7,CY),P(5,7,CY),P(6,7,CY),P(7,7,CY),P(8,7,CY),P(9,7,CY),P(10,7,BG),P(11,7,BG),
	P(0,8,BG),P(1,8,BG),P(2,8,CY),P(3,8,BL2),P(4,8,BL2),P(5,8,CY),P(6,8,CY),P(7,8,BL2),P(8,8,BL2),P(9,8,CY),P(10,8,BG),P(11,8,BG),
	P(0,9,BG),P(1,9,BG),P(2,9,CY),P(3,9,BL2),P(4,9,BL2),P(5,9,CY),P(6,9,CY),P(7,9,BL2),P(8,9,BL2),P(9,9,CY),P(10,9,BG),P(11,9,BG),
	P(0,10,BG),P(1,10,BG),P(2,10,BG),P(3,10,CY),P(4,10,CY),P(5,10,CY),P(6,10,CY),P(7,10,CY),P(8,10,CY),P(9,10,BG),P(10,10,BG),P(11,10,BG),
	P(0,11,BG),P(1,11,BG),P(2,11,BG),P(3,11,BG),P(4,11,BG),P(5,11,BG),P(6,11,BG),P(7,11,BG),P(8,11,BG),P(9,11,BG),P(10,11,BG),P(11,11,BG),
];

export const pixelStarSprite = [
	P(1,0,GD),P(2,0,GD),
	P(0,1,GD),P(1,1,GD),P(2,1,GD),P(3,1,GD),
	P(1,2,GD),P(2,2,GD),
	P(0,3,GD),P(1,3,GD),P(2,3,GD),P(3,3,GD),
	P(1,4,GD),P(2,4,GD),
];

export const pixelHeartSprite = [
	P(0,0,OR),P(1,0,OR),P(3,0,OR),P(4,0,OR),
	P(0,1,OR),P(1,1,OR),P(2,1,OR),P(3,1,OR),P(4,1,OR),
	P(0,2,OR),P(1,2,OR),P(2,2,OR),P(3,2,OR),P(4,2,OR),
	P(1,3,OR),P(2,3,OR),P(3,3,OR),
	P(2,4,OR),
];

export const pixelShieldSprite = [
	P(0,0,BL2),P(1,0,BL2),P(2,0,BL2),P(3,0,BL2),P(4,0,BL2),P(5,0,BL2),
	P(0,1,BL2),P(1,1,CY),P(2,1,CY),P(3,1,CY),P(4,1,CY),P(5,1,BL2),
	P(0,2,BL2),P(1,2,CY),P(2,2,WH),P(3,2,WH),P(4,2,CY),P(5,2,BL2),
	P(0,3,BL2),P(1,3,CY),P(2,3,CY),P(3,3,CY),P(4,3,CY),P(5,3,BL2),
	P(1,4,BL2),P(2,4,BL2),P(3,4,BL2),P(4,4,BL2),
	P(2,5,BL2),P(3,5,BL2),
];

export const pixelSwordSprite = [
	P(2,0,WH),P(3,0,WH),
	P(2,1,WH),P(3,1,WH),
	P(1,2,WH),P(2,2,WH),P(3,2,WH),P(4,2,WH),
	P(0,3,WH),P(1,3,WH),P(2,3,WH),P(3,3,WH),P(4,3,WH),P(5,3,WH),
	P(1,4,DP),P(2,4,DP),P(3,4,DP),P(4,4,DP),
	P(2,5,OR),P(3,5,OR),
	P(1,6,OR),P(2,6,OR),P(3,6,OR),P(4,6,OR),
	P(2,7,DP),P(3,7,DP),
];

export const pixelCoinSprite = [
	P(1,0,GD),P(2,0,GD),P(3,0,GD),
	P(0,1,GD),P(1,1,GD),P(2,1,OR),P(3,1,GD),P(4,1,GD),
	P(0,2,GD),P(1,2,GD),P(2,2,OR),P(3,2,GD),P(4,2,GD),
	P(0,3,GD),P(1,3,GD),P(2,3,GD),P(3,3,GD),P(4,3,GD),
	P(1,4,GD),P(2,4,GD),P(3,4,GD),
];

export const pixelCursorSprite = [
	P(0,0,WH),
	P(0,1,WH),P(1,1,WH),
	P(0,2,WH),P(1,2,BG),P(2,2,WH),
	P(0,3,WH),P(1,3,BG),P(2,3,BG),P(3,3,WH),
	P(0,4,WH),P(1,4,BG),P(2,4,BG),P(3,4,BG),P(4,4,WH),
	P(0,5,WH),P(1,5,WH),P(2,5,WH),P(3,5,WH),
	P(0,6,WH),P(1,6,BG),P(2,6,WH),
	P(0,7,WH),P(2,7,WH),
	P(0,8,WH),
];

export const pixelAvatarSprites = [
	[
		P(1,0,CY),P(2,0,CY),P(3,0,CY),P(4,0,CY),
		P(0,1,CY),P(1,1,CY),P(2,1,WH),P(3,1,WH),P(4,1,CY),P(5,1,CY),
		P(0,2,CY),P(1,2,CY),P(2,2,BL),P(3,2,BL),P(4,2,CY),P(5,2,CY),
		P(0,3,CY),P(1,3,CY),P(2,3,CY),P(3,3,CY),P(4,3,CY),P(5,3,CY),
		P(1,4,OR),P(2,4,OR),P(3,4,OR),P(4,4,OR),
		P(0,5,BL2),P(1,5,BL2),P(2,5,BL2),P(3,5,BL2),P(4,5,BL2),P(5,5,BL2),
		P(0,6,DP),P(1,6,DP),P(2,6,DP),P(3,6,DP),P(4,6,DP),P(5,6,DP),
	],
	[
		P(1,0,GN),P(2,0,GN),P(3,0,GN),P(4,0,GN),
		P(0,1,GN),P(1,1,GN),P(2,1,WH),P(3,1,WH),P(4,1,GN),P(5,1,GN),
		P(0,2,GN),P(1,2,GN),P(2,2,BL),P(3,2,BL),P(4,2,GN),P(5,2,GN),
		P(0,3,GN),P(1,3,GN),P(2,3,GN),P(3,3,GN),P(4,3,GN),P(5,3,GN),
		P(1,4,OR),P(2,4,OR),P(3,4,OR),P(4,4,OR),
		P(0,5,DP),P(1,5,DP),P(2,5,DP),P(3,5,DP),P(4,5,DP),P(5,5,DP),
		P(0,6,DP),P(1,6,DP),P(2,6,DP),P(3,6,DP),P(4,6,DP),P(5,6,DP),
	],
	[
		P(1,0,BL2),P(2,0,BL2),P(3,0,BL2),P(4,0,BL2),
		P(0,1,BL2),P(1,1,BL2),P(2,1,WH),P(3,1,WH),P(4,1,BL2),P(5,1,BL2),
		P(0,2,BL2),P(1,2,BL2),P(2,2,BL),P(3,2,BL),P(4,2,BL2),P(5,2,BL2),
		P(0,3,BL2),P(1,3,BL2),P(2,3,BL2),P(3,3,BL2),P(4,3,BL2),P(5,3,BL2),
		P(1,4,OR),P(2,4,OR),P(3,4,OR),P(4,4,OR),
		P(0,5,GN),P(1,5,GN),P(2,5,GN),P(3,5,GN),P(4,5,GN),P(5,5,GN),
		P(0,6,DP),P(1,6,DP),P(2,6,DP),P(3,6,DP),P(4,6,DP),P(5,6,DP),
	],
];

export const pixelPotionSprite = [
	P(2,0,GR),P(3,0,GR),
	P(1,1,GR),P(2,1,GR),P(3,1,GR),P(4,1,GR),
	P(1,2,CY),P(2,2,CY),P(3,2,CY),P(4,2,CY),
	P(0,3,CY),P(1,3,CY),P(2,3,WH),P(3,3,CY),P(4,3,CY),P(5,3,CY),
	P(0,4,CY),P(1,4,CY),P(2,4,CY),P(3,4,CY),P(4,4,CY),P(5,4,CY),
	P(0,5,CY),P(1,5,CY),P(2,5,CY),P(3,5,CY),P(4,5,CY),P(5,5,CY),
	P(1,6,CY),P(2,6,CY),P(3,6,CY),P(4,6,CY),
];

export const pixelChestSprite = [
	P(0,0,DP),P(1,0,DP),P(2,0,DP),P(3,0,DP),P(4,0,DP),P(5,0,DP),P(6,0,DP),
	P(0,1,OR),P(1,1,OR),P(2,1,OR),P(3,1,GD),P(4,1,OR),P(5,1,OR),P(6,1,OR),
	P(0,2,OR),P(1,2,OR),P(2,2,GD),P(3,2,GD),P(4,2,GD),P(5,2,OR),P(6,2,OR),
	P(0,3,OR),P(1,3,OR),P(2,3,OR),P(3,3,GD),P(4,3,OR),P(5,3,OR),P(6,3,OR),
	P(0,4,OR),P(1,4,OR),P(2,4,OR),P(3,4,OR),P(4,4,OR),P(5,4,OR),P(6,4,OR),
	P(0,5,DP),P(1,5,OR),P(2,5,OR),P(3,5,OR),P(4,5,OR),P(5,5,OR),P(6,5,DP),
];

export const pixelMonitorSprite = [
	P(0,0,DP),P(1,0,DP),P(2,0,DP),P(3,0,DP),P(4,0,DP),P(5,0,DP),P(6,0,DP),P(7,0,DP),P(8,0,DP),P(9,0,DP),
	P(0,1,DP),P(1,1,CY),P(2,1,CY),P(3,1,CY),P(4,1,CY),P(5,1,CY),P(6,1,CY),P(7,1,CY),P(8,1,CY),P(9,1,DP),
	P(0,2,DP),P(1,2,CY),P(2,2,GN),P(3,2,GN),P(4,2,GN),P(5,2,WH),P(6,2,GN),P(7,2,GN),P(8,2,CY),P(9,2,DP),
	P(0,3,DP),P(1,3,CY),P(2,3,GN),P(3,3,BL),P(4,3,GN),P(5,3,GN),P(6,3,GN),P(7,3,GN),P(8,3,CY),P(9,3,DP),
	P(0,4,DP),P(1,4,CY),P(2,4,GN),P(3,4,GN),P(4,4,GN),P(5,4,GN),P(6,4,BL),P(7,4,GN),P(8,4,CY),P(9,4,DP),
	P(0,5,DP),P(1,5,CY),P(2,5,CY),P(3,5,CY),P(4,5,CY),P(5,5,CY),P(6,5,CY),P(7,5,CY),P(8,5,CY),P(9,5,DP),
	P(0,6,DP),P(1,6,DP),P(2,6,DP),P(3,6,DP),P(4,6,DP),P(5,6,DP),P(6,6,DP),P(7,6,DP),P(8,6,DP),P(9,6,DP),
	P(3,7,DP),P(4,7,DP),P(5,7,DP),P(6,7,DP),
	P(2,8,DP),P(3,8,DP),P(4,8,DP),P(5,8,DP),P(6,8,DP),P(7,8,DP),
];

export function PixelRobot({ className = "" }: { className?: string }) {
	const [frame, setFrame] = useState(0);

	useEffect(() => {
		const id = setInterval(() => setFrame((f) => (f + 1) % 4), 600);
		return () => clearInterval(id);
	}, []);

	const bobY = frame % 2 === 0 ? 0 : -1;

	const sprite = heroRobotSprite.map((p) => ({
		...p,
		y: p.y + bobY,
	}));

	return <PixelSprite sprite={sprite} scale={6} className={className} />;
}

export function PixelStar({ className = "" }: { className?: string }) {
	return <PixelSprite sprite={pixelStarSprite} scale={4} className={className} />;
}

export function PixelHeart({ className = "" }: { className?: string }) {
	return <PixelSprite sprite={pixelHeartSprite} scale={4} className={className} />;
}

export function PixelShield({ className = "" }: { className?: string }) {
	return <PixelSprite sprite={pixelShieldSprite} scale={4} className={className} />;
}

export function PixelSword({ className = "" }: { className?: string }) {
	return <PixelSprite sprite={pixelSwordSprite} scale={4} className={className} />;
}

export function PixelCoin({ className = "" }: { className?: string }) {
	const [frame, setFrame] = useState(0);

	useEffect(() => {
		const id = setInterval(() => setFrame((f) => (f + 1) % 4), 300);
		return () => clearInterval(id);
	}, []);

	return <PixelSprite sprite={pixelCoinSprite} scale={4} className={className} style={{ transform: `scaleX(${frame < 2 ? 1 : 0.4})` }} />;
}

export function PixelCursor({ className = "" }: { className?: string }) {
	const [visible, setVisible] = useState(true);

	useEffect(() => {
		const id = setInterval(() => setVisible((v) => !v), 530);
		return () => clearInterval(id);
	}, []);

	if (!visible) return <div className={className} style={{ width: 24, height: 36 }} />;

	return <PixelSprite sprite={pixelCursorSprite} scale={4} className={className} />;
}

export function PixelAvatar({ index = 0, className = "" }: { index?: number; className?: string }) {
	const sprite = pixelAvatarSprites[index % pixelAvatarSprites.length];
	return <PixelSprite sprite={sprite} scale={5} className={className} />;
}

export function PixelPotion({ className = "" }: { className?: string }) {
	return <PixelSprite sprite={pixelPotionSprite} scale={4} className={className} />;
}

export function PixelChest({ className = "" }: { className?: string }) {
	return <PixelSprite sprite={pixelChestSprite} scale={4} className={className} />;
}

export function PixelMonitor({ className = "" }: { className?: string }) {
	return <PixelSprite sprite={pixelMonitorSprite} scale={5} className={className} />;
}

export function PixelDivider() {
	return (
		<div className="flex items-center justify-center gap-2 py-4">
			<div
				style={{
					width: 4,
					height: 4,
					boxShadow: [
						"4px 0 0 0 var(--color-landing-primary)",
						"8px 0 0 0 var(--color-landing-primary)",
						"16px 0 0 0 var(--color-landing-primary)",
						"20px 0 0 0 var(--color-landing-primary)",
						"24px 0 0 0 var(--color-landing-primary)",
						"32px 0 0 0 var(--color-landing-primary)",
						"36px 0 0 0 var(--color-landing-primary)",
						"40px 0 0 0 var(--color-landing-primary)",
						"48px 0 0 0 var(--color-landing-primary)",
						"52px 0 0 0 var(--color-landing-primary)",
						"56px 0 0 0 var(--color-landing-primary)",
						"64px 0 0 0 var(--color-landing-primary)",
						"68px 0 0 0 var(--color-landing-primary)",
						"72px 0 0 0 var(--color-landing-primary)",
						"80px 0 0 0 var(--color-landing-primary)",
						"84px 0 0 0 var(--color-landing-primary)",
						"88px 0 0 0 var(--color-landing-primary)",
						"96px 0 0 0 var(--color-landing-primary)",
						"100px 0 0 0 var(--color-landing-primary)",
						"104px 0 0 0 var(--color-landing-primary)",
						"112px 0 0 0 var(--color-landing-primary)",
						"116px 0 0 0 var(--color-landing-primary)",
						"120px 0 0 0 var(--color-landing-primary)",
					].join(", "),
				}}
			/>
		</div>
	);
}

export function PixelProgressBar({ value = 75, max = 100 }: { value?: number; max?: number }) {
	const percent = Math.min(100, Math.max(0, (value / max) * 100));
	const filledBlocks = Math.round(percent / 10);
	const totalBlocks = 10;

	return (
		<div className="inline-flex gap-0.5">
			{Array.from({ length: totalBlocks }).map((_, i) => (
				<div
					key={i}
					style={{
						width: 8,
						height: 8,
						backgroundColor: i < filledBlocks ? "var(--color-landing-success)" : "var(--color-landing-border)",
					}}
				/>
			))}
		</div>
	);
}
