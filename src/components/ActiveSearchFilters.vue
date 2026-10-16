<template>
  <!-- Under the search bar: the button of the facets panel, the number of
       active filters with a caret that shows or hides their tags, the tags
       and "Tout effacer" -->
  <div
    class="active-filters"
    :class="{ 'has-filters': activeCount > 0, 'is-collapsed': collapsed }"
  >
    <div class="filters-controls">
      <button
        type="button"
        class="filters-panel-btn"
        :class="{ 'is-opened': sidebarOpen }"
        :aria-pressed="sidebarOpen"
        :title="sidebarOpen ? 'Fermer les filtres' : 'Ouvrir les filtres'"
        @click="toggleSidebar"
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M3 6 H21 M6 12 H18 M10 18 H14" />
        </svg>
        Filtres
      </button>

      <button
        v-if="activeCount > 0"
        type="button"
        class="tags-toggle"
        :aria-expanded="!collapsed"
        :aria-label="`${collapsed ? 'Afficher' : 'Masquer'} les ${activeCount} filtres actifs`"
        @click="toggleCollapsed"
      >
        <span class="count-badge">{{ activeCount }}</span>
        <i
          class="caret"
          :class="{ opened: !collapsed }"
        />
      </button>
      <!-- No filter: a pale 0, nothing to show or hide -->
      <span
        v-else
        class="count-badge is-empty"
        role="status"
        aria-label="Aucun filtre actif"
      >0</span>
    </div>

    <template v-if="activeCount > 0">
      <span
        v-if="!collapsed"
        class="separator"
        aria-hidden="true"
      />
      <div
        v-if="!collapsed"
        class="filter-tags"
        :class="{ 'with-clear-icon': clearAll === 'icon' }"
      >
        <!-- Clear all as a round icon, top right of the tags -->
        <button
          v-if="clearAll === 'icon'"
          type="button"
          class="clearall-icon-btn"
          title="Tout effacer"
          aria-label="Effacer tous les filtres"
          @click.stop="clearAllFilters"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M5.5 12 a6.5 6.5 0 1 0 2 -4.7 M5.5 4.5 V8.5 H9.5" />
          </svg>
        </button>
        <!-- Facettes -->
        <button
          v-for="facet in facets"
          :key="`${facet.facetType}-${facet.id}`"
          type="button"
          class="filter-tag"
          :aria-label="`Retirer le filtre ${facetTypeLabel(facet)} : ${facet.label}`"
          @click.stop="removeFacet(facet)"
        >
          <span class="filter-tag-label">{{ facetTypeLabel(facet) }} :</span>
          {{ facet.label }}
          <svg
            class="clear-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </button>

        <!-- Ranges -->
        <button
          v-for="(range, rangeKey) in ranges"
          :key="`range-${rangeKey}`"
          type="button"
          class="filter-tag"
          :aria-label="`Retirer le filtre ${getRangeLabel(rangeKey)} : ${range ? formatRange(range) : ''}`"
          @click.stop="removeRange(rangeKey)"
        >
          <span class="filter-tag-label">{{ getRangeLabel(rangeKey) }} :</span>
          {{ range ? formatRange(range) : '' }}
          <svg
            class="clear-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </button>
      </div>
      <div
        v-else
        class="spacer"
      />

      <button
        v-if="clearAll === 'link'"
        type="button"
        class="clearall-btn"
        @click.stop="clearAllFilters"
      >
        Tout effacer
      </button>
    </template>
  </div>
</template>
<script setup>
import { computed, ref } from 'vue'

const props = defineProps({

  facets:{
    type:Array,
    default:()=>[]
  },
  ranges:{
    type:Object,
    default:()=>({})
  },
  temporalFacets:{
    type:Array,
    default:()=>[]
  },
  // Config des facettes "terms" (mêmes objets que ceux passés à
  // SearchFacets en :facets) : sert uniquement à retrouver le label
  // "maison" défini en config (ex. "Auteur") à partir de la clé canonique
  // (facet.facetType, ex. "dublinCore.contributor").
  facetsConfig:{
    type:Array,
    default:()=>[]
  },
  // Facets sidebar state, owned by SearchPage: the button that opens and
  // closes it replaced the burger of the search bar.
  sidebarOpen:{
    type:Boolean,
    default:false
  },
  // "Tout effacer": a link at the end of the row, or a round icon at the
  // top right of the tags (mobile facets panel)
  clearAll:{
    type:String,
    default:'link'
  }
})

const emit = defineEmits([
  'remove-facet',
  'remove-range',
  'clear-all',
  'toggle-sidebar'
])

// Tags shown or hidden by the caret next to their number
const collapsed = ref(false)

function toggleCollapsed(){
  collapsed.value = !collapsed.value
}

function toggleSidebar(){
  emit('toggle-sidebar')
}

const activeCount = computed(() =>
  props.facets.length + Object.keys(props.ranges).length
)

// labels issus de la config
// NB : les facettes temporelles sont indexées par leur "key" canonique
// (ex. "dublinCore.created", voir le commentaire dans SearchPage.vue sur
// disabledTemporalFacetIds) - c'est aussi cette clé que setRange()/ranges
// utilisent. f.field est le chemin ES ("temporal.dublincore.created") et
// n'identifie pas la facette.
const temporalLabels = computed(() => {

  return Object.fromEntries(
    props.temporalFacets.map(f => [
      f.key,
      f.label
    ])
  )

})

