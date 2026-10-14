<template>
  <div
    class="navbar-search"
    @click.stop
    @keydown.esc="$emit('close')"
  >
    <span class="navbar-search-label">
      Recherche dans {{ collectionName }}
    </span>
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
        placeholder="Recherche"
        @keyup.enter="submit"
      >
      <button
        type="button"
        class="search-submit"
        title="Rechercher"
        aria-label="Rechercher"
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
    const mode = ref(activeSearch?.isFulltextSearch ? 'fulltext' : 'notice')
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

.navbar-search-label {
  flex: none;
  font-size: 20px;
  font-weight: 500;
  white-space: nowrap;
}

.navbar-search-bar {
  display: flex;
  flex: 1;
  min-width: 0;
  align-items: center;
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
  height: calc(var(--button-size) * 1.1);
  padding: 10px 14px;
  border: 1px solid var(--fill-color);
  border-radius: 6px 0 0 6px;
  background: #FFFFFF;
  color: var(--fill-color);
  font-size: 14px;
  text-transform: lowercase;
  cursor: pointer;
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
  z-index: 20;
  background: #FFFFFF;
  border: 1px solid #DDDDDD;
}

.search-mode-option {
  padding: 10px 12px;
  color: #1A1A1A;
  font-size: 14px;
  text-transform: lowercase;
  cursor: pointer;

  &.active,
  &:hover {
    color: var(--fill-color);
  }
}

.input {
  flex: 1;
  min-width: 0;
  height: calc(var(--button-size) * 1.1);
  padding: 6px 12px;
  border: 1px solid #979797;
  border-radius: 0;
  box-shadow: none;
  font-size: 16px;

  /* No focus ring, like the search page bar */
  &:focus {
    outline: none !important;
    box-shadow: none !important;
    border-color: #979797;
  }
}

.search-submit {
  flex: none;
  width: calc(var(--button-size) * 1.1);
  height: calc(var(--button-size) * 1.1);
  padding: 0;
  border: none;
  border-radius: 0 6px 6px 0;
  /* bouton_loupe.svg carries its own red background: the collection colour
     here, with the magnifier drawn over it in white */
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

@media screen and (max-width: 768px) {
  /* 8px padding top and bottom + 40px breadcrumb row */
  .navbar-search {
    height: 56px;
    gap: 12px;
  }
  .navbar-search-label {
    display: none;
  }
  /* The mode selector is cramped: drop its side padding (as SearchPage) */
  .search-mode-trigger {
    padding: 0 8px;
    gap: 4px;
  }
}
</style>
