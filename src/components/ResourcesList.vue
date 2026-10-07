<template>
  <!-- PAGINATION TOP -->
  <Pagination
    v-model="pageNumber"
    :total-pages="totalPages"
    :is-table-loading="isTableLoading"
    :documents-count-text="resultsSummaryText"
    :class="tableVariant"
  />
  <div
    class="list-mode-wrapper"
    :class="[totalPages > 1 ? 'with-bottom-pagination' : 'without-bottom-pagination', tableVariant]"
  >
    <ul
      class="tree list-mode"
      :style="{ '--grid-template-columns': gridTemplateColumns }"
    >
      <!-- HEADER -->
      <li class="list-header">
        <div
          class="li container header"
          :class="{ 'search-header': isElasticSearch }"
        >
          <!-- ============================= -->
          <!-- ELASTIC SEARCH / HIGHLIGHTS   -->
          <!-- ============================= -->
          <template v-if="isElasticSearch">
            <div
              v-for="col in columns"
              :key="col.key"
              class="cell header-cell search"
            >
              <div class="cell header-cell-fields">
                <SortIcon
                  v-if="col.sortable !== false"
                  class="icons"
                  :state="sort.key === col.key ? sort.direction : 'none'"
                  :type="col.type || 'string'"
                  fg-color="white"
                  :size="32"
                  @click="toggleSort(col)"
                />
                <span>{{ col.label }}</span>
              </div>
            </div>
            <!-- Chevron column -->
            <div
              v-if="isHighlights"
              class="cell header-cell chevron-header-cell"
            />
          </template>
          <!-- ============================= -->
          <!-- NORMAL                        -->
          <!-- ============================= -->
          <template v-else>
            <div
              v-for="col in columns"
              :key="col.key"
              class="cell header-cell"
            >
              <span>{{ col.label }}</span>

              <div class="cell header-cell-fields">
                <!-- SORT -->
                <SortIcon
                  class="icons"
                  :state="sort.key === col.key ? sort.direction : 'none'"
                  :type="col.type || 'string'"
                  fg-color="white"
                  :size="32"
                  @click="toggleSort(col)"
                />

                <!-- FILTER -->
                <div
                  v-if="!col.type || col.type !== 'range'"
                  class="input-wrapper"
                >
                  <input
                    v-model="filters[col.key]"
                    class="filter"
                    type="text"
                    @click.stop
                  >
                  <svg
                    v-if="filters[col.key]"
                    class="clear-icon"
                    viewBox="0 0 24 24"
                    @click.stop="filters[col.key] = ''"
                  >
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                  </svg>
                </div>

                <!-- RANGE FILTER -->
                <div
                  v-else
                  class="range-filter"
                  @click.stop
                >
                  <div class="input-wrapper">
                    <input
                      v-model="filters[col.key].from"
                      type="number"
                      placeholder="de"
                    >
                    <svg
                      v-if="filters[col.key].from"
                      class="clear-icon"
                      viewBox="0 0 24 24"
                      @click.stop="filters[col.key].from = ''"
                    >
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="15" y1="9" x2="9" y2="15"/>
                      <line x1="9" y1="9" x2="15" y2="15"/>
                    </svg>
                  </div>
                  <div class="input-wrapper">
                    <input
                      v-model="filters[col.key].to"
                      type="number"
                      placeholder="à"
                    >
                    <svg
                      v-if="filters[col.key].to"
                      class="clear-icon"
                      viewBox="0 0 24 24"
                      @click.stop="filters[col.key].to = ''"
                    >
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="15" y1="9" x2="9" y2="15"/>
                      <line x1="9" y1="9" x2="15" y2="15"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </li>

      <!-- LOADING -->
      <template v-if="isTableLoading">
        <li v-for="n in 5" :key="n">
          <div class="li container row">
            <div
              v-for="col in columns"
              :key="col.key"
              class="cell"
            >
              <div class="skeleton"/>
            </div>
          </div>
        </li>
      </template>

      <!-- ROWS -->
      <template v-else>

        <!-- 🔍 MODE SEARCH HIGHLIGHTS RESULTS -->
        <template v-if="isHighlights && bucketsCount > 0">

          <template v-for="item in paginated" :key="item.identifier">

            <!-- ROW principale -->
            <li>
              <div
                class="li container row"
                :class="{ 'is-selected': isOpen(item.identifier) }"
                @click="toggle(item.identifier)"
              >
                <!-- DONNÉES -->
                <div
                  v-for="col in columns"
                  :key="col.key"
                  class="cell"
                >
                  <a
                    href="#"
                    @click.prevent
                  >
                    {{ getRowValue(item, col.key) }}
                  </a>
                </div>
                <!-- CHEVRON -->
                <div class="cell" :class="isOpen(item.identifier) ? 'chevron-down' : 'chevron-up'">
                  <a
                    href="#"
                    :aria-expanded="isOpen(item.identifier)"
                    aria-label="Afficher les résultats"
                    @click.stop.prevent="toggle(item.identifier)"
                  >
                  </a>
                </div>
              </div>
            </li>

            <!-- ROW détails -->
            <li v-if="isOpen(item.identifier)">
              <div class="li container row-details">
                <div class="cell" :style="{ gridColumn: '1 / -1' }">
                  <ul class="hits-list">
                    <li
                      v-for="hit in item.hits"
                      :key="hit.passageId"
                    >
                      <router-link
                        :to="hit.passageUrl"
                        class="hit-breadcrumb"
                      >
                        <template
                          v-for="(part, i) in buildBreadcrumbParts(hit)"
                          :key="i"
                        >
                          <span
                            v-if="i > 0"
                            class="hit-breadcrumb-sep"
                            aria-hidden="true"
                          >&gt;</span>
                          <span class="hit-breadcrumb-tag">{{ part }}</span>
                        </template>
                      </router-link>
                      <ul v-if="hit.highlight?.content">
                        <li
                          v-for="phrase in hit.highlight.content"
                          :key="phrase"
                        >
                          <span v-html="phrase"></span>
                        </li>
                      </ul>
                    </li>
                  </ul>
                </div>
              </div>
            </li>
          </template>
        </template>

        <!-- FRAGMENTS: one row per fragment, optional group headers -->
        <template v-else-if="isFragmentList">
          <template
            v-for="(item, index) in paginated"
            :key="item.identifier"
          >
            <li
              v-for="header in groupHeadersAt(index)"
              :key="header.key"
              class="group-header"
              :class="`group-header--${header.level}`"
            >
              <div class="li container group-header-row">
                <div class="cell">
                  {{ header.label }}
                </div>
              </div>
            </li>
            <li>
              <div
                class="li container row"
                @click="goToPassage(item, $event)"
              >
                <div
                  v-for="col in columns"
                  :key="col.key"
                  class="cell"
                >
                  <a :href="item.passageUrl?.href">
                    {{ getRowValue(item, col.key) }}
                  </a>
                </div>
              </div>
              <div
                v-if="item.snippets?.length"
                class="li container row-snippets"
              >
                <div class="cell">
                  <span
                    v-for="phrase in item.snippets"
                    :key="phrase"
                    class="snippet"
                    v-html="phrase"
                  />
                </div>
              </div>
            </li>
          </template>
        </template>

        <!-- NON SEARCH MODE -->
        <template v-else>
          <li
            v-for="item in paginated"
            :key="item.identifier"
          >
            <div
              class="li container row"
              @click="goToPageTable(item, $event)"
            >
              <div
                v-for="col in columns"
                :key="col.key"
                class="cell"
              >
                <a :href="getTableHref(item)">
                  {{ getRowValue(item, col.key) }}
                </a>
              </div>
            </div>
          </li>
        </template>

        <li v-if="showNotIndexed" class="empty-row empty-row--not-indexed">
          <div class="li container row">
            <div class="cell">
              Cette collection ne semble pas avoir été indexée : la recherche sera
              disponible une fois l'indexation effectuée.
            </div>
          </div>
        </li>

        <li v-else-if="showNoResults" class="empty-row">
          <div class="li container row">
            <div class="cell">
              Aucun résultat pour cette recherche.
            </div>
          </div>
        </li>

      </template>
    </ul>
  </div>
  <!-- PAGINATION BOTTOM -->
  <Pagination
    v-if="totalPages > 1"
    v-model="pageNumber"
    :total-pages="totalPages"
    :is-table-loading="isTableLoading"
    documents-count-text=""
    class="pagination-bottom"
    :class="tableVariant"
  />
