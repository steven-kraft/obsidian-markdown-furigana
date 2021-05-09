import { Plugin, MarkdownPostProcessor, MarkdownPostProcessorContext, MarkdownPreviewRenderer } from 'obsidian'

// Regular Expression for {{kanji|kana|kana|...}} format
const REGEXP = /{((?:[一-龯]|[ぁ-んァ-ン])+)((?:\|[ぁ-んァ-ン]*)+)}/gm

// Main Tags to search for Furigana Syntax
const TAGS = 'p, h1, h2, h3, h4, h5, h6, ol, ul, table'

const convertFurigana = (element:Node): Node => {
  const text = element.textContent
  const matches = Array.from(text.matchAll(REGEXP))
  if (matches.length === 0) return element

  let newText = text

  for (const match of matches) {
    const kanji = match[1].split('')
    const furi = match[2].split('|').slice(1) // First Element will be empty
    if (kanji.length === furi.length) {
      // Number of Characters in first section must be equal to number of furigana sections
      newText = newText.replace(match[0], function () {
        // Create a stringified version of the ruby HTMLElement
        const innerHTML = kanji.map((k, i) => { return `${k}<rt>${furi[i]}</rt>` }).join('')
        return `<ruby>${innerHTML}</ruby>`
      })
    }
  }

  // Replace TextElement with new Span containing Ruby Element(s)
  const newElement = document.createElement('span')
  newElement.addClass('furi')
  newElement.innerHTML = newText
  return newElement
}

export default class SimpleFurigana extends Plugin {
    public postprocessor: MarkdownPostProcessor = (el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
      const blockToReplace = el.querySelector(TAGS)
      if (!blockToReplace || !blockToReplace.innerHTML.match(REGEXP)) return

      function replace (node:Node) {
        node.childNodes.forEach(child => {
          if (child.nodeType === 3) {
            // Nodes of Type 3 are TextElements
            child.replaceWith(convertFurigana(child))
          } else if (child.hasChildNodes() && child.nodeName !== 'CODE') {
            // Ignore content in Code Blocks
            replace(child)
          }
        })
      }
      replace(blockToReplace)
    }

    async onload () {
      console.log('loading Simple Furigana plugin')
      MarkdownPreviewRenderer.registerPostProcessor(this.postprocessor)
    }

    onunload () {
      console.log('unloading Simple Furigana plugin')
      MarkdownPreviewRenderer.unregisterPostProcessor(this.postprocessor)
    }
}
