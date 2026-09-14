<template>
  <div class="alpha-facet">
    <div class="alpha-facet-search">
      <input
        v-model="searchQuery"
        type="text"
        class="alpha-search-input"
        :placeholder="placeholder"
      >
      <span class="alpha-count">{{ filteredItems.length }}</span>
    </div>

    <div class="alpha-list">
      <template v-for="(row, i) in rows" :key="i">
        <div
          v-if="row.type === 'header'"
          class="alpha-section-header"
        >
          {{ row.value }}
        </div>

        <div
          v-else
          class="alpha-item"
          :class="{ 'is-selected': isSelected(row.value) }"
          role="checkbox"
          :aria-checked="isSelected(row.value)"
          tabindex="0"
          @click="toggle(row.value)"
          @keydown.enter.prevent="toggle(row.value)"
          @keydown.space.prevent="toggle(row.value)"
        >
          <span class="alpha-item-label">{{ labelOf(row.value) }}</span>
          <span
            v-if="row.value.count !== undefined && row.value.count !== null"
            class="alpha-item-count"
          >
            ({{ row.value.count }})
          </span>
        </div>
      </template>

      <p v-if="!rows.length" class="alpha-empty">Aucun résultat</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

/**
 * Facette "terms" à parcours alphabétique : recherche texte + liste groupée
 * par lettre (headers collants au scroll) + lignes cliquables pour la
 * sélection multiple.
 *
 * `items` attend le même format que les valeurs de facette utilisées
 * ailleurs dans SearchFacets.vue : { facet_key | value | id, label | value, count }.
 */
const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  selectedKeys: {
    type: Array,
    default: () => [],
  },
  label: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: 'Rechercher…',
  },
  // Pour les listes courtes (ex. Langage) : désactive les en-têtes de lettre
  // afin de tout voir d'un coup d'œil, sans repères alphabétiques.
  showLetterHeaders: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['toggle'])

function keyOf(item) {
  return item.facet_key ?? item.value ?? item.id
}
function labelOf(item) {
  return item.label || item.value || String(keyOf(item))
}

const searchQuery = ref('')

const filteredItems = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return props.items
  return props.items.filter((it) => labelOf(it).toLowerCase().includes(q))
})

const sortedItems = computed(() =>
  [...filteredItems.value].sort((a, b) =>
    labelOf(a).localeCompare(labelOf(b), 'fr', { sensitivity: 'base' })
  )
)

// --- Regroupement par première lettre du libellé ---
const grouped = computed(() => {
  const map = {}
  for (const item of sortedItems.value) {
    const letter = (labelOf(item)[0] || '#').toUpperCase()
    if (!map[letter]) map[letter] = []
    map[letter].push(item)
  }
  return map
})

// --- Liste "à plat" : headers + items ---
const rows = computed(() => {
  const result = []
  const letters = Object.keys(grouped.value).sort()
  for (const letter of letters) {
    // Le tri alphabétique reste appliqué même sans en-tête affiché.
    if (props.showLetterHeaders) {
      result.push({ type: 'header', value: letter })
    }
    for (const item of grouped.value[letter]) {
      result.push({ type: 'item', value: item })
    }
  }
  return result
})

// --- Sélection ---
function isSelected(item) {
  return props.selectedKeys.includes(keyOf(item))
}
function toggle(item) {
  emit('toggle', item)
}
</script>

<style scoped>
.alpha-facet {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.alpha-facet-search {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e5e5e5;
}

.alpha-search-input {
  flex: 1;
  padding: 0.35rem 0.6rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.85rem;
  font-family: inherit;
}

.alpha-search-input:focus {
  outline: none;
  border-color: #820000;
}

.alpha-count {
  font-size: 0.75rem;
  font-weight: 600;
  color: #820000;
  white-space: nowrap;
}

.alpha-list {
  position: relative;
  max-height: 260px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.alpha-section-header {
  position: sticky;
  top: 0;
  height: 32px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  background: #f0f0f2;
  color: #000000;
  font-weight: 700;
  font-size: 13px;
}

.alpha-item {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 44px;
  padding: 0 16px;
  font-size: 0.85rem;
  border-bottom: 1px solid #f2f2f2;
  cursor: pointer;
}

.alpha-item:last-child {
  border-bottom: none;
}

.alpha-item:hover {
  background: #f7f7f7;
}

.alpha-item:focus-visible {
  outline: 2px solid #820000;
  outline-offset: -2px;
}

.alpha-item.is-selected {
  background: #f7e9e9;
  font-weight: 600;
}

.alpha-item-label {
  flex: 1;
}

.alpha-item-count {
  color: #820000;
  font-size: 0.78rem;
  font-weight: 600;
}

.alpha-empty {
  padding: 0.75rem;
  font-size: 0.82rem;
  color: #888;
  text-align: center;
}

/* --- Mobile : cibles tactiles plus grandes, liste qui exploite l'écran --- */
@media (max-width: 640px) {
  .alpha-list {
    max-height: 50vh;
  }

  .alpha-search-input {
    font-size: 1rem;
    padding: 0.55rem 0.7rem;
  }

  .alpha-item {
    height: 52px;
    font-size: 0.95rem;
  }

  .alpha-item-count {
    font-size: 0.85rem;
  }
} 
</style>