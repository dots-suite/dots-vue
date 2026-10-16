<template>
  <div
    class="navbar-search"
    :class="{ 'has-error': invalidQueryMessage }"
    @click.stop
    @keydown.esc="$emit('close')"
  >
    <div class="navbar-search-bar">
      <!-- Same controls as the search page bar: a click switches mode -->
      <div class="search-mode-wrapper">
        <button
          type="button"
          class="search-mode-trigger"
          :title="`Passer en recherche ${otherModeLabel}`"
          :aria-label="`Recherche ${currentModeLabel} : passer en recherche ${otherModeLabel}`"
          @click="switchMode"
        >
          <span class="search-mode-label"><span
            class="search-mode-switch"
            :class="{ 'is-on': mode === 'fulltext' }"
            aria-hidden="true"
          /><span class="search-mode-text"><span class="search-mode-long">{{ currentModeLabel }}</span><span class="search-mode-short">{{ mode === 'fulltext' ? 'texte' : 'notices' }}</span></span></span>
        </button>
      </div>
      <div class="navbar-search-field">
        <input
          ref="inputEl"
          v-model="term"
          class="input"
          :class="{ 'input-error': invalidQueryMessage }"
          type="text"
          :placeholder="collectionName ? `Rechercher dans ${collectionName}` : 'Rechercher'"
          @keyup.enter="submit"
        >
        <button
          v-if="term"
          type="button"
          class="search-clear"
          title="Effacer le texte"
          aria-label="Effacer le texte"
          @click="clearTerm"
        >
          <span aria-hidden="true" />
        </button>
      </div>
      <button
        type="button"
        class="search-submit"
        title="Aller à la recherche"
        aria-label="Aller à la recherche"
        :disabled="!!invalidQueryMessage"
        @click="submit"
      />
      <!-- Same check as the search page bar: in the field on its right,
           under the whole bar from 1024px down -->
      <div
        v-if="invalidQueryMessage"
        class="search-error-message"
        role="alert"
      >
        {{ invalidQueryMessage }}
      </div>
    </div>
  </div>
</template>

<script>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import { getInvalidQueryMessage } from '@/composables/search-page'

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
    const inputEl = ref(null)

    const currentModeLabel = computed(() => modeOptions.find(o => o.value === mode.value)?.text)

    const otherModeLabel = computed(() => modeOptions.find(o => o.value !== mode.value)?.text)

    const switchMode = () => {
      mode.value = mode.value === 'fulltext' ? 'notice' : 'fulltext'
      inputEl.value?.focus()
    }

    // The search page reads q and mode, runs the search, then drops them
    // Why the query cannot be searched, '' when it can (search-page.js)
    const invalidQueryMessage = computed(() =>
      getInvalidQueryMessage(term.value, mode.value === 'fulltext')
    )

    const clearTerm = () => {
      term.value = ''
      inputEl.value?.focus()
    }

    const submit = () => {
      if (invalidQueryMessage.value) return
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
      inputEl,
      currentModeLabel,
      otherModeLabel,
      switchMode,
      invalidQueryMessage,
      clearTerm,
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
  position: relative;
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
  height: calc(var(--button-size) - 2px);
  padding: 10px 14px;
  border: none;
  border-radius: 6px 0 0 6px;
  background: #FFFFFF;
  color: var(--fill-color);
  /* a <button>: it does not inherit the font, as the search page's */
  font-family: var(--font-primary), sans-serif;
  font-size: var(--font-default-size);
  text-transform: lowercase;
  cursor: pointer;
}

/* Switches mode: a vertical switch, its knob down (notices) or up (full
   text) */
