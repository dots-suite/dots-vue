<template>
  <div
    class="is-flex is-flex-direction-column"
    :class="viewModeCssClass"
  >
    <div class="navigation-row-top-container" id="navigation-row-top-container">
      <div class="navigation-row-top app-width-margin">
        <div class="ariane-collection-top">
          <div
            class="fade-left"
            :class="{ visible: colFadeLeftVisible }"
          >
            <IconCircleArrow
              class="icon-circle-arrow-left"
              :size="20"
              fg-color="var(--fill-color)"
              direction="left"
              @click.prevent="breadcrumbToLeft"
            />
          </div>
          <ul
            v-if="arianeCollection.length > 0"
            class="breadcrumb-top"
            :class="collCrumbsWithEllipsis ? 'with-ellipsis' : ''"
            ref="breadcrumbEl"
            @scroll="onColBreadcrumbScroll($event)"
          >
            <!--<li class="first">
              <router-link
                v-if="isDocProjectIdIncluded"
                :to="{ name: 'Home', params: { collId: arianeCollection[0][0].identifier } }"
              >
                <i class="fa fa-home"></i>
              </router-link>
            </li>-->
            <li
              v-for="(item, index) in (arianeCollection.length === 1 ? arianeCollection : isDocProjectIdInc ? arianeCollection.slice(1): arianeCollection)"
              :key="index"
              :class="{ active: index === activeBreadcrumb }"
            >
              <ArianeArrowSeparatorIcon v-if="index > 0" class="separator" />
              <template
                v-if="item.length > 1 && selectStoreCollection(item)?.identifier"
              >
                <a
                  :class="selectedCollectionId === selectStoreCollection(item).identifier ? 'active' : ''"
                  href="#"
                  @click.prevent="openObject(selectStoreCollection(item), index, $event)"
                >
                  <CollectionIcon
                    v-if="selectStoreCollection(item).citeType === 'Collection'"
                    class="breadcrumb-top-icon"
                    :size="30"
                    :radius="0"
                  />
                  <ResourceIcon
                    v-else
                    class="breadcrumb-top-icon"
                  />
                  <span class="breadcrumb-label">
                    {{ ancestorLabel(selectStoreCollection(item)) }}
                  </span>
                </a>
              </template>
              <template
                v-else
              >
                <a
                  :class="selectedCollectionId === item[0].identifier ? 'active' : ''"
                  href="#"
                  @click.prevent="openObject(item[0], index, $event)"
                >
                  <collection-icon
                    v-if="item[0].citeType === 'Collection'"
                    class="breadcrumb-top-icon"
                    :size="30"
                    :radius="0"
                  />
                  <ResourceIcon
                    v-else
                    class="breadcrumb-top-icon"
                  />
                  <span class="breadcrumb-label">
                    {{ ancestorLabel(item[0]) }}
                  </span>
                </a>
              </template>
            </li>
          </ul>
          <div
            class="fade-right"
            :class="{ visible: colFadeRightVisible }"
          >
            <IconCircleArrow
              class="icon-circle-arrow-right"
              :size="20"
              fg-color="var(--fill-color)"
              direction="right"
              @click.prevent="breadcrumbToRight"
            />
          </div>
          <div
            v-if="activeObject"
            class="breadcrumb-panel is-opened"
          >
            <div class="tab-header">
              <button
                v-if="topTOC.length > 1 && topTOCDisplayIndicator"
                class="dots-button"
                :class="{ active: activePanel === 'summary' }"
                @click="activePanel = 'summary'"
              >
                Sommaire
              </button>
              <button
                class="dots-button"
                :class="{ active: activePanel === 'meta' }"
                @click="activePanel = 'meta'"
              >
                Notice
              </button>

              <CloseCross
                class="dots-button breadcrumb-top-toggle-btn"
                :size="40"
                @click.prevent="openObject(activeObject, activeBreadcrumb, $event)"
              />
            </div>

            <div class="tab-content">
              <div
                v-if="activePanel === 'meta'"
              >
                <div v-if="selectedCollectionId.length > 0">
                  <document-metadata
                    :collection-config="collConfig"
                    :metadata-prop="selectedCollection"
                    class="metadata-area"
                  />
                </div>
              </div>
              <div
                v-if="activePanel === 'summary'"
              >
                <div
                  v-if="selectedCollection.type === 'Collection' || selectedCollection.citeType === 'Collection'"
                  class="collection-toc-area"
                  :class="tocCssClass"
                >
                  <div class="menu">
                    <CollectionTOC
                      :is-doc-project-id-included="isDocProjectIdInc"
                      :display-option="'toc'"
                      :dts-root-collection-identifier="dtsRootCollectionId"
                      :root-collection-identifier="rootCollectionId"
                      :application-config="appConfig"
                      :collection-config="collConfig"
                      :current-collection="selectedCollection"
                      :toc="selectedCollection.children"
                    />
                  </div>
                </div>
                <div
                  v-else
                  class="toc-area app-width-margin is-opened"
                >
                  <div class="toc-area-content toc-content">
                    <aside>
                      <nav>
                        <nav>
                          <TOC
                            v-if="flatTOC.length > 0"
                            :key="arianeDocument"
                            :is-doc-project-id-included="isDocProjectIdInc"
                            :toc="flatTOC.filter(n => n.level > 0)"
                            :maxcitedepth="TOC_DEPTH"
                            :refid="refId"
                          />
                        </nav>
                      </nav>
                    </aside>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <nav
      class="navigation-row app-width-padding"
      aria-label="Navigation du document"
    >
      <div class="navigation-document">
        <div class="ariane">
          <div
            class="ariane-wrapper"
            :class="{ 'no-prev-next' : previousRefId === '' && nextRefId === '' }"
          >
            <!-- LeftTOC button -->
            <button
              type="button"
              class="dots-button toc-menu-toggle"
              aria-label="Afficher le sommaire"
              :class="hasValidTOC ? TOCMenuBtnCssClass : 'disabled'"
              @click="toggleTOCMenu"
            >
              <TocIcon />
            </button>
            <!-- Document breadcrumb -->
            <div
              class="ariane-scroll-wrapper"
            >
              <div
                class="doc-fade-left"
                :class="{ visible: docFadeLeftVisible }"
              />
              <ul
                v-if="!leftTOCFragmentIsDocument"
                ref="arianeDocContainer"
                class="crumbs"
                :class="crumbsWithEllipsis ? 'with-ellipsis' : ''"
                @scroll="onDocBreadcrumbScroll($event)"
              >
                <li
                  v-for="(ancestor, index) in arianeDocument.filter(item => item.editorialLevelIndicator !== 'hash')"
                  :key="index"
                  :class="refId
                    ? ancestor.identifier === refId ? 'is-current' : ''
                    : ancestor.identifier === resourceId ? 'is-current' : ''"
                >
                  <router-link :to="ancestor.router">
                    {{ ancestor.title || ancestor.dublinCore?.title || 'fragment courant sans titre' }}
                  </router-link>
                  <!--<span class="keep-previous-centered" />-->
                </li>
              </ul>
              <ul
                v-else
                ref="arianeDocContainer"
                class="crumbs"
                @scroll="onDocBreadcrumbScroll($event)"
              >
                <li
                  v-for="(ancestor, index) in arianeDocument.filter(item => item.editorialLevelIndicator !== 'hash').slice(1)"
                  :key="index"
                  :class="refId
                    ? ancestor.identifier === refId ? 'is-current' : ''
                    : ancestor.identifier === resourceId ? 'is-current' : ''"
                >
                  <router-link :to="ancestor.router">
                    {{ ancestor.title || ancestor.dublinCore?.title || 'fragment courant sans titre' }}
                  </router-link>
                  <span class="keep-previous-centered" />
                </li>
              </ul>
              <div
                class="doc-fade-right"
                :class="{ visible: docFadeRightVisible }"
              />
            </div>
          </div>
          <!-- Previous / Next navigation buttons -->
          <div
            v-if="previousRefId !== '' || nextRefId !== ''"
            class="navigation-document-top"
            aria-label="Navigation dans le document"
          >
            <router-link
              class="dots-button to-previous-fragment"
              :class="previousRefId === '' ? 'disabled' : ''"
              :to="{ name: 'Document', params: { collId: collConfig.collectionId, id: resourceId }, query: { refId: previousRefId } }"
              :aria-disabled="!previousRefId"
              :aria-label="'Vers ' + previousRefTitle"
              :tabindex="previousRefId ? 0 : -1"
            >
              <DirectionArrows
                :size="40"
                :radius="4"
                direction="left"
              />
            </router-link>
            <router-link
              class="dots-button to-next-fragment"
              :class="{ disabled: !nextRefId }"
              :to="{ name: 'Document', params: { collId: collConfig.collectionId, id: resourceId }, query: { refId: nextRefId } }"
              :aria-disabled="!nextRefId"
              :aria-label="'Vers ' + nextRefTitle"
              :tabindex="nextRefId ? 0 : -1"
            >
              <DirectionArrows
                :size="40"
                :radius="4"
                direction="right"
                aria-hidden="true"
              />
            </router-link>
          </div>
        </div>
      </div>
    </nav>
    <div
      class="controls app-width-margin"
      :class="isControlsOpened ? 'is-opened' : ''"
      role="toolbar"
      aria-label="Options d’affichage du document"
    >
      <button
        class="dots-button controls-toggle"
        aria-label="Afficher les outils de lecture"
        :aria-expanded="isControlsOpened"
        @click="toggleControls"
      >
        <IconReadingToolsToggle
          :size="40"
          :is-active="isControlsOpened"
        />
      </button>
      <ul
        class="controls-list"
        :class="isControlsOpened ? 'is-opened' : ''"
      >
        <li v-if="manifestIsAvailable" >
          <button
            type="button"
            class="dots-button text-btn"
            aria-label="Texte seul"
            @click="changeViewMode('text-mode')"
          >
            <IconLetterT
              :size="40"
              :radius="4"
              :class="{ active: getViewMode() === 'text-mode' || getViewMode() === 'text-and-images-mode'}"
            />
          </button>
        </li>

        <li v-if="manifestIsAvailable" >
          <button
            type="button"
            class="dots-button images-btn"
            aria-label="Images seules"
            @click="changeViewMode('images-mode')"
          >
            <IconImage
              :size="40"
              :radius="4"
              :class="{ active: getViewMode() === 'images-mode' || getViewMode() === 'text-and-images-mode'}"
            />
          </button>
        </li>

        <li v-if="hasNotes"
          class="notes-btn-parent"
        >
          <button
            type="button"
            class="dots-button notes-btn"
            :class="{ 'is-notes-opened': isNotesOpened }"
            :aria-pressed="isNotesOpened"
            aria-label="Afficher les notes"
            @click="toggleNotes"
          >
            <icon-notes />
          </button>
        </li>
        <li>
          <a
            v-if="refId && refId.length > 0"
            target="_blank"
            :href="`${dtsUrl}/document?resource=${resourceId}&ref=${refId}`"
            class="dots-button xml-btn"
            aria-label="Télécharger le XML"
          >
            <XMLIcon :size="40" />
          </a>

          <a
            v-else
            target="_blank"
            :href="`${dtsUrl}/document?resource=${resourceId}`"
            class="dots-button xml-btn"
            aria-label="Télécharger le XML"
          >
            <XMLIcon :size="40" />
          </a>
        </li>
      </ul>
    </div>

    <div
      class="document-area is-flex app-width-margin"
      :class="tocMenuCssClass"
    >
      <div class="toc-area-aside toc-content">
        <aside id="aside">
          <nav>
            <nav>
              <span style="display: none" v-if="arianeDocument.length && arianeDocument[0].descendant">{{ arianeDocument[0].descendant }}{{ countEditorialTypes.length > 0 ? ' item de type ' + countEditorialTypes[0] : '' }}</span>
              <TOC
                :key="arianeDocument"
                :is-doc-project-id-included="isDocProjectIdInc"
                :toc="leftTOCFragmentIsDocument && refId ? flatTOC.filter(n => n.ancestor_editorialLevel === refId) : flatTOC.filter(n => n.level > 0)"
                :maxcitedepth="TOC_DEPTH"
                :refid="refId"
              />
            </nav>
          </nav>
        </aside>
      </div>
      <div
        v-if="isLoading"
        class="document-views is-flex"
      >
        <div
          v-if="!refId || refId && refId.length === 0"
          id="text-view"
          class="text-view"
          :class="isNotesOpened ? 'notes-opened' : ''"
        >
          <document-source
            :id="resourceId"
            :key="resourceId + currentLevelIndicator"
            :is-doc-project-id-included="isDocProjectIdInc"
            :media-type-endpoint="collConfig.mediaTypeEndpoint"
            :project-identifier="docProjectId"
            :iiif-manifest="manifest"
            :level="currentLevel"
            :editorial-level-indicator="currentLevelIndicator"
            :editoriallevel="editorialLevel"
            :documenttype="documentType"
            :bottomtoc="bottomTOC"
            :maxcitedepth="TOC_DEPTH"
            @has-notes="hasNotes = $event"
          />
        </div>
        <div
          v-else
          id="text-view"
          class="text-view"
          :class="isNotesOpened ? 'notes-opened' : ''"
        >
          <document-source
            :id="resourceId + '&ref=' + refId"
            :key="refId + editorialLevel"
            :is-doc-project-id-included="isDocProjectIdInc"
            :media-type-endpoint="collConfig.mediaTypeEndpoint"
            :project-identifier="docProjectId"
            :iiif-manifest="manifest"
            :level="currentLevel"
            :editorial-level-indicator="currentLevelIndicator"
            :editoriallevel="editorialLevel"
            :documenttype="documentType"
            :bottomtoc="bottomTOC"
            :maxcitedepth="TOC_DEPTH"
            @has-notes="hasNotes = $event"
          />
        </div>
        <div
          v-if="isLoading"
          id="mirador-view"
          class="mirador-view"
          :style="miradorViewCssStyle"
        >
          <div
            id="vue-mirador-container"
            ref="miradorContainer"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import DocumentSource from '@/components/Document.vue'
