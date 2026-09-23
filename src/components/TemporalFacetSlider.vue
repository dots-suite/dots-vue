<template>
  <div v-if="currentFacet" class="temporal-slider">
    <div class="slider-content">
      <div class="slider-label">
      </div>
      <div class="temporal-inputs">
        <span>Entre</span>
        <input
          type="number"
          class="year"
          v-model.number="inputMin"
          @blur="checkMin"
          @keyup.enter="checkMin"
        />
        <span>et</span>
        <input
          type="number"
          class="year"
          v-model.number="inputMax"
          @blur="checkMax"
          @keyup.enter="checkMax"
        />
      </div>
      <VueSlider
        :class="{ 'has-many-marks': Object.keys(marks).length > 3 }"
        v-model="sliderValue"
        :min="currentFacet.min"
        :max="currentFacet.max"
        :tooltip="'none'"
        :process="customProcess"
        :dot-options="dotOptions"
        :marks="marks"
        :order="false"
        range
      >
        <template #process="{ style }">
          <div
            class="vue-slider-process"
            :style="style"
          />
        </template>
      </VueSlider>
    </div>
  </div>
</template>
<script setup>

import { computed, ref, watch } from 'vue'

import VueSlider from 'vue-slider-component'
import 'vue-slider-component/theme/antd.css'

