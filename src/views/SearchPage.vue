<template>
  <div
    class="dots-ui collection-wrapper"
    :class="{ 'search-header-hidden': !isSearchHeaderShown }"
  >
    <!-- No collection banner: the search bar right under the navbar -->
    <div
      v-show="isSearchHeaderShown"
      ref="stickyHeaderEl"
      class="sticky-search-header app-width-margin"
    >
      <div class = "search-bar-row">
        <div class="tile is-child search-form">
          <div class="search-bar-row">
            <div class="search-input-wrapper">
              <!-- Fulltext or Metadata search selector -->
              <div class="search-mode-wrapper">
                <!-- SELECT BUTTON -->
                <div class="search-mode-trigger" @click="toggleModeDropdown">
                  <span>{{ currentSearchLabel }}</span>
                  <i class="arrow"></i>
                </div>

                <!-- DROPDOWN -->
                <div v-if="isModeOpen" class="search-mode-dropdown">
                  <div
                    v-for="opt in searchTypeOptions"
                    :key="opt.value"
                    class="search-mode-option"
                    :class="{ active: searchType === opt.value }"
                    @click="selectSearchType(opt.value)"
                  >
                    {{ opt.text }}
                  </div>
                </div>
              </div>
              <!-- input -->
              <div class="search-input-field">
                <input
                  class="input is-medium"
                  :class="isInvalidQuery ? 'input-error' : ''"
                  type="text"
                  :placeholder="`Rechercher dans ${searchCollectionName}`"
                  v-model="inputTerm"
                  @keyup.enter="executeSearches"
                  @click="$event.preventDefault()"
                /><!-- live debounced search : @keyup.enter="executeSearches" -->
                <button
                  v-if="inputTerm"
                  class="search-clear"
                  title="Clear search"
                  @click.prevent="deleteTerm"
                >
                  <span aria-hidden="true"></span>
                </button>
              </div>
              <!-- MESSAGE ERROR: in the field, on its right, before the cross;
                   under the whole bar from 1024px down -->
              <div v-if="isInvalidQuery" class="search-error-message" role="alert">
                {{ invalidQueryMessage }}
              </div>
            </div>

            <!-- button -->
            <button
              class="search-submit"
              :disabled="isInvalidQuery || search.loading.value"
              @click="executeSearches"
            />
          </div>
          <div class="active-filters-and-sliders">
            <ActiveSearchFilters
              :facets="activeFacetTags"
              :facets-config="visibleFacets"
              :ranges="ranges"
              :temporal-facets="visibleTemporal"
              :sidebar-open="sidebarOpen"
              @toggle-sidebar="toggleSidebar"
              @remove-facet="removeActiveFacet"
              @remove-range="removeActiveRange"
              @clear-all="clearAllFilters"
            />
          </div>
        </div>
      </div>
    </div>
    <div
      class="page-body app-width-margin"
      :class="{ 'sidebar-open': sidebarOpen }"
    >
      <Transition name="backdrop-fade">
        <div
          v-if="sidebarOpen"
          class="sidebar-backdrop"
          @click="toggleSidebar"
        />
      </Transition>
      <Transition name="sidebar-slide">
        <aside class="facets-sidebar" v-if="sidebarOpen">
          <div class="facets-sidebar-header">
          </div>
          <SearchFacets
            class="search-facets"
            :opened-facets="openedFacets"
            :facets="visibleFacets"
            :temporal-facets="visibleTemporal"
            :active-facets="activeFacetTags"
            :ranges="ranges"
            @facet-open="openFacet"
            @facet-close="closeFacet"
            @toggleFacet="onToggleFacet"
            @change-range="onTemporalChange"
            @reset-range="resetRange"
            @reset-facet="resetFacet"
            @remove-facet-value="removeActiveFacet"
            @toggle-sidebar="toggleSidebar"
            @clear-all="clearAllFilters"
          />
        </aside>
      </Transition>
      <div class="page-main">
        <div class="document-list list-mode">
          <ResourcesList
            :data="tableData"
            :columns-config="columns"
            :page-size="pageSize"
            :current-page="page"
            :is-doc-project-id-included="isDocProjectIdInc"
            :is-table-loading="search.loading.value"
            :counts="search.totalCount.value"
            :is-elastic-search="true"
            :total-buckets="search.bucketCount.value"
            :is-with-highlights="searchedWithHits"
            :collection-indexed="search.collectionIndexed.value"
            @sort-change="updateSort"
            @page-change="changePage"
          /><!--v-if="tableData.length > 0"-->
        </div>
      </div>
    </div>
  </div>
</template>

<script>

import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { useStore } from 'vuex'
import { useRoute, useRouter } from 'vue-router'
import useSimpleSearch from '@/composables/use-simple-search'

import { isSearchHeaderShown, getInvalidQueryMessage } from '@/composables/search-page'
import ResourcesList from '@/components/ResourcesList.vue'
import SearchFacets from '@/components/SearchFacets.vue'
import ActiveSearchFilters from '@/components/ActiveSearchFilters.vue'

