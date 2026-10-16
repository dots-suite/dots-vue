<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { defineAsyncComponent } from 'vue'

const route = useRoute()

// Charger toutes les configs
const collectionConfigs = import.meta.glob('confs/*.conf.json', { eager: true })

// Créer un map { collId => config } pour accès rapide
const configMap = Object.fromEntries(
  Object.entries(collectionConfigs).map(([path, config]) => {
    const fileName = path.split('/').pop().toLowerCase()
    const collId = fileName.replace('.conf.json', '')
    return [collId, config]
  })
)

// Fonction utilitaire pour récupérer la config d'une collection
const getCollectionConfig = (collId) => {
  return configMap[collId?.toLowerCase()] || null
}

// Fonction utilitaire pour résoudre un compName en composant Vue
const resolveComponent = (name) => {
  const map = {
    SearchPage: () => import('@/views/SearchPage.vue'),
    // Ajouter d'autres composants custom ici si nécessaire
  }
  return map[name] ? defineAsyncComponent(map[name]) : null
}

// ⚡ Configuration de la collection actuelle
const config = computed(() => {
  const collId = route.params.collId || '__default__'
  return getCollectionConfig(collId)
})

// ⚡ Recherche de la route custom correspondante
const customRoute = computed(() => {
  if (!config.value?.customRoutes) return null
  const pageParam = (route.params.customPage || '').toLowerCase()
  return config.value.customRoutes.find(r => r.path.toLowerCase() === pageParam) || null
})

// ⚡ Résolution du composant
const component = computed(() => {
  if (!customRoute.value) return null
  return resolveComponent(customRoute.value.compName)
})

// 🔍 Logs pour debug
</script>

<template>
  <component v-if="component" :is="component" class="dots-ui" />
  <div v-else>Page non trouvée</div>
</template>