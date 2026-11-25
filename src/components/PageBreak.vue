<template>
  <!-- No manifest has its image: the original element of the text, kept inside -->
  <slot v-if="state === 'absent'" />
  <aside
    v-else
    class="dots-ui media pb-component"
    :class="`is-${state}`"
  >
    <article class="pb">
      <div class="pb-label">
        <a :href="imageInfo" />
      </div>
      <div
        class="pb-thumbnail-parent"
        :title="state === 'error' ? 'Source IIIF temporairement indisponible' : null"
      >
        <button
          class="pb-thumbnail"
          type="button"
          :disabled="state !== 'ready'"
          :aria-busy="state === 'pending'"
          :aria-label="{ pending: 'Image en cours de chargement', error: 'Source IIIF temporairement indisponible' }[state] ?? 'Afficher l\'image'"
          @click.prevent="goToCanvas($event)"
        />
        <!-- Its manifest loads: the loading disc of the images button -->
        <span
          v-if="state === 'pending'"
          class="pb-thumbnail-progress"
          aria-hidden="true"
        />
        <!-- Its manifest failed: the exclamation mark of the images button -->
        <svg
          v-else-if="state === 'error'"
          class="pb-thumbnail-error"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <!-- A bold exclamation mark in the collection colour, haloed in white to stay legible over the icon -->
          <path
            d="M12 4v10M12 20v.01"
            stroke="#fff"
            stroke-width="7.5"
            stroke-linecap="round"
          />
          <path
            d="M12 4v10M12 20v.01"
            stroke="currentColor"
            stroke-width="4.5"
            stroke-linecap="round"
          />
        </svg>
      </div>
    </article>
  </aside>
</template>

<script>
import { computed, inject, nextTick, ref } from 'vue'
import { findFacsimile, getManifestId } from '@/composables/iiif-manifest'

export default {
  name: 'PageBreak',

  props: {
    // Set when the document is built with its manifests (TEI): the page break is ready
    manifestId: { type: String, default: '' },
    canvasId: { type: String, default: '' },
    canvasNum: { type: [String, Number], default: 1 },
    firstCanvasId: { type: String, default: '' },
    image: { type: String, default: '' },
    // Otherwise (HTML), the manifest named by the facsimile (data-manifest), followed
    // in DocumentPage's manifestsByUrl; without it, every manifest of the item is searched
    manifestUrl: { type: String, default: '' }
  },

  setup (props) {
    const mirador = inject('mirador', null)
    const layout = inject('variable-layout', null)
    const manifestsByUrl = inject('manifests-by-url', ref({}))

    const isStatic = Boolean(props.manifestId)

    // ready (its canvas found), pending (a manifest that may have it still loads),
    // error (its manifest failed, none of the others has it) or absent (no manifest has it)
    const resolved = computed(() => {
      if (isStatic) {
        return { state: 'ready', facsimile: props }
      }
      const entries = Object.entries(manifestsByUrl.value)
      const loaded = entries
        .filter(([, { status }]) => status === 'ready')
        .map(([url, { data }]) => ({ url, data }))
      const facsimile = findFacsimile(loaded, props.image, props.manifestUrl)
      if (facsimile) {
        const manifest = loaded.find(({ data }) => getManifestId(data) === facsimile.manifestId)?.data
        return { state: 'ready', facsimile, manifest }
      }

      const own = props.manifestUrl ? manifestsByUrl.value[props.manifestUrl] : null
      const othersLoading = entries.some(([, { status }]) => status === 'loading')
      if (own?.status === 'loading') return { state: 'pending' }
      // Named manifest failed or unknown: findFacsimile searches the others, which may still come
      if (othersLoading && (!props.manifestUrl || own?.status === 'error')) return { state: 'pending' }
      if (own?.status === 'error') return { state: 'error' }
      return { state: 'absent' }
    })
    const state = computed(() => resolved.value.state)

    const goToCanvas = function (event) {
      if (state.value !== 'ready' || !mirador) return
      const { manifestId, canvasId, firstCanvasId } = resolved.value.facsimile
      // Mirador may not hold it yet: DocumentPage gives it the manifests once all are settled
      if (resolved.value.manifest) mirador.receiveManifests?.([resolved.value.manifest])

      // Thumbnail y-position and scroll before mode change
      const imageThumbnail = event.target
      const imageThumbnailY = imageThumbnail.getBoundingClientRect().top
      const textScrollBefore = window.scrollY

      const currentCanvasId = Object.values(mirador.miradorStore.getState().windows)[0]?.canvasId
      if (currentCanvasId === canvasId && layout.getViewMode() !== 'text-mode') {
        layout.changeViewMode('init')
        mirador.setCanvasId(firstCanvasId)
      } else {
        mirador.showCanvas(manifestId, canvasId)
        if (layout.getViewMode() === 'text-mode') {
          layout.changeViewMode('images-mode')
        }
      }

      // Thumbnail y-position and scroll after mode change
      nextTick(function () {
        const textScrollAfter = textScrollBefore + (imageThumbnail.getBoundingClientRect().top - imageThumbnailY)
        window.scrollTo({
          top: textScrollAfter,
          behavior: 'instant'
        })
      })
    }

    const imageInfo = `${props.image.replace('/full/full/0/default.jpg', '')}`

    return {
      state,
      goToCanvas,
      imageInfo
    }
  }
}
</script>

