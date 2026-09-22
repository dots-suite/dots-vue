<template>
  <div
    class="icon-wrapper"
    :style="cssVars"
  >
    <svg
      class="icon"
      viewBox="0 0 42 42"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <g fill="currentColor">
        <path fill="currentColor" transform="translate(8.95035 8.9999)" d="M2.4292743 22C1.7612239 22 1.1891298 21.760445 0.71299201 21.282555C0.23806889 20.803444 0 20.227777 0 19.555555L0 4.8888888C0 4.2166667 0.23806889 3.641 0.71299201 3.1618888C1.1891298 2.684 1.7612239 2.4444444 2.4292743 2.4444444L6.2553816 2.4444444L8.5024605 0L15.790283 0L18.037363 2.4444444L21.86347 2.4444444C22.531521 2.4444444 23.103615 2.684 23.579752 3.1618888C24.054676 3.641 24.292744 4.2166667 24.292744 4.8888888L24.292744 19.555555C24.292744 20.227777 24.054676 20.803444 23.579752 21.282555C23.103615 21.760445 22.531521 22 21.86347 22L2.4292743 22ZM12.146372 15.277778C11.296126 15.277778 10.577061 14.982 9.9903908 14.391666C9.4037209 13.801333 9.1097794 13.077778 9.1097794 12.222222C9.1097794 11.366667 9.4037209 10.643111 9.9903908 10.052778C10.577061 9.4624443 11.296126 9.166667 12.146372 9.166667C12.996618 9.166667 13.715683 9.4624443 14.302353 10.052778C14.889023 10.643111 15.182965 11.366667 15.182965 12.222222C15.182965 13.077778 14.889023 13.801333 14.302353 14.391666C13.715683 14.982 12.996618 15.277778 12.146372 15.277778L12.146372 15.277778ZM12.146372 17.722221C13.664668 17.722221 14.955828 17.18689 16.018635 16.118668C17.081444 15.049222 17.61224 13.75 17.61224 12.222222C17.61224 10.694445 17.081444 9.3952227 16.018635 8.325778C14.955828 7.2563334 13.664668 6.7222223 12.146372 6.7222223C10.628076 6.7222223 9.336916 7.2563334 8.2741089 8.325778C7.2125158 9.3952227 6.6805048 10.694445 6.6805048 12.222222C6.6805048 13.75 7.2125158 15.049222 8.2741089 16.118668C9.336916 17.18689 10.628076 17.722221 12.146372 17.722221L12.146372 17.722221Z" fill-rule="evenodd"/>
      </g>
    </svg>
  </div>
</template>

<script setup>
const props = defineProps({
  bgColor: { type: String, default: 'transparent' },
  fgColor: { type: String, default: 'var(--icon-fg)' },
  size: { type: Number, default: 42 },
  radius: { type: Number, default: 4 },
  strokeWidth: { type: Number, default: 1 }
})

const cssVars = {
  '--bg': props.bgColor,
  '--fg': props.fgColor,
  '--size': `${props.size}px`,
}
</script>

<style scoped>
.icon-wrapper {
  --bg: #ffffff;

  background-color: var(--bg);
  color: var(--fill-color, var(--icon-text-color));
  border: var(--fill-color) solid 1px;

  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
}

.disabled .icon-wrapper {
  color: #e5e5e5;
  border-color: #e5e5e5;
}

.icon-wrapper.active {
  color: #FFF;
  background-color: var(--fill-color);
}

/* Touch: the press itself gives the feedback hover used to */
@media (hover: none) {
  .images-mode .icon-wrapper,
  .icon-wrapper:active {
    color: #FFF;
    background-color: var(--fill-color);
  }
}

.icon {
  width: 100%;
  height: 100%;
}

</style>
