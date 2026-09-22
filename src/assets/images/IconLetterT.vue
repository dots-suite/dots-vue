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
        <g transform="scale(1.3) translate(-5.5,-5.5)">
          <path fill="currentColor" transform="translate(13.4127 11)" d="M14.88 0C15.02 0 15.13 0.039999999 15.21 0.12C15.29 0.2 15.33 0.31 15.33 0.44999999L15.33 4.3800001C15.33 4.52 15.29 4.6300001 15.21 4.71C15.13 4.79 15.02 4.8299999 14.88 4.8299999L10.62 4.8299999C10.5 4.8299999 10.44 4.8899999 10.44 5.0100002L10.44 20.549999C10.44 20.690001 10.4 20.799999 10.32 20.879999C10.24 20.959999 10.13 21 9.9899998 21L5.25 21C5.1100001 21 5 20.959999 4.9200001 20.879999C4.8400002 20.799999 4.8000002 20.690001 4.8000002 20.549999L4.8000002 5.0100002C4.8000002 4.8899999 4.7399998 4.8299999 4.6199999 4.8299999L0.44999999 4.8299999C0.31 4.8299999 0.2 4.79 0.12 4.71C0.039999999 4.6300001 0 4.52 0 4.3800001L0 0.44999999C0 0.31 0.039999999 0.2 0.12 0.12C0.2 0.039999999 0.31 0 0.44999999 0L14.88 0Z"/>
        </g>
      </g>
    </svg>
  </div>
</template>

<script setup>
const props = defineProps({
  bgColor: { type: String, default: 'transparent' },
  fgColor: { type: String, default: 'var(--icon-fg)' },
  size: { type: Number, default: 40 },
  radius: { type: Number, default: 4 },
  strokeWidth: { type: Number, default: 1 }
})

const cssVars = {
  '--bg': props.bgColor,
  '--fg': props.fgColor,
  '--size': `${props.size}px`,
  '--radius': `${props.radius}px`
}
</script>

<style scoped>
.icon-wrapper {
  --fg: #ffffff;

  background-color: var(--bg);
  color: var(--fill-color, var(--icon-text-color));
  border: var(--fill-color) solid 1px;

  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
}

.disabled .icon-wrapper {
  color: #e5e5e5;
  border-color: #e5e5e5;
}

.icon-wrapper.active {
  color: #FFF;
  background-color: var(--fill-color);
}

/* Touch: the press itself gives the feedback hover used to */
@media (hover: none) {
  .text-mode .icon-wrapper,
  .icon-wrapper:active {
    color: #FFF;
    background-color: var(--fill-color);
  }
}

.icon {
  width: 100%;
  height: 100%;
}
</style>
