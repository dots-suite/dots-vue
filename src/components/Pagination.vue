<template>
  <div
    class="pagination has-text-centered is-flex is-flex-direction-row is-justify-content-center"
  >
    <div class="pagination-documents-count">
      {{ documentsCountText }}
    </div>

    <div
      class="pagination-controls"
      tabindex="0"
      role="navigation"
      aria-label="Pagination"
      @keydown="onContainerKeydown"
    >
      <!-- First -->
      <button
        :class="isDisabledPrev ? 'dots-button first-page disabled' : 'dots-button first-page'"
        :aria-disabled="isDisabledPrev"
        :tabindex="isDisabledPrev ? -1 : 0"
        @click="!isDisabledPrev && goToPage(1)"
      />

      <!-- Previous -->
      <button
        :class="isDisabledPrev ? 'dots-button previous-page disabled' : 'dots-button previous-page'"
        :aria-disabled="isDisabledPrev"
        :tabindex="isDisabledPrev ? -1 : 0"
        @click="!isDisabledPrev && goToPage(currentPage - 1)"
      />

      <!-- Input -->
      <input
        ref="inputRef"
        v-model="pageInput"
        name="page"
        type="number"
        min="1"
        :max="totalPages"
        placeholder="Page..."
        class="current-page"
        :disabled="totalPages <= 1 || isTableLoading"
        inputmode="numeric"
        pattern="[0-9]*"
        role="spinbutton"
        :aria-valuemin="1"
        :aria-valuemax="totalPages"
        :aria-valuenow="currentPage"
        aria-label="Page number"
        @input="onPageInput"
        @keydown="onInputKeydown"
        @blur="onBlur"
      />

      <span class="label-sur-page">/</span>

      <div class="page-box">
        <span v-if="isTableLoading" class="total-pages dot-flash">...</span>
        <span v-else class="total-pages">{{ totalPages }}</span>
      </div>

      <!-- Next -->
      <button
        :class="isDisabledNext ? 'dots-button next-page disabled' : 'dots-button next-page'"
        :aria-disabled="isDisabledNext"
        :tabindex="isDisabledNext ? -1 : 0"
        @click="!isDisabledNext && goToPage(currentPage + 1)"
      />

      <!-- Last -->
      <button
        :class="isDisabledNext ? 'dots-button last-page disabled' : 'dots-button last-page'"
        :aria-disabled="isDisabledNext"
        :tabindex="isDisabledNext ? -1 : 0"
        @click="!isDisabledNext && goToPage(totalPages)"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'

defineOptions({
  name: 'DotsPagination'
})

const props = defineProps({
  modelValue: { type: Number, required: true },
  totalPages: { type: Number, required: true },
  isTableLoading: { type: Boolean, default: false },
  documentsCountText: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])

const currentPage = ref(props.modelValue)
const pageInput = ref(String(currentPage.value))
const inputRef = ref(null)

let debounceTimer = null

// Computed disabled states
const isDisabledPrev = computed(() =>
  currentPage.value <= 1 || props.isTableLoading
)

const isDisabledNext = computed(() =>
  currentPage.value >= props.totalPages || props.isTableLoading
)

// Sync from parent
watch(() => props.modelValue, val => {
  currentPage.value = val
  pageInput.value = String(val)
})

// Debounced emit
function emitPage(val) {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    emit('update:modelValue', val)
  }, 300)
}

// Navigation
function goToPage(page) {
  if (props.isTableLoading) return

  let target = page
  if (target < 1) target = 1
  if (target > props.totalPages) target = props.totalPages

  currentPage.value = target
  pageInput.value = String(target)

  emitPage(target)

  //inputRef.value?.focus()
}

// Input logic
function onPageInput(e) {
  let value = e.target.value

  if (value === '') {
    pageInput.value = ''
    return
  }

  let num = Number(value)
  if (isNaN(num)) return

  if (num < 1) num = 1
  if (num > props.totalPages) num = props.totalPages

  currentPage.value = num
  pageInput.value = String(num)

  emitPage(num)
}

// Keyboard input
function onInputKeydown(e) {
  if (props.isTableLoading) return

  if (e.key === 'ArrowUp') {
    e.preventDefault()
    goToPage(currentPage.value + 1)
  }

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    goToPage(currentPage.value - 1)
  }

  if (e.key === 'Enter') {
    e.preventDefault()
    onBlur()
  }
}

