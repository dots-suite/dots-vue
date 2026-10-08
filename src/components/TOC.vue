<template>
  <ul class="tree" id="toc-tree">
    <template
      v-for="(item, index) in componentTOC"
      :key="index"
    >
      <li
        v-if="item.show"
        :style="`margin-left: ${ (item.level -1) * 15 }px;`"
        :class="{
          'is-current-parent': isCurrentItem(item),
          'more': item.level < maxcitedepth && item.children && item.children.length > 0,
          'sublist-first': isSubListFirst(index),
          'sublist-last': isSubListLast(index)
        }"
      >
        <div class="li container">
          <button
            v-if="item.level < maxcitedepth && item.children && item.children.length > 0"
            class="toc-toggle"
            :aria-expanded="item.expanded ? true : false"
            aria-label="Afficher les éléments enfants"
            @click="toggleExpanded(item.identifier)"
          >
            <TocArrows
              :key="item.expanded"
              :direction="item.expanded ? 'down' : 'right'"
              :size="30"
              :radius="3"
            />
          </button>
          <a
            class="toc-title"
            :title="item.url"
            :data-href="item.url"
            :class="{ 'is-current': isCurrentItem(item) }"
            @click.prevent="goTo(item)"
          >
            {{ item.dublinCore && item.dublinCore.title.length ? item.dublinCore.title : item.extensions ? item.extensions['tei:role'] ? item.extensions['tei:role'] : item.citeType && item.extensions['tei:num'] ? item.citeType + ' ' + item.extensions['tei:num'] : item.citeType : item.citeType }} {{ item.descendant > 0 ? `(${item.descendant})` : '' }}

          </a><!-- : 'pas de titre' : `Fragment n° ${index + 1}` :title="item.dublinCore && item.dublinCore.title.length ? item.dublinCore.title : item.extensions ? item.extensions['tei:role'] ? item.extensions['tei:role'] : item.citeType && item.extensions['tei:num'] ? item.citeType + ' ' + item.extensions['tei:num'] : item.citeType : item.citeType"-->
        </div>
      </li>
    </template>
  </ul>
  <nav id="toc-tree-navigation" class="is-hidden">
    <button
        id="toc-tree-navigation-previous"
        class="previous-btn"
        @click="scrollToPreviousColumn(event)"
    >
      Prev
    </button>
    <button
        id="toc-tree-navigation-next"
        class="next-btn"
        @click="scrollToNextColumn(event)"
    >Next
    </button>
  </nav>
</template>

<script>

import {nextTick, onMounted, onUnmounted, ref, watch} from 'vue'
import { useRoute } from 'vue-router'
import { router } from '@/router'
import store from '@/store'
import TocArrows from '@/assets/images/TocArrows.vue'