import DocumentMetadata from '@/components/DocumentMetadata.vue'
import TOC from '@/components/TOC.vue'
import CollectionTOC from '@/components/CollectionTOC.vue'
import DirectionArrows from '@/assets/images/DirectionArrows.vue'
import IconLetterT from '@/assets/images/IconLetterT.vue'
import IconImage from '@/assets/images/IconImage.vue'
import _ from 'lodash'

import { useStore } from 'vuex'
import useMirador from '@/composables/use-mirador'
import { getMetadataFromApi, getParentFromApi, getTOCFromApi, getAncestors } from '@/api/document'

import {
  computed,
  onMounted,
  onUnmounted,
  watch,
  provide,
  ref,
  inject, nextTick
} from 'vue'

import { useRoute } from 'vue-router'
import { router } from '@/router'
import fetchMetadata from '@/composables/get-metadata.js'
import { getSimpleObject } from '@/composables/utils.js'
import CollectionIcon from '@/assets/images/CollectionIcon.vue'
import ResourceIcon from '@/assets/images/ResourceIcon.vue'
import IconCircleArrow from '@/assets/images/IconCircleArrow.vue'
import CloseCross from '@/assets/images/CloseCross.vue'
import IconReadingToolsToggle from '@/assets/images/IconReadingToolsToggle.vue'
import XMLIcon from '@/assets/images/XMLIcon.vue'
import IconNotes from '@/assets/images/IconNotes.vue'
import TocIcon from '@/assets/images/TocIcon.vue'
import ArianeArrowSeparatorIcon from '@/assets/images/ArianeArrowSeparatorIcon.vue'

