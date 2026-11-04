// The IIIF manifests of a collection come in both Presentation API versions:
// 3 (items, id) and 2 (sequences[0].canvases, @id; Gallica among them).

export const getManifestId = manifest => manifest?.id ?? manifest?.['@id']

// [{ id, imageId }] for each canvas, whatever the version
export function getCanvases (manifest) {
  if (Array.isArray(manifest?.items)) {
    return manifest.items.map(canvas => ({
      id: canvas.id,
      imageId: canvas.items?.[0]?.items?.[0]?.body?.id
    }))
  }

  return (manifest?.sequences?.[0]?.canvases ?? []).map(canvas => ({
    id: canvas['@id'],
    imageId: canvas.images?.[0]?.resource?.['@id']
  }))
}

// /{region}/{size}/{rotation}/{quality}.{format} of a IIIF Image API URL
const IMAGE_REQUEST = /\/(full|square|pct:[\d.,]+|\d+,\d+,\d+,\d+)\/[^/]+\/!?[\d.]+\/(default|native|color|gray|grey|bitonal)\.\w+$/

// Compares the images without their request parameters: the same image is
// .../f1/full/full/0/default.jpg in a document and .../native.jpg in a manifest.
const imageIdentifier = url => url?.replace(IMAGE_REQUEST, '')

const lastSegment = url => url?.split('/').pop()

// The same image can also change path: .../data/<doi>/<sha> in a Nakala manifest
// is .../iiif/<doi>/<sha>/... in a document. Only tried on the canvases of one
// manifest, whose last segments tell its images apart.
function findCanvasIndex (canvases, imageUrl) {
  const image = imageIdentifier(imageUrl)
  if (!image) return -1

  const identifiers = canvases.map(canvas => imageIdentifier(canvas.imageId))
  const index = identifiers.indexOf(image)

  return index !== -1 ? index : identifiers.map(lastSegment).indexOf(lastSegment(image))
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
