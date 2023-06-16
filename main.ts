import { Plugin, MarkdownPostProcessor, MarkdownPostProcessorContext } from 'obsidian'
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

export default class MarkdownFurigana extends Plugin {
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
    this.registerMarkdownPostProcessor(this.postprocessor)
    this.registerEditorExtension(viewPlugin)
  }

  onunload() {
    console.log('unloading Markdown Furigana plugin')
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

const viewPlugin = ViewPlugin.fromClass(class {
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
}, {
  decorations: (v) => v.decorations,
})