// Keyboard navigation
function onContainerKeydown(e) {
  if (props.isTableLoading) return

  if (e.key === 'ArrowRight') {
    e.preventDefault()
    goToPage(currentPage.value + 1)
  }

  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    goToPage(currentPage.value - 1)
  }
}

// Blur
function onBlur() {
  if (pageInput.value === '') {
    pageInput.value = String(currentPage.value)
  }
}
</script>
<style scoped>

.pagination {
  gap: 20px;
  width: 100%;
  margin: 0;
}

.pagination-documents-count {
  align-self: flex-end;
  margin-right: auto;
  font-family: var(--font-primary), sans-serif;
  font-weight: 700;
  font-size: 24px;
  color: #000000;
  border: none;
}

.pagination-controls {
  display: flex;
  align-items: center;

  & > * {
    display: inline-block;
    margin-right: 4px;
  }
  & > input.current-page,
  & span.total-pages,
  & > span.label-sur-page {
    display: inline-block;
    width: var(--button-size);
    height: var(--button-size);
    line-height: 100%;
  }

  & > button,
  & > input.current-page,
  & span.total-pages,
  & > span.label-sur-page {
    display: inline-block;
    line-height: var(--button-size);
  }
  & span.total-pages {
    background-color: var(--default-bg-color);
    border-radius: var(--button-border-radius);
  }
  & > button {
    border: solid 1px transparent;

    &.disabled {
      cursor: not-allowed !important;
      opacity: 0.6;
    }

    &.first-page {
      background: var(--default-bg-color) url(../assets/images/page_debut.svg) center / 48% auto no-repeat;
    }

    &.previous-page {
      background: var(--default-bg-color) url(../assets/images/page_avant.svg) center / 64% auto no-repeat;
    }

    &.next-page {
      background: var(--default-bg-color) url(../assets/images/page_suivant.svg) center / 64% auto no-repeat;
    }

    &.last-page {
      background: var(--default-bg-color) url(../assets/images/page_fin.svg) center / 48% auto no-repeat;
      margin-right: 0;
    }

    /* Accessibility focus (important for WCAG) */
    &:focus-visible {
      outline: 2px solid #C00055;
      outline-offset: 2px;
    }
  }

  & > input.current-page {
    padding: 0 !important;
    border: 1px solid #dbdbdb;
    border-radius: var(--button-border-radius);

    font-family: inherit;
    color: #6e6e6e;
    font-weight: 800;
    text-align: center;
    text-decoration: none;

    &:focus {
      outline: 1px solid #C00055;
    }

    &:disabled {
      cursor: not-allowed !important;
      opacity: 0.6;
    }
  }

  /* Font sizes */

  & > input.current-page,
  & span.total-pages {
    font-size: 20px;
  }

  & > span.label-sur-page {
    font-size: 31px;
  }


  & > span.label-sur-page {
    width: auto;
    padding: 0 3px;
    font-family: inherit;
    color: #979797;
    font-weight: 400;
    text-align: center;
    text-transform: uppercase;
  }

  & > .page-box {
    display: flex !important;
    align-items: center;
    justify-content: center;

    & > span.total-pages {
      background-color: var(--default-bg-color);
      border-radius: var(--button-border-radius);
      font-family: inherit;
      color: #818181;
      text-align: center;
      font-weight: 600;
      text-transform: uppercase;

      &.dot-flash {
        width: 38px;
        height: 38px;

        background: linear-gradient(
            90deg,
            #eee 25%,
            #ddd 50%,
            #eee 75%
        );
        background-size: 200% 100%; /* width doubled for animation */
        animation: shimmer 1.4s ease infinite;
      }
    }
  }
}

.toc-mode .pagination {
  display: none !important;
}

.list-mode .pagination {
  border-bottom: solid 4px var(--fill-color);
}

/* Remove native number input */
/* Chrome, Safari, Edge, Opera */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* Firefox */
input[type=number] {
  -moz-appearance: textfield;
}


@media screen and (max-width: 768px) {

  /* Font sizes */
  .pagination-documents-count {
    font-size: 19px;
  }

  .pagination-controls  {
    & > input.current-page,
    & span.total-pages {
      font-size: 14px;
    }

    & > span.label-sur-page {
      font-size: 20px;
    }

  }
}

@media screen and (max-width: 640px) {
  .pagination-documents-count {
    margin-right: 0;
    align-self: center;
  }

  .pagination-controls {
    & > * {
      margin-right: 4px;
    }
  }

}

</style>