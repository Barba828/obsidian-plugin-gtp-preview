import { App, Modal, Setting } from "obsidian";
import { AlphaTabApi, model } from "@coderline/alphatab";

export class TracksModal extends Modal {
	tracks: AlphaTabApi["tracks"];
	renderTracks: Set<AlphaTabApi["tracks"][0]>;
	onChange?: (tracks?: AlphaTabApi["tracks"]) => void;

	constructor(
		app: App,
		tracks: TracksModal["tracks"],
		onChange?: TracksModal["onChange"]
	) {
		super(app);
		this.tracks = tracks;
    this.onChange = onChange;
		this.renderTracks = new Set([tracks[0]]);
		this.modalEl.addClass("tracks-modal");
	}

	onOpen = () => {
		this.tracks.forEach((track) => {
			const setting = new Setting(this.contentEl)
				.setName(track.name)
				.setDesc(track.shortName)
				.addToggle((toggle) => {
					toggle
						.setValue(this.renderTracks.has(track))
						.onChange((value) => {
							if (value) {
								this.renderTracks.add(track);
							} else {
								this.renderTracks.delete(track);
							}
							this.onSelectTrack();
						});
				});
		});
	}

	onSelectTrack = () => {
		const selectTracks = Array.from(this.renderTracks).sort(
			(a, b) => a.index - b.index
		);
    this.onChange?.(selectTracks)
	};

	onClose = () => {
		this.contentEl.empty();
	}

  setTracks(tracks: AlphaTabApi["tracks"]) {
    this.tracks = tracks;
  }
  setRenderTracks(tracks: AlphaTabApi["tracks"]) {
    this.renderTracks = new Set(tracks);
  }
}
