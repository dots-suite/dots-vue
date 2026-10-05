<template>
  <div
    class="collection-list"
    :class="{
      'root-collection-list': collectionId === rootCollectionId,
      'has-banner': hasBanner,
      [`banner-${bannerType}`]: true,
      'has-image': hasImage,
      [`image-${imageType}`]: true
    }"
  >
    <div class="tiles">
      <div
        class="tile page-header"
        :style="collectionBanner"
      >
        <div class="is-flex is-flex-direction-row wrapper collection-header app-width-margin">
          <div class="tile article">
            <div class="title-tile">
              <p class="title">
                {{ collectionAltTitle?.length > 0 ? collectionAltTitle : currCollection.title }}
              </p>
            </div>
            <div
              v-if="showAbout && aboutBttnTxt"
              class="project-tile"
            >
              <div
                class="about-button"
                @click="toggleAbout"
              >
                <span class="about-button-text">{{ aboutBttnTxt }}</span>
                <DirectionalChevron :direction="isAboutOpened ? 'up' : 'down'" />
              </div>
              <!--<router-link
                v-if="collectionId !== rootCollectionId"
                :to="{ name: 'About', params: { collId: collectionId } }"
                active-class="active"
              >
                {{ aboutBttnTxt }}
              </router-link>
              <router-link
                v-else
                :to="{ name: 'About'}"
                active-class="active"
              >
                {{ aboutBttnTxt }}
              </router-link>-->
            </div>
          </div>
          <div class="collection-image">
            <div class="collection-image-wrapper" v-if="bannerType !== 'collection'">
              <!-- component -->
              <component
                v-if="imageType === 'component'"
                :is="image.component"
                class="collection-component"
              />

              <!-- image -->
              <img
                v-else-if="hasImage"
                :src="imgUrl"
                alt=""
              />

              <!--<img
                :src="imgUrl"
                alt=""
              />
              <img
                v-else
                src="@/assets/images/dots-logo-retro.drawio.svg"
                alt=""
              />-->
            </div>
          </div>
        </div>
      </div>
    </div>
    <transition v-if="showAbout" name="fade-slide">
      <section
        v-if="isAboutOpened"
        class="main collection-about app-width-margin"
      >
        <!-- homePageSettings.descriptionSection.customCollectionDescription, use it and pass DTS description and homePageSettings.descriptionSection.collectionDescription settings if available -->
        <div class="home-article-wrapper">
          <div
            v-if="customDescription"
            id="home-article"
            class="article"
          >
            <component
              :is="customDescription"
              :dts-collection-description="currCollection.description"
              :custom-collection-description="collectionDescription"
              :application-root-url="normalisedBaseUrl(appRootUrl)"
            />
            <!-- <p class="texte no-dts-description">This collection provides no DTS default description.</p> -->
          </div>
          <!-- no homePageSettings.descriptionSection.customCollectionDescription : use DTS API collection description if available -->
          <div
            v-else-if="currCollection.description"
            id="home-article"
            class="article app-width-margin"
          >
            <!--<h1>La collection</h1>-->
            {{ currCollection.description }}
          </div>
          <!-- no homePageSettings.descriptionSection.customCollectionDescription & no DTS description : use user settings description (homePageSettings.collectionDescription) -->
          <div
            v-else-if="collectionDescription"
            id="home-article"
            class="article app-width-margin"
          >
            <h1>La collection</h1>
            {{ collectionDescription }}
            <!-- <p class="texte no-dts-description">This collection provides no DTS default description.</p> -->
          </div>
          <router-link
            v-if="hasAbout && collectionId !== rootCollectionId"
            :to="{ name: 'About', params: { collId: collectionId } }"
            active-class="active"
          >
            En savoir plus
          </router-link>
          <router-link
            v-else-if="hasAbout"
            :to="{ name: 'About'}"
            active-class="active"
          >
            En savoir plus
          </router-link>
        </div>
      </section>
    </transition>
  </div>

  <!-- SLOT AFTER HEADER
  <slot name="after-header" /> -->
</template>
<script>
import { computed, ref, shallowRef, defineAsyncComponent, watch } from 'vue'
import DirectionalChevron from '@/assets/images/DirectionalChevron.vue'

