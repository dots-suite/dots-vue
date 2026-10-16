<template>
  <div class="dots-ui collection-wrapper">
    <CollectionHeader
      :collection-config="collConfig"
      :application-config="appConfig"
      :current-collection="currCollection"
      :collection-identifier="collectionId"
      :root-collection-identifier="rootCollectionId"
      :show-about="true"
    />
    <div
      class="document-list app-width-margin"
      :class="displayOpt + '-mode'"
    ><!--:class="isAboutOpened ? `is-about-opened ${displayOpt}-mode` : `${displayOpt}-mode`"-->
      <div
        v-if="appState === 'error'"
        class="app-banner app-width-margin"
        role="alert"
      >
        <span class="app-banner__text">
          Les données ne peuvent pas être chargées pour le moment.
        </span>
        <button
          class="app-banner__retry"
          type="button"
          @click="reload"
        >
          Réessayer
        </button>
        <pre
          v-if="isDev && appError"
          class="app-banner__debug"
        >{{ appError.url || '' }} {{ appError.message }}</pre>
      </div>
      <div v-else>
        <CollectionTOC
          v-if="displayOpt !== 'list' && displayOpt !== 'mixed'"
          :is-doc-project-id-included="isDocProjectIdInc"
          :display-option="displayOpt"
          :current-collection="currCollection"
          :dts-root-collection-identifier="dtsRootCollectionId"
          :root-collection-identifier="rootCollectionId"
          :application-config="appConfig"
          :collection-config="collConfig"
          :toc="componentTOC"
          :level="1"
        />
        <CollectionCardWithToc
          v-if="displayOpt === 'mixed'"
          :is-doc-project-id-included="isDocProjectIdInc"
          :display-option="displayOpt"
          :current-collection="currCollection"
          :dts-root-collection-identifier="dtsRootCollectionId"
          :root-collection-identifier="rootCollectionId"
          :application-config="appConfig"
          :collection-config="collConfig"
          :toc="componentTOC"
          :level="1"
        />

        <!-- RESOURCE LIST AS LIST OR TOC (conf: homePageSettings.listSection.displayMode = 'list' or 'toc' or unset) -->
        <ResourcesList
          v-else-if="displayOpt === 'list'"
          :data="dataSource"
          :columns-config="columns"
          :page-size="pageSize"
          :is-doc-project-id-included="isDocProjectIdInc"
          :is-table-loading="isTableLoading"
          :counts="resultCount"
        />

      </div>
    </div>
  </div>
</template>

<script>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'

import { getMetadataFromApi } from '@/api/document.js'
import { fetchIndexedCollectionResources } from '@/composables/use-simple-search'
import { walkPath } from '@/composables/useTable.js'
import ResourcesList from '@/components/ResourcesList.vue'
import CollectionTOC from '@/components/CollectionTOC.vue'
import { getSimpleObject } from '@/composables/utils.js'
import CollectionCardWithToc from '@/components/CollectionCardWithToc.vue'
import CollectionHeader from '@/components/CollectionHeader.vue'

const collator = new Intl.Collator('fr', {
  numeric: true,
  sensitivity: 'base'
})

