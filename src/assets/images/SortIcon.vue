<template>
  <div class="icon-wrapper" :style="cssVars" :class="state">
    <svg class="icon" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">

      <!-- État NONE : deux flèches -->
      <template v-if="state === 'none'">
        <!-- FLÈCHE BAS (gauche) -->
        <g stroke="currentColor" stroke-width="6" stroke-linecap="square">
          <line x1="38" y1="44" x2="38" y2="78"/>
          <line x1="22" y1="72" x2="38" y2="84"/>
          <line x1="38" y1="84" x2="54" y2="72"/>
        </g>
        <!-- FLÈCHE HAUT (droite) -->
        <g stroke="currentColor" stroke-width="6" stroke-linecap="square">
          <line x1="90" y1="84" x2="90" y2="50"/>
          <line x1="74" y1="56" x2="90" y2="44"/>
          <line x1="90" y1="44" x2="106" y2="56"/>
        </g>
      </template>

      <!-- État ASCENDING : flèche descendante + Z -->
      <template v-else-if="state === 'asc' && type === 'string'">
        <g transform="scale(3.4)">
          <path fill="white" transform="translate(5 8)" d="M7.1367188 14.380859L3.6123047 14.380859L2.9267578 17L0.19335938 17L4.1923828 4.203125L6.5566406 4.203125L10.582031 17L7.8222656 17L7.1367188 14.380859ZM4.1748047 12.227539L6.5654297 12.227539L5.3701172 7.6660156L4.1748047 12.227539ZM16.12793 12.552734L11.830078 12.552734L11.830078 10.478516L16.12793 10.478516L16.12793 12.552734ZM20.99707 14.855469L26.270508 14.855469L26.270508 17L17.973633 17L17.973633 15.444336L23.194336 6.3564453L17.920898 6.3564453L17.920898 4.203125L26.173828 4.203125L26.173828 5.7236328L20.99707 14.855469Z"/>
        </g>
      </template>

      <!-- État DESCENDING : flèche montante + A -->
      <template v-else-if="state === 'desc' && type === 'string'">
        <g transform="scale(3.4)">
          <path fill="white" transform="translate(6 8)" d="M3.7089844 14.855469L8.9824219 14.855469L8.9824219 17L0.68554688 17L0.68554688 15.444336L5.90625 6.3564453L0.6328125 6.3564453L0.6328125 4.203125L8.8857422 4.203125L8.8857422 5.7236328L3.7089844 14.855469ZM14.923828 12.552734L10.625977 12.552734L10.625977 10.478516L14.923828 10.478516L14.923828 12.552734ZM23.220703 14.380859L19.696289 14.380859L19.010742 17L16.277344 17L20.276367 4.203125L22.640625 4.203125L26.666016 17L23.90625 17L23.220703 14.380859ZM20.258789 12.227539L22.649414 12.227539L21.454102 7.6660156L20.258789 12.227539Z"/>
        </g>
      </template>

      <template v-else-if="state === 'asc' && (type === 'range' || type === 'date')">
        <g stroke="currentColor" stroke-width="6" stroke-linecap="square">
          <line x1="64" y1="44" x2="64" y2="78"/>
          <line x1="48" y1="72" x2="64" y2="84"/>
          <line x1="64" y1="84" x2="80" y2="72"/>
        </g>
      </template>

      <template v-else-if="state === 'desc' && (type === 'range' || type === 'date')">
        <g stroke="currentColor" stroke-width="6" stroke-linecap="square">
          <line x1="64" y1="84" x2="64" y2="50"/>
          <line x1="48" y1="56" x2="64" y2="44"/>
          <line x1="64" y1="44" x2="80" y2="56"/>
        </g>
      </template>

    </svg>
  </div>
</template>

<script setup>
const props = defineProps({
  state: { type: String, default: 'none' }, // 'asc' | 'desc' | 'none'
  type: { type: String, default: 'string' },
  bgColor: { type: String, default: 'var(--fill-color)' },
  fgColor: { type: String, default: 'var(--fill-color)' },
  size: { type: Number, default: 32 },
  radius: { type: Number, default: 4 }
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
  background-color: var(--bg);
  color: var(--fg);
  display: flex;
  align-items: center;
  justify-content: center;

  &.none {
    background-color: var(--default-bg-color);
    color: #848484 !important;
  }
}

.icon {
  width: 100%;
  height: 100%;
  color: inherit;
}

.letter {
  fill: var(--fg);
  font-size: 28px; /* Ajuste pour rester proportionnel aux flèches */
  font-weight: bold;
  font-family: "Barlow Semi Condensed", sans-serif;
  text-anchor: middle;
  dominant-baseline: middle;
}
</style>