import { Plugin, MarkdownPostProcessor, MarkdownPostProcessorContext } from 'obsidian'

// Regular Expression for {{kanji|kana|kana|...}} format
const REGEXP = /{((?:[一-龯]|[ぁ-んァ-ン])+)((?:\|[ぁ-んァ-ン]*)+)}/gm

// Main Tags to search for Furigana Syntax
const TAGS = 'p, h1, h2, h3, h4, h5, h6, ol, ul, table'

const convertFurigana = (element:Text): Node => {
  const matches = Array.from(element.textContent.matchAll(REGEXP))
  if (matches.length === 0) return element
  let lastNode = element
  for (const match of matches) {
    const kanji = match[1].split('')
    const furi = match[2].split('|').slice(1) // First Element will be empty
    if (kanji.length === furi.length || furi.length === 1) {
      // Number of Characters in first section must be equal to number of furigana sections (unless only one furigana section)
      const rubyNode = document.createElement('ruby')
      rubyNode.addClass('furi')
      let rt
      if (furi.length === 1) {
        rubyNode.appendChild(document.createTextNode(kanji.join('')))
        rt = document.createElement('rt')
        rt.innerText = furi[0]
        rubyNode.appendChild(rt)
      } else {
        kanji.forEach((k, i) => {
          rubyNode.appendChild(document.createTextNode(k))
          rt = document.createElement('rt')
          rt.innerText = furi[i]
          rubyNode.appendChild(rt)
        })
      }
      const nodeToReplace = lastNode.splitText(lastNode.textContent.indexOf(match[0]))
      lastNode = nodeToReplace.splitText(match[0].length)
      nodeToReplace.replaceWith(rubyNode)
    }
  }
  return element
}

export default class MarkdownFurigana extends Plugin {
    public postprocessor: MarkdownPostProcessor = (el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
      const blockToReplace = el.querySelector(TAGS)
      if (!blockToReplace) return

      function replace (node:Node) {
        node.childNodes.forEach(child => {
          if (child.nodeType === 3) {
            // Nodes of Type 3 are TextElements
            child.replaceWith(convertFurigana(child as Text))
          } else if (child.hasChildNodes() && child.nodeName !== 'CODE') {
            // Ignore content in Code Blocks
            replace(child)
          }
        })
      }
      replace(blockToReplace)
    }

    async onload () {
      console.log('loading Markdown Furigana plugin')
      this.registerMarkdownPostProcessor(this.postprocessor)
    }

    onunload () {
      console.log('unloading Markdown Furigana plugin')
    }
}
