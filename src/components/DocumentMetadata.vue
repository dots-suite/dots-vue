<template>
  <div class="document-metadata">
    <aside class="menu">
      <div class="is-flex is-justify-content-center">
        <table class="table is-fullwidth">
          <tbody>
            <template v-for="(value, key) in metadata" :key="key">

              <!-- Case 1 : array -->
              <template v-if="Array.isArray(value) && value.length > 0">
                <tr
                  v-for="(item, i) in value"
                  :key="i"
                  class="row is-align-items-center"
                >
                  <!-- Label with rowspan on first line only -->
                  <td v-if="i === 0" :rowspan="value.length" class="metadata-key">
                    <span class="title"><b>{{ key }}</b></span>
                  </td>

                  <!-- Value Case -->
                  <td>
                    <span class="title">
                      <!-- enriched item { value, url?, source } -->
                      <template v-if="item && typeof item === 'object' && 'value' in item">
                        <a v-if="item.url" :href="item.url" target="_blank">{{ item.value }}</a>
                        <span v-else>{{ item.value }}</span>
                      </template>
                      <!-- item objet structuré { name, @id, ... } -->
                      <template v-else-if="item && typeof item === 'object'">
                        <a v-if="item.url" :href="item.url" target="_blank">
                          {{ item['schema:name'] ?? item.url }}
                        </a>
                        <span v-else>{{ item['schema:name'] ?? JSON.stringify(item) }}</span>
                      </template>
                      <!-- scalar item -->
                      <template v-else>
                        <a v-if="typeof item === 'string' && item.startsWith('http')" :href="item" target="_blank">{{ item }}</a>
                        <span v-else>{{ item }}</span>
                      </template>
                    </span>
                  </td>

                  <!-- Logo cell -->
                  <!-- Array of logos cell -->
                  <td>
                    <div class="is-flex is-align-items-center is-justify-content-flex-end" style="gap: 4px">
                      <!-- Main source (@id) -->
                      <figure v-if="item?.source?.name" class="image level-left">
                        <a :href="item.url" target="_blank">
                          <img :src="ImgUrl(item.source.name)" />
                        </a>
                      </figure>
                      <!-- Secondary sources (sameAs) -->
                      <figure
                        v-for="(sa, si) in (item?.sameAsSources ?? [])"
                        :key="si"
                        class="image level-left"
                      >
                        <a :href="sa.value" target="_blank">
                          <img :src="ImgUrl(sa.source.name)" />
                        </a>
                      </figure>
                    </div>
                  </td>
                </tr>
              </template>

              <!-- Case 2 : enriched object { value, url?, source } -->
              <template v-else-if="value && typeof value === 'object' && 'value' in value">
                <tr class="row">
                  <td class="metadata-key"><span class="title"><b>{{ key }}</b></span></td>
                  <td>
                    <span class="title">
                      <a v-if="value.url" :href="value.url" target="_blank">{{ value.value }}</a>
                      <span v-else>{{ value.value }}</span>
                    </span>
                  </td>
                  <td>
                    <div class="is-flex is-align-items-center is-justify-content-flex-end" style="gap: 4px">
                      <figure v-if="value.source?.name" class="image level-left">
                        <a :href="value.url" target="_blank">
                          <img :src="ImgUrl(value.source.name)" />
                        </a>
                      </figure>
                    </div>
                  </td>
                </tr>
              </template>

              <!-- Case 3 : structured object { name, @id, ... } without source -->
              <!-- Case 3 : structured object { name, @id, ... } without source or with sameAs -->
              <template v-else-if="value && typeof value === 'object'">
                <tr class="row">
                  <td class="metadata-key"><span class="title"><b>{{ key }}</b></span></td>
                  <td>
                    <span class="title">
                      <a
                        v-if="value['@id'] || value.url"
                        :href="value['@id'] || value.url"
                        target="_blank"
                      >
                        {{ value['schema:name'] || value['@id'] || value.url }}
                      </a>
                      <span v-else>{{ value['schema:name'] || JSON.stringify(value) }}</span>
                    </span>
                  </td>
                  <td>
                    <div class="is-flex is-align-items-center is-justify-content-flex-end" style="gap: 4px">
                      <!-- Main source (@id) -->
                      <figure v-if="value.source?.name" class="image level-left">
                        <a :href="value.url || value['@id']" target="_blank">
                          <img :src="ImgUrl(value.source.name)" />
                        </a>
                      </figure>
                      <!-- Secondary sources (sameAs) -->
                      <figure
                        v-for="(sa, si) in (value.sameAsSources ?? [])"
                        :key="si"
                        class="image level-left"
                      >
                        <a :href="sa.value" target="_blank">
                          <img :src="ImgUrl(sa.source.name)" />
                        </a>
                      </figure>
                    </div>
                  </td>
                </tr>
              </template>

              <!-- Case 4 : scalar (string, number, boolean) -->
              <template v-else-if="value != null">
                <tr class="row">
                  <td class="metadata-key"><span class="title"><b>{{ key }}</b></span></td>
                  <td>
                    <span class="title">
                      <a
                        v-if="typeof value === 'string' && value.startsWith('http')"
                        :href="value"
                        target="_blank"
                      >{{ value }}</a>
                      <span v-else>{{ value }}</span>
                    </span>
                  </td>
                  <td></td>
                </tr>
              </template>
            </template>
          </tbody>
        </table>
      </div>
    </aside>
  </div>
