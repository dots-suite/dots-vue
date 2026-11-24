<template>
  <!-- Enlarged view of a document figure's images, opened by Document.vue on a click.
       showModal() gives Escape to close, the backdrop and the focus trap.
       Zoom: pinch, double tap / double click, ctrl + wheel (and trackpad pinch), the - / + buttons;
       the zoomed image pans by native scrolling (finger) or by dragging (mouse). -->
  <dialog
    ref="dialog"
    class="image-lightbox"
    aria-label="Image agrandie"
    @click.self="close"
    @keydown.left.prevent="prev"
    @keydown.right.prevent="next"
    @keydown="onZoomKey"
    @close="onClose"
  >
    <template v-if="current">
      <div
        ref="viewport"
        class="image-lightbox-viewport"
        :class="{ 'is-zoomed': isZoomed, 'is-dragging': isDragging }"
        @click.self="close"
        @wheel="onWheel"
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
        @touchcancel="onTouchEnd"
      >
        <img
          ref="image"
          :src="current.src"
          :alt="current.alt"
          class="image-lightbox-image"
          :style="imageStyle"
          draggable="false"
          @load="measureFit"
          @click="onImageClick"
          @pointerdown="onPointerDown"
        >
      </div>
      <p
        v-if="caption && !isZoomed"
        class="image-lightbox-caption"
      >
        {{ caption }}
      </p>
      <div class="image-lightbox-toolbar">
        <div class="image-lightbox-zoom">
          <button
            type="button"
            class="image-lightbox-button"
            aria-label="Dézoomer"
            title="Dézoomer"
            :disabled="!isZoomed"
            @click="zoomBy(1 / ZOOM_STEP)"
          >
            −
          </button>
          <button
            type="button"
            class="image-lightbox-button image-lightbox-zoom-level"
            aria-label="Ajuster à la fenêtre"
            title="Ajuster à la fenêtre"
            :disabled="!isZoomed"
            @click="resetZoom"
          >
            {{ Math.round(scale * 100) }} %
          </button>
          <button
            type="button"
            class="image-lightbox-button"
            aria-label="Zoomer"
            title="Zoomer"
            :disabled="scale >= maxScale"
            @click="zoomBy(ZOOM_STEP)"
          >
            +
          </button>
        </div>
        <div
          v-if="images.length > 1"
          class="image-lightbox-nav"
        >
          <button
            type="button"
            class="image-lightbox-button"
            aria-label="Image précédente"
            title="Image précédente"
            @click="prev"
          >
            ‹
          </button>
          <span class="image-lightbox-counter">{{ index + 1 }} / {{ images.length }}</span>
          <button
            type="button"
            class="image-lightbox-button"
            aria-label="Image suivante"
            title="Image suivante"
            @click="next"
          >
            ›
          </button>
        </div>
      </div>
      <button
        type="button"
        class="image-lightbox-button image-lightbox-close"
        aria-label="Fermer"
        title="Fermer"
        @click="close"
      >
        ×
      </button>
    </template>
  </dialog>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

const ZOOM_STEP = 1.5
const DOUBLE_TAP_MS = 300
// Below the pixel density of the image, zooming further only blurs it; never less than this
const MIN_MAX_SCALE = 3

const dialog = ref(null)
const viewport = ref(null)
const image = ref(null)
// [{ src, alt }]: the images of the clicked figure
const images = ref([])
const index = ref(0)
// The figcaption of the figure, shared by its images
const caption = ref('')

const current = computed(() => images.value[index.value] ?? null)

// scale 1 = the image fitted to the viewport; fitWidth / fitHeight are its size then
const scale = ref(1)
const fitWidth = ref(0)
const fitHeight = ref(0)
const naturalWidth = ref(0)
const isZoomed = computed(() => scale.value > 1.001)
const maxScale = computed(() => {
  if (!fitWidth.value) return MIN_MAX_SCALE
  return Math.max(MIN_MAX_SCALE, naturalWidth.value / fitWidth.value)
})