</template>

<script>
import { ref, computed, watch } from 'vue'
import { router } from '@/router'
import store from '@/store'
import { useTable } from '@/composables/useTable.js'

import SortIcon from '@/assets/images/SortIcon.vue'
import Pagination from '@/components/Pagination.vue'


export default {
name: 'ResourcesList',
  components: {
    SortIcon,
    Pagination
  },

  props: {
    data: { type: Array, required: true },
    columnsConfig: { type: Array, required: true },
    currentPage: { type: Number, default: 1 },
    pageSize: { type: Number, default: 10 },
    isDocProjectIdIncluded: Boolean,
    counts: { type: Number },
    isElasticSearch: Boolean,
    totalBuckets: { type: Number },
    isTableLoading: Boolean,
    isWithHighlights: Boolean,
    // Fragment results (granularity): one row per fragment, linked to its passage
    isFragmentList: Boolean,
    // Levels the fragment rows are grouped by: 'subCollection', 'resource'
    groupBy: { type: Array, default: () => [] },
    // Name of the listed fragments in the results count, e.g. "actes"
    countLabel: { type: String, default: null },
    // true / false after search is executed ; null when irrelevant (outside search mode or search missing scope collection)
    collectionIndexed: { type: Boolean, default: null }
  },
  emits: [
    'sort-change',
    'page-change'
  ],

  setup(props, { emit }) {
    // STATE
    const pageNumber = ref(props.currentPage)
    const dataSource = computed(() => props.data || [])
    const isTableLoading = computed(() => props.isTableLoading)
    const pageSize = ref(props.pageSize)
    const resultsCounts = computed(() => props.counts)
    const isElasticSearch = computed(() => props.isElasticSearch || false)

    // Array variant: responsive rules differ between search results and collection pages
    const tableVariant = computed(() =>
      isElasticSearch.value ? 'search-results' : 'collection-results'
    )
    const bucketsCount = computed(() => props.totalBuckets)

    // TABLE
    const isHighlights = computed(() => props.isWithHighlights)

    const openRows = ref([])

    const toggle = (id) => {
      if (openRows.value.includes(id)) {
        openRows.value = openRows.value.filter(i => i !== id)
      } else {
        openRows.value.push(id)
      }
    }

    const isOpen = (id) => openRows.value.includes(id)

    const columns = computed(() => {
      const baseCols = (props.columnsConfig || []).filter(Boolean)

      if (isHighlights.value && bucketsCount?.value > 0) {
        return [
          ...baseCols,
        ]
      }
      return baseCols

    })

    //const table = useTable(dataSource, columns, pageSize, currentPage)
    const remoteTotalResults = computed(() =>
      isHighlights.value && bucketsCount.value > 0
        ? bucketsCount.value
        : resultsCounts.value
    )

    const table = useTable(dataSource, columns, {
      pageSize,
      currentPage: pageNumber,
      remote: isElasticSearch,
      totalResults: remoteTotalResults
    })

    // FILTERS INIT
    const filters = computed({
      get: () => table.filters.value,
      set: (val) => (table.filters.value = val)
    })

    // SORT
    const sort = computed(() => table.sort.value)

    // DATA
    const totalPages = computed(() => table.totalPages.value)
    const paginated = computed(() => table.paginated.value)

    // NO RESULTS HANDLING (not -properly- indexed yet, or no results)
    const hasNoRows = computed(
      () => !isTableLoading.value && (paginated.value?.length ?? 0) === 0
    )

    const showNotIndexed = computed(
      () => isElasticSearch.value && hasNoRows.value && props.collectionIndexed === false
    )

    const showNoResults = computed(
      () => hasNoRows.value && !showNotIndexed.value
    )


    const getRowValue = (row, key) => {

      const value = table.getValue(row, key)

      const col = columns.value.find(col => col.key === key)

      if (isElasticSearch.value) {
        // En mode search les colonnes de type date sont
        // soumises à la validation temporelle.
        if (col?.type !== 'date') {
          return value
        }

        // The metadata key resolves on its own, whatever its namespace
        const { start, end } = table.getTemporalRange(row, key)

        // La normalisation n'a pas produit les deux bornes :
        // on n'affiche pas la date, sauf pour un fragment (valeur source signalée)
        if (start == null || end == null) {
          return props.isFragmentList && value ? `${value} (non normalisée)` : ''
        }
      }

      return value
    }

    // Remote pages are fetched by the parent, which owns the search. A page
    // equal to `currentPage` was pushed down by the parent (a sort or a new
    // search resetting to page 1) and must not trigger a second request.
    watch(pageNumber, (page) => {
      if (isElasticSearch.value && page !== props.currentPage) {
        emit('page-change', Math.max(1, page))
      }
    })

    watch(
      () => props.currentPage,
      page => {
        pageNumber.value = page
      }
    )

    watch(() => columns.value, (cols) => {
      if (!cols?.length) return

      const initialFilters = {}
      cols.forEach(col => {
        initialFilters[col.key] = col.type === 'range'
          ? { from: '', to: '' }
          : ''
      })

      table.filters.value = initialFilters

      if (sort.value.key && !cols.some(col => col.key === sort.value.key)) {
        sort.value.key = null
        sort.value.direction = 'none'
      }
    }, { immediate: true })

    // TEXT
    const documentCount = computed(() => {
      return isHighlights.value && bucketsCount?.value > 0
        ? (bucketsCount?.value ?? 0)
        : resultsCounts.value
    })

    const passageCount = computed(() => {
      return isHighlights.value && bucketsCount?.value > 0
        ? resultsCounts.value
        : null
    })

    const resultsSummaryText = computed(() => {
      const docs = documentCount.value
      const passages = passageCount.value

      if (props.isFragmentList) {
        return `${docs} ${props.countLabel || 'fragments'}`
      }

      const docLabel = docs > 1 ? 'documents' : 'document'

      // Cas simple : pas de highlights OU aucun passage
      if (!isHighlights.value || passages === null) {
        return `${docs} ${docLabel}`
      }

      const passageLabel = passages > 1 ? 'passages' : 'passage'

      return `${docs} ${docLabel} (${passages} ${passageLabel})`
    })

    const toggleSort = (col) => {
      if (sort.value.key !== col.key) {
        sort.value.key = col.key
        sort.value.direction = 'asc'
      } else {
        switch (sort.value.direction) {
          case 'none':
            sort.value.direction = 'asc'
            break
          case 'asc':
            sort.value.direction = 'desc'
            break
          case 'desc':
            sort.value.direction = 'none'
            sort.value.key = null
            break
        }
      }

      emit('sort-change', {
        key: sort.value.key,
        direction: sort.value.direction,
        column: col
      })
    }

    // DYNAMIC COLUMNS CSS
    const gridTemplateColumns = computed(() => {
      const cols = columns.value || []
      const chevronWidth = '40px'

      if (!cols.length) {
        return chevronWidth
      }

      const widths = cols.some(col => col.width)
        ? cols.map(col => col.width || '1fr')
        : Array(cols.length).fill('1fr')

      if (isHighlights.value) {
        return [...widths, chevronWidth].join(' ')
      } else {
        return [...widths].join(' ')
      }
    })

    // DOCUMENT BREADCRUMB
    const formatCiteType = (str) => str?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

    const getLabel = (item) => {
      if (!item) return null
      return item.title || formatCiteType(item.citeType)
    }

    // Breadcrumb segments for a passage: rendered as tags in the link
    const buildBreadcrumbParts = (hit) => {
      const parts = [
        ...(hit.ancestors || []).map(getLabel),
        getLabel(hit)
      ].filter(Boolean)

      if (!parts || parts.length === 0) {
        return ['Document entier']
      }
      return parts.filter(Boolean)
    }


    // GROUPS: a header where the sub-collection or the resource changes,
    // the rows coming sorted by their resource path
    const groupHeadersAt = (index) => {
      const levels = ['subCollection', 'resource'].filter(level => props.groupBy.includes(level))
      const rows = paginated.value
      const item = rows[index]
      const previous = index > 0 ? rows[index - 1] : null
      const headers = []
      let changed = !previous

      levels.forEach(level => {
        const group = item.groupKeys?.[level]
        changed = changed || group?.id !== previous?.groupKeys?.[level]?.id

        if (changed && group) {
          headers.push({ key: `${level}:${group.id}:${index}`, level, label: group.label })
        }
      })

      return headers
    }

    const goToPassage = async (item, event) => {
      if (
        !item.passageUrl ||
        event?.metaKey ||
        event?.ctrlKey ||
        event?.shiftKey ||
        event?.button === 1
      ) return

      event.preventDefault()
      await router.push(item.passageUrl)
    }

    // NAVIGATION
    const setStateCollection = (collId) => {
      store.commit('setCollectionId', collId)
    }

    const buildDocumentRoute = (item) => {
      if (props.isDocProjectIdIncluded) {
        return {
          name: 'Document',
          params: {
            collId: item.projectIdentifier,
            id: item.identifier
          }
        }
      }
      return {
        name: 'Document',
        params: { id: item.identifier }
      }
    }

    const getTableHref = (item) => {
      const to = buildDocumentRoute(item)
      return router.resolve(to).href
    }

    const goToPageTable = async (item, event) => {
      if (
        event?.metaKey ||
        event?.ctrlKey ||
        event?.shiftKey ||
        event?.button === 1
      ) return

      event.preventDefault()
      setStateCollection(item.parent)
      await router.push(buildDocumentRoute(item))
    }

    return {
      pageNumber,
      bucketsCount,
      showNotIndexed,
      showNoResults,
      isHighlights,
      toggle,
      isOpen,
      columns,
      table,
      filters,
      sort,
      totalPages,
      getRowValue,
      paginated,
      resultsSummaryText,
      toggleSort,
      buildBreadcrumbParts,
      getTableHref,
      goToPageTable,
      groupHeadersAt,
      goToPassage,
      tableVariant,
      gridTemplateColumns
    }
  }
}
</script>
<style scoped>