</template>

<script>
import { ref, toRaw, watch } from 'vue'

import { buildDisplayModel } from '@/composables/useMetadataProcessor'

export default {
  name: 'DocumentMetadata',

  components: {},

  props: {
    collectionConfig: {
      type: Object,
      required: false
    },
    metadataProp: {
      type: Object,
      required: true,
      default: () => {}
    }
  },

  setup (props) {
    const metadata = ref({})

    const ImgUrl = (source) => {
      const defaultLogos = import.meta.glob(
        '../assets/images/logo_*.svg',
        {
          import: 'default',
          eager: true
        }
      )

      const confLogos = import.meta.glob(
        'confs/*/assets/images/logo_*.{svg,png}',
        {
          import: 'default',
          eager: true
        }
      )

      const logos = {
        ...defaultLogos,
        ...confLogos
      }

      const logo = Object.entries(logos).find(([path]) =>
        path.endsWith(`/logo_${source}.svg`) || path.endsWith(`/logo_${source}.png`)
      )
      if (logo) {
        return logo[1]
      }

      return new URL(
        `/src/assets/images/logo_${source}.png`,
        import.meta.url
      ).href
    }

    watch(
      () => [props.metadataProp, props.collectionConfig],
      async ([source, config]) => {
        if (!source) { metadata.value = {}; return }
        console.log('DocumentMetadata.vue watch metadataProp source :', source)

        const rawSource = JSON.parse(JSON.stringify(toRaw(source)))
        const rawConfig = config ? JSON.parse(JSON.stringify(toRaw(config))) : {}
        metadata.value = await buildDisplayModel(rawSource, rawConfig)
        console.log('DocumentMetadata.vue watch built metadata.value :', metadata.value)
      },
      { immediate: true, deep: true }
    )

    return {
      metadata,
      ImgUrl
    }
  }
}
</script>

<style scoped>
.document-metadata {
  width: 100%;
}
ol,
ul {
  list-style: none;
}
aside.menu > .columns {
  padding: 25px 20px 40px;
  border-top: solid 2px #fcfcfc;
  background-color: #e4e4e4;
  border-radius: 0 0 6px 6px;
}
aside.menu > .columns > .column {
  padding: 0;
}
aside.menu > .columns > .column:nth-child(1) {
  padding-right: 50px;
}
aside.menu > .columns > .column:nth-child(2) {
  padding-right: 80px;
}
aside.menu > .columns > .column:nth-child(3) {
  max-width: 50%;
}
.column .title, span.title,
.column {
  font-family: var(--font-primary), sans-serif;
  font-size: var(--font-toc-metadata-size);
  font-weight: normal;
  font-style: normal;

  & > a {
    font-weight: normal;
    font-style: normal;
    color: #4a4a4a;

    &:hover {
      color: #000;
      border-bottom: dotted 1px #000;
      background-color: transparent;
    }
  }
}
.title {
  text-indent: 0;
  margin-bottom: 0;
  color: #4a4a4a;
  & :deep i {
    font-style: italic !important;
  }
}
td > span.title > b {
  white-space: nowrap;
}
h2.title {
  text-align: left;
  margin: 0 0 20px 0;
  padding: 0;
  text-transform: uppercase;
  font-weight: 700;
  color: #929292;
}
figure img,
figure {
  margin: 0 !important;
  padding: 0 !important;
  border: none;
  background-color: var(--meta-area-fill-color);
}

figure.image img{
  height: 32px;
  width: auto;
  vertical-align: middle;
}

@media screen and (max-width: 1320px) {
  .menu-list,
  aside.menu > .columns {
    flex-direction: column;
  }
  aside.menu > .columns > .column:nth-child(1) {
    width: 25% !important;
    padding-right: 0;
    margin-bottom: 50px;
  }
  aside.menu > .columns > .column:nth-child(2),
  aside.menu > .columns > .column:nth-child(3) {
    width: 100% !important;
    padding-right: 0;
    margin-bottom: 50px;
  }
  aside.menu > .columns > .column:nth-child(3) {
    max-width: 75% !important;
  }
}
@media screen and (max-width: 768px) {
  aside.menu > .columns > .column:nth-child(1) {
    width: 50% !important;
  }
  .tab-content {
    & .table td {
      padding: 10px 5px;
    }
  }

  .menu {
    font-size: var(--font-default-size);
    line-height: 1;
  }

  .column .title, span.title,
  .column {
    & {
    }
  }
}
@media screen and (max-width: 640px) {
  figure.image img{
    height: 24px;
    width: auto;
  }

  table tr.row {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: space-between;
    padding: 8px 0;
    gap: 0 !important;

    & > td {
      flex: 1 0 0;
      border: none;
      padding: 2px !important;
    }

    & > td.metadata-key {
      flex: 100% 0 0;
      width: 100%;
      border: none;
    }

    & > td:last-child {
      flex: auto 0 0;
      padding-left: 15px !important;
    }
  }

}
table {
  background-color: #f1f1f1;
  border-radius: 0 0 6px 6px;
  border: none;
}
td {
  vertical-align: middle !important;
}
</style>
