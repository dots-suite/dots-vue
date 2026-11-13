<template>
  <nav
    class="home-filters-card"
    :aria-label="title"
  >
    <h2 class="home-filters-card-title">
      {{ title }}
    </h2>
    <ul class="home-filters-card-list">
      <li>
        <button
          type="button"
          class="home-filters-card-item"
          :class="{ 'is-active': !activeFilter }"
          :aria-pressed="!activeFilter"
          @click="select(null)"
        >
          {{ allLabel }}
        </button>
      </li>
      <li
        v-for="key in filterKeys"
        :key="key"
      >
        <button
          type="button"
          class="home-filters-card-item"
          :class="{ 'is-active': activeFilter === key }"
          :aria-pressed="activeFilter === key"
          @click="select(key)"
        >
          {{ key }}
        </button>
      </li>
    </ul>
  </nav>
</template>

<script>
import { computed } from 'vue'
import store from '@/store'

// Home page filters as a card (homePageSettings.filtersCard): the same store
// homeFilter as the about text [data-filter] items, so both stay in sync
export default {
  name: 'HomeFiltersCard',

  props: {
    // homePageSettings.filters: { label: [collection ids] }
    filters: {
      type: Object,
      required: true
    },
    title: {
      type: String,
      default: 'Filtres'
    },
    allLabel: {
      type: String,
      default: 'Tous'
    }
  },

  setup (props) {
    const filterKeys = computed(() =>
      Object.keys(props.filters).filter(key => Array.isArray(props.filters[key]))
    )
    const activeFilter = computed(() => store.state.homeFilter)

    const select = (key) => {
      store.commit('setHomeFilter', key)
    }

    return {
      filterKeys,
      activeFilter,
      select
    }
  }
}
</script>

<style scoped>
.home-filters-card {
  height: 100%;
  padding: 35px 35px 45px;
  border-radius: 24px;
  background-color: #F4F4F4;
  font-family: var(--font-secondary), sans-serif;
}

.home-filters-card-title {
  margin: 0 0 30px;
  font-family: var(--font-secondary), sans-serif;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
  color: #000000;
}

.home-filters-card-list {
  display: flex;
  flex-direction: column;
  gap: 22px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.home-filters-card-item {
  position: relative;
  display: block;
  padding: 0 0 0 18px;
  border: none;
  background: none;
  font: inherit;
  font-size: 16px;
  line-height: 1.15;
  text-align: left;
  color: #333333;
  cursor: pointer;
}

/* Small grey square before each entry, a diamond in the collection colour for the active one */
.home-filters-card-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.35em;
  width: 7px;
  height: 7px;
  background-color: #D9D9D9;
  transition: transform 0.15s ease, background-color 0.15s ease;
}

.home-filters-card-item:hover,
.home-filters-card-item:focus-visible {
  text-decoration: underline dotted;
  text-underline-offset: 4px;
}

.home-filters-card-item.is-active {
  color: var(--fill-color);
}

.home-filters-card-item.is-active::before {
  background-color: var(--fill-color);
  transform: rotate(45deg) scale(1.15);
}
</style>
