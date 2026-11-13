<template>
  <!-- PAGINATION TOP -->
  <div
    class="pagination has-text-centered is-flex is-flex-direction-row is-justify-content-center"
  >
    <Pagination
      v-model="currentPage"
      :total-pages="totalPages"
      :documents-count-text="documentsCountText"
    />
  </div>
  <div
    v-if="paginated.length && (displayOpt === 'mixed' && displayMode === 'mixed')"
    class="resources-grid"
    :class="displayMode !== 'toc' ? `${displayMode}-mode` : 'toc-mode'"
  >
    <div
      v-for="item in paginated"
      :key="item.identifier"
      class="document-card collection-card-with-toc-component"
    >
      <template v-if="item['@type'] === 'Collection' || item.citeType === 'Collection'">
        <div class="dots-ui collection-wrapper">
          <div
            v-if="true"
            class="card-header"
          >
            <div
              class="card-link"
              :class="{ clickable: canNavigate(item), disabled: !canNavigate(item) }"
              @click="handleClick(item)"
            >
              <div class="card-image">
                <img
                  v-if="ImgUrl(item.identifier)"
                  :src="ImgUrl(item.identifier)"
                  alt=""
                />
                <img
                  v-else
                  src="@/assets/images/dots-logo-retro.drawio.svg"
                  alt=""
                />
              </div>
              <div class="collection-metadata">
                <div class="collection-metadata-author-date">
                  <span>
                    {{ Array.isArray(item.dublinCore.creator)
                      ? item.dublinCore.creator.join(', ')
                      : item.dublinCore.creator }}
                  </span>
                  <span>{{ item.dublinCore.date }}</span>
                </div>
                <div class="collection-metadata-title">
                  <CollectionIcon
                    class="card-title-icon"
                    fg-color="#FFFFFF"
                    bg-color="transparent"
                    :size="30"
                    :radius="0"
                  />
                  <span>{{ item.title }}</span>
                </div>
              </div>
            </div>
            <div
              class="collection-description"
            >
              <span
                class="collection-description-text"
              >
                {{ item.description }}
              </span>
            </div>
          </div>
        </div>
        <div
          class="collection-toc-area"
          :class="expandedById[item.identifier] ? 'expanded': ''"
        >
          <div
            class="collection-toc-area-header"
          >
          </div>
          <div
            v-if="(expandedById[item.identifier] || item.expanded)
              && item.totalChildren > 0
              && item.children?.length > 0"
            class="menu app-width-margin expanded"
          >
            <CollectionTOC
              :is-doc-project-id-included="isDocProjectIdInc"
              :display-option="'toc'"
              :current-collection="item"
              :dts-root-collection-identifier="dtsRootCollectionId"
              :root-collection-identifier="rootCollectionId"
              :application-config="appConfig"
              :collection-config="collConfig"
              :toc="item.children"
              :level="lvl+1"
            />
          </div>
        </div>
      </template>
      <!-- ELSE resource is a resource of type (@type / citeType) resource  -->
      <template v-else>
        <!-- Same left card as a collection, the whole card opens the document; no TOC on the right -->
        <div class="dots-ui collection-wrapper resource-card">
          <div class="card-header">
            <router-link
              class="card-link clickable"
              :to="!isDocProjectIdInc ? { name: 'Document', params: { id: item.identifier }} : { name: 'Document', params: { collId: item.projectIdentifier ? item.projectIdentifier : item.identifier, id: item.identifier } }"
            >
              <div class="collection-metadata">
                <div class="collection-metadata-title has-link-icon">
                  <span class="card-title-text">
                    <ResourceIcon
                      class="card-title-icon"
                      fg-color="#FFFFFF"
                      bg-color="transparent"
                      :size="30"
                      :radius="0"
                    />
                    <span>{{ item.title }}</span>
                  </span>
                  <!-- Marks the card as a live link to the document: own column on the right, facing the first line -->
                  <ResourceLinkIcon
                    class="card-title-icon card-title-link-icon"
                    fg-color="#FFFFFF"
                    bg-color="transparent"
                    :size="30"
                    :radius="0"
                  />
                </div>
              </div>
              <div
                v-if="item.description"
                class="collection-description"
              >
                <span class="collection-description-text">
                  {{ item.description }}
                </span>
              </div>
            </router-link>
          </div>
        </div>
      </template>
    </div>
  </div>
  <!-- PAGINATION BOTTOM -->
  <div
    v-if="totalPages > 1"
    class="pagination has-text-centered is-flex is-flex-direction-row is-justify-content-center"
  >
    <Pagination
      v-model="currentPage"
      :total-pages="totalPages"
      documents-count-text=""
    />
  </div>
