<template>
  <div
    v-if="hasActiveFilters"
    class="active-filters"
  >

    <div class="active-filters-header">

      <button
        type="button"
        class="sidebar-toggle-btn"
        :class="{ 'is-opened': sidebarOpen }"
        :title="sidebarOpen ? 'Fermer les filtres' : 'Ouvrir les filtres'"
        :aria-label="sidebarOpen ? 'Fermer les filtres' : 'Ouvrir les filtres'"
        @click="toggleSidebar"
      >
        <SearchFilterIcon type="check" />
      </button>

      <button
        type="button"
        class="collapse-btn"
        @click="toggleCollapsed"
      >
        <span class="active-filters-title">Filtres<span class="label-extra"> actifs</span></span>
        <i class="collapse-arrow" :class="{ opened: !collapsed }" />
      </button>
<!-- supprimer tous les filtres version bouton -->
      <button
        v-show="!collapsed"
        type="button"
        class="clearall-btn"
        @click.stop="clearAll"
      >
        Réinitialiser<span class="label-extra"> les filtres</span>
      </button>

    </div>

     <div v-show="!collapsed" class="filter-tags">

      <!-- Facettes -->
      <span
        v-for="facet in facets"
        :key="`${facet.facetType}-${facet.id}`"
        class="filter-tag"
      >

        {{ facetTypeLabel(facet) }} : {{ facet.label }}

        <svg
          class="clear-icon"
          viewBox="0 0 24 24"
          @click.stop="removeFacet(facet)"
        >
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
      </span>

      <!-- Ranges -->
      <span
        v-for="(range, rangeKey) in ranges"
        :key="`range-${rangeKey}`"
        class="filter-tag"
      >
        {{ getRangeLabel(rangeKey) }} :
        {{ range ? formatRange(range) : '' }}

        <svg
          class="clear-icon"
          viewBox="0 0 24 24"
          @click.stop="removeRange(rangeKey)"
        >
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
      </span>
    </div>
  </div>
  <div v-else class="active-filters">
    <span class="active-filters-empty">
      <button
        type="button"
        class="sidebar-toggle-btn"
        :class="{ 'is-opened': sidebarOpen }"
        :title="sidebarOpen ? 'Fermer les filtres' : 'Ouvrir les filtres'"
        :aria-label="sidebarOpen ? 'Fermer les filtres' : 'Ouvrir les filtres'"
        @click="toggleSidebar"
      >
        <SearchFilterIcon type="check" />
      </button>
      <span class="active-filters-title">Aucun filtre actif</span>
    </span>
  </div>
</template>
<script setup>
import { computed, ref } from 'vue'
import SearchFilterIcon from '@/assets/images/SearchFilterIcon.vue'

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
  }
})

const emit = defineEmits([
  'remove-facet',
  'remove-range',
  'clear-all',
  'toggle-sidebar'
])

// ajouts Charlie
const collapsed = ref(false)

function toggleCollapsed(){
  collapsed.value = !collapsed.value
}

function toggleSidebar(){
  emit('toggle-sidebar')
}
//
const hasActiveFilters = computed(() => {

  return (
    props.facets.length > 0 ||
    Object.keys(props.ranges).length > 0
  )
})

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

function clearAll(){
  emit('clear-all')
}

</script>
<style scoped>


/*
  NOTE : cette page peut aussi afficher un document (Document.vue), qui
  importe des feuilles de styles globales et non scopées (tei.css,
  postprod.css). Ces styles restent injectés dans <head> pour le reste de la
  session même après être revenu sur la recherche (pas de rechargement en
  SPA), et peuvent contenir des règles génériques qui affectent la
  typographie ici. En attendant de corriger ces fichiers à la source, on fixe
  explicitement la police/taille/poids des libellés ci-dessous (avec
  !important) pour que ce composant reste correct quoi qu'il arrive.
*/
.active-filters {
  position: sticky;
  top: 0;
  z-index: 20;
  background: #ffffff00;
  padding: .75rem 1rem .75rem 12px;
  border-bottom: 0 solid #e2e2e2;
  box-shadow: none;
  font-family: "Barlow", sans-serif !important;
}

.active-filters-header {
  display: inline-flex;
  align-items: center;
  gap: 1rem;
  min-height: var(--button-size);
}

.active-filters-title {
  font-family: "Barlow", sans-serif !important;
  font-size: .95rem !important;
  font-weight: 600 !important;
  padding-left: 0rem;
  color: #1a1a1a !important;
}

.active-filters-empty {
  display: inline-flex;
  align-items: center;
  gap: 1rem;
}

/* The button's style lives in main.css, shared with the sidebar; only the
   lens mask follows its backdrop, here .search-form's. */
.sidebar-toggle-btn {
  --icon-bg: #f0f0f0;
}

.collapse-btn {
  display: inline-flex;
  align-items: center;
  gap: .35rem;
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  font-family: "Barlow", sans-serif !important;
  cursor: pointer;
}

.collapse-arrow {
  display: inline-block;
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 6px solid #666;
  transition: transform .15s ease;
}

.collapse-arrow.opened {
  transform: rotate(180deg);
}

/*
.active-filters {
  position: sticky;
  top: 0;
  z-index: 20;
  background: #fff;
  padding: .75rem 1rem;
  border-bottom: 1px solid #e2e2e2;
  box-shadow: 0 2px 6px rgba(0,0,0,.06);
}

.active-filters-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: .75rem;
}

.active-filters-title {
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: .02em;
  text-transform: uppercase;
  color: #1a1a1a;
}
  */
/* Under 768px the row no longer fits: the labels are shortened so the
   button stays to their left. */
@media screen and (max-width: 768px) {
  .label-extra {
    display: none;
  }

  .active-filters-header {
    gap: .5rem;
  }

  .clearall-btn {
    padding: .35rem .5rem;
  }
}

.filter-tags {
  display:flex;
  flex-wrap:wrap;
  gap:.5rem;
  padding-top:.5rem;
}

.filter-tag {
  display:flex;
  align-items:center;
  gap:.35rem;

  background:#fff;
  border:1px solid #ddd;
  border-radius:15px;

  padding:.25rem .75rem;

  font-family: "Barlow", sans-serif !important;
  font-size: .85rem !important;
  font-weight: 500 !important;
  line-height: 1.4 !important;
  color: #333 !important;
}

.clear-icon {
  width:14px;
  height:14px;

  cursor:pointer;

  fill:none;
  stroke:#666;
  stroke-width:2;
}

.clearall-icon {
  width:18px;
  height:18px;
  cursor:pointer;
  fill:none;
  align-self:center;
  stroke:#000000ad;
  stroke-width:2;
}

.clear-icon:hover {
  stroke:#b9192f;
}

.clearall-btn {
  display: inline-flex;
  align-items: center;
  gap: .35rem;
  background: none;
  color: #000000;
  border: none;
  border-radius: 20px;
  padding: .35rem .85rem;
  font-size: .85rem;
  font-weight: 100;
  cursor: pointer;
}

.clearall-btn:hover,
.clearall-btn:focus-visible {
  background: #b9192f;
  border-color: #b9192f;
  color: #fff;
}

</style>