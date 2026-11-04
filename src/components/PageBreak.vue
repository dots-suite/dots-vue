<template>
  <aside class="dots-ui media pb-component">
    <article class="pb">
      <div class="pb-label">
        <a :href="imageInfo" />
      </div>
      <div class="pb-thumbnail-parent">
        <button
          class="pb-thumbnail"
          type="button"
          aria-label="Afficher l'image"
          @click.prevent="goToCanvas($event)"
        />
      </div>
    </article>
  </aside>
</template>

<script>
import {inject, nextTick} from 'vue'

export default {
  name: 'PageBreak',

  props: ['manifestId', 'canvasId', 'canvasNum', 'firstCanvasId', 'image'],

  setup (props) {
    const mirador = inject('mirador')
    const layout = inject('variable-layout')

    const goToCanvas = function (event) {
      if (mirador) {

        // Thumbnail y-position and scroll before mode change
        const imageThumbnail = event.target;
        const imageThumbnailY = imageThumbnail.getBoundingClientRect().top;
        const textScrollBefore = window.scrollY;

        const currentCanvasId = Object.values(mirador.miradorStore.getState().windows)[0].canvasId
        if (currentCanvasId === props.canvasId && layout.getViewMode() !== 'text-mode') {
          layout.changeViewMode('init')
          mirador.setCanvasId(props.firstCanvasId)
        } else {

          mirador.showCanvas(props.manifestId, props.canvasId)
          // if (layout.miradorVisible != true) {
          // layout.setMiradorVisible(true);
          if (layout.getViewMode() === 'text-mode') {
            layout.changeViewMode('images-mode')
          }
          // }
        }

        // Thumbnail y-position and scroll after mode change
        nextTick(function () {
          const textScrollAfter = textScrollBefore + (imageThumbnail.getBoundingClientRect().top - imageThumbnailY);
          window.scrollTo({
            top: textScrollAfter,
            behavior: 'instant'
          })
        });

      }
    }

    const imageInfo = `${props.image.replace('/full/full/0/default.jpg', '')}`

    return {
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