</template>
<script>
import { ref, watch, nextTick, computed } from 'vue'
import { useRoute } from 'vue-router'
import { getAncestors, getMetadataFromApi } from '@/api/document.js'
import store from '@/store'
import { router } from '@/router'

import CollectionTOC from '@/components/CollectionTOC.vue'
import CollectionIcon from '@/assets/images/CollectionIcon.vue'
import ResourceIcon from '@/assets/images/ResourceIcon.vue'
import ResourceLinkIcon from '@/assets/images/ResourceLinkIcon.vue'
import Pagination from '@/components/Pagination.vue'
import { usePagination } from '@/composables/usePagination'
import { getSimpleObject } from '@/composables/utils.js'

const collator = new Intl.Collator('fr', {
  numeric: true,
  sensitivity: 'base'
})

export default {
  name: 'CollectionCardWithToc',

  components: { Pagination, CollectionTOC, CollectionIcon, ResourceIcon, ResourceLinkIcon },

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

    const displayOpt = computed(() =>
        props.applicationConfig?.homePageSettings?.listSection?.displayMode?.length > 0
        ? props.applicationConfig.homePageSettings.listSection.displayMode
        : props.displayOption
    )

    // TABLE OF CONTENT

    // TOC DATA
    const componentTOC = ref([...props.toc])

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

    const documentsCountText = computed(() => {
      const ds = componentTOC.value || []
      const curr = currCollection.value
      const rootId = rootCollectionId.value
      const display = displayOpt.value

      if (!ds.length) return '0 ressources'

      const plural = (n, one, many) => `${n} ${n <= 1 ? one : many}`

      if ((display === 'card' || display === 'mixed') && curr?.identifier === rootId) {
        return plural(ds.length, 'projet', 'projets')
      }

      // A project can hold collections and resources side by side: count each kind
      const collections = ds.filter(
        item => item.type === 'Collection' || item['@type'] === 'Collection' || item.citeType === 'Collection'
      ).length
      const resources = ds.length - collections

      return [
        collections ? plural(collections, 'collection', 'collections') : '',
        resources ? plural(resources, 'ressource', 'ressources') : ''
      ].filter(Boolean).join(', ')
    })

    // TOC ACTIONS AND NAVIGATION
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

    const ImgUrl = (source) => {
      // TODO: provide a logo object with url AND legend ?
      const imgSourceConfig = appConfig.value.collectionsConf.filter(coll => coll.collectionId === source)[0]
      if (imgSourceConfig?.homePageSettings?.listSection?.logo?.length > 0) {
        const images = Object.fromEntries(Object.entries(import.meta.glob('confs/*/assets/images/*.*', { eager: true })).map(([key, value]) => {
          const newKey = key.split('/').slice(-4).join('/')
          return [newKey, value]
        }))
        const match = images[`${imgSourceConfig.collectionId}/assets/images/${imgSourceConfig.homePageSettings.listSection.logo}`]
        if (imgSourceConfig.homePageSettings.listSection.logo.includes('https')) {
          return imgSourceConfig.homePageSettings.listSection.logo
        } else {
          return match.default // new URL(`/src/assets/images/${imgSourceConfig.homePageSettings.logo}`, import.meta.url).href
        }
      } else {
        return false
      }
    }

    // TOC MODE NAV
    // TOC MODE GET ROW LINK TO DISPLAY
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
        // A new list (e.g. a home filter) may have fewer pages than the one shown
        currentPage.value = 1
        if ((!currCollection.value?.parent?.length && displayOpt.value === 'mixed' && displayMode.value !== 'toc') || displayOpt.value === 'mixed' && displayMode.value === 'toc') {
          componentTOC.value.forEach(c => c.forcedDisplayOpt = 'toc')
        }
      },
      { immediate: true }
    )

    return {
      isDocProjectIdInc,
      displayOpt,
      displayMode,
      lvl,
      dtsRootCollectionId,
      rootCollectionId,
      appConfig,
      collConfig,
      ImgUrl,
      expandedById,
      canNavigate,
      handleClick,
      currentPage,
      totalPages,
      paginated,
      documentsCountText
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
  box-sizing: border-box;
}