.pagination {
  padding-bottom: 20px;
  margin-bottom: 0;
}

.pagination-bottom {
  padding-top: 20px;
}

.list-mode .pagination-bottom {
  border-bottom: none;
}

/* GLOBAL */
.list-mode {
  width: 100%;
  display: block;
  --row-gap: 0px;
  --column-gap: 60px;
}
.list-mode-wrapper {
  width: 100%;
  border-bottom: 4px solid var(--fill-color);
}

.list-mode-wrapper.without-bottom-pagination {
  margin-bottom: 98px;
}

.list-mode .tree {
  padding-bottom: 36px;
}

.list-mode li::before {
  display: none !important;
}

/* HEADER + ROWS */
.list-mode .container {
  max-width: none !important;
}

/* Grid is calculated from number of columns, however a state display (no results, error) has a full-width unique cell */
.empty-row .li.container {
  grid-template-columns: 1fr !important;
  cursor: default;
}

.empty-row .cell {
  padding: 1.5rem 0;
  font-style: italic;
  color: #555;
}

.empty-row--not-indexed .cell {
  font-style: normal;
  color: #8a5a00;
}

.list-mode .li.container {
  display: grid;
  grid-template-columns: var(--grid-template-columns);
  align-items: center;
  width: 100%;
  gap: var(--row-gap) var(--column-gap);

  font-family: var(--font-primary), sans-serif;
  font-size: var(--font-default-size);
  font-weight: 500;
  line-height: 1.5;
  color: #000000;
}

