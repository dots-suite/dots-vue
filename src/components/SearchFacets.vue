<template>
  <div
    ref="rootEl"
    class="search-facets"
  >
    <div class="filters-header">
      <div
        class="filters-header-title"
        @click="toggleAllFacets"
      >
        <span>Filtres</span>
      </div>

      <!-- Narrow screens, where the panel covers the search bar: the same
           controls as under it (Filtres button, which closes the panel,
           counter and caret, tags), "Tout effacer" as an icon by the tags -->
      <ActiveSearchFilters
        class="filters-header-mobile"
        :facets="activeFacets"
        :facets-config="facets"
        :ranges="ranges"
        :temporal-facets="temporalFacets"
        :sidebar-open="true"
        clear-all="icon"
        @toggle-sidebar="$emit('toggle-sidebar')"
        @clear-all="$emit('clear-all')"
        @remove-facet="$emit('remove-facet-value', $event)"
        @remove-range="$emit('reset-range', $event)"
      />

      <button
        type="button"
        class="filters-toggle-all"
        :aria-expanded="allOpened"
        :aria-label="allOpened ? 'Replier tous les filtres' : 'Déplier tous les filtres'"
        @click="toggleAllFacets"
      >
        <i
          class="arrow"
          :class="{ opened: allOpened }"
        />
      </button>
    </div>

    <div
      v-for="facet in orderedFacets"
      :key="facet.id"
      :data-facet-id="facet.id"
      class="facet-box"
    >
      <div
        class="facet-header"
        @click="toggleOpen(facet.id)"
      >
        <span class="facet-header-label">
          {{ facet.label }}
          <!-- Number of values to choose from, was "(n)" -->
          <span
            v-if="availableFacetCount(facet)"
            class="facet-count"
          >{{ availableFacetCount(facet) }}</span>
        </span>
        <i
          class="arrow"
          :class="{ opened: isOpen(facet.id) }"
        />
      </div>

      <!-- Valeurs actuellement sélectionnées pour CETTE facette, affichées
           sous son header - visible même repliée, en plus de la barre
           sticky du haut qui liste tout confondu.
           Deux cas : facette à valeurs (Auteur, Langage...) -> un tag par
           valeur sélectionnée ; facette temporelle (Date du colloque...)
           -> un seul tag pour la plage en cours, s'il y en a une. -->
      <div
        v-if="facet.type !== 'temporal' && tagsForFacet(facet.id).length"
        class="facet-active-tags"
      >
        <span
          v-for="tag in tagsForFacet(facet.id)"
          :key="tag.raw"
          class="facet-tag"
        >
          {{ tag.label }}
          <button
            type="button"
            class="facet-tag-remove"
            aria-label="Retirer ce filtre"
            @click="$emit('remove-facet-value', tag)"
          >×</button>
        </span>
      </div>
      <div
        v-else-if="facet.type === 'temporal' && temporalRangeFor(facet)"
        class="facet-active-tags"
      >
        <span class="facet-tag">
          {{ formatRange(temporalRangeFor(facet)) }}
          <button
            type="button"
            class="facet-tag-remove"
            aria-label="Retirer ce filtre"
            @click="resetFacet(facet)"
          >×</button>
        </span>
      </div>

      <div
        v-show="isOpen(facet.id) && (facet.type === 'temporal' || hasFacetCandidates(facet))"
        class="facet-body"
      >
        <!-- ===================== -->
        <!-- Facette temporelle -->
        <!-- ===================== -->
        <template v-if="facet.type === 'temporal'">
          <TemporalFacetSlider
            :temporal-facet="facet.temporal"
            :ranges="ranges"
            @change="$emit('change-range',$event)"
          />
        </template>

        <!-- ===================== -->
        <!-- Facette terms -->
        <!-- ===================== -->

        <!-- Autocomplétion : les valeurs n'apparaissent que dans le menu
             déroulant, ouvert quand le champ a le focus -->
        <template v-else>
          <div
            :ref="el => setFacetSearchRef(facet.id, el)"
            class="facet-search"
          >
            <input
              class="facet-input"
              type="text"
              :value="facetFilters[facet.id] || ''"
              :placeholder="`Filtrer ${facet.label}`"
              @input="setFacetFilter(
                facet.id,
                $event.target.value
              ); openFacetDropdown(facet.id)"
              @focus="openFacetDropdown(facet.id)"
              @mousedown="noteFacetDropdownState(facet.id)"
              @click="toggleFacetDropdownOnClick(facet.id)"
              @keydown.escape="closeFacetDropdown(facet.id)"
            >

            <div
              v-if="isFacetDropdownOpen(facet.id) && filteredFacetValues(facet.id, facet.values).length"
              class="facet-dropdown"
            >
              <div
                v-for="item in filteredFacetValues(facet.id, facet.values)"
                :key="item.facet_key || item.value"
                class="facet-item facet-candidate"
                role="option"
                @mousedown.prevent
                @click="selectFacetCandidate(facet.id, item)"
              >
                {{ item.label || item.value }}
                ({{ item.count }})
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
    <!-- Space added below the content while a suggestion menu is open:
     the overlay (.facet-dropdown) is absolutely positioned, so it does not
     push anything down and would otherwise remain flush with the bottom edge
     of the mobile sidebar. Height calculated in updateDropdownSpacer(), 0
     otherwise: no permanent blank space. -->

    <div
      v-if="dropdownSpacer !== null"
      class="facets-bottom-spacer"
      :style="{ height: dropdownSpacer + 'px' }"
      aria-hidden="true"
    />

    <!-- Narrow screens: actions kept at the bottom of the panel, after the
         spacer, so an open value menu ends above them -->
    <div class="filters-footer">
      <button
        type="button"
        class="filters-footer-show"
        @click="$emit('toggle-sidebar')"
      >
        Voir {{ resultsLabel }}
      </button>
    </div>
  </div>