.search-mode-switch {
  position: relative;
  flex: none;
  width: 14px;
  height: 24px;
  border-radius: 7px;
  background-color: color-mix(in srgb, var(--fill-color) 25%, #ffffff);
  transition: background-color .15s ease;

  &::after {
    content: '';
    position: absolute;
    bottom: 2px;
    left: 2px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background-color: var(--fill-color);
    transition: transform .15s ease, background-color .15s ease;
  }

  &.is-on {
    background-color: var(--fill-color);
  }
  &.is-on::after {
    transform: translateY(-10px);
    background-color: #ffffff;
  }
}

.navbar-search-field {
  position: relative;
  display: flex;
  flex: 1;
  min-width: 0;
}

.input {
  flex: 1;
  min-width: 0;
  height: calc(var(--button-size) - 2px);
  /* room on the right for the clear cross */
  padding: 6px 40px 6px 12px;
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

/* Clear cross: a cross in a grey circle */
.search-clear {
  position: absolute;
  top: 50%;
  right: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  transform: translateY(-50%);
  border: none;
  background: transparent;
  cursor: pointer;

  & span {
    position: relative;
    width: 18px;
    height: 18px;
    border: 1.5px solid #b8b8b8;
    border-radius: 50%;
  }

  & span::before,
  & span::after {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    width: 10px;
    height: 1.5px;
    background-color: #b8b8b8;
  }

  & span::before {
    transform: translate(-50%, -50%) rotate(45deg);
  }

  & span::after {
    transform: translate(-50%, -50%) rotate(-45deg);
  }

  &:hover span {
    border-color: #666;
  }

  &:hover span::before,
  &:hover span::after {
    background-color: #666;
  }
}

/* Invalid query: red text and an inset red outline (as the search page
   bar), the reason in the field on its right */
.input.input-error,
.input.input-error:focus {
  padding-right: 50%;
  color: #d33;
  box-shadow: inset 0 0 0 1px #d33 !important;
}
.search-error-message {
  position: absolute;
  top: 50%;
  /* in the field, before the clear cross (10px + 22px) and the button */
  right: calc(var(--button-size) + 40px);
  max-width: calc(50% - 48px);
  transform: translateY(-50%);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: #d33;
  pointer-events: none;
}

/* Disabled while the query is invalid, as the search page's button */
.search-submit:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  filter: grayscale(1);
}

.search-submit {
  flex: none;
  width: var(--button-size);
  height: calc(var(--button-size) - 2px);
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
    padding: 0 8px 0 13px;
    gap: 4px;
  }
}

/* From 1024px down the field is too narrow for the query error: under the
   field, out of the bar's border. The band grows downwards: its content
   from the top, a fixed space above the bar, more below with the error */
@media screen and (max-width: 1024px) {
  .navbar-search {
    align-items: flex-start;
    height: auto;
    min-height: 88px;
    padding-top: 22px;
    padding-bottom: 22px;
  }
  .navbar-search.has-error {
    padding-bottom: 48px;
  }
  .input.input-error,
  .input.input-error:focus {
    padding-right: 40px;
  }
  /* across the whole bar, under its border */
  .search-error-message {
    top: calc(100% + 5px);
    left: -1px;
    right: -1px;
    max-width: none;
    transform: none;
    text-align: center;
    white-space: normal;
  }
}
@media screen and (max-width: 768px) {
  /* 56px band: the bar 11px from its top */
  .navbar-search {
    min-height: 56px;
    padding-top: 11px;
    padding-bottom: 11px;
  }
  /* 12px under the error's line */
  .navbar-search.has-error {
    padding-bottom: 35px;
  }
}

/* The bar from the band's top, 22px (12px on phones) under the navbar: the
   search page bar's place */
.navbar-search {
  align-items: flex-start;
  padding-top: 22px;
}
@media screen and (max-width: 768px) {
  .navbar-search {
    padding-top: 12px;
  }
}
/* The switch in the label, before the text, its centre over the "Filtres"
   button's icon under the bar (13px in) */
.search-mode-label {
  display: flex;
  align-items: center;
  /* the text from the "Filtres" word's left edge */
  gap: 9px;
}
/* A capital at the start (the names stay lowercase in the titles) */
.search-mode-text {
  display: inline-block;

  &::first-letter {
    text-transform: uppercase;
  }
}
/* From 769px, the mode switch as wide as the "Filtres" button with its
   counter right under the bar, the switch over the button's icon, the text
   over its word. Below, the layout changes. */
@media screen and (min-width: 769px) {
  /* the placeholder (and the query) from the separator of the active
     filters under the bar: the "Filtres" button's right edge + 13px, the
     6px caret, 13px */
  .input {
    padding-left: 32px;
  }
  .search-mode-trigger {
    justify-content: flex-start;
    box-sizing: border-box;
    /* the "Filtres" button with a one-digit counter, minus the bar's border */
    width: 124px;
    padding-left: 13px;
    padding-right: 0;
  }
}
/* Very narrow screens: "texte" for "plein texte", and less room around
   the clear cross */
.search-mode-short {
  display: none;
}
@media screen and (max-width: 480px) {
  .search-mode-long {
    display: none;
  }
  .search-mode-short {
    display: inline;
  }
  .search-clear {
    right: 4px;
  }
  .input,
  .input.input-error,
  .input.input-error:focus {
    padding-right: 30px;
  }
}
</style>