/* HEADER */
.list-mode .header {
  font-weight: 500;
  padding: 20px 0;
}

/* HEADER CELL */
.list-mode .header-cell {
  display: flex;
  flex-direction: column;
  font-weight: 500 !important;
}
.list-mode .header-cell > span {
  display: block;
  border-bottom: 3px solid #DCDCDC;
  margin-bottom: 15px;
}

.list-mode .header-cell-fields {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;

  cursor: pointer;

  font-weight: 500 !important;
}

.list-mode .header-cell.search {
  border-bottom: 3px solid #DCDCDC;
  padding-bottom: 3px;
  margin-bottom: 15px;
}

/* ROW */
.list-mode .row {
  width: 100%;
  padding: 15px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
}

/* HOVER */
.list-mode .row:hover {
  background: #fafafa;
}

/* HIGHLIGHTS OPENED */
.list-mode .row.is-selected {
  background-color: #e3e3e3;
}

/* CELLS */
.list-mode .cell {
  /*
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0; /* important for ellipsis */
}

.list-mode .cell a {
  font-size: var(--font-default-size);
  font-weight: 400;
  color: #000000;

  &:hover {
    text-decoration: var(--text-decoration-hover);
  }
}

.list-mode .cell a:empty {
  display: none;
}

.list-mode .cell:nth-child(2n) a {
  color: #5a5a5a;
}