export default {
  name: 'TOC',

  components: {
    TocArrows
  },

  props: {
    isDocProjectIdIncluded: {
      type: Boolean,
      required: true
    },
    toc: { required: true, default: () => [], type: Array },
    maxcitedepth: { required: false, default: 0, type: Number },
    refid: { required: false, default: '' }
  },

  setup (props) {
    const isDocProjectIdInc = ref(props.isDocProjectIdIncluded)
    const currentRefId = ref(props.refid)
    const route = useRoute()
    const expandedById = ref({})
    const maxCiteDepth = ref(props.maxcitedepth)
    const componentTOC = ref(props.toc.filter(i => i.level <= maxCiteDepth.value))

    componentTOC.value.filter(i => i.parent === route.params.id).forEach((item) => {
      if (item.parent === route.params.id) {
        item.show = true
        item.expanded = false
      }
    })
    componentTOC.value.filter(i => i.ancestor_editorialLevel === route.params.id).forEach((item) => {
      if (item.ancestor_editorialLevel === route.params.id) {
        item.expanded = false
      }
    })
    if (store.state.arianeDocument && store.state.arianeDocument.length > 0) {
      store.state.arianeDocument.forEach(item => {
        componentTOC.value.filter(i => i.identifier === item).forEach((n) => {
          n.show = true
          n.expanded = true
        })
        componentTOC.value.filter(i => i.parent === item).forEach((n) => {
          n.show = true
        })
        expandedById.value[item] = expandedById.value[item] ? !expandedById.value[item] : true

        if (item.children && item.children.length > 0 && item.level < maxCiteDepth.value) {
          for (let i = 0; i < item.children.length; i += 1) {
            item.children[i].show = true
            expandedById.value[item.children[i]] = !expandedById.value[item.children[i]]
          }
        }
      })
    }

    // The tree is a flat list indented by level: a sub-list starts at a visible item deeper
    // than the previous visible one, and ends at a visible item deeper than the next one
    const visibleNeighbour = (index, step) => {
      for (let i = index + step; i >= 0 && i < componentTOC.value.length; i += step) {
        if (componentTOC.value[i].show) return componentTOC.value[i]
      }
      return null
    }
    const isSubListFirst = (index) => {
      const previous = visibleNeighbour(index, -1)
      return !!previous && previous.level < componentTOC.value[index].level
    }
    const isSubListLast = (index) => {
      const next = visibleNeighbour(index, 1)
      return !!next && next.level < componentTOC.value[index].level
    }

    const toggleExpanded = (id) => {
      function hideDescendants (ident) {
        const node = componentTOC.value.find(item => item.identifier === ident)
        node.show = false
        if (Object.keys(node).includes('expanded')) {
          node.expanded = false
        } else {
          node['expanded'] = false
        }
        if (node.children && node.children.length > 0 && node.level < maxCiteDepth.value) {
          for (let i = 0; i < node.children.length; i += 1) {
            if (expandedById.value[node.identifier]) {
              hideDescendants(node.children[i].identifier)
            }
          }
        }
        if (Object.keys(expandedById.value).includes(node.identifier)) {
          expandedById.value[node.identifier] = node.expanded
        }
      }
      expandedById.value[id] = !expandedById.value[id]
      componentTOC.value.find(n => n.identifier === id).expanded = expandedById.value[id]
      componentTOC.value.filter(n => n.parent === id).forEach((item) => {
        if (expandedById.value[id]) {
          item.show = true
        } else {
          item.show = false
          item.expanded = false
          hideDescendants(item.identifier)
        }
      })
    }

    const goTo = function (item) {
      // currentRefId.value = ref
      function hideDescendants (ident) {
        const node = componentTOC.value.find(item => item.identifier === ident)
        node.show = false
        if (Object.keys(node).includes('expanded')) {
          node.expanded = false
        } else {
          node['expanded'] = false
        }
        if (node.children && node.children.length > 0 && node.level < maxCiteDepth.value) {
          for (let i = 0; i < node.children.length; i += 1) {
            if (expandedById.value[node.identifier]) {
              hideDescendants(node.children[i].identifier)
            }
          }
        }
      }
      if (item.ancestor_editorialLevel) {
        componentTOC.value.filter(node => node.ancestor_editorialLevel && (node.ancestor_editorialLevel !== item.ancestor_editorialLevel)).forEach((n) => {
          if (expandedById.value[n.identifier]) {
            expandedById.value[n.identifier] = false
          }
          componentTOC.value.find(node => node.identifier === n.identifier).expanded = false
          componentTOC.value.find(node => node.identifier === n.identifier).show = false
          if (n.children && n.children.length > 0 && n.level < maxCiteDepth.value) {
            for (let i = 0; i < n.children.length; i += 1) {
              if (expandedById.value[n.identifier]) {
                hideDescendants(n.children[i].identifier)
              }
            }
          }
        })
        componentTOC.value.filter(node => !node.ancestor_editorialLevel && (node.identifier !== item.ancestor_editorialLevel)).forEach((n) => {
          if (expandedById.value[n.identifier]) {
            expandedById.value[n.identifier] = false
          }
          componentTOC.value.find(node => node.identifier === n.identifier).expanded = false
          if (n.children && n.children.length > 0 && n.level < maxCiteDepth.value) {
            for (let i = 0; i < n.children.length; i += 1) {
              if (expandedById.value[n.identifier]) {
                hideDescendants(n.children[i].identifier)
              }
            }
          }
        })
      } else {
        componentTOC.value.filter(node => node.ancestor_editorialLevel !== item.identifier).forEach((n) => {
          if (expandedById.value[n.identifier]) {
            expandedById.value[n.identifier] = false
            componentTOC.value.find(node => node.identifier === n.identifier).expanded = false
            if (n.children && n.children.length > 0 && n.level < maxCiteDepth.value) {
              for (let i = 0; i < n.children.length; i += 1) {
                if (expandedById.value[n.identifier]) {
                  hideDescendants(n.children[i].identifier)
                }
              }
            }
          }
        })
      }

      if (isDocProjectIdInc.value) {
        if (item.router_hash) {
          if (item.router_refid) {
            router.push({ name: 'Document', params: { collId: route.params.collId, id: item.router_params }, query: { refId: item.router_refid }, hash: item.router_hash })
          } else {
            router.push({ name: 'Document', params: { collId: route.params.collId, id: item.router_params }, hash: item.router_hash })
          }
        } else if (item.router_refid) {
          router.push({ name: 'Document', params: { collId: route.params.collId, id: item.router_params }, query: { refId: item.router_refid } })
        } else {
          router.push({ name: 'Document', params: { collId: route.params.collId, id: item.router_params } })
        }
      } else {
        if (item.router_hash) {
          if (item.router_refid) {
            router.push({ name: 'Document', params: { id: item.router_params }, query: { refId: item.router_refid }, hash: item.router_hash })
          } else {
            router.push({ name: 'Document', params: { id: item.router_params }, hash: item.router_hash })
          }
        } else if (item.router_refid) {
          router.push({ name: 'Document', params: { id: item.router_params }, query: { refId: item.router_refid } })
        } else {
          router.push({ name: 'Document', params: { id: item.router_params } })
        }
      }
    }

    const isCurrentItem =(item) => route.hash === item.hash ? 'is-current' : !route.hash && item.identifier === currentRefId.value;

    /**/

    const getColumnsDetails = function() {
      const tocTree = document.getElementById('toc-tree');
      const tocTreeScrollableColumns = Math.floor(tocTree.scrollWidth / tocTree.clientWidth)
      const tocTreeScrollableColumnWidth = tocTree.scrollWidth / tocTreeScrollableColumns
      const currentColumnFloat = tocTree.scrollLeft / tocTreeScrollableColumnWidth
      const currentColumn = Math.round(currentColumnFloat);
      return { columnsCount: tocTreeScrollableColumns, columnWidth: tocTreeScrollableColumnWidth, currentColumnFloat, currentColumn }
    }

    const scrollToPreviousColumn = function() {
      const tocDetails = getColumnsDetails();
      if (tocDetails.currentColumnFloat > 0) {
        const tocTree = document.getElementById('toc-tree');
        tocTree.scrollTo({ left: tocDetails.columnWidth * (tocDetails.currentColumn - 1), behavior: 'smooth'})
      }
    }

    const scrollToNextColumn = function() {
      const tocDetails = getColumnsDetails();
      if (tocDetails.currentColumnFloat < tocDetails.columnsCount - 1) {
        const tocTree = document.getElementById('toc-tree');
        tocTree.scrollTo({ left: tocDetails.columnWidth * (tocDetails.currentColumn + 1), behavior: 'smooth'})
      }
    }

    const initColumnScroll = function(){
      const tocTree = document.getElementById('toc-tree');
      if (tocTree) {
        const tocDetails = getColumnsDetails();
        if (tocDetails.columnsCount > 1) {
          const currrentTOCElement = tocTree.querySelector('.is-current');
          if (currrentTOCElement) {
            const currentElementLeft = currrentTOCElement.getBoundingClientRect().left;
            const treeLeft = tocTree.getBoundingClientRect().left;
            if (Math.abs(currentElementLeft - treeLeft) > 100) {
              const scrollLeft = tocDetails.columnWidth * Math.floor((currentElementLeft - treeLeft) / tocDetails.columnWidth);
              tocTree.scrollTo({ left: scrollLeft, behavior: 'instant'})
            }
          }
        }
      }
    }

    const updateColumnNavigation = function(){
      const tocTree = document.getElementById('toc-tree');
      const tocTreeNavigation = document.getElementById('toc-tree-navigation');
      if (tocTree.clientWidth) {
        const tocTreeScrollableColumns = Math.floor(tocTree.scrollWidth / tocTree.clientWidth)
        if (tocTreeScrollableColumns > 1) {
          tocTreeNavigation.classList.remove('is-hidden')
        } else {
          tocTreeNavigation.classList.add('is-hidden')
        }

        // const tocTreeScrollableColumnWidth = (tocTree.scrollWidth - 15 * tocTreeScrollableColumns) / tocTreeScrollableColumns
        // console.log('tocTree nbColomns', tocTreeScrollableColumns, tocTree.scrollWidth, tocTree.clientWidth, tocTree.scrollLeft, tocTreeScrollableColumnWidth);
      }
      updateColumnNavigationButtons();
    }

    const updateColumnNavigationButtons = function(){
      const tocTreeNavigationPrevious = document.getElementById('toc-tree-navigation-previous');
      const tocTreeNavigationNext = document.getElementById('toc-tree-navigation-next');
      const tocDetails = getColumnsDetails();
      if (Math.abs(tocDetails.currentColumnFloat) < 0.1) {
        tocTreeNavigationPrevious.classList.add('is-disabled')
      } else {
        tocTreeNavigationPrevious.classList.remove('is-disabled')
      }
      if (Math.abs(tocDetails.currentColumnFloat - (tocDetails.columnsCount - 1)) < 0.1) {
        tocTreeNavigationNext.classList.add('is-disabled')
      } else {
        tocTreeNavigationNext.classList.remove('is-disabled')
      }
    }

    onMounted(() => {
      window.addEventListener('resize', updateColumnNavigation)
      const tocTree = document.getElementById('toc-tree');
      if (tocTree) {
        tocTree.addEventListener('click', updateColumnNavigation)
        tocTree.addEventListener('scroll', updateColumnNavigationButtons)
        nextTick(initColumnScroll);
        updateColumnNavigation();
      }
    })

    onUnmounted(() => {
      window.removeEventListener('resize', updateColumnNavigation)
      const tocTree = document.getElementById('toc-tree');
      if (tocTree) {
        tocTree.removeEventListener('click', updateColumnNavigation)
        tocTree.removeEventListener('scroll', updateColumnNavigationButtons)
      }
    })

    watch(expandedById, () => {
      function hideDescendants (id) {
        const node = componentTOC.value.filter(item => item.identifier === id)
        node.show = false
        node.expanded = false
        if (node.children && node.children.length > 0) {
          for (let i = 0; i < node.children.length; i += 1) {
            if (expandedById.value[node.identifier]) {
              hideDescendants(node.children[i].identifier)
            }
          }
        }
      }
      Object.keys(expandedById.value).forEach((item) => {
        componentTOC.value.filter(n => n.parent === item).forEach((child) => {
          if (expandedById.value[item]) {
            child.show = true
          } else {
            hideDescendants(item)
          }
        })
      })
    })

    return {
      goTo,
      isCurrentItem,
      isSubListFirst,
      isSubListLast,
      toggleExpanded,
      componentTOC,
      scrollToPreviousColumn,
      scrollToNextColumn
    }
  }
}
</script>

