import { createRouter, createWebHistory } from 'vue-router'

const rootURL = `${import.meta.env.VITE_APP_APP_ROOT_URL}`

const isDocProjectIdIncluded = `${import.meta.env.VITE_APP_DOCUMENT_ROUTE_INCLUDE_PROJECT_ID}`.toLowerCase() === 'true'

const collectionConfigs = import.meta.glob('confs/*.conf.json', { eager: true })

const getCollectionConfig = (collId) => {
  if (!collId) return null

  const normalizedId = collId.toLowerCase()

  const match = Object.entries(collectionConfigs).find(([path]) =>
    path.toLowerCase().includes(`${normalizedId}.conf.json`)
  )

  return match ? match[1] : null
}

// NB : scrollBehavior cf https://router.vuejs.org/guide/advanced/scroll-behavior

let timeout;
let previousRoute = null
let router = () => {}
if (isDocProjectIdIncluded) {
  router = createRouter({
    history: createWebHistory(rootURL),
    routes: [
      {
        path: '/:collId?',
        name: 'Home',
        component: () => import('@/views/HomePage.vue'),
        props: true
      },
      {
        path: '/:collId?/about',
        name: 'About',
        component: () => import('@/views/AboutPage.vue')
      },
      {
        path: '/documentation',
        name: 'Documentation',
        component: () => import('@/views/DocumentationPage.vue')
      },
      {
        path: '/termsofservice',
        name: 'Terms',
        component: () => import('@/views/TermsOfService.vue')
      },
      {
        path: '/:collId?/document/:id',
        name: 'Document',
        component: () => import('@/views/DocumentPage.vue'),
        props: true
      },
      {
        path: '/:collId/:customPage',
        name: 'CustomPage',
        component: () => import('@/views/CustomPageLoader.vue'),
        props: true
      }
    ],
    scrollBehavior (to, from) {


      const defaultTop = window.innerWidth < 768 ? 45 : 82;
      const toHash = to.hash.slice(1);

      if (timeout) clearTimeout(timeout);

      if (to.path === from.path && toHash.length) {
        // Local anchors
        const anchor = document.getElementById(toHash);
        if (anchor) {
          // Local anchor of current loaded part of the document
          return {
            el: to.hash,
            behavior: 'smooth',
            top: defaultTop + 10
          }
        } else {
          // Local anchor of another (non loaded) part of the document
          return new Promise((resolve) => {
            if (timeout) clearTimeout(timeout);
            timeout = setTimeout(() => {
              // const anchor = document.getElementById(toHash);
              // console.log('scrollBehavior Local anchors timeout', to.path, to.hash, 'window.innerWidth', window.innerWidth, defaultTop, anchor);
              resolve({
                el: to.hash,
                behavior: 'smooth',
                top: defaultTop + 10
              })
            }, 500)
          })
        }
      }

      const documentScroll = window.documentScrollY ? window.documentScrollY : window.scrollY;
      const documentArea = document.querySelector('.navigation-document');
      if (documentArea) {

        const topNavBar = document.querySelector('.layout-navbar:first-child');
        const topNavBarHeight = ! topNavBar ? 0 : topNavBar.offsetHeight;

        const navTopContainer = document.getElementById('navigation-row-top-container');
        const navTopContainerHeight = ! navTopContainer ? 0 : navTopContainer.offsetHeight;

        const totalHeaderHeight = navTopContainerHeight + topNavBarHeight;

        if (documentScroll >= totalHeaderHeight) {
          // If window scroll is beyond sticky navigation bar, scroll the top of the document under the sticky menu
            return new Promise((resolve) => {
              if (timeout) clearTimeout(timeout);
              timeout = setTimeout(() => {
                resolve({ top: totalHeaderHeight, behavior: 'instant' })
              }, 0)
            })
        }

        return new Promise((resolve) => {
          if (timeout) clearTimeout(timeout);
          timeout = setTimeout(() => {
            resolve({ top: documentScroll, behavior: 'instant' })
          }, 0)
        })

      }

      // else scroll is unchanged...
    }
  })

} else {

  router = createRouter({
    history: createWebHistory(rootURL),
    routes: [
      {
        path: '/',
        name: 'Home',
        component: () => import('@/views/HomePage.vue'),
        props: true
      },
      {
        path: '/about',
        name: 'About',
        component: () => import('@/views/AboutPage.vue')
      },
      {
        path: '/documentation',
        name: 'Documentation',
        component: () => import('@/views/DocumentationPage.vue')
      },
      {
        path: '/termsofservice',
        name: 'Terms',
        component: () => import('@/views/TermsOfService.vue')
      },
      {
        path: '/document/:id',
        name: 'Document',
        component: () => import('@/views/DocumentPage.vue'),
        props: true
      },
      {
        path: '/:customPage',
        name: 'CustomPage',
        component: () => import('@/views/CustomPageLoader.vue'),
        props: true
      }
    ],
    scrollBehavior () {
      return { top: 0 }
    }
  })
}

if (isDocProjectIdIncluded) {
  router.afterEach((to) => {
    console.log('router/index.js afterEach navigated route :', { name: to.name, collId: to.params.collId, id: to.params.id, refId: to.query.refId, hash: to.hash })
  })
  router.beforeEach((to, from, next) => {
    previousRoute = from

    // Gestion des custom routes
    if (to.name === 'CustomPage') {
      const collId = to.params.collId

      // sécurité si pas de collId en mode multi
      if (isDocProjectIdIncluded && !collId) {
        return next({ name: 'Home' })
      }

      const config = getCollectionConfig(collId)

      const exists = config?.customRoutes?.some(
        r => r.path === to.params.customPage
      )

      if (!exists) {
        return next({ name: 'Home', params: to.params })
      }
    }

    next()
  })
} else {
  router.afterEach((to) => {
    console.log('router/index.js afterEach navigated route :', { name: to.name, collId: null, id: to.params.id, refId: to.query.refId, hash: to.hash })
  })
  router.beforeEach((to, from, next) => {
    previousRoute = from
    next()
  })
}


export { router, previousRoute }