export default {
  name: 'SearchPage',
  components: {
    SearchFacets,
    ActiveSearchFilters,
    ResourcesList
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
  setup(props) {
    const store = useStore()
    const router = useRouter()
    const route = useRoute()

    const isDocProjectIdInc = computed(() => props.isDocProjectIdIncluded)
    const rootCollectionId = computed(() => props.rootCollectionIdentifier)
    const collectionId = computed(() => props.collectionIdentifier)
    const appConfig = computed(() => props.applicationConfig)
    const collConfig = computed(() => props.collectionConfig)
    const currCollection = computed(() => props.currentCollection)
    // Short name, as the navbar and its search banner give it
    const searchCollectionName = computed(() =>
      collConfig.value?.homePageSettings?.appNavBar?.collectionShortTitle || currCollection.value?.title || collectionId.value
    )

    const sidebarOpen = ref(false)

    function toggleSidebar() {
      sidebarOpen.value = !sidebarOpen.value
    }

    const search = useSimpleSearch()

    const pageSize = search.pageSize
    const page = search.pageNum

    const openedFacets = search.openedFacets

    function onTemporalChange({key, range}){
      // `ranges` is keyed by the canonical key; the Elasticsearch paths
      // travel inside `range` as startField / endField.
      search.setRange(
        key,
        range
      )
      executeSearches()
    }

    // Facets and configuration entries are both designated by `key`, the
    // canonical metadata key an editor writes (`dublinCore.created`).
    // Ids of the temporal facets that are explicitly disabled.
    // Same declarative rule as disabledFacetIds below: a facet missing from
    // the config is still displayed, using the backend default label
    // (see `label: c?.label || facet.label` in visibleTemporal).
    // Declaring an entry therefore customises it (label, order) or excludes it.
    const disabledTemporalFacetIds = computed(() => {
      const config =
        collConfig.value?.searchConfig?.temporalFacets || []

      return config
        .filter(c => c.enabled === false)
        .map(c => c.key)
        .filter(Boolean)
    })

    // Ids of the metadata facets that are explicitly disabled.
    // We send the DISABLED ones rather than the enabled ones, to match the
    // rendering rule of visibleFacets below (`config?.enabled === false`):
    // a facet missing from the config is still displayed. A partial config
    // such as cid.conf.json (`[{ id: 'collections', enabled: false }]`) is
    // therefore translated faithfully.
    const disabledFacetIds = computed(() => {
      const config =
        collConfig.value?.searchConfig?.facets || []

      return config
        .filter(c => c.enabled === false)
        .map(c => c.key)
        .filter(Boolean)
    })

    const visibleTemporal = computed(() => {
      const config =
        collConfig.value?.searchConfig?.temporalFacets || []
      const configMap = new Map(
        config.map(c => [c.key, c])
      )

      const availableMap = new Map(
        (Array.isArray(search.temporal.value) ? search.temporal.value : Object.values(search.temporal.value || {}))
          .map(f => [f.key, f])
      )

      return search.initialTemporal.value
        .map((facet, index) => {
          const c = configMap.get(facet.key)
          const available = availableMap.get(facet.key)

          return {
            ...facet,
            // if optional configuration exists
            label: c?.label || facet.label,
            // explicit order otherwise backend order
            order: c?.order ?? null,
            backendOrder: index,
            // available range with current search criteria
            // fallback on corpus min/max if missing (no results, etc.)
            available_min: available?.min ?? facet.min,
            available_max: available?.max ?? facet.max,
            // range intersection of all resources
            intersection: available?.intersection ?? facet.intersection ?? null
          }
        })
        // explicit exclusion only
        .filter(facet => {
          const c = configMap.get(facet.key)
          return c?.enabled !== false
        })
        .sort((a, b) => {
          // both a & b are configured
          if (a.order != null && b.order != null) {
            return a.order - b.order
          }
          // a configured, not b
          if (a.order != null) {
            return a.order - b.backendOrder
          }
          // b configured, not a
          if (b.order != null) {
            return a.backendOrder - b.order
          }
          // none configured : use backend order
          return a.backendOrder - b.backendOrder
        })
    })

    const visibleFacets = computed(() => {
      const result = []
      const available = search.facets.value?.available || {}
      const initialAvailable = search.initialFacets.value?.available || {}
      const configFacets = collConfig.value?.searchConfig?.facets || []
      const collectionsConfig = configFacets.find(f => f.key === 'collections')

      if (available.collections  && collectionsConfig?.enabled !== false) {

        const currentCollections = Object.fromEntries(
          available.collections.map(f => [
            f.facet_key,
            f.count
          ])
        )

        const collections = (
          initialAvailable.collections || available.collections
        ).map(f => ({
          ...f,
          count: currentCollections[f.facet_key] ?? 0
        })).filter(f => f.id !== collectionId.value)

        result.push({
          key: 'collections',
          label: collectionsConfig?.label || 'Collections',
          values: collections,
          order: 0
        })
      }

      Object.entries(available)
        .filter(([id]) => id !== 'collections')
        .forEach(([id,values]) => {

          const config =
            configFacets.find(
              f => f.key === id
            )

          if(config?.enabled === false)
            return

          result.push({
            key: id,
            label:
              config?.label ||
              id,
            values,
            order:
              config?.order ?? 999
          })
        })

      return result.sort(
        (a,b)=>a.order-b.order
      )
    })

    const buildPassageUrl = (resId, hit, tocSettings, collId, resCollId, isDocProjectIdIncluded) => {
      if (!hit) return null

      const passageTocSettings = appConfig.value?.collectionsConf?.find(c => c.collectionId === resCollId)?.tableOfContentsSettings ?? tocSettings
      const { ancestors = [], passageId } = hit
      let refId = null

      // Priority: editByCiteType
      if (passageTocSettings?.editByCiteType?.length) {
        // Passage is itself a match
        if (
          hit.citeType &&
          passageTocSettings.editByCiteType.includes(hit.citeType.toLowerCase())
        ) {
          refId = passageId
        } else {
          // else check ancestors
          const match = ancestors.find(a =>
            a.citeType &&
            passageTocSettings.editByCiteType.includes(a.citeType.toLowerCase())
          )
          if (match) {
            refId = match.id
          }
        }
      }

      // --- fallback : editByLevel ---
      if (!refId && passageTocSettings?.editByLevel) {
        const match = ancestors.find(a => a.level === passageTocSettings.editByLevel)
        if (match) {
          refId = match.id
        } else if (ancestors.length === 0 && passageTocSettings?.editByLevel === 1) {
          refId = passageId
        }
      }

      // --- Last resort fallback (deprecated) ---
      /*if (!refId && ancestors.length) {
        console.log('searchPage debug matching fallback ancestors ', ancestors, ancestors[ancestors.length - 1].id)
        refId = ancestors[ancestors.length - 1].id
      }*/

      // construction params WITH collId if necessary
      const params = isDocProjectIdIncluded
        ? { collId, id: resId }
        : { id: resId }

      /*console.log('searchPage buildPassageUrl :', {
        name: 'Document',
        params,
        query: refId ? { refId } : {},
        hash:
            passageId && refId && passageId !== refId
                ? `#${passageId}`
                : passageId && !refId
                    ? `#${passageId}`
                    : ''
      })*/
      if (passageId === '__DOCUMENT__') {
        return {
          name: 'Document',
          params,
          query: {},
          hash: ''
        }
      }

      return {
        name: 'Document',
        params,
        query: refId ? { refId } : {},
        hash:
            passageId && refId && passageId !== refId
                ? `#${passageId}`
                : passageId && !refId
                    ? `#${passageId}`
                    : ''
      }
    }

    const tocSettings = collConfig.value?.tableOfContentsSettings

    const tableData = computed(() => {
      const result = search.result.value
      if (!result) return []

      // Grouped case (buckets)
      if (Array.isArray(result.buckets)) {
        return result.buckets.map(bucket => ({
          ...bucket,
          identifier: bucket.resource_id || bucket.identifier || '—',
          // The row link needs the project, which the route carries when
          // VITE_APP_DOCUMENT_ROUTE_INCLUDE_PROJECT_ID is set (as in HomePage).
          projectIdentifier: bucket.path_ids?.[0] ?? bucket.parent_id,

          hits: (bucket.hits || []).map(hit => {
            const normalizedHit = {
              passageId: hit.passage_id,
              title: hit.title || null,
              citeType: hit.citeType || null,
              level: hit.level,
              ancestors: hit.ancestors || [],
              highlight: hit.highlight || {}
            }

            const route = buildPassageUrl(
              bucket.resource_id,
              normalizedHit,
              tocSettings,
              collectionId.value,
              bucket.collection_ids?.[0],
              props.isDocProjectIdIncluded
            )

            return {
              ...normalizedHit,
              passageUrl: route ? router.resolve(route) : {}
            }
          })
        }))
      }

      // Straight table case
      if (Array.isArray(result)) {
        return result.map(item => ({
          ...item,
          ...item.fields,
          identifier: item.resource_id || item.identifier || '—',
          projectIdentifier: item.path_ids?.[0] ?? item.parent_id,
          details: []
        }))
      }

      return []
    })

    const columns = computed(() => {
      const configCols =
        props.collectionConfig?.homePageSettings?.listSection?.columns

      if (configCols?.length > 0) {
        return configCols
          .filter(col => col && col.key)
          .map(col => ({
            key: col.key,
            label: col.label || col.key,
            type: col.type || 'string',
            width: col.width
          }))
      }

      // Minimal fallback on title only as in default.conf.json (namespaced metadata key)
      return [
        { key: 'dublinCore.title', label: 'Title', type: 'text' }
      ]
    })

    const layout = inject('variable-layout')

    const activeFacetTags = computed(() => {
      const selected = search.facets.value?.selected || {}

      return Object.entries(selected).flatMap(([facetType, values]) => {
        return values.map(v => {
          const [id, label] = v.split('###')

          return {
            facetType,
            id,
            label: label || id,
            raw: v
          }
        })
      })
    })

    function removeActiveFacet(tag) {
      search.removeFacet({
        facetType: tag.facetType,
        facetKey: tag.raw
      })
      executeSearches()
    }

    function removeActiveRange(field){
      search.setRange(field, null)
      executeSearches()
    }

    function clearAllFilters(){
      search.clearFacets()
      Object.keys(search.ranges.value)
        .forEach(field => {
          search.setRange(field, null)
        })
      executeSearches()
    }

    function onToggleFacet({ facetType, facetKey }) {
      const selected = search.facets.value.selected?.[facetType] || []
      if (selected.includes(facetKey)) {
        search.removeFacet({
          facetType,
          facetKey
        })
      } else {
        search.setFacet({
          facetType,
          value: facetKey
        })
      }
      executeSearches()
    }

    function openFacet(id){
      search.setFacetOpened(id)
    }

    function closeFacet(id){
      search.setFacetClosed(id)
    }

    function resetRange(rangeKey) {
      search.removeRange(rangeKey)
      executeSearches()
    }

    function resetFacet(facetType) {
      search.removeFacetType(facetType)
      executeSearches()
    }

    // FILTERS
    // SORT

    // The API resolves metadata keys to their indexed sort fields:
    // `dublinCore.title` → `resource_metadata.dublincore.title.sort`

    // Temporal properties bounds are normalized in the indexes:
    // `dublinCore.created` → `temporal.dublincore.created_start` / `_end`
    //
    // The .sort sub-field orders accented letters with their base letter
    // Temporal property sorts on their normalised numeric bound rather, not the raw value
    // Unparseable dates, excluded from results (`getRowValue`), should not affect sorting either

    const updateSort = ({ key, direction }) => {
      if (!key || direction === 'none') {
        inputSort.value = null
        return
      }
      inputSort.value = direction === 'desc' ? `-${key}` : key
    }

    // PAGINATION
    // Only the pages the user asks for: a page reset (sort, new search) goes
    // through executeSearches(), which already fetches page 1.
    const changePage = (pageNum) => {
      search.setPageNum(pageNum)
      search.execute()
    }

    async function executeSearches() {
      // Do not send invalid query via @keyup.enter calling this directly (even if submit button is disabled)
      if (isInvalidQuery.value) return

      layout.rawSearchedTerm.value = inputTerm.value
      const t = inputTerm.value?.trim()
      // console.log('SearchPage executeSearches:', {
      //   isFulltextSearch: isFulltextSearch.value,
      //   term: t,
      //   collectionId: collectionId.value,
      //   activeCollectionId: activeCollectionId.value
      // })

      if (t && t.length > 0) {
        // --- FULLTEXT ---
        search.setTerm(t)
        search.setCollectionId(collectionId.value)
      } else {
        // --- RESOURCE ---
        search.setTerm('')
        search.setCollectionId(collectionId.value)
      }
      search.setPageNum(1)

      await search.execute()
      searchedWithHits.value = isFulltextSearch.value && !!t
    }

    const initialState = {
      term: layout.rawSearchedTerm.value || '',
      isFulltextSearch: search.isFulltextSearch.value,
      isResultTableMode: search.isResultTableMode.value,
      temporalRanges: search.ranges.value,
      sort: search.sorts?.value,
      activeCollectionId: search.activeCollectionId
    }

    const inputTerm = ref(initialState.term)
    const inputSort = ref(initialState.sort)

    const isFulltextSearch = computed({
      get: () => search.isFulltextSearch.value,
      set: (v) => search.setIsFulltextSearch(v)
    })

    // Whether the results shown come from a full-text search with a term
    // (hits column, documents count): set when a search runs, not as the
    // field or the mode change, nor while the query is invalid
    const searchedWithHits = ref(isFulltextSearch.value && !!search.term.value)

    const isModeOpen = ref(false)

    const searchTypeOptions = [
      { value: 'notice', text: 'notices' },
      { value: 'fulltext', text: 'plein texte' }
    ]

    const searchType = computed({
      get: () => (isFulltextSearch.value ? 'fulltext' : 'notice'),
      set: (val) => {
        search.setIsFulltextSearch(val === 'fulltext')
      }
    })

    // Why the query cannot be searched, '' when it can (search-page.js)
    const invalidQueryMessage = computed(() =>
      getInvalidQueryMessage(inputTerm.value, isFulltextSearch.value)
    )
    const isInvalidQuery = computed(() => invalidQueryMessage.value !== '')

    const currentSearchLabel = computed(() => {
      return searchTypeOptions.find(o => o.value === searchType.value)?.text
    })

    function toggleModeDropdown() {
      isModeOpen.value = !isModeOpen.value
    }

    function selectSearchType(val) {
      searchType.value = val
      isModeOpen.value = false
      executeSearches()
    }

    const isResultTableMode = computed({
      get: () => search.isResultTableMode.value,
      set: (v) => {
        const pid = store.state.search.activeProjectId
        if (pid) store.state.search.byProject[pid].isResultTableMode = v
      }
    })

    const deleteTerm = () => {
      inputTerm.value = ''
      executeSearches()
    }

    search.setNoHighlight(
      !isFulltextSearch.value ||
      !inputTerm.value ||
      inputTerm.value.length === 0
    )

    search.setTerm(inputTerm.value)
    search.setSorts(inputSort.value)
    search.setIsFulltextSearch(isFulltextSearch.value)

    watch(inputTerm, () => {
      search.setTerm(inputTerm.value)
      search.setNoHighlight(
        !isFulltextSearch.value ||
        !inputTerm.value ||
        inputTerm.value.length === 0
      )
      /* recherche immédiate au typing (debounced)
      executeSearches()
       */
    })

    watch(isFulltextSearch, (v) => {
      search.setNoHighlight(
        !v ||
        !inputTerm.value ||
        inputTerm.value.length === 0
      )
      /* searchUI */
      if (v) {
        isResultTableMode.value = false
      }
      /* recherche immédiate à la selection (debounced)
      executeSearches()
       */
    })

    // setSorts resets the pagination, and executeSearches() fetches page 1
    watch(inputSort, () => {
      search.setSorts(inputSort.value)
      executeSearches()
    })

    watch(
      collectionId,
      (newVal) => {
        if (newVal) {
          search.setSearchCollectionId(newVal)
          search.setCollectionId(newVal)
        }
      },
      { immediate: true }
    )

    // immediate: true => the list lands in the store before the initial
    // executeSearches() below, hence from the very first request onwards.
    watch(
      disabledTemporalFacetIds,
      (ids) => {
        search.setExcludedTemporalFacets(ids)
      },
      { immediate: true }
    )

    watch(
      disabledFacetIds,
      (ids) => {
        search.setExcludedFacets(ids)
      },
      { immediate: true }
    )

    const _pid = store.state.search.activeProjectId
    const _existingState = _pid ? store.state.search.byProject[_pid] : null
    const _hasResults = (_existingState?.totalCount ?? 0) > 0

    // A search sent from the navbar banner (AppNavbar > NavbarSearch):
    // ?q=<term>&mode=notice|fulltext. Applied, run, then dropped from the URL
    // so the bar stays the only source of the query.
    const applyRouteQuery = () => {
      const { q, mode, ...otherQuery } = route.query
      if (q === undefined && mode === undefined) return false

      if (mode === 'fulltext' || mode === 'notice') {
        search.setIsFulltextSearch(mode === 'fulltext')
      }
      inputTerm.value = typeof q === 'string' ? q : ''
      router.replace({ query: otherQuery, hash: route.hash })
      executeSearches()
      return true
    }

    if (!applyRouteQuery() && !_hasResults) {
      executeSearches()
    }

    // Banner search while this page is already open
    watch(() => [route.query.q, route.query.mode], applyRouteQuery)

    // The sidebar sticks below the search header, whose height changes with
    // the number of active filter tags: a fixed value would be wrong from
    // the first filter, so measure it.
    const stickyHeaderEl = ref(null)

    let headerObserver = null

    onMounted(() => {
      if (!stickyHeaderEl.value) return

      headerObserver = new ResizeObserver(([entry]) => {
        document.documentElement.style.setProperty(
          '--search-header-height',
          `${Math.round(entry.contentRect.height)}px`
        )
      })
      headerObserver.observe(stickyHeaderEl.value)
    })

    onBeforeUnmount(() => {
      headerObserver?.disconnect()
      document.documentElement.style.removeProperty('--search-header-height')
      // Shown again on the next visit
      isSearchHeaderShown.value = true
    })

    onMounted(() => {
    })

    return {
      isDocProjectIdInc,
      collConfig,
      appConfig,
      rootCollectionId,
      collectionId,
      currCollection,
      columns,
      page,
      pageSize,
      search,
      tableData,
      executeSearches,
      activeFacetTags,
      removeActiveFacet,
      removeActiveRange,
      clearAllFilters,
      searchedWithHits,
      isFulltextSearch,
      toggleModeDropdown,
      currentSearchLabel,
      isModeOpen,
      searchTypeOptions,
      selectSearchType,
      inputTerm,
      isInvalidQuery,
      invalidQueryMessage,
      deleteTerm,
      updateSort,
      changePage,
      openedFacets,
      onTemporalChange,
      visibleTemporal,
      visibleFacets,
      ranges: search.ranges,
      onToggleFacet,
      openFacet,
      closeFacet,
      resetRange,
      resetFacet,
      stickyHeaderEl,
      isSearchHeaderShown,
      searchCollectionName,
      sidebarOpen,
      toggleSidebar,
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
  margin-top: 20px;
  padding-top: 0;
  padding-bottom: 25px;
  box-sizing: border-box;
}

a {
  border-bottom: none;
}
.collection-wrapper {
  width: 100%;
}

abbr {
  text-decoration: none !important;
}
thead tr {
  display: table-row;
}
th {
  white-space: nowrap;
}
th > div {
  display: flex;
  height: 100%;
  flex-direction: column;
  justify-content: flex-end;
  border: none !important;
  text-decoration: none !important;
}
th > div > span {
  display: inline-block;
}
th > div.sortable {
  cursor: pointer;
}
th > div::before {
  content: "";
  display: inline-block;
  width: 32px;
  height: 32px;
  margin-bottom: 5px;
}
th > div.sortable::before {
  background: url(../assets/images/b_tri.svg) center / cover no-repeat;
}
th > div.sort-alpha-down::before {
  background-image: url(../assets/images/b_tri_AZ.svg);
}
th > div.sort-alpha-up::before {
  background-image: url(../assets/images/b_tri_ZA.svg);
}
th > div.sort-numeric-down::before {
  background-image: url(../assets/images/b_tri_19.svg);
}
th > div.sort-numeric-up::before {
  background-image: url(../assets/images/b_tri_91.svg);
}
tr td.oeil a,
tr td.chevron-down a,
tr td.chevron-up a {
  display: block;
  width: 35px;
  text-decoration: none !important;
  border-bottom: none !important;
}
tr td.oeil a:hover,
tr td.chevron-down a:hover,
tr td.chevron-up a:hover {
  background-color: transparent !important;
  text-decoration: none !important;
}
tr td.oeil a {
  width: 27px;
  height: 20px;
  background: url(../assets/images/b_oeil.svg) center / contain no-repeat;
}
.table tr.row-infos.is-selected td.oeil a {
  background-image: url(../assets/images/b_oeil_blc.svg);
}
tr td.chevron-up a::before,
tr td.chevron-down a::before {
  content: "";
  display: inline-block;
  width: 27px;
  height: 20px;
  transform-origin: 50%;
}
tr td.chevron-down a::before {
  background: url(../assets/images/croix_blc.svg) center / contain no-repeat;
}
tr td.chevron-up a::before {
  background: url(../assets/images/chevron_rouge.svg) center / contain no-repeat;
}

.description {
  text-align: center;
}

.tiles-section {
  background-color: #ffffff;
  padding-bottom: 100px;
}
.toggle-list-and-pagination {
  justify-content: space-between;
  align-items: center;
}
.toggle-list-and-pagination > div:first-child .is-inline-block {
  margin-bottom: 0 !important;
}
.toggle-list-and-pagination .sort-options select,
.toggle-list-and-pagination .sort-options > span {
  font-family: "Barlow", sans-serif;
  font-size: 16px;
  font-weight: 500;
  color: #adadad;
}
.toggle-list-and-pagination .sort-options > span {
  text-transform: uppercase;
  margin: 0 10px 0 30px;
}
.toggle-list-and-pagination .sort-options select {
  background: transparent;
  inset: unset;
  border: #d9d8d3 solid 1px;
  padding: 3px 5px 5px 10px;
  margin-right: 10px;
}

.enc-logo {
  height: 64px;
  border-radius: 3px;
}

/*
  search form
*/
.search {
  border: 1px solid #e4e5df;
  border-radius: 3px;
}
.search-form {
  background-color: #f0f0f0 !important;
  border-bottom-left-radius: 6px;
  border-bottom-right-radius: 6px;
}
.search-form > *:first-child {
  border-top-left-radius: 6px;
  border-top-right-radius: 6px;
  padding: 32px 0 34px 0;
  margin-bottom: 0;
}

.search-form > *:not(:first-child) {
  margin-bottom: 0;
}
.search-form > *.search-form-footer {
  padding: 24px !important;
}
.search-control {
  margin-right: 0 !important;
}

/* Space above the search bar: no header button overhangs it on the search
   page, so the original 12px */
.collection-wrapper {
  --search-bar-offset: 12px;
}

/* Once stuck, the header sits above the viewport top by the extra space,
   so the bar keeps its original 12px: changing the margin instead would
   make the list below jump as the header sticks */
.sticky-search-header {
  position: sticky;
  top: calc(12px - var(--search-bar-offset));
  z-index: 22;
  background-color: #ffffff;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}
.sticky-search-header .search-bar-row {
  display: flex;
  align-items: center;
  width: 100%;
  margin: 0;
  padding: 0 0 0 0;
}

.search-form > .search-bar-row {
  display: flex !important;
  flex-direction: row !important;
  flex-wrap: nowrap !important;
  align-items: flex-start !important;
  gap: 0;
  margin-top: var(--search-bar-offset);
  padding-left: 12px;
}
.hide-filters-button {
  background-color: transparent !important;
  box-shadow: none;
}

/* Sidebar des facettes */
/* clip, not hidden: with overflow-x: hidden, overflow-y: visible computes
   to auto, .page-body becomes a scroll container and the sidebar's sticky
   no longer sticks to the viewport. */
.page-body {
  display: flex;
  align-items: stretch;
  width: 100%;
  overflow-x: clip;
  overflow-y: visible;
}

.facets-sidebar {
  flex: 0 0 33.333%;
  max-width: 33.333%;
  box-sizing: border-box;
  padding: 0 0 0 0 !important;
  background: #fff;

  /* align-self cancels .page-body's stretch, or the sidebar takes the
     table's height and has nothing to stick within. No scroll of its own:
     the list follows the page. */
  position: sticky;
  /* Bottom of the stuck search header, which sticks above the viewport top
     by the space it hides (see .sticky-search-header) */
  top: calc(var(--search-header-height, 0px) + 12px - var(--search-bar-offset));
  align-self: flex-start;
}

.sidebar-backdrop {
  display: none;
}

.facets-sidebar-header {
  display: flex;
  position: sticky !important;
  justify-content: flex-start;
  margin-bottom: 1px;
}

.close-sidebar-btn {
  background: none;
  border: none;
  color: #b9192f;
  font-size: 20px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.page-main {
  flex: 1 1 0;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}

.search-bar-row {
  width: 100%;
  gap: 0;
}
.active-filters-and-sliders{
  /*width: flex;*/
  position: sticky
}

/* SELECT */
.search-mode-wrapper {
  flex: 0 0 auto;
}

/* INPUT */
.search-input-wrapper {
  position: relative;
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
}

.search-input-field {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
}

.search-form .input {
  width: 100%;
  border-radius: 0;
  height: var(--button-size);
  box-shadow: none;
  padding-bottom: 6px;
  padding-top: 6px;
  border-color: #979797;
}
.search-form .input:focus {
  outline: none !important;
  box-shadow: none !important;
  border-color: #979797;
}
/* Red outline within the field's own border: no ring spilling over the
   selector's and the button's borders */
.search-form .input.input-error,
.search-form .input.input-error:focus {
  color: #d33 !important;
  border: 1px solid #d33 !important;
  box-shadow: none !important;
}
/* In the field, right-aligned before the clear cross (10px + 22px), over
   the room the field's text leaves it (.input-error padding) */
.search-error-message {
  position: absolute;
  top: 50%;
  right: 40px;
  max-width: calc(50% - 48px);
  transform: translateY(-50%);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: #d33;
  pointer-events: none;
}
.search-form .input.input-error {
  padding-right: 50%;
}

/* CLEAR SEARCH ICON */
.search-clear {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);

  width: 22px;
  height: 22px;
  padding: 0;

  border: none;
  background: transparent;
  cursor: pointer;

  display: flex;
  align-items: center;
  justify-content: center;
}

/* CIRCLE */
.search-clear span {
  position: relative;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1.5px solid #b8b8b8;
}

/* CROSS */
.search-clear span::before,
.search-clear span::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  width: 10px;
  height: 1.5px;
  background-color: #b8b8b8;
  transform-origin: center;
}

.search-clear span::before {
  transform: translate(-50%, -50%) rotate(45deg);
}

.search-clear span::after {
  transform: translate(-50%, -50%) rotate(-45deg);
}

/* hover */
.search-clear:hover span {
  border-color: #666;
}

.search-clear:hover span::before,
.search-clear:hover span::after {
  background-color: #666;
}

/* CLEAR INPUTS */
.clear-input {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  cursor: pointer;
  color: var(--fill-color);
}

.hide-filters-button .filter-icon {
  width: 20px;
  height: 20px;
  display: block;
}

/* SEARCH BUTTON */
.search-submit {
  width: var(--button-size);
  height: var(--button-size) !important;
  margin-right: 12px;
  padding: 0;
  border: none;
  border-radius: 0 6px 6px 0;
  color: var(--fill-color);
  /* bouton_loupe.svg carries its own red background: the collection colour
     here, with the magnifier drawn over it in white (as NavbarSearch.vue) */
  background-color: var(--fill-color);
  cursor: pointer;

  &::after {
    content: '';
    display: block;
    width: 55%;
    height: 55%;
    margin: auto;
    background-color: #FFFFFF;
    -webkit-mask: url(../assets/images/icone-loupe.svg) center / contain no-repeat;
    mask: url(../assets/images/icone-loupe.svg) center / contain no-repeat;
  }
}
.search-submit:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  filter: grayscale(1);
}

/* optionnel: fusion visuelle */
/* The search bar follows the app's buttons: --button-size, 40px, 30px
   under 768px. */
.search-mode-trigger {
  height: var(--button-size);
  border-radius: 6px 0 0 6px;
}

.search-form button.expand-form-button.button {
  background: #868686 url(../assets/images/chevron_blanc_recherche.svg) left 15px top 20px /
    15px auto no-repeat;
  border-radius: 4px !important;
}

.search-form-footer {
  font-family: "Barlow", sans-serif;
  background-color: #f0f0f0 !important;
  border-bottom-left-radius: 6px;
  border-bottom-right-radius: 6px;
  justify-content: space-between;
  align-items: center;
}
.search-form-footer .control label {
  margin-right: 10px;
  font-size: 14px;
  line-height: 35px;
  font-weight: 500;
  color: #979797;
  text-transform: uppercase;
}
.search-form-footer .results-count {
  display: flex;
  flex-direction: column;
}
.search-form-footer .results-count > span {
  text-align: center;
}
.search-form-footer .results-count > span:first-child {
  font-size: 50px;
  line-height: 50px;
  font-weight: 700;
  color: #7e7e7e;
}
.search-form-footer .results-count.dot-flash > span:first-child {
  background: linear-gradient(
      90deg,
      #eee 25%,
      #ddd 50%,
      #eee 75%
  );
  background-size: 200% 100%; /* width doubled for animation */
  animation: shimmer 1.4s ease infinite;
}
.search-form-footer .results-count > span:last-child {
  font-size: 12px;
  font-weight: 500;
  color: #4a4a4a;
  text-transform: uppercase;
}
/* toggle */
.search-mode-wrapper {
  position: relative;
  display: inline-block;
}

.search-mode-trigger {
  display: flex;
  align-items: center;
  gap: 6px;

  background: #fff;
  border: 1px solid var(--fill-color);
  color: var(--fill-color);

  padding: 10px 14px;
  border-radius: 6px 0 0 6px;

  cursor: pointer;
  font-size: 14px;
  text-transform: lowercase;
}

.search-mode-trigger .arrow {
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 6px solid var(--fill-color);
}

.search-mode-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;

  background: white;
  border: 1px solid #ddd;
  z-index: 20;
}

.search-mode-option {
  padding: 10px 12px;
  cursor: pointer;
  font-size: 14px;
  text-transform: lowercase;
}

.search-mode-option:hover {
  background: #f2f2f2;
}

.search-mode-option.active {
  background: #c00055;
  color: white;
}

/* sliders */
.sliders {
  font-family: "Barlow", sans-serif;
  font-weight: 500;
  text-transform: uppercase;
}
.sliders label {
  font-size: 16px;
  color: #4a4a4a;
  margin-bottom: 10px;
}
.sliders span {
  font-size: 14px;
  color: #979797;
}
.sliders input[type="number"].year {
  inset: unset;
  border: none;
  text-shadow: none;
  -moz-appearance: textfield;
  background-color: #fff;

  max-width: 70px;
  padding: 2px 0;
  margin: 0 15px;

  font-family: "Barlow", sans-serif;
  font-weight: 500;
  font-size: 14px;
  color: #979797;
  text-transform: uppercase;
  text-align: center;
}
.sliders input[type="number"].year:focus {
  outline: solid 2px #b9192f;
}
input[type="number"]::-webkit-outer-spin-button,
input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.sliders span.year {
  background-color: #fff;
  padding: 2px 20px;
  margin: 0 15px;
}
.slider-control {
  flex: 50% 0 0;
  padding: 24px;
}
.slider-control label {
  display: block;
}

.search-facets {
  /* padding bottom : prevent last facet touches the footer
     note : padding under an opened overlay remains 24px. */
  padding: 27px 24px 24px 1rem;
}

.active-filters-and-sliders {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  border-bottom: solid 2px #ffffff;
}

/* search table */
.table-container {
  font-family: "Barlow Semi Condensed", sans-serif;
  margin-top: 24px;
  min-height: 600px;
}
.table {
  min-width: 100%;
}
.table thead {
  background-color: #f0f0f0;
}
.table thead th {
  padding: 15px 0 12px 20px;
  background: none;
  text-transform: uppercase;
}
.table tr.row-infos.is-selected {
  background-color: #a3a3a3 !important;
}
tr.row-infos > td {
  padding: 14px 0 14px 20px;
  font-size: 16px;
  font-weight: 500;
  line-height: 22px;
  color: #666666;
  border: none;
  border-top: #b9192f 1px dashed;
}
tr.row-infos > td a {
  color: #666666;
}
tr.row-infos.is-selected > td > a,
tr.row-infos.is-selected > td {
  color: #ffffff !important;
}
tr.row-infos:last-child > td {
  border-bottom: #b9192f 3px solid;
}
tr.row-infos > td:nth-child(1) {
  text-transform: uppercase;
}
tr.row-infos > td:nth-child(2) {
  /* font-weight: 600; */
}

tr.row-infos > td:nth-child(3) {
  color: #000000;
}
tr.row-infos > td:nth-child(4) > a {
  font-size: 18px;
  font-weight: 400 !important;
  line-height: 24px;
  color: #4a4a4a;
  text-decoration: none;
  border: none;
}
tr.row-infos:hover {
  cursor: pointer;
}
tr.row-details {
  background-color: #f6f6f6;
}
.position-highlight span,
tr.row-details li {
  display: inline;
}
.position-highlight span:not(:last-child)::after,
tr.row-details li:not(:last-child)::after {
  content: " ••• ";
}
tr.row-details :deep(td) {
  border: inherit;
}
tr.row-details :deep(ul) {
  padding: 25px 25px 40px;
}
tr.row-details :deep(li) {
  font-family: "Libre Baskerville", serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 28px;
  color: #5f5f5f;
}
/* search text results */
.text-results .table {
  margin-top: 24px;
}
.text-results .table > a {
  display: block;
  padding-top: 15px;
  border-top: #b9192f 1px dashed;
  font-family: "Barlow Semi Condensed", sans-serif;
}
.text-results .table > a:last-child {
  border-bottom: #b9192f 3px solid;
}
.text-results .table > a .columns.mb-6 {
  margin-bottom: 10px !important;
}
.text-results .table > a .position-title {
  width: 65%;
  font-size: 22px;
  font-weight: 600;
  line-height: 26px;
  color: #000000;
  margin-bottom: 10px;
}
.text-results .table > a .position-author {
  font-size: 16px;
  font-weight: 600;
  line-height: 22px;
  text-transform: uppercase;
  color: #666666;
}
.text-results .table > a .position-infos {
  font-size: 16px;
  font-weight: 600;
  color: #828282;
}
.text-results .table > a .position-infos span.year {
  margin-right: 8px;
}
.text-results .table > a .position-infos span.period {
  margin-left: 8px;
}
.text-results .table > a .position-highlight {
  font-family: "Libre Baskerville", serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 28px;
  color: #5f5f5f;
  margin-top: 15px;
}
tr.row-details :deep(em),
.text-results .table > a :deep(em) {
  background-color: #ffec00;
  border-radius: 3px;
  font-style: normal;
  padding: 4px 5px;
}

@media screen and (max-width: 1040px) {
  .sliders {
    flex-direction: column;
    padding-bottom: 10px;
  }
  .slider-control {
    padding: 18px 24px;
    margin-bottom: 0;
  }
  .toggle-list-and-pagination {
    flex-direction: column;
    justify-content: flex-start;
  }
  .toggle-list-and-pagination > div:first-child {
    width: 100%;
    align-self: flex-start;
    display: flex !important;
    justify-content: space-between;
    margin-bottom: 20px;
  }
  .toggle-list-and-pagination > div:last-child {
    align-self: center;
  }
  .text-results .table > a {
    padding-top: 0;
  }
  .text-results .table > a .columns.mb-6 {
    margin: 10px 0;
  }
  .text-results .table > a > .columns > .column:first-child {
    display: none;
  }
  .text-results .table > a > .columns > .column:last-child,
  .text-results .table > a .position-title {
    width: 100%;
  }
}

@media screen and (max-width: 900px) {
  .title-tile {
    flex-direction: column !important;
    justify-content: flex-start;
    align-items: flex-start;
    gap: 20px;
  }
  .search-form-footer .control {
    flex-direction: column;
  }
  .search-form-footer .control label {
    margin-bottom: 5px;
  }
  .text-results .table > a .columns.mb-6 {
    flex-direction: column;
  }
}
@media screen and (max-width: 800px) {
  .tiles-section {
    padding-bottom: 40px;
  }
  .toggle-list-and-pagination > div {
    flex-direction: column;
    align-items: flex-start;
    gap: 30px;
  }
  .toggle-list-and-pagination > div:first-child > .is-inline-block {
    align-self: center;
    margin-bottom: 20px !important;
  }
  .toggle-list-and-pagination .sort-options > span {
    margin-left: 0;
  }
  .table,
  .table tr {
    width: 100%;
  }
  .table-container thead tr,
  .table-container tr.row-infos {
    display: flex;
    flex-wrap: wrap;
  }
  .table-container thead tr {
    justify-content: flex-start;
  }
  .table-container thead tr > th {
    flex: 25% 0 0;
  }
  .table-container thead tr > th:nth-child(2),
  .table-container thead tr > th:nth-child(4),
  .table-container thead tr > th:nth-child(7),
  .table-container thead tr > th:nth-child(8) {
    display: none;
  }
  .table-container thead tr > th:nth-child(5),
  .table-container thead tr > th:nth-child(6) {
    padding: 15px 20px 12px 0;
  }
  .table-container thead tr > th:nth-child(5) div.sortable,
  .table-container thead tr > th:nth-child(6) div.sortable {
    align-items: flex-end;
    justify-content: flex-start;
  }
  .table-container thead tr > th:nth-child(5) div.sortable abbr {
    padding-right: 12px;
  }
  .table-container tr.row-infos {
    border-top: #b9192f 1px dashed;
    padding: 10px 20px;
    position: relative;
  }
  .table-container tr.row-infos:last-child {
    padding-bottom: 20px;
    border-bottom: #ba0f29 solid 3px;
  }
  .table-container tr.row-details td {
    padding: 0;
  }
  .table-container tr.row-details ul {
    padding: 15px;
  }
  .text-results .table > a .position-highlight,
  tr.row-details li {
    font-size: 14px;
    line-height: 24px;
  }
  tr.row-infos > td {
    border: none !important;
    padding: 0;
  }
  tr.row-infos.is-selected > td::before {
    color: #fff !important;
  }
  tr.row-infos > td:nth-child(1) {
    /* Nom */
    order: 1;
    font-size: 18px;
    margin-right: 10px;
  }
  tr.row-infos > td:nth-child(2) {
    order: 2;
    font-size: 16px;
  }
  tr.row-infos > td:nth-child(3) {
    /* Promotion */
    order: 4;
    flex: 100% 0 0;
    padding-top: 10px;
    font-weight: 500;
    color: #000000;
  }
  tr.row-infos > td:nth-child(3)::before {
    content: "Promotion : ";
    color: #666666;
  }
  tr.row-infos > td:nth-child(4) {
    /* Titre */
    order: 3;
    flex: 100% 0 0;
    padding: 4px 50px 0 0;
  }
  tr.row-infos > td:nth-child(4) > a {
    font-weight: 600 !important;
    line-height: 22px;
  }
  tr.row-infos > td:nth-child(5) {
    order: 5;
    color: #000000;
  }
  tr.row-infos > td:nth-child(5)::before {
    content: "Période du sujet : de";
    margin: 0 5px 0 0;
    color: #666666;
  }
  tr.row-infos > td:nth-child(6) {
    order: 6;
    color: #000000;
  }
  tr.row-infos > td:nth-child(6)::before {
    content: "à";
    margin: 0 5px;
    color: #666666;
  }
  tr.row-infos > td:nth-child(7) {
    order: 7;
    position: absolute;
    top: 15px;
    right: 20px;
  }
  tr.row-infos > td:nth-child(8) {
    order: 8;
    position: absolute;
    bottom: 10px;
    right: 12px;
  }
}
@media screen and (max-width: 768px) {
  /* The mode selector is cramped: drop its side padding */
  .search-mode-trigger {
    padding: 0 8px;
    gap: 4px;
  }

  /* ===================================================================
     Filter SIDEBAR
     =================================================================== */
  .facets-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    flex: none;
    width: 85vw;
    max-width: 440px;
    height: 100dvh;
    max-height: 100dvh;
    z-index: 40;
    box-shadow: 2px 0 16px rgba(0, 0, 0, .25);
    overflow-y: auto;
  }

  .sticky-search-header{
    margin : 0;
    padding-left: 1px !important;
    padding-right: 1px !important;
  }

  .sidebar-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, .45);
    z-index: 39;
  }

  .sidebar-slide-enter-active,
  .sidebar-slide-leave-active {
    transition: transform .25s ease;
  }
  .sidebar-slide-enter-from,
  .sidebar-slide-leave-to {
    transform: translateX(-100%);
  }

  .backdrop-fade-enter-active,
  .backdrop-fade-leave-active {
    transition: opacity .2s ease;
  }
  .backdrop-fade-enter-from,
  .backdrop-fade-leave-to {
    opacity: 0;
  }
  .search-facets {
    padding: 10px 24px 24px 24px;
  }
}
@media screen and (max-width: 640px) {
  /* The header sticks below .top-tint rather than under it. Offset its
     `top`, not its padding: a padding would show before it sticks too, as
     white under the search bar. Same guard as the strip: elsewhere it does
     not exist and the offset would leave a transparent gap. */
  @supports (-webkit-text-size-adjust: none) and (font: -apple-system-body) and (-webkit-touch-callout: none) {
    .sticky-search-header {
      top: calc(6px + 12px - var(--search-bar-offset));
    }
  }

  .table thead th {
    padding-left: 10px;
  }
  .table-container thead tr > th:nth-child(6) {
    padding-right: 10px;
  }
  .table-container tr.row-infos {
    padding: 10px 40px 10px 10px;
  }
  tr.row-infos > td:nth-child(7) {
    right: 10px;
  }
  tr.row-infos > td:nth-child(8) {
    right: 0;
  }
}


