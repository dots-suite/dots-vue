<template>
  <article class="dots-ui about">
    <!-- Same compact banner as the search page -->
    <CollectionHeader
      :collection-config="collectionConfig"
      :application-config="applicationConfig"
      :current-collection="currentCollection"
      :collection-identifier="collectionIdentifier"
      :root-collection-identifier="rootCollectionIdentifier"
    />
    <div class="about-page app-width-padding">
      <!--:class="isMenuOpened ?'opened' : ''"-->
      <div class="tab-menu">
        <div
          type="is-toggle"
        >
          <!-- @click="scrollToTop" -->
          <aside class="menu">
            <p
              v-for="(tab, index) in tabs"
              :key="index"
              class="menu-label"
              :class="currentTab === tab[1] ? 'is-active' : ''"
              @click="currentTab = tab[1]"
              v-text="tab[0]"
            />
          </aside>
        </div>
      </div>
      <div class="content-menu">
        <keep-alive>
          <component
            :is="currentTab"
            class="content"
            :application-base-url="appBaseUrl"
          />
        </keep-alive>
      </div>
    </div>
  </article>
</template>
<script>
import { shallowRef, defineAsyncComponent, ref, watch } from 'vue'
import CollectionHeader from '@/components/CollectionHeader.vue'

export default {
  name: 'AboutPage',
  components: { CollectionHeader },
  props: {
    // Default banner of the app (CollectionHeader)
    applicationConfig: {
      type: Object,
      default: null
    },
    rootCollectionIdentifier: {
      type: String,
      required: true
    },
    collectionConfig: {
      type: Object,
      required: true
    },
    collectionIdentifier: {
      type: String,
      required: true
    },
    currentCollection: {
      type: Object,
      required: true
    }
  },

  setup (props) {
    const appBaseUrl = ref(`${import.meta.env.VITE_APP_APP_ROOT_URL}`)
    const rootCollectionId = ref(props.rootCollectionIdentifier)
    const collConfig = ref(props.collectionConfig)
    const aboutSettings = ref([])
    const collectionAltTitle = ref(props.collectionConfig.homePageSettings.pageHeader.collectionAltTitle)
    const collectionId = ref(props.collectionIdentifier)
    const currCollection = ref(props.currentCollection)
    // const tabs = ref([])
    // const currentTab = shallowRef('')
    let tabs = []
    let currentTab = shallowRef('')
    const getTabs = async () => {
      // const tabs = []
      // loop through the non null (filter(x => x)) configuration tabs settings
      for (let i = 0; i < aboutSettings.value.filter(x => x).length; i += 1) {
        let component
        const comps = Object.fromEntries(Object.entries(import.meta.glob('confs/*/*.vue')).map(([key, value]) => {
          const newKey = key.split('/').slice(-2).join('/')
          return [newKey, value]
        }))
        const match = comps[`${collConfig.value.collectionId}/${aboutSettings.value[i].compName}.vue`]
        const matchRootCollection = comps[`${rootCollectionId.value}/${aboutSettings.value[i].compName}.vue`]
        // matching About pages for exact collection if defined
        if (match) {
          component = defineAsyncComponent(() => import(`confs/${collConfig.value.collectionId}/${aboutSettings.value[i].compName}.vue`)
            .then((comp) => {
              return comp
            })
            .catch((error) => {
              console.error(`error loading confs/${collConfig.value.collectionId}/${aboutSettings.value[i].compName}.vue : `, error)
            })
          )
        // matching About pages for root collection if defined
        } else if (matchRootCollection) {
          component = defineAsyncComponent(() => import(`confs/${rootCollectionId.value}/${aboutSettings.value[i].compName}.vue`)
            .then((comp) => {
              return comp
            })
            .catch((error) => {
              console.error(`error loading ..confs/${rootCollectionId.value}/${aboutSettings.value[i].compName}.vue : `, error)
            })
          )
        // matching About pages as default
        // TODO : replace tabName by the default tabNames if incorrectly set
        } else {
          component = defineAsyncComponent(() => import(`./about/${aboutSettings.value[i].compName}.vue`)
            .then((comp) => {
              return comp
            })
            .catch((error) => {
              console.error(`error loading ${aboutSettings.value[i].compName}.vue : `, error)
            })
          )
        }
        tabs.push([aboutSettings.value[i].tabName, component])
        currentTab = shallowRef(tabs[0][1])
      }
    }
    watch(props, async (newProps) => {
      tabs = []
      rootCollectionId.value = newProps.rootCollectionIdentifier
      collectionId.value = newProps.collectionIdentifier
      currCollection.value = newProps.currentCollection
      collConfig.value = newProps.collectionConfig
      collectionAltTitle.value = collConfig.value.homePageSettings.pageHeader.collectionAltTitle
      if (collConfig.value && collConfig.value.aboutPageSettings && collConfig.value.aboutPageSettings.length > 0) {
        aboutSettings.value = collConfig.value.aboutPageSettings
      } else {
        aboutSettings.value = []
      }
      await getTabs()
    }, { deep: true, immediate: true })

    return {
      appBaseUrl,
      collectionAltTitle,
      tabs,
      currentTab
    }
  }
}

</script>
<style>
article.about {
  margin-top: 0;
}

