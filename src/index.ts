import { convert, html } from "./convert";

declare const document: {
	getElementById(id: string): {
		value: string;
		innerHTML: string;
		innerText: string;
		style: { display: string };
		addEventListener(event: string, fn: (e?: any) => void): void;
		classList: {
			toggle(name: string, force?: boolean): boolean;
			contains(name: string): boolean;
			add(name: string): void;
			remove(name: string): void;
		};
		getAttribute(name: string): string | null;
		closest(selector: string): any;
		textContent: string;
		parentNode: { insertBefore(newNode: any, refNode: any): void };
		nextSibling: any;
		remove(): void;
	};
	querySelectorAll(selector: string): Array<{
		addEventListener(event: string, fn: (e?: unknown) => void): void;
		getAttribute(name: string): string | null;
		innerHTML: string;
		remove(): void;
	}>;
	createElement(tag: string): {
		className: string;
		textContent: string;
		classList: { add(name: string): void; remove(name: string): void };
		remove(): void;
		addEventListener(event: string, fn: (e?: unknown) => void): void;
		setAttribute(name: string, value: string): void;
		title: string;
	};
	body: { appendChild(el: unknown): void };
	addEventListener(event: string, fn: (e?: unknown) => void): void;
};
declare const window: {
	convert?: (markdown: string) => string;
	navigator: { clipboard: { writeText(text: string): Promise<void> } };
};
declare const localStorage: {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
};
const input = document.getElementById("input");
const output = document.getElementById("output");
const preview = document.getElementById("preview");

input.addEventListener("input", () => {
	output.value = convert(input.value);
	preview.innerHTML = html(input.value);
});
window.convert = convert;

const ICON_MAXIMIZE =
	'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>';
const ICON_MINIMIZE =
	'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h6v6"/><path d="M20 10h-6V4"/><path d="M14 10l7-7"/><path d="M3 21l7-7"/></svg>';
const ICON_COPY =
	'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
const ICON_CHECK =
	'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

// ── Fullscreen toggle ──
document.querySelectorAll(".btn-fullscreen").forEach((btn: any) => {
	btn.addEventListener("click", () => {
		const targetId = btn.getAttribute("data-target");
		if (!targetId) return;
		const panel = document.getElementById(targetId);
		const isFullscreen = panel.classList.toggle("fullscreen");
		btn.innerHTML = isFullscreen ? ICON_MINIMIZE : ICON_MAXIMIZE;
	});
});

// ── Escape to exit fullscreen ──
document.addEventListener("keydown", (e: any) => {
	if (e.key === "Escape") {
		document.querySelectorAll(".panel").forEach((panel: any) => {
			panel.classList.remove("fullscreen");
		});
		document.querySelectorAll(".btn-fullscreen").forEach((btn: any) => {
			btn.innerHTML = ICON_MAXIMIZE;
		});
	}
});

// ── Copy to clipboard ──
function showToast(message: string) {
	const toast = document.createElement("div");
	toast.className = "toast";
	toast.textContent = message;
	document.body.appendChild(toast);
	requestAnimationFrame(() => {
		requestAnimationFrame(() => toast.classList.add("show"));
	});
	setTimeout(() => {
		toast.classList.remove("show");
		setTimeout(() => toast.remove(), 300);
	}, 1500);
}

declare function requestAnimationFrame(fn: () => void): void;
declare function setTimeout(fn: () => void, ms: number): void;

const sources: Record<string, { value?: string; innerText?: string }> = {
	input,
	output,
	preview,
};

document.querySelectorAll(".btn-copy").forEach((btn: any) => {
	btn.addEventListener("click", () => {
		const sourceId = btn.getAttribute("data-source");
		if (!sourceId) return;
		const el = sources[sourceId];
		if (!el) return;
		const text = el.value ?? el.innerText ?? "";
		window.navigator.clipboard.writeText(text).then(() => {
			btn.innerHTML = ICON_CHECK;
			showToast("Copied to clipboard");
			setTimeout(() => {
				btn.innerHTML = ICON_COPY;
			}, 1500);
		});
	});
});

// ── Hide / Show panels ──
const ICON_EYE =
	'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
const ICON_EYE_OFF =
	'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>';

const SECTION_IDS = [
	"input_section",
	"display_section",
	"output_section",
] as const;
const SECTION_LABELS: Record<string, string> = {
	input_section: "Markdown",
	display_section: "Preview",
	output_section: "Jira Output",
};
const PANELS_CONTAINER = document.getElementById("panels");

function getHiddenSections(): string[] {
	try {
		const stored = localStorage.getItem("hiddenSections");
		return stored ? JSON.parse(stored) : [];
	} catch {
		return [];
	}
}

function saveHiddenSections(hidden: string[]) {
	localStorage.setItem("hiddenSections", JSON.stringify(hidden));
}

function updateGridColumns() {
	const visible = SECTION_IDS.filter(
		(id) => !document.getElementById(id).classList.contains("hidden"),
	);
	const cols = SECTION_IDS.map((id) => {
		const panel = document.getElementById(id);
		if (panel.classList.contains("hidden")) return null;
		return "1fr";
	});
	// Build grid template: for each section, if visible "1fr", if hidden but has restore bar "auto"
	const parts: string[] = [];
	for (const id of SECTION_IDS) {
		const panel = document.getElementById(id);
		if (panel.classList.contains("hidden")) {
			parts.push("auto");
		} else {
			parts.push("1fr");
		}
	}
	(PANELS_CONTAINER as any).style.gridTemplateColumns = parts.join(" ");
}

function hideSection(sectionId: string) {
	const panel = document.getElementById(sectionId);
	panel.classList.add("hidden");

	// Create restore bar
	const bar = document.createElement("button");
	bar.className = "panel-restore";
	bar.textContent = SECTION_LABELS[sectionId] ?? sectionId;
	bar.title = `Show ${SECTION_LABELS[sectionId] ?? sectionId}`;
	bar.setAttribute("data-restore", sectionId);
	bar.addEventListener("click", () => showSection(sectionId));
	panel.parentNode.insertBefore(bar, panel.nextSibling);

	const hidden = getHiddenSections();
	if (!hidden.includes(sectionId)) {
		hidden.push(sectionId);
		saveHiddenSections(hidden);
	}
	updateGridColumns();
}

function showSection(sectionId: string) {
	const panel = document.getElementById(sectionId);
	panel.classList.remove("hidden");

	// Remove the restore bar
	document
		.querySelectorAll(`[data-restore="${sectionId}"]`)
		.forEach((el: any) => {
			el.remove();
		});

	const hidden = getHiddenSections().filter((id: string) => id !== sectionId);
	saveHiddenSections(hidden);
	updateGridColumns();
}

// Wire up hide buttons
document.querySelectorAll(".btn-hide").forEach((btn: any) => {
	btn.addEventListener("click", () => {
		const targetId = btn.getAttribute("data-target");
		if (!targetId) return;
		hideSection(targetId);
	});
});

// Restore previously hidden sections from localStorage
const initialHidden = getHiddenSections();
for (const id of initialHidden) {
	hideSection(id);
}

// ── Register service worker ──
declare const navigator: {
	serviceWorker?: { register(url: string): Promise<any> };
};
if (navigator.serviceWorker) {
	navigator.serviceWorker.register("sw.js");
}