export default {
  name: 'HomePage',
  components: { CollectionHeader, CollectionCardWithToc, ResourcesList, CollectionTOC },
  props: {
    isDocProjectIdIncluded: {
      type: Boolean,
      required: true
    },
    appState: {
      type: String,
      default: 'ready'
    },
    appError: {
      type: Object,
      default: null
    },
    dtsRootCollectionIdentifier: {
      type: String,
      required: true
    },
    rootCollectionIdentifier: {
      type: String,
      required: true
    },
    collectionIdentifier: {
      type: String,
      required: true
    },
    applicationConfig: {
      type: Object,
      required: true
    },
    collectionConfig: {
      type: Object,
      required: true
    },
    currentCollection: {
      type: Object,
      required: true
    }
  },
  setup (props) {
    const state = reactive({
      isTreeOpened: false
    })

    const isDocProjectIdInc = computed(() => props.isDocProjectIdIncluded)
    const dtsRootCollectionId = computed(() => props.dtsRootCollectionIdentifier)
    const rootCollectionId = computed(() => props.rootCollectionIdentifier)
    const appConfig = computed(() => props.applicationConfig)
    const collConfig = computed(() => props.collectionConfig)
    console.log('HomePage.vue setup collConfig.value :', collConfig.value)

    const isAboutOpened = ref(false)

    const collectionId = computed(() => props.collectionIdentifier)

    const componentTOC = ref([])
    const currCollection = computed(() => props.currentCollection)

    const dataSource = ref([])
    const pageSize = computed(() =>
      props.collectionConfig?.homePageSettings?.listSection?.cardCollectionPerPage
    )

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


    const displayOpt = ref(props.collectionConfig?.homePageSettings?.listSection?.displayMode)

    const expandedById = ref([])

    const toggleExpanded = async (collId) => {
      if (componentTOC.value.length === 0) {
        const response = await getMetadataFromApi(collId, null, null)
        response.member.forEach(m => getSimpleObject(m, collId, currCollection.value?.projectIdentifier))

        // optional rest all resources to toc ?
        // if (response.member.every(el => el.citeType === 'Resource')) {
        //   displayOpt.value = 'toc'
        // }
        componentTOC.value = response.member

      }
      expandedById.value[collId] = !expandedById.value[collId]
      //state.isTreeOpened = !state.isTreeOpened

    }





    watch(
      () => collConfig.value?.homePageSettings?.listSection?.openState,
      async (openState) => {
        if (openState && !state.isTreeOpened) {
          await toggleExpanded(currCollection.value.identifier)
        }
      },
      { immediate: true }
    )

//     watch(
//   () => customCollectionDescription.value,
//   async (newVal) => {
//     if (!newVal) {
//       customDescription.value = null
//       return
//     }
//
//     try {
//       customDescription.value = await getCustomHomeDescription()
//     } catch (e) {
//       console.error('Erreur chargement description:', e)
//       customDescription.value = null
//     }
//   },
//   { immediate: true }
// )
    const isDev = import.meta.env.DEV
    const reload = () => window.location.reload()

    watch(
  () => props.currentCollection,
  (newVal) => {
    // {} is the ref default and is truthy: guard on member, not on newVal.
    if (!newVal?.member) return
    let result
    //componentTOC.value = []

    if (collConfig.value?.homePageSettings?.listSection?.displaySort?.length > 0) {
      result = customSort(newVal.member, collConfig.value.homePageSettings.listSection.displaySort)
    } else {
      result = [...newVal.member].sort((a, b) =>
        collator.compare(a.title, b.title)
      )
    }

    componentTOC.value.splice(0, componentTOC.value.length, ...result)
    // optional rest all resources to toc ?
    // if (componentTOC.value.every(el => el.citeType === 'Resource')) {
    //   displayOpt.value = 'toc'
    // }
  },
  { deep: true, immediate: true }
)


    // LIST DATA (FETCH ALL RESOURCES)
    let currentRunId = 0
    const isTableLoading = ref(true)
    const resultCount = ref(0)

    // Sibling collections are fetched concurrently: their latencies used to add
    // up, one sequential round trip per sub-collection down the whole tree.
    const listOfResources = async (items, runId) => {
      if (!Array.isArray(items)) return []

      const parts = await Promise.all(items.map(async item => {
        if (runId !== currentRunId) return []

        const type = item.type || item.citeType || item['@type']

        // if RESOURCE → push to results
        if (type === 'Resource') {
          resultCount.value += 1
          return [item]
        }

        // if COLLECTION → get descendants
        if (type === 'Collection') {
          const collId = item.identifier || item['@id']
          const projectId = item.projectIdentifier

          try {
            const response = await getMetadataFromApi(collId, null, null)

            const members = response.member.map(m => ({
              ...m,
              identifier: m.identifier ?? m['@id'],
              parent: m.parent ?? collId,
              projectIdentifier: m.projectIdentifier ?? projectId
            }))

            // recursive descendants loop
            return await listOfResources(members, runId)
          } catch (e) {
            console.error('HomePage listOfResources erreur API collection', collId, e)
          }
        }

        return []
      }))

      // flat() preserves the declared order of the members
      return parts.flat()
    }

    const columns = computed(() => {
      if (
        displayOpt.value === 'list' &&
        props.collectionConfig?.homePageSettings?.listSection?.columns?.length > 0
      ) {
        return props.collectionConfig.homePageSettings.listSection.columns
      }
      return []
    })

    // A search hit already carries the metadata a list needs, so one call to the
    // index replaces walking the collection tree. Only collections that open a
    // search page are eligible, and the DTS walk stays the fallback: the index
    // may not hold this collection, or may not hold a column the settings ask for.
    const isSearchable = computed(() =>
      (collConfig.value?.customRoutes || []).some(route => route.path === 'search')
    )

    const asListRow = item => ({
      ...item,
      identifier: item.id ?? item.resource_id,
      parent: item.parent_id,
      projectIdentifier: item.path_ids?.[0] ?? item.parent_id
    })

    const coversColumns = rows =>
      columns.value.every(column =>
        rows.some(row => walkPath(row, column.key) != null)
      )

    const listFromSearch = async (collId, runId) => {
      if (!isSearchable.value || !collId) return null

      try {
        const items = await fetchIndexedCollectionResources(collId)
        if (runId !== currentRunId) return null
        if (items === null) return null

        const rows = items.map(asListRow)

        if (rows.length && !coversColumns(rows)) return null

        resultCount.value = rows.length
        return rows
      } catch (e) {
        console.error('HomePage listFromSearch, repli sur l\'API DTS', collId, e)
        return null
      }
    }

    watch(
    () => [componentTOC.value, displayOpt.value],
    async () => {
        currentRunId++
        const runId = currentRunId
        resultCount.value = 0


        let base = componentTOC.value || []

        if (displayOpt.value === 'list') {
          base = await listFromSearch(collectionId.value, runId)
            ?? await listOfResources(base, runId)
        } else {
          base = [...base]
        }

        if (collConfig.value?.homePageSettings?.listSection?.displaySort?.length > 0) {
          base = customSort(base, collConfig.value.homePageSettings.listSection.displaySort)
        } else {
          base = [...base].sort((a, b) => collator.compare(a.title, b.title))
        }
        if (runId !== currentRunId) return


        dataSource.value = base
        isTableLoading.value = false
      },{ immediate: true }
    )

    onBeforeUnmount(() => {
      currentRunId++
    })

    return {
      isDev,
      reload,
      appConfig,
      collConfig,
      isDocProjectIdInc,
      dtsRootCollectionId,
      rootCollectionId,
      collectionId,
      currCollection,
      componentTOC,
      displayOpt,
      isAboutOpened,
      columns,
      pageSize,
      dataSource,
      resultCount,
      isTableLoading
    }
  }
}
</script>
<style scoped>
.collection-wrapper {
  width: 100%;
}
.collection-list {
  --first-column-width: 70%;
  /*margin-bottom: 60px;*/
}
/*.collection-list.is-about-opened {
  --first-column-width: 70%;
  margin-bottom: 0;
}*/