</template>

<script setup>

import { computed, nextTick, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import TemporalFacetSlider from './TemporalFacetSlider.vue'
import ActiveSearchFilters from './ActiveSearchFilters.vue'

const props = defineProps({

  openedFacets:{
      type: Array,
      default: () => []
  },
  facets:{
        type: Array,
        default: () => []
    },

    temporalFacets:{
        type: Array,
        default: () => []
    },

    activeFacets:{
        type: Array,
        default: () => []
    },

    ranges:{
        type: Object,
        default: () => ( {} )
    },

    config:{
        type: Object,
        default: () => ( {} )
    },

    // Number of results, for "Voir les n documents" (mobile footer)
    resultsCount:{
        type: Number,
        default: null
    }

})

const emit = defineEmits([
    'toggle-facet',
    'facet-open',
    'facet-close',
    'change-range',
    'reset-range',
    'reset-facet',
    'remove-facet-value',
    'toggle-sidebar',
    'clear-all'
])//'apply-collections'

// Same condition as the active filters banner, which hides its reset
// control when there is nothing to reset.
const hasActiveFilters = computed(() =>
  props.activeFacets.length > 0 ||
  Object.keys(props.ranges).length > 0
)

const resultsLabel = computed(() => {
  const n = props.resultsCount
  if (n == null) return 'les résultats'
  if (n === 1) return 'le document'
  return `les ${n} documents`
})

watch(
  () => props.ranges,
  ranges => {

    Object.keys(ranges).forEach(key => {

      if (!props.openedFacets.includes(key)) {

        emit(
          'facet-open',
          key
        )

      }

    })

  },
  {
    immediate:true,
    deep:true
  }
)



const facetFilters = ref({})
const facetDropdownOpen = ref({})

function isFacetDropdownOpen(facetId) {
    return !!facetDropdownOpen.value[facetId]
}

function openFacetDropdown(facetId) {
    facetDropdownOpen.value[facetId] = true
}

function closeFacetDropdown(facetId) {
    facetDropdownOpen.value[facetId] = false
}

// A click in the field opens the list, a new click closes it. The state
// is read on press: the first click focuses the field, which opens the
// list before the click event, so reading it on click would close it again.
const facetDropdownOpenOnPress = {}

function noteFacetDropdownState(facetId) {
    facetDropdownOpenOnPress[facetId] = isFacetDropdownOpen(facetId)
}

function toggleFacetDropdownOnClick(facetId) {
    if (facetDropdownOpenOnPress[facetId]) {
        closeFacetDropdown(facetId)
    } else {
        openFacetDropdown(facetId)
    }
}

// Fermeture du dropdown de suggestions : on ne se base plus sur @blur du
// champ. Sur mobile, scroller la sidebar pour atteindre le dropdown fait
// perdre le focus au champ (le navigateur masque le clavier virtuel dès
// que la page défile), ce qui déclenchait un blur -> fermeture immédiate
// du dropdown avant même d'avoir pu le voir en scrollant.
// On détecte donc la fermeture "clic/tap en dehors" nous-mêmes, ce qui ne
// se déclenche pas pendant un simple scroll tactile.
const facetSearchRefs = {}

function setFacetSearchRef(facetId, el) {
    if (el) {
        facetSearchRefs[facetId] = el
    } else {
        delete facetSearchRefs[facetId]
    }
}

function handleClickOutsideFacetDropdowns(event) {
    // composedPath() is frozen at dispatch time: a clicked candidate is
    // removed from the list (re-render) before this listener runs, so
    // container.contains(event.target) would wrongly report an outside click.
    const path = event.composedPath()

    Object.keys(facetDropdownOpen.value).forEach(facetId => {
        if (!facetDropdownOpen.value[facetId]) return
        const container = facetSearchRefs[facetId]
        if (container && !path.includes(container)) {
            closeFacetDropdown(facetId)
        }
    })
}

onMounted(() => {
    document.addEventListener('click', handleClickOutsideFacetDropdowns)
})

onBeforeUnmount(() => {
    document.removeEventListener('click', handleClickOutsideFacetDropdowns)
})

const rootEl = ref(null)
const dropdownSpacer = ref(null)
const DROPDOWN_BOTTOM_MARGIN = 24
let dropdownResizeObserver = null

function updateDropdownSpacer() {
    const root = rootEl.value
    const dropdown = root?.querySelector('.facet-dropdown')
    const boxes = root ? root.querySelectorAll('.facet-box') : []
    const lastBox = boxes[boxes.length - 1]

    if (!root || !dropdown || !lastBox) {
        dropdownSpacer.value = null
        return
    }

    const rootStyle = getComputedStyle(root)

    // What follows the last facet: the footer's top margin where it shows
    // (narrow screens, it then covers the panel's bottom padding), else
    // that padding
    const footer = root.querySelector('.filters-footer')
    const below = footer && footer.offsetParent !== null
        ? parseFloat(getComputedStyle(footer).marginTop || 0)
        : parseFloat(rootStyle.paddingBottom || 0)
    const contentBottom = lastBox.getBoundingClientRect().bottom + below
    const needed = dropdown.getBoundingClientRect().bottom +
        DROPDOWN_BOTTOM_MARGIN - contentBottom

    if (needed <= 0) {
        dropdownSpacer.value = null
        return
    }

    const rowGap = parseFloat(rootStyle.rowGap) || 0

    dropdownSpacer.value = Math.max(0, Math.round(needed - rowGap))
}

// The value menu is absolutely positioned and pushes nothing: the spacer
// above makes the room to reach it. When it is active, scrolling to the
// very bottom frames the whole menu; otherwise scroll the minimum. Does
// nothing on desktop, where the sidebar has no scroll of its own.
function scrollDropdownIntoView() {
    const dropdown = rootEl.value?.querySelector('.facet-dropdown')
    if (!dropdown) return

    const scroller = facetScroller(dropdown)
    if (!scroller) return

    if (dropdownSpacer.value) {
        scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' })
        return
    }

    const overflow = dropdown.getBoundingClientRect().bottom +
        DROPDOWN_BOTTOM_MARGIN - scroller.getBoundingClientRect().bottom

    if (overflow > 0) scroller.scrollBy({ top: overflow, behavior: 'smooth' })
}

function observeDropdown() {
    if (!dropdownResizeObserver) return
    dropdownResizeObserver.disconnect()
    const dropdown = rootEl.value?.querySelector('.facet-dropdown')
    if (dropdown) dropdownResizeObserver.observe(dropdown)
}

watch(
  [facetDropdownOpen, facetFilters],
  async () => {
      await nextTick()
      observeDropdown()
      updateDropdownSpacer()

      // the spacer just changed: wait for it to render so scrollHeight
      // accounts for its new height
      await nextTick()
      scrollDropdownIntoView()
  },
  { deep: true }
)

onMounted(() => {
    if (typeof ResizeObserver !== 'undefined') {
        dropdownResizeObserver = new ResizeObserver(updateDropdownSpacer)
    }
    window.addEventListener('resize', updateDropdownSpacer)
})

onBeforeUnmount(() => {
    dropdownResizeObserver?.disconnect()
    dropdownResizeObserver = null
    window.removeEventListener('resize', updateDropdownSpacer)
})

// Sélection d'un candidat depuis le menu déroulant : on l'ajoute aux
// filtres actifs, on vide le champ, on referme le menu et on retire le focus
// du champ. Pour une sélection complémentaire, l'utilisateur revient dans le
// champ (clic ou clavier), ce qui rouvre le menu (@focus / @click).
function selectFacetCandidate(facetId, item) {
    toggleFacet(facetId, item)
    setFacetFilter(facetId, '')
    closeFacetDropdown(facetId)
    facetSearchRefs[facetId]?.querySelector('.facet-input')?.blur()
}

function isOpen(facetId){
    return props.openedFacets.includes(facetId)
}

const allOpened = computed(() => {
  const ids = orderedFacets.value.map(f => f.id)
  return ids.length > 0 &&
    ids.every(id => props.openedFacets.includes(id))
})

function toggleAllFacets() {

  const ids = orderedFacets.value.map(f => f.id)

  if (allOpened.value) {
    ids.forEach(id => emit('facet-close', id))
  } else {
    ids.forEach(id => emit('facet-open', id))
  }
}


// The last facet's expanded panel falls outside the frame: bring the whole
// box back into the sidebar, and only when it actually scrolls, which is
// the mobile case.
function facetScroller(el){
    for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
        const { overflowY } = getComputedStyle(node)
        if (
            (overflowY === 'auto' || overflowY === 'scroll') &&
            node.scrollHeight > node.clientHeight
        ) return node
    }
    return null
}

