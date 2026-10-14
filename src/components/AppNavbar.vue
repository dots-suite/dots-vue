<template>
  <section>
    <nav
      class="level app-width-padding"
      :class="menuCssClass"
    >
      <div class="level-left">
        <a
          v-if="imgHref !== '/'"
          :href="imgHref"
          target="_blank"
        >
          <img
            v-if="imgUrl"
            class="logo-header"
            :src="imgUrl"
          />
        </a>
        <router-link
          v-else
          class="logo-header"
          active-class="active"
          :to="{ name: 'Home' }"
        >
          <img
            v-if="imgUrl"
            class="logo-header"
            :src="imgUrl"
          >
        </router-link>
        <span class="level-item">
          <router-link
            active-class="active"
            class="level-item-external"
            :to="{ name: 'Home' }"
          >{{ rootShortTitle ? rootShortTitle : rootCollectionId }}
          </router-link>
          <template
            v-for="(item, index) in breadCrumb.slice().reverse()"
            :key="index"
          >
            <router-link
              v-if="index === 0 && isDocProjectIdIncluded"
              class="level-item-external"
              active-class="active"
              :to="{ name: 'Home', params: {collId: Object.keys(item)[0]} }"
            >
              {{ Object.values(item)[0] }}
            </router-link>
            <!-- Without the project id in routes there is no per-collection
                 home page: the label stays, the link would lead to the root -->
            <span
              v-else-if="index === 0"
              class="level-item-external"
            >
              {{ Object.values(item)[0] }}
            </span>
          </template>
        </span>
      </div>
      <!-- Outside .level-right so it stays in the bar on mobile, next to the burger -->
      <button
        v-if="searchRoute && !isSearchPage"
        type="button"
        class="search-link"
        title="Rechercher"
        aria-label="Rechercher"
        :aria-expanded="isSearchOpened"
        @click.stop="isSearchOpened = !isSearchOpened"
      >
        <span
          class="search-icon"
          aria-hidden="true"
        />
      </button>
      <div class="level-right">
        <div class="level-item menu">
          <a
            v-if="apiImgUrl"
            target="_blank"
            :href="apiImgHref"
          >
            <img
              class="logo-api"
              :src="apiImgUrl"
              alt="Logo API"
            />
          </a>
          <a
            v-else
            target="_blank"
            href="https://dots-suite.github.io/dots_documentation/api/"
          >
            API <b>{ }</b>
          </a>
        </div>
      </div>
    </nav>
    <!-- Beside the nav, not in it: positioning the nav to hold it would put
         it, and its burger menu, over the burger button and under the
         document page's sticky breadcrumb -->
    <NavbarSearch
      v-if="searchRoute && !isSearchPage && isSearchOpened"
      :search-route="searchRoute"
      :collection-name="searchCollectionName"
      @close="isSearchOpened = false"
    />
    <div class="mobile-button">
      <Burger-button
        :opened="isMenuOpened"
        @change="burgerChanged"
      />
    </div>
  </section>
</template>
<script>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import BurgerButton from './Burger.vue'
import NavbarSearch from './NavbarSearch.vue'
import { useRoute } from 'vue-router'
import defaultLogo from '@/assets/images/logo_dots_circle.svg'
import { getSearchRoute } from '@/composables/search-page'

