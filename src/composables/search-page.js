const isDocProjectIdIncluded = `${import.meta.env.VITE_APP_DOCUMENT_ROUTE_INCLUDE_PROJECT_ID}`.toLowerCase() === 'true'

// The settings files as the router and CustomPageLoader read them: a custom
// page only opens when the file named after the collection declares it
const collectionConfigs = Object.fromEntries(
  Object.entries(import.meta.glob('confs/*.conf.json', { eager: true })).map(([path, mod]) => [
    path.split('/').pop().toLowerCase().replace('.conf.json', ''),
    mod.default ?? mod
  ])
)

// A 'search' custom route whose component CustomPageLoader can load
export const isSearchRoute = (r) => r?.path?.toLowerCase() === 'search' && r.compName === 'SearchPage'

/**
 * Route to the search page of the first collection, among `collectionIds`,
 * that declares one, or null. Custom pages only resolve with the project id
 * in routes.
 */
export function getSearchRoute (collectionIds) {
  if (!isDocProjectIdIncluded) return null

  for (const collId of collectionIds) {
    if (!collId) continue
    const route = collectionConfigs[collId.toLowerCase()]?.customRoutes?.find(isSearchRoute)
    if (route) {
      return { name: 'CustomPage', params: { collId, customPage: route.path } }
    }
  }
  return null
}
