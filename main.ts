import { Plugin, MarkdownPostProcessor, MarkdownPostProcessorContext } from 'obsidian'

// Regular Expression for {{kanji|kana|kana|...}} format
const REGEXP = /{((?:[\u4E00-\u9FFFㄅ-ㄩぁ-んァ-ンー〇])+)((?:\|[^ -\/{-~:-@\[-`]*)+)}/gm

// Main Tags to search for Furigana Syntax
const TAGS = 'p, h1, h2, h3, h4, h5, h6, ol, ul, table'

const convertFurigana = (element:Text): Node => {
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
      const nodeToReplace = lastNode.splitText(lastNode.textContent.indexOf(match[0]))
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

      function replace (node:Node) {
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

    async onload () {
      console.log('loading Markdown Furigana plugin')
      this.registerMarkdownPostProcessor(this.postprocessor)
    }

    onunload () {
      console.log('unloading Markdown Furigana plugin')
    }
}
