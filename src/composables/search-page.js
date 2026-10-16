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

// Why a query cannot be searched, or '' when it can. Shared by the search
// page bar and the navbar's search banner.
// - "field:" syntax is not supported in full text
// - blocked when every unit is 2 characters or less, or when nothing is
//   left but operators: such queries match almost everything and cost a
//   lot. A quoted phrase is one unit.
export function getInvalidQueryMessage (term, isFulltext) {
  const raw = (term || '').trim()
  if (!raw) return ''

  if (isFulltext && /[a-zA-Z0-9_.-]+:/.test(raw)) {
    return 'Recherches "field: " non supportées en plein texte'
  }

  const units = []
  const bare = raw.replace(/"([^"]*)"/g, (match, phrase) => {
    units.push(phrase.trim())
    return ' '
  })
  units.push(
    ...bare
      .replace(/[*?~^()+\-]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
  )
  // No unit left means operators only ("*", "**"): nothing to search on.
  if (units.length === 0 || units.every(u => u.length <= 2)) {
    return 'Saisissez au moins 3 caractères'
  }
  return ''
}