<style scoped>
/* Top TOC: columns */
div.toc-area-content.toc-content .tree {
  columns: 3;
  gap: 20px;
  min-height: 100px;
}

div.toc-area-content.toc-content .tree li {
  break-inside: avoid;
}

@media screen and (max-width: 1024px) {
  div.toc-area-content.toc-content .tree {
    columns: 2;
  }
}

@media screen and (max-width: 640px) {
  div.toc-area-content.toc-content .tree {
    columns: 1;
    gap: 15px;
    overflow-x: auto;
    overflow-y: hidden;
    overflow-y: -webkit-paged-x;
    scrollbar-width: thin;
    max-height: calc(100dvh - 320px); /* Horizontal scroll */
    padding: 20px 10px 20px 0;

    position: relative;
    z-index: 1;
  }
}

/* Top, left (aside) and bottom TOCs share the same geometry */
:is(div.toc-area-content.toc-content, div.toc-area-aside.toc-content, div.bottom-toc) .tree {
  --toc-marker-width: 30px;
  --toc-line-height: 20px;
  --toc-row-padding: 4px;
  --toc-sublist-gap: 6px;
  --toc-bullet-color: #b0b0b0;

  width: 100%;
  font-size: var(--font-toc-metadata-size);
  font-weight: 400;
  line-height: var(--toc-line-height);
}

