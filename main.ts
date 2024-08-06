import { GTPView, VIEW_TYPE_GTP } from "./src/view";
import { Plugin, Menu, Notice } from "obsidian";

export default class ExamplePlugin extends Plugin {
	async onload() {
		this.registerView(VIEW_TYPE_GTP, (leaf) => new GTPView(leaf));
		this.registerExtensions(
			["gtp", "gp", "gp3", "gp4", "gp5", "gpx"],
			VIEW_TYPE_GTP
		);

		// this.addRibbonIcon("dice", "Activate view", () => {
		// 	this.activateView();
		// });
	}
}