export default {
  name: 'DocumentPage',
  components: {
    ArianeArrowSeparatorIcon,
    TocIcon,
    IconNotes,
    XMLIcon,
    IconReadingToolsToggle,
    IconCircleArrow,
    ResourceIcon,
    CollectionIcon,
    CollectionTOC,
    DocumentMetadata,
    DocumentSource,
    TOC,
    DirectionArrows,
    IconLetterT,
    IconImage,
    CloseCross
  },
  props: {
    isDocProjectIdIncluded: {
      type: Boolean,
      required: true
    },
    dtsRootCollectionIdentifier: {
      type: String,
      required: true
    },
    rootCollectionIdentifier: {
      type: String,
      required: true
    },
    applicationConfig: {
      type: Object,
      required: false
    },
    collectionConfig: {
      type: Object,
      required: true
    }
  },
  async setup (props) {
    const topTOCDisplayIndicator = ref(false)
    const leftTOCDisplayIndicator = ref(false)
    const leftTOCFragmentIsDocument = ref(false)
    const collCrumbsWithEllipsis = ref(false)
    const crumbsWithEllipsis = ref(false)
    const isDocProjectIdInc = ref(props.isDocProjectIdIncluded)
    const dtsRootCollectionId = ref(props.dtsRootCollectionIdentifier)
    const rootCollectionId = ref(props.rootCollectionIdentifier)
    const docProjectId = ref('')
    const appConfig = computed(() => props.applicationConfig)
    const collConfig = computed(() => props.collectionConfig)
    const manifestIsAvailable = ref(false)
    const manifest = ref(null)
    const resourceManifest = ref(null)
    const miradorContainer = ref(null)
    const activeBreadcrumb = ref(null)
    const activeObject = ref(null)       // collection / resource
    const activePanel = ref(null)        // 'meta' | 'summary'

    const dtsUrl = computed(() => {
      const base = import.meta.env.VITE_APP_DTS_ENDPOINT_URL || ''
      return `${base.replace(/\/$/, '')}`
    })

    // Mirador view sticky behavior
    const miradorViewBoundingTop = ref(0)
    const miradorViewCssStyle = computed(() => {
      return { marginTop: miradorViewBoundingTop.value + 'px' }
    })

    const updateMiradorTopPosition = function () {
      // Cf scrollBehavior in router index.js
      window.documentScrollY = window.scrollY;

      const miradorView = document.getElementById('mirador-view')
      const textView = document.getElementById('text-view')
      if (miradorView && textView) {
        const textViewRect = textView.getBoundingClientRect();
        const maxMarginTop = Math.max(0, textViewRect.height - miradorView.getBoundingClientRect().height);
        const top = textViewRect.top
        const miradorTop = top < 78 ? -Math.floor(top) + 78 : 0
        miradorViewBoundingTop.value = Math.min(miradorTop, maxMarginTop);
      }
    }

    const metadata = ref({})
    const route = useRoute()
    const store = useStore()

    const resourceId = ref()
    const refId = ref(false)
    const hash = ref(false)
    const currentItem = ref({})
    const documentType = ref()
    const collection = ref()

    const isLoading = ref(false)
    // check if there is a TOC depth set up by the user (default 5 usually set in default conf)
    const TOC_DEPTH = ref(
      Number.isFinite(
        props.collectionConfig?.tableOfContentsSettings?.tableOfContentDepth
      )
        ? props.collectionConfig.tableOfContentsSettings.tableOfContentDepth
        : 5
    )
    const editorialTypesIsValid = ref(false)
    const countEditorialTypes = ref([])
    const currentLevelIndicator = ref(false)
    const currentLevel = ref(1)

    // check if there is an editorial level set up by the user in the collection configuration
    const editorialLevel = ref(
      Number.isFinite(
        props.collectionConfig?.tableOfContentsSettings?.editByLevel
      )
        ? props.collectionConfig.tableOfContentsSettings.editByLevel
        : 0
    )
    const flatTOC = ref([])
    const topTOC = ref([])
    const bottomTOC = ref([])

    const arianeCollection = ref([])
    const arianeDocument = ref([])
    const previousRefId = ref('')
    const previousRefTitle = ref('')
    const nextRefId = ref('')
    const nextRefTitle = ref('')

    const selectedCollectionId = ref('')
    const selectedCollection = ref({})

    // reading options bar

    const isControlsOpened = ref(false)
    const toggleControls = (e) => {
      e.stopPropagation();
      isControlsOpened.value = !isControlsOpened.value
    }

    const isNotesOpened = ref(false)
    const hasNotes = ref(false)

    // collection breadcrumb scrolls reactive
    const colBreadcrumbScrollLeft = ref(0)
    const colBreadcrumbClientWidth = ref(0)
    const colBreadcrumbScrollWidth = ref(0)

    // computed fade for collection breadcrumb
    const colFadeLeftVisible = computed(() => {
      return (
        colBreadcrumbScrollWidth.value > colBreadcrumbClientWidth.value && colBreadcrumbScrollLeft.value > 1
      )
    })

    const colFadeRightVisible = computed(() => {
      return colBreadcrumbScrollWidth.value > colBreadcrumbClientWidth.value && colBreadcrumbScrollLeft.value + colBreadcrumbClientWidth.value < colBreadcrumbScrollWidth.value - 1
    })

    const breadcrumbEl = ref(null)

    const updateMeasurements = function () {
      if (!breadcrumbEl.value) return

      const el = breadcrumbEl.value
      colBreadcrumbScrollLeft.value = el.scrollLeft
      colBreadcrumbClientWidth.value = el.clientWidth
      colBreadcrumbScrollWidth.value = el.scrollWidth
    }

    // Maintains Collection Ariane horizontal scroll on right when resizing window
    const updateHorizontalScrollAndMeasurements = function() {
      if (!breadcrumbEl.value) return
      const el = breadcrumbEl.value

      // By default, no ellipsis on crumb parts
      // If doc breadcrumb is too large, we add ellipsis css class
      collCrumbsWithEllipsis.value = false
      nextTick(function () {
        if (el.scrollWidth > el.clientWidth) {
          collCrumbsWithEllipsis.value = true
        }
      })

      // Horizontal scroll : scroll to last item
      breadcrumbScrollToLastItem('instant')
      updateMeasurements()
    }
    let isResizing = false

    const onColBreadcrumbScroll = (event) => {
      if (isResizing) return  // ignoring parasite scroll from browser
      const target = event.target
      updateMeasurements()
      colBreadcrumbScrollLeft.value = target.scrollLeft
      colBreadcrumbClientWidth.value = target.clientWidth
      colBreadcrumbScrollWidth.value = target.scrollWidth
    }

    const breadcrumbToLeft = function() {
      if (!breadcrumbEl.value) return
      const el = breadcrumbEl.value

      el.scrollTo({
        left: 0,
        behavior: 'smooth'
      })
    }

    // Scroll Collection Ariane to active or last Item :
    const breadcrumbScrollToLastItem = function(behavior = 'smooth') {
      if (!breadcrumbEl.value) return
      const el = breadcrumbEl.value

      let breadcrumbTargetChild = el.querySelector('li.active')
      if (!breadcrumbTargetChild) breadcrumbTargetChild = el.querySelector('li:last-child')
      if (breadcrumbTargetChild) {
        el.scrollTo({
          left: breadcrumbTargetChild.offsetLeft - 40,
          behavior: behavior
        })
      }
    }

    const breadcrumbToRight = function() {
      if (!breadcrumbEl.value) return
      const el = breadcrumbEl.value

      el.scrollTo({
        left: el.scrollWidth,
        behavior: 'smooth'
      })
    }

    // document breadcrumb scrolls reactive
    const arianeDocContainer = ref(null)

    const docBreadcrumbScrollLeft = ref(0)
    const docBreadcrumbClientWidth = ref(0)
    const docBreadcrumbScrollWidth = ref(0)

    // computed fade for document breadcrumb
    const docFadeLeftVisible = computed(() => {
      return (
        docBreadcrumbScrollWidth.value > docBreadcrumbClientWidth.value && docBreadcrumbScrollLeft.value > 1
      )
    })

    const docFadeRightVisible = computed(() => {
      return docBreadcrumbScrollWidth.value > docBreadcrumbClientWidth.value && docBreadcrumbScrollLeft.value + docBreadcrumbClientWidth.value < docBreadcrumbScrollWidth.value - 1
    })

    const onDocBreadcrumbScroll = (event) => {
      const target = event.target
      updateMeasurementsAriane()
      docBreadcrumbScrollLeft.value = target.scrollLeft
      docBreadcrumbClientWidth.value = target.clientWidth
      docBreadcrumbScrollWidth.value = target.scrollWidth
    }

    const arianeDocScrollToLastItem = function(behavior = 'smooth') {
      if (!arianeDocContainer.value) return
      const el = arianeDocContainer.value

      const arianeLastChild = el.querySelector('li:last-child')
      if (arianeLastChild) {
        el.scrollTo({
          left: arianeLastChild.offsetLeft - 30,
          behavior: behavior
        })
      }
    }

    // Maintains Document Ariane horizontal scroll on right when resizing window
    const updateDocBreadcrumbHorizontalScrollAndMeasurements = function() {
      if (!arianeDocContainer.value) return
      const el = arianeDocContainer.value

      // By default, no ellipsis on crumb parts
      // If doc breadcrumb is too large, we add ellipsis css class
      crumbsWithEllipsis.value = false
      nextTick(function () {
        if (el.scrollWidth > el.clientWidth) {
          crumbsWithEllipsis.value = true
        }
      })

      // Horizontal scroll : scroll to last item
      arianeDocScrollToLastItem('instant')
      updateMeasurementsAriane()
    }

    const updateMeasurementsAriane = function () {
      if (!arianeDocContainer.value) return

      const el = arianeDocContainer.value
      docBreadcrumbScrollLeft.value = el.scrollLeft
      docBreadcrumbClientWidth.value = el.clientWidth
      docBreadcrumbScrollWidth.value = el.scrollWidth
    }

    const initArianeDoc = function() {
      updateDocBreadcrumbHorizontalScrollAndMeasurements();
      updateHorizontalScrollAndMeasurements();
    }


    const miradorInstance = useMirador(miradorContainer)
    // provide an uninitialized instance of Mirador
    provide('mirador', miradorInstance)

    const layout = inject('variable-layout')

    const getCurrentItem = async (origin, route) => {
      if (route.params.id) {
        resourceId.value = route.params.id
        // let currentIdResponse = getMetadata(resourceId.value)
        // Check if route id param is a DoTS resourceId or a fragmentId in order to store current resourceId
        // get DotS route to identify type of Id (collection / resource / fragment)
        // if route param id is collection -> ?
        // if route param id is resource -> store the resourceId in Store
        // await getMetadataFromApi(route.params.id)
        store.commit('setResourceId', route.params.id)

        const response = await getMetadataFromApi(resourceId.value, null, null)
        const parentResponse = await getParentFromApi(response.identifier)

        documentType.value = 'Resource'
        currentItem.value = response
        currentItem.value.parent = parentResponse.member.length > 1 ? parentResponse.member.map(p => p['@id']) : parentResponse.member[0]['@id']
        currentItem.value.level = 0

        // Fetch editorial level document parts if any (based on citeType)
        let editorialTypes = []
        if (!!collConfig.value?.tableOfContentsSettings?.editByCiteType?.filter(Boolean).length) {
          editorialTypes = collConfig.value.tableOfContentsSettings.editByCiteType
        }
        currentItem.value.editorialLevelIndicator = editorialTypes.includes(currentItem.value.citeType) ? 'toEdit' : 'renderToc'
        store.commit('setCurrentItem', currentItem.value)
        document.title = currentItem.value.title

        docProjectId.value = isDocProjectIdInc.value ? route.params.collId + '/' : ''

        topTOCDisplayIndicator.value = collConfig.value.tableOfContentsSettings.displayTopToc !== false
        leftTOCDisplayIndicator.value = collConfig.value.tableOfContentsSettings.displayLeftToc !== false
        leftTOCFragmentIsDocument.value = collConfig.value.tableOfContentsSettings.leftTocFragmentIsDocument !== false

        currentLevelIndicator.value = currentItem.value.editorialLevelIndicator
        refId.value = Object.keys(route.query).length > 0 && Object.keys(route.query).includes('refId')
          ? refId.value = route.query.refId
          : false

        hash.value = route.hash && route.hash.length > 0
          ? hash.value = route.hash.replace('#', '')
          : false
      }
    }

    const getMetadata = async () => {
      const metadataResponse = await fetchMetadata('DocumentPage', resourceId.value, 'Resource', collConfig.value, route)
      Object.assign(metadata.value, metadataResponse)
    }

    // Setting up the Tables Of Content Top and Left
    const getTOC = async () => {

      const response = await getTOCFromApi(resourceId.value, 'Resource')
      if (!response.member) {
        response.member = []
      }
      response.member.filter(item => !item.title).forEach(m => {
        m.title = m.dublinCore && m.dublinCore.title && m.dublinCore.title.length ? m.dublinCore.title : ''
        m.title = m.title.length ? m.title : m.extensions && m.extensions['tei:role'] ? m.extensions['tei:num'] ? m.extensions['tei:role'] + ' ' + m.extensions['tei:num'] : m.extensions['tei:role'] + ' ' + m.identifier : ''
        m.title = m.title.length ? m.title : m.extensions && m.citeType && m.extensions['tei:num'] ? m.citeType + ' ' + m.extensions['tei:num'] : ''
        m.title = m.title.length ? m.title : m.citeType + ' ' + m.identifier
      })

      let processFlatTOC = []
      processFlatTOC = [store.state.currentItem, ...response.member]
      processFlatTOC.filter(item => item.level === 1).forEach(i => { i.parent = resourceId.value })

      // Fetch editorial level document parts if any (based on citeType)
      let editorialTypes = []
      if (!!collConfig.value?.tableOfContentsSettings?.editByCiteType?.filter(Boolean).length) {
        editorialTypes = collConfig.value.tableOfContentsSettings.editByCiteType
      }

      // Validate that there are actually in the data
      editorialTypesIsValid.value = processFlatTOC.some(item => editorialTypes.some(l => l === item.citeType))

      // Validate the max depth of editorialTypes items and update the depth of the TOC accordingly
      const minTocDepth = Math.max(Math.max(...processFlatTOC.filter(item => editorialTypes.includes(item.citeType)).map(i => i.level)), TOC_DEPTH.value)
      TOC_DEPTH.value = minTocDepth


      async function parentLoop (node) {
        if (node.parent && node.parent.length > 0 && collConfig.value.excludeCollectionIds && collConfig.value.excludeCollectionIds.length > 0) {
          if (Array.isArray(node.parent)) {
            node.parent = node.parent.filter(p => !collConfig.value.excludeCollectionIds.includes(p))
            if (node.parent.length === 1) {
              node.parent = node.parent[0]
            }
          } else {
            if (collConfig.value.excludeCollectionIds.includes(node.parent)) {
              node.parent = ''
            }
          }
        }
        if (node.parent && node.parent.length > 0) {
          if (Array.isArray(node.parent)) {
            // multiple parents
            for (let i = 0; i < node.parent.length; i += 1) {
              const appendParentInTOC = await getMetadataFromApi(node.parent[i], null, null)
              const parentResponse = await getParentFromApi(appendParentInTOC.identifier)
              // Compute parent level from current node
              parentResponse.level = node.level - 1
              // Append this level to the parent instance to be added in the TOC
              appendParentInTOC.level = parentResponse.level
              appendParentInTOC.editorialLevelIndicator = 'renderToc'
              // Complete the list of children of the parent
              if (collConfig.value.excludeCollectionIds && collConfig.value.excludeCollectionIds.length > 0) {
                appendParentInTOC.member = appendParentInTOC.member.filter(m => !collConfig.value.excludeCollectionIds.includes(m['@id'] || m.identifier))
                appendParentInTOC.totalChildren = appendParentInTOC.member.filter(m => !collConfig.value.excludeCollectionIds.includes(m['@id'] || m.identifier)).length
              }

              appendParentInTOC.member = appendParentInTOC.member.map(obj => {
                const updatedMember = {
                  identifier: obj.identifier ? obj.identifier : obj['@id'],
                  ...obj
                }
                return updatedMember
              })
              appendParentInTOC.children = []

              appendParentInTOC.children = appendParentInTOC.member.filter(item => item.identifier !== node.identifier).map((obj) => {
                const updatedMember = {
                  identifier: obj.identifier ? obj.identifier : obj['@id'],
                  citeType: obj['@type'] ? obj['@type'] : obj.citeType,
                  expanded: obj.identifier === node.id ? node.expanded : undefined,
                  title: obj.title,
                  level: node.level,
                  editorialLevelIndicator: node.editorialLevelIndicator,
                  totalChildren: obj.totalChildren,
                  totalDescendants: obj.totalDescendants,
                  children: obj.children ? obj.children : [],
                  member: obj.member ? obj.member : [],
                  parent: obj.parent,
                  dublinCore: obj.dublinCore,
                  extensions: obj.extensions
                }
                return updatedMember
              })

              if (appendParentInTOC.member.filter(item => item.identifier === node.identifier).length > 0) {
                const updatedCurrentNode = appendParentInTOC.member.filter(item => item.identifier === node.identifier)[0]
                updatedCurrentNode.parent = node.parent
                updatedCurrentNode.level = node.level
                updatedCurrentNode.member = node.member ? node.member : []
                appendParentInTOC.children.push(getSimpleObject(updatedCurrentNode))
              }

              appendParentInTOC.expanded = true
              // Check if the parent has itself a parent
              if (parentResponse.member) {
                // Then add the parent id to the parent instance to be added in the TOC
                appendParentInTOC.parent = parentResponse.member[0]['@id']
              } else {
                // Otherwise add a null parent id to the parent instance to be added in the TOC
                appendParentInTOC.parent = null
              }
              // Add this parent object to the TOC
              processFlatTOC = [getSimpleObject(appendParentInTOC), ...processFlatTOC]
              // If the parent has itself a parent : loop
              if (appendParentInTOC.parent && !processFlatTOC.some(item => item.identifier === appendParentInTOC.parent)) {
                await parentLoop(appendParentInTOC)
              }
            }
          } else {
            const appendParentInTOC = await getMetadataFromApi(node.parent, null, null)

            const parentResponse = await getParentFromApi(appendParentInTOC.identifier)
            // Compute parent level from current node
            parentResponse.level = node.level - 1
            // Append this level to the parent instance to be added in the TOC
            appendParentInTOC.level = parentResponse.level
            appendParentInTOC.editorialLevelIndicator = 'renderToc'
            // Complete the list of children of the parent
            if (collConfig.value.excludeCollectionIds && collConfig.value.excludeCollectionIds.length > 0) {
              appendParentInTOC.member = appendParentInTOC.member.filter(m => !collConfig.value.excludeCollectionIds.includes(m['@id'] || m.identifier))
              appendParentInTOC.totalChildren = appendParentInTOC.member.filter(m => !collConfig.value.excludeCollectionIds.includes(m['@id'] || m.identifier)).length
            }
            appendParentInTOC.member = appendParentInTOC.member.map(obj => {
              const updatedMember = {
                identifier: obj.identifier ? obj.identifier : obj['@id'],
                ...obj
              }
              return updatedMember
            })
            appendParentInTOC.children = []

            appendParentInTOC.children = appendParentInTOC.member.filter(item => item.identifier !== node.identifier).map((obj) => {
              const updatedMember = {
                identifier: obj.identifier ? obj.identifier : obj['@id'],
                citeType: obj['@type'] ? obj['@type'] : obj.citeType,
                expanded: obj.identifier === node.id ? node.expanded : undefined,
                title: obj.title,
                level: node.level,
                editorialLevelIndicator: node.editorialLevelIndicator,
                totalChildren: obj.totalChildren,
                totalDescendants: obj.totalDescendants,
                children: obj.children ? obj.children : [],
                member: obj.member ? obj.member : [],
                parent: obj.parent,
                dublinCore: obj.dublinCore,
                extensions: obj.extensions
              }
              return updatedMember
            })

            if (appendParentInTOC.member.filter(item => item.identifier === node.identifier).length > 0) {
              const updatedCurrentNode = appendParentInTOC.member.filter(item => item.identifier === node.identifier)[0]
              updatedCurrentNode.parent = node.parent
              updatedCurrentNode.level = node.level
              updatedCurrentNode.member = node.member ? node.member : []
              appendParentInTOC.children.push(getSimpleObject(updatedCurrentNode))
            }

            appendParentInTOC.expanded = true

            // Check if the parent has itself a parent
            if (parentResponse.member) {
              // Then add the parent id to the parent instance to be added in the TOC
              appendParentInTOC.parent = parentResponse.member[0]['@id']
            } else {
              // Otherwise add a null parent id to the parent instance to be added in the TOC
              appendParentInTOC.parent = null
            }
            // Add this parent object to the TOC
            processFlatTOC = [getSimpleObject(appendParentInTOC), ...processFlatTOC]
            // If the parent has itself a parent : loop
            if (appendParentInTOC.parent && !processFlatTOC.some(item => item.identifier === appendParentInTOC.parent)) {
              await parentLoop(getSimpleObject(appendParentInTOC))
            }
          }
        }
      }

      await parentLoop(store.state.currentItem)


      // Move ultimate ancestor to first position

      const ultimateAncestor = processFlatTOC.filter(item => item.parent === null)[0]
      const ultimateAncestorIndex = processFlatTOC.findIndex(item => item.parent === null)

      processFlatTOC.splice(ultimateAncestorIndex, 1)
      processFlatTOC.unshift(ultimateAncestor)
      // identify the last fragment level for which metadata are available to create a TOC element title
      const titleMissing = (node) => {
        if (node.title) {
          return true
        } else if (node.dublinCore && node.dublinCore.title && node.dublinCore.title.length > 0) {
          return true
        } else if (node.extensions && node.extensions['tei:role']) {
          return true
        } else if (node.citeType && node.extensions && node.extensions['tei:num']) {
          return true
        } else {
          return false
        }
      }
      const maxTocDepth = processFlatTOC.filter(i => !titleMissing(i)).length === 0
        ? Math.max(...processFlatTOC.map(i => i.level))
        : Math.max(...processFlatTOC.filter(i => !titleMissing(i)).map(item => item.level)) - 1

      // check if there is an editorial level set up by the user in the collection configuration
      //editorialLevel.value = collConfig.value?.tableOfContentsSettings?.editByLevel ?? 0
      /* if (collConfig.value.length > 0 && collConfig.value[0].tableOfContentsSettings.editByLevel !== '' && collConfig.value[0].tableOfContentsSettings.editByLevel >= 0) {
        editorialLevel.value = collConfig.value[0].tableOfContentsSettings.editByLevel
      } */

      editorialLevel.value = editorialLevel.value > maxTocDepth ? maxTocDepth : editorialLevel.value

      // in any case, max the TOC depth (available or user driven) by the availability of fragment title metadata
      // TOC_DEPTH.value = TOC_DEPTH.value > maxTocDepth ? maxTocDepth : TOC_DEPTH.value

      if (refId.value) {
        currentLevel.value = processFlatTOC.filter(item => item.identifier === refId.value)[0].level
      } else {
        currentLevel.value = 0
      }

      // Initialise the children of the flatTOC fragments (descendant of the resource)
      processFlatTOC.filter(item => item.level >= 0).forEach((node) => { node.children = [] })

      function countDescendants (node, count = 0) {
        count = node.totalDescendants
        if (node.children && node.children.length > 0) {
          for (let i = 0; i < node.children.length; i += 1) {
            count += countDescendants(node.children[i])
          }
        }
        node.descendant = count
        return count
      }
      countEditorialTypes.value = collConfig.value.tableOfContentsSettings.countByCiteType

      for (let i = 0; i < processFlatTOC.length; i += 1) {
        if (processFlatTOC[i].level >= 0) {
          processFlatTOC[i].children = processFlatTOC.filter(node => node.parent === processFlatTOC[i].identifier)
          processFlatTOC[i].totalDescendants = processFlatTOC.filter(node => node.parent === processFlatTOC[i].identifier && countEditorialTypes.value.includes(node.citeType)).length
        }
      }

      processFlatTOC.filter(item => item.level >= 0).forEach(node => countDescendants(node))
      if (editorialTypesIsValid.value) {
        processFlatTOC.filter(item => editorialTypes.includes(item.citeType)).forEach((node) => {
          node.editorialLevelIndicator = 'toEdit'
          if (node.level < 0) {
            node.url = `${window.location.origin}${import.meta.env.VITE_APP_APP_ROOT_URL.length > 1 ? import.meta.env.VITE_APP_APP_ROOT_URL + '/' : import.meta.env.VITE_APP_APP_ROOT_URL}${route.path.slice(1, route.path.length)}/${node.identifier}`
            node.router = node.identifier
          } else if (node.level === 0) {
            node.url = `${window.location.origin}${import.meta.env.VITE_APP_APP_ROOT_URL.length > 1 ? import.meta.env.VITE_APP_APP_ROOT_URL + '/' : import.meta.env.VITE_APP_APP_ROOT_URL}${route.path.slice(1, route.path.length)}`
            node.router = node.identifier
          } else {
            node.url = `${window.location.origin}${import.meta.env.VITE_APP_APP_ROOT_URL.length > 1 ? import.meta.env.VITE_APP_APP_ROOT_URL + '/' : import.meta.env.VITE_APP_APP_ROOT_URL}${route.path.slice(1, route.path.length)}?refId=${node.identifier}`
            node.router = `${route.params.id}?refId=${node.identifier}`
            node.router_params = route.params.id
            node.router_refid = node.identifier
          }
        })
      } else {
        processFlatTOC.filter(item => item.level === editorialLevel.value).forEach((node) => {
          node.editorialLevelIndicator = 'toEdit'
          if (node.level < 0) {
            node.url = `${window.location.origin}${import.meta.env.VITE_APP_APP_ROOT_URL.length > 1 ? import.meta.env.VITE_APP_APP_ROOT_URL + '/' : import.meta.env.VITE_APP_APP_ROOT_URL}${route.path.slice(1, route.path.length)}/${node.identifier}`
            node.router = node.identifier
          } else if (node.level === 0) {
            node.url = `${window.location.origin}${import.meta.env.VITE_APP_APP_ROOT_URL.length > 1 ? import.meta.env.VITE_APP_APP_ROOT_URL + '/' : import.meta.env.VITE_APP_APP_ROOT_URL}${route.path.slice(1, route.path.length)}`
            node.router = node.identifier
          } else {
            node.url = `${window.location.origin}${import.meta.env.VITE_APP_APP_ROOT_URL.length > 1 ? import.meta.env.VITE_APP_APP_ROOT_URL + '/' : import.meta.env.VITE_APP_APP_ROOT_URL}${route.path.slice(1, route.path.length)}?refId=${node.identifier}`
            node.router = `${route.params.id}?refId=${node.identifier}`
            node.router_params = route.params.id
            node.router_refid = node.identifier
          }
        })
      }
      // update all descendants of the editorial level(s) to a hash type
      function flagDescendants (node, ancestor) {
        node.editorialLevelIndicator = 'hash'
        node.ancestor_editorialLevel = ancestor
        if (node.ancestor_editorialLevel !== route.params.id) {
          node.url = `${window.location.origin}${import.meta.env.VITE_APP_APP_ROOT_URL.length > 1 ? import.meta.env.VITE_APP_APP_ROOT_URL + '/' : import.meta.env.VITE_APP_APP_ROOT_URL}${route.path.slice(1, route.path.length)}?refId=${node.ancestor_editorialLevel}#${node.identifier}`
          node.router = `${route.params.id}?refId=${node.ancestor_editorialLevel}#${node.identifier}`
          node.hash = `#${node.identifier}`
          node.router_params = route.params.id
          node.router_refid = node.ancestor_editorialLevel
          node.router_hash = `#${node.identifier}`
        } else {
          node.url = `${window.location.origin}${import.meta.env.VITE_APP_APP_ROOT_URL}${route.path.slice(1, route.path.length)}#${node.identifier}`
          node.router = `${route.params.id}#${node.identifier}`
          node.hash = `#${node.identifier}`
          node.router_params = route.params.id
          node.router_hash = `#${node.identifier}`
        }
        if (node.children && node.children.length > 0) {
          for (let i = 0; i < node.children.length; i += 1) {
            flagDescendants(node.children[i], ancestor)
          }
        }
      }
      const toEditIds = processFlatTOC.filter(item => item.editorialLevelIndicator === 'toEdit').map(node => node.identifier)
      processFlatTOC.filter(item => toEditIds.includes(item.parent)).forEach(node => {
        flagDescendants(node, node.parent)
      })
      processFlatTOC.filter(item => !item?.url).forEach(node => {
        node.editorialLevelIndicator = 'renderToc'
        if (node.level < 0) {
          const routePathTest = `/${node.identifier.toLowerCase()}/`
          if (isDocProjectIdInc.value && !route.path.toLowerCase().includes(routePathTest)) {
           node.url = 'Subcollection URL is undefined ( VITE_APP_DOCUMENT_ROUTE_INCLUDE_PROJECT_ID is true )'
          } else {
           node.url = `${window.location.origin}${import.meta.env.VITE_APP_APP_ROOT_URL.length > 1 ? import.meta.env.VITE_APP_APP_ROOT_URL + '/' : import.meta.env.VITE_APP_APP_ROOT_URL}${node.identifier}`
          }
          node.router = node.identifier
          node.router_params = node.identifier
        } else if (node.level === 0) {
          node.url = `${window.location.origin}${import.meta.env.VITE_APP_APP_ROOT_URL.length > 1 ? import.meta.env.VITE_APP_APP_ROOT_URL + '/' : import.meta.env.VITE_APP_APP_ROOT_URL}${route.path.slice(1, route.path.length)}`
          node.router = node.identifier
          node.router_params = node.identifier
        } else {
          node.url = `${window.location.origin}${import.meta.env.VITE_APP_APP_ROOT_URL.length > 1 ? import.meta.env.VITE_APP_APP_ROOT_URL + '/' : import.meta.env.VITE_APP_APP_ROOT_URL}${route.path.slice(1, route.path.length)}?refId=${node.identifier}`
          node.router = `${route.params.id}?refId=${node.identifier}`
          node.router_params = route.params.id
          node.router_refid = node.identifier
        }
      })

      if (editorialTypesIsValid.value) {
        topTOC.value = processFlatTOC
      }
      flatTOC.value = processFlatTOC

      if (refId.value) {
        currentLevelIndicator.value = flatTOC.value.find(i => i.identifier === refId.value).editorialLevelIndicator
      } else {
        currentLevelIndicator.value = flatTOC.value.find(i => i.identifier === resourceId.value).editorialLevelIndicator
      }


      if (!editorialTypesIsValid.value) {
        // topTOC.value = list_to_tree(flatTOC.value, editorialLevel.value)
        topTOC.value = processFlatTOC.filter(item => item.level >= 0)
      } else {
        topTOC.value = processFlatTOC.filter(item => item.level >= 0)
      }
      if (refId.value) {
        currentLevelIndicator.value = flatTOC.value.find(i => i.identifier === refId.value).editorialLevelIndicator

        // select flatTOC elements between the current matching refId and the last element belonging to the same parent
        const followingElementInTreeLimb = flatTOC.value.findIndex(i => i.identifier === refId.value) + 1
        const allFollowingElementsInTOC = flatTOC.value.slice(followingElementInTreeLimb, flatTOC.value.length)
        const lastElementInTreeLimb = allFollowingElementsInTOC.findIndex(i => i.parent === flatTOC.value.find(i => i.identifier === refId.value).parent) === -1
          ? flatTOC.value.length
          : allFollowingElementsInTOC.findIndex(i => i.parent === flatTOC.value.find(i => i.identifier === refId.value).parent) + 1
        const currentMatchingElementIndex = flatTOC.value.findIndex(i => i.identifier === refId.value)
        // assign portion of topTOC to the bottomTOC and unlink the variables
        bottomTOC.value = JSON.parse(JSON.stringify(flatTOC.value.slice(followingElementInTreeLimb, lastElementInTreeLimb + currentMatchingElementIndex)))
      } else {
        currentLevelIndicator.value = flatTOC.value.find(i => i.identifier === resourceId.value).editorialLevelIndicator
        // assign portion of topTOC to the bottomTOC and unlink the variables
        bottomTOC.value = JSON.parse(JSON.stringify(topTOC.value.filter(i => i.level > 0)))
      }
      await setBreadcrumbs()
      console.log('DocumentPage.vue getTOC topTOC :', topTOC.value)
      console.log('DocumentPage.vue getTOC bottomTOC :', bottomTOC.value)
      store.commit('setTOC', flatTOC.value)
      isLoading.value = true
    }

    const setBreadcrumbs = async () => {
      const ancestors = await getAncestors(currentItem.value, collConfig.value.excludeCollectionIds || [])

      const currentItemId = hash.value ? hash.value : refId.value ? refId.value : resourceId.value

      function findAncestors (item, directory) {
        if (item.parent === null) return [item]
        const parent = []
        if (Array.isArray(item.parent)) {
          // Multiple parents
          for (let i = 0; i < item.parent.length; i += 1) {
            const parentId = item.parent[i]
            parent.push(directory.find(i => i.identifier === parentId))
          }/*
        parent.push(directory.find(i => i.identifier === item.parent[0])) */
        } else {
          parent.push(directory.find(i => i.identifier === item.parent))
        }

        return [
          item,
          parent,
          ...findAncestors(parent[0], directory)
        ].flat()
      }


      // Build the collections breadcrumb
      arianeCollection.value = ancestors.reverse().map((elem) => {
        return elem.filter((e) => e.citeType === 'Collection' || e.citeType === 'Resource')
      }).filter((e) => e.length > 0)
      /*if (arianeCollection.value.length <= 2) {
        activeBreadcrumb.value = 0
        console.log('arianeCollection test : ', arianeCollection.value.slice(-1), activeBreadcrumb.value)
        openObject(arianeCollection.value.slice(-1)[0][0], 0)
      }*/

      // Build the breadcrumb within the resource
      arianeDocument.value = flatTOC.value
      // Filter the TOC down to the item we care about based on currentItemId
        .filter(item => item.identifier === currentItemId)
      // Map each item to an array of its ancestors
        .map(item => findAncestors(item, flatTOC.value))
      // Flatten the array of arrays into an array of items
        .flat()
      // De-duplicate the result
        .reduce((output, item) => {
          return !output.includes(item)
            ? [...output, item]
            : output
        }, [])
      // From these ancestors, we only need non-collection items
        .filter(item => item.citeType !== 'Collection')
      // From these ancestors, we don't display the current ressource
      // .filter(item => item.identifier !== currentItemId)
      // Sorting by increasing level
        .sort((a, b) => a.level - b.level)


      if (store.state.arianeDocument && store.state.arianeDocument.length > 0) {
        store.state.arianeDocument.forEach((id) => {
          if (flatTOC.value.find(node => node.identifier === id)) {
            flatTOC.value.find(node => node.identifier === id).expanded = false
            if (flatTOC.value.filter(node => node.parent === id || node.ancestor_editorialLevel === id).length > 0) {
              flatTOC.value.filter(node => node.parent === id || node.ancestor_editorialLevel === id).forEach(n => { n.show = false })
            }
          }
        })
      }

      arianeDocument.value.forEach((item) => {
        if (flatTOC.value.find(node => node.identifier === item.identifier)) {
          flatTOC.value.find(node => node.identifier === item.identifier).expanded = true
        }
      })
      store.commit('setArianeDocument', arianeDocument.value.map(item => item.identifier))
    }

    const ancestorLabel = (ancestor) => {
      // helpers
      function formatValue(value) {
        if (value == null) return null

        if (Array.isArray(value)) {
          return value
            .map(item => {
              if (typeof item === 'string') return item
              if (typeof item === 'object') {
                return item.name ?? Object.values(item)[0]
              }
              return String(item)
            })
            .join(', ')
        }

        return String(value)
      }

      function get(obj, path) {
        return path.split('.').reduce(
          (acc, key) => acc?.[key],
          obj
        )
      }

      function getRuleValue(ancestor, path) {
        let value = get(ancestor, path)

        // Fallback spécifique pour le titre court
        if (
          value == null &&
          path === 'extensions.dots:shortTitle'
        ) {
          value = ancestor.title
        }

        return value
      }

      function isValidValue(value) {
        return value !== undefined &&
               value !== null &&
               value !== ''
      }

      function buildLabelFromRules(ancestor, rules) {
        if (!rules?.length) {
          return null
        }

        const values = rules.map(path =>
          getRuleValue(ancestor, path)
        )

        if (!values.some(isValidValue)) {
          return null
        }

        return values
          .filter(isValidValue)
          .map(formatValue)
          .join(', ')
      }

      if (ancestor.citeType !== 'Resource') {
        return ancestor.title
      }

      const label = buildLabelFromRules(
        ancestor,
        collConfig.value?.topBreadcrumbButtonLabel
      )

      if (label) {
        return label
      }

      const defaultLabel = buildLabelFromRules(
        ancestor,
        appConfig.value?.genericConf?.topBreadcrumbButtonLabel
      )


      if (defaultLabel) {
        return defaultLabel
      }

      return ancestor.title
    }

    function selectStoreCollection(levelListItems) {
      if (store.state.collectionId && levelListItems.every(coll => coll.citeType === 'Collection')) {
        return levelListItems.find(coll => coll.identifier === store.state.collectionId)
      } else {
        return levelListItems
      }
    }

    function openObject(breadcrumbItem, index, event) {

      // Case 1 : same breadcrumb then toggle off
      if (
        activeBreadcrumb.value === index &&
        selectedCollectionId.value === breadcrumbItem.identifier
      ) {
        activeBreadcrumb.value = null
        activeObject.value = null
        activePanel.value = null

        selectedCollectionId.value = ''
        selectedCollection.value = {}
        return
      }

      // Case 2 : new objet
      activeBreadcrumb.value = index
      activeObject.value = breadcrumbItem
      activePanel.value = 'meta'
      // if opening topTOC first, previous rule: activePanel.value = topTOCDisplayIndicator.value && topTOC.value.length > 1 ? 'summary' : 'meta'

      if (event && event.target) {
        // On clock, active element is positionned on left by scrolling Ariane block
        const arianeElement = event.target.closest('li');
        const arianeParent = arianeElement.closest('ul');
        if (arianeElement && arianeParent) {
          arianeParent.scrollLeft = arianeElement.offsetLeft;
        }
      }

      selectedCollectionId.value = breadcrumbItem.identifier

      const tocItem = flatTOC.value.find(
        item => item.identifier === selectedCollectionId.value
      )

      if (!tocItem) {
        selectedCollection.value = {}
        return
      }

      if (tocItem.citeType === 'Collection') {
        // Collection pure
        selectedCollection.value = tocItem

      } else {
        // Resource = merge metadata + toc
        selectedCollection.value = _.merge(
          {},
          metadata.value
        )
      }
    }

    const getNewRefId = function () {
      layout.changeViewMode('init')
      if (refId.value) {
        // filter TOC to get only editorial level items

        const refIdTOC = flatTOC.value.filter(item => { return ((item.editorialLevelIndicator === 'renderToc' && item.level > 0) || item.editorialLevelIndicator === 'toEdit') })
        const currentItem = refIdTOC.find(item => item.identifier === refId.value)
        const currentItemIndex = currentItem && (typeof currentItem !== 'undefined') ? refIdTOC.findIndex(item => item.identifier === refId.value) : -1
        if (currentItemIndex === 0) {
          // this is the first item in editorial levels
          previousRefId.value = ''
          previousRefTitle.value = 'Table des matières'
        } else if (currentItemIndex > 0) {
          // this is not the first item in editorial levels : find previous
          previousRefId.value = refIdTOC[currentItemIndex - 1].identifier
          previousRefTitle.value = refIdTOC[currentItemIndex - 1].title
            ? refIdTOC[currentItemIndex - 1].title
            : refIdTOC[currentItemIndex - 1].citeType + ' ' + refIdTOC[currentItemIndex - 1].identifier
        }
        if (currentItemIndex === refIdTOC.length - 1) {
          // this is the last item in editorial levels
          nextRefId.value = ''
          nextRefTitle.value = ''
        } else {
          // this is not the last item in editorial levels : find next
          nextRefId.value = refIdTOC[currentItemIndex + 1].identifier
          nextRefTitle.value = refIdTOC[currentItemIndex + 1].title
            ? refIdTOC[currentItemIndex + 1].title
            : refIdTOC[currentItemIndex + 1].citeType + ' ' + refIdTOC[currentItemIndex + 1].identifier
        }
      } else if ( flatTOC.value.filter(item => { return ((item.editorialLevelIndicator === 'renderToc' && item.level >= 0) || item.editorialLevelIndicator === 'toEdit')}).length > 1 ) {
        previousRefId.value = ''
        previousRefTitle.value = ''
        nextRefId.value = flatTOC.value.filter(item => { return ((item.editorialLevelIndicator === 'renderToc' && item.level >= 0) || item.editorialLevelIndicator === 'toEdit')})[1].identifier
        nextRefTitle.value = flatTOC.value.filter(item => { return ((item.editorialLevelIndicator === 'renderToc' && item.level >= 0) || item.editorialLevelIndicator === 'toEdit')})[1].title
      } else {
        previousRefId.value = ''
        previousRefTitle.value = ''
        nextRefId.value = ''
        nextRefTitle.value = ''
      }
      scrollCurrentTocItemIntoView()
    }

    const toggleNotes = () => {
      isNotesOpened.value = !isNotesOpened.value
    }

    const hasValidTOC = computed(() => {
      const hasChildren = refId.value || currentItem.value.identifier

      return (
        leftTOCFragmentIsDocument.value ? leftTOCDisplayIndicator.value &&
        flatTOC.value.some(item => item.parent === hasChildren) : leftTOCDisplayIndicator.value && flatTOC.value.filter(item => item.identifier === currentItem.value.identifier)[0]?.children?.length >= 1
      )
    })

    const getIiifManifestUrl = () => {
      const resourceIIIFManifest = metadata.value?.extensions?.['dots:resourceIIIFManifest']
      if (!resourceIIIFManifest) {
        return null
      }

      // cas tableau
      if (Array.isArray(resourceIIIFManifest)) {
        const iiifItem = resourceIIIFManifest.find(s => s?.source?.name === 'iiif')
        if (iiifItem) {
          return iiifItem.url
        }
      } else {
        return resourceIIIFManifest
      }

      // cas objet simple
      // if (resourceIIIFManifest?.source?.name === 'iiif') {
      //   return resourceIIIFManifest.url
      // }

      return null
    }

    const loadResourceManifest = async () => {
      const response = await fetch(getIiifManifestUrl(), {
        method: 'GET'
      })

      if (!response.ok) {
        throw new Error('Unable to load IIIF manifest')
      }

      resourceManifest.value = await response.json()
    }

    let _currentLoadId = 0
    const updateDisplayedManifest = async () => {
      const loadId = ++_currentLoadId

      try {
        if (!resourceManifest.value) {
          manifest.value = null
          manifestIsAvailable.value = false
          return
        }

        // CAS 1 : ressource = Collection
        if (resourceManifest.value.type === 'Collection') {

          // Sous-cas 1a : un refId est demandé
          // => charger le manifeste de l'item ciblé

          if (refId.value) {

            const currentRes = flatTOC.value.find(
              item => item.identifier === refId.value
            )


            const docManifestURL =
              currentRes?.extensions?.['dots:resourceIIIFManifest']

            if (!docManifestURL) {
              manifest.value = null
              manifestIsAvailable.value = false
              return
            }

            const response = await fetch(docManifestURL)

            if (loadId !== _currentLoadId) {
              return
            }

            if (!response.ok) {
              manifest.value = null
              manifestIsAvailable.value = false
              return
            }

            const manifestJson = await response.json()

            if (loadId !== _currentLoadId) {
              return
            }

            manifest.value = manifestJson
            manifestIsAvailable.value = true


            if (miradorInstance.miradorStore) {
              miradorInstance.loadManifest(
                manifest.value,
                manifest.value?.items?.[0]?.id
              )
            }

            return
          }

          // Sous-cas 1b : affichage de la collection
          manifestIsAvailable.value = true

          if (miradorInstance.miradorStore) {
            miradorInstance.loadCollectionManifest(
              resourceManifest.value
            )
          }

          return
        }

        // CAS 2 : ressource = manifest
        manifest.value = resourceManifest.value
        manifestIsAvailable.value = true


        if (miradorInstance.miradorStore) {
          miradorInstance.loadManifest(manifest.value, manifest.value?.items?.[0]?.id)
        }

      } catch (error) {
        if (loadId !== _currentLoadId) {
          return
        }

        console.error('mirador updateDisplayedManifest error:', error)

        manifest.value = null
        manifestIsAvailable.value = false

      }
    }

    watch(
      () => layout.getViewMode?.(),
      (newValue, oldValue) => {
        const entersImageMode =
          !oldValue?.includes?.('image') &&
          newValue?.includes?.('image')

        if (entersImageMode) {
          nextTick(() => {
            miradorInstance.resetView()
          })
        }
      }
    )

    watch(
      () => metadata.value?.extensions?.['dots:resourceIIIFManifest'],
      async (newVal) => {

        if (!newVal) {
          layout.imageIsAvailable.value = false
          manifest.value = null
          resourceManifest.value = null
          manifestIsAvailable.value = false
          return
        }

        layout.imageIsAvailable.value = true

        try {
          await loadResourceManifest()
          await updateDisplayedManifest()
        } catch (error) {
          console.error('mirador resourceIIIFManifest error', error)

          manifest.value = null
          resourceManifest.value = null
          manifestIsAvailable.value = false
        }
      }, { immediate: true }
    )

    watch(
      () => refId.value,
      async () => {

        //if (resourceManifest.value?.type === 'Collection') {
          await updateDisplayedManifest()
        //}
      }
    )

    watch(
      () => flatTOC.value.length,
      async (length) => {
        if (
          length > 0 &&
          resourceManifest.value?.type === 'Collection'
        ) {
          await updateDisplayedManifest()
        }
      }
    )

    // Initialiser Mirador dès que le container est disponible dans le DOM
      watch(miradorContainer, async (newContainer, oldContainer) => {
      if (newContainer && !oldContainer) {
        await miradorInstance.initialize()
        await updateDisplayedManifest()
      }
    })

    watch(props, async (newProps) => {

      TOC_DEPTH.value = Number.isFinite(
        newProps.collectionConfig?.tableOfContentsSettings?.tableOfContentDepth
      )
        ? newProps.collectionConfig.tableOfContentsSettings.tableOfContentDepth
        : 0

      editorialLevel.value = Number.isFinite(
        newProps.collectionConfig?.tableOfContentsSettings?.editByLevel
      )
        ? newProps.collectionConfig.tableOfContentsSettings.editByLevel
        : 0

    }, { deep: true, immediate: true })

    watch(
      router.currentRoute, async (newRoute, oldRoute) => {
        isLoading.value = false

        if (newRoute && oldRoute && newRoute.params.id !== oldRoute.params.id) {
          await getCurrentItem('watch getCurrentItem : route : ', newRoute)
          await getTOC('watch query')
          await getMetadata()
          getNewRefId()
          isLoading.value = true
          if (newRoute.hash && newRoute.hash.length > 0) {
            hash.value = newRoute.hash
            scrollTo()
          }
        } else if (newRoute && oldRoute && newRoute.params.id === oldRoute.params.id) {
          // await getCurrentItem("watch getCurrentItem : route : ", newRoute)
          // await getTOC("watch query")
          if (newRoute.query.refId === oldRoute.query.refId) {
            hash.value = newRoute.hash && newRoute.hash.length > 0 ? newRoute.hash.replace('#', '') : false

            if (newRoute.hash && newRoute.hash.length > 0) {
              scrollTo()
            } else {
              // Scroll to top if no anchor
              // window.scrollTo({ top: 0, behavior: 'instant' })
            }
            isLoading.value = true
          } else {
            hash.value = newRoute.hash && newRoute.hash.length > 0 ? newRoute.hash.replace('#', '') : false
            refId.value = newRoute.query.refId
            // await getCurrentItem('watch getCurrentItem : route : ', newRoute)
            // await getTOC("watch query")
            currentLevel.value = refId.value
              ? flatTOC.value.find(i => i.identifier === refId.value).level
              : flatTOC.value.find(i => i.identifier === resourceId.value).level
            await setBreadcrumbs()
            currentLevelIndicator.value = refId.value
              ? flatTOC.value.find(i => i.identifier === refId.value).editorialLevelIndicator
              : flatTOC.value.find(i => i.identifier === resourceId.value).editorialLevelIndicator

            if (refId.value) {
              // select flatTOC elements between the current matching refId and the last element belonging to the same parent
              const followingElementInTreeLimb = flatTOC.value.findIndex(i => i.identifier === refId.value) + 1
              const allFollowingElementsInTOC = flatTOC.value.slice(followingElementInTreeLimb, flatTOC.value.length)
              const lastElementInTreeLimb = allFollowingElementsInTOC.findIndex(i => i.parent === flatTOC.value.find(i => i.identifier === refId.value).parent) !== -1 ? allFollowingElementsInTOC.findIndex(i => i.parent === flatTOC.value.find(i => i.identifier === refId.value).parent) + 1 : allFollowingElementsInTOC.length
              const currentMatchingElementIndex = flatTOC.value.findIndex(i => i.identifier === refId.value)
              // assign portion of topTOC to the bottomTOC and unlink the variables
              bottomTOC.value = JSON.parse(JSON.stringify(flatTOC.value.slice(followingElementInTreeLimb, lastElementInTreeLimb + currentMatchingElementIndex)))
            } else {
              // assign portion of topTOC to the bottomTOC and unlink the variables
              bottomTOC.value = JSON.parse(JSON.stringify(topTOC.value.filter(i => i.level > 0)))
            }
            getNewRefId()
            isLoading.value = true
          }
        } else if (typeof oldRoute === 'undefined') {
          await getCurrentItem('watch getCurrentItem : route : ', route)
          await getTOC('watch query')
          await getMetadata()
          getNewRefId()
          isLoading.value = true
        }
      }, { deep: true, immediate: true }
    )

    watch(hasValidTOC, (val) => {
      if (!val && layout.isTOCMenuOpened.value) {
        layout.isTOCMenuOpened.value = false
      }
    })

    watch(breadcrumbEl, () => {
      updateMeasurements()
    })

    watch(arianeDocContainer, () => {
      updateMeasurementsAriane()
    })
    watch(arianeDocument, () => {
      nextTick().then(initArianeDoc)
    })

    watch(breadcrumbEl, () => {
      nextTick().then(breadcrumbScrollToLastItem)
    })

    function scrollTo() {
      // Cf router/indes.js => scrollBehavior

      // If the selected item is an anchor, capture and scroll to that anchor
      if (hash.value.length > 0) {
        // Bump the hash to ensure change detection
        const bumpPath = `${import.meta.env.VITE_APP_APP_ROOT_URL}`.length <= 1 ? `${router.currentRoute.value.fullPath.split('#')[0]}#${hash.value}` : `${import.meta.env.VITE_APP_APP_ROOT_URL}${router.currentRoute.value.fullPath.split('#')[0]}#${hash.value}`
        history.replaceState(history.state, '', bumpPath)
      }
    }

    const scrollCurrentTocItemIntoView = () => {
      nextTick(() => {
        if (!layout.isTOCMenuOpened.value) return

        const htmlTOC = document.querySelector('.toc-aside-is-opened > div.toc-area-aside.toc-content > aside > nav > nav')
        const currentLink = htmlTOC.querySelector('a.is-current')
        if (currentLink && htmlTOC) {
          const containerRect = htmlTOC.getBoundingClientRect()
          const linkRect = currentLink.getBoundingClientRect()
          htmlTOC.scrollTo({
            top:
              htmlTOC.scrollTop +
              (linkRect.top - containerRect.top) -
              htmlTOC.clientHeight / 2,
            behavior: 'smooth'
          })
        }
      })
    }

    const closeTOC = function(event) {
      if (window.innerWidth < 1024) {
        const target = event.target;
        if (target.closest('.document-views')) {
          layout.isTOCMenuOpened.value = false
        }
      }
    }

    const onResize = () => {
      // prevent resize calculations when triggered by browsers
      isResizing = true
      updateHorizontalScrollAndMeasurements()
      updateDocBreadcrumbHorizontalScrollAndMeasurements()
      requestAnimationFrame(() => { isResizing = false })
    }

    onMounted(() => {
      const appView = document.getElementById('app')
      appView.addEventListener('scroll', updateMiradorTopPosition)
      window.addEventListener('scroll', updateMiradorTopPosition)
      layout.isTOCMenuOpened.value = false
      layout.changeViewMode('init')

      window.addEventListener('resize', onResize)
      document.body.addEventListener('click', closeTOC);
    })

    onUnmounted(() => {
      const appView = document.getElementById('app')
      layout.changeViewMode('init')
      if (layout.isTOCMenuOpened.value === true) {
        layout.isTOCMenuOpened.value = false
      }
      appView.removeEventListener('scroll', updateMiradorTopPosition)
      window.removeEventListener('scroll', updateMiradorTopPosition)

      window.removeEventListener('resize', onResize)
      document.body.removeEventListener('click', closeTOC);

      window.documentScrollY = false;
    })

    return {
      dtsUrl,
      topTOCDisplayIndicator,
      leftTOCFragmentIsDocument,
      tocCssClass: layout.tocCssClass,
      tocMenuCssClass: layout.tocMenuCssClass,
      toggleTOCMenu: layout.toggleTOCMenu,
      hasValidTOC,
      TOCMenuBtnCssClass: layout.TOCMenuBtnCssClass,
      changeViewMode: layout.changeViewMode,
      getViewMode: layout.getViewMode,
      viewModeCssClass: layout.viewModeCssClass,
      miradorViewCssStyle,
      miradorContainer,
      breadcrumbEl,
      crumbsWithEllipsis,
      collCrumbsWithEllipsis,
      onColBreadcrumbScroll,
      onDocBreadcrumbScroll,
      breadcrumbToLeft,
      breadcrumbToRight,
      colFadeLeftVisible,
      colFadeRightVisible,
      docFadeLeftVisible,
      docFadeRightVisible,
      arianeDocContainer,
      activeBreadcrumb,
      activeObject,
      activePanel,
      ancestorLabel,
      metadata,
      manifestIsAvailable,
      manifest,
      resourceId,
      collection,
      isDocProjectIdInc,
      dtsRootCollectionId,
      rootCollectionId,
      appConfig,
      collConfig,
      docProjectId,
      isLoading,
      TOC_DEPTH,
      currentLevelIndicator,
      editorialLevel,
      countEditorialTypes,
      currentLevel,
      documentType,
      flatTOC,
      topTOC,
      bottomTOC,
      arianeCollection,
      arianeDocument,
      refId,
      hash,
      previousRefId,
      previousRefTitle,
      nextRefId,
      nextRefTitle,
      isControlsOpened,
      toggleControls,
      isNotesOpened,
      toggleNotes,
      hasNotes,
      selectStoreCollection,
      openObject,
      selectedCollectionId,
      selectedCollection
    }
  }
}
</script>
<style>