:is(div.toc-area-content.toc-content, div.toc-area-aside.toc-content, div.bottom-toc) .tree li {
  padding: 0;
  margin-top: 0;
  margin-bottom: 0;
  border: none;
  font-size: var(--font-toc-metadata-size);
  font-weight: 400;
  line-height: var(--toc-line-height);
}

:is(div.toc-area-content.toc-content, div.toc-area-aside.toc-content, div.bottom-toc) .tree li::before {
  content: none;
}

:is(div.toc-area-content.toc-content, div.toc-area-aside.toc-content, div.bottom-toc) .tree li.sublist-last {
  margin-bottom: var(--toc-sublist-gap);
}

:is(div.toc-area-content.toc-content, div.toc-area-aside.toc-content, div.bottom-toc) .tree li > .li.container {
  display: flex;
  align-items: flex-start;
  margin: 0;
}

/* Carets and bullets share a marker column one row high: same text start, same row height */
:is(div.toc-area-content.toc-content, div.toc-area-aside.toc-content, div.bottom-toc) .tree li > .li.container > button.toc-toggle,
:is(div.toc-area-content.toc-content, div.toc-area-aside.toc-content, div.bottom-toc) .tree li:not(.more) > .li.container::before {
  flex: 0 0 var(--toc-marker-width);
  width: var(--toc-marker-width);
  height: calc(var(--toc-line-height) + 2 * var(--toc-row-padding));
}