.list-mode .cell:nth-child(2n + 1) a {
  color: #000000;
}

.list-mode .cell .hits-list {
  padding: 1rem;
  list-style-type: none;
  margin: 0;
  background-color: #f1f1f1;
}

.list-mode .cell .hits-list > li {
  margin-bottom: 1rem;
}
.list-mode .cell .hits-list > li:last-child {
  margin-bottom: 0; /* no margin on last child */
}

.list-mode .cell .hits-list > li > a.hit-breadcrumb {
  /* a single tag for the entire breadcrumb: the segments are text
   inside it, they wrap and can break across lines */
  display: inline-block;
  padding: .2rem .5rem;
  border: 1px solid #4a4a4a;
  border-radius: 12px;
  background: #ffffff;
  text-decoration: none;
  cursor: pointer;
}

/* segments: plain text inside the wrapper tag */
.list-mode .cell .hits-list .hit-breadcrumb-tag {
  color: #4a4a4a;
  font-family: var(--font-primary), sans-serif;
  /* hierarchy: document line (16px) > passage breadcrumb (15px) */
  font-size: 15px;
  font-weight: 500;
  line-height: 1.4;
  word-break: break-word;
}

.list-mode .cell .hits-list .hit-breadcrumb-sep {
  margin: 0 .3rem;
  color: var(--fill-color);
  font-size: 15px;
}