.metadata-area {
  /*margin-top: 15px !important;
  margin-bottom: 15px !important;*/
}
.metadata-area .columns {
  margin: 0;
}
.toc-area {
  width: 100%;
  padding: 0;
}
.toc-area-header {
  display: flex;
  width: 100%;
  padding: 20px;
  background-color: #f1f1f1;
  border-radius: 6px;
  position: relative;
}
.toc-area-header > a {
  text-transform: uppercase;
  font-family: var(--font-secondary), sans-serif;
  font-weight: 500;
  color: #4a4a4a !important;
  text-decoration: none;
  border: none;
  &:first-child {
    text-transform: none;
    margin-left: auto;
    margin-right: 47px;
  }
}
.toc-area-content {
  background-color: #e4e4e4;
  border-radius: 0 0 6px 6px;
  display: none;
}
.toc-area.is-opened .toc-area-header {
  background-color: #f1f1f1;
  border-radius: 6px 6px 0 0;
}
.toc-area.is-opened .toc-area-content {
  display: block;
}
.toc-area .toc-area-content aside {
  width: 100% !important;
  overflow-x: hidden;
  padding: 20px 10px !important;
}
.toc-area .toc-area-content nav > ol.tree {
  columns: 4;
  gap: 40px;
}
.toc-content > aside > nav > nav > ol.tree > li {
  text-transform: none;
  padding: 0;
}
.toc-content > aside > nav > nav > ol.tree > li.more > a {
  margin-bottom: 8px;
}
.toc-content > aside > nav > nav > ol.tree > li li {
  padding: 0;
  margin: 0 0 6px;
  text-transform: none;
}
.toc-content > aside > nav > nav > ol.tree > li ol {
  margin: 0;
}
.toc-content nav > ol.tree > li {
  break-inside: avoid;
}
.toc-content nav > ol.tree li::before {
  display: none;
}
.toc-content nav > .tree ol,
.tree ul {
  border: none !important;
}
.toc-content a:hover {
  background-color: transparent !important;
  border-radius: unset !important;
  color: #000;
  text-decoration: var(--text-decoration-hover) !important;
}
.toc-area-aside a,
.toc-area-content a {
  font-family: var(--font-primary), sans-serif !important;
  font-weight: 400;
  color: var(--document-text-color);
  text-align: left;
  letter-spacing: 0;
  border: none;
  box-shadow: none;
}

