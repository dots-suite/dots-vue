<template>
  <div
    class="navbar-search"
    @click.stop
    @keydown.esc="$emit('close')"
  >
    <div class="navbar-search-bar">
      <!-- Same controls as the search page bar -->
      <div class="search-mode-wrapper">
        <button
          type="button"
          class="search-mode-trigger"
          @click="isModeOpen = !isModeOpen"
        >
          <span>{{ currentModeLabel }}</span>
          <i class="arrow" />
        </button>
        <div
          v-if="isModeOpen"
          class="search-mode-dropdown"
        >
          <div
            v-for="opt in modeOptions"
            :key="opt.value"
            class="search-mode-option"
            :class="{ active: mode === opt.value }"
            @click="selectMode(opt.value)"
          >
            {{ opt.text }}
          </div>
        </div>
      </div>
      <input
        ref="inputEl"
        v-model="term"
        class="input"
        type="text"
        :placeholder="collectionName ? `Rechercher dans ${collectionName}` : 'Rechercher'"
        @keyup.enter="submit"
      >
      <button
        type="button"
        class="search-submit"
        title="Aller à la recherche"
        aria-label="Aller à la recherche"
        @click="submit"
      />
    </div>
  </div>
</template>

<script>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'

export default {
  name: 'NavbarSearch',

  props: {
    // Route of the search page, from getSearchRoute()
    searchRoute: {
      type: Object,
      required: true
    },
    collectionName: {
      type: String,
      default: ''
    }
  },

  emits: ['close'],

  setup (props, { emit }) {
    const router = useRouter()
    const store = useStore()

    const modeOptions = [
      { value: 'notice', text: 'notices' },
      { value: 'fulltext', text: 'plein texte' }
    ]

    // Starts on the mode of the current search, like the search page bar
    const activeSearch = store.state.search.byProject?.[store.state.search.activeProjectId]
    // Full text by default (no search yet), as the store
    const mode = ref((activeSearch?.isFulltextSearch ?? true) ? 'fulltext' : 'notice')
    const term = ref('')
    const isModeOpen = ref(false)
    const inputEl = ref(null)

    const currentModeLabel = computed(() => modeOptions.find(o => o.value === mode.value)?.text)

    const selectMode = (value) => {
      mode.value = value
      isModeOpen.value = false
      inputEl.value?.focus()
    }

    // The search page reads q and mode, runs the search, then drops them
    const submit = () => {
      router.push({
        ...props.searchRoute,
        query: { q: term.value.trim(), mode: mode.value }
      })
      emit('close')
    }

    onMounted(() => inputEl.value?.focus())

    return {
      modeOptions,
      mode,
      term,
      isModeOpen,
      inputEl,
      currentModeLabel,
      selectMode,
      submit
    }
  }
}
</script>

<style scoped>
/* Right under the navbar it opens from, full width, its content over the
   navbar's content width (padding set by AppNavbar, as the nav's). Over the
   document page's sticky breadcrumb (z-index 22). As high as the document
   page's .navigation-row-top-container (DocumentPage.vue), breakpoint
   included: 20px padding + 48px breadcrumb row + 20px below */
.navbar-search {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  height: 88px;
  z-index: 25;
  display: flex;
  align-items: center;
  gap: 20px;
  background-color: #f0f0f0;
  color: #1a1a1a;
  font-family: var(--font-primary), sans-serif;
}

/* One border, the collection colour, around the selector and the input;
   the filled submit button closes it on the right */
.navbar-search-bar {
  display: flex;
  flex: 1;
  min-width: 0;
  align-items: center;
  border: 1px solid var(--fill-color);
  border-radius: 6px;
  background-color: #FFFFFF;
}

/* ===== Search page bar controls (SearchPage.vue) ===== */

.search-mode-wrapper {
  position: relative;
  flex: none;
}

.search-mode-trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  /* Inside the bar's 1px border */
  height: calc(var(--button-size) * 1.1 - 2px);
  padding: 10px 14px;
  border: none;
  border-radius: 6px 0 0 6px;
  background: #FFFFFF;
  color: var(--fill-color);
  /* a <button>: it does not inherit the font, as the search page's */
  font-family: var(--font-primary), sans-serif;
  font-size: 14px;
  text-transform: lowercase;
  cursor: pointer;
}

.search-mode-trigger .arrow {
  width: 7px;
  height: 7px;
  margin: -4px 2px 0;
  border-right: 2px solid var(--fill-color);
  border-bottom: 2px solid var(--fill-color);
  transform: rotate(45deg);
}

/* The list looks like the bar: same border and radius, under it */
.search-mode-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: -1px;
  min-width: calc(100% + 1px);
  overflow: hidden;
  z-index: 20;
  background: #FFFFFF;
  border: 1px solid var(--fill-color);
  border-radius: 6px;
  box-shadow: 0 6px 16px -8px rgba(0, 0, 0, .35);
}

.search-mode-option {
  padding: 10px 14px;
  color: #1A1A1A;
  font-size: 14px;
  text-transform: lowercase;
  cursor: pointer;

  &:hover {
    background: color-mix(in srgb, var(--fill-color) 8%, #FFFFFF);
  }

  &.active {
    background: var(--fill-color);
    color: #FFFFFF;
  }
}

.input {
  flex: 1;
  min-width: 0;
  height: calc(var(--button-size) * 1.1 - 2px);
  padding: 6px 12px;
  border: none;
  border-radius: 0;
  box-shadow: none;
  font-size: 16px;

  /* No focus ring, like the search page bar */
  &:focus {
    outline: none !important;
    box-shadow: none !important;
  }
}

.search-submit {
  flex: none;
  width: calc(var(--button-size) * 1.1);
  height: calc(var(--button-size) * 1.1 - 2px);
  padding: 0;
  border: none;
  border-radius: 0 5px 5px 0;
  background-color: var(--fill-color);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  /* A white ">": it opens the search page, unlike the magnifier that
     opened this banner */
  &::after {
    content: '';
    display: block;
    width: 11px;
    height: 11px;
    border-top: 3px solid #FFFFFF;
    border-right: 3px solid #FFFFFF;
    transform: translateX(-2px) rotate(45deg);
  }
}

@media screen and (max-width: 768px) {
  /* 8px padding top and bottom + 40px breadcrumb row */
  .navbar-search {
    height: 56px;
    gap: 12px;
  }
  /* The mode selector is cramped: drop its side padding (as SearchPage) */
  .search-mode-trigger {
    padding: 0 8px;
    gap: 4px;
  }
}
</style>
