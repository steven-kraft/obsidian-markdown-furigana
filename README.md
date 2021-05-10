## Markdown Furigana Plugin (Obsidian)

Simple markdown to furigana rendering plugin for displaying Japanese text with [furigana](https://en.wikipedia.org/wiki/Furigana) in Obsidian (https://obsidian.md).

Based off of [markdown-it-ruby](https://github.com/lostandfound/markdown-it-ruby) syntax. All rendering is done post-processing when previewing, so your notes are not modified.

### Examples

Markdown|Processed As|Displays As
---|---|---
{漢字\|かんじ}|`<ruby>漢字<rt>かんじ</rt></ruby>`|<ruby>漢字<rt>かんじ</rt></ruby>
{漢字\|かん\|じ}|`<ruby>漢<rt>かん</rt>字<rt>じ</rt></ruby>`|<ruby>漢<rt>かん</rt>字<rt>じ</rt></ruby>

### Additional Info

The plugin expects the first section to be Kanji or Kana, and furigana sections to be Hiragana or Katakana. If more than one furigana section, there must be as many as the number of characters in the first section. Sections of furigana can also be empty.

### See Also
- Also check out [obsidian-furigana](https://github.com/uonr/obsidian-furigana) if you prefer to use the ruby syntax directly in your notes.
