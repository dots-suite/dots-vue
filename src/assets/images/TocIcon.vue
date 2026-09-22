<template>
  <div
    class="icon-wrapper"
    :style="cssVars"
  >
    <svg
      class="icon"
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <g>
          <g transform="translate(320, 975)">
            <line
                id="Line"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                x1="-304.4"
                y1="-964.8"
                x2="-288.4"
                y2="-964.8"
            />
            <line
                id="Line-Copy"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                x1="-304.4"
                y1="-957.8"
                x2="-288.4"
                y2="-957.8"
            />
            <line
                id="Line-Copy-2"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                x1="-304.4"
                y1="-950.5"
                x2="-288.4"
                y2="-950.5"
            />
            <rect
                id="Rectangle-3"
                x="-312"
                y="-965"
                fill-rule="evenodd"
                clip-rule="evenodd"
                fill="currentColor"
                width="4"
                height="4"
            />
          </g>
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
  radius: { type: Number, default: 6 }
})

const cssVars = computed(() => ({
  '--bg': props.bgColor,
  '--fg': props.fgColor,
  '--size': `${props.size}px`,
  '--radius': `${props.radius}px`
}))
</script>

<style scoped>
.icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;

  color: var(--fill-color, var(--icon-text-color));
  border: var(--fill-color) solid 2px;
  transition: background-color 0.2s ease;

  flex-shrink: 0;
}

.disabled .icon-wrapper {
  background-color: #C3C3C3;
}

.is-opened > .icon-wrapper {
  color: #FFF;
  background-color: var(--fill-color);
}

.icon {
  width: auto;
  height: 100%;
}
</style>