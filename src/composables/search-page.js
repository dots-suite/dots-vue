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

// Settings of a search type (searchConfig.searchType.options.<type>), with
// the defaults of the settings when a collection has none
const DEFAULT_SEARCH_TYPE_OPTION = { labels: {}, prefix: false, minTermLength: 3 }
export const SEARCH_TYPES = ['notice', 'fulltext']
export function getSearchTypeOption (searchTypeConfig, searchType) {
  const option = searchTypeConfig?.options?.[searchType] || {}
  return { ...DEFAULT_SEARCH_TYPE_OPTION, ...option, labels: { ...option.labels } }
}

// Search type of a reader who has not chosen one yet
export const getDefaultSearchType = (searchTypeConfig) =>
  SEARCH_TYPES.includes(searchTypeConfig?.default) ? searchTypeConfig.default : 'fulltext'

// Labels of the search type switch, long and short, in the order of SEARCH_TYPES
export const getSearchTypeOptions = (searchTypeConfig) => SEARCH_TYPES.map(value => {
  const { labels } = getSearchTypeOption(searchTypeConfig, value)
  return { value, text: labels.long || value, short: labels.short || labels.long || value }
})

// Search type with a prefix setting: a wildcard after the last word when it
// is bare (no quotes, operator or wildcard of the reader), "abba" -> "abba*"
export function addSearchTypePrefix (term, searchTypeConfig, searchType) {
  const raw = (term || '').trim()
  if (!raw || !getSearchTypeOption(searchTypeConfig, searchType).prefix) return raw
  if ((raw.match(/"/g) || []).length % 2) return raw
  const last = raw.split(/\s+/).pop()
  if (/^(AND|OR|NOT)$/.test(last) || !/[\p{L}\p{N}]$/u.test(last)) return raw
  return `${raw}*`
}

// Why a query cannot be searched, or '' when it can. Shared by the search
// page bar and the navbar's search banner.
// - "field:" syntax is not supported in full text
// - blocked when every unit is shorter than the minTermLength of the search
//   type (3 by default), or when nothing is left but operators: such queries
//   match almost everything and cost a lot. A quoted phrase is one unit.
export function getInvalidQueryMessage (term, searchType, searchTypeConfig) {
  const raw = (term || '').trim()
  if (!raw) return ''

  if (searchType === 'fulltext' && /[a-zA-Z0-9_.-]+:/.test(raw)) {
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
  const minTermLength = Math.max(1, Number(getSearchTypeOption(searchTypeConfig, searchType).minTermLength) || 1)
  // No unit left means operators only ("*", "**"): nothing to search on.
  if (units.length === 0 || units.every(u => u.length < minTermLength)) {
    return minTermLength > 1 ? `Saisissez au moins ${minTermLength} caractères` : 'Saisissez au moins 1 caractère'
  }
  return ''
}