function scrollFacetIntoView(facetId){
    const box = rootEl.value?.querySelector(`[data-facet-id="${facetId}"]`)
    if (!box) return

    const scroller = facetScroller(box)
    if (!scroller) return

    const boxRect = box.getBoundingClientRect()
    const viewRect = scroller.getBoundingClientRect()
    let delta = 0

    if (boxRect.top < viewRect.top) {
        delta = boxRect.top - viewRect.top
    } else if (boxRect.bottom > viewRect.bottom) {
        // never pushing the box's top out through the top of the frame
        delta = Math.min(boxRect.bottom - viewRect.bottom, boxRect.top - viewRect.top)
    }

    if (delta) scroller.scrollBy({ top: delta, behavior: 'smooth' })
}

function toggleOpen(facetId){
    if (isOpen(facetId)) {
        emit('facet-close', facetId)
    }
    else {
        emit('facet-open', facetId)
        nextTick(() => scrollFacetIntoView(facetId))
    }
}

function setFacetFilter(facetId, value) {
    facetFilters.value[facetId] = value
}

const orderedFacets = computed(()=>{

    const result = []

    // =====================
    // Facettes temporelles
    // =====================

    props.temporalFacets.forEach(f=>{

        result.push({
            id: f.key,
            label: f.label,
            type: 'temporal',
            temporal: f,
            order: f.order ?? 999
        })

    })

    // =====================
    // Facettes terms
    // =====================

    props.facets.forEach(f=>{

        result.push({
            id: f.key,
            label: f.label,
            values: f.values,
            type: 'terms',
            facet: f,
            order: f.order ?? 100
        })

    })
    return result.sort(
        (a,b)=>a.order-b.order
    )
})

