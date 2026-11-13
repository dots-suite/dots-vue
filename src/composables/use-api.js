import { ref, readonly } from 'vue'

export default function useApi () {
  const result = ref(null)
  const error = ref(null)
  const loading = ref(false)
  const query = ref('')

  const clear = function () {
    result.value = null
    error.value = null
    loading.value = false
    query.value = ''
  }

  const setQuery = function (q) {
    query.value = q
  }

  const runQuery = async function (json = true, options = {}) {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(query.value, { mode: 'cors', ...options })
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      result.value = json ? await response.json() : await response.text()
    } catch (e) {
      error.value = e
    } finally {
      loading.value = false
    }
  }

  return {
    query: readonly(query),
    loading: readonly(loading),
    result: readonly(result),
    error: readonly(error),
    clear,
    setQuery,
    runQuery
  }
}