.list-mode .cell .hits-list > li > a.hit-breadcrumb:hover {
  background: var(--fill-color);
  border-color: var(--fill-color);
}

.list-mode .cell .hits-list > li > a.hit-breadcrumb:hover .hit-breadcrumb-tag,
.list-mode .cell .hits-list > li > a.hit-breadcrumb:hover .hit-breadcrumb-sep {
  color: #ffffff;
}

.list-mode .cell .hits-list > li > ul {
  margin-top: 1rem;
  padding-left: 1rem;
  list-style-type: none;
}

.list-mode .cell .hits-list > li > ul > li {
  /* inline: the fragments follow each other in the flow, separated by ●●● */
  display: inline;
  color: #5a5a5a;
  font-size: 15px;
  line-height: 1.4;
}

/* Separator between fragments (the API no longer returns "...": see
   commented-out add_ellipsis in dots_es/api/search.py) */
.list-mode .cell .hits-list > li > ul > li:not(:last-child)::after {
  content: " ●●● ";
  white-space: pre-wrap;
  padding-left: 5px;
  padding-right: 5px;
  color: var(--fill-color);
}

.list-mode .cell .hits-list > li > ul > li > span {
  display: inline;
  word-break: break-word;
  &:deep(mark) {
    border-left: none;
    background-color: #ffe066;
  }
}

.list-mode .cell .hits-list > li > ul > li:last-child {
  margin-bottom: 0; /* pas de margin sur le dernier */
}

.list-mode .cell .hits-list em {
  background-color: #ffe066 !important;
  font-weight: bold;
}

.list-mode .cell.chevron-down a,
.list-mode .cell.chevron-up a {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 35px;
  text-decoration: none !important;
  border-bottom: none !important;
}

.list-mode .cell.chevron-down a:hover,
.list-mode .cell.chevron-up a:hover {
  background-color: transparent !important;
  text-decoration: none !important;
}

.list-mode .cell.chevron-up a::before,
.list-mode .cell.chevron-down a::before {
  content: "";
  display: inline-block;
  width: 27px;
  height: 20px;
  transform-origin: 50%;
}

.list-mode .cell.chevron-up a::before {
  background: url(../assets/images/chevron_rouge.svg) center / contain no-repeat;
}

.list-mode .row.is-selected .cell.chevron-down a::before {
  background: #5a5a5a;
  -webkit-mask: url(../assets/images/croix.svg) center / contain no-repeat;
  mask: url(../assets/images/croix.svg) center / contain no-repeat;
}