function selectedFacetKeys(facetId) {
    return props.activeFacets
        .filter(f => f.facetType === facetId)
        .map(f => f.raw ?? f.facet_key ?? f.value ?? f.id)
}

// Tags (objets complets {facetType, id, label, raw}) à afficher sous le
// header d'une facette donnée. Même source que selectedFacetKeys, mais on
// garde l'objet entier : le raw est nécessaire pour retirer le bon filtre
// (cf. SearchPage.vue removeActiveFacet, qui utilise tag.raw).
function tagsForFacet(facetId){
    return props.activeFacets.filter(f => f.facetType === facetId)
}

// Plage actuellement active pour une facette temporelle donnée, si elle
// existe (props.ranges est keyed par la clé canonique facet.temporal.key,
// la même que celle utilisée par resetFacet() pour la réinitialiser).
function temporalRangeFor(facet){
    return props.ranges?.[facet.temporal.key] || null
}

// Formatage identique à ActiveSearchFilters.vue (formatRange), pour un
// rendu cohérent entre la barre sticky du haut et le tag sous la facette.
function formatRange(range){
    if (!range) return ''
    return `${range.gte ?? '∞'} - ${range.lte ?? '∞'}`
}

// A terms facet only offers its input while some value is left to select:
// not already selected, and with results in the current search. The typed
// term is ignored, so the input never vanishes while the user is typing.
function hasFacetCandidates(facet) {
    const selectedKeys = selectedFacetKeys(facet.id)

    return (facet.values ?? []).some(v =>
        (isCollectionsFacet(facet.id) || (v.count ?? 0) > 0) &&
        !selectedKeys.includes(v.facet_key ?? v.value ?? v.id)
    )
}