.toc-area-aside a,
.toc-area-content a {
  font-size: var(--font-toc-metadata-size);
  line-height: 1.4;
}

.controls {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: right;
  width: 100%;
  padding-top: 10px;
  padding-bottom: 10px;

  z-index: 100;
  pointer-events: none;
}
.controls button {
  display: flex;
  pointer-events: auto;
}

.controls-list {
  position: absolute;
  top: 64px;

  display: flex;
  flex-direction: column;
  gap: 5px;

  margin: 0;
  padding: 0;
  list-style: none;

  pointer-events: auto;

  &:not(.is-opened) {
    display: none;
  }
}

.controls button {
  /* remove default button behavior */
  appearance: none;
  -webkit-appearance: none;

  background: white;
  border: none;

  padding: 0;
  margin: 0;

  cursor: pointer;
}
.controls-list button {
  display: flex;
  align-items: center;
  justify-content: center;
}

.controls-toggle .icon-wrapper {
  color: var(--fill-color);
}
.controls-toggle[aria-expanded="true"] .icon-wrapper {
  color: #ffffff;
  background-color: var(--fill-color);
  overflow: hidden;
  /* même couleur que stroke pour que le contour disparaisse visuellement */
  border: 1px solid var(--fill-color);
}

.controls .notes-btn {
  color: #C3C3C3;
}
.controls button:focus-visible {
  outline: 2px solid #B9192F;
  outline-offset: 2px;
}

