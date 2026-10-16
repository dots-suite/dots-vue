<template>
  <a
    role="button"
    class="navbar-burger"
    :class="menuCssClass"
    aria-label="menu"
    aria-expanded="false"
    @click="toggleBurger"
  >
    <span aria-hidden="true"></span>
    <span aria-hidden="true"></span>
    <span aria-hidden="true"></span>
  </a>
</template>

<script>
import { computed, ref, watch } from 'vue'

export default {
  name: 'BurgerButton',
  props: {
    opened: {
      required: false,
      default: false,
      type: Boolean
    }
  },
  emits: [
    'change'
  ],
  setup (props, context) {
    const isMenuOpened = ref(false)

    const toggleBurger = function ($event) {
      $event.preventDefault()
      $event.stopPropagation()
      isMenuOpened.value = !isMenuOpened.value
      context.emit('change', { isOpened: isMenuOpened.value })
    }

    const menuCssClass = computed(() => {
      return isMenuOpened.value ? 'is-active' : ''
    })

    watch(props, (newProps) => {
      isMenuOpened.value = newProps.opened
    })

    return {
      toggleBurger,
      menuCssClass,
    }
  }

}
</script>

<style>
  a.navbar-burger {
    display: block;
    border: none;
    width: 30px;
    height: 30px;
  }
  /* 30x30, like the app's other buttons on mobile (--button-size):
     three 3px lines, from 15px above the centre to 15px below */
  .navbar-burger span {
    width: 30px;
    background-color: #FFFFFF;
    height: 3px;
    right: 0;
    left: unset;
  }
  .navbar-burger span:nth-child(1) {
    top: calc(50% - 15px);
  }
  .navbar-burger span:nth-child(2) {
    top: calc(50% - 1.5px);
  }
  .navbar-burger span:nth-child(3) {
    top: calc(50% + 12px);
  }

  .navbar-burger span {
    transition: background 0s 0.3s;
  }

  .navbar-burger span:nth-child(1),
  .navbar-burger span:nth-child(3) {
    transition-duration: 0.3s, 0.3s;
    transition-delay: 0.3s, 0s;
  }

  .navbar-burger span:nth-child(1) {
    transition-property: top, transform;
  }

  .navbar-burger span:nth-child(3) {
    transition-property: top, transform;
  }

  .navbar-burger.is-active span:nth-child(1) {
    top: 50%;
    transform: rotate(45deg);
  }

  .navbar-burger.is-active span:nth-child(2) {
    background: none;
  }

  .navbar-burger.is-active span:nth-child(3) {
    top: 50%;
    transform: rotate(-45deg);
  }

  .navbar-burger.is-active span:nth-child(1),
  .navbar-burger.is-active span:nth-child(3) {
    transition-delay: 0s, 0.3s;
  }

</style>
