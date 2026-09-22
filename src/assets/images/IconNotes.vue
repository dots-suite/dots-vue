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
      <g transform="scale(1.25) translate(-3.5,-4.0)">
        <path class="note-no" transform="translate(12 4.00001)" d="M6.2963867 8.2978516L6.2963867 12.150391L9.0942383 12.150391L9.0942383 14.787109L6.2963867 14.787109L6.2963867 23.634766Q6.2963867 24.542969 6.6552734 24.945801Q7.0141602 25.348633 7.9370117 25.348633Q8.5522461 25.348633 9.1821289 25.202148L9.1821289 27.956055Q7.9663086 28.292969 6.8383789 28.292969Q2.7368164 28.292969 2.7368164 23.766602L2.7368164 14.787109L0.12939453 14.787109L0.12939453 12.150391L2.7368164 12.150391L2.7368164 8.2978516L6.2963867 8.2978516Z"/>
        <path fill="currentColor" transform="translate(22 4.00001)" d="M6.6679688 15L4.4101562 15L4.4101562 6.296875L1.7148438 7.1328125L1.7148438 5.296875L6.4257812 3.609375L6.6679688 3.609375L6.6679688 15Z"/>
      </g>
    </svg>
  </div>
</template>

<script setup>
const props = defineProps({
  bgColor: { type: String, default: 'transparent' },
  fgColor: { type: String, default: 'var(--icon-fg)' },
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

.icon {
  width: 100%;
  height: 100%;
}

.note-no {
  fill: #878787;
}

.disabled .icon-wrapper {
  color: #e5e5e5;
  border-color: #e5e5e5;
}

.is-notes-opened > .icon-wrapper {
  color: #FFF;
  background-color: var(--fill-color);

  .note-no {
    fill: #CCC;
  }
}

</style>
