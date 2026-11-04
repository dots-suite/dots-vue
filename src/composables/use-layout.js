import { ref, computed } from 'vue'

export default function useLayout () {
  const imageIsAvailable = ref(false)
  const isTOCOpened = ref(false)
  const isTOCMenuOpened = ref(false)
  const viewMode = ref('text-mode')

  const rawSearchedTerm = ref('')

  const tocCssClass = computed(() => {
    return isTOCOpened.value ? 'is-opened' : ''
  })

  const tocMenuCssClass = computed(() => {
    return isTOCMenuOpened.value ? 'toc-aside-is-opened' : ''
  })

  const toggleTOCContent = function (event) {
    event.preventDefault()
    isTOCOpened.value = !isTOCOpened.value
  }

  const toggleTOCMenu = function (event) {
    event.preventDefault()
    isTOCMenuOpened.value = !isTOCMenuOpened.value
    if (isTOCMenuOpened.value) changeViewMode('init');
  }

  const TOCMenuBtnCssClass = computed(() => {
    return isTOCMenuOpened.value ? 'is-opened' : ''
  })

  const viewModeCssClass = computed(() => {
    if (!imageIsAvailable.value) {
      return 'text-mode text-mode-only'
    } else {
      return viewMode.value
    }
  })

  const changeViewMode = function (v) {
    //viewMode.value = v
    const isMobile = window.innerWidth <= 768;
    if (v === 'init') {
      viewMode.value = 'text-mode'
    } else if (viewMode.value === 'init' && v === 'text-mode') {
      viewMode.value = 'text-mode'
    } else if (viewMode.value === 'text-mode' && v === 'text-mode') {
      viewMode.value = 'images-mode'
    } else if (viewMode.value === 'text-mode' && v === 'images-mode') {
      viewMode.value = isMobile ? 'images-mode' : 'text-and-images-mode'
    } else if (viewMode.value === 'images-mode' && v === 'images-mode') {
      viewMode.value = 'text-mode'
    } else if (viewMode.value === 'images-mode' && v === 'text-mode') {
      viewMode.value = isMobile ? 'text-mode' : 'text-and-images-mode'
    } else if (viewMode.value === 'text-and-images-mode' && v === 'text-mode') {
      viewMode.value = isMobile ? 'text-mode' : 'images-mode'
    } else if (viewMode.value === 'text-and-images-mode' && v === 'images-mode') {
      viewMode.value = isMobile ? 'images-mode' : 'text-mode'
    }
    if (isTOCMenuOpened.value && String(viewMode.value).includes('images')) {
      isTOCMenuOpened.value = false
    }

  }

  const getViewMode = function () {
    return viewMode.value
  }

  return {
    rawSearchedTerm,
    isTOCMenuOpened,
    imageIsAvailable,
    tocCssClass,
    tocMenuCssClass,
    toggleTOCContent,
    toggleTOCMenu,
    TOCMenuBtnCssClass,
    viewModeCssClass,
    changeViewMode,
    getViewMode
  }
}