.home-article-wrapper {
  padding: 40px 10% 120px;
  border-bottom: 1px dotted #ffffff;
}
.home-article-wrapper {
  width: calc(var(--first-column-width) );
  margin: 0 0 30px !important;
  padding: 45px !important;
  background-color: var(--default-bg-color);
}
#home-article.article {
  margin-bottom: 20px;
}

#home-article.article + a {
  color: var(--fill-color);
}

#home-article.article + a:hover {
  text-decoration: underline;
}

#home-article article {
  margin: 0;
}

#home-article h1 {
  margin: 0;
  padding-top: 20px;
  padding-bottom: 20px;

  font-family: var(--font-primary), sans-serif;
  font-size: 48px;
  font-weight: 700;
  line-height: 1.2;
  text-align: left;
  text-transform: none;
  color: #000;
}

.wrapper {
  width: 100%;
}
.collection-list.has-image:not(.has-banner) .page-header .wrapper {
  background: #FFFFFF;
  gap: 4px;
}

.page-header .wrapper > .tile {
  padding: 25px 45px;
}

.collection-list.has-banner .page-header .wrapper > .tile {
  background: #0f0f0f85;
}

.collection-list:not(.has-banner) .page-header .wrapper > .tile {
  background: #0f0f0f;
}
.collection-image {
  width: calc(100% - var(--first-column-width));
  height: 300px;
}

