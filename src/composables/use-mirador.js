import { onUnmounted } from 'vue'
import Mirador from 'mirador'
import { miradorImageToolsPlugin } from 'mirador-image-tools'
import { getManifestId } from '@/composables/iiif-manifest'

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

  const instance = {
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

    unsubscribeErrors = instance.miradorStore.subscribe(() => {
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