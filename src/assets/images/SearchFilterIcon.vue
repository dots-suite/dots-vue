<template>
  <div
    class="icon-wrapper"
    :style="cssVars"
  >
    <svg
      class="icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      <!-- Lignes (liste) -->
      <line x1="3" y1="5.5" x2="21" y2="5.5" />
      <line x1="6" y1="11" x2="18" y2="11" />
      <line x1="9" y1="16.5" x2="15" y2="16.5" />

      <!-- Check -->
      <g v-if="type === 'check'">
        <circle
          cx="17.2"
          cy="17.2"
          r="3.3"
          :fill="bg"
        />
        <line x1="19.6" y1="19.6" x2="22" y2="22" />
      </g>

      <!-- Croix -->
      <g v-else>
        <circle
          cx="17.4"
          cy="17.4"
          r="4.2"
          :fill="bg"
          stroke="none"
        />
        <line x1="15" y1="15" x2="19.8" y2="19.8" />
        <line x1="19.8" y1="15" x2="15" y2="19.8" />
      </g>
    </svg>
  </div>
</template>

<script setup>
const props = defineProps({
  // 'check' ou 'cross'
  type: {
    type: String,
    default: 'check',
    validator: (value) => ['check', 'cross'].includes(value)
  },
  // couleur des traits (icône)
  color: {
    type: String,
    default: 'currentColor'
  },
  // couleur utilisée pour "masquer" les lignes derrière le rond
  // (doit correspondre au fond réel sur lequel l'icône est posée)
  bg: {
    type: String,
    default: 'var(--icon-bg, #fff)'
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
  width: 90%;
  height: 100%;
  display: block;
}
</style>