/* FRAGMENTS */
.list-mode .group-header-row {
  display: block !important;
  padding: 18px 15px 8px;
  cursor: default;
}

.list-mode .group-header--subCollection .group-header-row {
  font-size: 18px;
  font-weight: 700;
  color: var(--fill-color);
  border-bottom: 2px solid var(--fill-color);
}

.list-mode .group-header--resource .group-header-row {
  font-size: 16px;
  font-weight: 600;
  color: #4a4a4a;
  border-bottom: 1px solid #dcdcdc;
}

.list-mode .group-header--subCollection + .group-header--resource .group-header-row {
  padding-top: 10px;
}

.list-mode .li.container.row-snippets {
  display: block !important;
  padding: 0 15px 15px;
  font-size: 15px;
  font-weight: 400;
  line-height: 1.5;
  color: #5a5a5a;
}

.list-mode .row-snippets .snippet:not(:last-child)::after {
  content: " ●●● ";
  padding: 0 5px;
  color: var(--fill-color);
}

.list-mode .row-snippets .snippet :deep(mark) {
  background-color: #ffe066;
}

/* FILTER */
.list-mode .filter {
  width: 100%;
}

.list-mode .input-wrapper {
  position: relative;
  display: block;
  width: 100%;
}

.list-mode .filter,
.list-mode .range-filter input {
  height: auto;
  padding: 7px 28px 7px 6px; /* space for icon */
  font-family: var(--font-primary), sans-serif;
  font-weight: 400;
  font-size: 18px;
  line-height: 1;
  border: 1px solid #cecece;
  border-radius: 4px;
  outline: none;
  width: 100%;

  &:focus {
    border-color: var(--fill-color);
  }
}

.list-mode .clear-icon {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  cursor: pointer;
  stroke: white;
  stroke-width: 2;
  fill: var(--fill-color);
}

/* RANGE */
.list-mode .range-filter {
  display: flex;
  gap: 10px;
}

.list-mode .range-filter .input-wrapper {
  width: 50%;
}

/* ICON */
.list-mode .icons {
  display: flex;
  flex-direction: column;
  width: 38px;
  height: 38px;
  min-width: 38px;
  min-height: 38px;
  font-size: 10px;
  color: white;
}

/* CLEAN TREE STUFF */
.list-mode .toc-toggle {
  display: none;
}

.list-mode .is-tree-opened {
  display: none;
}

.list-mode li {
  margin-left: 0 !important;
  list-style: none;
  padding: 1px 0 !important;
}

.list-mode li .container .cell:first-child {
  /* padding-left: 5px; */
}

.list-mode .menu {
  padding: 0 !important;
  background-color: transparent;
}

.list-mode .collection-toc-area,
.list-mode .collection-toc-area-header {
  display: none;
}

.skeleton {
  height: 14px;
  width: 100%;
  border-radius: 4px;
  background: linear-gradient(
    90deg,
    #eee 25%,
    #ddd 37%,
    #eee 63%
  );
  background-size: 400% 100%;
  animation: shimmer 1.4s ease infinite;
}

@keyframes shimmer {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: -100% 0;
  }
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


@media screen and (max-width: 1320px) {
  .list-mode {
    --column-gap : 20px;
  }
}

