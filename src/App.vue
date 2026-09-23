<template>
  <!-- Shown until the shell is mounted. -->
<!--  <div-->
<!--    v-if="appState === 'loading' && !(Object.keys(collConfig).length > 0 && collConfigReady)"-->
<!--    class="app-state app-state&#45;&#45;loading"-->
<!--  >-->
<!--    <div-->
<!--      class="app-state__illustration"-->
<!--      aria-hidden="true"-->
<!--    >-->
<!--      📚-->
<!--    </div>-->
<!--    <p class="app-state__title">-->
<!--      Chargement…-->
<!--    </p>-->
<!--  </div>-->

  <div
    v-if="Object.keys(collConfig).length > 0 && collConfigReady"
    class="layout-grid-container"
  >
    <!-- Safari iOS teinte sa barre d'etat avec la couleur qu'il
         echantillonne en haut de la page. Il ignore a la fois
         <meta name=theme-color> et les pseudo-elements : il faut un
         vrai element, mesure a l appui. -->
    <div
      v-if="needsTopTint"
      class="top-tint"
      aria-hidden="true"
    />
    <app-navbar
      class="layout-navbar"
      :key="currCollection"
      :class="routeNameCssClass"
      :is-doc-project-id-included="isDocProjectIdInc"
      :app-state="appState"
      :dts-root-collection-identifier="dtsRootCollectionId"
      :root-collection-identifier="rootCollectionIdentifier"
      :application-config="appConfig"
      :root-collection-config="rootCollConfig"
      :project-collection-config="projectCollConfig"
      :collection-config="collConfig"
      :collection-breadcrumb="breadCrumb"
      :collection-identifier="collectionId"
    />
    <suspense>
      <router-view
        :key="currCollection"
        class="layout-main"
        :app-state="appState"
        :app-error="appError"
        :is-doc-project-id-included="isDocProjectIdInc"
        :dts-root-collection-identifier="dtsRootCollectionId"
        :root-collection-identifier="rootCollectionIdentifier"
        :application-config="appConfig"
        :root-collection-config="rootCollConfig"
        :collection-config="collConfig"
        :collection-identifier="collectionId"
        :current-collection="currCollection"
      />
    </suspense>
    <div class="scroll-top-wrapper app-width-margin">
      <div
        v-show="scrollTopIsVisible"
        class="scroll-top"
        :class="scrollTopIsVisible ? 'is-available' : ''"
        @click.prevent="scrollToTop"
      >
        <button
          type="button"
          class="dots-button"
          aria-label="Retour en haut"
        >
          <DirectionArrows
            :size="40"
            :radius="4"
            direction="up"
          />
        </button>
      </div>
    </div>
    <app-footer
      :key="currCollection"
      class="layout-footer"
      :root-collection-identifier="rootCollectionIdentifier"
      :collection-identifier="collectionId"
      :footer-settings="collConfig.footerSettings"
      :current-collection="currCollection"
    /><!--  v-bind="collConfig.footerSettings" not working : props missing -->
  </div>
</template>

