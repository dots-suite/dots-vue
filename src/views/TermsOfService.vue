<template>
  <div class="">
    <!-- Same compact banner as the about page (banner from the settings
         cascade) -->
    <CollectionHeader
      :collection-config="collectionConfig"
      :application-config="applicationConfig"
      :current-collection="currentCollection"
      :collection-identifier="collectionIdentifier"
      :root-collection-identifier="rootCollectionIdentifier"
    />
    <section class="main app-width-padding">
      <div
        id="article"
        class="article"
      >
        <h2>Publisher</h2>
        <p>
          École nationale des chartes, Public establishment<br>
          65, rue de Richelieu<br>
          12, rue des Petits-Champs<br>
          75002 Paris<br>
          Tél. + 33 (0)1 55 42 75 00<br>
          Siret : 19753478700043
        </p>
        <hr>
        <h2>Publishing director</h2>
        <p>
          Olivier Poncet, Director of the École nationale des chartes<br>
          secretariat@chartes.psl.eu
        </p>
        <hr>
        <h2>Web hosting</h2>
        <p>
          IR* Huma-Num<br>
          Bâtiment de recherche Nord<br>
          14, cours des humanités<br>
          93322 Aubervilliers cedex
        </p>
        <hr>
        <h2>Personal data</h2>
        <p>
          Refer to the page
          <a
            target="_blank"
            href="https://www.chartes.psl.eu/politique-de-confidentialite"
          >
            « Politique de confidentialité »
          </a> of the École nationale des chartes - PSL.
        </p>

        <hr>
        <h2>Intellectual property</h2>

        <h2>Website development and content</h2>
        <p>
          Unless otherwise stated, the structure, design and content of this website ({{ websiteURL }}) and data available via its APIs
          are shared under the Creative Commons license
          <a
            target="_blank"
            href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
          >
            CC BY-NC-SA 4.0
          </a>.
        </p>

        <!-- Image rights: empty for now, hidden until filled
        <h2>Image rights</h2>
        -->
        <hr>
        <h1>Liability clause</h1>
        <p>
          The information on the site is provided as a public service.<br>
          The publisher uses all reasonable efforts to ensure the information available on the website ({{ websiteURL }})
          is as available, accurate, and up to date as possible, and reserves the right to amend and correct its content
          at any time without prior notice.<br>
          However, the publisher cannot guarantee the availability, accuracy or completeness of the information presented.
          Use of the information available or provided on this website is the sole responsibility of the user.<br>
          Websites or third-party information referenced on the site have been selected and provided to users only for convenience and information purposes.
          The publisher will not be held liable for any damage of any kind resulting from the interpretation or use of information available on the site or on third-party sites.
        </p>
        <p>
          This notice is subject to be modified and updated at any time without prior notice.<br>
          <br>
          This page was last updated on {{ lastModified }}.
        </p>
      </div>
    </section>
  </div>
</template>
<script>
import CollectionHeader from '@/components/CollectionHeader.vue'

export default {
  name: 'TermsOfServiceView',
  components: {
    CollectionHeader
  },
  props: {
    collectionConfig: {
      type: Object,
      required: true
    },
    applicationConfig: {
      type: Object,
      required: true
    },
    rootCollectionIdentifier: {
      type: String,
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
  setup () {
    const websiteURL = window.location.origin
    const lastModified = new Intl.DateTimeFormat('fr-FR', { year: 'numeric', month: 'numeric', day: 'numeric' }).format(new Date(document.lastModified)).replace(/\./g, '-')

    return {
      websiteURL,
      lastModified
    }
  }
}
</script>

<style scoped>
a {
  border-bottom: none;
}
section.main {
  padding-top: 64px;
  padding-bottom: 150px;
}
#article {
  padding: 40px 10% 120px;
  border-bottom: 1px dotted #ffffff;
  & > p {
    text-indent: 0;
  }
  /* min-height: 100%; */
}
#article {
  margin-bottom: 30px !important;
  padding: 10px 0 10px !important;
}
#article article {
  margin: 0;
}
#article h1, #article h2,
#article {
  text-align: left;
}
#article h2 {
  margin-bottom: 20px;
  font-size:24px;
  font-weight:500;
  line-height: 1.2;
  color: var(--fill-color);
  text-transform: none;
}
#article h2:first-child {
  margin-top: 0;
}
@media screen and (max-width: 1320px) {

  #article {
    padding: 0 50px !important;
  }

}

@media screen and (max-width: 1024px) {

  #article {
    padding: 0 !important;
  }

}

</style>