.about-page {
  display: flex;
  justify-content: space-between;
  flex-direction: row;
  align-content: center;
  padding-top: 64px;
  padding-bottom: 150px;
  overflow-x: hidden;

  & .tab-menu {
    height: 100%;
    min-width: 100px;
    max-width: 140px;
    z-index: 10;
    background-color: white;

    & > div > aside > p.menu-label {
      padding-top: 5px;
      padding-bottom: 5px;
      border-bottom: solid 4px transparent;

      font-family: var(--font-primary), sans-serif;
      font-size:var(--font-default-size);
      font-weight: 500;
      line-height: 1.2;
      color: #666666;
      text-transform: none;
      text-align: right;
      text-indent: 0;
      letter-spacing: 0;

      cursor: pointer;

      &.is-active {
        color: var(--fill-color);
        border-bottom: solid 4px var(--fill-color);
      }
    }
  }
  & .content-menu {
    margin: 0;
    height: 100%;
    width: 80%;
  }
}
.about .content {
  max-width: 100%;
  font-size: 16px;
  text-align: left;
  font-weight: 400;
  line-height: 28px;
  color: #5F5F5F;
  text-indent: 0;
  padding: 0 8% 100px;
}
.about .content p,
.about .content ul {
  font-size: 20px;
  font-weight: 400;
  line-height: 32px;
  color: #5F5F5F;
}
.about .content p {
  text-align: left;
  text-indent: 0;
}
.about .content ul {
  padding-bottom: 10px;
  margin-left: 0;
  list-style-position: inside;
}
.about .content ul > li {
  margin-bottom: 0;
  list-style-position: outside;
  margin-left: 20px;
}
.about .content h1,
.about .content h2 {
  padding-top: 0;
  text-align: left;
}
article.about .page-header h1,
.about .about-content h1,
.about .content h1 {
  margin: 0;
  padding-top: 0;
  padding-bottom: 20px;
  font-family: var(--font-primary), sans-serif;
  font-size: 25px;
  font-weight: 900;
  color: var(--fill-color);
  line-height: 33px;
  text-transform: none;
}
.about .about-content h2,
.about .content h2 {
  margin: 25px 0;
  font-family: var(--font-primary), sans-serif;
  font-size: 30px;
  font-weight: 700;
  line-height: 1.2;
  color: var(--document-text-color);
}
.about .about-content h3,
.about .content h3 {
  color: var(--fill-color);
}

.about .about-content a,
.about .content a {
  color: var(--fill-color);
  word-break: break-word;
  &:hover {
    text-decoration: underline !important;
  }
}
.about .content table,
.about .content pre,
.about .content blockquote {
  margin: 20px 0;
}

@media screen and (max-width: 1320px) {

  .about-page .content-menu .about-content {
    padding: 0 !important;
  }

}

@media screen and (max-width: 1320px) {
  .about-page {
    display: flex;
    justify-content: center;
    flex-direction: column;
    align-content: center;
    align-items: center;
    width: 100%;
    padding-top: 30px;
    padding-bottom: 150px;

    & .tab-menu {
      padding: 0;
      margin:0 0 30px;
      width: 100%;
      min-width: 100%;
      max-width: 100%;
      height: 100%;
      background-color: white;
      z-index: 10;

      & > div > aside {
        display: flex;
        flex-direction: row;
        justify-content: flex-start;
        align-content: center;
        gap: 30px;

        & > p.menu-label {
          margin: 0;
          padding: 5px 0;
          text-align: center;

          &:hover {
            color: var(--fill-color);
          }

          &.is-active {
            padding: 5px 5px 5px 5px;
            border-left: none;
          }
        }
      }
    }
    & .content-menu {
      display: flex;
      justify-content: center;
      align-content: center;
      height: 100%;
      width: 100%;
      margin: 0;

      & >.about.content {
        width: 100%;
        padding: 0;
        & > .title {
          text-align: center;
          font-size: 20px;
          line-height: 1.45;
        }
        & > .about-content > p {
          text-align: justify;
        }
      }
    }
  }

  .about-page .content-menu,
  .about .tile.is-child {
    padding: 0 50px;
  }

  .about-page .tab-menu {
    padding: 20px 50px;
  }

  .about-page .content-menu .about-content {
    padding: 0 !important;
  }

}

@media screen and (max-width: 1024px) {

  .about-page .content-menu,
  .about .tile.is-child {
    padding: 0;
  }

  .about-page .tab-menu {
    padding-left: 0;
    padding-right: 0;
  }

}

@media screen and (max-width: 768px) {

  .about .content {
    padding: 0 20px 50px;
  }
  .about .content p,
  .about .content ul {
    font-size: var(--font-default-size);
    line-height: 24px;
    text-align: left !important;
  }
  .about .content p {
    margin: 0 0 !important;
  }
  .about .content ul {
    list-style-position: inside;
    margin: 20px 0 !important;
    & > li > ul {
      margin: 10px 0 !important;
    }
  }
  .about .content h1 {
    width: 80%;
    margin: 35px 0 !important;
    font-size: 30px;
    line-height: 36px;
  }
  .about .content h1,
  .about .content h2 {
    text-align: left;
    width: 80%;
  }
  .about .about-content h2,
  .about .content h2 {
    font-size: 24px;
  }
  .about-page .tab-menu {
    padding: 0;
    margin: 0 0 10px;
  }

  /* Sur écran étroit, une collection à plusieurs onglets ne tient plus sur une
     ligne : on les empile. Le repère de l'onglet actif passe du soulignement à
     un filet à gauche, seul bord visible dans une liste verticale. */
  .about-page .tab-menu > div > aside {
    flex-direction: column;
    align-items: stretch;
    gap: 0;
  }

  .about-page .tab-menu > div > aside > p.menu-label,
  .about-page .tab-menu > div > aside > p.menu-label.is-active {
    padding: 8px 0 8px 12px;
    text-align: left;
    border-bottom: none;
    border-left: solid 4px transparent;
  }

  .about-page .tab-menu > div > aside > p.menu-label.is-active {
    border-left-color: var(--fill-color);
  }

}
</style>
