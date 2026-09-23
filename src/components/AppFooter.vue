<template>
  <footer class="footer is-flex-align-items-flex-end mt-auto">
    <div class="columns">
      <div class="column app-title left-column">
        <div class="title-container">
          <span class="title">
            {{ footTitle ? footTitle : currCollection.title }}
          </span>
          <span
            v-for="(subtitle, index) in footSubtitles"
            :key="index"
            class="subtitle"
          >
            {{ subtitle }}
          </span>
        </div>
      </div>
      <div class="column right-columns">
        <div class="columns">
          <div v-if="footDescription && footDescription.length" class="column description">
            <div class="row description">
              {{ footDescription }}
            </div>
          </div>
          <div class="column logos">
            <div class="logo-institutions">
              <a
                target="_blank"
                href="https://www.chartes.psl.eu/"
              >
                <img
                  class="enc-logo"
                  alt="Logo de l'École nationale des chartes"
                  src="@/assets/images/logo_enc_white.svg"
                />
              </a>
              <a
                target="_blank"
                href="https://projet.biblissima.fr/fr"
              >
                <img
                  class="biblissima-logo"
                  alt="Logo de Biblissima+"
                  src="@/assets/images/logo_biblissima_footer_white.png"
                />
              </a>
            </div>
          </div>
          <div class="row links">
            <ul class="footer-links">
              <li>
                <router-link
                  :to="{ name: 'Terms'}"
                  active-class="active"
                >
                  Mentions légales
                </router-link>
              </li>
              <li>
                <a
                  target="_blank"
                  href="https://www.chartes.psl.eu/contact"
                >
                  Contact
                </a>
              </li>
              <li>
                <a
                  target="_blank"
                  href="https://www.huma-num.fr/"
                >
                  Huma-Num
                </a>
              </li>
            </ul>
            <div class="logo">
              <span>
                Powered by
              </span>
              <a
                class="dots-logo"
                target="_blank"
                href="https://dots-suite.github.io/dots_documentation/"
              >
                <!--<img
                  class="dots-logo"
                  alt="Logo de DoTS"
                  src="@/assets/images/logo_dots.png"
                />-->
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </footer>
</template>
<script>
import { ref, watch } from 'vue'

export default {
  name: 'AppFooter',
  props: {
    collectionIdentifier: {
      type: String,
      required: true
    },
    footerSettings: {
      type: Object,
      required: true
    },
    /* footerTitle: {
      type: String,
      required: true
    },
    footerSubtitles: {
      type: Array,
      required: true
    },
    footerDescription: {
      type: String,
      required: true
    }, */
    currentCollection: {
      type: Object,
      required: true
    }
  },

  setup (props) {
    const footTitle = ref(props.footerSettings.footerTitle)
    const footSubtitles = ref(props.footerSettings.footerSubtitles)
    const footDescription = ref(props.footerSettings.footerDescription)
    const collectionId = ref(props.collectionIdentifier)
    const currCollection = ref(props.currentCollection)

    watch(props, (newProps) => {
      collectionId.value = newProps.collectionIdentifier
      footTitle.value = newProps.footerSettings.footerTitle
      footSubtitles.value = newProps.footerSettings.footerSubtitles
      footDescription.value = newProps.footerSettings.footerDescription
      currCollection.value = newProps.currentCollection
    })

    return {
      currCollection,
      footTitle,
      footSubtitles,
      footDescription
    }
  }
}
</script>
<style>
.footer {
  background-color: #4C4949;
  /* border-top: #BA0F29 solid 4px; */
  border-top: solid 4px var(--fill-color);
  /* max-height: 400px; */
  width: 100%;
  padding: 0;
  transform: rotateZ(0);
  margin-top: 0 !important;
}

.footer .columns {
  display: flex !important;
  margin: 0;
}

.footer > .columns > .column {
  padding: 48px 40px;
}

.footer > .columns > .column.left-column {
  flex: 400px 0 0;
  background-color: #302C2C;
}

.footer > .columns > .column.right-columns > .columns {
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 20px;
}

.footer .title-container {
  display: flex;
  flex-direction: column;
  justify-content: left;
  text-align: left;
  color: white;
  width: 400px;

  & > .title {
    margin-bottom: 0;
    font-family: var(--font-primary), sans-serif;
    font-style: normal;
    font-size: 30px;
    color: white;
    text-align: left;
  }
  & >.subtitle {
    margin-top: 12px;
    margin-bottom: 0;
    text-align: left;
    font-family: var(--font-primary), sans-serif;
    font-size: 110%;
    font-style: normal;
    color: white;
  }
}
.footer .column {
  padding: 0;
}

.footer .column .description {
  display: flex;
  justify-content: left;
  flex-direction: column;
  padding: 0;

  &.row.description {
    max-width: 80%;
    margin-bottom: 0;
    text-align: left;
    color: white;

    &:empty {
      display: none;
    }
  }
}

