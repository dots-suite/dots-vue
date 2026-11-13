// The IIIF manifests of a collection come in both Presentation API versions:
// 3 (items, id) and 2 (sequences[0].canvases, @id; Gallica among them).

export const getManifestId = manifest => manifest?.id ?? manifest?.['@id']

const RETRY_DELAY = 3000
const FAILURE_MEMORY = 30000

// Gallica limits its requests per client. Its 429 has no CORS header: the browser
// reports a CORS error and hides the status, so a network error may be temporary too.
async function requestManifest (url, retries = 1) {
  const response = await fetch(url).catch(() => null)
  if (response?.ok) return response.json()

  const isLasting = response && response.status < 500 && response.status !== 429
  if (isLasting || !retries) {
    throw new Error(`HTTP ${response?.status ?? 'network or CORS error'} on ${url}`)
  }

  await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
  return requestManifest(url, retries - 1)
}

const manifestRequests = new Map()

// Requested once per page load, whatever the document. A failure is kept for a while,
// so that the several loads of one document do not add requests to a limited server.
export function fetchManifest (url) {
  if (!manifestRequests.has(url)) {
    manifestRequests.set(url, requestManifest(url))
    manifestRequests.get(url).catch(() => {
      setTimeout(() => manifestRequests.delete(url), FAILURE_MEMORY)
    })
  }

  return manifestRequests.get(url)
}

// The image service of a resource: an object or a list of them, with id (v3) or @id (v2)
const getServiceId = resource => {
  const service = [resource?.service].flat()[0]
  return service?.id ?? service?.['@id']
}

// [{ id, imageId, serviceId }] for each canvas, whatever the version
export function getCanvases (manifest) {
  if (Array.isArray(manifest?.items)) {
    return manifest.items.map(canvas => {
      const body = canvas.items?.[0]?.items?.[0]?.body
      return { id: canvas.id, imageId: body?.id, serviceId: getServiceId(body) }
    })
  }

  return (manifest?.sequences?.[0]?.canvases ?? []).map(canvas => {
    const resource = canvas.images?.[0]?.resource
    return { id: canvas['@id'], imageId: resource?.['@id'], serviceId: getServiceId(resource) }
  })
}

// /{region}/{size}/{rotation}/{quality}.{format} of a IIIF Image API URL
const IMAGE_REQUEST = /\/(full|square|pct:[\d.,]+|\d+,\d+,\d+,\d+)\/[^/]+\/!?[\d.]+\/(default|native|color|gray|grey|bitonal)\.\w+$/

// Compares the images without their request parameters: the same image is
// .../f1/full/full/0/default.jpg in a document and .../native.jpg in a manifest.
const imageIdentifier = url => url?.replace(IMAGE_REQUEST, '').replace(/\/$/, '')

const lastSegment = url => url?.split('/').pop()

// A document links the image of a canvas, or its image service with request parameters
// when the image itself has an opaque identifier (.../res/img0100 in a Vatican manifest).
// The same image can also change path: .../data/<doi>/<sha> in a Nakala manifest
// is .../iiif/<doi>/<sha>/... in a document. Only tried on the canvases of one
// manifest, whose last segments tell its images apart.
function findCanvasIndex (canvases, imageUrl) {
  const image = imageIdentifier(imageUrl)
  if (!image) return -1

  const images = canvases.map(canvas => imageIdentifier(canvas.imageId))
  const services = canvases.map(canvas => imageIdentifier(canvas.serviceId))
  const matches = [
    images.indexOf(image),
    services.indexOf(image),
    images.map(lastSegment).indexOf(lastSegment(image))
  ]

  return matches.find(index => index !== -1) ?? -1
}

// dots:resourceIIIFManifest is a URL, a list of URLs (with possible duplicates)
// or, once processed, { url, source } objects, of which only the IIIF ones count
export function getManifestUrls (declared) {
  const urls = [declared].flat().map(item => {
    if (typeof item === 'string') return item
    return !item?.source || item.source.name === 'iiif' ? item?.url : null
  })

  return [...new Set(urls.filter(Boolean))]
}

// manifests: [{ url, data }]. A document link can name its manifest (data-manifest);
// when it does not, or when that manifest failed to load, all of them are searched.
export function findFacsimile (manifests, imageUrl, manifestUrl) {
  const named = manifests.filter(({ url }) => url === manifestUrl)

  for (const { data } of named.length ? named : manifests) {
    const canvases = getCanvases(data)
    const canvasNum = findCanvasIndex(canvases, imageUrl)

    if (canvasNum !== -1) {
      return {
        manifestId: getManifestId(data),
        canvasId: canvases[canvasNum].id,
        canvasNum,
        firstCanvasId: canvases[0].id
      }
    }
  }

  return null
}
