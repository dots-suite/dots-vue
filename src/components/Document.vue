<template>
  <div class="document wrapper">
    <div
      class="row"
      :class="currentLevelIndicator === 'renderToc' ? 'dots-ui' : ''"
    >
      <Suspense @resolve="scrollTo()">
        <component :is="customDocument" />
      </Suspense>
    </div>
    <!-- Display a TOC of the current item children in 2 scenarios : -->
    <!-- When the selected item is hierarchically above editorial level -->
    <div
      v-if="currentLevelIndicator === 'renderToc'"
      id="article"
      class="dots-ui row bottom-toc"
    >
      <TOC
        :is-doc-project-id-included="isDocProjectIdInc"
        :toc="asideTOC"
        :maxcitedepth="maxcitedepth"
        :refid="parentId.includes('&ref=') ? parentId.split('&ref=')[1] : parentId"
        :key="parentId"
      />
    </div>
    <div
      v-else-if="!currentLevelIndicator && currentLevel < editorialLevel"
      id="article"
      class="dots-ui row bottom-toc"
    >
      <TOC
        :is-doc-project-id-included="isDocProjectIdInc"
        :toc="asideTOC"
        :maxcitedepth="maxcitedepth"
        :refid="parentId.includes('&ref=') ? parentId.split('&ref=')[1] : parentId"
        :key="parentId"
      />
    </div>
    <!-- Or the specific case of Collections when editorial level & current level are 0 -->
    <!-- For example : to be able to have a TOC on Collection ENCPOS, edited at the full position level (0) -->
    <div
      v-else-if="!currentLevelIndicator && currentLevel === editorialLevel && editorialLevel === 0 && documentType === 'Collection'"
      id="article"
      class="dots-ui row bottom-toc"
    >
      <TOC
        :is-doc-project-id-included="isDocProjectIdInc"
        :toc="asideTOC"
        :maxcitedepth="maxcitedepth"
        :refid="parentId.includes('&ref=') ? parentId.split('&ref=')[1] : parentId"
        :key="parentId"
      />
    </div>
  </div>
</template>

<script>
import {computed, defineAsyncComponent, onBeforeUnmount, ref, watch} from 'vue'
import { loadDocumentBaseCss, removeDocumentBaseCss } from '@/composables/useDocumentBaseCss'
import { getCoverDataFromApi, getDocumentFromApi } from '@/api/document'
import { useRoute } from 'vue-router'
import TOC from '@/components/TOC.vue'
import { useStore } from 'vuex'