// Fitted: CSS caps it to the viewport. Zoomed: explicit size, the viewport scrolls.
const imageStyle = computed(() => isZoomed.value
  ? {
      width: `${fitWidth.value * scale.value}px`,
      height: `${fitHeight.value * scale.value}px`,
      maxWidth: 'none',
      maxHeight: 'none'
    }
  : {})

function measureFit () {
  const img = image.value
  if (!img || isZoomed.value) return
  const rect = img.getBoundingClientRect()
  fitWidth.value = rect.width
  fitHeight.value = rect.height
  naturalWidth.value = img.naturalWidth
}

// Zoom around a point of the viewport (clientX, clientY), by default its centre,
// so that the point under the finger or the cursor stays in place
async function zoomTo (newScale, clientX, clientY) {
  const vp = viewport.value
  if (!vp || !fitWidth.value) return
  const target = Math.min(Math.max(newScale, 1), maxScale.value)
  if (target === scale.value) return
  const vpRect = vp.getBoundingClientRect()
  const x = (clientX ?? vpRect.left + vpRect.width / 2) - vpRect.left
  const y = (clientY ?? vpRect.top + vpRect.height / 2) - vpRect.top
  // Point under (x, y), in image pixels at scale 1
  const imgRect = image.value.getBoundingClientRect()
  const px = (vpRect.left + x - imgRect.left) / scale.value
  const py = (vpRect.top + y - imgRect.top) / scale.value

  scale.value = target
  await nextTick()

  // Offset of the image in the scrolled content (auto margins centre it while it is smaller)
  const offsetLeft = image.value.offsetLeft
  const offsetTop = image.value.offsetTop
  vp.scrollLeft = offsetLeft + px * target - x
  vp.scrollTop = offsetTop + py * target - y
}

function zoomBy (factor, clientX, clientY) {
  zoomTo(scale.value * factor, clientX, clientY)
}

function resetZoom () {
  scale.value = 1
  if (viewport.value) {
    viewport.value.scrollLeft = 0
    viewport.value.scrollTop = 0
  }
}

// Double tap / double click toggles between fitted and zoomed on the point
let lastClickTime = 0
let dragMoved = false
function onImageClick (event) {
  if (dragMoved) {
    dragMoved = false
    return
  }
  const now = Date.now()
  if (now - lastClickTime < DOUBLE_TAP_MS) {
    lastClickTime = 0
    if (isZoomed.value) resetZoom()
    else zoomTo(Math.min(ZOOM_STEP * ZOOM_STEP, maxScale.value), event.clientX, event.clientY)
  } else {
    lastClickTime = now
  }
}

// Ctrl + wheel, which is also what a trackpad pinch sends; a plain wheel scrolls
function onWheel (event) {
  if (!event.ctrlKey) return
  event.preventDefault()
  zoomBy(Math.exp(-event.deltaY * 0.01), event.clientX, event.clientY)
}

function onZoomKey (event) {
  if (event.key === '+' || event.key === '=') zoomBy(ZOOM_STEP)
  else if (event.key === '-') zoomBy(1 / ZOOM_STEP)
  else if (event.key === '0') resetZoom()
}

// Pinch: two fingers set the scale; one finger pans by native scrolling
let pinch = null
const touchDistance = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
function onTouchStart (event) {
  if (event.touches.length !== 2) return
  const [a, b] = event.touches
  pinch = { distance: touchDistance(a, b), scale: scale.value }
}
function onTouchMove (event) {
  if (!pinch || event.touches.length !== 2) return
  event.preventDefault()
  const [a, b] = event.touches
  zoomTo(
    pinch.scale * touchDistance(a, b) / pinch.distance,
    (a.clientX + b.clientX) / 2,
    (a.clientY + b.clientY) / 2
  )
}
function onTouchEnd (event) {
  if (event.touches.length < 2) pinch = null
}