export default {
  name: 'AppNavbar',
  components: { BurgerButton, NavbarSearch },
  props: {
    isDocProjectIdIncluded: {
      type: Boolean,
      required: true
    },
    appState: {
      type: String,
      default: 'ready'
    },
    dtsRootCollectionIdentifier: {
      type: String,
      required: true
    },
    rootCollectionIdentifier: {
      type: String,
      required: true
    },
    collectionBreadcrumb: {
      type: Object,
      required: true
    },
    applicationConfig: {
      type: Object,
      required: true
    },
    rootCollectionConfig: {
      type: Object,
      required: true
    },
    projectCollectionConfig: {
      type: Object,
      required: false
    },
    collectionConfig: {
      type: Object,
      required: true
    },
    collectionIdentifier: {
      type: String,
      required: true
    }
  },

  setup (props) {
    const isMenuOpened = ref(false)
    const dtsRootCollectionId = ref(props.dtsRootCollectionIdentifier)
    const rootCollectionId = ref(props.rootCollectionIdentifier)
    const appConfig = ref(props.applicationConfig)
    const rootCollConfig = ref(props.rootCollectionConfig)
    const collConfig = ref(props.collectionConfig)
    const imgHref = ref('')
    const imgUrl = ref(undefined)
    const apiImgHref = ref('')
    const apiImgUrl = ref(undefined)
    const rootShortTitle = ref(props.rootCollectionConfig.homePageSettings.appNavBar.collectionShortTitle)
    // const collShortTitle = ref(props.collectionConfig.homePageSettings.appNavBar.collectionShortTitle)
    const breadCrumb = ref(props.collectionBreadcrumb)
    const collectionId = ref(props.collectionIdentifier)
    // Replaced by breadcrumb :

    // Computed property
    const menuCssClass = computed(() => {
      return isMenuOpened.value ? 'is-opened' : ''
    })

    // The search page is declared on the project, the collections inside it
    // inherit it
    const searchRoute = computed(() => getSearchRoute([
      collectionId.value,
      collConfig.value?.collectionId,
      props.projectCollectionConfig?.collectionId
    ]))

    // Search banner opened from the magnifier, over the navbar
    const isSearchOpened = ref(false)

    // The search page has its own bar: no magnifier there
    const route = useRoute()
    const isSearchPage = computed(() =>
      route.name === 'CustomPage' && route.params.customPage?.toLowerCase() === 'search'
    )
    watch(isSearchPage, (onSearchPage) => {
      if (onSearchPage) isSearchOpened.value = false
    })


    // Name of the searched collection as the breadcrumb shows it
    const searchCollectionName = computed(() => {
      const collId = searchRoute.value?.params.collId
      if (!collId) return ''
      const crumb = breadCrumb.value.find(item => Object.keys(item)[0] === collId)
      if (crumb) return Object.values(crumb)[0]
      if (collId === rootCollectionId.value && rootShortTitle.value) return rootShortTitle.value
      return collConfig.value?.homePageSettings?.appNavBar?.collectionShortTitle || collId
    })

    // Methods
    const burgerChanged = (event) => {
      isMenuOpened.value = event.isOpened
    }

    const closeMenu = () => {
      isMenuOpened.value = false
    }

    // Ferme le menu mobile déplié dès qu'on scrolle : une fois que la
    // barre de recherche (sticky, z-index supérieur) a pris le relais
    // visuel sur la navbar (sticky elle aussi, mais en dessous), le menu
    // déplié n'a plus de place cohérente où s'afficher — il continuait
    // sinon à dépasser par endroits, par-dessus le contenu de la page.
    // Le fermer au scroll évite complètement le problème (comportement
    // habituel des menus mobiles) plutôt que de chercher à le repositionner.
    const closeMenuOnScroll = () => {
      if (isMenuOpened.value) {
        closeMenu()
      }
    }

    const setImgUrl = () => {
      // TODO: provide a logo object with url AND legend ?

      const sourceConfig = collConfig.value
      if (sourceConfig && sourceConfig.homePageSettings && Object.keys(sourceConfig.homePageSettings).includes('appNavBar')
          && sourceConfig.homePageSettings.appNavBar && Object.keys(sourceConfig.homePageSettings.appNavBar).includes('appNavBarLogo')
          && sourceConfig.homePageSettings.appNavBar.appNavBarLogo.imgName.length
        ) {
        // Get all images from the settings repo
        const images = Object.fromEntries(Object.entries(import.meta.glob('confs/*/assets/images/*.*', { eager: true })).map(([key, value]) => {
          const newKey = key.split('/').slice(-4).join('/')
          return [newKey, value]
        }))

        // If the AppNavBar image is not defined on the collection, need to identify the root collection image path where it may be defined
        let rootCollImg = null
        // Identify the root collection config to find its AppNavBar image settings
        //const rootCollConfig = appConfig.value.collectionsConf.filter(coll => coll.collectionId === rootCollectionId.value)[0]
        // If an AppNavBar image is set on the root collection, set it as rootCollImg to be used
        if (rootCollConfig.value) {
          rootCollImg = images[`${rootCollectionId.value}/assets/images/${rootCollConfig.value.homePageSettings.appNavBar.appNavBarLogo.imgName}`]
        }
        // Setting the default AppNavBar image (dots) if none is defined at root or collection level
        images.default = defaultLogo

        // Match the collection AppNavBar image if any
        const match = images[`${sourceConfig.collectionId}/assets/images/${sourceConfig.homePageSettings.appNavBar.appNavBarLogo.imgName}`]
        // Use the collection AppNavBar image if any
        if (match) {
          if (sourceConfig.homePageSettings.appNavBar.appNavBarLogo.imgName.includes('https')) {
            imgHref.value = sourceConfig.homePageSettings.appNavBar.appNavBarLogo.href
            imgUrl.value = sourceConfig.homePageSettings.appNavBar.appNavBarLogo.imgName
          } else {
            imgHref.value = sourceConfig.homePageSettings.appNavBar.appNavBarLogo.href
            imgUrl.value = match.default
          }
        // Otherwise use the root collection AppNavBar image if any
        } else if (rootCollImg) {
          if (rootCollConfig.value.homePageSettings.appNavBar.appNavBarLogo.imgName.includes('https')) {
            imgHref.value = rootCollConfig.value.homePageSettings.appNavBar.appNavBarLogo.href
            imgUrl.value = rootCollConfig.value.homePageSettings.appNavBar.appNavBarLogo.imgName
          } else {
            imgHref.value = rootCollConfig.value.homePageSettings.appNavBar.appNavBarLogo.href
            imgUrl.value = rootCollImg.default
          }
        // Otherwise use the default (dots) AppNavBar image
        } else {
          if (sourceConfig.homePageSettings.appNavBar.appNavBarLogo.imgName.includes('https')) {
            imgHref.value = sourceConfig.homePageSettings.appNavBar.appNavBarLogo.href
            imgUrl.value = sourceConfig.homePageSettings.appNavBar.appNavBarLogo.imgName
          } else {
            imgHref.value = sourceConfig.homePageSettings.appNavBar.appNavBarLogo.href
            imgUrl.value = defaultLogo
          }
        }
      }
    }

    const setApiImgUrl = () => {
      // TODO: provide a logo object with url AND legend ?
      const sourceConfig = collConfig.value
      if (sourceConfig && sourceConfig.homePageSettings && Object.keys(sourceConfig.homePageSettings).includes('appNavBar')
          && sourceConfig.homePageSettings.appNavBar && Object.keys(sourceConfig.homePageSettings.appNavBar).includes('appNavBarApiLogo')
          && sourceConfig.homePageSettings.appNavBar.appNavBarApiLogo.imgName.length
      ) {
        // Get all images from the settings repo
        const images = Object.fromEntries(Object.entries(import.meta.glob('confs/*/assets/images/*.*', { eager: true })).map(([key, value]) => {
          const newKey = key.split('/').slice(-4).join('/')
          return [newKey, value]
        }))

        // If the AppNavBar image is not defined on the collection, need to identify the root collection image path where it may be defined
        let rootCollImg = null
        // Identify the root collection config to find its AppNavBar image settings
        //const rootCollConfig = appConfig.value.collectionsConf.filter(coll => coll.collectionId === rootCollectionId.value)[0]
        // If an AppNavBar image is set on the root collection, set it as rootCollImg to be used
        if (rootCollConfig.value) {
          rootCollImg = images[`${rootCollectionId.value}/assets/images/${rootCollConfig.value.homePageSettings.appNavBar.appNavBarApiLogo.imgName}`]
        }
        // Setting the default AppNavBar image (dots) if none is defined at root or collection level
        images.defaultLogo = defaultLogo

        // Match the collection AppNavBar image if any
        const match = images[`${sourceConfig.collectionId}/assets/images/${sourceConfig.homePageSettings.appNavBar.appNavBarApiLogo.imgName}`]
        // Use the collection AppNavBar image if any
        if (match) {
          if (sourceConfig.homePageSettings.appNavBar.appNavBarApiLogo.imgName.includes('https')) {
            apiImgHref.value = sourceConfig.homePageSettings.appNavBar.appNavBarApiLogo.href
            apiImgUrl.value = sourceConfig.homePageSettings.appNavBar.appNavBarApiLogo.imgName
          } else {
            apiImgHref.value = sourceConfig.homePageSettings.appNavBar.appNavBarApiLogo.href
            apiImgUrl.value = match.default
          }
        // Otherwise use the root collection AppNavBar image if any
        } else if (rootCollImg) {
          if (rootCollConfig.value.homePageSettings.appNavBar.appNavBarApiLogo.imgName.includes('https')) {
            apiImgHref.value = rootCollConfig.value.homePageSettings.appNavBar.appNavBarApiLogo.href
            apiImgUrl.value = rootCollConfig.value.homePageSettings.appNavBar.appNavBarApiLogo.imgName
          } else {
            apiImgHref.value = rootCollConfig.value.homePageSettings.appNavBar.appNavBarApiLogo.href
            apiImgUrl.value = rootCollImg.default
          }
        // Otherwise use the default (dots) AppNavBar image
        } else {
          if (sourceConfig.homePageSettings.appNavBar.appNavBarApiLogo.imgName.includes('https')) {
            apiImgHref.value = sourceConfig.homePageSettings.appNavBar.appNavBarApiLogo.href
            apiImgUrl.value = sourceConfig.homePageSettings.appNavBar.appNavBarApiLogo.imgName
          } else {
            apiImgHref.value = sourceConfig.homePageSettings.appNavBar.appNavBarApiLogo.href
            apiImgUrl.value = defaultLogo
          }
        }
      }
    }

    // Lifecycle hooks
    onMounted(() => {
      document.body.addEventListener('click', closeMenu)
      window.addEventListener('scroll', closeMenuOnScroll, { passive: true })
    })

    onBeforeUnmount(() => {
      document.body.removeEventListener('click', closeMenu)
      window.removeEventListener('scroll', closeMenuOnScroll)
    })

    watch(collectionId, (newCollectionId) => {
      // Degraded mode has no collection id, so fall back to what these two
      // actually read -- they ignore the id they are passed. Nominal path
      // keeps the original guard.
      const ready = props.appState === 'error'
        ? collConfig.value?.homePageSettings?.appNavBar
        : newCollectionId

      if (ready) {
        setImgUrl()
        setApiImgUrl()
      }
    }, { immediate: true })

    watch(props, (newProps) => {
      dtsRootCollectionId.value = newProps.dtsRootCollectionIdentifier
      rootCollectionId.value = newProps.rootCollectionIdentifier
      appConfig.value = newProps.applicationConfig
      rootCollConfig.value = newProps.rootCollectionConfig
      collConfig.value = newProps.collectionConfig
      rootShortTitle.value = newProps.rootCollectionConfig.homePageSettings.appNavBar.collectionShortTitle
      // Replaced by breadcrumb :
      // collShortTitle.value = newProps.collectionConfig.homePageSettings.appNavBar.collectionShortTitle
      breadCrumb.value = newProps.collectionBreadcrumb
      collectionId.value = newProps.collectionIdentifier
    }, { deep: true, immediate: true })

    // Expose properties and methods to the template
    return {
      isMenuOpened,
      menuCssClass,
      rootCollectionId,
      rootShortTitle,
      breadCrumb,
      burgerChanged,
      imgUrl,
      imgHref,
      apiImgUrl,
      apiImgHref,
      searchRoute,
      isSearchPage,
      isSearchOpened,
      searchCollectionName
    }
  }
}
</script>