:is(div.toc-area-content.toc-content, div.toc-area-aside.toc-content, div.bottom-toc) .tree li > .li.container > button.toc-toggle {
  justify-content: center;
  overflow: visible;
}

:is(div.toc-area-content.toc-content, div.toc-area-aside.toc-content, div.bottom-toc) .tree li:not(.more) > .li.container::before {
  content: '';
  background: radial-gradient(circle, var(--toc-bullet-color) 2px, transparent 2.5px) center / 100% 100% no-repeat;
}

:is(div.toc-area-content.toc-content, div.toc-area-aside.toc-content, div.bottom-toc) .tree li > .li.container > a.toc-title {
  display: block;
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  padding: var(--toc-row-padding) 0;
  line-height: var(--toc-line-height);
  border: none;
}

/* The top TOC sits on a darker background (#e4e4e4) */
div.toc-area-content.toc-content .tree {
  --toc-bullet-color: #8f8f8f;
}

:is(div.toc-area-content.toc-content, div.toc-area-aside.toc-content) .tree li > .li.container > a.toc-title {
  color: #4a4a4a;
}

:is(div.toc-area-content.toc-content, div.toc-area-aside.toc-content) .tree li:not(.more) > .li.container > a.toc-title {
  padding-left: 8px;
  padding-right: 8px;
  margin-left: -8px;
}