// Mouse drag pans the zoomed image (touch pans natively)
const isDragging = ref(false)
let drag = null
function onPointerDown (event) {
  if (event.pointerType !== 'mouse' || event.button !== 0 || !isZoomed.value) return
  event.preventDefault()
  drag = {
    x: event.clientX,
    y: event.clientY,
    scrollLeft: viewport.value.scrollLeft,
    scrollTop: viewport.value.scrollTop
  }
  dragMoved = false
  isDragging.value = true
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
}
function onPointerMove (event) {
  if (!drag) return
  const dx = event.clientX - drag.x
  const dy = event.clientY - drag.y
  if (Math.abs(dx) + Math.abs(dy) > 3) dragMoved = true
  viewport.value.scrollLeft = drag.scrollLeft - dx
  viewport.value.scrollTop = drag.scrollTop - dy
}
function onPointerUp () {
  drag = null
  isDragging.value = false
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
}

// A new image, or a resized window, starts fitted again
watch(index, () => {
  resetZoom()
  fitWidth.value = 0
})
function onResize () {
  resetZoom()
  nextTick(measureFit)
}

function open (figureImages, startIndex = 0, figureCaption = '') {
  images.value = figureImages
  index.value = startIndex
  caption.value = figureCaption
  resetZoom()
  dialog.value?.showModal()
  window.addEventListener('resize', onResize)
  nextTick(measureFit)
}

function close () {
  dialog.value?.close()
}

function onClose () {
  images.value = []
  scale.value = 1
  onPointerUp()
  window.removeEventListener('resize', onResize)
}

// Navigation loops within the figure
function prev () {
  if (images.value.length < 2) return
  index.value = (index.value - 1 + images.value.length) % images.value.length
}

function next () {
  if (images.value.length < 2) return
  index.value = (index.value + 1) % images.value.length
}

onBeforeUnmount(onClose)

defineExpose({ open, close })
</script>

<style scoped>
.image-lightbox {
  max-width: 100vw;
  max-height: 100dvh;
  width: 100vw;
  height: 100dvh;
  margin: 0;
  padding: 56px 16px 16px;
  border: none;
  background: transparent;
  color: #fff;
  box-sizing: border-box;
  overflow: hidden;
}

.image-lightbox[open] {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
}

.image-lightbox::backdrop {
  background: rgb(0 0 0 / 0.85);
}

/* Scrolls the zoomed image; the browser's own pinch zoom is left to the component */
.image-lightbox-viewport {
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: auto;
  overscroll-behavior: contain;
  touch-action: pan-x pan-y;
}

/* Auto margins centre the image while it is smaller than the viewport, without cutting it once larger */
.image-lightbox-image {
  display: block;
  flex: none;
  margin: auto;
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  padding: 0;
  cursor: zoom-in;
  user-select: none;
  -webkit-user-select: none;
}

.image-lightbox-viewport.is-zoomed .image-lightbox-image {
  cursor: grab;
}

.image-lightbox-viewport.is-dragging .image-lightbox-image {
  cursor: grabbing;
}

.image-lightbox-caption {
  flex: none;
  max-width: 70ch;
  max-height: 20vh;
  margin: 0 auto;
  overflow-y: auto;
  font-size: 0.9rem;
  line-height: 1.4;
  text-align: center;
}

.image-lightbox-toolbar {
  flex: none;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 12px 32px;
}

.image-lightbox-zoom,
.image-lightbox-nav {
  display: flex;
  align-items: center;
  gap: 12px;
}

.image-lightbox-counter {
  font-variant-numeric: tabular-nums;
}

.image-lightbox-button {
  min-width: 40px;
  height: 40px;
  padding: 0;
  border: 1px solid rgb(255 255 255 / 0.5);
  border-radius: 20px;
  background: rgb(0 0 0 / 0.4);
  color: #fff;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
}

.image-lightbox-button:hover:not(:disabled),
.image-lightbox-button:focus-visible {
  background: rgb(255 255 255 / 0.2);
}

.image-lightbox-button:disabled {
  opacity: 0.35;
  cursor: default;
}

.image-lightbox-zoom-level {
  min-width: 72px;
  padding: 0 10px;
  font-size: 0.9rem;
  font-variant-numeric: tabular-nums;
}

.image-lightbox-close {
  position: absolute;
  top: 8px;
  right: 16px;
}
</style>
