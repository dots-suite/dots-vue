// Base document stylesheets of the DoTS renderer, declared in the collection
// config (renderer.css) and confined to .document-views.
//
// Replaces the static assets/css/tei.css and assets/css/html.css.
//
// @scope confines the rules to the div. @layer is what keeps collection custom
// CSS able to override them with bare selectors: unlayered styles beat layered
// ones whatever their specificity. Measured -- @scope alone loses to neither
// specificity nor order, because scoping proximity outranks order of
// appearance, so a scoped rule would beat the collection's bare selector.

const STYLE_ID = 'documentBaseCss'

const cache = new Map()

// @import is invalid inside @scope and must be resolved first. Relative URLs
// are resolved against the stylesheet that declared them. Comments go first,
// so that a commented-out @import is not fetched.
async function inlineImports (css, baseUrl, seen = new Set()) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, '')

  const imports = [...css.matchAll(/@import\s+(?:url\(\s*)?['"]?([^'")\s;]+)['"]?\s*\)?[^;]*;/g)]

  for (const [statement, href] of imports) {
    const resolved = new URL(href, baseUrl)

    // An http @import (Google Fonts in teibp.css) is mixed content on https.
    if (resolved.protocol === 'http:' && location.protocol === 'https:') resolved.protocol = 'https:'

    const url = resolved.href

    if (seen.has(url)) {
      css = css.replace(statement, '')
      continue
    }

    seen.add(url)

    try {
      const imported = await fetchCss(url)
      css = css.replace(statement, await inlineImports(imported, url, seen))
    } catch (error) {
      console.warn(`useDocumentBaseCss: cannot inline ${url}`, error)
      css = css.replace(statement, '')
    }
  }

  return css
}

// html, body and :root never match inside @scope: every selector is confined
// to .document-views, even its leading compounds. Rewritten to :scope, their
// declarations (custom properties, base typography) land on the root itself.
// :where() gives zero specificity, the closest to a type selector's.
const SCOPE = ':where(:scope)'

// Splits outside (), [] and strings, at the separator characters. Returns
// [part, separator, part, ...]; runs of whitespace around a separator collapse.
function splitSelector (selector, separators) {
  const tokens = []
  let current = ''
  let pending = null
  let depth = 0
  let quote = null

  for (let i = 0; i < selector.length; i++) {
    const c = selector[i]

    if (!quote && depth === 0 && separators.test(c)) {
      pending = (pending ?? '') + c
      continue
    }

    if (pending !== null) {
      if (current) {
        tokens.push(current, pending.trim() || ' ')
        current = ''
      }
      pending = null
    }

    current += c

    if (c === '\\') {
      current += selector[++i] ?? ''
    } else if (quote) {
      if (c === quote) quote = null
    } else if (c === '"' || c === "'") {
      quote = c
    } else if (c === '(' || c === '[') {
      depth++
    } else if (c === ')' || c === ']') {
      depth--
    }
  }

  if (current) tokens.push(current)

  return tokens
}

// "html body > p" -> ":where(:scope) > p", "body" -> ":where(:scope)".
// Qualified compounds such as body.dark-mode are left alone: they test the
// real body, which @scope cannot see, so those rules stay inert.
function rootToScope (complex, pageSelectors) {
  const tokens = splitSelector(complex, /[\s>+~]/)
  let i = 0

  while (i < tokens.length && pageSelectors.has(tokens[i].toLowerCase())) i += 2

  if (i === 0) return complex

  const rest = tokens.slice(i)

  if (!rest.length) return SCOPE

  return [SCOPE, tokens[i - 1], ...rest].map((t, n) => n % 2 && t !== ' ' ? ` ${t} ` : t).join('')
}

function rewriteRules (rules, pageSelectors) {
  for (const rule of rules) {
    if (rule instanceof CSSStyleRule) {
      rule.selectorText = splitSelector(rule.selectorText, /,/)
        .filter((t, n) => n % 2 === 0)
        .map(t => rootToScope(t.trim(), pageSelectors))
        .join(', ')
    }

    if (rule.cssRules) rewriteRules(rule.cssRules, pageSelectors)
  }
}

// @font-face is invalid inside @scope, so it is kept out of the wrapper. It
// only declares a font family; nothing outside the document uses it.
// @namespace is dropped: the TEI is inserted as HTML elements, which a
// TEI-namespaced type selector (teic-oxygen) would not match.
function prepareCss (css, pageSelectors) {
  const sheet = new CSSStyleSheet()
  sheet.replaceSync(css)
  rewriteRules(sheet.cssRules, new Set(pageSelectors.map(selector => selector.toLowerCase())))

  const rules = [...sheet.cssRules].filter(rule => !(rule instanceof CSSNamespaceRule))
  const isFontFace = rule => rule instanceof CSSFontFaceRule

  return {
    fontFaces: rules.filter(isFontFace).map(rule => rule.cssText).join('\n'),
    scoped: rules.filter(rule => !isFontFace(rule)).map(rule => rule.cssText).join('\n')
  }
}

async function fetchCss (url) {
  const response = await fetch(url, { mode: 'cors' })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} on ${url}`)
  }

  return response.text()
}

async function fetchRendererCss (urls) {
  const sheets = await Promise.all(urls.map(async url => inlineImports(await fetchCss(url), url)))

  return sheets.join('\n')
}

// renderer: the renderer object of the collection config. css lists the
// stylesheets in order; pageSelectors, the selectors standing for the page
// (in teic-oxygen, body is the TEI <body> and must not be listed).
export async function loadDocumentBaseCss (renderer) {
  const urls = renderer?.css ?? []
  const pageSelectors = renderer?.pageSelectors ?? []
  const key = JSON.stringify([urls, pageSelectors])

  removeDocumentBaseCss()

  if (!urls.length) return null

  try {
    if (!cache.has(key)) {
      cache.set(key, prepareCss(await fetchRendererCss(urls), pageSelectors))
    }

    const { fontFaces, scoped } = cache.get(key)
    const css = [
      fontFaces,
      '@layer documentBase {',
      '@scope (.document-views) {',
      scoped,
      '}',
      '}'
    ].join('\n')

    const el = document.createElement('style')
    el.id = STYLE_ID
    el.textContent = css

    // Before #customCss, which its manager keeps last so collection rules win.
    const customCss = document.getElementById('customCss')

    if (customCss) {
      document.head.insertBefore(el, customCss)
    } else {
      document.head.appendChild(el)
    }

    return css
  } catch (error) {
    console.error(`useDocumentBaseCss: ${renderer?.name ?? 'renderer'} stylesheets not loaded`, error)
    return null
  }
}

export function removeDocumentBaseCss () {
  document.getElementById(STYLE_ID)?.remove()
}