/* former pdf & xml button to adapt : where ?
.controls a.pdf-btn {
  background: url(../assets/images/b_PDF.svg) center / cover no-repeat;
}*/
.controls .xml-btn {
  display: inline-block;
  color: var(--fill-color);
}

.document-area #aside,
.toc-area #aside {
  margin: 0;
  background: none;
  border: none;
}
.document-area #aside header,
.toc-area #aside header {
  display: none;
}
.document-views {
  width: 100%;
  min-height: 70vh;
}
.toc-area-aside {
  display: none;
}
.toc-aside-is-opened #aside {
  position: relative;
  margin: 0;
  padding: 0;
}
.toc-aside-is-opened .toc-area-aside {
  position: relative;
  z-index: 2;

  display: flex;
  width: 320px;
  background-color: #FFF;

  & > aside#aside {
    width: 100%;
  }

  & > aside > nav {
    position: sticky;
    top: 80px;
    height: calc(100dvh - 81px); /* 81px = sticky header height */
    padding-bottom: 20px;
      & > nav {
        height: calc(100dvh - 100px);
        overflow-y: auto;
      }
  }
}
.toc-aside-is-opened .document-views {
  position: relative;
  z-index: 1;
  width: calc(100% - 300px - 10px);
}

.mirador-view {
  position: relative;
  height: calc(100dvh - 80px);
  min-height: 80vh;
  max-height: 100dvh;
  max-width: calc(100vw - 20px);
}

/* cf tei.css */
.document-views .text-view > * teiheader,
.document-views .text-view > * body {
  margin-top: 40px;
  margin-left: auto;
  margin-right: auto;
  width: 80%;
}

.document-views .text-view > * body {
  padding-bottom: 80px;
}

.toc-aside-is-opened {
  .document-views .text-view > * teiheader,
  .document-views .text-view > * body {
    width: 100%;
    margin-right: 0 !important;
  }
}

.images-mode .document-views,
.text-and-images-mode .document-views {
  margin-right: 50px;
}

.text-mode .text-view,
.images-mode .mirador-view {
  flex: 100% 0 0;
  width: 100%;
}
.images-mode .text-view,
.text-mode .mirador-view {
  position: absolute;
  width: 500px;
  height: 700px;
  visibility: hidden;
  max-width: calc(100vw - 20px);
}
.text-mode .mirador-view {
  flex: 100% 0 0;
}
.text-and-images-mode .text-view,
.text-and-images-mode .mirador-view {
  flex: 50% 0 0;
}

#center {
  width: 100%;
  margin: 0 !important;
}

#article {
  padding: 20px 10% 120px;
  border-bottom: 1px dotted #ffffff;
  min-height: 100%;
}
div.remove-bottom-padding {
  display: flex;
}
div.remove-bottom-padding #article {
  padding: 40px 10% 10px !important;
}

#article article {
  margin: 0;
}

#article > span.error > b {
  display: none;
}

#article {
  .titlepage,
  h1, h2, h3, h4, h5, h6 {
    padding: 0;
    margin-bottom: 30px;
    font-family: var(--font-primary), sans-serif;
    color: var(--document-text-color);
    text-transform: none;
    text-align: left;
  }
}

