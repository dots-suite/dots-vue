import { getSimpleObject } from '@/composables/utils.js'
import { useMetadataProcessor } from '@/composables/useMetadataProcessor'
import store from '@/store'


const _baseApiURL = `${import.meta.env.VITE_APP_DTS_ENDPOINT_URL}`
const rootCollectionId = __APP_ROOT_DTS_COLLECTION_ID__

// fetch has no timeout: a server that accepts but never answers would hang
// the loading state forever.
const REQUEST_TIMEOUT_MS = 15000

function requestOptions (url, options = {}) {
  return {
    mode: 'cors',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    ...options
  }
}

function describeFetchFailure (url, error) {
  if (error.name === 'TimeoutError') {
    const timeoutError = new Error(
      `DTS request timed out after ${REQUEST_TIMEOUT_MS} ms on ${url}`
    )
    timeoutError.name = 'TimeoutError'
    timeoutError.url = url
    return timeoutError
  }

  error.url = error.url ?? url
  return error
}

// Cached entries range from ~3 kB for a resource to ~95 kB for a project
// collection, which carries its members. Without a bound a long browsing
// session keeps every one of them alive, so entries are evicted
// least-recently-used first once the budget is exceeded.
const MAX_CACHE_BYTES = 4 * 1024 * 1024

/**
 * Map-like cache bounded by the estimated size of its values.
 * Reading an entry marks it as the most recent; pinned keys are never evicted.
 */
function createBoundedCache (maxBytes) {
  const values = new Map()
  const sizes = new Map()
  const pinned = new Set()
  let totalBytes = 0

  function evict () {
    for (const key of values.keys()) {
      if (totalBytes <= maxBytes) return
      if (pinned.has(key)) continue
      totalBytes -= sizes.get(key) ?? 0
      sizes.delete(key)
      values.delete(key)
    }
  }

  return {
    has: key => values.has(key),

    get (key) {
      if (!values.has(key)) return undefined
      const value = values.get(key)
      // re-inserting moves the key to the end: Map preserves insertion order
      values.delete(key)
      values.set(key, value)
      return value
    },

    set (key, value) {
      if (values.has(key)) {
        totalBytes -= sizes.get(key) ?? 0
        values.delete(key)
      }
      let size = 0
      try {
        size = JSON.stringify(value)?.length ?? 0
      } catch {
        size = 0
      }
      values.set(key, value)
      sizes.set(key, size)
      totalBytes += size
      evict()
    },

    pin (key) {
      pinned.add(key)
    },

    get bytes () {
      return totalBytes
    },

    get size () {
      return values.size
    }
  }
}

// --- Cache for getMetadataFromApi ---
const metadataCache = createBoundedCache(MAX_CACHE_BYTES)
const metadataPromiseCache = new Map()
const ROOT_KEY = Symbol('root')

// Every project resolution walks up to the root collection: keep it resident.
metadataCache.pin(ROOT_KEY)

// --- Cache for getParentFromApi ---
const parentsCache = createBoundedCache(MAX_CACHE_BYTES)
const parentsPromiseCache = new Map()

// -------------------------------------------------------------------------

async function getCoverDataFromApi (id, options = {}) {
  const responseCoverData = await fetch(`${_baseApiURL}/cover?id=${id}`, { mode: 'cors', ...options })
  const coverData = await responseCoverData.text()
  return coverData
}

async function getMetadataFromApi (id, collConfig= null, route = null,  options = {}) {
  let dtsRootCollectionId = ''
  const key = id ?? ROOT_KEY
  // 1. Is a promise already live for this key ? If so return cached promise
  if (metadataPromiseCache.has(key)) {
    return metadataPromiseCache.get(key).then(getSimpleObject)
  }

  // 2. Is metadata for this key already available in cache ? If so return cached metadata
  if (metadataCache.has(key)) {
    let normalizedMetadata = {}
      if (collConfig && route) {
        const { processMetadata } = useMetadataProcessor()
        normalizedMetadata = processMetadata(getSimpleObject(metadataCache.get(key)), key)
        return normalizedMetadata
      }
      else
      return getSimpleObject(metadataCache.get(key))
  }

  // 3. No cache promise or metadata was found, build the request URL to fetch metadata
  let fetchUrl = ''

  if (!id) {
    fetchUrl = `${_baseApiURL}/collection`
  } else {
    fetchUrl = `${_baseApiURL}/collection?id=${id}`
  }

  const fetchPromise = fetch(fetchUrl, requestOptions(fetchUrl, options))
    .then(async res => {
      // Errors come back as plain text, so res.json() would throw a
      // SyntaxError naming a stray character instead of the cause.
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        const error = new Error(
          `DTS ${res.status} on ${fetchUrl}${body ? `: ${body.slice(0, 200)}` : ''}`
        )
        error.status = res.status
        throw error
      }

      return res.json()
    })
    .then(async metadata => {
      if (!id) {
        dtsRootCollectionId = metadata['@id']
        store.commit('setDtsRootCollectionId', dtsRootCollectionId)
      } else {
        dtsRootCollectionId = store.state.dtsRootCollectionId
      }
      // add parent and project id for collections if missing
      if (metadata['@type'] === 'Collection' && metadata.totalParents > 0 && (id && id !== dtsRootCollectionId && id !== rootCollectionId)) {
        const parentResponse = await getParentFromApi(metadata['@id'])

        const getMemberIds = (obj) => {
          const ids = (obj?.member ?? [])
            .map(m => m?.['@id'])
            .filter(Boolean)

          return ids.length === 1 ? ids[0] : ids
        }
        metadata.parent = getMemberIds(parentResponse)
      }
      if (id && id !== dtsRootCollectionId && id !== rootCollectionId) {
        const projectResponse = await getProjectFromApi(metadata['@id'])
        metadata.projectIdentifier = projectResponse
      }

      // simplify object
      const simpleMetadata = getSimpleObject(metadata, metadata.parent, metadata.projectIdentifier)
      //const simpleMetadata = getSimpleObject(metadata)
      // Get the id from the DTS response
      const realId = simpleMetadata?.identifier


      // Cache metadata under the requested key (id or ROOT_KEY)
      metadataCache.set(key, simpleMetadata)
      metadataPromiseCache.delete(key)

      // Cache duplication for root collection (can be referred to with or without its id) :
      // for the root collection (fetched on collection DTS root without id), when we get the response, also cache it under its id (realId)
      // checking also that realId exists (erroneous API response)
      if (!id && realId) {
        metadataCache.set(realId, simpleMetadata)
        metadataCache.pin(realId)
      }
      let normalizedMetadata = {}
      if (collConfig && route) {
        const { processMetadata } = useMetadataProcessor()
        normalizedMetadata = processMetadata(simpleMetadata, realId)
        return normalizedMetadata
      }
      else
      return simpleMetadata
    })
    .catch(error => {
      metadataPromiseCache.delete(key)
      throw describeFetchFailure(fetchUrl, error)
    })

  metadataPromiseCache.set(key, fetchPromise)
  return fetchPromise
}