<style scoped>
/* Holds the search banner, right below. Where the navbar is fixed
   (main.css .layout-navbar), that more specific rule keeps it fixed. */
section {
  position: relative;
}
nav {
  font-size: 26px;
  line-height: 1.2;
  color: #FFFFFF;
  /* background-color: #8f0e21; */
  background-color: var(--fill-color);
  padding-top: 10px;
  padding-bottom: 10px;
  z-index: 21;
}
a {
  color: inherit;
  font-family: inherit;
  background-color: transparent !important;
}
a:hover {
  text-decoration: var(--text-decoration-hover);
  color: #FFFFFF;
}
.active {
  color: #FFFFFF;
  text-decoration: none;
}
.level {
  width: 100%;
  margin-bottom: 0 !important;
  box-sizing: border-box;
}
nav  {
  display: flex;
  margin-top: 0;
  z-index: 10; /* cf documentation menu */

  /*position: fixed;
  top:0;*/

  width: 100%;
  padding-left: calc((100% - var(--default-content-width)) / 2);
  padding-right: calc((100% - var(--default-content-width)) / 2);
}

nav span.level-item:not(:last-child)::after {
  content: '|';
  display: inline-block;
  color: #000;
  padding-left: .75rem;
}
.logo-header {
  display: inline-block;
  width: 55px;
  height: 50px;
  margin-left: 2px;
  margin-right: 70px;
  & > img {
    width: 100%;
    height: 50px;
  }
}
.logo-api {
  display: inline-block;
  width: 40px;
  height: 40px;
  margin:0;
}
.level-left {
  display: flex;
  /* Takes what the right side (search, API) leaves */
  flex: 1 1 0;
  min-width: 0;
  gap: 20px;

  font-family: var(--font-primary),sans-serif;

  & > span.level-item {
    align-items: center;
    white-space: nowrap;
  }

  & > span > a {
    font-size: 20px;
    font-weight: 700;
    line-height: 1;
    text-transform: capitalize;

    /* &.level-item-external:not(:last-child)::after {
      content: " > ";
      white-space: pre;
    }*/

    &.level-item-external:nth-child(2) {
      position: relative;
      margin-left: 30px;
      padding-left: 30px;
      font-size: 20px;
      font-weight: 500;
      line-height: 1;

      &::before {
        content: "";
        position: absolute;
        left: 0;
        top:50%;
        transform: translateY(-50%);
        display: inline-block;
        height: 20px;
        border-left: 1px solid white;
      }
    }
  }
}
.level-right {
  display: flex;
  flex: none;
  align-items: center;
  height: 50px !important;
}
/* Same gap from the API button as between the logo and the first title:
   .logo-header margin-right + .level-left gap */
