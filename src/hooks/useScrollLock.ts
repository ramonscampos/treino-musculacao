import { useEffect } from "react";

let lockCount = 0;
let savedScrollY = 0;

/**
 * Freezes the page at its current scroll position while `active`.
 * `overflow: hidden` alone doesn't stop iOS Safari from scrolling the page
 * when an input inside a modal is focused, so the body is pinned with
 * `position: fixed` and the exact position is restored on release.
 */
export function useScrollLock(active: boolean) {
	useEffect(() => {
		if (!active) return;

		const { style } = document.body;
		if (lockCount === 0) {
			savedScrollY = window.scrollY;
			style.position = "fixed";
			style.top = `-${savedScrollY}px`;
			style.left = "0";
			style.right = "0";
			style.overflow = "hidden";
		}
		lockCount++;

		return () => {
			lockCount--;
			if (lockCount > 0) return;
			style.position = "";
			style.top = "";
			style.left = "";
			style.right = "";
			style.overflow = "";
			window.scrollTo({ top: savedScrollY, behavior: "instant" });
		};
	}, [active]);
}