<style>
.pb-component {
  position: relative;
  float: left;
}
.pb-component:hover {
  cursor: pointer;
}
.pb-component .pb {
  position: absolute;
  left: -72px;
}
/* Only the icon shows: no image is requested from the IIIF server for it */
.pb-thumbnail {
  display: block;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
}
.pb-thumbnail-parent {
  content: "";
  display: block;
  width: 60px;
  height: 30px;
  background: url(../assets/images/icone-media.svg) top center / 24px auto no-repeat;
  margin-top: -8px;
}
.pb-label {
  position: relative;
  z-index: 2;
  font-size: large;
  text-align: center;
  margin-top: 16px;
  margin-bottom: 16px;
}

/* In a document, the icon sits in the left margin of the text: out of the flow,
   so it neither moves with the words of its line nor makes that line taller */
#article .pb-component {
  position: absolute;
  left: calc(-16px - .5rem);
  display: inline-block;
  float: none;
  margin: 0;
  line-height: 1;
  text-indent: 0;
  font-style: normal;
}
#article .pb-component .pb {
  position: static;
  display: flex;
  width: auto;
  height: auto;
  min-height: 0;
  margin: 0;
  padding: 0;
}
#article li.witness > .pb-component .pb {
  display: inline-block;
}
#article .pb-component .pb-label {
  display: none;
}
#article .pb-component .pb-thumbnail-parent {
  position: relative;
  display: inline-block;
  width: 16px;
  height: 20px;
  margin: 0;
  background-position: center;
  background-size: contain;
  filter: brightness(.45);
}
#article .pb-component:hover .pb-thumbnail-parent {
  filter: none;
}
#article .pb-component .pb-thumbnail {
  position: absolute;
  inset: 0;
}

/* Waiting for the manifest: the faded icon under the loading disc of the images button */
.pb-component.is-pending,
.pb-component.is-pending .pb-thumbnail {
  cursor: default;
}
.pb-component.is-pending .pb-thumbnail-parent,
.pb-component.is-error .pb-thumbnail-parent {
  position: relative;
  background-image: none;
}
.pb-component.is-pending .pb-thumbnail-parent::before,
.pb-component.is-error .pb-thumbnail-parent::before {
  content: "";
  position: absolute;
  inset: 0;
  background: url(../assets/images/icone-media.svg) top center / 24px auto no-repeat;
  opacity: .35;
}
#article .pb-component.is-pending .pb-thumbnail-parent::before,
#article .pb-component.is-error .pb-thumbnail-parent::before {
  background-position: center;
  background-size: contain;
}
/* Its manifest failed: the faded icon under the exclamation mark of the images button */
.pb-component.is-error,
.pb-component.is-error .pb-thumbnail {
  cursor: default;
}
/* The disc and the exclamation mark keep their colours: the icon alone is darkened, as in the margin */
#article .pb-component.is-pending .pb-thumbnail-parent,
#article .pb-component.is-error .pb-thumbnail-parent {
  filter: none;
}
#article .pb-component.is-pending .pb-thumbnail-parent::before,
#article .pb-component.is-error .pb-thumbnail-parent::before {
  filter: brightness(.45);
}
/* Loading disc and exclamation mark, centred on the drawing of icone-media.svg: in its 24 x 30 box,
   the page spans x 0-23 and y 0-29, so its centre is (11.5, 14.5), not the centre of the box.
   Out of the text, the 24px icon sits at the top centre of its box */
.pb-thumbnail-error,
.pb-thumbnail-progress {
  position: absolute;
  top: 14.5px;
  left: calc(50% - .5px);
  transform: translate(-50%, -50%);
  pointer-events: none;
}
#article .pb-component .pb-thumbnail-error,
#article .pb-component .pb-thumbnail-progress {
  top: calc(100% * 14.5 / 30);
  left: calc(100% * 11.5 / 24);
}
.pb-thumbnail-error {
  width: 14px;
  height: 14px;
  color: var(--fill-color);
}
.pb-thumbnail-progress {
  display: block;
  width: 14px;
  height: 14px;
}
.pb-thumbnail-progress::before {
  content: "";
  display: block;
  width: 14px;
  aspect-ratio: 1;
  box-sizing: border-box;
  border: 1.5px solid currentColor;
  border-radius: 50%;
  background: conic-gradient(currentColor var(--loading-progress), transparent 0) content-box;
  padding: 1.5px;
  color: var(--fill-color);
  animation: loading-fill 2.4s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .pb-thumbnail-progress::before {
    animation-duration: 6s;
  }
}

/* In a table, it is vertically centred on its row */
#article tr:has(.pb-component) {
  position: relative;
}
#article td .pb-component {
  top: 50%;
  transform: translateY(-50%);
}

/* In a witness, it stays at the end of its line */
#article li.witness > .pb-component {
  position: static;
  margin-left: .4em;
  vertical-align: middle;
  line-height: 0;
}

/* In an index entry, it sits in front of the bullet */
#article li[id]:has(> .pb-component) {
  position: relative;
}
#article li[id]:not(.witness) > .pb-component {
  top: 0;
  right: 100%;
  left: auto;
  margin-right: 1.6em;
}
</style>