.collection-image-wrapper {
  width: 100%;
  height: 100%;
}
.banner-default.has-image .collection-component,
.banner-default.has-image .collection-image {
  border-bottom-right-radius: 52px;
  background-color: #FBF8F4;
}
.collection-list.root-collection-list .collection-image,
.collection-list:not(.root-collection-list) .tile.page-header {
  background: transparent;
}
.collection-list.banner-none.has-image .collection-image,
.collection-list.banner-default.has-image .collection-image {
  display: flex;
  align-items: center;
  justify-content: center;

  & > .collection-image-wrapper > img,
  .collection-component {
    display: block;
    width: 100% !important;
    height: 100% !important;
    object-fit: cover;
    object-position: center;
    border-bottom-right-radius: 52px;
    color: var(--fill-color);
    background-color: var(--fill-color);
  }
}

.collection-list.banner-none.image-component .collection-image,
.collection-list.banner-default.image-component .collection-image {
  display: flex;
  align-items: center;
  justify-content: center;

  & > .collection-image-wrapper > img,
  .collection-component {
    display: block;
    width: 100% !important;
    height: 100% !important;
    object-fit: cover;
    object-position: center;
    border-bottom-right-radius: 52px;
    color: var(--fill-color);
    background-color: var(--fill-color);
  }
}
.tile.article,
.tile.app-width-margin {
  position: relative;
  width: 100%;
}
.title-tile {
  display: flex;
  flex-direction: row;
  justify-content: center;
  width: 100%;
  border-radius: 6px;

  & > p {
    color: white !important;
  }
}
.project-tile {
  position: absolute;
  bottom: 0;
  left: 45px;
  z-index: 2;
  display: flex;
  width: fit-content;
  background-color: var(--fill-color);
  transform: translateY(50%);
}

.about-button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;

  background: transparent;
  border: none;
  border-radius: 0;
  cursor: pointer;

  padding: 6px 10px;
  font-family: var(--font-secondary), sans-serif;
  font-weight: 400;
  font-size: 16px;
  text-transform: uppercase;
  color: white;

  &:hover {
    background-color: #000000;
  }
}
.document-list {
  display: flex;
  justify-content: center;
  flex-direction: column;
  width: 100%;
  margin-top: 60px;
  padding-top: 25px;
  padding-bottom: 25px;
  box-sizing: border-box;

  &.is-about-opened {
    margin-top: 0;
  }
}
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.4s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  /* transform: translateY(-10px); */
}

.collection-about {
  min-height: 30px;
}

@media screen and (max-width: 768px) {
  .collection-about {
    background-color: var(--default-bg-color);
  }

  .collection-list {
    --first-column-width: 100% !important;
  }

  .collection-list:not(.root-collection-list) .page-header .wrapper {
    gap: 0 !important;
  }

  .collection-header.app-width-margin {
    padding: 0;
  }

  .collection-header.app-width-margin :deep(.home-content.app-width-padding) {
    padding: 0;
  }

  .pagination {
    flex-direction: column !important;
    justify-content: center;
  }

  .home-article-wrapper {
    padding: 34px !important;
  }

}

@media screen and (max-width: 640px) {
  .page-header .wrapper > .tile {
    padding: 25px var(--mobile-margin);
  }

  .project-tile {
    left: calc( 2 * var(--mobile-margin));
  }

  #home-article.article {
    padding: 12px var(--mobile-margin) 10px !important;
    margin-bottom: 0;
  }

  .home-article-wrapper {
    padding: 15px 0 !important;
  }

  #home-article h1 {
    padding: 15px 0 10px;
    font-size: 30px;
  }

  #home-article.article + a {
    padding: 0 var(--mobile-margin);
  }

}
</style>