@media screen and (max-width: 1024px) {

  .list-mode.tree,
  .list-mode .pagination {
    width: auto;
    margin-left: -10px;
    margin-right: -10px;
  }

  .list-mode.tree > .list-header,
  .list-mode.tree > li > .li.container.row,
  .list-mode .pagination {
    padding-left: 20px;
    padding-right: 20px;
  }

  /* Pagination bottom margin: collection pages only; on search results it
     added 20px above the header */
  .pagination.collection-results {
    margin-bottom: 20px;
  }

  /* Border under the header: from 1024px on collection pages; for
     search results, at 768px (see below) */
  .collection-results .list-header {
    border-bottom: 2px solid var(--fill-color);
  }

  /* Table header */

  .list-header {
    margin-bottom: 0;

    & > .header {
      border-bottom: none;

      /* If on search field in header */
      & > .header-cell:only-child {
        & > span {
          flex: auto 0 0;
          max-width: unset;
        }
        & > .header-cell-fields {
          flex: 1;
        }
      }
    }
  }

  /* Table header: no bottom padding below 1024px; left/right padding matches
     the pagination and rows, to align the first th with the result count.
     NB: .list-header padding (li, above) does not apply, overridden by
     .list-mode li { padding: 1px 0 !important }. */
  .list-mode .header {
    padding-bottom: 0;
    padding-left: 20px;
    padding-right: 20px;
  }

  /* Label truncated to 60px next to the fields: not for the search results
  header (.search-header), which remains in columns (see 768px) */
  .list-mode .li.container:not(.search-header) > .header-cell {
    flex-direction: row;
    align-items: center;
    gap: 10px;
    margin-bottom: 15px;

    & > span {
      flex: 60px 0 0;
      border-bottom: none;
      margin-bottom: 0;

      max-width: 60px;
      text-overflow: ellipsis;
      overflow: hidden;
    }

    & > .header-cell-fields {
      flex: calc(100% - 70px) 0 0;
    }
  }

  .list-mode .range-filter {
    width: 100%;
  }

  /* Stacked rows (cards); the search results header keeps its grid */
  .list-mode .li.container:not(.search-header) {
    display: block !important;

    &.header {
      padding: 5px 12px 10px;
    }
  }

/* Full-text results chevron: in card mode */
  .list-mode .li.container.row {
    position: relative;
  }

  .list-mode .cell.chevron-up,
  .list-mode .cell.chevron-down {
    position: absolute;
    top: 0;
    bottom: 0;
    right: 20px;
    width: auto;
    display: flex;
    align-items: center;
  }

  /* Prevent collision with chevron */
  .list-mode .li.container.row > .cell:not(.chevron-up):not(.chevron-down) {
    padding-right: 45px;
  }

  /* Table rows */

  .list-mode > li > .li.container > .cell:first-child a {
    color: #000000;
  }

  .list-mode .cell:not(:nth-child(1)) a,
  .list-mode .cell:nth-child(2n) a {
    font-size: 16px;
    color: #333333;
  }

  .list-mode > li:nth-child(2) .li.container {
    padding-top: 20px;
  }
}


@media screen and (max-width: 768px) {

  .search-results .list-header {
    border-bottom: 2px solid var(--fill-color);
  }

  .list-mode .li.container.search-header {
    grid-template-columns: none;
    grid-auto-flow: column;
    grid-auto-columns: minmax(0, 1fr);

    & > .chevron-header-cell {
      display: none;
    }
  }

  /* Sort icon above its label, left-aligned; no border or padding below the
     cell; sort icons sized like the pagination navigation buttons
     (--button-size, reduced at the same breakpoint) */
  .list-mode .header-cell.search {
    min-width: 0;
    border-bottom: none;
    padding-bottom: 0;

    & > .header-cell-fields {
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
    }

    & span {
      overflow-wrap: anywhere;
    }

    & .icons {
      width: var(--button-size);
      height: var(--button-size);
      min-width: var(--button-size);
      min-height: var(--button-size);
    }
  }
}

@media screen and (max-width: 640px) {

  .list-mode.tree,
  .list-mode .pagination {
    margin-left: calc(-1 * var(--mobile-margin));
    margin-right: calc(-1 * var(--mobile-margin));
  }

  .list-mode.tree > li {
    padding: 0;
  }

  .list-mode.tree > .list-header,
  .list-mode.tree > li > .li.container.row,
  .list-mode .pagination {
    padding-left: var(--mobile-margin);
    padding-right: var(--mobile-margin);
  }

  /* Same padding as rows at this screen size */
  .list-mode .cell.chevron-up,
  .list-mode .cell.chevron-down {
    right: var(--mobile-margin);
  }

  /* Table header: same left-right padding as pagination and text */
  .list-mode .header {
    padding-left: var(--mobile-margin);
    padding-right: var(--mobile-margin);
  }

  /* Search results table header: centered columns (as number of results) */
  .list-mode .li.container.search-header {
    column-gap: var(--mobile-margin);
  }

  .list-mode .header-cell.search {
    & > .header-cell-fields {
      align-items: center;
      text-align: center;
    }
  }
}


</style>