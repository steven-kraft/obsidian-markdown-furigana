import { App, Plugin, MarkdownPostProcessor, MarkdownPostProcessorContext, PluginSettingTab, Setting, MarkdownView } from 'obsidian'
import { RangeSetBuilder } from "@codemirror/state"
import { ViewPlugin, WidgetType, EditorView, ViewUpdate, Decoration, DecorationSet } from '@codemirror/view'

// Regular Expression for {{kanji|kana|kana|...}} format
const REGEXP = /{((?:[\u2E80-\uA4CF\uFF00-\uFFEF])+)((?:\\?\|[^ -\/{-~:-@\[-`]*)+)}/gm;

// Main Tags to search for Furigana Syntax
const TAGS = 'p, h1, h2, h3, h4, h5, h6, ol, ul, table'

const convertFurigana = (element: Text): Node => {
  const matches = Array.from(element.textContent.matchAll(REGEXP))
  let lastNode = element
  for (const match of matches) {
    const furi = match[2].split('|').slice(1) // First Element will be empty
    const kanji = furi.length === 1 ? [match[1]] : match[1].split('')
    if (kanji.length === furi.length) {
      // Number of Characters in first section must be equal to number of furigana sections (unless only one furigana section)
      const rubyNode = document.createElement('ruby')
      rubyNode.addClass('furi')
      kanji.forEach((k, i) => {
        rubyNode.appendText(k)
        rubyNode.createEl('rt', { text: furi[i] })
      })
      let offset = lastNode.textContent.indexOf(match[0])
      const nodeToReplace = lastNode.splitText(offset)
      lastNode = nodeToReplace.splitText(match[0].length)
      nodeToReplace.replaceWith(rubyNode)
    }
  }
  return element
}

interface FuriganaSettings {
  furiganaSource: boolean; 
}

const DEFAULT_SETTINGS: Partial<FuriganaSettings> = {
  furiganaSource: true,
};

export default class MarkdownFurigana extends Plugin {
  settings: FuriganaSettings;

  // Required to be able to dynamically toggle Editor Extension without reloading plugin
  extension: ViewPlugin<FuriganaViewPlugin>[] = [];

  public postprocessor: MarkdownPostProcessor = (el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
    const blockToReplace = el.querySelectorAll(TAGS)
    if (blockToReplace.length === 0) return

    function replace(node: Node) {
      const childrenToReplace: Text[] = []
      node.childNodes.forEach(child => {
        if (child.nodeType === 3) {
          // Nodes of Type 3 are TextElements
          childrenToReplace.push(child as Text)
        } else if (child.hasChildNodes() && child.nodeName !== 'CODE' && child.nodeName !== 'RUBY') {
          // Ignore content in Code Blocks
          replace(child)
        }
      })
      childrenToReplace.forEach((child) => {
        child.replaceWith(convertFurigana(child))
      })
    }

    blockToReplace.forEach(block => {
      replace(block)
    })
  }

  async onload() {
    console.log('loading Markdown Furigana plugin')

    await this.loadSettings();
    this.addSettingTab(new FuriganaSettingsTab(this.app, this));

    // Automatically toggles the Editor Extension on Live Preview
    // Layout change seems to be called once when booting up
    this.app.workspace.on('layout-change', () => {
      const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView)?.getState();
      this.extension.length = 0;
      if (this.settings.furiganaSource || !(markdownView.source)) {
        this.extension.push(viewPlugin);
      }
      this.app.workspace.updateOptions();
    })

    this.registerMarkdownPostProcessor(this.postprocessor)
    this.registerEditorExtension(this.extension)
  }

  onunload() {
    console.log('unloading Markdown Furigana plugin')
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class FuriganaSettingsTab extends PluginSettingTab {
  plugin: MarkdownFurigana;
  constructor(app: App, plugin: MarkdownFurigana) {
		super(app, plugin);
		this.plugin = plugin;
  }

  display(): void {
    let { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
    .setName('Show Furigana in Source Mode')
    .addToggle((toggle) => {
      toggle.setValue(this.plugin.settings.furiganaSource);
      toggle.onChange(value => {
        // Dynamically toggle Editor Extension
        this.plugin.extension.length = 0;
        const markdownView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView)?.getState()
        if (value || !markdownView.source) {
          this.plugin.extension.push(viewPlugin);
        }
        this.plugin.app.workspace.updateOptions();

        this.plugin.settings.furiganaSource = value;
        this.plugin.saveSettings();
      })
    });
  }
}

class RubyWidget extends WidgetType {
  constructor(readonly kanji: string[], readonly furi: string[]) {
    super()
  }

  toDOM(view: EditorView): HTMLElement {
    let ruby = document.createElement("ruby")
    this.kanji.forEach((k, i) => {
      ruby.appendText(k)
      ruby.createEl("rt", { text: this.furi[i] })
    })
    return ruby
  }
}

class FuriganaViewPlugin {
  decorations: DecorationSet;

  constructor(view: EditorView) {
    this.decorations = this.buildDecorations(view);
  }

  update(update: ViewUpdate) {
    if (
      update.docChanged ||
      update.viewportChanged ||
      update.selectionSet
    ) {
      this.decorations = this.buildDecorations(update.view);
    }
  }

  destroy() { }

  buildDecorations(view: EditorView): DecorationSet {
    let builder = new RangeSetBuilder<Decoration>();
    let lines: number[] = [];
    if (view.state.doc.length > 0) {
      lines = Array.from(
        { length: view.state.doc.lines },
        (_, i) => i + 1,
      );
    }

    const currentSelections = [...view.state.selection.ranges];

    for (let n of lines) {
      const line = view.state.doc.line(n);
      const startOfLine = line.from;
      const endOfLine = line.to;

      let currentLine = false;

      currentSelections.forEach((r) => {
        if (r.to >= startOfLine && r.from <= endOfLine) {
          currentLine = true;
          return;
        }
      });
      let matches = Array.from(line.text.matchAll(REGEXP))
      for (const match of matches) {
        let add = true
        const furi = match[2].split("|").slice(1)
        const kanji = furi.length === 1 ? [match[1]] : match[1].split("")
        const from = match.index != undefined ? match.index + line.from : -1
        const to = from + match[0].length
        currentSelections.forEach((r) => {
          if (r.to >= from && r.from <= to) {
            add = false
          }
        })
        if (add) {
          builder.add(from, to, Decoration.widget({ widget: new RubyWidget(kanji, furi) }))
        }
      }
    }
    return builder.finish();
  }
}

const viewPlugin = ViewPlugin.fromClass(FuriganaViewPlugin, {
  decorations: (v) => v.decorations,
})