<!--<style scoped>-->
<!--a {-->
<!--  border-bottom: none;-->
<!--}-->
<!--.collection-list {-->
<!--  &#45;&#45;first-column-width: 70%;-->
<!--}-->
<!--.home-article-wrapper {-->
<!--  padding: 40px 10% 120px;-->
<!--  border-bottom: 1px dotted #ffffff;-->
<!--}-->
<!--.home-article-wrapper {-->
<!--  width: calc(var(&#45;&#45;first-column-width) );-->
<!--  margin: 0 0 30px !important;-->
<!--  padding: 45px !important;-->
<!--  background-color: var(&#45;&#45;default-bg-color);-->
<!--}-->
<!--#home-article.article {-->
<!--  margin-bottom: 20px;-->
<!--}-->

<!--#home-article article {-->
<!--  margin: 0;-->
<!--}-->
<!--#home-article h1 {-->
<!--  margin: 0;-->
<!--  padding-top: 20px;-->
<!--  padding-bottom: 20px;-->

<!--  font-family: var(&#45;&#45;font-primary), sans-serif;-->
<!--  font-size: 48px;-->
<!--  font-weight: 700;-->
<!--  line-height: 1.2;-->
<!--  text-transform: none;-->
<!--  color: #000;-->
<!--}-->

<!--.wrapper {-->
<!--  width: 100%;-->
<!--}-->

<!--.collection-list.has-image:not(.has-banner) .page-header .wrapper {-->
<!--  background: #FFFFFF;-->
<!--  gap: 4px;-->
<!--}-->

<!--.page-header .wrapper > .tile {-->
<!--  padding: 25px 45px;-->
<!--}-->

<!--.collection-list.has-banner .page-header .wrapper > .tile {-->
<!--  background: #0f0f0f85;-->
<!--}-->

<!--.collection-list:not(.has-banner) .page-header .wrapper > .tile {-->
<!--  background: #0f0f0f;-->
<!--}-->

<!--.collection-image {-->
<!--  width: calc(100% - var(&#45;&#45;first-column-width));-->
<!--  height: 330px;-->
<!--}-->

<!--.collection-image-wrapper {-->
<!--  width: 100%;-->
<!--  height: 100%;-->
<!--}-->
<!--.banner-default.has-image .collection-component,-->
<!--.banner-default.has-image .collection-image {-->
<!--  border-bottom-right-radius: 52px;-->
<!--  background-color: #FBF8F4;-->
<!--}-->
<!--/* still needed ? */-->
<!--.collection-list.root-collection-list .collection-image,-->
<!--.collection-list:not(.root-collection-list) .tile.page-header {-->
<!--  background: transparent;-->
<!--}-->

<!--.collection-list.banner-none.has-image .collection-image,-->
<!--.collection-list.banner-default.has-image .collection-image {-->
<!--  display: flex;-->
<!--  align-items: center;-->
<!--  justify-content: center;-->
<!--  & > .collection-image-wrapper > img, .collection-component {-->
<!--    display: block;-->
<!--    width: 100% !important;-->
<!--    height: 100% !important;-->
<!--    object-fit: cover;-->
<!--    object-position: center;-->
<!--    border-bottom-right-radius: 52px;-->
<!--    color: var(&#45;&#45;fill-color);-->
<!--    background-color: var(&#45;&#45;fill-color);-->
<!--  }-->
<!--}-->

<!--.collection-list.banner-none.image-component .collection-image,-->
<!--.collection-list.banner-default.image-component .collection-image {-->
<!--  display: flex;-->
<!--  align-items: center;-->
<!--  justify-content: center;-->
<!--  & > .collection-image-wrapper > img, .collection-component {-->
<!--    display: block;-->
<!--    width: 100% !important;-->
<!--    height: 100% !important;-->
<!--    object-fit: cover;-->
<!--    object-position: center;-->
<!--    border-bottom-right-radius: 52px;-->
<!--    color: var(&#45;&#45;fill-color);-->
<!--    background-color: var(&#45;&#45;fill-color);-->
<!--  }-->
<!--}-->

<!--.tile.article,-->
<!--.tile.app-width-margin {-->
<!--  position: relative;-->
<!--  width: 100%;-->
<!--}-->

<!--.title-tile {-->
<!--  display: flex;-->
<!--  flex-direction: row;-->
<!--  justify-content: center;-->
<!--  width: 100%;-->
<!--  border-radius: 6px;-->

<!--  & > p {-->
<!--      color: white !important;-->
<!--  }-->
<!--}-->

<!--.project-tile {-->
<!--  position: absolute;-->
<!--  bottom: 0;-->
<!--  left: 45px;-->

<!--  display: flex;-->
<!--  width: fit-content;-->
<!--  background-color: var(&#45;&#45;fill-color);-->
<!--  transform: translateY(50%);-->
<!--}-->

<!--.about-button {-->
<!--  display: flex;-->
<!--  align-items: center;-->
<!--  justify-content: space-between;-->
<!--  gap: 8px;-->

<!--  padding: 6px 10px;-->
<!--  font-family: var(&#45;&#45;font-secondary), sans-serif;-->
<!--  font-weight: 400;-->
<!--  font-size: 16px;-->
<!--  text-transform: uppercase;-->
<!--  color: white;-->

<!--  &:hover {-->
<!--    background-color: #000000;-->
<!--  }-->
<!--}-->

<!--.document-list {-->
<!--  display: flex;-->
<!--  justify-content: center;-->
<!--  flex-direction: column;-->
<!--  width: 100%;-->
<!--  margin-top: 60px;-->
<!--  padding-top: 25px;-->
<!--  padding-bottom: 25px;-->
<!--  &.is-about-opened {-->
<!--    margin-top: 0;-->
<!--  }-->
<!--}-->

<!--.no-dts-description {-->
<!--  margin: 25px auto 25px;-->
<!--}-->

<!--/* Chrome, Safari, Edge, Opera */-->
<!--input::-webkit-outer-spin-button,-->
<!--input::-webkit-inner-spin-button {-->
<!--  -webkit-appearance: none;-->
<!--  margin: 0;-->
<!--}-->

<!--.collection-header {-->
<!--  min-height: 30px;-->
<!--}-->

<!--.collection-header :deep(.home-content) {-->
<!--  font-family: var(&#45;&#45;font-primary), sans-serif;-->
<!--  font-weight: normal;-->
<!--  line-height: 1.4;-->
<!--  color: var(&#45;&#45;default-text-color);-->

<!--  a {-->
<!--    color: var(&#45;&#45;default-text-color);-->
<!--    text-decoration: underline;-->

<!--    &:hover {-->
<!--      color: var(&#45;&#45;text-color);-->
<!--    }-->
<!--  }-->
<!--  p, ul {-->
<!--    margin-bottom: 10px;-->
<!--  }-->
<!--  li {-->
<!--    line-height: 1.4;-->
<!--  }-->
<!--}-->

<!--.fade-slide-enter-active,-->
<!--.fade-slide-leave-active {-->
<!--  transition: all 0.4s ease;-->
<!--}-->

<!--.fade-slide-enter-from,-->
<!--.fade-slide-leave-to {-->
<!--  opacity: 0;-->
<!--  transform: translateY(-10px);-->
<!--}-->

<!--.collection-about {-->
<!--  min-height: 30px;-->
<!--}-->

<!--/* Firefox */-->
<!--input[type=number] {-->
<!--  -moz-appearance: textfield;-->
<!--}-->

<!--@media screen and (max-width: 768px) {-->
<!--  .collection-list {-->
<!--    &#45;&#45;first-column-width: 100%;-->
<!--  }-->

<!--  .collection-list:not(.root-collection-list) .page-header .wrapper {-->
<!--    gap: 0;-->
<!--  }-->

<!--  .collection-header.app-width-margin {-->
<!--    padding: 0;-->
<!--  }-->

<!--  .collection-header.app-width-margin :deep(.home-content.app-width-padding)  {-->
<!--    padding: 0;-->
<!--  }-->

<!--  .pagination {-->
<!--    flex-direction: column !important;-->
<!--    justify-content: center;-->
<!--  }-->
<!--}-->


<!--@media screen and (max-width: 640px) {-->

<!--  .page-header .wrapper > .tile {-->
<!--    padding: 25px var(&#45;&#45;mobile-margin);-->
<!--  }-->

<!--  .project-tile {-->
<!--    left: var(&#45;&#45;mobile-margin);-->
<!--  }-->

<!--  #home-article {-->
<!--    padding: 40px var(&#45;&#45;mobile-margin) !important;-->
<!--  }-->

<!--  #home-article h1 {-->
<!--    padding: 0;-->
<!--    font-size: 36px;-->
<!--  }-->
<!--}-->

<!--</style>-->