<script>
import { onBeforeUnmount, onMounted, ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from 'vuex'
import { router } from '@/router'
import _ from 'lodash'

import AppNavbar from '@/components/AppNavbar'
import AppFooter from '@/components/AppFooter.vue'
import DirectionArrows from '@/assets/images/DirectionArrows.vue'
import fetchMetadata from '@/composables/get-metadata'
import { getMetadataFromApi, getParentFromApi, getProjectFromApi, getAncestors } from '@/api/document'
import { useCustomCss } from '@/composables/utils.js'
import { mergeSettings } from '@/composables/mergeSettings'

export default {
  name: 'App',
  components: {
    DirectionArrows,
    AppNavbar,
    AppFooter
  },

  setup () {
    const route = useRoute()
    const store = useStore()
    const isInitializing = ref(true)
    const pendingCollectionId = ref(null)
    const collConfigReady = ref(false)

    // 'loading' | 'ready' | 'error'. On 'error' the DTS service itself is
    // unreachable, so redirecting to Home would hit the same failure.
    const appState = ref('loading')
    const appError = ref(null)

    const currCollection = ref({})
    const customCss = ref({})
    const scrollTopIsVisible = ref(false)
    const scrollTopOpacity = ref(0)

    const onScroll = () => {
      const scrollTopVisibleWhenScroll = window.screen.height * 0.75;
      scrollTopIsVisible.value = window.scrollY > scrollTopVisibleWhenScroll;

      if (window.scrollY < scrollTopVisibleWhenScroll) {
        scrollTopOpacity.value = 0.0;
      }
      else if (window.scrollY > scrollTopVisibleWhenScroll && window.scrollY < scrollTopVisibleWhenScroll + 100) {
        scrollTopOpacity.value = Math.abs (window.scrollY - scrollTopVisibleWhenScroll) / 100;
      } else {
        scrollTopOpacity.value = 1.0;
      }
    }

    const scrollToTop = () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      })
    }

    const dtsRootCollectionId = ref('')
    const rootCollectionIdentifier = ref(`${import.meta.env.VITE_APP_ROOT_DTS_COLLECTION_ID}`)
    const projectCollId = ref('')
    const collectionId = ref('')

    const routeNameCssClass = computed( () => {
      const routeDisplayName = route?.name.toLowerCase() === 'custompage' ? route?.params?.customPage.toLowerCase() : route.name.toLowerCase()
      return routeDisplayName
    })

    // The two routes whose navbar stays in the flow, leaving nothing
    // coloured at the top once scrolled. Search is a CustomPage, so
    // routeNameCssClass holds its customPage param, hence 'search'.
    const needsTopTint = computed(
      () => ['document', 'search'].includes(routeNameCssClass.value)
    )

    const appConfig = ref({})
    const rootCollConfig = ref({})
    const projectCollConfig = ref({})
    const collConfig = ref({})
    const breadCrumb = ref([])
    const isDocProjectIdInc = `${import.meta.env.VITE_APP_DOCUMENT_ROUTE_INCLUDE_PROJECT_ID}`.toLowerCase() === 'true'
    // getting and formatting collection details

    useCustomCss(customCss)

    const setDtsRootResponse = async (route) => {
      const dtsRootResponse = await getMetadataFromApi(null, null, route)
      dtsRootCollectionId.value = dtsRootResponse.identifier
    }

    const getBreadcrumb = async () => {
      const ancestors = await getAncestors(currCollection.value)
      breadCrumb.value = ancestors.map((collections) => {
        const collection = collections[0]
        const collConfig = appConfig.value.collectionsConf.find((config) => { return config.collectionId === collection.identifier })
        const label = collConfig?.homePageSettings?.appNavBar?.collectionShortTitle || collection.identifier
        return { [collection.identifier]: label }
      })
    }

    // Downstream code calls member/children unguarded. Empty but valid, with
    // no placeholder title: a fake one would surface as content, not a fault.
    const emptyMetadata = (identifier) => ({
      identifier,
      member: [],
      children: [],
      dublinCore: {},
      totalParents: 0,
      totalChildren: 0
    })

    // Config comes from local files, only data needs the API. Resolving it
    // separately keeps navbar and footer up when the service is down.
    const resolveConfigWithoutData = async (collId) => {
      await mergeSettings(appConfig)

      const generic = appConfig.value.genericConf
      const overrides = appConfig.value.collectionsConf?.find(
        coll => coll.collectionId === collId
      ) || appConfig.value.collectionsConf?.find(
        coll => coll.collectionId === 'rootCollection'
      )

      rootCollConfig.value = overrides
        ? mergeConfig({}, generic, overrides)
        : generic
      projectCollConfig.value = rootCollConfig.value
      collConfig.value = rootCollConfig.value
      // Views read currentCollection.member unguarded; the ref default {} is
      // truthy and would crash them.
      currCollection.value = emptyMetadata(collId)
      collConfigReady.value = true
    }

    const setCurrentCollectionContext = async (route) => {
      await mergeSettings(appConfig)
      let metadataResponse = {}
      let defaultConf = appConfig.value.genericConf
      const matchedCollectionConf = appConfig.value.collectionsConf && appConfig.value.collectionsConf.filter(coll => coll.collectionId === collectionId.value).length > 0 ? appConfig.value.collectionsConf.find(coll => coll.collectionId === collectionId.value) : defaultConf
      try {
        if (rootCollectionIdentifier.value === dtsRootCollectionId.value && rootCollectionIdentifier.value === collectionId.value) {
          metadataResponse = await fetchMetadata('app.vue setCurrentCollectionContext fetchMetadata (no id)', null, 'Collection', matchedCollectionConf, route)
        } else {
          metadataResponse = await fetchMetadata('app.vue setCurrentCollectionContext fetchMetadata (with id)', collectionId.value, 'Collection', matchedCollectionConf, route)
        }
      } catch (error) {
        // A status means the service answered: the id is wrong, so let the
        // caller redirect to Home. Only a transport failure is an outage,
        // and there the shell still renders -- config is local, data is not.
        if (error.status) {
          throw error
        }

        console.error('App.vue setCurrentCollectionContext fetchMetadata failed', error)
        appError.value = error
        appState.value = 'error'
        metadataResponse = emptyMetadata(collectionId.value)
      }



      if (matchedCollectionConf && matchedCollectionConf.excludeCollectionIds && matchedCollectionConf.excludeCollectionIds.length > 0) {
        metadataResponse.member = metadataResponse.member.filter(m => !matchedCollectionConf.excludeCollectionIds.includes(m.identifier))
      }

      if (matchedCollectionConf && matchedCollectionConf?.homePageSettings?.listSection?.displayMode) {
        metadataResponse.displayMode = matchedCollectionConf?.homePageSettings?.listSection?.displayMode
      }


      metadataResponse.member.forEach(m => { m.parent = collectionId.value })
      metadataResponse.children.forEach(m => { m.parent = collectionId.value })
      if (metadataResponse.projectIdentifier) {
        metadataResponse.member.forEach(m => { m.projectIdentifier = metadataResponse.projectIdentifier })
        metadataResponse.children.forEach(m => { m.projectIdentifier = metadataResponse.projectIdentifier })
      }

      metadataResponse.member.forEach(m => {
        let childMatchedCollectionConf = appConfig.value.collectionsConf.find(c => c.collectionId === m.identifier)
        if (childMatchedCollectionConf && childMatchedCollectionConf?.homePageSettings?.listSection?.displayMode) {
          m.displayMode = childMatchedCollectionConf?.homePageSettings?.listSection?.displayMode
        }
      })
      metadataResponse.children.forEach(m => {
        let childMatchedCollectionConf = appConfig.value.collectionsConf.find(c => c.collectionId === m.identifier)
        if (childMatchedCollectionConf && childMatchedCollectionConf?.homePageSettings?.listSection?.displayMode) {
          m.displayMode = childMatchedCollectionConf?.homePageSettings?.listSection?.displayMode
        }
      })

      currCollection.value = metadataResponse

      // Get and set the collection project (only if current collection is not top collection)
      if (collectionId.value !== rootCollectionIdentifier.value) {
        projectCollId.value = await getProjectFromApi(collectionId.value)
        store.commit('setProjectId', projectCollId.value)
        await getBreadcrumb(collectionId.value)
      } else {
        projectCollId.value = ''
        store.commit('setProjectId', rootCollectionIdentifier.value)
        breadCrumb.value = []
      }
    }

    // Kept for the browsers that honour theme-color, Chrome on Android
    // among them; Safari 26 ignores it. --fill-color is per collection,
    // set by the custom CSS, so read it back after each injection
    // rather than hardcoding a colour.
    const syncThemeColor = () => {
      const fill = getComputedStyle(document.documentElement)
        .getPropertyValue('--fill-color')
        .trim()

      if (!fill) return

      let meta = document.querySelector('meta[name="theme-color"]')
      if (!meta) {
        meta = document.createElement('meta')
        meta.name = 'theme-color'
        document.head.appendChild(meta)
      }
      meta.content = fill
    }

    const getCustomCss = async () => {
      if (collConfig.value.collectionCustomCss) {
        const appCssConfs = Object.fromEntries(Object.entries(import.meta.glob('confs/**/*.customCss.css', { eager: false, query: '?raw' })).map(([key, value]) => {
          const newKey = key.split('/').at(-1).replace('.customCss.css', '')
          return [newKey, value]
        }))

        if (collConfig.value.collectionCustomCss && appCssConfs[collConfig.value.collectionCustomCss]) {
          customCss.value = (await appCssConfs[collConfig.value.collectionCustomCss]()).default

          // check if a customCss style tag exists, if not create it
          let el = document.getElementById('customCss')
          if (!el) {
            el = document.createElement('style')
            el.id = 'customCss'
          }
          // Update the CSS content of the customCss style tag
          el.textContent = customCss.value
          // IMPORTANT : appendChild will move the customCss style tag to the end of <head> so it takes precedence
          document.head.appendChild(el)
        }
      } else removeCustomCss()

      syncThemeColor()
    }
    const removeCustomCss = () => {
      const styleTags = [...document.querySelectorAll('style')]
      styleTags.forEach((tag) => {
        if (tag.id === 'customCss') {
          customCss.value = undefined
          tag.remove()
        }
      })
    }

    watch(
      () => store.state.collectionId,
      async (collectionIdFromStore) => {

        // Safeguards
        if (!collectionIdFromStore) return
        if (!dtsRootCollectionId.value || !rootCollectionIdentifier.value) return

        if (isInitializing.value) {
          pendingCollectionId.value = collectionIdFromStore
          return
        }


        collConfigReady.value = false

        try {
          collConfig.value = {}

          collectionId.value = collectionIdFromStore?.length
            ? collectionIdFromStore
            : undefined

          // Setting root, project and collection configs

          await applyCollectionConfig(collectionIdFromStore)

        } finally {
          collConfigReady.value = true
        }
      },
      { immediate: true }
    )

    function mergeConfig(...configs) {
      return _.mergeWith({}, ...configs, (objValue, srcValue) => {
        if (Array.isArray(srcValue)) {
          return _.cloneDeep(srcValue)
        }

        return undefined
      })
    }

    // EXCLUDED COLLECTIONS
    // A collection removed from the front (excludeCollectionIds setting)
    // must not remain accessible through a direct URL.
    // This check cannot live in the router: root collection is discovered through an API call
    // (setDtsRootResponse), so it is unknown to beforeEach on the initial load.
    // Here, rootCollConfig has been resolved and collConfigReady is still false,
    // so nothing is rendered before the redirect.
    //
    // The comparison is case-insensitive as a precaution: the DoTS API is
    // currently case-sensitive -- /encpos returns 400 and falls through to
    // redirectHome() below -- but the exclusion should not depend on this
    // server-side behavior to remain reliable.
    const isExcludedCollection = (collId) => {
      if (!collId) return false

      const excluded = rootCollConfig.value?.excludeCollectionIds ?? []

      return excluded.some(
        id => String(id).toLowerCase() === String(collId).toLowerCase()
      )
    }

    // Sans params : les réinjecter remettrait le collId fautif et bouclerait.
    // replace et non push : l'URL écartée ne doit pas revenir au bouton retour.
    const redirectHome = async (reason) => {
      console.warn('App.vue redirect to Home:', reason)
      await router.replace({ name: 'Home' })
    }

    async function applyCollectionConfig(collectionIdFromStore) {
      collConfigReady.value = false

      try {
        collConfig.value = {}

        collectionId.value = collectionIdFromStore?.length
          ? collectionIdFromStore
          : undefined

        await setCurrentCollectionContext(route)

        // Setting root, project and collection configs

          let rootCollectionOverrides =
            appConfig.value.collectionsConf.find(
              coll => coll.collectionId === rootCollectionIdentifier.value
            )

          if (!rootCollectionOverrides) {
            rootCollectionOverrides =
              appConfig.value.collectionsConf.find(
                coll => coll.collectionId === 'rootCollection'
              )
          }

          rootCollConfig.value = rootCollectionOverrides
            ? mergeConfig({}, appConfig.value.genericConf, rootCollectionOverrides)
            : appConfig.value.genericConf

          if (isExcludedCollection(route.params.collId)) {
            await redirectHome(`collection "${route.params.collId}" is excluded`)
            return
          }


          let projectCollectionOverrides =
            appConfig.value.collectionsConf.find(
              coll => coll.collectionId === projectCollId.value
            )

          if (!projectCollectionOverrides &&
              collectionId.value !== rootCollectionIdentifier.value) {

            projectCollectionOverrides = rootCollConfig.value
            projectCollectionOverrides.collectionId = collectionId.value
            projectCollectionOverrides.homePageSettings.collectionShortTitle = ''
            projectCollectionOverrides.homePageSettings.pageHeader.collectionAltTitle = ''
            projectCollectionOverrides.homePageSettings.pageHeader.aboutButtonText = 'about'
          }

          projectCollConfig.value = mergeConfig({}, rootCollConfig.value, projectCollectionOverrides)

          let collectionOverrides =
            appConfig.value.collectionsConf.find(
              coll => coll.collectionId === collectionId.value
            )

          if (!collectionOverrides &&
              collectionId.value !== rootCollectionIdentifier.value &&
              collectionId.value !== projectCollId.value) {

            collectionOverrides = projectCollConfig.value
          }

          collConfig.value = mergeConfig({}, projectCollConfig.value, collectionOverrides)

          if (collConfig.value.collectionCustomCss) {
            await getCustomCss()
          } else if (customCss.value) {
            removeCustomCss()
          }

          if (!route.params.id) {
            document.title =
              appConfig.value.collectionsConf.find(
                coll => coll.collectionId === collectionIdFromStore
              )?.homePageSettings.appNavBar.collectionShortTitle
              || rootCollConfig.value?.homePageSettings?.appNavBar.collectionShortTitle
          }

      } catch (error) {
        // An unknown or incorrectly cased ID causes /collection?id=… to fail;
        // without this catch, collConfig remains empty, and the page never renders
        // as the template requires collConfig to be non-empty.
        // Do not redirect from the home page itself: the root cannot be resolved
        // either, which would result in a redirect loop.
        if (route.params.collId) {
          await redirectHome(
            `cannot resolve collection "${route.params.collId}": ${error.message}`
          )
        } else {
          console.error('App.vue applyCollectionConfig failed on root collection', error)
        }
      } finally {
        if (appState.value !== 'error') {
          appState.value = 'ready'
        }

        collConfigReady.value = true
      }
    }

    watch(
      () => [route.name, route.params, route.query],
      async (newVal, oldVal) => {
        const [newName, newParams] = newVal
        const [oldName, oldParams] = oldVal || []

        isInitializing.value = true
        try {
          // Do nothing if newRoute and oldRoute are not defined
          if (!newName) {
            return
          }
          if (!oldVal) {
            store.commit('setCollectionId', null)
          }
          // Same collection
          if (
            newName === oldName &&
            newParams?.collId === oldParams?.collId &&
            newParams?.id === oldParams?.id
          ) {
            return
          }

          collConfigReady.value = false

          // fill dtsRootCollectionId with ???
          await setDtsRootResponse(route)

          // Portal mode (multi-projects)
          if (isDocProjectIdInc) {
            // Do nothing if routes are the same, collId are the same, and collId is stored. Mark collConfigReady as ready (true)
            if (
              (newName === oldName) &&
              (newParams?.collId === oldParams?.collId) &&
              (store.state.collectionId === collectionId.value)
            ) {
              collConfigReady.value = true
              return
            }

            // store root collection identifier (from serveur or VITE_APP config)
            if (`${import.meta.env.VITE_APP_ROOT_DTS_COLLECTION_ID}`.length === 0) {
              rootCollectionIdentifier.value = dtsRootCollectionId.value
            } else {
              rootCollectionIdentifier.value = `${import.meta.env.VITE_APP_ROOT_DTS_COLLECTION_ID}`
            }
            // Set the current collection
            // from the resource id
            if (newParams.id) {
              const parentResponse = await getParentFromApi(newParams.id)
              const currentCollection = parentResponse?.member.find((member) => {
                if (member['@id'] === store.state.collectionId) {
                  return member
                }
              })?.['@id'] || parentResponse.member[0]['@id']

              collectionId.value = currentCollection
              store.commit('setResourceId', newParams.id)
            //or directly if available
            } else if (newParams.collId) {
              store.commit('setCollectionId', null)
              store.commit('setCurrentItem', {})
              collectionId.value = newParams.collId
            } else {
              store.commit('setCurrentItem', {})
              collectionId.value = rootCollectionIdentifier.value
            }
            store.commit('setCollectionId', collectionId.value)
            // Collection is loaded

          // Single project mode
          } else {
            // Set the app rootCollection
            if (`${import.meta.env.VITE_APP_ROOT_DTS_COLLECTION_ID}`.length === 0) {
              // If there is no user-defined app rootCollection, the rootCollection of the app is the DTS root collection
              rootCollectionIdentifier.value = dtsRootCollectionId.value
            } else {
              // Otherwise use the user defined app rootCollection
              rootCollectionIdentifier.value = `${import.meta.env.VITE_APP_ROOT_DTS_COLLECTION_ID}`
            }
            // Set the current collection
            if (newParams.id) {
              const parentResponse = await getParentFromApi(newParams.id)
              const currentCollection = parentResponse?.member.find((member) => {
                if (member['@id'] === store.state.collectionId) {
                  return member
                }
              })?.['@id'] || parentResponse.member[0]['@id']

              collectionId.value = currentCollection
              store.commit('setResourceId', newParams.id)
            } else if (newParams.collId) {
              store.commit('setCurrentItem', {})
              collectionId.value = newParams.collId
            } else {
              store.commit('setCurrentItem', {})
              collectionId.value = rootCollectionIdentifier.value
            }
            /*if (store.state.collectionId === collectionId.value) {
              console.log('same collectionId on startup: force refresh')

              // Force a logic reset
              store.commit('setCollectionId', null)
            }*/
            store.commit('setCollectionId', collectionId.value)
            // Collection is loaded
          }

          collConfigReady.value = true
        } catch (error) {
          // Root collection unreachable: nowhere to redirect to. Fall back to
          // local config so the shell still renders around the error banner.
          console.error('App.vue route watcher failed', error)
          appError.value = error
          appState.value = 'error'

          try {
            await resolveConfigWithoutData(newParams?.collId)
          } catch (configError) {
            console.error('App.vue offline config resolution failed', configError)
          }
        } finally {
          isInitializing.value = false
        }
        if (pendingCollectionId.value) {
          const pendingCollIdValue = pendingCollectionId.value
          pendingCollectionId.value = null

          await applyCollectionConfig(pendingCollIdValue)
        }

      },
      { immediate: true }
    )

    watch(() => scrollTopOpacity.value,(opacity) => {
        if (! scrollTopIsVisible.value) return;

        const footer = document.querySelector('.layout-footer')
        const btn = document.querySelector('.scroll-top')
        if (!footer || !btn) return

        const BASE_BOTTOM = 20;
        const observer = new IntersectionObserver(() => {
            btn.style.bottom = `${ BASE_BOTTOM * opacity }px`
            btn.style.opacity = opacity;
          },{
            // progressive thresholds for smooth animation
            threshold: Array.from({ length: 30 }, (_, i) => i / 30)
          }
        )
        observer.observe(footer)
      },{ immediate: true }
    )

    onMounted(() => {
      syncThemeColor()
      window.addEventListener('scroll', onScroll)
    })

    onBeforeUnmount(() => {
      window.removeEventListener('scroll', onScroll)
    })

    return {
      collConfigReady,
      appState,
      appError,
      dtsRootCollectionId,
      rootCollectionIdentifier,
      isDocProjectIdInc,
      collectionId,
      currCollection,
      appConfig,
      rootCollConfig,
      projectCollConfig,
      collConfig,
      routeNameCssClass,
      needsTopTint,
      breadCrumb,
      scrollTopIsVisible,
      scrollToTop
    }
  }
}
</script>
