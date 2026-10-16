<template>
  <aside class="media pb-component">
    <article class="pb">
      <div class="pb-label">
        <a :href="imageInfo" />
      </div>
      <div class="pb-thumbnail-parent">
        <img
          class="pb-thumbnail"
          :src="thumbnail"
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

  props: ['canvasId', 'canvasNum', 'image'],

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
          mirador.setCanvasId(props.canvasId.substring(0, props.canvasId.lastIndexOf('/f') + 1) + 'f1')
        } else {

          mirador.setCanvasId(props.canvasId)
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

    const thumbnail = `${props.image.replace(
      '/full/full/0/default.jpg',
      '/full/60,/0/default.jpg'
    )}`
    const imageInfo = `${props.image.replace('/full/full/0/default.jpg', '')}`

    return {
      goToCanvas,
      thumbnail,
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
.pb-thumbnail {
  max-width: 60px;
}
.pb-thumbnail-parent {
  content: "";
  display: block;
  width: 60px;
  height: 30px;
  background: url(../assets/images/icone-media.svg) top center / 24px auto no-repeat;
  margin-top: -8px;
}
.pb-thumbnail-parent img {
  opacity: 0;
}
.pb-label {
  position: relative;
  z-index: 2;
  font-size: large;
  text-align: center;
  margin-top: 16px;
  margin-bottom: 16px;
}
</style>
