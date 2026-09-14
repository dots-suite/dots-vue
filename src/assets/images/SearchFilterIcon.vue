<template>
  <div
    class="icon-wrapper"
    :style="cssVars"
  >
    <svg
      class="icon"
      viewBox="0 0 256 256"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
    >
      <!-- Lignes -->
      <path
        fill="currentColor"
        d="M192 72H40a8 8 0 0 0 0 16h152a8 8 0 0 0 0-16m0 48H48a8 8 0 0 0 0 16h144a8 8 0 0 0 0-16m-80 48H56a8 8 0 0 0 0 16h56a8 8 0 0 0 0-16"
      />

      <!-- Check -->
      <path
        v-if="type === 'check'"
        fill="none"
        stroke="currentColor"
        stroke-width="16"
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M164 184l16 16 36-40"
      />

      <!-- Croix -->
      <path
        v-else
        fill="none"
        stroke="currentColor"
        stroke-width="16"
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M168 168l48 48m0-48l-48 48"
      />
    </svg>
  </div>
</template>

<script setup>
const props = defineProps({
  type: {
    type: String,
    default: 'check',
    validator: value => ['check', 'cross'].includes(value)
  },
  color: {
    type: String,
    default: 'currentColor'
  },
  size: {
    type: Number,
    default: 32
  }
})

const cssVars = {
  '--icon-color': props.color,
  '--icon-size': `${props.size}px`
}
</script>

<style scoped>
.icon-wrapper {
  width: var(--icon-size);
  height: var(--icon-size);
  color: var(--icon-color);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon {
  width: 100%;
  height: 100%;
  color: inherit;
  display: block;
}
</style>