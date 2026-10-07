import { computed, watch } from 'vue'
import { debounce } from 'lodash'
import { useStore } from 'vuex'
import useApi from '@/composables/use-api'

const _baseApiURL = import.meta.env.VITE_APP_ELASTICSEARCH_URL

/**
 * Every resource of a collection, in one call, from the search index.
 * `no-highlight` asks for resources rather than passage buckets: that is both
 * the shape a list needs and a far lighter payload.
 *
 * Returns null when the collection is not indexed, or when it holds more
 * resources than one page can carry, so the caller can fall back to the DTS
 * API. Throws on a network or HTTP failure, for the same reason.
 */
const collectionResourcesInFlight = new Map()

export function fetchIndexedCollectionResources (collectionId, pageSize = 200, options = {}) {
  const url = `${_baseApiURL}/search?query=&collectionId=${encodeURIComponent(collectionId)}`
    + `&no-highlight&page[number]=1&page[size]=${pageSize}`

  // The caller is a watcher on two refs, so it can fire twice for one page
  if (collectionResourcesInFlight.has(url)) {
    return collectionResourcesInFlight.get(url)
  }

  const request = fetch(url, { mode: 'cors', ...options })
    .then(async response => {
      if (!response.ok) {
        throw new Error(`search ${response.status} on ${url}`)
      }

      const body = await response.json()

      if (body.collection_indexed !== true) return null

      const items = Array.isArray(body.data) ? body.data : []
      const total = body.total_count ?? items.length

      // One page is all this path asks for: until the list paginates against
      // the server, a truncated answer would silently hide resources.
      if (items.length < total) {
        console.warn(
          `use-simple-search.js fetchIndexedCollectionResources : ${collectionId} `
          + `holds ${total} resources, above the ${pageSize} per page cap, `
          + 'falling back to the DTS API'
        )
        return null
      }

      return items
    })
    .finally(() => {
      collectionResourcesInFlight.delete(url)
    })

  collectionResourcesInFlight.set(url, request)
  return request
}