// The collections facet (e.g. annual volumes) keeps offering every other
// collection after a selection, whatever its current count, even 0.
function isCollectionsFacet(facetId) {
    return facetId === 'collections'
}

// A facet running out of candidates hides its input, which loses focus:
// close its dropdown so it does not pop up by itself when the input is back.
watch(
  () => orderedFacets.value
      .filter(f => f.type === 'terms' && !hasFacetCandidates(f))
      .map(f => f.id),
  ids => ids.forEach(closeFacetDropdown)
)

// Header count is exactly what the dropdown renders: same exclusions, same
// search term. Any other source would drift from it.
// Exception: once collections are selected, the collections header counts
// them, since its dropdown lists every other collection anyway.
function availableFacetCount(facet) {
    const selectedCount = selectedFacetKeys(facet.id).length

    if (isCollectionsFacet(facet.id) && selectedCount) {
        return selectedCount
    }

    return filteredFacetValues(facet.id, facet.values ?? []).length
}

function filteredFacetValues(facetId, values) {
    const term =
        (facetFilters.value[facetId] || '')
            .trim()
            .toLowerCase()

    const selectedKeys = selectedFacetKeys(facetId)

    let available = values.filter(v => {
      const key = v.facet_key ?? v.value ?? v.id
      const matchesTerm =
          !term ||
          (v.label || v.value || '').toLowerCase().includes(term)
      const hasCount = (v.count ?? 0) > 0
      return (
          !selectedKeys.includes(key) &&
          (
              hasCount ||
              isCollectionsFacet(facetId) ||
              (term && matchesTerm)
          )
      )
    })

    if (term) {
        available = available.filter(v =>
            (v.label || v.value || '').toLowerCase().includes(term)
        )
    }

    const sortAlpha = (a,b) =>
        (a.label || a.value || '')
            .localeCompare((b.label || b.value || ''), 'fr', { sensitivity:'base' })

    available.sort(sortAlpha)

    // Selected values are dropped, not listed first: they already appear in
    // ActiveSearchFilters (and as tags under the facet header), which is where
    // they are removed.
    return available
}

function toggleFacet(facetId, item) {

    emit('toggle-facet', {
        facetType: facetId,
        facetKey:
            item.facet_key ??
            item.value ??
            item.id,
        isCollection: facetId === 'collections'

    })

}

function resetFacet(facet) {

    if (facet.type === 'temporal') {
        emit('reset-range', facet.temporal.key)
        return
    }
    emit('reset-facet', facet.id)
}

watch(
  () => props.activeFacets,
  facets => {

    facets.forEach(f => {
      if (!props.openedFacets.includes(f.facetType)) {
        emit('facet-open', f.facetType)
      }
    })
  },
  {
    immediate:true,
    deep:true
  }
)