export default {
  name: 'CollectionHeader',
  components: { DirectionalChevron },

  props: {
    showAbout: Boolean,
    collectionConfig: Object,
    applicationConfig: Object,
    currentCollection: Object,
    collectionIdentifier: String,
    rootCollectionIdentifier: String
  },

  setup (props) {

    const collConfig = computed(() => props.collectionConfig)
    const appConfig = computed(() => props.applicationConfig)
    const currCollection = computed(() => props.currentCollection)

    const collectionId = computed(() => props.collectionIdentifier)
    const rootCollectionId = computed(() => props.rootCollectionIdentifier)

    const isAboutOpened = ref(false)
    watch(
      () => [collectionId.value, collConfig.value?.homePageSettings?.pageHeader?.aboutOpenState],
      ([, aboutOpenState]) => {
        isAboutOpened.value = aboutOpenState === true
      },
      { immediate: true }
    )

    const appRootUrl = ref(`${import.meta.env.VITE_APP_APP_ROOT_URL}`)
    const normalisedBaseUrl = (baseURL) => {
      return baseURL.replace(/\/+$/, '') + '/'
    }

    const hasNonEmptyObject = arr => Array.isArray(arr) && arr.some(obj => obj && Object.keys(obj).length > 0)
    const hasAbout = computed(() => hasNonEmptyObject(props.collectionConfig.aboutPageSettings))

    const toggleAbout = () => {
      isAboutOpened.value = !isAboutOpened.value
    }

    const collectionAltTitle = computed(() =>
      collConfig.value.homePageSettings?.pageHeader?.collectionAltTitle
    )

    const aboutBttnTxt = computed(() =>
      collConfig.value.homePageSettings?.pageHeader?.aboutButtonText
    )

    const collectionDescription = computed(() =>
      collConfig.value.homePageSettings?.descriptionSection?.collectionDescription
    )

    const customCollectionDescription = computed(() =>
      collConfig.value.homePageSettings?.descriptionSection?.customCollectionDescription
    )

    const customDescription = shallowRef(null)

    const getCustomHomeDescription = async () => {
      let component
      const comps = Object.fromEntries(Object.entries(import.meta.glob('confs/**/*.vue')).map(([key, value]) => {
        // remove first / if exists
        const newKey = key.replace(import.meta.env.VITE_APP_CUSTOM_SETTINGS_PATH, '').replace(/^\//, '')
        return [newKey, value]
      }))

      const defaultSettings = import.meta.glob('../settings/default/HomePageContent.vue', { eager: true })
      comps['../settings/default/HomePageContent.vue'] = defaultSettings['../settings/default/HomePageContent.vue']

      const match = comps[`${collConfig.value.collectionId}/${customCollectionDescription.value.compName}.vue`]
      const matchRootCollection = comps[`${rootCollectionId.value}/${customCollectionDescription.value.compName}.vue`]
      const defaultCollection = comps['../settings/default/HomePageContent.vue']

      if (match) {
        component = defineAsyncComponent(() => import(`confs/${collConfig.value.collectionId}/${customCollectionDescription.value.compName}.vue`)
          .then((comp) => {
            return comp
          })
          .catch((error) => {
            console.error(`error loading 1 confs/${collConfig.value.collectionId}/${customCollectionDescription.value.compName}.vue : `, error)
          })
        )
      } else if (matchRootCollection) {
        component = defineAsyncComponent(() => import(`confs/${rootCollectionId.value}/${customCollectionDescription.value.compName}.vue`)
          .then((comp) => {
            return comp
          })
          .catch((error) => {
            console.error(`error loading 2 confs/${rootCollectionId.value}/${customCollectionDescription.value.compName}.vue : `, error)
          })
        )
      // matching About pages as default
      // TODO : replace tabName by the default tabNames if incorrectly set
      } else if (defaultCollection) {
        component = defineAsyncComponent(() => import('../settings/default/HomePageContent.vue')
          .then((comp) => {
            return comp
          })
          .catch((error) => {
            console.error('error loading \'../settings/default/HomePageContent.vue\' : ', error)
          })
        )
      } else {
        component = null
      }
      return component
    }

    // IMAGES

    /* COLLECTION BANNER */
    const banner = computed(() => getBanner())
    const bannerUrl = computed(() => banner.value.url)
    const hasBanner = computed(() => !!banner.value.url)
    const bannerType = computed(() => banner.value.type)

    const collectionBanner = computed(() => {
      if (!bannerUrl.value) return {}

      return {
        backgroundImage: `url(${bannerUrl.value})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    })

    const getBanner = () => {
      // Load image candidates
      const images = Object.fromEntries(
        Object.entries(
          import.meta.glob([
            'confs/*/assets/images/*.*',
            '/src/assets/images/*.*'
          ], { eager: true })
        ).map(([key, value]) => {
          const newKey = key.split('/').slice(-4).join('/')
          return [newKey, value]
        })
      )
      // Current collection banner name ?
      const collectionBanner = collConfig.value.homePageSettings?.pageHeader?.collectionBannerImg
      // Default banner name ?
      const defaultBannerName = appConfig.value?.genericConf?.homePageSettings?.pageHeader?.collectionBannerImg

      // If collection banner name is default name
      if (collectionBanner === defaultBannerName) {

        // Default images (Dots-vue app or custom folder)
        const defaultCustMatch = images[`default/assets/images/${defaultBannerName}`]
        const defaultAppMatch = images[`src/assets/images/${defaultBannerName}`]

        // Generic banner (custom settings default folder)
        if (defaultCustMatch) {
          return {
            url: defaultCustMatch.default,
            type: 'default'
          }
        }

        // Fallback src/assets
        if (defaultAppMatch) {
          return {
            url: defaultAppMatch.default,
            type: 'default'
          }
        }
      }
      // Not a default banner : find a matching banner
      else if (collectionBanner && collectionBanner.length > 0) {
        // External URL
        if (collectionBanner.startsWith('http')) {
          return {
            url: collectionBanner,
            type: 'collection'
          }
        }
        // Local collection image
        const match = images[`${collConfig.value.collectionId}/assets/images/${collectionBanner}`]
        if (match) {
          return {
            url: match.default,
            type: 'collection'
          }
        }
      }
      // No banner found
      return {
        url: null,
        type: 'none'
      }
    }

    /* COLLECTION IMAGE */
    const image = computed(() => getImg())
    const imgUrl = computed(() => image.value.url)
    const hasImage = computed(() => !!image.value.url)
    const imageType = computed(() => image.value.type)

    const isVueComponent = (val) => typeof val === 'object' && (val.render || val.setup)

    const resolveModule = (mod, type) => {
      if (!mod) return null

      const value = mod.default

      // Vue component
      if (isVueComponent(value)) {
        return {
          component: value,
          type: 'component'
        }
      }

      // Regular image
      return {
        url: value,
        type
      }
    }

    const getImg = () => {
      // TODO: provide a logo object with url AND legend ?
      // Load image candidates
      const images = Object.fromEntries(
        Object.entries(
          import.meta.glob([
            'confs/*/assets/images/*.*',
            '/src/assets/images/*.*'
          ], { eager: true })
        ).map(([key, value]) => {
          const newKey = key.split('/').slice(-4).join('/')
          return [newKey, value]
        })
      )
      // Current collection image name ?
      const collectionImg = collConfig.value.homePageSettings?.listSection?.logo
      // Default image name ?
      const defaultImgName = appConfig.value?.genericConf?.homePageSettings?.listSection?.logo

      // If collection image name is default name
      if (collectionImg === defaultImgName) {

        // Default images (Dots-vue app or custom folder)
        const defaultCustMatch = images[`default/assets/images/${defaultImgName}`]
        const defaultAppMatch = images[`src/assets/images/${defaultImgName}`]

        // Generic image (custom settings default folder)
        const resolved =
          resolveModule(defaultCustMatch, 'default') ||
          resolveModule(defaultAppMatch, 'default')

        if (resolved) return resolved
      }
      // Not a default image : find a matching image
      else if (collectionImg && collectionImg.length > 0) {
        // External URL
        if (collectionImg.startsWith('http')) {
          return {
            url: collectionImg,
            type: 'collection'
          }
        }
        // Local collection image
        const match = images[`${collConfig.value.collectionId}/assets/images/${collectionImg}`]

        const resolved = resolveModule(match, 'collection')
        if (resolved) return resolved
      }
      // No image found
      return {
        url: null,
        type: 'none'
      }
    }

    watch(
  () => customCollectionDescription.value,
  async (newVal) => {
    if (!newVal) {
      customDescription.value = null
      return
    }

    try {
      customDescription.value = await getCustomHomeDescription()
    } catch (e) {
      console.error('Erreur chargement description:', e)
      customDescription.value = null
    }
  },
  { immediate: true }
)

    return {
      appRootUrl,
      normalisedBaseUrl,
      currCollection,
      collectionId,
      rootCollectionId,
      hasAbout,
      isAboutOpened,
      toggleAbout,
      collectionAltTitle,
      aboutBttnTxt,
      collectionDescription,
      customCollectionDescription,
      customDescription,
      hasBanner,
      bannerType,
      collectionBanner,
      hasImage,
      image,
      imageType,
      imgUrl
    }
  }
}
</script>
<style scoped>
.collection-list {
  --first-column-width: 70%;
  /*margin-bottom: 60px;*/
}

/*.collection-list.is-about-opened {
  --first-column-width: 70%;
  margin-bottom: 0;
}*/

/* ===== ABOUT / ARTICLE ===== */

.home-article-wrapper {
  padding: 40px 10% 120px;
  border-bottom: 1px dotted #ffffff;
}

.home-article-wrapper {
  width: calc(var(--first-column-width));
  margin: 0 0 30px !important;
  padding: 45px !important;
  background-color: var(--default-bg-color);
}

#home-article.article {
  margin-bottom: 20px;
}

#home-article.article + a {
  color: var(--fill-color);
}

#home-article.article + a:hover {
  text-decoration: underline;
}

#home-article article {
  margin: 0;
}

#home-article h1 {
  margin: 0;
  padding-top: 20px;
  padding-bottom: 20px;

  font-family: var(--font-primary), sans-serif;
  font-size: 48px;
  font-weight: 700;
  line-height: 1.2;
  text-transform: none;
  color: #000;
}

/* ===== STRUCTURE ===== */

.wrapper {
  width: 100%;
}

.collection-list.has-image:not(.has-banner) .page-header .wrapper {
  background: #FFFFFF;
  gap: 4px;
}

.page-header .wrapper > .tile {
  padding: 25px 45px;
}

.collection-list.has-banner .page-header .wrapper > .tile {
  background: #0f0f0f85;
}

.collection-list:not(.has-banner) .page-header .wrapper > .tile {
  background: #0f0f0f;
}

/* ===== IMAGE ===== */

.collection-image {
  width: calc(100% - var(--first-column-width));
  height: 300px;
}

.collection-image-wrapper {
  width: 100%;
  height: 100%;
}

.banner-default.has-image .collection-component,
.banner-default.has-image .collection-image {
  border-bottom-right-radius: 52px;
  background-color: #FBF8F4;
}

.collection-list.root-collection-list .collection-image,
.collection-list:not(.root-collection-list) .tile.page-header {
  background: transparent;
}

.collection-list.banner-none.has-image .collection-image,
.collection-list.banner-default.has-image .collection-image {
  display: flex;
  align-items: center;
  justify-content: center;
}

.collection-list.banner-none.has-image .collection-image > .collection-image-wrapper > img,
.collection-list.banner-none.has-image .collection-image .collection-component,
.collection-list.banner-default.has-image .collection-image > .collection-image-wrapper > img,
.collection-list.banner-default.has-image .collection-image .collection-component {
  display: block;
  width: 100% !important;
  height: 100% !important;
  object-fit: cover;
  object-position: center;
  border-bottom-right-radius: 52px;
  color: var(--fill-color);
  background-color: var(--fill-color);
}

.collection-list.banner-none.image-component .collection-image,
.collection-list.banner-default.image-component .collection-image {
  display: flex;
  align-items: center;
  justify-content: center;
}

.collection-list.banner-none.image-component .collection-image > .collection-image-wrapper > img,
.collection-list.banner-none.image-component .collection-image .collection-component,
.collection-list.banner-default.image-component .collection-image > .collection-image-wrapper > img,
.collection-list.banner-default.image-component .collection-image .collection-component {
  display: block;
  width: 100% !important;
  height: 100% !important;
  object-fit: cover;
  object-position: center;
  border-bottom-right-radius: 52px;
  color: var(--fill-color);
  background-color: var(--fill-color);
}

/* ===== TEXT / HEADER ===== */

.tile.article,
.tile.app-width-margin {
  position: relative;
  width: 100%;
}

.title-tile {
  display: flex;
  flex-direction: row;
  justify-content: center;
  width: 100%;
  border-radius: 6px;
}

.title-tile > p {
  color: white !important;
}

/* ===== ABOUT BUTTON ===== */

.project-tile {
  position: absolute;
  bottom: 0;
  left: 45px;
  z-index: 2;
  display: flex;
  width: fit-content;
  background-color: var(--fill-color);
  transform: translateY(50%);
}

.about-button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;

  padding: 6px 10px;
  font-family: var(--font-secondary), sans-serif;
  font-weight: 400;
  font-size: 16px;
  text-transform: uppercase;
  color: white;
  cursor: pointer;
}

.about-button:hover {
  background-color: #000000;
}

/* ===== TRANSITION ===== */

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.4s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
}

.collection-about {
  min-height: 30px;
}

/* ===== RESPONSIVE ===== */

@media screen and (max-width: 768px) {
  .grid {
    grid-template-columns: 1fr;
  }
  .collection-list {
    --first-column-width: 100%;
  }
  .collection-about {
    background-color: var(--default-bg-color);
  }

  .collection-list:not(.root-collection-list) .page-header .wrapper {
    gap: 0;
  }

  .collection-header.app-width-margin {
    padding: 0;
    gap: 0 !important;
  }

  .collection-header.app-width-margin :deep(.home-content.app-width-padding) {
    padding: 0;
  }

  .tile.article, .tile.app-width-margin {
    width: var(--first-column-width);
    flex : auto;
  }
}

@media screen and (max-width: 640px) {
  .page-header .wrapper > .tile {
    padding: 25px var(--mobile-margin);
  }

  .project-tile {
    left: calc( 2 * var(--mobile-margin));
  }

  #home-article.article {
    padding: 12px var(--mobile-margin) 10px !important;
    margin-bottom: 0;
  }

  .home-article-wrapper {
    padding: 15px 0 !important;
  }

  #home-article h1 {
    padding: 15px 0 10px;
    font-size: 30px;
  }

  #home-article.article + a {
    padding: 0 var(--mobile-margin);
  }

}
</style>