#article h1 {
  font-size: 32px;
  font-weight: 800;
  line-height: 1.2;
}

#article h2 {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.357;
}

#article h3 {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.727;
}

#article h4 {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.9;
}

#article h5 {
  font-size: 18px;
  font-weight: 700;
  line-height: 2.111;
}

#article .titlepage {
  font-size: 18px;
  line-height: 25px;
}

#article .titlepage hr {
  width: 100%;
  margin: 60px 0 45px;
  border: dashed #b9192f 1px;
}

#article .titlepage,
#article .titlepage .forename {
  font-variant: small-caps;
  text-transform: none;
}

#article .titlepage .surname {
  text-transform: uppercase;
}

#article .titlepage .forename,
#article .titlepage .surname {
  font-size: 20px;
  font-weight: 500;
}
#article .titlepage .name {
  margin-bottom: 30px;
}
#article .titlepage .roleName {
  font-size: 16px;
  line-height: 22px;
  text-transform: uppercase;
  font-style: italic;
  color: #777;
}

#article .byline {
  margin: 25px 0 90px;
}

#article .fileDesc > * {
  margin-bottom: 10px;
}

#article .fileDesc > .titleStmt,
#article .fileDesc p,
#article .byline {
  text-align: left;
}

#article .fileDesc p.author,
#article .byline .docAuthor {
  font-family: var(--font-serif), serif;
  font-size: var(--font-default-size);
  font-variant: unset;
  line-height: 1.6;
  color: var(--fill-color);
  text-transform: none;
}

#article section.div {
  border: none;
  padding-bottom: 0;
  padding-top: 40px;
  text-align: left;
}

#article section.div:first-child {
  padding-top: 0;
}

#article p b.label {
  text-indent: 0;
  margin-right: 3px;
}

#article {
  .availability, .editionStmt, figcaption, .footnotes, li.bibl, .marginalia, .note, #noterefover, .publicationStmt, .sourceDesc, .speaker, .stage {
    font-family: var(--font-primary), sans-serif;
    font-size: var(--font-small-size);
  }

  .sourceDesc {
    & head,
    & trailer,
    & label {
      font-family: var(--font-primary), sans-serif;
      font-weight: 500;
      font-size: var(--font-default-size);
      font-variant: none;
      line-height: 1.4;
      color: var(--document-text-color);
      text-shadow: none;
      text-transform: none;
    }
  }

  .argument {
    font-family: var(--font-primary), sans-serif;
    font-weight: 400;
    font-size: var(--font-default-size);
    font-variant: none;
    line-height: 1.4;
    color: var(--document-text-color);
  }

  .noteref sup:empty::before {
    content: "#";
    font-size: 12px;
    vertical-align: top;
  }

  .footnotes {
    margin: 90px 0 0;
    position: relative;
  }

  .footnotes > h3 {
    border-bottom: #E4E4E4 4px solid !important;
  }

  .footnotes ol {
    list-style-position: inside;

    & > li {
      position: relative;
      margin-left: 30px;

      & > a.noteback {
        top: 0;
      }
    }
  }

  /*
  .footnotes::before {
    content: "Notes";
    display: block;
    font-size: 18px;
    font-weight: 700;
    color: var(--fill-color);
  }

  .footnotes::after {
    content: "";
    position: absolute;
    top: 32px;
    left: 0;
    display: block;
    width: 100%;
    border-top: #E4E4E4 4px solid !important;
  }

   */

  .footnotes > *:first-child {
    display: block;
    margin-top: 45px !important;
  }

  .footnotes .note-page {
    margin: 10px 0 22px;
  }

  .footnotes .note-page a {
    font-weight: 700;
    font-size: 18px;
    border: none;
    text-decoration: none;
  }

  .footnotes aside.note a.noteback:hover,
  .footnotes .note-page a:hover {
    text-decoration: underline;
  }

  .footnotes aside.note {
    position: relative;
    padding: 0 0 0 40px;
    margin: 0 0 40px;
    border: none;
  }

  .footnotes aside.note:target::before {
    display: none;
  }

  .footnotes aside.note > i {
    font-style: inherit;
  }

  .footnotes aside.note a.noteback {
    position: absolute;
    left: 0;
    top: -2px;
    display: inline;
    width: auto;
    margin: 0;
    font-weight: 700;
    font-size: 18px;
    color: var(--fill-color);
    text-decoration: none;
    text-align: left;
  }
}

.toc-area-header a {
  color: inherit;
}

* [class*="mirador-window-top-bar"] {
  border-top: none !important;
}
.ariane-collection {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  max-width: var(--default-content-width);
  margin-top: 10px;
  margin-bottom: 10px;

  font-size: 16px;
  & .crumbs {
    padding-bottom: 5px;
  }
}
.ariane {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100% !important;
  max-width: var(--default-content-width) !important;

  font-family: var(--font-primary), sans-serif;
  font-weight: 400;
  font-size: 18px;
  color: #636363;

  & > ul {
    display: flex;
    justify-content: left;
    align-items: center;

    & > li:first-child {
      font-weight: bold;
    }
  }
  & > .ariane-wrapper {
    display: flex;
    flex-direction: row;
    justify-items: left;
    align-items: center;

    width: 100%;
    max-width: calc(100% - 90px - 20px);
    margin-right: 20px;

    &.no-prev-next {
      max-width: 100%;
    }

    & > button.toc-menu-toggle {
      /* remove default button behavior */
      appearance: none;
      -webkit-appearance: none;
      background-color: white;
      border: none;
      padding: 0;
      cursor: pointer;

      &:hover,
      &:active {
        background-color: white;
      }

      &:focus-visible {
        outline: 2px solid #B9192F;
        outline-offset: 2px;
      }
      /* custom style */
      margin-right: 20px;
      text-align: center;
      align-content: center;

      &.disabled {
        pointer-events: none;
        opacity: 0.2;
      }
    }
  }
}
.ariane-scroll-wrapper {
  display: flex;
  justify-content: left;
  align-items: center;
  height: 40px;
  max-width: calc(100% - 60px);
  margin-right: 20px;

  position: relative;
}

.crumbs {
  display: flex;
  width: 100%;
  height: 40px;
  flex-direction: row;
  margin-left: 0;

  overflow-x: auto;   /* scroll horizontal si nécessaire */
  overflow-y: hidden; /* pas de scroll vertical */
  scroll-behavior: smooth;
  scrollbar-width: thin;

  font-family: var(--font-secondary), sans-serif;
  font-size: var(--font-default-size);
  font-weight: 500;
  color: #000000;
}
.crumbs li + li:before {
  width: 100% !important;
  padding: 20px !important;
}

.crumbs li a:hover {
  text-decoration: var(--text-decoration-hover);
}

.crumbs {
  li {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    margin-top: 0;
    margin-bottom: 0;
    margin-right: 0;
    padding-right: 20px;
    text-wrap: nowrap;

    &:last-child:after {
      display: none;
    }

    &:not(:last-child):after {
      display: inline-block;
      content: ' > ';
      font-weight: bold;
      color: var(--fill-color);
      padding-left: .75rem;
    }

    &.is-current {
      display: flex;
      justify-content: center;
      align-items: center;

      & a {
        width: 100%;
        color: var(--fill-color);
        font-weight: bold;
        border: none;
      }
    }
    &:not(.is-current) {
      & a {
        width: 100% !important;

        color: #4a4a4a;
        border: none;

        &:before {
          margin-left: 10px !important;
          margin-right: 10px !important;
        }

        &:hover {
          color: var(--fill-color) !important;
        }
      }
    }
  }

  &.with-ellipsis li {
    &:not(:last-child) {
      & a {
        text-align: left;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 200px;

        &:hover {
          text-overflow: unset;
          max-width: unset;
        }

      }
    }
  }

  &.hide-resource {
    display: none;
  }
}

.navigation-row {
  position: sticky;
  top: 0;
  z-index: 22;

  display: flex;
  flex-direction: column;
  background: #fff;
  justify-content: center;
  align-items: center;
  width: 100%;
  vertical-align: center;
  /*margin-bottom: 10px;*/
  pointer-events: auto;
}

.controls {
  position: sticky;
  top: 85px;
  z-index: 15; /* above document-area layer */
  pointer-events: none;
}

.controls button {
  pointer-events: auto;
}

.document-area {
  position: relative;
  z-index: 10;
  margin-top: -60px;
  width: 100%;
}

.document-area.toc-aside-is-opened {
  z-index: 11;
}


.navigation-document {
  position: relative;
  display: flex;
  flex-direction: row;
  justify-content: left;
  align-items: center;
  width: 100%;
  padding-top: 20px;
  padding-bottom: 20px;

  &::after {
    content: "";
    position: absolute;
    bottom: 0;
    display: block;
    width: 100%;
    height: 1px;
    border-bottom: 1px solid var(--fill-color) !important;
  }
}

.navigation-document-top {
  display: flex;
  flex-direction: row;
  justify-content: right;
  height: 100%;
  color: var(--fill-color);
}
.navigation-document-top a span {
  line-height: 1.25;
}

.navigation-document-bottom {
  display: flex;
  flex-direction: row;
  justify-content: left;
  align-items: center;
  width: 100%;
}

.several-parent {
  display: flex;
  flex-direction: row;
  justify-content: center;
  & > a:first-child {
    max-width: fit-content;
    /*justify-content: right !important;*/
  }
  & > a:not(:first-child) {
    max-width: fit-content;
    /*justify-content: left !important;*/
    color: #929292 !important;

    &:before {
      content: ' (autres collections : ';
      white-space: pre;
    }

    &:after {
      content: ') ';
      white-space: pre;
    }
  }
}

.hideLeftToc {
  visibility: hidden;
}


.ariane-collection-top {
  justify-content: left;
  position: relative;
}

.navigation-row-top-container {
  width: 100%;
  padding-top: 20px;
  background-color: var(--meta-banner-fill-color);
}

.navigation-row-top {
  width: 100% !important;
}
ul.breadcrumb-top {
  --crumb-radius: 30px;     /* demi-lune (40px hauteur / 2)*/
  --crumb-gap: 0;        /* trait visible entre les items*/

  display: flex;

  margin-bottom: 20px;
  padding: 0;
  font-family: var(--font-secondary), sans-serif;
  font-size: var(--font-default-size);
  font-weight: 500;
  flex-flow: row nowrap;
  overflow-x: auto;   /* scroll horizontal si nécessaire */
  overflow-y: hidden; /* pas de scroll vertical */
  scroll-behavior: smooth;
  scrollbar-width: thin;

  > li {
    display: flex;
    align-items: center;
    width: fit-content;
    margin-top: 0;
    margin-bottom: 0;
  }

  > li .separator {
    color: var(--fill-color);
    margin: 0 14px;
  }

  > li > a {
    position: relative;
    display: flex;
    flex-flow: row nowrap;
    gap: 5px;
    overflow: hidden;
    align-items: center;
    padding: 7px 20px;
    background: #E5E5E5;
    color: black;
    text-decoration: none;
    white-space: nowrap;

    border: 2px solid var(--meta-banner-fill-color);
    border-radius: var(--crumb-radius);

    /* espace pour emboitement */
    margin-right: var(--crumb-gap);

    & .breadcrumb-top-icon {
      width: 30px;
      height: 30px;
      color: var(--fill-color);
    }

    & > span {
      text-wrap: nowrap;
    }

    &.active {
      /* font-weight: bold !important; */
      color: white;
      background-color: var(--fill-color);
      /*border-bottom: none;*/

      & .breadcrumb-top-icon {
        color: white;
      }
    }
  }

  /* creux gauche pour tous sauf premier */
  > li:not(:first-child) > a {
    margin-left: var(--crumb-gap);
    border-radius: var(--crumb-radius);
  }

  /* premier élément */
  > li:first-child > a {
    padding-left: 15px;
  }

  /* dernier élément */
  > li:last-child > a {
    border-top-right-radius: var(--crumb-radius);
    border-bottom-right-radius: var(--crumb-radius);
  }

  &.with-ellipsis li {
    &:not(:last-child) {
      & > a:not(.active) {
        .breadcrumb-label {
          max-width: 320px;
          text-overflow: ellipsis;
          overflow: hidden;
          white-space: nowrap
        }

        &:hover {
          .breadcrumb-label {
            text-overflow: unset;
            max-width: unset;
          }
        }

      }
    }
  }
}

ul.breadcrumb-top > li:nth-child(1) { z-index: 10; }
ul.breadcrumb-top > li:nth-child(2) { z-index: 9; }
ul.breadcrumb-top > li:nth-child(3) { z-index: 8; }
ul.breadcrumb-top > li:nth-child(4) { z-index: 7; }
ul.breadcrumb-top > li:nth-child(5) { z-index: 6; }
ul.breadcrumb-top > li:nth-child(6) { z-index: 5; }
ul.breadcrumb-top > li:nth-child(7) { z-index: 4; }
ul.breadcrumb-top > li:nth-child(8) { z-index: 3; }
ul.breadcrumb-top > li:nth-child(9) { z-index: 2; }
ul.breadcrumb-top > li:nth-child(10) { z-index: 1; }