export default {
  name: 'DocumentSource',
  components: {
    TOC
  },

  props: ['id', 'level', 'editoriallevel', 'bottomtoc', 'maxcitedepth', 'documenttype', 'editorialLevelIndicator', 'isDocProjectIdIncluded', 'mediaTypeEndpoint', 'renderer', 'projectIdentifier', 'iiifManifest'],
  emits: ['has-notes'],

  async setup (props, { emit }) {
    // Declare route to capture route hash (used in scrollTo()) to display selected Table Of Content items below the editorial level
    const store = useStore()
    const route = useRoute()
    const isDocProjectIdInc = ref(props.isDocProjectIdIncluded)
    const mediaType = ref(props.mediaTypeEndpoint)
    // renderer settings of the collection config: DoTS renderer name, stylesheets,
    // container of the document in the HTML output, facsimile links
    const renderer = ref(props.renderer ?? {})

    // Base document stylesheets of the DoTS renderer, confined to .document-views.
    // Not awaited: an await here would break every watch and hook that follows
    // in this async setup (vue/no-watch-after-await).
    loadDocumentBaseCss(renderer.value)

    watch(renderer, (value) => {
      loadDocumentBaseCss(value)
    })

    onBeforeUnmount(removeDocumentBaseCss)
    const manifest = ref(props.iiifManifest)
    // The parentId will the id used for the DoTS API, it is either the resourceId or the resourceId + '&ref=' + refId
    // TODO: rename to a more appropriate name : it is the id used for Dots API : dotsID ?
    const parentId = ref(props.id)

    // Content fetched here will depend on the selected TOC item vs editorial level
    const currentLevelIndicator = ref(props.editorialLevelIndicator)

    const currentLevel = ref(props.level)

    const editorialLevel = ref(props.editoriallevel)

    // Content fetched here will vary whether the selected item is a resource or a collection
    const documentType = ref(props.documenttype)

    // For items hierarchically above the editorial level, display the item TOC
    const asideTOC = ref(props.bottomtoc)
    // Required for the TOC component

    // Declare the async component (displayed content)
    // let customDocument = loadDoc()

    // Build the async component
    const customDocument = defineAsyncComponent(async () => {
      // fetch the initial template, depending on the selected level compared to the editorial level
      let data = ''
      if (currentLevelIndicator.value) {
        if (currentLevelIndicator.value === 'renderToc' && documentType.value === 'Resource') {
          if (currentLevel.value === 0) {
            data = await getCoverDataFromApi(parentId.value)
          } else {
            data = await getDocumentFromApi(parentId.value, true, mediaType.value, renderer.value.name)
          }
        } else if (currentLevelIndicator.value === 'toEdit' && documentType.value === 'Resource') {
          data = await getDocumentFromApi(parentId.value, false, mediaType.value, renderer.value.name)
        } else {
          return
        }
      } else if (currentLevel.value < editorialLevel.value && documentType.value === 'Resource') {
        // Selected level is a resource but hierarchically an ancestor of the editorial level : use the excludeFragment DoTS API response
        data = await getDocumentFromApi(parentId.value, true, mediaType.value, renderer.value.name)
        // Selected level is a resource at the editorial level : use the full DoTS API response (and not excludeFragment)
      } else if (editorialLevel.value === currentLevel.value && documentType.value === 'Resource') {
        data = await getDocumentFromApi(parentId.value, false, mediaType.value, renderer.value.name)
        // Otherwise the selected level is a collection (no DoTS API /document response) : do not fetch
      } else {
        return
      }

      // Build a temporary dom just to ease the navigation inside the document
      // It belongs to an inert document, so that its images are not fetched: facsimile
      // thumbnails replaced below point to full-size IIIF images (TEI-Boilerplate)
      const tmpDom = document.implementation.createHTMLDocument('').createElement('div')
      let datatei = ''
      tmpDom.innerHTML = data
      // The output is compiled as a template: no script or inline event handler
      // written by a renderer (e.g. TEI-Boilerplate's onclick="showFacs(...)")
      removeScripts(tmpDom)
      // Customize the template with some vue components and code

      // Generate PageBreak components for each iiif canvas link encoded in the DoTS response

      if (mediaType.value === 'html' && manifest.value && Array.isArray(renderer.value.facsimiles)) {
        // Facsimile links of the renderer output, declared in renderer.facsimiles:
        // selector targets the link, image says where its IIIF image URL is.
        // When declared, they replace the default handling below.
        for (const { selector, image = {} } of renderer.value.facsimiles) {
          const facsimiles = Array.from(tmpDom.querySelectorAll(selector))
          for (let i = 0; i < facsimiles.length; i++) {
            const previous = facsimiles[i - 1]
            const current = facsimiles[i]
            // We only add one thumbnail (page-break component) for each line group (lg), and we select the first one. To achieve this:
            // 1. check if there is a previous facsimile (if not, this is the first one) -> creating page-break component
            // 2. check if there is a previous sibling (if not, this is the first facsimile of the current lb) -> creating page-break component
            // 3. if there is a previous sibling, check that it is not a page-break (if not, this is the first facsimile of the current lb) -> creating page-break component
            if (!previous || !current.previousElementSibling || (current.previousElementSibling && current.previousElementSibling.tagName !== 'PAGE-BREAK')) {
              const source = image.selector ? current.querySelector(image.selector) : current
              const imageUrl = source?.getAttribute(image.attribute ?? 'href')
              const frameNum = manifest.value.items.findIndex(cvs => cvs.items[0].items[0].body.id === imageUrl)
              // An image missing from the manifest leaves the facsimile as it is
              if (frameNum === -1) {
                console.warn(`Document: facsimile image not in the manifest: ${imageUrl}`)
                continue
              }
              const container = document.createElement('div')
              container.innerHTML = `<page-break canvas-id="${manifest.value.items[frameNum].id}" canvas-num="${frameNum}" image="${imageUrl}"/>`
              // Replace the link with a PageBreak component
              current.parentNode.replaceChild(container.firstChild, current)
            } else if (current.previousElementSibling && current.previousElementSibling.tagName === 'PAGE-BREAK') {
              current.parentNode.removeChild(current)
            }
          }
        }
      } else if (mediaType.value === 'html' && manifest.value) {
        // Default handling, without renderer.facsimiles: hteiml page links and line group figures
        const allPageBeginning = Array.from(tmpDom.querySelectorAll('a.pb[href*="iiif"]'))
        for (let i = 0; i < allPageBeginning.length; i++) {
          const previous = allPageBeginning[i - 1]
          const current = allPageBeginning[i]
          // We only add one thumbnail (page-break component) for each line group (lg), and we select the first one. To achieve this:
          // 1. check if there is a previous pb (if not, this is the first one) -> creating page-break component
          // 2. check if there is a previous sibling (if not, this is the first pb of the current lb) -> creating page-break component
          // 3. if there is a previous sibling, check that it is not a page-break (if not, this is the first pb of the current lb) -> creating page-break component
          if (!previous || !current.previousElementSibling || (current.previousElementSibling && current.previousElementSibling.tagName !== 'PAGE-BREAK')) {
            const container = document.createElement('div')
            const canvasId = manifest.value.items.filter(cvs => cvs.items[0].items[0].body.id === current.href)[0].id
            const frameNum = manifest.value.items.findIndex(cvs => cvs.items[0].items[0].body.id === current.href)
            container.innerHTML = `<page-break canvas-id="${canvasId}" canvas-num="${frameNum}" image="${current.href}"/>`
            // Replace the link with a PageBreak component
            current.parentNode.replaceChild(container.firstChild, current)
          } else if (current.previousElementSibling && current.previousElementSibling.tagName === 'PAGE-BREAK') {
            current.parentNode.removeChild(current)
          }
        }
        const allFigures = Array.from(tmpDom.querySelectorAll('.lg figure'))
        for (let i = 0; i < allFigures.length; i++) {
          const previous = allFigures[i - 1]
          const current = allFigures[i]
          // We only add one thumbnail (page-break component) for each line group (lg), and we select the first one. To achieve this:
          // 1. check if there is a previous figure (if not, this is the first one) -> selecting the first img only and creating page-break component
          // 2. check if there is a previous sibling (if not, this is the first figure of the current lb) -> selecting the first img only and creating page-break component
          // 3. if there is a previous sibling, check that it is not a page-break (if not, this is the first figure of the current lb) -> selecting the first img only and creating page-break component
          if (!previous || !current.previousElementSibling || (current.previousElementSibling && current.previousElementSibling.tagName !== 'PAGE-BREAK')) {
            const container = document.createElement('div')
            const canvasId = manifest.value.items.filter(cvs => cvs.items[0].items[0].body.id === current.querySelectorAll('a img')[0].src)[0].id
            const frameNum = manifest.value.items.findIndex(cvs => cvs.items[0].items[0].body.id === current.querySelectorAll('a img')[0].src)
            container.innerHTML = `<page-break canvas-id="${canvasId}" canvas-num="${frameNum}" image="${current.querySelectorAll('a img')[0].src}"/>`
            // Replace the link with a PageBreak component
            current.parentNode.replaceChild(container.firstChild, current)
          } else if (current.previousElementSibling && current.previousElementSibling.tagName === 'PAGE-BREAK') {
            current.parentNode.removeChild(current)
          }
        }
      }

      // Treat api tei as tei and transform it as xml:
      if (mediaType.value === 'tei' && currentLevelIndicator.value === 'toEdit') {
        // Parse the TEI XML string as XML, not HTML
        const xmlDoc = new DOMParser().parseFromString(data, 'application/xml')

        // Ensure no XML parsing errors
        const parserError = xmlDoc.getElementsByTagName('parsererror')
        if (parserError.length > 0) {
          console.error('Error parsing XML:', parserError[0].textContent)
          return
        }

        // Get all <pb> elements (page breaks)
        const pbElements = Array.from(xmlDoc.querySelectorAll('pb[facs]')).filter(el => el.getAttribute('facs').includes('iiif'))

        for (let i = 0; i < pbElements.length; i++) {
          const previous = pbElements[i - 1]
          const current = pbElements[i]
          // We only add one thumbnail (page-break component) for each line group (lg), and we select the first one. To achieve this:
          // 1. check if there is a previous pb (if not, this is the first one) -> creating page-break component
          // 2. check if there is a previous sibling (if not, this is the first pb of the current lb) -> creating page-break component
          // 3. if there is a previous sibling, check that it is not a page-break (if not, this is the first pb of the current lb) -> creating page-break component
          if (!previous || !current.previousElementSibling || (current.previousElementSibling && current.previousElementSibling.tagName !== 'page-break')) {
            const container = xmlDoc.createElement('div')
            const facs = current.getAttribute('facs')
            const canvasId = manifest.value ? manifest.value.items.filter(cvs => cvs.items[0].items[0].body.id === facs)[0].id : ''
            const frameNum = manifest.value ? manifest.value.items.findIndex(cvs => cvs.items[0].items[0].body.id === facs) : 1
            container.innerHTML = `<page-break canvas-id="${canvasId}" canvas-num="${frameNum}" image="${facs}"/>`
            current.parentNode.replaceChild(container.firstChild, current)
          } else if (current.previousElementSibling && current.previousElementSibling.tagName === 'page-break') {
            current.parentNode.removeChild(current)
          }
        }

        const allFigures = Array.from(xmlDoc.querySelectorAll('lg figure'))
        for (let i = 0; i < allFigures.length; i++) {
          const previous = allFigures[i - 1]
          const current = allFigures[i]
          // We only add one thumbnail (page-break component) for each line group (lg), and we select the first one. To achieve this:
          // 1. check if there is a previous figure (if not, this is the first one) -> selecting the first graphic only and creating page-break component
          // 2. check if there is a previous sibling (if not, this is the first figure of the current lb) -> selecting the first graphic only and creating page-break component
          // 3. if there is a previous sibling, check that it is not a page-break (if not, this is the first figure of the current lb) -> selecting the first graphic only and creating page-break component
          if (!previous || !current.previousElementSibling || (current.previousElementSibling && current.previousElementSibling.tagName !== 'page-break')) {
            const container = xmlDoc.createElement('div')
            const canvasId = manifest.value ? manifest.value.items.filter(cvs => cvs.items[0].items[0].body.id === current.querySelectorAll('graphic')[0].getAttribute('url')).id : ''
            const frameNum = manifest.value ? manifest.value.items.findIndex(cvs => cvs.items[0].items[0].body.id === current.querySelectorAll('graphic')[0].getAttribute('url')) : 1
            container.innerHTML = `<page-break canvas-id="${canvasId}" canvas-num="${frameNum}" image="${current.querySelectorAll('graphic')[0].getAttribute('url')}"/>`
            // Replace the link with a PageBreak component
            current.parentNode.replaceChild(container.firstChild, current)
          } else if (current.previousElementSibling && current.previousElementSibling.tagName === 'page-break') {
            current.parentNode.removeChild(current)
          }
        }

        const titleElements = Array.from(xmlDoc.getElementsByTagName('title'))
        titleElements.forEach((hd) => {
          const titleTEI = xmlDoc.createElement('tei:title')
          titleTEI.setAttribute('xmlns:tei', 'http://www.tei-c.org/ns/1.0')
          while (hd.firstChild) {
            titleTEI.appendChild(hd.firstChild)
          }

          hd.parentNode.replaceChild(titleTEI, hd)
        })
        // Select all <dts:wrapper> elements (with or without namespace)
        const wrapperElements = Array.from(xmlDoc.getElementsByTagName('dts:wrapper'))
        wrapperElements.forEach(wrapper => {
          const parent = wrapper.parentNode
          // Move all children of <dts:wrapper> into its parent before the wrapper
          while (wrapper.firstChild) {
            parent.insertBefore(wrapper.firstChild, wrapper)
          }
          // Remove the now-empty <dts:wrapper> tag
          parent.removeChild(wrapper)
        })

        // 2. Create a namespace resolver
        const nsResolver = function (prefix) {
          const ns = {
            xml: 'http://www.w3.org/XML/1998/namespace'
          }
          return ns[prefix] || null
        }

        // 3. Use XPath to select all elements with an xml:id attribute
        const xpathResult = xmlDoc.evaluate('//*[@xml:id]', xmlDoc, nsResolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null)

        // 4. Loop through matching nodes and copy xml:id to id
        for (let i = 0; i < xpathResult.snapshotLength; i++) {
          const node = xpathResult.snapshotItem(i)
          const xmlId = node.getAttributeNS('http://www.w3.org/XML/1998/namespace', 'id')
          if (xmlId) {
            node.setAttribute('id', xmlId) // for anchor navigation
          }
        }
        datatei = xmlDoc
      }
      // Remove the xslt generated left-hand side TOC (used in other ENC's apps but not here)
      if (tmpDom.querySelector('#aside') !== null) {
        tmpDom.querySelector('#aside').remove()
      }

      // Notes detection in the document
      let notesPresent = false
      if (mediaType.value === 'tei') {
        notesPresent = hasNotesInTEI(data)
      } else if (mediaType.value === 'html') {
        notesPresent = hasNotesInHTML(data)
      }

      // Emit presence of notes to parent
      emit('has-notes', notesPresent)

      // Return what will make the async component
      return new Promise((resolve) => {
        const doc = new DOMParser().parseFromString(tmpDom.innerHTML, 'text/html')
        // The cover is always hteiml
        const isCover = currentLevel.value === 0 && currentLevelIndicator.value === 'renderToc'
        // renderer.documentContainer, when declared, locates the document in the output; otherwise #center (hteiml)
        const docCenter = !isCover && renderer.value.documentContainer ? doc.querySelector(renderer.value.documentContainer) : doc.getElementById('center');
        const docCenterInnerHtml = docCenter && docCenter.innerHTML ? docCenter.innerHTML : '';

        if (mediaType.value === 'html' || (currentLevel.value === 0 && currentLevelIndicator.value === 'renderToc')) {
          resolve({
            template: docCenterInnerHtml
          })
        } else if (currentLevel.value === 0 && mediaType.value === 'tei' && currentLevelIndicator.value === 'toEdit' && documentType.value === 'Resource') {
          const TEI_NS = 'http://www.tei-c.org/ns/1.0'
          resolve({
            template: datatei.getElementsByTagNameNS(TEI_NS, 'TEI')[0].outerHTML
          })
        } else if (currentLevel.value > 0 && mediaType.value === 'tei' && currentLevelIndicator.value === 'toEdit' && documentType.value === 'Resource') {
          const fragment = datatei.getElementsByTagName('TEI')[0].outerHTML
          resolve({
            template: fragment
          })
        }
      })
    })

    function scrollTo () {
      // If the selected item is an anchor, capture and scroll to that anchor
      const hash = route.hash ? route.hash.replace('#', '') : ''
      if (hash.length > 0) {
        // bump the hash to ensure change detection
        // const bumpPath = `${import.meta.env.VITE_APP_APP_ROOT_URL}`.length <= 1 ? `${router.currentRoute.value.fullPath.split('#')[0]}#${hash}` : `${import.meta.env.VITE_APP_APP_ROOT_URL}${router.currentRoute.value.fullPath.split('#')[0]}#${hash}`
        // history.replaceState(null, '', bumpPath)

        // target element and scroll
        const el = document.getElementById(hash)
        if (el) {
          const yOffset = -90
          const y = el.getBoundingClientRect().top + window.scrollY + yOffset

          window.scrollTo({ top: y, behavior: 'instant' })
        }
      } /* removing scroll top for now 06/02/2026 else {
        // Scroll to the top of Page if no anchor and new route or to reader TOP in reading context
        if (previousRoute.path !== route.path || !previousRoute.query && route.query || previousRoute.query && !route.query.refId) {
          console.log('Document.vue no anchor scrollTo -> Page TOP')
          window.scrollTo({ top: 0, behavior: 'instant' })
          // Scroll to the top of Document if no anchor and no new route
        } else {
          console.log('Document.vue no anchor within same resource context -> scrollTo Document TOP ')
          // Find nav offset
          const nav = document.querySelector('.navigation-document')
          const navHeight = nav?.offsetHeight || 0
          // Find doc viewer actual position
          const doc = document.querySelector('.document-views')
          const docTop = doc.getBoundingClientRect().top + window.scrollY
          // Get delta and scroll to document top (regardless of its position - for example if metadata are opened above it)
          window.scrollTo({ top: docTop - navHeight, behavior: 'instant' })
        }

      }*/

      initAsideNotes()
      updateSideNotes()
      highlightSearchPatterns(highlightPatterns.value)
    }
    let asideNotesParent = null
    let asideNotes = null
    let docRoot = null
    let docContentElement = null


    const initAsideNotes = () => {
      docRoot = document.documentElement
      docContentElement =
        document.getElementById('article')

      const main = document.getElementById('article')
      if (!main) return

      asideNotesParent = main.querySelector('.aside-noteref-parent')
      asideNotes = main.querySelector('.aside-noteref-list')


      if (!asideNotesParent) {
        asideNotesParent = document.createElement('aside')
        asideNotesParent.classList.add('aside-noteref-parent')
        main.prepend(asideNotesParent)

        asideNotes = document.createElement('div')
        asideNotes.classList.add('aside-noteref-list')
        asideNotesParent.prepend(asideNotes)
      }

      asideNotesParent.addEventListener('click', e => {
        if (e.target.classList.contains('see-all-link')) {
          e.preventDefault()
          e.target.closest('.aside-noteref')?.classList.toggle('clamped')
        }
      })
    }


    const updateSideNotes = () => {
      if (!docRoot || !docContentElement || !asideNotesParent) return

      // reset
      asideNotes.querySelectorAll('.aside-noteref').forEach(e => e.remove())

      let noteParentHeight = Math.max(
        100,
        asideNotesParent.getBoundingClientRect().height
      )

      const windowHeight = window.outerHeight
      const documentInViewTop = docRoot.scrollTop
      const documentInViewBottom =
        documentInViewTop + windowHeight - noteParentHeight

      const documentContentTop = docContentElement.offsetTop
      const notesInView = []
      let minTop = 0

      document.querySelectorAll('.noteref').forEach(noteRef => {
        const noteTop = noteRef.offsetTop

        if (noteTop > documentInViewTop && noteTop < documentInViewBottom) {
          const noteId = noteRef.getAttribute('href')?.substring(1)
          const noteElement = document.querySelector('[class$="note"][id="' + noteId + '"]'); /*  */
          if (!noteElement) return

          notesInView.push({
            noteId,
            noteElement,
            top: noteTop + documentContentTop
          })
        }
      })

      notesInView.forEach(note => {
        const asideTop = Math.max(note.top, minTop)

        const asideNoteRef = document.createElement('div')
        asideNoteRef.classList.add('aside-noteref')
        asideNoteRef.style.top = asideTop + 'px'

        const wrapper = document.createElement('div')
        wrapper.classList.add('aside-noteref-wrapper')
        asideNoteRef.append(wrapper)

        const content = document.createElement('div')
        content.classList.add('aside-noteref-content')
        content.innerHTML = note.noteElement.innerHTML;
        wrapper.append(content)

        const noteback = content.querySelector('.noteback');
        if (noteback) {
          noteback.classList.remove('noteback')
          noteback.classList.add('notebottom')
          noteback.setAttribute(
            'href',
            '#' + note.noteId.split('_').join('')
          )

        } else {
          const noteLink = content.querySelector('a');
          noteLink.classList.add('notebottom')
        }

        asideNotes.append(asideNoteRef)

        if (asideNoteRef.offsetHeight > 95) {
          asideNoteRef.classList.add('clamped')

          const seeAll = document.createElement('a')
          seeAll.classList.add('see-all-link', 'fa', 'fa-angle-right')
          seeAll.href = '#'

          wrapper.append(seeAll)
        }

        minTop = asideTop + asideNoteRef.offsetHeight + 10
      })
    }

    window.addEventListener('scroll', updateSideNotes)
    window.addEventListener('resize', updateSideNotes)

    document.querySelector('.footnotes')?.addEventListener('click', e => {
      if (e.target.classList.contains('noteback')) {
        updateSideNotes()
      }
    })
    document.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('.see-all-link').forEach(link => {
        link.addEventListener('click', e => {
          e.preventDefault()
          const asideNoteref = e.target.closest('.aside-noteref')
          if (asideNoteref) {
            asideNoteref.classList.toggle('clamped')
          }
        })
      })
    })
    function hasNotesInTEI(xmlString) {
      const parser = new DOMParser()
      const xml = parser.parseFromString(xmlString, 'text/xml')
      return xml.querySelector('note') !== null || xml.querySelector('ref[type="note"]') !== null
    }

    function hasNotesInHTML(htmlString) {
      const parser = new DOMParser()
      const doc = parser.parseFromString(htmlString, 'text/html')
      return doc.querySelector('section.footnotes') !== null || doc.querySelector('a.noteref') !== null
    }

    function removeScripts(root) {
      root.querySelectorAll('script').forEach(script => script.remove())
      root.querySelectorAll('*').forEach(el => {
        Array.from(el.attributes)
          .filter(attr => attr.name.toLowerCase().startsWith('on'))
          .forEach(attr => el.removeAttribute(attr.name))
      })
    }

    const highlightPatterns = computed(() => {
      const pid = store.state.search.activeProjectId
      return store.state.search.byProject?.[pid]?.highlightPatterns || []
    })

    function escapeRegex(text) {
      return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }

    function buildRegex(pattern) {
      switch (pattern.type) {
        case 'word':
          return new RegExp(`\\b${escapeRegex(pattern.value)}\\b`, 'giu')

        case 'phrase':
          return new RegExp(escapeRegex(pattern.value), 'giu')

        case 'prefix':
          return new RegExp(`\\b${escapeRegex(pattern.value)}\\p{L}*`, 'giu')

        default:
          return null
      }
    }

    function highlightSearchPatterns(patterns) {

      if (!patterns?.length) return

      const regexes = patterns
        .map(buildRegex)
        .filter(Boolean)

      const article =
        document.getElementById('article') ||
        document.querySelector('tei')


      if (!article) return

      const walker = document.createTreeWalker(
        article,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode(node) {
            if (
              !node.parentElement ||
              ['SCRIPT', 'STYLE', 'MARK'].includes(node.parentElement.tagName)
            ) {
              return NodeFilter.FILTER_REJECT
            }

            return regexes.some(regex => regex.test(node.textContent))
              ? NodeFilter.FILTER_ACCEPT
              : NodeFilter.FILTER_REJECT
          }
        }
      )

      const nodes = []
      while (walker.nextNode()) {
        nodes.push(walker.currentNode)
      }


      nodes.forEach(node => {
        let html = node.textContent

        regexes.forEach(regex => {
          html = html.replace(regex, '<mark class="search-highlight">$&</mark>')
        })

        const span = document.createElement('span')
        span.innerHTML = html
        node.parentNode.replaceChild(span, node)
      })
    }



    watch(props, (newProps) => {
      manifest.value = newProps.iiifManifest
      mediaType.value = newProps.mediaTypeEndpoint
    }, { immediate: true })

    return {
      isDocProjectIdInc,
      parentId,
      currentLevelIndicator,
      currentLevel,
      editorialLevel,
      documentType,
      asideTOC,
      customDocument,
      scrollTo,
    }
  }
}
</script>

<style scoped>

:deep(mark.search-highlight) {
  background-color: #ffe066 !important;
  font-weight: bold !important;
}

</style>