function getRangeLabel(rangeKey){
  return temporalLabels.value[rangeKey] || rangeKey
}

// Labels "maison" des facettes terms, définis en config (ex. "Auteur")
// plutôt que la clé canonique brute (ex. "dublinCore.contributor").
// Indexés par f.key, comme pour temporalLabels ci-dessus.
const facetConfigLabels = computed(() => {

  return Object.fromEntries(
    props.facetsConfig.map(f => [f.key, f.label])
  )

})

// Label affiché devant la valeur sélectionnée, pour toutes les facettes
// (Auteurs, Sujets, etc.), pas seulement pour les plages temporelles.
// On retombe sur la clé technique uniquement si aucun label de config
// n'a été trouvé (facette non déclarée dans facetsConfig).
function facetTypeLabel(facet){
  return facetConfigLabels.value[facet.facetType] || facet.facetType
}

function formatRange(range){
  if (!range) return ''

  return `${range.gte ?? '∞'} - ${range.lte ?? '∞'}`
}

function removeFacet(facet){
  emit(
    'remove-facet',
    facet
  )
}

function removeRange(rangeKey){
  emit(
    'remove-range',
    rangeKey
  )
}

function clearAllFilters(){
  emit('clear-all')
}

</script>
<style scoped>

/* One row under the search bar, aligned on its left edge (12px in the
   search form); the tags wrap, all visible */
.active-filters {
  display: flex;
  flex: 1;
  width: 100%;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 12px 14px;
  font-family: var(--font-primary), sans-serif;
}

.filters-controls {
  display: flex;
  flex: none;
  align-items: center;
  gap: 4px;
}

/* Opens and closes the facets panel: filled while it is open */
.filters-panel-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  height: var(--button-size);
  padding: 0 12px;
  border: 1px solid var(--fill-color);
  border-radius: 6px;
  background-color: #ffffff;
  color: var(--fill-color);
  font: 500 14px var(--font-primary), sans-serif;
  cursor: pointer;

  & svg {
    width: 16px;
    height: 16px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2.2;
    stroke-linecap: round;
  }

  &.is-opened {
    background-color: var(--fill-color);
    color: #ffffff;
  }
}

/* Number of active filters + caret: shows or hides their tags */
.tags-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  height: var(--button-size);
  padding: 0 6px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #1a1a1a;
  cursor: pointer;
}

.count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  box-sizing: border-box;
  padding: 0 6px;
  border-radius: 11px;
  background-color: var(--fill-color);
  color: #ffffff;
  font: 500 12px var(--font-primary), sans-serif;
}

.caret {
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 6px solid #1a1a1a;
  transition: transform .15s ease;

  &.opened {
    transform: rotate(180deg);
  }
}

.count-badge.is-empty {
  margin: 0 6px;
  background-color: color-mix(in srgb, var(--fill-color) 12%, #ffffff);
  color: var(--fill-color);
}

.separator {
  flex: none;
  width: 1px;
  height: 22px;
  /* centred on the 40px buttons */
  margin-top: calc((var(--button-size) - 22px) / 2);
  background-color: #cfcfcf;
}

.filter-tags {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
  /* 30px tags centred on the buttons' line */
  padding-top: calc((var(--button-size) - 30px) / 2);
}

.spacer {
  flex: 1;
}

/* The tag removes its filter: border tinted with the collection colour */
.filter-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 6px 0 12px;
  border: 1px solid color-mix(in srgb, var(--fill-color) 22%, #ffffff);
  border-radius: 15px;
  background-color: #ffffff;
  font: 13px var(--font-primary), sans-serif;
  color: #1a1a1a;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    border-color: var(--fill-color);
  }
}

.filter-tag-label {
  color: #5c5c5c;
}

.clear-icon {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: var(--fill-color);
  stroke-width: 2.2;
  stroke-linecap: round;
}

/* Round icon: the collection colour, a white "reset" arrow */
.filter-tags.with-clear-icon {
  position: relative;
  padding-right: 40px;
}
.clearall-icon-btn {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background-color: var(--fill-color);
  cursor: pointer;

  & svg {
    width: 18px;
    height: 18px;
    fill: none;
    stroke: #ffffff;
    stroke-width: 2.4;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  &:hover {
    background-color: color-mix(in srgb, var(--fill-color) 80%, #000000);
  }
}

.clearall-btn {
  flex: none;
  height: var(--button-size);
  padding: 0 4px;
  border: none;
  background: transparent;
  font: 500 13px var(--font-primary), sans-serif;
  color: var(--fill-color);
  text-decoration: underline;
  cursor: pointer;
}

/* Narrow: the tags go to their own line under the controls */
@media screen and (max-width: 768px) {
  .active-filters {
    flex-wrap: wrap;
    gap: 8px;
  }

  .separator {
    display: none;
  }

  .filter-tags {
    order: 3;
    flex: 1 1 100%;
    gap: 6px;
    padding-top: 0;
  }

  .spacer {
    display: none;
  }

  .clearall-btn {
    margin-left: auto;
  }

  .filter-tag-label {
    display: none;
  }
}

</style>
