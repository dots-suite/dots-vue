import { onUnmounted, ref } from 'vue'
import Mirador from 'mirador'
import { miradorImageToolsPlugin } from 'mirador-image-tools'
import { getCanvases, getManifestId } from '@/composables/iiif-manifest'

export default function useMirador(container) {
  const _windowId = 'document'

  // Désabonnement du watcher d'erreurs, réarmé à chaque initialize()
  let unsubscribeErrors = null

  const baseConfig = {
    windows: [],
    window: {
      allowClose: false,
      allowMaximize: false,
      defaultSideBarPanel: 'info',
      sideBarOpenByDefault: false,
      hideWindowTitle: true,
      maximizedByDefault: true
    },
    // OpenSeadragon 6 draws with WebGL by default: the image vanishes when rotated
    osdConfig: { drawer: 'canvas' },
    selectedTheme: 'light',
    themes: {
      light: {
        palette: {
          mode: 'light',
          primary: { main: '#971716' },
          secondary: { main: '#B9192F' }
        }
      }
    },
    workspace: {
      showZoomControls: true,
      type: 'mosaic'
    },
    workspaceControlPanel: {
      enabled: false
    }
  }

  // An image shown in the window failed to load (its info.json): the manifest is there,
  // the image server is not. DocumentPage shows a message over the viewer.
  const imageError = ref(false)

  const instance = {
    imageError,
    retryImages,
    initialize,
    loadManifest,
    receiveManifests,
    loadCollectionManifest,
    setCanvasId,
    showCanvas,
    resetView,
    dispatchAction,
    reactRoot: null,
    miradorStore: null
  }

  function initialize() {

    if (!container.value) {
      console.warn('mirador initialize: no container')
      return
    }

    if (instance.reactRoot) {
      instance.reactRoot.unmount()
      instance.reactRoot = null
      instance.miradorStore = null
    }

    if (unsubscribeErrors) {
      unsubscribeErrors()
      unsubscribeErrors = null
    }

    const config = { ...baseConfig, id: container.value.id }
    instance.reactRoot = Mirador.viewer(config, { plugins: [...miradorImageToolsPlugin] })
    instance.miradorStore = instance.reactRoot.store
    watchErrors()
    const fillColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--fill-color')
      .trim()

    if (fillColor) {
      updateThemeColor(fillColor)
    }

    // Résoudre la promise après que React ait rendu une première fois
    return new Promise(resolve => setTimeout(resolve, 0))
  }

  // Mirador signale tout échec de requête IIIF (info.json injoignable, serveur
  // d'images en erreur, en-tête CORS manquant) en poussant une entrée dans
  // state.errors, que son composant ErrorDialog affiche en modale avec le
  // message brut du navigateur : « An error occurred / TypeError: NetworkError
  // when attempting to fetch resource ». Le lecteur ne peut rien en faire et la
  // modale bloque la page.
  //
  // On retire donc l'erreur du store dès son arrivée : l'abonné s'exécutant
  // pendant le dispatch, la modale n'a pas le temps de s'ouvrir. L'échec reste
  // consultable en console. Le désabonnement suit le cycle de vie du store.
  function watchErrors() {
    if (!instance.miradorStore) return

    // Erreurs déjà traitées tant que la file n'est pas vidée : garde-fou contre
    // la réentrance, `dispatch` depuis un abonné rappelant les abonnés.
    const handled = new Set()

    // Recomputed only when what it depends on changes: the subscriber runs on every dispatch
    let watched = []
    let watchedVisible = null
    const updateImageError = (state) => {
      const window = state.windows?.[_windowId]
      const manifest = window && state.manifests?.[window.manifestId]?.json
      const next = [state.infoResponses, window, manifest]
      if (next.every((item, index) => item === watched[index])) return
      watched = next

      const visibleIds = visibleServiceIds(state)
      imageError.value = visibleIds.some((id) => state.infoResponses?.[id]?.error)

      // Other canvases shown: the failures of those left are forgotten, so that coming back asks again
      const visibleKey = visibleIds.join()
      if (visibleKey !== watchedVisible) {
        watchedVisible = visibleKey
        forgetFailedImages(visibleIds)
      }
    }

    unsubscribeErrors = instance.miradorStore.subscribe(() => {
      updateImageError(instance.miradorStore.getState())
      const { errors } = instance.miradorStore.getState()
      const ids = errors?.items ?? []

      if (!ids.length) {
        handled.clear()
        return
      }

      const fresh = ids.filter(id => !handled.has(id))
      if (!fresh.length) return

      fresh.forEach(id => handled.add(id))

      fresh.forEach(id => {
        console.warn('use-mirador IIIF request failed: ', id, String(errors[id]?.message ?? ''))
        instance.miradorStore.dispatch(Mirador.actions.removeError(id))
      })
    })
  }

  const trimmed = (id) => id?.replace(/\/$/, '')

  // Image services (info.json ids) of the canvases shown in the window
  function visibleServiceIds(state) {
    const window = state.windows?.[_windowId]
    const manifest = window && state.manifests?.[window.manifestId]?.json
    if (!manifest) return []
    const visible = window.visibleCanvases?.length ? window.visibleCanvases : [window.canvasId]
    return getCanvases(manifest)
      .filter(({ id, serviceId }) => serviceId && visible.includes(id))
      .map(({ serviceId }) => trimmed(serviceId))
  }

  // Mirador asks for an image (info.json) only when it holds no response for it, a failed one
  // included: forgetting a failure lets the next display of its canvas ask again.
  // Not a retry: Mirador asks again only when the reader shows the canvas again.
  function forgetFailedImages(kept = []) {
    const { infoResponses = {} } = instance.miradorStore?.getState() ?? {}
    Object.entries(infoResponses)
      .filter(([id, response]) => response?.error && !kept.includes(id))
      .forEach(([id]) => dispatchAction(Mirador.actions.removeInfoResponse(id)))
  }

  // The viewer shown again (images mode): its canvas asks again for an image that failed
  function retryImages() {
    const state = instance.miradorStore?.getState()
    const window = state?.windows?.[_windowId]
    if (!window) return
    const failed = visibleServiceIds(state).filter((id) => state.infoResponses?.[id]?.error)
    if (!failed.length) return
    forgetFailedImages()
    dispatchAction(Mirador.actions.setCanvas(_windowId, window.canvasId))
  }

  function updateThemeColor(color) {
    dispatchAction(Mirador.actions.updateConfig({
      themes: {
        light: {
          palette: {
            mode: 'light',
            primary: {
              main: color
            },
            secondary: {
              main: color
            }
          }
        }
      }
    }))
  }

  function resetView() {
    // Not rendered yet in a window just opened, which shows the whole image anyway
    container.value?.querySelector('button[aria-label="Reset zoom"]')?.click()
  }

  function loadCollectionManifest(collectionObject) {

    if (!instance.miradorStore) {
      console.warn(
        'use-mirador loadCollectionManifest: store not initialized'
      )
      return
    }

    if (!collectionObject?.id) {
      console.warn(
        'use-mirador invalid collection id',
        collectionObject
      )
      return
    }

    const stateBefore = instance.miradorStore.getState()


    if (stateBefore.windows[_windowId]) {
      dispatchAction(Mirador.actions.removeWindow(_windowId))
    }
    // TODO needs IIIF Collection corrections to work (works with https://endp-87e252.gitpages.huma-num.fr/collection/endp_collection.json)
    dispatchAction(
      Mirador.actions.addWindow({
        imageToolsEnabled: true,
        imageToolsOpen: false,
        id: _windowId,
        manifestId: collectionObject.id,
        collectionPath: collectionObject.id
      })
    )


    resetView()
  }

  // Mirador reads seeAlso as objects, and turns the URLs of a v2 manifest (Gallica) into empty links
  function withSeeAlsoObjects(manifest) {
    if (!manifest.seeAlso) return manifest

    const seeAlso = [manifest.seeAlso].flat().map(item => typeof item === 'string' ? { '@id': item } : item)

    return { ...manifest, seeAlso }
  }

  // Manifests already fetched: Mirador does not request those it holds
  function receiveManifests(manifests) {
    const held = instance.miradorStore?.getState().manifests ?? {}

    for (const manifest of manifests) {
      const manifestId = getManifestId(manifest)

      if (!held[manifestId]?.json) {
        dispatchAction(Mirador.actions.receiveManifest(manifestId, withSeeAlsoObjects(manifest)))
      }
    }
  }

  function loadManifest(manifestObject, canvasId) {

    if (!instance.miradorStore) {
      console.warn('use-mirador loadManifest: store not initialized')
      return
    }

    const manifestId = getManifestId(manifestObject)

    if (!manifestId) {
      console.warn('use-mirador invalid manifest id', manifestObject)
      return
    }

    forgetFailedImages()
    const stateBefore = instance.miradorStore.getState()


    if (stateBefore.windows[_windowId]) {
      dispatchAction(Mirador.actions.removeWindow(_windowId))
    }

    dispatchAction(
      Mirador.actions.addWindow({
        imageToolsEnabled: true,
        imageToolsOpen: false,
        id: _windowId,
        manifestId,
        canvasId: canvasId
      })
    )


    resetView()
  }

  function dispatchAction(action) {
    if (instance.miradorStore) {
      instance.miradorStore.dispatch(action)
    }
  }

  function setCanvasId(canvasId) {
    forgetFailedImages()
    dispatchAction(Mirador.actions.setCanvas(_windowId, canvasId))
    resetView()
  }

  // Une ressource peut avoir plusieurs manifestes : ouvre celui du canvas si besoin
  function showCanvas(manifestId, canvasId) {
    const openedManifestId = instance.miradorStore?.getState().windows[_windowId]?.manifestId

    if (openedManifestId === manifestId) {
      setCanvasId(canvasId)
    } else {
      loadManifest({ id: manifestId }, canvasId)
    }
  }

  onUnmounted(() => {
    if (unsubscribeErrors) {
      unsubscribeErrors()
      unsubscribeErrors = null
    }
    if (instance.reactRoot) {
      instance.reactRoot.unmount()
      instance.reactRoot = null
    }
    instance.miradorStore = null
  })

  return instance
}