async function getDocumentFromApi (id, excludeFragments = false, mediaType, renderer, options = {}) {
  // TODO : default is document route without mediatype and if mediatype is provided include it
  // renderer selects the DoTS XSL matching the stylesheet loaded by useDocumentBaseCss; omitted when the collection sets none
  const rendererParam = renderer ? `&renderer=${renderer}` : ''
  const response = await fetch(`${_baseApiURL}/document?resource=${id}&mediaType=${mediaType}${rendererParam}&excludeFragments=${excludeFragments}`, { mode: 'cors', ...options })
  const document = response.text()
  return document
}

async function getTOCFromApi (id, type = 'Resource', options = {}) {
  if (type === 'Resource') {
    const response = await fetch(`${_baseApiURL}/navigation?resource=${id}&down=-1`, { mode: 'cors', ...options })
    const document = await response.json()
    return document
  } else {
    const document = await getMetadataFromApi(id, null, null, options)
    return document
  }
}

async function getParentFromApi (id, options = {}) {
  const dtsRootCollectionId = store.state.dtsRootCollectionId

  if (!id || id === dtsRootCollectionId) {
    console.warn('getParentFromApi called without id')
    return null
  }

  // --- If a promise is already ongoing for this id ---
  if (parentsPromiseCache.has(id)) {
    return parentsPromiseCache.get(id)
  }

  // --- If metadata is already in cache for this id ---
  if (parentsCache.has(id)) {
    return parentsCache.get(id)
  }

  // --- otherwise, fetch ---
  const url = `${_baseApiURL}/collection?id=${id}&nav=parents`

  const fetchPromise = fetch(url, { mode: 'cors', ...options })
    .then(res => res.json())
    .then(document => {

      // --- Storing the API response in cache ---
      parentsCache.set(id, document)

      // --- Removing the promise for this id from cache ---
      parentsPromiseCache.delete(id)

      return document
    })
    .catch(err => {
      parentsPromiseCache.delete(id)
      throw err
    })

  // --- Storing the promise for this id to avoid duplicates ---
  parentsPromiseCache.set(id, fetchPromise)

  return fetchPromise
}

async function getProjectFromApi (id, options = {}) {
  // --- 1. Get rootCollectionId (via cache if possible) ---
  let rootCollectionId = import.meta.env.VITE_APP_ROOT_DTS_COLLECTION_ID

  if (!rootCollectionId) {
    const rootCollection = await getMetadataFromApi(null, null, null, options)
    rootCollectionId = rootCollection['@id']
  }

  // --- 2. Navigate up the collection tree via /collection?id=X&nav=parents ---
  let loopId = id

  while (loopId && loopId !== rootCollectionId) {
    const document = await getParentFromApi(loopId, options = {})


    if (document.member?.length) {
      if (document.member[0]['@id'] !== rootCollectionId) {
        loopId = document.member[0]['@id']
      } else if (document.member[0]['@id'] === rootCollectionId) {
        loopId = document['@id']
        break
      }
    } else {
      // No declared parent → set id from the last available parent response and break
      loopId = document['@id']
      break
    }
  }
  return loopId
}

async function getAncestors (currentCollection, excludedCollections = []) {

  const ancestors = [[getSimpleObject(currentCollection),], ]

  let loop = true
  let cur = currentCollection
  while (loop) {
    let parent = await getParentFromApi(cur?.identifier)
    // stop when no parent or parent == VITE_APP_ROOT_DTS_COLLECTION_ID
    if (parent?.member &&  parent?.member?.[0]?.['@id'].toLowerCase() !== import.meta.env.VITE_APP_ROOT_DTS_COLLECTION_ID.toLowerCase()) {
      cur = getSimpleObject(parent?.member[0])
      ancestors.push(parent?.member.map((elem) => getSimpleObject(elem)).filter((elem) => !excludedCollections.includes(elem.identifier)))
    } else {
      loop = false
    }
  }

  return ancestors
}

export {
  getCoverDataFromApi,
  getDocumentFromApi,
  getMetadataFromApi,
  getTOCFromApi,
  getParentFromApi,
  getProjectFromApi,
  getAncestors,
}