.search-link {
  display: flex;
  flex: none;
  padding: 0;
  border: none;
  background: none;
  color: inherit;
  cursor: pointer;
  align-self: center;
  align-items: center;
  margin-right: calc(70px + 20px);
}
/* Search banner content over the navbar's content width: same padding as
   the nav, at each breakpoint below */
.navbar-search {
  padding-left: calc((100% - var(--default-content-width)) / 2);
  padding-right: calc((100% - var(--default-content-width)) / 2);
}
.search-icon {
  display: block;
  width: 30px;
  height: 30px;
  background-color: currentColor;
  -webkit-mask: url(../assets/images/icone-loupe.svg) center / contain no-repeat;
  mask: url(../assets/images/icone-loupe.svg) center / contain no-repeat;
}
.mobile-button {
  display: none;
}

ul.submenu a:hover {
  text-decoration: underline;
}

.level-item.menu {
  display: flex;
  flex-direction: column;

  & > ul.submenu {
    position: relative;
    top: 5px;
    margin: 0;
    padding: 0;
    border: none;

    display: none;
    opacity: 0;
    transition: opacity ease-in-out 0.25s;
  }

  &:hover {
    & > ul.submenu {
      display: inline-block;
      opacity: 1;
    }
  }
}

@media screen and (max-width: 1320px) {
  nav,
  .navbar-search {
    padding-left: 20px;
    padding-right: 20px;
  }
}
@media screen and (max-width: 1024px) {
  .logo-header {
    margin-right: 15px;
  }
  .search-link {
    margin-right: calc(15px + 20px);
  }
}
@media screen and (max-width: 768px) {
  nav {
    display: flex;
    margin-top: 0;
    z-index: 10; /* cf documentation menu */
    padding-left: 12px;
    padding-right: 12px;

    /*position: fixed;
    top:0;*/
    width: 100vw;
  }
  .navbar-search {
    padding-left: 12px;
    padding-right: 12px;
  }
  .logo-header {
    width: 50px;
    min-width: 45px;
    max-width: unset;
    margin-right: 12px;
  }
  .search-link {
    margin-right: calc(12px + 20px);
  }
  .level-left .level-item:not(:last-child),
  .level-right .level-item:not(:last-child) {
    margin-right: .5rem;
  }
  nav span.level-item:not(:last-child)::after {
    padding-left: .5rem;
  }
  .level-item:not(:last-child) {
    margin-bottom: 0;
  }
  .level-left .level-item {
    white-space: nowrap;
  }
  .level-right {
    margin-top: 0;
  }
}
@media screen and (max-width: 640px) {
  .level {
    display: flex;
    height: 100%;
  }
  .level .level-item {
    flex-direction: row;
    justify-content: flex-start;
    align-items: flex-start;
    gap: 0;
    padding: 20px var(--mobile-margin);

    &:not(.menu) {
      padding-left: 0;
    }

    & > a.level-item-external {
      line-height: 1.2;

      &:not(:first-child) {
        display: block !important;
      }

      &:nth-child(2) {
        margin-left: 15px;
        padding-left: 15px;
      }

      /*&:first-child {
        top: 22px;
        position: fixed;
        left: 63px;
      }*/
      &::after {
        display: none;
      }
    }

  }

  .level-right {
    display: none;
  }

  /* Left of the 30px burger, one mobile margin away from it */
  .search-link {
    margin-left: 10px;
    margin-right: calc(30px + var(--mobile-margin));
  }

  .level-left {
    width: 100%;
    overflow: hidden;
    gap: 10px;
  }

  .level-left .level-item {
    display: flex;
    text-overflow: unset;
    max-width: 100%;
    white-space: normal;
  }

  /* 30x30 burger, centred in the 70px bar */
  .mobile-button {
    position: absolute;
    right: var(--mobile-margin);
    top: 20px;
    z-index: 2;

    display: flex;
    align-items: center;
    width: 30px;
    height: 30px;
    background: var(--fill-color);
  }
  /*.level-left {
    display: block;
    margin-top: 71px;
    border-top:#fcaca9 1px solid;
  }*/
  .level-item {
    padding: 5px 0;
    line-height: 52px;
  }
  .level-right .level-item:last-of-type {
    padding-bottom: 10px;
    padding-top: 10px;
  }
  nav span.level-item[data-v-1fd76d11]:not(:last-child)::after {
    display: none;
  }

  .level.is-opened {
    height: 100%;
    overflow: unset;

    & > a.level-item-external {
      &:not(:first-child) {
        display: block !important;
      }
    }

    .level-right {
      position: fixed;
      right: 0;
      top: 70px;
      z-index: 23;

      display: block;
      padding: 20px 0 10px;
      background: var(--fill-color);
      border-top: rgba(255, 255, 255, 0.5) 1px solid;
      width: 100%;
      height: auto !important;
      box-shadow: 0 8px 5px 0 rgba(0,0,0,0.2);
    }
  }

}

</style>
