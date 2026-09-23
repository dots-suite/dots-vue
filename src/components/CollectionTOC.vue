<template>
  <!-- PAGINATION TOP for RESOURCE LIST AS CARDS (+/- TABLE OF CONTENT) -->
  <div
    v-if="displayMode !== 'toc'"
    class="pagination has-text-centered is-flex is-flex-direction-row is-justify-content-center"
  >
    <Pagination
      v-if="displayMode !== 'toc'"
      v-model="currentPage"
      :total-pages="totalPages"
      :documents-count-text="documentsCountText"
      @update:modelValue="onPaginationUpdate"
    />
  </div>
  <!-- RESOURCE LIST AS CARDS (applicable conf (cascade): homePageSettings.listSection.displayMode = 'card') -->
  <!-- or RESOURCE LIST AS CARDS AND TABLE OF CONTENT (applicable conf (cascade): homePageSettings.listSection.displayMode = 'mixed') -->
  <div
    v-if="paginated.length && (displayOpt === 'card' || (displayOpt === 'mixed' && displayMode === 'mixed'))"
    class="resources-grid"
    :class="displayMode !== 'toc' ? `${displayMode}-mode` : 'toc-mode'"
  >
    <div
      v-for="item in paginated"
      :key="item.identifier"
      class="document-card collection-toc-component"
    >
      <template v-if="item['@type'] === 'Collection' || item.citeType === 'Collection'">
        <div class="collection-wrapper">
          <div
            class="card-header"
          >
            <div
              class="card-link"
              :class="{ clickable: canNavigate(item), disabled: !canNavigate(item) }"
              @click="handleClick(item)"
            >
              <div class="card-image">
                <!-- if image -->
                <img
                  v-if="collectionImages[item.identifier]?.url"
                  :src="collectionImages[item.identifier].url"
                  :class="collectionImages[item.identifier].url.endsWith('.svg') ? 'has-banner collection-svg' : 'has-banner'"
                  alt=""
                />
                <!-- if component -->
                <component
                  :is="collectionImages[item.identifier].component"
                  v-else-if="collectionImages[item.identifier]?.component"
                  class="collection-component has-banner"
                />
              </div>
              <div class="collection-metadata">
                <div class="collection-metadata-author-date-title">
                  <span>
                    {{ Array.isArray(item.dublinCore.creator)
                      ? item.dublinCore.creator.join(', ')
                      : item.dublinCore.creator }}
                  </span>
                  <span>{{ item.dublinCore.date }}</span>
                  <div class="collection-metadata-title">
                    {{ item.title }}
                  </div>
                </div>
              </div>
            </div>
            <div
              class="collection-description"
              :class="expandDescriptionClass(item.identifier)"
            >
              <span
                :key="item.identifier"
                :ref="el => textEls.push(el)"
                class="collection-description-text"
              >
                {{ item.description }}
              </span>
              <span
                v-if="item.description"
                class="read-more"
                @click="expandDescription(item.identifier)"
              >
                {{ descExpandedItems[item.identifier] === true ? '[Lire moins]' : '[Lire la suite]' }}
              </span>
            </div>
          </div>
        </div>
      </template>
      <!-- ELSE resource is a resource of type (@type / citeType) resource  -->
      <template v-else>
        <div class="card-header">
          <div class="document-folder">
            <router-link
              class="card-header-first-line"
              :to="!isDocProjectIdInc ? { name: 'Document', params: { id: item.identifier }} : { name: 'Document', params: { collId: item.projectIdentifier ? item.projectIdentifier : item.identifier, id: item.identifier } }"
            >
              <div class="collection-metadata is-flex-direction-column">
                <span class="collection-metadata-title">
                  {{ item.title }}
                </span>
                <div class="is-flex is-flex-direction-column">
                  <span>
                    {{ Array.isArray(item.dublinCore.creator)
                      ? item.dublinCore.creator.join(', ')
                      : item.dublinCore.creator }}
                  </span>
                  <span>
                    {{ item.dublinCore.date }}
                  </span><!-- v-if="c.date" -->
                </div>
                <div class="collection-description">
                  <span>
                    {{ item.description }}
                  </span><!-- v-if="c.date" -->
                </div>
              </div>
              <!-- no image planned at resource level for now -->
            </router-link>
          </div>
        </div>
      </template>
    </div>
  </div>
  <!-- PAGINATION BOTTOM (if totalPages>1) for RESOURCE LIST AS CARDS with (+/- TABLE OF CONTENT) (applicable conf (cascade): homePageSettings.listSection.displayMode = 'card'/'mixed') -->
  <div
    v-if="displayMode !== 'toc' && totalPages > 1"
    class="pagination has-text-centered is-flex is-flex-direction-row is-justify-content-center"
  >
    <Pagination
      v-if="displayMode !== 'toc'"
      v-model="currentPage"
      :total-pages="totalPages"
      documents-count-text=""
      @update:modelValue="onBottomPaginationUpdate"
    />
  </div>

  <!-- RESOURCE LIST AS TOC (conf: homePageSettings.listSection.displayMode = 'toc' or unset) -->

  <div
    v-if="(displayMode === 'toc')"
    :class="`collection-toc-area ${expandedById[currCollection.identifier] ? 'expanded': ''} toc-mode`"
  >
    <div
      v-if="(displayMode === 'toc' && lvl < 2)"
      class="collection-toc-area-header"
      @click.prevent="toggleExpanded(currCollection)"
    ><!-- && rootCollectionId === currCollection.identifier -->
      <a
        v-if="componentTOC.length === 1 && (componentTOC[0].type === 'Resource' || componentTOC[0]['@type'] === 'Resource')"
        href="#"
        class="collBrowseButton"
      >
        Accéder au document
      </a>
      <a
        v-else
        href="#"
        class="collBrowseButton"
      >
        {{ browseBttnTxt }}
      </a>
      <a
        href="#"
        class="toggle-btn"
        :class="expandedById[currCollection.identifier] ? 'expanded' : ''"
      />
    </div>
    <div
      v-if="displayMode === 'toc'"
      class="menu"
      :class="expandedById[currCollection.identifier] ? 'expanded': ''"
    >
      <div v-if="expandedById[currCollection.identifier]">
        <ul class="tree">
          <template
            v-for="item in componentTOC"
            :key="item.identifier"
          >
            <li
              :style="`margin-left: ${ $props.margin }px;`"
              :class="item.totalChildren > 0 ? 'more' : ''"
            >
              <div class="li container">
                <button
                  v-if="item.totalChildren > 0"
                  class="toc-toggle"
                  :aria-expanded="expandedById[item.identifier] || item.expanded ? true : false"
                  aria-label="Afficher les éléments enfants"
                  @click.stop="toggleExpanded(item)"
                >
                  <TocArrows
                    :key="expandedById[item.identifier] || item.expanded"
                    :direction="expandedById[item.identifier] || item.expanded ? 'down' : 'right'"
                    :size="30"
                    :radius="3"
                  />
                </button>
                <template
                  v-if="item['@type'] === 'Collection' || item.citeType === 'Collection'"
                >
                  <Collection-icon
                    class="collection-icon"
                    :size="30"
                    :radius="0"
                  />
                  <a
                    v-if="!isDocProjectIdInc"
                    :href="getHref(item)"
                    :class="expandedById[item.identifier] ? 'is-current' : ''"
                    @click="goToPage(item, $event)"
                  >
                    {{ item.title }}
                  </a>
                  <a
                    v-else-if="isDocProjectIdInc && item.parent === rootCollectionId && rootCollectionId !== dtsRootCollectionId"
                    :href="getHref(item)"
                    :class="route.params.id === item.identifier ? 'is-current' : ''"
                    @click="goToPage(item, $event)"
                  >
                    {{ item.title }}
                  </a>
                  <a
                    v-else-if="isDocProjectIdInc && item.parent === rootCollectionId && rootCollectionId === dtsRootCollectionId"
                    :href="getHref(item)"
                    :class="route.params.id === item.identifier ? 'is-current' : ''"
                    @click="goToPage(item, $event)"
                  >
                    {{ item.title }}
                  </a>
                  <a
                    v-else-if="isDocProjectIdInc && item.parent !== rootCollectionId"
                    :href="getHref(item)"
                    :class="expandedById[item.identifier] ? 'is-current' : ''"
                    @click="goToPage(item, $event)"
                  >
                    {{ item.title }}
                  </a>
                </template>
                <a
                  v-else-if="isDocProjectIdInc && selectedParent === rootCollectionId"
                  :href="getHref(item)"
                  :class="route.params.id === item.identifier ? 'is-current' : ''"
                  @click="goToPage(item, $event)"
                >
                  <ResourceIcon
                    class="resource-icon"
                  />
                  {{ item.title }}
                </a>
                <a
                  v-else-if="isDocProjectIdInc && selectedParent !== rootCollectionId && item.projectIdentifier && !Array.isArray(item.parent)"
                  :href="getHref(item)"
                  :class="route.params.id === item.identifier ? 'is-current' : ''"
                  @click="goToPage(item, $event)"
                >
                  <ResourceIcon
                    class="resource-icon"
                  />
                  {{ item.title }}
                </a>
                <a
                  v-else-if="isDocProjectIdInc && selectedParent !== rootCollectionId"
                  :href="getHref(item)"
                  :class="route.params.id === item.identifier ? 'is-current' : ''"
                  @click="goToPage(item, $event)"
                >
                  <ResourceIcon
                    class="resource-icon"
                  />
                  {{ item.title }}
                </a>
                <a
                  :href="getHref(item)"
                  v-else-if="!isDocProjectIdInc"
                  :class="route.params.id === item.identifier ? 'is-current' : ''"
                  @click="goToPage(item, $event)"
                >
                  <ResourceIcon
                    class="resource-icon"
                  />
                  {{ item.title }}
                </a>
                <a
                  v-else
                  :href="getHref(item)"
                  :class="route.params.id === item.identifier ? 'is-current' : ''"
                  @click="goToPage(item, $event)"
                >
                  <ResourceIcon
                    class="resource-icon"
                  />
                  {{ item.title }}
                </a>
              </div>
              <div
                v-if="(expandedById[item.identifier] || item.expanded)
                  && item.totalChildren > 0
                  && item.children?.length > 0"
                class="is-tree-opened menu expanded"
              >
                <CollectionTOC
                  :is-doc-project-id-included="isDocProjectIdInc"
                  :display-option="displayOpt"
                  :current-collection="item"
                  :dts-root-collection-identifier="dtsRootCollectionId"
                  :root-collection-identifier="rootCollectionId"
                  :application-config="appConfig"
                  :collection-config="collConfig"
                  :toc="item.children"
                  :level="lvl+1"
                />
              </div>
            </li>
          </template>
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, watch, onMounted, nextTick, onUnmounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { getAncestors, getMetadataFromApi } from '@/api/document.js'
import { usePagination } from '@/composables/usePagination.js'
import { getSimpleObject } from '@/composables/utils.js'
import { router } from '@/router'
import store from '@/store'