.footer .row.description:not(:empty) {
  margin-bottom: 100px;
}

.footer-links {
  display: inline-block;
  text-transform: uppercase;
  color: white;
}

.footer-links li {
  position: relative;
  display: inline;
}

.footer-links li,
.footer-links li a {
  font-size: 16px;
  line-height: 1;
}

.footer-links li:not(:last-child) {
  margin-right: 10px;
  padding-right: 10px;
}

.footer-links li:not(:last-child):after {
  content: "";
  position: relative;
  top: 0;
  right: -9px;
  display: inline;
  width: 1px;
  font-size: 80%;
  border-right: solid #ffffff 1px;
}

.footer-links li a {
  border-bottom: none;
  font-weight: 400;
  color: #FFFFFF;
  text-transform: uppercase;
}

.footer-links li a:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}
.footer .logos {
  display: flex;
  flex-direction: column;
  align-items: flex-end;

  & > .logo-institutions {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: 20px;

    & > a {
      display: flex;
      justify-content: center;
      align-items: center;
      vertical-align: center;
      border-bottom: none;
      color: #FFFFFF;
    }
  }
  img {
    max-width: 250px;
  }
}
.footer {
  .row.links {
    flex: 100% 0 0;
    width: 100%;

    display: flex;
    flex-direction: row;
    flex-grow: 1;
    flex-wrap: wrap;
    align-items: center;
    gap: 20px 50px;

    & > .logo {
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;

      & > span {
        color: white;
      }

      & > a {
        display: flex;
        justify-content: center;
        align-items: center;
        vertical-align: center;
        margin: 10px;
        border-bottom: none;
        color: #FFFFFF;
      }

      .dots-logo {
        display: inline-block;
        width: 70px;
        height: 70px;
        background: url(../assets/images/logo_dots.png) center / contain no-repeat;
        &:hover {
          background: url(../assets/images/dots-logo-retro.drawio.svg) center / contain no-repeat;
        }
      }
    }
  }
}

.enc-logo {
  width: auto;
  height: 50px;
}
.biblissima-logo {
  width: 320px;
  height: auto;
}

@media screen and (min-width: 1300px) {
  .footer > .columns > .column.right-columns {
    padding-right: calc( 50% - 650px );
  }

}

@media screen and (min-width: 1900px) {

  .footer > .columns > .column.left-column {
    /* = 50% - 950px + 400px */
    flex: calc( 50% - 550px ) 0 0;
    width: calc( 50% - 550px );
    padding-left: calc( 50% - 950px + 20px );
  }
  .footer > .columns > .column.right-columns {
    flex: calc( 50% + 550px ) 0 0;
    width: calc( 50% + 550px );
  }

}

@media screen and (max-width: 1320px) {
  .footer > .columns > .column.right-columns > .columns {
    flex-direction: column;
    justify-content: flex-start;
    align-items: flex-start;
  }
  .footer .row.description:not(:empty) {
    margin-bottom: 50px;
  }
  .footer .logos {
    align-items: flex-start;
    margin-bottom: 20px;
  }
  .footer .logos > .logo {
    justify-content: flex-start;
  }
}

@media screen and (max-width: 1024px) {
  footer > .columns {
    flex-direction: column;
  }
  .footer > .columns > .column {
    padding: 30px var(--mobile-margin);
  }

  /* Safari iOS re-expands its toolbar when scrolling stops, pushing the
     end of the footer out of view. 30px + 50 to keep it reachable. */
  @supports (-webkit-text-size-adjust: none) and (font: -apple-system-body) and (-webkit-touch-callout: none) {
    .footer > .columns > .column {
      padding-bottom: 80px;
    }
  }
  .footer > .columns > .column.left-column {
    flex: auto;
  }
  .footer .title-container {
    width: auto;
    
    & > .title {
      font-size: 24px;
    }
  }
  .footer .column .description {
    &.row.description {
      max-width: 100%;
    }
  }
  .footer .logos {
    width: 100%;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;

    img {
      max-width: 200px;
    }
  }

  .footer > .columns > .column.right-columns > .columns .row.links {
    margin-top: 30px;
  }
  .footer > .columns > .column.right-columns > .columns > .column.logos > .logo,
  .footer > .columns > .column.right-columns > .columns .row.links {
    display: flex;
    justify-content: center;

    .footer-links {
      margin: 0;
    }
  }
}

@media screen and (max-width: 768px) {
  .enc-logo {
    height: 40px;
  }
  .dots-logo {
    height: 40px;
  }
  .footer .row.description:not(:empty) {
    margin-bottom: 15px;
  }
  .footer .logos {
    width: 100%;
    margin: 20px 0;

    .logo-institutions {
      flex-direction: column;
      align-items: center;
      width: 100%;
    }
  }
}
</style>
