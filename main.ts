import { Plugin } from 'obsidian';

export default class SimpleFurigana extends Plugin {
	async onload() {
		console.log('loading Simple Furigana plugin');

		this.registerCodeMirror((cm: CodeMirror.Editor) => {
			console.log('codemirror', cm);
		});
	}

	onunload() {
		console.log('unloading Simple Furigana plugin');
	}
}