// Déplier toutes les facettes par défaut, une seule fois au premier
// chargement (dès que la liste n'est plus vide). On ne le refait pas
// ensuite, pour ne pas ré-ouvrir une facette que l'utilisateur a
// volontairement repliée après coup.
const facetsInitiallyOpened = ref(false)

watch(
  orderedFacets,
  facets => {

    if (facetsInitiallyOpened.value) return
    if (!facets.length) return

    facetsInitiallyOpened.value = true

    facets.forEach(f => {
      if (!props.openedFacets.includes(f.id)) {
        emit('facet-open', f.id)
      }
    })
  },
  {
    immediate:true
  }
)
</script>
<style scoped>
.search-facets {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0 1rem;
  font-family: "Barlow", sans-serif;
}


/* On mobile the sidebar is an overlay covering the active filters banner,
   so its two controls are repeated here. */
.filters-header {
  display: flex;
  align-items: center;
  gap: .5rem;
}

@media screen and (max-width: 768px) {
  /* The sidebar scrolls: the header stays reachable at the top. Negative
     margins cancel .search-facets' side padding, or content would show
     scrolling past in the gutters. */
  .filters-header {
    position: sticky;
    top: 0;

    /* above .facet-dropdown (z-index: 20), or the value menu scrolls over
       the header */
    z-index: 21;
    margin: 0 -1rem;
    padding: .75rem 1rem;
    background: #fff;
  }

  /* Tighter around the Filtres button; the open/close-all arrow on the
     button's line, at the right, so the tags' line spans the width */
  .filters-header {
    position: sticky;
    align-items: flex-start;
    /* the panel's top space, kept above the header once it sticks */
    padding-top: 10px;
    padding-bottom: 8px;
  }

  .filters-header-title {
    display: none !important;
  }

  .filters-header-mobile {
    display: flex !important;
    padding: 0;
  }

  /* A line between the controls and the current filters' tags */
  .filters-header-mobile :deep(.filter-tags) {
    padding-top: 8px;
    border-top: 1px solid #e6e6e6;
  }
  /* On the first row of tags, under the line */
  .filters-header-mobile :deep(.clearall-icon-btn) {
    top: 8px;
  }

  /* 32px, centred on the Filtres button, under the header's top padding */
  .filters-toggle-all {
    position: absolute;
    top: calc(10px + (var(--button-size) - 32px) / 2);
    right: 1rem;
    margin-right: 0;
  }

  /* Kept at the bottom of the scrolling panel, across its side padding */
  .filters-footer {
    position: sticky;
    bottom: 0;
    z-index: 21;
    display: flex !important;
    align-items: center;
    gap: 12px;
    margin: 16px -24px -24px;
    padding: 12px 24px 20px;
    border-top: 1px solid #e6e6e6;
    background: #fff;
  }

}

/* Wide screens: the panel sits beside the search bar and its controls */
.filters-header-mobile,
.filters-footer {
  display: none;
}

.filters-footer-show {
  flex: 1;
  height: 48px;
  border: none;
  border-radius: 6px;
  background: var(--fill-color);
  color: #fff;
  font: 600 16px var(--font-primary), sans-serif;
  cursor: pointer;
}

.filters-header-title{
  font-size : 24px;
  font-weight: 700;
  font-style: normal;
  color: #000000;
  font-family: "Barlow", sans-serif;
  display:flex;
  /* the total's figure on the title's text line */
  align-items:baseline;
  cursor:pointer;
  user-select:none;
  margin: 0;
  gap: .5rem;
  flex: 1;
  min-width: 0;
}

/* Open/close all, on the right in black, as each facet's arrow */
.filters-toggle-all{
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  /* its arrow lines up with the facets' (header padding + box border) */
  margin-right: 3px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
}
/* Unlike each facet's caret, a short line on the triangle's base side
   (open/close all): 2px, 2px off it. The flip turns about the whole mark's
   centre, kept centred in the button. */
.filters-toggle-all .arrow{
  position: relative;
  margin-top: 4px;
  border-top-color: #1a1a1a;
  transform-origin: 50% 1px;

  &::before {
    content: '';
    position: absolute;
    top: -10px;
    left: -5px;
    width: 10px;
    height: 2px;
    background-color: #1a1a1a;
  }
}