:is(div.toc-area-content.toc-content, div.toc-area-aside.toc-content) .tree li:not(.more) > .li.container > a.toc-title:hover,
:is(div.toc-area-content.toc-content, div.toc-area-aside.toc-content) .tree li:not(.more) > .li.container > a.toc-title.is-current {
  background-color: #F9F9F9;
}

/* The current item replaces its bullet with a 2px bar drawn at the bullet position */
:is(div.toc-area-content.toc-content, div.toc-area-aside.toc-content) .tree li.is-current-parent:not(.more) > .li.container::before {
  background: none;
}

:is(div.toc-area-content.toc-content, div.toc-area-aside.toc-content) .tree li:not(.more) > .li.container > a.toc-title.is-current {
  margin-left: calc(var(--toc-marker-width) / -2 - 1px);
  padding-left: calc(var(--toc-marker-width) / 2 + 1px);
  background-color: #F9F9F9 !important;
  box-shadow: inset 2px 0 0 var(--fill-color);
}

:is(div.toc-area-content.toc-content, div.toc-area-aside.toc-content) .tree li.more:not(.is-current-parent) > .li.container > a.toc-title:hover {
  color: var(--fill-color) !important;
}

:is(div.toc-area-content.toc-content, div.toc-area-aside.toc-content) .tree li.more.is-current-parent > .li.container > a.toc-title.is-current {
  font-weight: 500;
  color: var(--fill-color) !important;
}

:is(div.toc-area-content.toc-content, div.toc-area-aside.toc-content) .tree li.more.is-current-parent > .li.container > a.toc-title.is-current:hover {
  text-decoration: underline;
}

div.toc-area-content.toc-content .tree li:not(.more) > .li.container > a.toc-title:not(.is-current):hover {
  color: var(--fill-color) !important;
}

div.bottom-toc .tree li > .li.container > a.toc-title {
  color: var(--document-text-color);
}

div.bottom-toc .tree li > .li.container > a.toc-title:hover {
  text-decoration: var(--text-decoration-hover);
}

@media screen and (max-width: 768px) {
  :is(div.toc-area-content.toc-content, div.toc-area-aside.toc-content, div.bottom-toc) .tree {
    --toc-marker-width: 25px;
  }
}

#toc-tree-navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  padding-bottom: 10px;

  &.is-hidden {
    display: none;
  }

  button {
    width: 30px;
    height: 25px;
    border: none;
    background-color: transparent;
    background-position: center;
    background-size: 25px auto;
    background-repeat: no-repeat;
    text-indent: -9999px;
    cursor: pointer;

    &.previous-btn {
      background-image: url(@/assets/images/page_suivant.svg);
      transform: scaleX(-1);
    }

    &.next-btn {
      background-image: url(@/assets/images/page_suivant.svg);
    }
  }

  button.is-disabled {
    pointer-events: none;
    opacity: 0.5;
  }
}



button.toc-toggle {
  --icon-bg: transparent;

  /* remove default button behavior */
  appearance: none;
  -webkit-appearance: none;

  background: transparent;
  border: none;

  flex-shrink: 0;

  display: inline-flex;
  align-items: center;
  width: 30px;
  /*height: 28px;*/
  padding: 0;
  margin: 0;

  cursor: pointer;
}

@media screen and (max-width: 768px) {
  button.toc-toggle {
    width: 25px;
    /*height: 22px;*/
  }
}

:deep(button.toc-toggle svg) {
  color: var(--fill-color);
}

:deep(button.toc-toggle .icon-wrapper) {
  flex: none;
  width: 30px;
  height: 30px;
}

</style>