import TocArrows from '@/assets/images/TocArrows.vue'
import CollectionIcon from '@/assets/images/CollectionIcon.vue'
import ResourceIcon from '@/assets/images/ResourceIcon.vue'
import Pagination from '@/components/Pagination.vue'

const collator = new Intl.Collator('fr', {
  numeric: true,
  sensitivity: 'base'
})

export default {
  name: 'CollectionTOC',
  components: { ResourceIcon, CollectionIcon, TocArrows, Pagination },
  props: {
    isDocProjectIdIncluded: {
      type: Boolean,
      required: true
    },
    displayOption: {
      type: String,
      required: false
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
      type: Object
    },
    collectionConfig: {
      type: Object
    },
    currentCollection: {
      type: Object
    },
    toc: {
      required: true,
      default: () => [],
      type: Array
    },
    level: {
      required: false,
      type: Number
    }
  },
  setup (props) {
    // HELPERS
    const customSort = (A, B) => {
      const bIndex = new Map(B.map((val, index) => [val, index]))

      return A.slice().sort((a, b) => {
        const aId = a.identifier
        const bId = b.identifier

        const aInB = bIndex.has(aId)
        const bInB = bIndex.has(bId)

        if (aInB && bInB) {
          return bIndex.get(aId) - bIndex.get(bId)
        } else if (aInB) {
          return -1
        } else if (bInB) {
          return 1
        }

        // DEFAULT SORTING: natural + French + without diacritics
        return collator.compare(a.title, b.title)
      })
    }

    // CONSTANT PROPS
    const route = useRoute()

    const isDocProjectIdInc = computed(() =>
      props.isDocProjectIdIncluded
    )

    const dtsRootCollectionId = computed(() =>
      props.dtsRootCollectionIdentifier
    )

    const rootCollectionId = computed(() =>
      props.rootCollectionIdentifier
    )

    const collectionBreadcrumb = ref([])

    const appConfig = computed(() =>
      props.applicationConfig
    )

    const collConfig = computed(() =>
      props.collectionConfig
    )

    const currCollection = ref({...props.currentCollection})

    const browseBttnTxt = computed(() =>
      props.collectionConfig?.homePageSettings?.listSection?.browseButtonText
    )

    const displayOpt = computed(() =>
        props.applicationConfig?.homePageSettings?.listSection?.displayMode?.length > 0
        ? props.applicationConfig.homePageSettings.listSection.displayMode
        : props.displayOption
    )


    // TABLE OF CONTENT

    // TOC DATA
    const componentTOC = ref([...props.toc])

    // IMAGES
    /* Helpers */
    const isVueComponent = (val) => typeof val === 'object' && (val.render || val.setup)

    const resolveModule = (mod, type) => {
      if (!mod) return null

      const value = mod.default

      // Vue component
      if (isVueComponent(value)) {
        return {
          component: value,
          type: 'component'
        }
      }

      // Regular image
      return {
        url: value,
        type
      }
    }

    const collectionImages = computed(() => {
      const map = {}

      appConfig.value.collectionsConf.forEach(coll => {
        map[coll.collectionId] = getCollectionImage(coll.collectionId)
      })

      return map
    })

    /* COLLECTION IMAGE */
    const getCollectionImage = (source) => {
      // TODO: provide a logo object with url AND legend ?

      // Load image candidates
      const images = Object.fromEntries(
        Object.entries(
          import.meta.glob([
            'confs/*/assets/images/*.*',
            '/src/assets/images/*.*'
          ], { eager: true })
        ).map(([key, value]) => {
          const newKey = key.split('/').slice(-4).join('/')
          return [newKey, value]
        })
      )

      // Current collection config
      const coll = appConfig.value.collectionsConf
        .find(c => c.collectionId === source)

      if (!coll) {
        return {
          url: null,
          type: 'none'
        }
      }

      // Current collection image name ?
      const collectionImg = coll.homePageSettings?.listSection?.logo

      // Default image name ?
      const defaultImgName = appConfig.value?.genericConf?.homePageSettings?.listSection?.logo

      // Explicit empty image name : the collection opts out of any image (cancels the default)
      if (typeof collectionImg === 'string' && collectionImg.trim().length === 0) {
        return {
          url: null,
          type: 'none'
        }
      }

      // Default image (custom settings default folder, then Dots-vue app folder)
      const resolveDefaultImage = () => {
        if (!defaultImgName) return null

        const defaultCustMatch = images[`default/assets/images/${defaultImgName}`]
        const defaultAppMatch = images[`src/assets/images/${defaultImgName}`]

        return (
          resolveModule(defaultCustMatch, 'default') ||
          resolveModule(defaultAppMatch, 'default')
        )
      }

      // Collection declares its own image : find a matching image
      if (collectionImg && collectionImg.length > 0 && collectionImg !== defaultImgName) {

        // External URL
        if (collectionImg.startsWith('http')) {
          return {
            url: collectionImg,
            type: 'collection'
          }
        }

        // Local collection image
        const match = images[`${coll.collectionId}/assets/images/${collectionImg}`]

        const resolved = resolveModule(match, 'collection')
        if (resolved) return resolved
      }

      // No collection image (or unresolvable) : fall back to the app default
      const resolvedDefault = resolveDefaultImage()
      if (resolvedDefault) return resolvedDefault

      // No image found
      return {
        url: null,
        type: 'none'
      }
    }

    // REACTIVE TOC
    const lvl = ref(props.level)

    const expandedById = ref(
      displayOpt.value === 'toc'
        ? (
            lvl.value === 1
              ? (collConfig.value?.homePageSettings?.listSection?.openState
                  ? { [currCollection.value.identifier]: true }
                  : {})
              : { [currCollection.value.identifier]: true }
          )
        : { [currCollection.value.identifier]: true }
    )


    const selectedParent = ref(props.currentCollection ? props.currentCollection.identifier : '')

    const toggleExpanded = async (coll) => {
      const collId = coll.identifier || coll['@id']
      const projectId = coll.projectIdentifier

      const idx = componentTOC.value.findIndex(item => item['@id'] === collId || item.identifier === collId)
      if (idx !== -1) {
        const item = componentTOC.value[idx]

        if (!item.children || item.children.length === 0) {
          let response = await getMetadataFromApi(collId, null, null)

          response?.member?.forEach(m => getSimpleObject(m, collId, projectId))

          if ((!coll?.parent?.length && displayOpt.value === 'mixed' && displayMode.value !== 'toc') || displayOpt.value === 'mixed' && displayMode.value === 'toc') {
            response.member.forEach(c => c.forcedDisplayOpt = 'toc')
          }

          // Reassigning to ensure Vue reactivity
          /*componentTOC.value[idx] = {
            ...item,
            member: response.member,
            children: response.member
          }*/
          componentTOC.value[idx].member = response.member
          componentTOC.value[idx].children = response.member

        }
      }
      selectedParent.value = collId
      expandedById.value[collId] = !expandedById.value[collId]
    }


    const openInitialCollections = async () => {
      const collections = componentTOC.value.filter(
          item => item.citeType === 'Collection' || item['@type'] === 'Collection'
      )

      for (const comp of collections) {
        const conf = appConfig.value.collectionsConf.find(c => c.collectionId === comp.identifier)

        if (displayOpt.value === 'toc') {
          // Lower levels of Cards are unavailable by design and Lists are not hierarchy objects
          if (conf?.homePageSettings?.listSection?.openState) {
            await toggleExpanded(comp)
            // wait next render
            await nextTick()
          }
        } else if (displayOpt.value === 'mixed' && displayMode.value === 'mixed') {
          // Lower levels of Mixed mode are opened by default
          await toggleExpanded(comp)
          // wait next render
          await nextTick()
        }
      }
    }




    // DISPLAY OPTIONS

    const displayMode = computed(() => {
      const allowed = ['card', 'list', 'mixed', 'toc']

      const normalize = val =>
        typeof val === 'string' ? val.toLowerCase() : null

      const forced = normalize(currCollection.value?.forcedDisplayOpt)
      if (allowed.includes(forced)) return forced

      const mode = normalize(displayOpt.value)
      if (allowed.includes(mode)) return mode
      return 'toc'
    })

    // CARDS EXPANDABLE DESCRIPTION
    const textEls = ref([])
    let resizeObserver = null
    const isTextTruncated = (el) => {
      if (!el || ! el.scrollHeight) return
      const truncated = el.scrollHeight > el.clientHeight
      el.parentElement.classList.toggle('truncated', truncated)
    }

    const descExpandedItems = ref({}) // clé = item.identifier

    const expandDescription = (id) => {
      descExpandedItems.value[id] = !descExpandedItems.value[id]
    }

    const expandDescriptionClass = (id) => {
      if (descExpandedItems.value[id] === undefined) {
        return '';
      } else {
        return descExpandedItems.value[id] ? 'expanded' : 'truncated';
      }
    };

    // PAGINATION
    const pageSize = computed(() =>
      props.collectionConfig?.homePageSettings?.listSection?.cardCollectionPerPage
    )
    const currentPage = ref(1)

    const pagination = usePagination(componentTOC, pageSize, currentPage)


    const totalPages = computed(() =>{
      if (displayOpt.value === 'toc') {
        return null
      } else return pagination.totalPages.value
    })
    const paginated = computed(() => {
      return pagination.paginated.value
    })

    const onPaginationUpdate = function() {
      nextTick(function () {
        textEls.value.forEach(el => {
          isTextTruncated(el)
        })
      });
    }

    let bottomNavigationTimeout;

    const onBottomPaginationUpdate = function() {
      onPaginationUpdate()
      nextTick(function () {
        if (bottomNavigationTimeout) clearTimeout(bottomNavigationTimeout);
        bottomNavigationTimeout = setTimeout(function () {
          window.scrollTo({ top: 0, behavior: 'smooth' })
        })
      })
    }


    const documentsCountText = computed(() => {
      const ds = componentTOC.value || []
      const curr = currCollection.value
      const rootId = rootCollectionId.value
      const display = displayOpt.value

      if (!ds.length) return '0 ressources'

      const allCollections = ds.every(
        item => item.type === 'Collection' || item['@type'] === 'Collection'
      )

      if (display === 'card' || display === 'mixed') {
        if (curr?.identifier === rootId) {
          const label = ds.length <= 1 ? 'projet' : 'projets'
          return `${ds.length} ${label}`
        } else if (allCollections) {
          const label = ds.length <= 1 ? 'collection' : 'collections'
          return `${ds.length} ${label}`
        }
      }

      if (!allCollections) {
        const label = ds.length <= 1 ? 'ressource' : 'ressources'
        return `${ds.length} ${label}`
      }

      return '' // fallback
    })

    // TOC ACTIONS AND NAVIGATION
    const setStateCollection = (collId) => {
      store.commit('setCollectionId', collId)
    }

    // CARDS (incl. CARDS OF MIXED DISPLAY MODE) LINK MANAGEMENT
    const canNavigate = (item) => {
      return isDocProjectIdInc.value && (item.parent === rootCollectionId.value || item.identifier === item.projectIdentifier)
    }

    const handleClick = (item) => {
      if (!canNavigate(item)) return

      router.push({
        name: 'Home',
        params: { collId: item.identifier }
      })
    }

    // TOC MODE NAV
    const goToPage = async (item, event) => {
      // Browser events handling
      if (
        event?.metaKey ||
        event?.ctrlKey ||
        event?.shiftKey ||
        event?.button === 1
      ) {
        return
      }

      const to = getRoute(item)

      // Collections with routing → toggle
      if (!to) {
        await toggleExpanded(item)
        return
      }
      event.preventDefault()

      await router.push(to)
      setStateCollection(selectedParent.value)
    }

    const getRoute = (item) => {
      const isCollection =
        item['@type'] === 'Collection' || item.citeType === 'Collection'

      if (isCollection) {
        if (!isDocProjectIdInc.value) return null

        if (
          item.parent === rootCollectionId.value &&
          rootCollectionId.value !== dtsRootCollectionId.value
        ) {
          return {
            name: 'Home',
            params: { collId: item.identifier }
          }
        }

        if (
          item.parent === rootCollectionId.value &&
          rootCollectionId.value === dtsRootCollectionId.value
        ) {
          return {
            name: 'Home',
            params: {
              collId: item.projectIdentifier
                ? (item.projectIdentifier !== item.parent
                    ? item.projectIdentifier
                    : item.identifier)
                : item.identifier
            }
          }
        }

        return null
      }

      // documents (@type Resource)
      if (isDocProjectIdInc.value) {
        if (selectedParent.value === rootCollectionId.value) {
          return {
            name: 'Document',
            params: {
              collId: rootCollectionId.value,
              id: item.identifier
            }
          }
        }

        if (
          selectedParent.value !== rootCollectionId.value &&
          item.projectIdentifier &&
          !Array.isArray(item.parent)
        ) {
          return {
            name: 'Document',
            params: {
              collId: item.projectIdentifier,
              id: item.identifier
            }
          }
        }

        if (selectedParent.value !== rootCollectionId.value) {
          return {
            name: 'Document',
            params: {
              collId: Array.isArray(item.parent)
                ? (item.parent.find(p => p === route.params.collId)
                    ? route.params.collId
                    : item.parent[0])
                : item.parent,
              id: item.identifier
            }
          }
        }
      }

      return {
        name: 'Document',
        params: {
          id: item.identifier
        }
      }
    }

    // TOC MODE GET ROW LINK TO DISPLAY
    const getHref = (item) => {
      const to = getRoute(item)
      return to ? router.resolve(to).href : null
    }

    onMounted(async () => {
      //await nextTick()
      const observer = new ResizeObserver(entries => {
        entries.forEach(entry => {
          isTextTruncated(entry.target)
        })
      })

      textEls.value.forEach(el => {
        observer.observe(el)
        isTextTruncated(el)
      })
    })

    onUnmounted(() => {
      if (resizeObserver && textEls.value) {
        resizeObserver.unobserve(textEls.value)
      }
    })

    watch(
  () => store.state.currentItem,

        async (newVal) => {
        if (route.name !== 'Document') return

        const ancestors = await getAncestors(newVal)
        collectionBreadcrumb.value = (ancestors || [])
          .flat()
          .filter(anc => anc['@type'] === 'Collection')
          .map(col => col['@id'])
        const items = componentTOC.value
            .filter(it =>
              it['@type'] === 'Collection' &&
              collectionBreadcrumb.value.includes(it.identifier)
            )

        for (const c of items) {
          if (!expandedById.value?.[c['@id']]) {
            await toggleExpanded(c)
          }
        }
        await nextTick()
      },
      { immediate: true }
    )

    watch(
  () => [currCollection.value],
  async () => {
        if (displayOpt.value === 'toc' && lvl.value === 1 && props.collectionConfig?.homePageSettings?.listSection?.openState) {
          await openInitialCollections()
        } else if ((displayOpt.value === 'mixed') && lvl.value < 2) {
          await openInitialCollections()
        }

        if ((!currCollection.value?.parent?.length && displayOpt.value === 'mixed' && displayOpt.value !== 'toc')) {
          componentTOC.value.forEach(c => c.forcedDisplayOpt = 'toc')
        }
      },{ immediate: true }
    )

    watch(
      () => props.toc,
      async (newVal) => {
        if (!newVal) return
        let result

        if (collConfig.value?.homePageSettings?.listSection?.displaySort?.length > 0) {
          result = customSort(newVal, collConfig.value.homePageSettings.listSection.displaySort)
        } else {
          result = [...newVal].sort((a, b) =>
            collator.compare(a.title, b.title)
          )
        }

        componentTOC.value.splice(0, componentTOC.value.length, ...result)
        if ((!currCollection.value?.parent?.length && displayOpt.value === 'mixed' && displayMode.value !== 'toc') || displayOpt.value === 'mixed' && displayMode.value === 'toc') {
          componentTOC.value.forEach(c => c.forcedDisplayOpt = 'toc')
        }
      },
      { immediate: true }
    )

    return {
      route,
      isDocProjectIdInc,
      lvl,
      displayOpt,
      dtsRootCollectionId,
      rootCollectionId,
      appConfig,
      collConfig,
      browseBttnTxt,
      toggleExpanded,
      collectionImages,
      expandedById,
      selectedParent,
      componentTOC,
      textEls,
      descExpandedItems,
      expandDescription,
      expandDescriptionClass,
      canNavigate,
      handleClick,
      displayMode,
      currCollection,
      currentPage,
      totalPages,
      paginated,
      onPaginationUpdate,
      onBottomPaginationUpdate,
      documentsCountText,
      getHref,
      goToPage
    }
  }
}
</script>