.facet-box {
  margin: 1px;
  border:1px solid #ddd;
}

.facet-header{
  background: #f0f0f0;
  padding:.75rem;
  display:flex;
  justify-content:space-between;
  align-items: center;
  cursor:pointer;
  font-weight:600;
}

/* Label on the left, the black open/close arrow on the right */
.facet-header{
  gap: .6rem;
}
/* Baseline: the count's figure sits on the label's text line */
.facet-header-label{
  display: flex;
  align-items: baseline;
  gap: .5rem;
  flex: 1;
  min-width: 0;
}
/* Pale: a count of values, not of active filters (filled badges) */
.facet-count{
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  box-sizing: border-box;
  padding: 0 6px;
  border-radius: 11px;
  background-color: color-mix(in srgb, var(--fill-color) 12%, #ffffff);
  color: var(--fill-color);
  font: 500 12px var(--font-primary), sans-serif;
}
.facet-header .arrow{
  flex: none;
  border-top-color: #1a1a1a;
}

/* Valeurs sélectionnées de cette facette, sous son header (visible même
   repliée). */
.facet-active-tags{
  display: flex;
  flex-wrap: wrap;
  gap: .4rem;
  padding: .6rem .75rem;
  background: #fff;
  border-bottom: 1px solid #ddd;
}

.facet-tag{
  display: inline-flex;
  align-items: center;
  gap: .3rem;
  padding: .2rem .5rem;
  font-size: .78rem;
  font-family: "Barlow", sans-serif;
  color: var(--fill-color);
  background: var(--meta-area-fill-color, #f0f0f0);
  border-radius: 12px;
}

.facet-tag-remove{
  border: none;
  background: none;
  padding: 0;
  margin: 0;
  line-height: 1;
  font-size: 1rem;
  color: inherit;
  cursor: pointer;
}

.facet-tag-remove:hover{
  color: #000;
}

.facet-body{
  position: relative;
  /* same padding as .facet-active-tags */
  padding: .6rem .75rem;
}

.facet-search{
  position: relative;
  display: flex;
  align-items: center;
  gap: .5rem;
  margin-bottom: .5rem;
}

/* Champ de filtre harmonisé avec .search-form .input (barre de recherche principale) */
.facet-input{
  flex: 1;
  min-width: 0;
  height: 36px;
  padding: 6px 10px;
  font-family: "Barlow", sans-serif;
  font-size: .85rem;
  color: inherit;
  background: none;
  border: 1px solid #979797;
  border-radius: 6px;
  box-shadow: none;
}

.facet-input:focus{
  outline: none !important;
  box-shadow: none !important;
  border-color: #979797;
}

.facet-dropdown{
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 20;
  margin-top: 2px;
  margin-bottom: 24px;
  background: #fff;
  border: 1px solid #979797;
  border-radius: 6px;
  box-shadow: 0 2px 6px rgba(0,0,0,.15);
  max-height: 240px;
  overflow-y: auto;
  font-family: "Barlow", sans-serif;
}

.facet-item{
  display:block;
  margin-bottom:.4rem;
  padding:.3rem .5rem;
  border-radius:6px;
  cursor:pointer;
  user-select:none;
}

.facet-dropdown .facet-item{
  margin-bottom: 0;
  border-radius: 0;
}

.facet-item:hover{
  background: var(--meta-area-fill-color, #f0f0f0);
}

.facet-item:focus-visible{
  outline: 2px solid var(--fill-color, #333);
  outline-offset: 1px;
}

.arrow {
  display: inline-block;
  width: 0;
  height: 0;

  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 6px solid var(--fill-color);

  transition: transform .15s ease;
}

.arrow.opened {
  transform: rotate(180deg);
}

.facets-bottom-spacer {
  flex: none;
}


/* Safari iOS zooms in when focusing a field whose font drops below 16px,
   and never zooms back out. Raise it, on iOS only. */
@supports (-webkit-text-size-adjust: none) and (font: -apple-system-body) and (-webkit-touch-callout: none) {
  .facet-input {
    font-size: 16px;
  }
}

</style>