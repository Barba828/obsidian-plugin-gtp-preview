import { FileView, Notice, TFile, WorkspaceLeaf } from "obsidian";
import * as alphaTab from "@coderline/alphatab";
import {
	model,
	type AlphaTabApi,
	type Settings,
	type RenderingResources,
} from "@coderline/alphatab";
import { TracksModal } from "./tracks-modal";

export const VIEW_TYPE_GTP = "gtp-view";
export class GTPView extends FileView {
	score: model.Score;
	alphaTabSettings: Settings;
	renderTracks: AlphaTabApi["tracks"];
	renderWidth: number = 800;

	darkMode: boolean;
	tracksModal: TracksModal;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);

		this.containerEl.addClass("gtp-preview-container");
		this.tracksModal = new TracksModal(this.app, [], this.onChangeTracks);
		this.addAction("music", "Set Instrument", () =>
			this.tracksModal.open()
		);
		this.addAction("download", "Download Midi File", this.downloadMidi);
		// this.addAction("play", "Play", this.playMidi);
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
		this.darkMode = document.body?.className?.includes?.("theme-dark");
		this.renderWidth = Math.min(this.contentEl.clientWidth || 800, 800);
		// 1. Setup settings
		this.alphaTabSettings = new alphaTab.Settings();
		this.alphaTabSettings.display.scale = 0.8;
		this.alphaTabSettings.core.engine = "svg";
		this.alphaTabSettings.core.enableLazyLoading = true;
		this.alphaTabSettings.core.useWorkers = true;
		this.alphaTabSettings.player = {
			...this.alphaTabSettings.player,
			enablePlayer: true,
			enableCursor: true,
			enableUserInteraction: true,
			scrollElement: this.contentEl,
		};
		const themeResources = (
			this.darkMode
				? {
						staffLineColor: new model.Color(221, 221, 221), // 六线谱线的颜色
						barSeparatorColor: new model.Color(221, 221, 221), // 小节分隔符颜色
						barNumberColor: new model.Color(100, 108, 255), // 小节号的颜色
						mainGlyphColor: new model.Color(238, 238, 238), // 主要音符的颜色
						secondaryGlyphColor: new model.Color(232, 232, 232), // 次要音符的颜色
						scoreInfoColor: new model.Color(248, 248, 248), // 歌曲信息的颜色
				  }
				: {
						staffLineColor: new model.Color(34, 34, 34), // 六线谱线的颜色
						barSeparatorColor: new model.Color(34, 34, 34), // 小节分隔符颜色
						barNumberColor: new model.Color(100, 108, 255), // 小节号的颜色
						mainGlyphColor: new model.Color(17, 17, 17), // 主要音符的颜色
						secondaryGlyphColor: new model.Color(24, 24, 24), // 次要音符的颜色
						scoreInfoColor: new model.Color(8, 8, 8), // 歌曲信息的颜色
				  }
		) as RenderingResources;
		this.alphaTabSettings.display.resources = {
			...this.alphaTabSettings.display.resources,
			...themeResources,
		};

		// 2. Setup renderer
		const renderer = new alphaTab.rendering.ScoreRenderer(
			this.alphaTabSettings
		);
		renderer.width = this.renderWidth;

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
		renderer.renderTracks(this.renderTracks);

		return svgChunks.map((c) => c.svg).join("\n");
	}

	renderGTP() {
		const content = this.parseGTPContent();

		// clean content
		this.contentEl.empty();
		const div = this.contentEl.createDiv("at-container-svgs");
		// insert svg to content
		div.insertAdjacentHTML("afterbegin", content);
	}

	/**
	 * loaded file to render gtp
	 * 文件加载完成 callback 自动调用，加载 gtp 读取 score，默认渲染 score 中第一个轨道
	 * @param file
	 */
	async onLoadFile(file: TFile) {
		// 0.loading
		this.contentEl.createEl("div", {
			text: "Loading GTP...",
			cls: "at at-container-loading",
		});

		// 1.load gtp
		const buffer = await this.app.vault.readBinary(file);
		const gtpUint8Array = new Uint8Array(buffer);
		this.score = alphaTab.importer.ScoreLoader.loadScoreFromBytes(
			gtpUint8Array,
			this.alphaTabSettings
		);
		// 2.set tracks and render fisrt track default
		this.renderTracks = [this.score.tracks[0]];
		this.tracksModal.setTracks(this.score.tracks);
		this.tracksModal.setRenderTracks([this.score.tracks[0]]);

		// 3.render gtp, delay 0ms for get this.contentEl.clientWidth
		setTimeout(async () => {
			this.renderGTP();
		}, 0);
	}

	onUnloadFile(file: TFile): Promise<void> {
		this.contentEl.empty();
		return super.onUnloadFile(file);
	}

	onResize(): void {
		super.onResize();
		const resizeWidth = this.contentEl.clientWidth;
		if (resizeWidth && resizeWidth !== this.renderWidth) {
			this.renderGTP();
		}
	}

	downloadMidi = () => {
		const midiFile = new alphaTab.midi.MidiFile();
		const handler = new alphaTab.midi.AlphaSynthMidiFileHandler(
			midiFile,
			true /* For SMF1.0 export */
		);
		const generator = new alphaTab.midi.MidiFileGenerator(
			this.score,
			this.alphaTabSettings,
			handler
		);

		// start generation
		generator.generate();
		// use midi file
		const fileName = `${this.getDisplayText()}.mid`;
		const blob = new Blob([midiFile.toBinary()], { type: "audio/midi" });
		saveToFile(fileName, blob);
	};

	// playMidi = async () => {
	// 	const soundFontResponse = await fetch(
	// 		"https://barba828.github.io/buitar-editor/soundfont/sonivox.sf2"
	// 	);
	// 	const midiFile = new alphaTab.midi.MidiFile();
	// 	const soundFont = new Uint8Array(await soundFontResponse.arrayBuffer());

	// 	// Setup player
	// 	const player = new alphaTab.synth.AlphaSynth(
	// 		new alphaTab.synth.AlphaSynthAudioWorkletOutput(this.alphaTabSettings),
	// 		99999999
	// 	);

	// 	// const player = new alphaTab.synth.AlphaSynthWebWorkerApi(
	// 	// 	new  alphaTab.synth.AlphaSynthAudioWorkletOutput(this.alphaTabSettings),
	// 	// 	this.alphaTabSettings
	// 	// );

	// 	// const player = new alphaTab.synth.AlphaSynthWebWorkerApi(
	// 	// 	new alphaTab.synth.AlphaSynthScriptProcessorOutput(),
	// 	// 	this.alphaTabSettings
	// 	// );

	// 	player.loadSoundFont(soundFont, false);
	// 	player.loadMidiFile(midiFile);
	// 	player.play();
	// };

	onChangeTracks = (selectTracks: AlphaTabApi["tracks"]) => {
		this.renderTracks = selectTracks;
		this.renderGTP();
	};
}

function saveToFile(fileName: string, blob: Blob) {
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = fileName;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}
