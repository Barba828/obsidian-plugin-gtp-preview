import { FileView, TFile, WorkspaceLeaf } from "obsidian";
import * as alphaTab from "@coderline/alphatab";
import { model, type Settings } from "@coderline/alphatab";

export const VIEW_TYPE_GTP = "gtp-view";
export class GTPView extends FileView {
	score: model.Score;
	alphaTabSettings: Settings;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
		// this.addAction("file", "Open GTP File", () => {});
	}

	getViewType(): string {
		return VIEW_TYPE_GTP;
	}

	getDisplayText() {
		if (this.score) {
			return `${this.score.title} - ${this.score.artist}`;
		}
		return super.getDisplayText();
	}

	parseGTPContent() {
		// 1. Setup settings
		this.alphaTabSettings = new alphaTab.Settings();
		this.alphaTabSettings.display.scale = 0.8;
		this.alphaTabSettings.core.engine = "svg";
		this.alphaTabSettings.core.enableLazyLoading = true;
		this.alphaTabSettings.player = {
			...this.alphaTabSettings.player,
			enablePlayer: true,
			enableCursor: true,
			enableUserInteraction: true,
			scrollElement: this.contentEl,
		};

		// this.alphaTabSettings.display.

		// 2. Setup renderer
		const renderer = new alphaTab.rendering.ScoreRenderer(
			this.alphaTabSettings
		);
		renderer.width = 600;

		// 3. Listen to Events
		let svgChunks: { svg: string; width: number; height: number }[] = [];
		renderer.preRender.on((isResize) => {
			svgChunks = [];
		});
		renderer.partialLayoutFinished.on((r) => {
			renderer.renderResult(r.id);
		});
		renderer.partialRenderFinished.on((r) => {
			svgChunks.push({
				svg: r.renderResult as string, // svg string
				width: r.width,
				height: r.height,
			});
		});

		// 4. Virtual Render
		renderer.renderScore(this.score, [0]);

		return svgChunks.map((c) => c.svg).join("\n");
	}

	renderGTP() {
		const content = this.parseGTPContent();

		this.contentEl.empty();
		const div = this.contentEl.createDiv();
		div.innerHTML = content;
		div.style.height = "unset";
		div.style.width = "600px";
		div.style.margin = "auto";
		div.style.overflow = "visible";
		this.contentEl.style.overflow = "scroll";
	}

	// onResize() {
	// 	super.onResize();
	// 	this.renderGTP();
	// }

	onUnloadFile(file: TFile): Promise<void> {
		this.contentEl.empty();
		return super.onUnloadFile(file);
	}

	async onLoadFile(file: TFile) {
		this.contentEl.innerHTML = "Loading GTP...";
		const buffer = await this.app.vault.readBinary(file);
		const gtpUint8Array = new Uint8Array(buffer);

		this.score = alphaTab.importer.ScoreLoader.loadScoreFromBytes(
			gtpUint8Array,
			this.alphaTabSettings
		);

		this.renderGTP();
	}
}