<style scoped>
.document-list {
  display: flex;
  justify-content: center;
  flex-direction: column;
  width: 100%;
  padding-top: 25px;
  padding-bottom: 25px;
}

.collection-toc-area {
  .tree {
    padding-top: 0;
    padding-bottom: 0;
  }

  .tree li {
    font-family: var(--font-secondary), sans-serif;
    font-size: 15px;
    font-weight: 500;
    line-height: 22px;
    padding: 0;
    margin-bottom: 4px;

    &::before {
      display: none;

      font-family: var(--font-secondary), sans-serif;
      margin-left: -8px;
      margin-right: 11px;
      content: '●';
      font-size: 10px;
      color: #999;
      float: left;
    }

    & > .li.container {
        display: flex;
        margin: 0;
      align-items: center;

      & > a {
        display: inline-flex !important;
        align-items: center;
        gap: 0.1rem;
        width: 100%;
        padding: 13px 30px 11px;
        border-bottom: none;

        &.is-current {
          font-weight: bolder !important;
          color: var(--fill-color) !important;
        }
      }
    }

    &.more {
      padding-left: 0 !important;

      & > .li.container > button,
      & > .li.container > .icon-wrapper {
        position: relative;
        z-index: 2;
      }

      & > .li.container > a {
        position: relative;
        z-index: 1;
      }

      & > .li.container > a::before {
        content: "";
        position: absolute;
        left: 0;
        transform: translateX(-100%);
        display: block;
        width: 60px;
        height: 100%;
      }

      &::before {
        content: none !important;
      }
    }
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
  height: 28px;
  padding: 0;
  margin: 0;

  cursor: pointer;
}

@media screen and (max-width: 768px) {

  .collection-toc-area {
    & .tree li {
      & > .li.container {
        a {
          padding: 8px 10px;
        }
      }
      &.more {
        &[data-v-4782eec1] {
          padding-left: 5px !important;
        }
      }
    }
  }

    button.toc-toggle {
    width: 25px;
    height: 22px;
  }
}

.resources-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 30px;
}
.toc-mode .document-card {
  display: flex;
  flex-direction: column;
  min-height: 580px;
  height: auto;

  border-bottom-right-radius: 18px;
}
.toc-mode .card-header {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.toc-mode .document-card.expanded {
  display: flex;
  flex-direction: column;
  height: fit-content;

  border-bottom-right-radius: 18px;
  margin: 15px;
}
.toc-mode .card-link {
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: inherit;
  border-bottom-right-radius: inherit;
}
.toc-mode .card-image {
  height: 180px;
  flex-shrink: 0;
  overflow: hidden;
  background: var(--fill-color);
  display: flex;
  align-items: center;
  justify-content: center;
}

.toc-mode .card-image img {
  max-height: 100%;
  max-width: 100%;
}
.toc-mode .collection-metadata {
  display: flex;
  flex-direction: column;
  color: white;
  background: black;
}
.toc-mode .collection-metadata-author-date {
  display: flex;
  flex-direction: column;
  padding-left: 18px;
  padding-right: 18px;
  padding-top: 5px;
  padding-bottom: 5px;
  line-height: 1.3;
  word-break: break-word;
}
.toc-mode .collection-metadata-title {
  display: block;
  padding-left: 18px;
  padding-right: 18px;
  padding-top: 5px;
  padding-bottom: 5px;
  font-family: var(--font-primary), sans-serif;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.3;
  word-break: break-word;
}
.toc-mode .collection-description {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 18px;
  color: #333333;
  background: var(--meta-area-fill-color);
  /* overflow: hidden; */
}
.toc-mode .collection-description-text {
  --line-clamp: 11;

  display: -webkit-box;
  -webkit-line-clamp: var(--line-clamp);
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.toc-mode .collection-description.expanded .collection-description-text {
  display: block;
  height: 100%;
  overflow: unset;
  margin-bottom: 18px;
}
.toc-mode .collection-description-text::before {
  content: '';
  float: right;
  height: calc(min((var(--line-clamp) - 1) * 1lh, 100%));
}
.toc-mode .collection-description.expanded .collection-description-text::before {
  height: 100%;
}
.toc-mode .collection-description-text > .read-more {
  clear: both;
  float: right;
  font-weight: 600;
  margin-left: 0.5em;
  cursor: pointer;
}
.toc-mode > .menu.expanded ul.tree li.more a {
  padding: 15px 5px 13px 8px;
}
.toc-mode > .menu.expanded {
  padding: 0;
  background: var(--default-bg-color);
}

/*.collection-description-text:not(.truncated) > .read-more {
  display: none;
}*/

/* Mode activation */
.card-mode.resources-grid {
  display: grid !important;
  grid-template-columns: repeat(3, 1fr);
  gap: 30px;
}

/* Cards */
.card-mode .document-card {
  display: flex;
  flex-direction: column;
  min-height: 580px;
  height: auto;
  border-bottom-right-radius: 18px;
}

.card-mode .document-card.expanded {
  display: flex;
  flex-direction: column;
  height: fit-content;
  border-bottom-right-radius: 18px;
  margin: 15px;
}

/* Header */
.card-mode .card-header {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-bottom-right-radius: 18px;
  box-shadow: unset;
}

.card-mode .card-header:hover {
  box-shadow:0 0 20px 0 rgba(0, 0, 0, 0.25);
}

/* Link */
.card-mode .card-link {
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: inherit;
  border-bottom-right-radius: inherit;
}

.card-mode .card-link.clickable {
  cursor: pointer;
}

.card-mode .card-link.disabled {
  cursor: default;
  opacity: 0.7;
}

/* Image */
.card-mode .card-image {
    position: relative;
    display: block;
    background: var(--fill-color);
    width: 100%;
    padding-bottom: 65%;

    img {
      position: absolute;
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
    }
    .collection-svg {
      position: absolute;
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
      object-position: center;
      color: var(--fill-color);
      background-color: var(--fill-color);
    }

    .collection-component {
      position: absolute;
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
      object-position: center;
      color: var(--fill-color);
      background-color: var(--fill-color);
    }
}


/* Metadata */

.card-mode .collection-wrapper {
  height: 100%;
}

.card-mode .card-header {
  background: var(--default-bg-color) !important;
}

.card-mode .collection-metadata-author-date-title,
.card-mode .collection-description {
  padding: 20px 25px 30px;
}
.card-mode .collection-metadata-author-date-title {
  width: 100%;
  background-color: #000;

  & > span {
    display: block;
    font-size: 16px;
    color: #FFF;
  }

  & > span + div.collection-metadata-title {
    margin-top: 10px;
  }

  & > div.collection-metadata-title {
    display: block;
    font-weight:700;
    font-size:24px;
    line-height: 1.2;
    color: #FFF;
  }
}
.card-mode .collection-description {
  width: 100%;
  padding-top: 20px;
  text-transform: none;
}
.card-mode .collection-metadata {
  display: flex;
  flex-direction: column;
  color: white;
  background: black;
}

/* Description */
.card-mode .collection-description {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding-top: 20px;
  border-bottom-right-radius: 18px;
  color: #333333;
  /*overflow: hidden*/;
  text-transform: none;
}

.card-mode .collection-description.expanded > .read-more,
.card-mode .collection-description.truncated > .read-more {
  display: block;
  margin-top: 18px;
}

.card-mode .collection-description > .read-more {
  display: none;
  font-weight: 600;
  cursor: pointer;
}

.card-mode .collection-description-text {
  --line-clamp: 11;
  display: -webkit-box;
  -webkit-line-clamp: var(--line-clamp);
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-mode .collection-description.expanded .collection-description-text {
  display: block;
  overflow: unset;
}

.card-mode .collection-description-text::before {
  content: '';
  float: right;
  height: calc(min((var(--line-clamp) - 1) * 1lh, 100%));
}

.card-mode .collection-description.expanded .collection-description-text::before {
  height: 100%;
}

.mixed-mode.resources-grid {
  display: flex;
  flex-direction: column;
}

/* With no colour of its own the caret inherits the <button>'s, which
   Safari iOS paints system blue where others paint it black. TocArrows
   cannot help: its fgColor defaults to var(--icon-fg), a variable defined
   nowhere. Hence the hardcoded black. */
:deep(button.toc-toggle svg) {
  color: #000000;
}

.resource-icon,
.collection-icon {
  color: var(--fill-color);
  width: 30px;
  height: 30px;
}

/* Card */
.mixed-mode .document-card {
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 100%;
  margin: 20px 0;
}

.mixed-mode .document-card.expanded {
  display: flex;
  flex-direction: column;
  height: fit-content;
  border-bottom-right-radius: 18px;
  margin: 15px;
}

/* Wrapper gauche */
.mixed-mode .collection-wrapper {
  display: flex;
  flex-direction: column;
  width: 30%;
  margin-right: 20px;
  background-color: var(--fill-color) !important;
  border-radius: 25px 25px 0 25px;

  color: white;
}

.mixed-mode .collection-wrapper .collection-toc-area {
  background-color: var(--default-bg-color);
}

/* Header */
.mixed-mode .card-header {
  display: flex;
  flex-direction: column;
  height: 100%;
  text-align: left;
  background-color: transparent !important;
}

/* Metadata */
.mixed-mode .collection-metadata {
  display: flex;
  flex-direction: column;
}

.mixed-mode .collection-metadata-title {
  display: block;
  padding: 18px;
  font-family: var(--font-primary), sans-serif;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.3;
  word-break: break-word;
}

/* Description */
.mixed-mode .collection-description {
  display: flex;
  height: 100%;
  padding: 18px;
}

/* TOC */
.mixed-mode .toc-wrapper {
  width: 100%;
  padding: 18px;
  border-top-left-radius: 25px;
  background-color: #e4e4e4;
}
.mixed-mode .card-link.clickable {
  cursor: pointer;
}

.mixed-mode .card-link.disabled {
  cursor: default;
  opacity: 0.7;
}

.mixed-mode .expanded.menu {
  background: none;
  border-radius: 0;
  padding: 0;
}

.mixed-mode .collection-toc-area .menu.expanded,
.mixed-mode .collection-toc-area .app-width-margin {
  padding: 0;
}

.mixed-mode .collection-toc-area .menu.expanded ul.tree {
  margin: 0;
  padding: 0;
  list-style-type: none;
  border-bottom: 4px solid #FFFFFF;
}

.collection-toc-area .menu.expanded ul.tree li:not(:last-of-type),
.collection-toc-area .menu.expanded ul.tree:not(:last-of-type) {
  border-bottom: 4px solid #FFFFFF;
}

.collection-toc-area .menu.expanded ul.tree li.more li,
.collection-toc-area .menu.expanded ul.tree:first-child:last-child {
  border-bottom: none !important;
}

.collection-toc-area .menu.expanded ul.tree li {
  margin-bottom: 0;
  margin-left: 0 !important;
}

.collection-toc-area .menu.expanded ul.tree li.more > .li.container > a:hover::before,
.collection-toc-area .menu.expanded ul.tree li a:hover {
  background: var(--default-bg-hover-color);
}

.collection-toc-area .menu.expanded {
  padding: 0;
}

.collection-toc-area .menu.expanded ul.tree li ul.tree {
  margin-left: 50px;
}


.mixed-mode .collection-toc-area .menu.expanded ul.tree li {
  &.more {
    & > .li.container > a {
      position: relative;
      z-index: 1;

      &::before {
        content: "";
        position: absolute;
        left: 0;
        transform: translateX(-100%);
        display: block;
        width: 60px;
        height: 100%;
      }
    }
  }
}

.mixed-mode .collection-toc-area .menu.expanded ul.tree li.more a {
  padding-left: 5px;
}

.mixed-mode .collection-toc-area .menu.expanded ul.tree li.more li:not(.more) a {
  padding-left: 0;
}

.mixed-mode .collection-toc-area .menu.expanded ul.tree li a {
  width: 100%;
  padding: 13px 30px 11px;
}


.collection-toc-area .menu.expanded ul.tree li a {
  font-family: var(--font-primary), sans-serif;
  font-weight: 400;
  font-size: var(--font-toc-metadata-size);
  color: #080808;
}

.collection-toc-area .menu.expanded ul.tree li a .icon-wrapper {
  color: var(--fill-color);
  margin-right: 5px;
  align-self: flex-start;
}

.collection-toc-area .menu.expanded ul.tree li.more li .icon-wrapper {
  color: #8E8E8E;
}

.collection-toc-area .menu.expanded ul.tree li.more li a {
  padding-top: 8px;
  padding-bottom: 6px;
}

/* useless items in mixed mode */
.mixed-mode .card-image,
.mixed-mode .collection-metadata-author-date,
.mixed-mode .read-more {
  display: none !important;
}

.mixed-mode .toc-mode .card-link { display: block !important; }

.mixed-mode .toc-mode .collection-toc-area .menu.expanded > div > ul.tree {
  border-bottom: none;
}

/* Chrome, Safari, Edge, Opera */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* Firefox */
input[type=number] {
  -moz-appearance: textfield;
}


@media screen and (max-width: 1024px) {
  .card-mode.resources-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media screen and (max-width: 640px) {

  .card-mode .collection-metadata-author-date-title,
  .card-mode .collection-description {
    padding: 20px var(--mobile-margin) 30px;
  }

  .card-mode.resources-grid {
    grid-template-columns: repeat(1, 1fr);
  }

  .toc-mode.document-list .collection-toc-area.app-width-margin {
    padding: 0;
  }

  .collection-toc-area-header > a {
    padding: 30px var(--mobile-margin) 0;
    font-size: 18px;
  }

  .toc-mode .collection-toc-area-header {
    padding: 20px 15px;

    & > a {
      padding: 0;
    }
  }
  .toc-mode.collection-toc-area.expanded .toggle-btn, .toggle-btn.expanded {
    background-size: calc(var(--button-size) * 0.65) auto;
  }
  .mixed-mode .collection-toc-area .menu.expanded ul.tree li a {
    padding: 13px var(--mobile-margin) 11px;
  }
}

</style>