.fade-left,
.fade-right {
  display: flex;
  align-items: center;

  position: absolute;
  top: 2px;
  z-index: 0;

  width: 10%; /* largeur du gradient */
  height: 43px;
  opacity: 0;
  transition: opacity 0.2s ease;

  &.visible {
    opacity: 1;
    z-index: 15;
  }
}

.fade-right {
  right: 0;
  justify-content: right;
  background: linear-gradient(
    to left,
    #e5e5e5 50%,      /* opaque côté droit */
    transparent 100%  /* transparent côté gauche */
  );

  & > .icon-circle-arrow-right {
    margin-right: 5px;
    cursor: pointer;
  }
}

.fade-left {
  left: 0;
  justify-content: left;
  background: linear-gradient(
    to right,
    #e5e5e5 50%,
    rgba(204, 204, 204, 0) 100%
  );

  & > .icon-circle-arrow-left {
    margin-left: 5px;
    cursor: pointer;
  }
}

.doc-fade-left,
.doc-fade-right {
  display: flex;
  align-items: center;

  position: absolute;
  top: 2px;
  width: 8%; /* largeur du gradient */
  height: 43px;
  z-index: 0;

  opacity: 0;
  transition: opacity 0.2s ease;

  &.visible {
    opacity: 1;
    z-index: 15;
    pointer-events: none;
  }
}

.doc-fade-right {
  justify-content: right;
  right: 0;
  background: linear-gradient(
    to left,
    white 50%,      /* opaque côté droit */
    transparent 100%  /* transparent côté gauche */
  );

  & > .icon-circle-arrow-right {
    margin-right: 5px;
  }
}

.doc-fade-left {
  justify-content: left;
  left: 0;
  background: linear-gradient(
    to right,
    white 50%,
    rgba(204, 204, 204, 0) 100%
  );

  & > .icon-circle-arrow-left {
    margin-left: 5px;
  }
}

.to-next-fragment {
  border-bottom: none !important;
  &.disabled {
    pointer-events: none;
  }
  margin-left: 5px;
  margin-right: 0;
  margin-bottom: 0;
  margin-top: 0;
}

.to-previous-fragment {
  border-bottom: none !important;
  &.disabled {
    pointer-events: none;
  }
  margin-left: 0;
  margin-right: 5px;
  margin-bottom: 0;
  margin-top: 0;
}

.breadcrumb-panel {
  margin-top: -2px;
  padding: 5px 5px 45px 5px;
  background-color: var(--meta-area-fill-color);
  border-radius: 6px;

  position: relative;
  z-index: 11;
}

.tab-header {
  display: flex;
  align-items: center;
  height: 80px;
  gap: 12px;
  padding: 20px 56px;
  background-color: var(--meta-area-fill-color);
}

.tab-header button.dots-button {
  width: auto;
  background: #FFF;
  font-family: var(--font-primary), sans-serif;
  padding: 6px 30px;
  color: var(--fill-color);
  border: 1px solid var(--fill-color);
}

.tab-header button.dots-button.active {
  color: white;
  background-color: var(--fill-color);
}

.tab-content {
  padding: 10px 56px;

  table {
    border: none;
    background: none;
  }

  .table td {
    padding: 13px 10px
  }

  .table td,
  .table tr {
    border-bottom: 1px solid #C2C2C2;
  }
}

.tab-content ul.tree, .tab-content .collection-toc-area, .tab-content .table.is-fullwidth  {
  margin: 0;
  border-radius: 0 0 6px 6px;
}

.images-mode {
  .notes-opened .aside-noteref-parent,
  .controls .notes-btn-parent {
    display: none;
  }
}

a.pb {
  border: none;
  background: transparent;

  &:focus,
  &:hover {
    color: var(--fill-color);
  }

}


@media screen and (max-width: 1320px) {
  .toc-area .toc-area-content nav > ol.tree {
    columns: 2;
  }
  .controls > a.toc-menu-toggle {
    margin-left: 20px;
  }
  .controls ul > li > a.access_link {
    margin-right: 20px;
  }

  /* Document page numbers */
  a.pb {
    float: none;
    display: block;
    width: 100%;
    position: relative;
    padding: 20px 0;
    text-decoration: none !important;
  }

  .cb, .ed {
    margin-right: 0;
    padding: 20px 5px;
  }
}

@media screen and (max-width: 1024px) {

  .document-area {
    margin-top: -60px;
  }

  .navigation-document::after {
    width: 100vw;
    left: -20px;
  }

  .document-views .text-view > * teiheader,
  .document-views .text-view > * body {
    width: auto;
    margin-left: 0;
    margin-right: 0;
  }

  .toc-aside-is-opened #aside {
    width: 100%;
    padding: 0 15px;
  }

  /* Negative margin is necessary to maintain the sticky behavior */
  .toc-aside-is-opened .toc-area-aside {
    width: calc(100vw - 105px);
    margin-left: -20px;
    padding-left: 15px;
  }

  .toc-aside-is-opened .document-views {
    width: calc(100vw - 40px) !important;
    margin-left: calc(125px - 100vw);

    &::before {
      content: "";
      display: block;
      width: 100vw;
      height: 100%;
      background-color: rgba(0,0,0,0.65);
      position: absolute;
      left: -20px;
      top: 0;
      z-index: 11;
    }
  }

  .controls {
    z-index: 11; /* under semi-transparent bg when aside TOC is opened */
  }
  
  .text-mode .dots-button.text-btn {
    .icon-wrapper {
      color: #FFF;
      background-color: var(--fill-color);
    }
  }

  .images-mode .dots-button.images-btn {
    .icon-wrapper {
      color: #FFF;
      background-color: var(--fill-color);
    }
  }

}

@media screen and (max-width: 768px) {

  .navigation-document::after {
    left: calc(-1 * var(--mobile-margin));
  }

  .document-area.app-width-margin {
    padding-left: 0;
    padding-right: 0;
  }

  .document-area {
    margin-top: -50px;
  }

  .document-views {
    width: 100% !important;
    padding-left: 10px;
    padding-right: 10px;
  }

  .images-mode .document-views,
  .text-and-images-mode .document-views {
    margin-right: 0px;
  }

  .text-mode .document-views,
  .text-and-images-mode .document-views {
    margin-right: 0;
  }

  .mirador-view {
    height: calc(100dvh - 170px);
    min-height: 80vh;
    max-height: 100dvh;
  }

  .text-and-images-mode .document-views .mirador-view {
    display: none;
  }

  .text-and-images-mode .document-views .text-view {
    flex: 100% 0 0;
  }

  .controls li:empty {
    display: none;
  }

  .text-mode .controls {
    .text-btn {
      pointer-events: none;
    }
    .images-btn {
      pointer-events: auto;
    }
  }

  .images-mode .controls {
    .text-btn {
      pointer-events: auto;
    }
    .images-btn {
      pointer-events: none;
    }
  }

  .controls {
    top: 42px;
  }

  .controls-list.is-opened {
    position: absolute;
    top: 50px;

    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .navigation-row-top-container {
    padding: 8px 0;
  }

  .breadcrumb-panel {
    padding: 10px 0;
    margin-left: calc(-1 * var(--mobile-margin));
    margin-right: calc(-1 * var(--mobile-margin));

    &.is-opened {
      margin-top: 8px;
      .breadcrumb-top-toggle-btn {
        right: 10px;
      }
    }
  }

  /* Ariane Collection */

  .ariane {
    font-size: 16px;
  }

  ul.breadcrumb-top {
    margin-bottom: 0;
    font-size: 15px;
  }

  ul.breadcrumb-top > li {
    & > a {
      padding: 6px 10px;

      .breadcrumb-top-icon {
        width: 20px;
        height: 20px;
        color: var(--fill-color);
      }
    }

    .separator {
      width: 20px;
      margin: 0;

      svg {
        transform: scale(0.6);
        transform-origin: center;
      }
    }
  }

  .fade-left,
  .fade-right {
    height: 33px;
  }

  /* Ariane Document */
  .navigation-document {
    padding: 3px 0;
  }

  .doc-fade-left,
  .doc-fade-right {
    height: 35px;
  }
  .ariane {
    & > .ariane-wrapper {
      max-width: calc(100% - 80px - 6px);
      margin-right: 2px;

      & > button.toc-menu-toggle {
        margin-right: 6px;
      }
    }
  }
  .ariane-scroll-wrapper {
    max-width: calc(100% - 32px);
    margin-right: 10px;
  }
  .crumbs {
    display: flex;
  }
  .crumbs li {
    padding-right: 7px;

    &.is-current {
      & a {
        text-wrap: nowrap;
      }
    }
    &:not(.is-current) {
      &::after {
        padding-left: 0.25rem;
      }
    }
  }

  #article {
    padding: 40px 0 120px;
  }

  .toc-area .toc-area-content aside {
    padding: 0 !important;
  }

  .l-n {
    margin-left: -2.2rem;
  }

  .tab-header,
  .tab-content {
    height: auto;
    padding: 10px;
  }

  .toc-aside-is-opened #aside {
    width: 100%;
  }

  .toc-aside-is-opened .toc-area-aside {
    & > aside > nav {
      height: calc(100dvh - 45px); /* 45px = mobile sticky header height */
      @supports (-webkit-text-size-adjust: none) and (font: -apple-system-body) and (-webkit-touch-callout: none) {
        height: calc(100dvh - 200px);
      }
      padding-bottom: 20px;
      & > nav {
        @supports (-webkit-text-size-adjust: none) and (font: -apple-system-body) and (-webkit-touch-callout: none) {
          height: calc(100dvh - 200px);
        }
        overflow-y: auto;
      }
    }
  }

  /* Negative margin is necessary to maintain the sticky behavior */
  .toc-aside-is-opened .toc-area-aside {
    width: calc(100vw - 60px);
    margin-left: 0;
  }

  .toc-aside-is-opened .document-views {
    width: 100vw !important;
    margin-left: calc(60px - 100vw);

    &::before {
      left: 0;
    }
  }

  .mirador-window-top-bar {
    padding-right: 50px !important;
  }

  div.MuiPaper-elevation4:has(button[aria-label="collapse"]) {
    right: unset !important;
    left: 8px;
  }

  div.MuiPaper-elevation4:has(button[aria-label="collapse"]) .MuiSvgIcon-root {
    width: 24px !important;
    height: 24px !important;
  }

  div.MuiPaper-elevation4:has(button[aria-label="collapse"]) .MuiIconButton-root {
    padding: 6px !important;
  }

}

@media screen and (max-width: 640px) {
  /* .top-tint covers the first 6 pixels of the screen, leaving 2px above
     the buttons against 8 below. Give them back where they are eaten,
     under the same guard as the strip: elsewhere it does not exist and
     these offsets would only shift the banner. */
  @supports (-webkit-text-size-adjust: none) and (font: -apple-system-body) and (-webkit-touch-callout: none) {
    .navigation-row-top-container {
      padding-top: 14px;
    }

    /* sticky: offset its `top`, not its padding (see SearchPage) */
    .navigation-row {
      top: 6px;
    }
  }


  .several-parent {
    flex-direction: column;
    align-items: center;
  }

  .l-n {
    margin-left: -1.5rem;
  }

  small {
    font-size: 9px;
  }

  .document-area {
    margin-top: -56px;
  }

  .toc-area-aside {
    display: none;
  }

  .toc-aside-is-opened #aside {
    width: 100%;
  }

  .toc-area .toc-area-content nav > ol.tree {
    columns: 1;
  }

  div.remove-bottom-padding #article {
    padding: 40px var(--mobile-margin) 10px !important;
  }

  #article .byline {
    margin: 15px 0 50px;
  }

  #article h1 {
    font-size: 30px;
  }

  #article section.div {
    padding-top: 10px;
  }
  #article p.p {
    text-align: left;
  }

  .toc-area-header {
    & > a:first-child {
      margin-left: 0;
      margin-right: 25px;
    }
  }

  .controls {
    z-index: 11;
    display: flex;
    flex-direction: row;
    align-items: center;
    width: 100%;
    background-color: transparent;
  }

  .controls-list {
    position: absolute;
    display: none;
    flex-direction: column;
  }

  .controls button.controls-toggle {
    display: flex;
    margin-left: 0; /* annule margin-left: auto */
    order: 2;       /* met le bouton à droite */
    margin-top: 0.5ex;
    margin-bottom: 0.5ex;
  }

  .controls-list {
    flex-direction: row;
    margin-left: 40px;
    order: 1; /* liste avant le bouton */
  }

}

button[aria-label="Window options"] > span {
  width: 100%;
  height: 100%;
  background: url('../assets/images/tools.svg') top center / 30px no-repeat;
  /* background-color: transparent;*/
  background-size: contain;
}

button[aria-label="Window options"] > span > svg {
  display: none;
}
/* force no height for Mirador bottom buttons container to correct an incorrect behaviour */
.mirador-canvas-nav, .mirador52 {
  height: unset !important;
  & > * {
    background-color: unset !important;
  }
}

</style>