export default function useSimpleSearch() {
  const store = useStore()
  const api = useApi()

  const searchState = computed(() => {
    const pid = store.state.search.activeProjectId
    if (!pid) return null
    return store.state.search.byProject[pid]
  })

  // ----------------------
  // DERIVED (safe)
  // ----------------------
  const isResourceSearch = computed(() => {
    const s = searchState.value
    if (!s) return false
    return !s.term || s.term.trim() === '' ? !!s.collectionId : false
  })

  const groupbyField = computed(() => {
    const s = searchState.value
    if (!s) return ''
    return !isResourceSearch.value && s.term ? 'resource_id' : ''
  })

  const withIds = computed(() => {
    const s = searchState.value
    if (!s) return 0
    return s.term?.trim() ? 10000 : 0
  })

  // ----------------------
  // MUTATIONS
  // ----------------------
  const setSearchCollectionId = v => store.commit('search/setSearchCollectionId', v)
  const setNoHighlight = v => store.commit('search/setNoHighlight', v)
  const setTerm = v => store.commit('search/setSearchTerm', v)
  const setSearchFilter = ({ key, value }) => store.commit('search/setSearchFilter', { key, value })
  const setRange = (k, v) => store.commit('search/setSearchRange', { key: k, value: v })
  const removeRange = k => store.commit('search/removeSearchRange', k)
  const setSorts = v => store.commit('search/setSearchSorts', v)
  const setPageNum = v => store.commit('search/setSearchPage', v)
  const setCollectionId = v => store.commit('search/setSearchActiveCollection', v)
  const setIsFulltextSearch = v => store.commit('search/setSearchIsFulltextSearch', v)
  const setExcludedTemporalFacets = v => store.commit('search/setSearchExcludedTemporalFacets', v)
  const setExcludedFacets = v => store.commit('search/setSearchExcludedFacets', v)
  const setGranularity = v => store.commit('search/setSearchGranularity', v)
  const setGroupBy = v => store.commit('search/setSearchGroupBy', v)
  const setFacet = ({ facetType, value }) =>
    store.commit('search/setFacet', {
      facetType,
      value
  })
  const removeFacet = ({ facetType, facetKey }) =>
    store.commit('search/removeFacet', {
      facetType,
      facetKey
    })
  const removeFacetType = facetType => store.commit('search/removeFacetType', facetType)
  const clearFacets = () => store.commit('search/clearFacets')
  const setFacetOpened = facetId => store.commit('search/setFacetOpened', facetId)
  const setFacetClosed = facetId => store.commit('search/setFacetClosed', facetId)

  const saveSnapshot = () => store.commit('search/saveSearchSnapshot')
  const restoreSnapshot = dir => store.commit('search/restoreSearchSnapshot', dir)

  // ----------------------
  // QUERY
  // ----------------------
  function updateQuery() {
    const s = searchState.value
    if (!s) return

    let rangesArg = ''

    Object.entries(s.ranges || {}).forEach(([field, range]) => {


  // ---------- intervalle historique ----------
  if (range.startField && range.endField) {

    if (range.lte != null) {
      rangesArg +=
        `&range[${range.startField}]=lte:${range.lte}`
    }

    if (range.gte != null) {
      rangesArg +=
        `&range[${range.endField}]=gte:${range.gte}`
    }

    return
  }


  // ---------- intervalle simple ----------
  if (range.gte != null || range.lte != null) {

    const params = []

    if (range.gte != null)
      params.push(`gte:${range.gte}`)

    if (range.lte != null)
      params.push(`lte:${range.lte}`)

    if (params.length) {
      rangesArg +=
        `&range[${field}]=${params.join(',')}`
    }

  }

})

    // A fragment search lists one fragment type (citeType) instead of resources
    const granularityArg = s.granularity
      ? `&scope=fragment&citeType=${encodeURIComponent(s.granularity)}`
      : ''

    // Grouped fragments are sorted on their resource path first, so a group never splits across pages
    const sorts = [s.granularity && s.groupBy?.length ? 'path' : '', s.sorts]
      .filter(Boolean)
      .join(',')
    const sortArg = sorts ? `&sort=${sorts}` : ''
    const highlightArg = s.noHighlight ? '&no-highlight' : ''
    const termValue = !isResourceSearch.value ? (s.term || '***') : ''

    let groupbyArg = ''
    if (groupbyField.value) {
      groupbyArg = `&groupby[field]=${groupbyField.value}`
      if (withIds.value) groupbyArg += `&groupby[with-ids]=${withIds.value}`
      //if (s.afterKey) groupbyArg += `&groupby[after-page]=${s.afterKey}`
    }

    let afterArg = ''
    if (s.noHighlight === false && s.pageNum > 1) {
      afterArg = `&after=${s.afterKeys[s.pageNum - 1]}`
    }

    const collectionArg =
      s.collectionId || s.activeCollectionId
        ? `&collectionId=${s.collectionId || s.activeCollectionId}`
        : ''

    // SEARCH FILTERS
    let filterArgs = ''

    const filters = Object.entries(s.filters || {})
      .filter(([, value]) => value)

    if (filters.length) {
      filterArgs =
        'filters=' +
        filters
          .map(([field, value]) =>
            `resource_metadata.dublincore.${field}:${encodeURIComponent(value)}`
          )
          .join(',')
    }

    // SEARCH FACETS
    let facetArgs = ''
    //10juillet2026 Object.entries(s.facets.selected).forEach(([facetType, values]) => {
    //   values.forEach(value => {
    //     facetArgs += `&${facetType}=[${encodeURIComponent(value)}]`
    //   })
    // })
    const selectedFacets = Object.fromEntries(
      Object.entries(s.facets.selected)
        .filter(([, values]) => values.length > 0)
    )

    if (Object.keys(selectedFacets).length) {

      facetArgs =
        `&facets=${encodeURIComponent(
          JSON.stringify(selectedFacets)
        )}`

    }

    // EXCLUDED TEMPORAL FACETS
    // Temporal facets disabled in searchConfig.temporalFacets: the API
    // skips their aggregations. Empty list => no parameter, the API falls
    // back to its historical behaviour.
    let temporalArg = ''

    if (s.excludedTemporalFacets?.length) {
      temporalArg =
        `&excludeTemporalFacets=${
          s.excludedTemporalFacets.map(encodeURIComponent).join(',')
        }`
    }

    // EXCLUDED FACETS
    // Metadata facets disabled in searchConfig.facets: the API skips their
    // aggregations. Empty list => no parameter, the API falls back to its
    // historical behaviour.
    let excludeFacetsArg = ''

    if (s.excludedFacets?.length) {
      excludeFacetsArg =
        `&excludeFacets=${
          s.excludedFacets.map(encodeURIComponent).join(',')
        }`
    }

    const searchUrl = `${_baseApiURL}/search?query=${encodeURIComponent(termValue)}&${filterArgs}&page[number]=${s.pageNum}&page[size]=${s.pageSize}${sortArg}${highlightArg}${groupbyArg}${collectionArg}${facetArgs}${rangesArg}${temporalArg}${excludeFacetsArg}${afterArg}${granularityArg}`

    api.setQuery(searchUrl)
    console.log('use-simple-search.js updateQuery searchUrl :', searchUrl)
  }

  watch(
    () => [
      searchState.value?.term,
      searchState.value?.pageNum,
      searchState.value?.pageSize,
      searchState.value?.filters,
      searchState.value?.ranges,
      searchState.value?.sorts,
      searchState.value?.collectionId,
      searchState.value?.noHighlight,
      searchState.value?.afterKey,
      JSON.stringify(searchState.value?.facets?.selected),
      JSON.stringify(searchState.value?.excludedTemporalFacets),
      JSON.stringify(searchState.value?.excludedFacets),
      searchState.value?.granularity,
      JSON.stringify(searchState.value?.groupBy),
    ],
    updateQuery,
    { immediate: true, deep: true }  // garde le comportement initial de watchEffect
  )

  // ----------------------
  // EXECUTE QUERY ---
  // ----------------------
  const execute = debounce(async () => {
    const pid = store.state.search.activeProjectId
    if (!pid) return

    store.commit('search/setSearchLoading', true)

    try {
      if (!api.query.value) return

      await api.runQuery()

      const _res = api.result.value

      if (!_res) return

      // -----------------------------
      // NORMALISATION FORMAT BACKEND
      // -----------------------------

      const hasBuckets = Array.isArray(_res.buckets)

      let res = {}

      if (hasBuckets) {
        res = {
          data: _res,
          buckets: _res.buckets || null,
          total_count: _res.total_count ?? _res['total-count'] ?? 0,
          bucket_count: _res.bucket_count ?? _res['bucket-count'] ?? null,
          after_key: _res.after_key ?? _res['after-key'] ?? null,
          facets: _res.facets ?? _res['facets'] ?? {},
          highlight_patterns: _res.highlight_patterns ?? [],
          temporal: _res.temporal ?? {},
          granularities: _res.granularities ?? [],
          // null when search is missing collection id
          collection_indexed: _res.collection_indexed ?? null
        }
      } else {
        res = {
          data: _res.data,
          buckets: _res.buckets || null,
          total_count: _res.total_count ?? _res['total-count'] ?? 0,
          bucket_count: _res.bucket_count ?? _res['bucket-count'] ?? null,
          after_key: _res.after_key ?? _res['after-key'] ?? null,
          facets: _res.facets ?? _res['facets'] ?? {},
          highlight_patterns: _res.highlight_patterns ?? [],
          temporal: _res.temporal ?? {},
          granularities: _res.granularities ?? [],
          // null when search is missing collection id
          collection_indexed: _res.collection_indexed ?? null
        }
      }


      store.commit('search/setSearchResult', res)

    } catch (e) {
      console.error('search execute error', e)
    } finally {
      store.commit('search/setSearchLoading', false)
    }
  }, 150)

  // ----------------------
  // API EXPOSED
  // ----------------------
  return {
    term: computed(() => searchState.value?.term || ''),
    filters: computed(() => searchState.value?.filters || {}),
    ranges: computed(() => searchState.value?.ranges || {}),
    sorts: computed(() => searchState.value?.sorts || ''),
    pageNum: computed(() => searchState.value?.pageNum || 1),
    pageSize: computed(() => searchState.value?.pageSize || 25),

    result: computed(() => searchState.value?.result || []),
    openedFacets: computed(() => searchState.value?.openedFacets || []),
    facets: computed(() => searchState.value?.facets || {}),
    initialFacets: computed(() => searchState.value?.initialFacets || { available: {} }),
    temporal: computed(() => searchState.value?.temporal ?? []),
    excludedTemporalFacets: computed(() => searchState.value?.excludedTemporalFacets ?? []),
    excludedFacets: computed(() => searchState.value?.excludedFacets ?? []),
    initialTemporal: computed(() => searchState.value?.initialTemporal ?? {}),
    totalCount: computed(() => searchState.value?.totalCount || 0),
    bucketCount: computed(() => searchState.value?.bucketCount || null),
    // below `?? null` instead of `|| null`: false has a meaning in this case
    collectionIndexed: computed(() => searchState.value?.collectionIndexed ?? null),
    loading: computed(() => searchState.value?.loading || false),

    isFulltextSearch: computed(() => searchState.value?.isFulltextSearch ?? true),
    isResultTableMode: computed(() => searchState.value?.isResultTableMode ?? true),

    granularity: computed(() => searchState.value?.granularity ?? null),
    groupBy: computed(() => searchState.value?.groupBy ?? []),
    granularities: computed(() => searchState.value?.granularities ?? []),

    setNoHighlight,
    setTerm,
    setSearchFilter,
    setRange,
    removeRange,
    setSorts,
    setPageNum,
    setSearchCollectionId,
    setCollectionId,
    setIsFulltextSearch,
    setFacet,
    removeFacet,
    removeFacetType,
    clearFacets,
    setFacetOpened,
    setFacetClosed,
    setExcludedTemporalFacets,
    setExcludedFacets,
    setGranularity,
    setGroupBy,

    saveSnapshot,
    restoreSnapshot,

    execute,

    error: computed(() => api.error.value)
  }
}