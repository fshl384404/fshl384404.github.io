/**
 * Math Protect Script
 *
 * The Markdown renderer (hexo-renderer-marked) treats LaTeX as plain Markdown:
 * it turns `_` into emphasis, eats backslash escapes such as \\, \| and \,, and
 * converts soft line breaks into <br>. Formulas therefore came out truncated,
 * with swallowed underscores and broken \begin{aligned} blocks.
 *
 * This filter swaps every math region for an opaque token before rendering and
 * restores it afterwards, so MathJax typesets the original LaTeX untouched.
 * Code regions (fenced blocks and inline code) are copied verbatim, so regexes
 * and shell snippets that contain `$` are never mistaken for math.
 */

// capture order: fenced code | inline code | $$..$$ | \[..\] | \(..\) | $..$
const TOKEN_RE = /(`{3,}[\s\S]*?(?:`{3,}|$))|(`[^`\n]*`)|(\$\$[\s\S]*?\$\$)|(\\\[[\s\S]*?\\\])|(\\\([\s\S]*?\\\))|((?<![\\\w$])\$(?!\s)[^\n$]+?(?<!\s)\$(?!\d))/g
const TOKEN_MATCH = /zzMPH(\d+)MPHzz/g
const TOKEN_PREFIX = 'zzMPH'
const TOKEN_SUFFIX = 'MPHzz'

// The Markdown renderer used to escape these; keep the HTML valid now that the
// formula text is emitted verbatim (MathJax reads the decoded text nodes).
function escapeMath (text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

hexo.extend.filter.register('before_post_render', function (data) {
  if (!data.content) return data
  if (data.content.indexOf('$') === -1 && data.content.indexOf('\\(') === -1 && data.content.indexOf('\\[') === -1) return data

  const store = []
  data.content = data.content.replace(TOKEN_RE, function (match, fence, code) {
    if (fence !== undefined || code !== undefined) return match
    store.push(match)
    return TOKEN_PREFIX + (store.length - 1) + TOKEN_SUFFIX
  })
  data._mathProtect = store

  return data
}, 5)

hexo.extend.filter.register('after_post_render', function (data) {
  const store = data._mathProtect
  if (!store || !store.length) return data

  data.content = data.content.replace(TOKEN_MATCH, function (match, index) {
    const text = store[Number(index)]
    return text === undefined ? match : escapeMath(text)
  })
  // A display formula left alone in a paragraph should not stay wrapped in <p>
  data.content = data.content.replace(/<p>\s*(\$\$[\s\S]*?\$\$)\s*<\/p>/g, '$1')
  delete data._mathProtect

  return data
}, 5)