const props = defineProps({
  temporalFacet: {
    type: Object,
    default: null
  },
  ranges: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits([
  'change'
])

const currentFacet = computed(() => props.temporalFacet ?? null)

function clampRange(min, max) {
  const availableMinValue = Number(effectiveAvailableMin.value)
  const availableMaxValue = Number(effectiveAvailableMax.value)

  min = Number(min)
  max = Number(max)

  if (Number.isNaN(min)) {
    min = availableMinValue
  }

  if (Number.isNaN(max)) {
    max = availableMaxValue
  }

  // Clamping available range
  min = Math.max(
    availableMinValue,
    Math.min(min, availableMaxValue)
  )

  max = Math.max(
    availableMinValue,
    Math.min(max, availableMaxValue)
  )

  // Prevent slider handlers crossing each other
  if (min > max) {
    min = max
  }

  return [min, max]
}

// --------------------------
// DISPLAYED VALUES
// --------------------------
const inputMin = ref(null)
const inputMax = ref(null)
const sliderValue = ref([null,null])

const currentRange = computed(() => {
  if (!currentFacet.value) {
    return {
      min: null,
      max: null
    }
  }

  const r = props.ranges?.[currentFacet.value.key]

  const [min, max] = clampRange(
    r?.gte ?? effectiveAvailableMin.value,
    r?.lte ?? effectiveAvailableMax.value
  )

  return {
    min,
    max
  }
})

// Range Synchronisation -> inputs + slider
const updatingFromProps = ref(false)


// slider -> store

watch(
  sliderValue,
  value => {
    if (
      updatingFromProps.value ||
      !currentFacet.value ||
      !value
    ) {
      return
    }

    const [min, max] = clampRange(
      value[0],
      value[1]
    )

    if (
      min !== value[0] ||
      max !== value[1]
    ) {
      sliderValue.value = [min, max]
      return
    }

    inputMin.value = min
    inputMax.value = max

    emit('change', {
      key: currentFacet.value.key,
      range: {
        startField: currentFacet.value.start_field,
        endField: currentFacet.value.end_field,
        gte: min,
        lte: max
      }
    })
  },
  {
    deep: true
  }
)

// --------------------------
// Inputs -> slider
// --------------------------

function checkMin() {
  const [min, max] = clampRange(
    inputMin.value,
    inputMax.value
  )

  inputMin.value = min
  inputMax.value = max
  sliderValue.value = [min, max]
}

function checkMax() {
  const [min, max] = clampRange(
    inputMin.value,
    inputMax.value
  )

  inputMin.value = min
  inputMax.value = max
  sliderValue.value = [min, max]
}



function toPercent(value) {
  if (!currentFacet.value) return 0
  const { min, max } = currentFacet.value

  if (max === min) return 0
  return ((value - min) / (max - min)) * 100
}


const dotOptions = computed(() => [
  {
    min: effectiveAvailableMin.value,
    max: sliderValue.value?.[1] ?? effectiveAvailableMax.value
  },
  {
    min: sliderValue.value?.[0] ?? effectiveAvailableMin.value,
    max: effectiveAvailableMax.value
  }
])


function customProcess() {

  if (!currentFacet.value) {
    return []
  }

  const processes = []

  const availableStart = effectiveAvailableMin.value
  const availableEnd = effectiveAvailableMax.value

  const selectionStart = currentRange.value.min
  const selectionEnd = currentRange.value.max

  const intersectionStart = intersectionMin.value
  const intersectionEnd = intersectionMax.value

  const percent = value => {

    if (value == null) {
      return 0
    }

    return toPercent(value)
  }


  // ==================================================
  // DATE RANGE covered by results outside current user selection on the left
  // availableMin → selection.min
  // ==================================================

  if (
    availableStart != null &&
    selectionStart != null &&
    availableStart < selectionStart
  ) {

    processes.push([
      percent(availableStart),
      percent(selectionStart),
      {
        background: `repeating-linear-gradient(
          to right,
          #b9192f 0,
          #b9192f 5px,
          transparent 5px,
          transparent 9px
        )`,
        height: '3px'
      }
    ])
  }


  // ==================================================
  // DATE RANGE covered by results outside current user selection on the right
  // selection.max → availableMax
  // ==================================================

  if (
    selectionEnd != null &&
    availableEnd != null &&
    selectionEnd < availableEnd
  ) {

    processes.push([
      percent(selectionEnd),
      percent(availableEnd),
      {
        background: `repeating-linear-gradient(
          to right,
          #b9192f 0,
          #b9192f 5px,
          transparent 5px,
          transparent 9px
        )`,
        height: '3px'
      }
    ])
  }


  // ==================================================
  // CURRENT USER SELECTION
  // ==================================================

  if (
    selectionStart != null &&
    selectionEnd != null
  ) {

    processes.push([
      percent(selectionStart),
      percent(selectionEnd),
      {
        backgroundColor: '#b9192f',
        height: '3px'
      }
    ])
  }


  // ==================================================
  // INTERSECTION
  // ==================================================

  if (
    intersectionStart != null &&
    intersectionEnd != null &&
    intersectionStart <= intersectionEnd
  ) {

    processes.push([
      percent(intersectionStart),
      percent(intersectionEnd),
      {
        backgroundColor: '#f59e0b',
        height: '5px',
        top: '-1px',
        zIndex: '3'
      }
    ])
  }
  return processes
}


const marks = computed(() => {
  if (!currentFacet.value) return {}

  const facetMin = Number(currentFacet.value.min)
  const facetMax = Number(currentFacet.value.max)

  const availableMinValue = Number(effectiveAvailableMin.value)
  const availableMaxValue = Number(effectiveAvailableMax.value)

  const values = [
    // Facet Min/Max on full corpus
    facetMin,
    facetMax,

    // Min/Max currently available
    availableMinValue,
    availableMaxValue,

    // Clamped current selection
    currentRange.value.min,
    currentRange.value.max,

    // Intersection
    intersectionMin.value,
    intersectionMax.value
  ]

  const uniqueValues = [
    ...new Set(
      values
        .filter(Number.isFinite)
        .filter(value => {
          // A value is evaluated against total range of slider
          return value >= facetMin && value <= facetMax
        })
    )
  ].sort((a, b) => a - b)

  return Object.fromEntries(
    uniqueValues.map(value => [
      value,
      String(value)
    ])
  )
})


watch(
  currentFacet,
  facet => {
    if (!facet) {
      return
    }

    // console.log(
    //   '[TemporalSlider] currentFacet values:',
    //   {
    //     id: facet.id,
    //     key: facet.key,
    //     min: facet.min,
    //     max: facet.max,
    //     available_min: facet.available_min,
    //     available_max: facet.available_max,
    //     start_field: facet.start_field,
    //     end_field: facet.end_field,
    //     intersectionMin: facet?.intersection?.min,
    //     intersectionMax: facet?.intersection?.max
    //   }
    // )
  },
  {
    immediate: true,
    deep: true
  }
)

const effectiveAvailableMin = computed(() => {
  if (!currentFacet.value) return null

  return (
    currentFacet.value.available_min ??
    currentFacet.value.min
  )
})

const effectiveAvailableMax = computed(() => {
  if (!currentFacet.value) return null

  return (
    currentFacet.value.available_max ??
    currentFacet.value.max
  )
})


const intersectionMin = computed(() => {
  return currentFacet.value?.intersection?.min ?? null
})

const intersectionMax = computed(() => {
  return currentFacet.value?.intersection?.max ?? null
})

watch(
  [
    currentFacet,
    () => props.ranges,
    effectiveAvailableMin,
    effectiveAvailableMax
  ],
  () => {
    if (!currentFacet.value) return

    const r = props.ranges?.[currentFacet.value.key]

    const [min, max] = clampRange(
      r?.gte ?? effectiveAvailableMin.value,
      r?.lte ?? effectiveAvailableMax.value
    )

    updatingFromProps.value = true

    inputMin.value = min
    inputMax.value = max
    sliderValue.value = [min, max]

    queueMicrotask(() => {
      updatingFromProps.value = false
    })
  },
  {
    immediate: true,
    deep: true
  }
)

</script>
<style scoped>

.temporal-slider {
  flex: 50% 0 0;
  padding-top: 0px;
  padding-right: 0px;
  font-weight: 500;
  text-transform: uppercase;
}

/* tabs */
.temporal-tabs {
  display:flex;
  /* gap:.5rem;
  margin-bottom:1rem;*/
}

.temporal-tabs button {
  cursor: pointer;

  background-color: #f0f0f0;
  border: none;
  /*border-left: 3px solid #f0f0f0 !important;*/

  padding: 8px 16px;
  margin: 0;

  color: #979797;
  font-size: 14px;
  font-weight: inherit;

  position: relative;
  top: 1px;
}
.temporal-tabs button:hover {
  color: var(--fill-color);
}

.temporal-tabs button.active {
  color: white;
  background: var(--fill-color);
  border-color: var(--fill-color);
  border-radius: 4px 4px 0 0;
  font-weight: inherit;
}
.slider-content {
  background: none  ;
  padding: 0 16px;
  padding-bottom: 30px;
}

.vue-slider-marks:last-child .vue-slider-mark-label {
  top: auto;
  bottom: 100%;
  margin-top: 0;
  margin-bottom: 8px;
}

/* Labels */
.temporal-slider label,
.slider-label {
  font-size: 16px;
  color: #4a4a4a;
  margin-bottom: 10px;
}

/* values */
.slider-label span,
.temporal-inputs span {
  font-family: var(--font-primary), sans-serif;
  font-size:12px;
  color:#979797;
  white-space:nowrap;
}

/* inputs years */
.temporal-inputs input[type="number"].year {

  inset: unset;
  border: none;
  text-shadow: none;

  -moz-appearance: textfield;
  background-color:#F5F5F5;

  max-width:50px;
  min-width:40px;
  flex:0 1 50px;
  padding:2px 0;
  margin:0 15px;

  font-family:"Barlow", sans-serif;
  font-weight:500;
  font-size:14px;
  color:#979797;

  text-transform:uppercase;
  text-align:center;
}

.temporal-inputs input[type="number"].year:focus {
  outline:solid 2px #b9192f;
}

/* Arrow removal input number */
.temporal-inputs input[type="number"]::-webkit-outer-spin-button,
.temporal-inputs input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance:none;
  margin:0;
}

/* layout */
.temporal-inputs {
  display:flex;
  align-items:center;
  flex-wrap:nowrap;
  gap:.5rem;
  margin-bottom:1rem;
}

@media screen and (max-width: 1024px) {

  .temporal-inputs {
    gap:10px;
  }

  .temporal-inputs input[type="number"].year {
    margin:0;
  }
}

@media screen and (max-width: 768px) {

  .temporal-inputs {
    gap:8px;
  }

  .temporal-inputs span {
    font-size:11px;
  }
}

@media screen and (max-width: 640px) {

  .temporal-inputs {
    gap:6px;
  }
}

@media screen and (max-width: 900px) and (min-width: 769px) {

  .temporal-inputs {
    display:grid;
    grid-template-columns:auto auto;
    gap:6px 8px;
    align-items:center;
    justify-content:center;
    justify-items:start;
  }

  .temporal-inputs input[type="number"].year {
    margin:0;
    max-width:70px;
    flex:none;
    width:100%;
  }
}

/* Vue slider */
:deep(.vue-slider.vue-slider-ltr) {
  margin-top:15px !important;
  padding:0 10px !important;
  padding-top: 20px !important;
  height:3px !important;
}

:deep(.vue-slider-dot) {
  width:18px !important;
  height:18px !important;
}

:deep(.vue-slider-rail) {
  background-color: #DCDCDC !important;
}

:deep(.vue-slider-dot-handle) {
  border-color:#b9192f !important;
}

:deep(.vue-slider-dot-handle-focus) {
  box-shadow:0 0 0 5px rgba(185,25,47,.2);
}

:deep(.vue-slider-marks .vue-slider-mark:first-child .vue-slider-mark-label) {
  top: auto;
  bottom: 100%;
  margin-top: 0;
  margin-bottom: 8px;
}

:deep(.vue-slider-marks .vue-slider-mark:last-child .vue-slider-mark-label) {
  top: auto;
  bottom: 100%;
  margin-top: 0;
  margin-bottom: 8px;
}
:deep(.has-many-marks .vue-slider-marks .vue-slider-mark:nth-child(2) .vue-slider-mark-label) {
 margin-left: -10px;
}
:deep(.has-many-marks .vue-slider-marks .vue-slider-mark:nth-child(3) .vue-slider-mark-label) {
 margin-left: 10px;
}

:deep(.vue-slider-mark-step-active) {
  box-shadow: 0 0 0 2px #e8e8e8 !important;
}

/* ==================================================
   SLIDER PROCESS
   ================================================== */
:deep(.vue-slider-process) {
  border-radius: 0 !important;
}

/* ==================================================
   Date range covered by results on current facets outside of current selection
   effectiveAvailableMin → sélection.min
   sélection.max → effectiveAvailableMax

   Visualisation in dotted line.
   ================================================== */

:deep(.vue-slider-process.process-potential) {
  background: repeating-linear-gradient(
    to right,
    #b9192f 0,
    #b9192f 6px,
    transparent 6px,
    transparent 10px
  ) !important;

  height: 2px !important;
}

/* ==================================================
   CURRENT USER SELECTION
   ================================================== */

:deep(.vue-slider-process.process-selection) {
  background: #b9192f !important;

  height: 4px !important;
}

/* ==================================================
   INTERSECTION
   Date range covered by all results

   Thicker and added after others in customProcess() :
   visually above current selected range
   ================================================== */

:deep(.vue-slider-process.process-intersection) {
  background: #f59e0b !important;
  height: 6px !important;
  z-index: 3 !important;
}


/* Safari iOS zooms in when focusing a field whose font drops below 16px,
   and never zooms back out. Raise it, on iOS only. */
@supports (-webkit-text-size-adjust: none) and (font: -apple-system-body) and (-webkit-touch-callout: none) {
  .temporal-inputs input[type="number"].year {
    font-size: 16px;
  }
}

</style>