button.toc-toggle {
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

  color: var(--fill-color);

  cursor: pointer;
}

@media screen and (max-width: 768px) {
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

.mixed-mode.resources-grid {
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
}

/* Card */
.mixed-mode .document-card {
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 100%;
  margin: 20px 0;
}

.mixed-mode .document-card:first-child {
  margin-top: 0;
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
  margin-right: 10px;

  flex: 432px 0 0;
  border-radius: 30px 30px 0 30px;
  align-self: flex-start;
  padding: 30px 45px 45px 30px;
  background: var(--fill-color) !important;
  box-shadow: none;
}

/* A resource card has no TOC to join on its right: round every corner */
.mixed-mode .collection-wrapper.resource-card {
  border-radius: 30px;
}

/* Collection / resource icon inline before the title: the next lines wrap under it, not indented */
.mixed-mode .card-title-icon {
  display: inline-flex;
  width: 30px;
  height: 30px;
  margin-right: 10px;
  vertical-align: -5px;
}

/* In a resource card the description sits inside the link, so .card-link + .collection-description no longer applies */
.mixed-mode .resource-card .card-link .collection-description {
  margin-top: 20px;
}

/* Title text and link icon side by side: the icon keeps its own right column, facing the first line */
.mixed-mode .card-header .collection-metadata .collection-metadata-title.has-link-icon {
  display: flex;
  align-items: flex-start;
}

.mixed-mode .card-title-link-icon {
  margin-right: 0;
  margin-left: auto;
  margin-top: 2px;
  padding-left: 10px;
  box-sizing: content-box;
  flex-shrink: 0;
}

/* CollectionIcon greys itself under any .disabled ancestor, and a non-clickable card-link is .disabled */
.mixed-mode .card-link.disabled .card-title-icon {
  background-color: transparent;
}

.mixed-mode .card-header .collection-metadata .collection-metadata-title {
  display: block;
  font-family: var(--font-primary), sans-serif;
  font-weight: 700;
  font-size: 24px;
  color: #FFF;
}

.mixed-mode .collection-toc-area {
  border-radius: 42px 0 0 0;
  background-color: var(--default-bg-color);
}

/* Header */
.mixed-mode .card-header {
  display: flex;
  flex-direction: column;
  height: 100%;
  text-align: left;
  background: none !important;
  box-shadow: none !important;
  border-radius: 0;
}

/* Metadata */
.mixed-mode .collection-metadata {
  display: flex;
  flex-direction: column;
}

/* Description */
.mixed-mode .collection-description {
  display: flex;
  height: 100%;
  font-size: 18px;
  color: #FFFFFF;
}
.mixed-mode .card-link + .collection-description {
  margin-top: 20px;
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
}

.mixed-mode .collection-toc-area-header {
  display: block;
  padding: 30px 30px 0;
  margin-bottom: 10px;
  background: none;
}

.mixed-mode .expanded.menu {
  background: none;
  border-radius: 0;
  padding: 0;
}

/* useless items in mixed mode */
.mixed-mode .card-image,
.mixed-mode .collection-metadata-author-date,
.mixed-mode .read-more {
  display: none !important;
}

.mixed-mode .toc-mode .card-link { display: block !important; }

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



@media screen and (max-width: 768px) {

  .mixed-mode .collection-toc-area-header {
    padding: 30px var(--mobile-margin) 0;
  }

  .mixed-mode.resources-grid {
    gap: 25px;
  }

  .mixed-mode .document-card {
    flex-direction: column;
    margin-top: 0;
    margin-bottom: 0;
  }

  .mixed-mode .collection-wrapper {
    flex: 100% 0 0;
    border-radius: 15px 15px 0 0;
    align-self: unset;
    margin-right: 0;
    padding: 25px 35px 30px 20px;
  }
  .mixed-mode .collection-toc-area {
    padding-bottom: 50px;
    border-radius: 0 0 30px 0;
  }
}

</style>
