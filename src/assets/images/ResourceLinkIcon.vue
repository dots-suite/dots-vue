<template>
  <div
    class="icon-wrapper"
    :style="cssVars"
  >
    <svg
      class="icon"
      viewBox="0 0 25 25"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <g :transform-origin="iconScaleOrigin" :transform="iconTransform">
        <!-- Same frame as ResourceIcon -->
        <path
          fill="currentColor"
          fill-rule="evenodd"
          d="M2.777 2.778V22.222H22.215V2.778H2.777ZM2.777 25C2.013 25 1.359 24.728 0.815 24.185C0.272 23.64 0 22.986 0 22.222V2.778C0 2.014 0.272 1.36 0.815 0.815C1.359 0.272 2.013 0 2.777 0H22.215C22.979 0 23.633 0.272 24.177 0.815C24.72 1.36 24.992 2.014 24.992 2.778V22.222C24.992 22.986 24.72 23.64 24.177 24.185C23.633 24.728 22.979 25 22.215 25H2.777Z"
        />
        <!-- 45° arrow inside, from bottom left to top right -->
        <path
          fill="none"
          stroke="currentColor"
          stroke-width="2.6"
          stroke-linecap="square"
          stroke-linejoin="miter"
          d="M7.5 17.5L16.5 8.5M9.5 8.5H16.5V15.5"
        />
      </g>
    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  bgColor: { type: String, default: 'var(--icon-bg)' },
  fgColor: { type: String, default: 'var(--icon-fg)' },
  size: { type: Number, default: 40 },
  iconScale: { type: Number, default: 0.8 },
  iconScaleOrigin: { type: String, default: 'center' },
  radius: { type: Number, default: 6 }
})

const cssVars = computed(() => ({
  '--bg': props.bgColor,
  '--fg': props.fgColor,
  '--size': `${props.size}px`,
  '--radius': `${props.radius}px`
}))

const iconTransform = computed(() => 'scale(' + props.iconScale + ')')
</script>

<style scoped>
.icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;

  color: var(--fg, #ffffff);
  background-color: var(--bg);

  transition: background-color 0.2s ease;

  flex-shrink: 0;
}

.icon {
  width: 100%;
  height: 100%;
}
</style>
