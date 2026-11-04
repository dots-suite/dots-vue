import store from '@/store'
const rootCollectionId = __APP_ROOT_DTS_COLLECTION_ID__

export function getSimpleObject(obj, parentId, projId) {
  const dtsRootCollectionId = store.state.dtsRootCollectionId
  const identifier = obj.identifier ? obj.identifier : obj['@id']

  const parent = obj.parent || parentId

  let projectId = projId

  // ❌ cas racines → pas de projectIdentifier
  if (
    identifier === rootCollectionId ||
    identifier === dtsRootCollectionId
  ) {
    projectId = undefined
  }

  // ✅ parent = root → projectIdentifier = identifier
  else if (
    parent === rootCollectionId ||
    parent === dtsRootCollectionId
  ) {
    projectId = identifier
  }

  // 🔁 sinon → on garde projId (hérité)

  const simpleObject = {
    ...obj,

    identifier,
    citeType: obj['@type'] ? obj['@type'] : obj.citeType,

    dublinCore: {
      ...obj?.dublinCore,
      title: Array.isArray(obj?.dublinCore?.title)
        ? obj?.dublinCore?.title?.[0]
        : obj?.dublinCore?.title
    },

    parent: parent || null,

    member: obj?.member?.map((m) =>
      getSimpleObject(m, identifier, projectId)
    ),

    children: obj?.children
      ? obj.children.map((m) =>
          getSimpleObject(m, identifier, projectId)
        )
      : obj?.member
        ? obj.member.map((m) =>
            getSimpleObject(m, identifier, projectId)
          )
        : [],

    context: obj?.['@context'],

    projectIdentifier: obj?.projectIdentifier
      ? obj.projectIdentifier
      : projectId
  }

  return simpleObject
}

// html and :root never match inside @scope, whose selectors stand below its root.
// Rewritten to :scope, the collection variables still land on the root itself.
function rootToScope (rules) {
  for (const rule of rules) {
    if (rule instanceof CSSStyleRule) {
      rule.selectorText = rule.selectorText.replace(/(^|,\s*)(?:html|:root)(?=$|[\s,.>#:[+~])/g, '$1:scope')
    }

    if (rule.cssRules) rootToScope(rule.cssRules)
  }
}

// A collection custom CSS styles the text only: confined here, it reaches neither
// .dots-ui, the application interface, nor what it contains, nor the Mirador viewer.
// Variables set on the root are inherited below the limit: they are how a collection
// themes the interface.
// @keyframes and other at-rules are invalid inside @scope, so they are kept out of it.
// @import is not supported: CSSStyleSheet ignores it.
export function confineCustomCss (css) {
  if (!css) return ''

  const sheet = new CSSStyleSheet()
  sheet.replaceSync(css)
  rootToScope(sheet.cssRules)

  const rules = [...sheet.cssRules]
  const isScopable = rule => rule instanceof CSSStyleRule || rule instanceof CSSGroupingRule

  return [
    ...rules.filter(rule => !isScopable(rule)).map(rule => rule.cssText),
    '@scope (:root) to (.dots-ui, .mirador-view) {',
    ...rules.filter(isScopable).map(rule => rule.cssText),
    '}'
  ].join('\n')
}

// Manage customCss
export function createCustomCssManager(initialCss = '') {
  // create / apply style
  let el = document.getElementById('customCss');
  if (!el) {
    el = document.createElement('style');
    el.id = 'customCss';
    // Initial append
    document.head.appendChild(el);
  }
  el.textContent = confineCustomCss(initialCss);

  // Observer : if customCss style tag isn't the last child, replace (e.g. move) it
  const observer = new MutationObserver(() => {
    // if customCss style tag is already the last child, do nothing
    if (document.head.lastElementChild !== el) {
      document.head.appendChild(el);
    }
  });

  observer.observe(document.head, { childList: true });

  return {
    update(css) {
      el.textContent = confineCustomCss(css);
      // if customCss style tag isn't the last child, replace (e.g. move) it
      if (document.head.lastElementChild !== el) {
        document.head.appendChild(el)
      }
    },
    disconnect() {
      observer.disconnect();
    },
    element: el
  };
}

// Use customCss manager
import { onMounted, onBeforeUnmount, watch } from 'vue';

export function useCustomCss(customCssRef) {
  let mgr;

  onMounted(() => {
    mgr = createCustomCssManager(customCssRef.value || '');
  });

  watch(customCssRef, (newVal) => {
    if (mgr) mgr.update(newVal);
  });

  onBeforeUnmount(() => {
    if (mgr) mgr.disconnect();
  });

  return {
    getElement: () => mgr && mgr.element
  };
}