/* Safari iOS zooms in when focusing a field whose font drops below 16px,
   and never zooms back out. Raise it, on iOS only. */
@supports (-webkit-text-size-adjust: none) and (font: -apple-system-body) and (-webkit-touch-callout: none) {
  .sliders input[type="number"].year {
    font-size: 16px;
  }
}


/* ===================================================================
   Search bar placed as the navbar's search banner (NavbarSearch): a
   full-width grey band, its content on the navbar's content edges, the
   bar 22px under the navbar (12px under 768px, as the banner's 56px);
   the filters row below it.
   =================================================================== */
.collection-wrapper {
  --search-bar-offset: 22px;
}
.sticky-search-header.app-width-margin {
  width: 100%;
  max-width: none;
  margin: 0;
  padding-left: calc((100% - var(--default-content-width)) / 2) !important;
  padding-right: calc((100% - var(--default-content-width)) / 2) !important;
  background-color: #f0f0f0;
}
.sticky-search-header .search-form {
  border-radius: 0;
}
.sticky-search-header .search-form > .search-bar-row {
  padding-left: 0;
}
.sticky-search-header .search-submit {
  margin-right: 0;
}
.sticky-search-header :deep(.active-filters) {
  padding-left: 0;
  padding-right: 0;
}
/* No white line at the bottom of the band */
.sticky-search-header .active-filters-and-sliders {
  border-bottom: none;
}
@media screen and (max-width: 1320px) {
  .sticky-search-header.app-width-margin {
    padding-left: 20px !important;
    padding-right: 20px !important;
  }
}
@media screen and (max-width: 768px) {
  .collection-wrapper {
    --search-bar-offset: 12px;
  }
  .sticky-search-header.app-width-margin {
    padding-left: 12px !important;
    padding-right: 12px !important;
  }
}

/* From 1024px down the field gets too narrow to hold the query error on
   its right: under the bar, as before, the field wrapping it to its own
   line; the clear cross stays on the input's middle */
@media screen and (max-width: 1024px) {
  /* on its own line, across the whole bar: selector, field and, past the
     wrapper, the submit button */
  .search-error-message {
    position: static;
    flex: 0 0 calc(100% + var(--button-size));
    max-width: none;
    margin-top: 4px;
    margin-right: calc(-1 * var(--button-size));
    transform: none;
    text-align: center;
    white-space: normal;
  }
  .search-form .input.input-error {
    padding-right: 40px;
  }
}

/* The mode list's options no bigger than the selector button itself: its
   height (inside a 1px border) and side padding */
.search-mode-option {
  display: flex;
  align-items: center;
  box-sizing: border-box;
  height: calc(var(--button-size) - 2px);
  padding: 0 14px;
}
@media screen and (max-width: 768px) {
  .search-mode-option {
    padding: 0 8px;
  }
}

/* The mode list as wide as its words (never wider than the selector), no
   empty space after them */
.search-mode-dropdown {
  right: auto;
  width: max-content;
  min-width: 0;
}
</style>