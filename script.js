(() => {
	const folders = ["bg", "body", "head", "eyes", "mouth", "hand", "deco"];
	const emojiMap = { bg: "🖼️", body: "📎", head: "😀", eyes: "👀", mouth: "👄", hand: "✋", deco: "✨" };
	const selections = {};
	let options = {};
	const state = { activeFolder: folders[0] };

	const canvas = document.getElementById("preview");
	const ctx = canvas.getContext("2d");
	const tabsEl = document.getElementById("tabs");
	const clearBtn = document.getElementById("clear");
	const downloadBtn = document.getElementById("download");
	const randomizeBtn = document.getElementById("randomize");
	const themeToggle = document.getElementById("themeToggle");
	const panelsEl = document.getElementById("thumbs-container");

	const THEME_KEY = "clippy_theme";
	function applyTheme(t) {
		const root = document.documentElement;
		const isDark = t === "dark" || (t === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
		root.classList.toggle("dark", isDark);
		themeToggle.textContent = isDark ? "☀️" : "🌙";
		localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
	}
	themeToggle.addEventListener("click", () => {
		applyTheme(document.documentElement.classList.contains("dark") ? "light" : "dark");
	});
	applyTheme(localStorage.getItem(THEME_KEY) || "auto");

	fetch("manifest.json")
		.then((r) => r.json())
		.then((data) => {
			options = data;
			init();
		})
		.catch((err) => {
			console.error("Failed to load manifest:", err);
			panelsEl.innerHTML = '<div class="text-red-600 dark:text-red-400">Error loading assets manifest.</div>';
		});

	function init() {
		initDefaults();
		renderTabs();
		renderPanels();
		draw();
	}

	function initDefaults() {
		folders.forEach((f) => (selections[f] = f === "body" ? options[f][0] : null));
	}

	// ---------- UI helper class builders ----------
	function tabClass(folder, active) {
		const base = "group inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs md:text-sm font-semibold tracking-wide transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400";
		if (active) return base + " bg-sky-600 text-white shadow-sm ring-1 ring-sky-500 scale-[1.03]";
		return base + " bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 hover:shadow-sm";
	}

	function thumbClass(folder, selected) {
		const base = `thumb-tile group relative aspect-square flex items-center justify-center rounded-lg border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400`;
		if (selected) return base + " border-sky-100/80 dark:border-sky-400 bg-sky-50 dark:bg-sky-900/10 ring-2 ring-sky-200 dark:ring-sky-800 shadow-md scale-102";
		return base + " border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 hover:border-sky-200 dark:hover:border-sky-600 hover:shadow-sm hover:scale-105";
	}

	function renderTabs() {
		tabsEl.innerHTML = "";
		folders.forEach((f) => {
			const active = f === state.activeFolder;
			const btn = document.createElement("button");
			btn.type = "button";
			btn.className = tabClass(f, active);
			btn.setAttribute("role", "tab");
			btn.setAttribute("aria-selected", active);
			btn.dataset.folder = f;
			const emoji = document.createElement("span");
			emoji.textContent = emojiMap[f];
			const label = document.createElement("span");
			label.textContent = f.charAt(0).toUpperCase() + f.slice(1);
			btn.append(emoji, label);
			btn.addEventListener("click", () => switchFolder(f));
			tabsEl.appendChild(btn);
		});
	}

	function renderPanels() {
		panelsEl.innerHTML = "";
		folders.forEach((f) => {
			const wrapper = document.createElement("div");
			wrapper.className = `bg-white/95 dark:bg-slate-900/95 rounded-2xl border border-sky-100/60 dark:border-slate-800 shadow overflow-hidden ${f === state.activeFolder ? "" : "hidden"}`;
			const header = document.createElement("div");
			header.className = "bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 px-5 py-3 border-b border-sky-100 dark:border-slate-700";
			header.innerHTML = `<h4 class='font-semibold text-sm md:text-base text-slate-800 dark:text-slate-200 flex items-center gap-2'><span>${emojiMap[f]}</span><span>${f.charAt(0).toUpperCase() + f.slice(1)} Options</span><span class='ml-auto text-xs font-normal text-slate-500 dark:text-slate-400'>${options[f] ? options[f].length + (f !== "body" ? 1 : 0) : 0} choices</span></h4>`;
			const panel = document.createElement("div");
			panel.id = `panel-${f}`;
			panel.setAttribute("role", "tabpanel");
			panel.className = "thumbs grid gap-6 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 max-h-[20rem] overflow-y-auto p-6";
			// Add color/gradient controls only for bg
			if (f === "bg") {
				// Solid color picker
				const colorWrap = document.createElement("div");
				colorWrap.className = "col-span-2 flex items-center gap-2 mb-2";
				const colorLabel = document.createElement("label");
				colorLabel.textContent = "Solid Color:";
				colorLabel.className = "text-xs font-medium text-slate-700 dark:text-slate-200";
				colorLabel.htmlFor = "bg-color-picker";
				const colorInput = document.createElement("input");
				colorInput.type = "color";
				colorInput.id = "bg-color-picker";
				colorInput.value = selections.bg && selections.bg.startsWith("color:") ? selections.bg.slice(6) : "#ffffff";
				colorInput.className = "w-8 h-8 border rounded shadow-sm cursor-pointer";
				colorInput.addEventListener("input", (e) => {
					selections.bg = "color:" + e.target.value;
					updateSelectionUI("bg");
					draw();
				});
				colorWrap.appendChild(colorLabel);
				colorWrap.appendChild(colorInput);
				panel.appendChild(colorWrap);
				// Gradient input
				const gradWrap = document.createElement("div");
				gradWrap.className = "col-span-2 flex items-center gap-2 mb-4";
				const gradLabel = document.createElement("label");
				gradLabel.textContent = "CSS Gradient:";
				gradLabel.className = "text-xs font-medium text-slate-700 dark:text-slate-200";
				gradLabel.htmlFor = "bg-gradient-input";
				const gradInput = document.createElement("input");
				gradInput.type = "text";
				gradInput.id = "bg-gradient-input";
				gradInput.placeholder = "e.g. linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)";
				gradInput.value = selections.bg && selections.bg.startsWith("gradient:") ? selections.bg.slice(9) : "";
				gradInput.className = "flex-1 min-w-0 border rounded px-2 py-1 text-xs shadow-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100";
				gradInput.addEventListener("change", (e) => {
					if (e.target.value.trim()) {
						selections.bg = "gradient:" + e.target.value.trim();
					} else if (selections.bg && selections.bg.startsWith("gradient:")) {
						selections.bg = null;
					}
					updateSelectionUI("bg");
					draw();
				});
				gradWrap.appendChild(gradLabel);
				gradWrap.appendChild(gradInput);
				panel.appendChild(gradWrap);
			}
			if (f !== "body") panel.appendChild(createThumb({ folder: f, file: null }));
			if (options[f]) options[f].forEach((file) => panel.appendChild(createThumb({ folder: f, file })));
			wrapper.append(header, panel);
			panelsEl.appendChild(wrapper);
		});
	}

	function createThumb({ folder, file }) {
		const tile = document.createElement("button");
		tile.type = "button";
		const selected = (selections[folder] || "") === (file || "");
		tile.className = thumbClass(folder, selected);
		tile.dataset.folder = folder;
		tile.dataset.file = file || "";
		tile.setAttribute("data-selected", selected);
		tile.setAttribute("aria-label", file ? `${folder} asset ${file}` : `${folder} none`);
		tile.title = file || "None";
		if (!file) {
			const noneBox = document.createElement("div");
			noneBox.className = "w-full h-full bg-[repeating-conic-gradient(theme(colors.slate.300)_0%_25%,theme(colors.slate.100)_0%_50%)] dark:bg-[repeating-conic-gradient(theme(colors.slate.600)_0%_25%,theme(colors.slate.700)_0%_50%)] [background-size:16px_16px] rounded-lg flex items-center justify-center";
			noneBox.innerHTML = '<span class="text-slate-400 dark:text-slate-500 text-xs font-semibold">NONE</span>';
			tile.appendChild(noneBox);
		} else {
			const imgWrap = document.createElement("div");
			imgWrap.className = "w-full h-full p-4 flex items-center justify-center";
			const img = new Image();
			img.decoding = "async";
			img.loading = "lazy";
			img.src = `assets/${folder}/${file}`;
			img.alt = `${folder} - ${file}`;
			img.className = "max-w-full max-h-full object-contain pointer-events-none select-none group-hover:scale-125 transition-transform duration-300";
			imgWrap.appendChild(img);
			tile.appendChild(imgWrap);
			const indicator = document.createElement("div");
			indicator.className = `absolute -top-1 -right-1 w-6 h-6 rounded-full ${selected ? "bg-sky-500 text-white" : "bg-slate-300 text-slate-600 opacity-0 group-hover:opacity-100"} flex items-center justify-center text-xs font-bold transition-all duration-200`;
			indicator.innerHTML = selected ? "✓" : "+";
			tile.appendChild(indicator);
		}
		tile.addEventListener("click", () => {
			selections[folder] = file;
			updateSelectionUI(folder);
			draw();
		});
		return tile;
	}

	function updateSelectionUI(folder) {
		document.querySelectorAll(`.thumb-tile[data-folder='${folder}']`).forEach((el) => {
			const file = el.dataset.file || "";
			const sel = (selections[folder] || "") === file;
			el.className = thumbClass(folder, sel);
			el.setAttribute("data-selected", sel);
			const indicator = el.querySelector(".absolute");
			if (indicator) {
				indicator.className = `absolute -top-1 -right-1 w-6 h-6 rounded-full ${sel ? "bg-sky-500 text-white" : "bg-slate-300 text-slate-600 opacity-0 group-hover:opacity-100"} flex items-center justify-center text-xs font-bold transition-all duration-200`;
				indicator.innerHTML = sel ? "✓" : "+";
			}
		});
	}

	function switchFolder(folder) {
		state.activeFolder = folder;
		document.querySelectorAll('#tabs [role="tab"]').forEach((tab) => {
			const active = tab.dataset.folder === folder;
			tab.setAttribute("aria-selected", active);
			tab.className = tabClass(tab.dataset.folder, active);
		});
		document.querySelectorAll('[role="tabpanel"]').forEach((panel) => {
			const wrap = panel.parentElement;
			const active = panel.id === `panel-${folder}`;
			wrap.classList.toggle("hidden", !active);
			if (active) wrap.style.animation = "slideIn .25s ease-out";
		});
	}

	function draw() {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		// Draw color or gradient background if selected
		if (selections.bg) {
			if (typeof selections.bg === "string" && selections.bg.startsWith("color:")) {
				ctx.save();
				ctx.fillStyle = selections.bg.slice(6);
				ctx.fillRect(0, 0, canvas.width, canvas.height);
				ctx.restore();
			} else if (typeof selections.bg === "string" && selections.bg.startsWith("gradient:")) {
				// Try to parse CSS gradient string
				try {
					// Create a temporary element to get the gradient
					const gradStr = selections.bg.slice(9);
					// Only support linear-gradient and radial-gradient for canvas
					let grad;
					if (gradStr.startsWith("linear-gradient")) {
						// Parse angle and color stops
						// Example: linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)
						const match = gradStr.match(/linear-gradient\(([^,]+),(.+)\)/);
						if (match) {
							let angle = match[1].trim();
							let stops = match[2].split(",").map(s => s.trim());
							// Convert angle to radians
							let theta = 0;
							if (angle.endsWith("deg")) {
								theta = (parseFloat(angle) - 90) * Math.PI / 180;
							}
							// Calculate x0,y0,x1,y1 for the angle
							const r = Math.SQRT2 * 0.5 * canvas.width;
							const cx = canvas.width / 2, cy = canvas.height / 2;
							const x0 = cx - r * Math.cos(theta);
							const y0 = cy - r * Math.sin(theta);
							const x1 = cx + r * Math.cos(theta);
							const y1 = cy + r * Math.sin(theta);
							grad = ctx.createLinearGradient(x0, y0, x1, y1);
							stops.forEach(stop => {
								const parts = stop.match(/(#[0-9a-fA-F]{3,8}|rgba?\([^\)]+\)|[a-zA-Z]+)\s*(\d+%?)?/);
								if (parts) {
									grad.addColorStop(parts[2] ? parseFloat(parts[2]) / 100 : undefined, parts[1]);
								}
							});
						}
					} else if (gradStr.startsWith("radial-gradient")) {
						// Only basic radial gradient: radial-gradient(circle, #fff 0%, #000 100%)
						const match = gradStr.match(/radial-gradient\(([^,]+),(.+)\)/);
						if (match) {
							let stops = match[2].split(",").map(s => s.trim());
							grad = ctx.createRadialGradient(
								canvas.width/2, canvas.height/2, 0,
								canvas.width/2, canvas.height/2, canvas.width/2
							);
							stops.forEach(stop => {
								const parts = stop.match(/(#[0-9a-fA-F]{3,8}|rgba?\([^\)]+\)|[a-zA-Z]+)\s*(\d+%?)?/);
								if (parts) {
									grad.addColorStop(parts[2] ? parseFloat(parts[2]) / 100 : undefined, parts[1]);
								}
							});
						}
					}
					if (grad) {
						ctx.save();
						ctx.fillStyle = grad;
						ctx.fillRect(0, 0, canvas.width, canvas.height);
						ctx.restore();
					}
				} catch (e) {
					// Fallback: do nothing
				}
			} else if (selections.bg) {
				// Fallback to image if not color/gradient
				if (options.bg && options.bg.includes(selections.bg)) {
					loadAndDraw(`assets/bg/${selections.bg}`);
				}
			}
		}
		(async () => {
			for (const folder of folders) {
				if (folder === "bg") continue; // already drawn
				const file = selections[folder];
				if (!file) continue;
				await loadAndDraw(`assets/${folder}/${file}`);
			}
		})();
	}

	function loadAndDraw(src) {
		return new Promise((resolve, reject) => {
			const img = new Image();
			img.onload = () => {
				ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
				resolve();
			};
			img.onerror = reject;
			img.src = src;
		});
	}

	function randomChoice(arr) {
		return arr[Math.floor(Math.random() * arr.length)];
	}


	function randomColor() {
		// Generate a random hex color
		return '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
	}
	function randomGradient() {
		// Generate a simple random linear gradient
		const c1 = randomColor();
		const c2 = randomColor();
		const angle = Math.floor(Math.random()*360);
		return `linear-gradient(${angle}deg, ${c1} 0%, ${c2} 100%)`;
	}

	randomizeBtn.addEventListener("click", () => {
		folders.forEach((f) => {
			if (f === "body") {
				selections[f] = randomChoice(options[f]);
			} else if (f === "bg") {
				// Randomly pick color, gradient, image, or none
				const bgTypes = [
					() => null,
					() => "color:" + randomColor(),
					() => "gradient:" + randomGradient(),
					() => randomChoice(options.bg)
				];
				selections.bg = bgTypes[Math.floor(Math.random()*bgTypes.length)]();
			} else {
				const opts = [null, ...options[f]];
				selections[f] = randomChoice(opts);
			}
			updateSelectionUI(f);
		});
		draw();
	});

	clearBtn.addEventListener("click", () => {
		folders.forEach((f) => {
			if (f === "body") {
				selections[f] = options[f][0];
			} else {
				selections[f] = null;
			}
		});
		folders.forEach(updateSelectionUI);
		draw();
	});

	downloadBtn.addEventListener("click", () => {
		const a = document.createElement("a");
		a.download = `clippy_pfp_${Date.now()}.png`;
		a.href = canvas.toDataURL("image/png");
		a.click();
	});

	document.addEventListener("keydown", (e) => {
		if (e.target.closest("input,textarea")) return;
		if (e.key === "r") {
			randomizeBtn.click();
		}
		if (e.key === "c") {
			clearBtn.click();
		}
		if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
			const idx = folders.indexOf(state.activeFolder);
			const delta = e.key === "ArrowRight" ? 1 : -1;
			const next = folders[(idx + delta + folders.length) % folders.length];
			switchFolder(next);
		}
	});
})();
