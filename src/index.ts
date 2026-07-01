/// <reference lib="dom" />
import { convert, correctMarkdown, html } from "./convert";

declare global {
	interface Window {
		convert?: (markdown: string) => string;
	}
}

function byId<T extends HTMLElement = HTMLElement>(id: string): T {
	return document.getElementById(id) as T;
}

const input = byId<HTMLTextAreaElement>("input");
const output = byId<HTMLTextAreaElement>("output");
const preview = byId("preview");
const correctBtn = byId("btn-correct");

let errorCorrectionEnabled = localStorage.getItem("errorCorrection") === "true";

function updateCorrectBtnState() {
	correctBtn.classList.toggle("active", errorCorrectionEnabled);
	correctBtn.title = errorCorrectionEnabled
		? "Error correction ON — click to disable"
		: "Error correction OFF — click to enable";
}

function runConversion() {
	const src = errorCorrectionEnabled
		? correctMarkdown(input.value)
		: input.value;
	output.value = convert(src);
	const rendered = html(src);
	// Sanitize: strip <script> tags and event handler attributes to prevent XSS
	preview.innerHTML = rendered
		.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
		.replace(/\bon\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
}

input.addEventListener("input", runConversion);

correctBtn.addEventListener("click", () => {
	errorCorrectionEnabled = !errorCorrectionEnabled;
	localStorage.setItem("errorCorrection", String(errorCorrectionEnabled));
	updateCorrectBtnState();
	runConversion();
});

updateCorrectBtnState();
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
document.querySelectorAll(".btn-fullscreen").forEach((btn) => {
	btn.addEventListener("click", () => {
		const targetId = btn.getAttribute("data-target");
		if (!targetId) return;
		const panel = byId(targetId);
		const isFullscreen = panel.classList.toggle("fullscreen");
		btn.innerHTML = isFullscreen ? ICON_MINIMIZE : ICON_MAXIMIZE;
	});
});

// ── Escape to exit fullscreen ──
document.addEventListener("keydown", (e) => {
	if (e.key === "Escape") {
		document.querySelectorAll(".panel").forEach((panel) => {
			panel.classList.remove("fullscreen");
		});
		document.querySelectorAll(".btn-fullscreen").forEach((btn) => {
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

const sources: Record<string, { value?: string; innerText?: string }> = {
	input,
	output,
	preview,
};

document.querySelectorAll(".btn-copy").forEach((btn) => {
	btn.addEventListener("click", () => {
		const sourceId = btn.getAttribute("data-source");
		if (!sourceId) return;
		const el = sources[sourceId];
		if (!el) return;
		const text = el.value ?? el.innerText ?? "";
		window.navigator.clipboard
			.writeText(text)
			.then(() => {
				btn.innerHTML = ICON_CHECK;
				showToast("Copied to clipboard");
				setTimeout(() => {
					btn.innerHTML = ICON_COPY;
				}, 1500);
			})
			.catch(() => {
				btn.innerHTML = ICON_COPY;
				showToast("Failed to copy to clipboard");
			});
	});
});

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
const PANELS_CONTAINER = byId("panels");

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
	const parts: string[] = [];
	for (const id of SECTION_IDS) {
		const panel = byId(id);
		if (panel.classList.contains("hidden")) {
			parts.push("auto");
		} else {
			parts.push("1fr");
		}
	}
	PANELS_CONTAINER.style.gridTemplateColumns = parts.join(" ");
}

function hideSection(sectionId: string) {
	const panel = byId(sectionId);
	if (panel.classList.contains("hidden")) return;
	panel.classList.add("hidden");

	// Create restore bar
	const bar = document.createElement("button");
	bar.className = "panel-restore";
	bar.textContent = SECTION_LABELS[sectionId] ?? sectionId;
	bar.title = `Show ${SECTION_LABELS[sectionId] ?? sectionId}`;
	bar.setAttribute("data-restore", sectionId);
	bar.addEventListener("click", () => showSection(sectionId));
	panel.parentNode?.insertBefore(bar, panel.nextSibling);

	const hidden = getHiddenSections();
	if (!hidden.includes(sectionId)) {
		hidden.push(sectionId);
		saveHiddenSections(hidden);
	}
	updateGridColumns();
}

function showSection(sectionId: string) {
	const panel = byId(sectionId);
	panel.classList.remove("hidden");

	// Remove the restore bar
	document.querySelectorAll(`[data-restore="${sectionId}"]`).forEach((el) => {
		el.remove();
	});

	const hidden = getHiddenSections().filter((id: string) => id !== sectionId);
	saveHiddenSections(hidden);
	updateGridColumns();
}

// Wire up hide buttons
document.querySelectorAll(".btn-hide").forEach((btn) => {
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
if (navigator.serviceWorker) {
	navigator.serviceWorker.register("sw.js");
}
