<script lang="ts" setup>
import { computed, watch } from "vue";
import { useEuchreClient } from "../composables/useEuchreClient";
import { Suit } from "../game/cards";

const { state, event, next } = useEuchreClient();

watch(
  event,
  () => {
    if (
      event.value?.type === "ORDER_UP" &&
      state.value.active === state.value.dealer
    ) {
      // don't animate dealer telling themself to pick it up
      next();
    }
  },
  { immediate: true }
);

const area = computed(() => {
  if (!event.value) return;
  if (!["PASS", "ORDER_UP", "CALL_SUIT"].includes(event.value.type)) {
    return;
  }
  return { 1: "left", 2: "across", 3: "right" }[state.value.active];
});

const text = computed(() => {
  if (!event.value) return;
  if (event.value.type === "PASS") {
    return "Pass";
  }
  if (event.value.type === "ORDER_UP") {
    return "Pick it up";
  }
  if (event.value.type === "CALL_SUIT") {
    const { suit } = event.value;
    return {
      [Suit.Spades]: "Spades",
      [Suit.Clubs]: "Clubs",
      [Suit.Diamonds]: "Diamonds",
      [Suit.Hearts]: "Hearts",
    }[suit];
  }
});
</script>

<template>
  <span
    v-if="area === 'left'"
    class="speech-bubble left"
    @animationend="next"
    >{{ text }}</span
  >
  <span
    v-if="area === 'across'"
    class="speech-bubble across"
    @animationend="next"
    >{{ text }}</span
  >
  <span
    v-if="area === 'right'"
    class="speech-bubble right"
    @animationend="next"
    >{{ text }}</span
  >
</template>

<style scoped>
.speech-bubble {
  position: fixed;
  background: var(--gray-0);
  border-radius: var(--radius-1);
  padding: var(--size-3);
  animation: fade-in-out linear 1s forwards;
}

.left {
  left: 0;
  top: 50%;
  transform: translateY(-50%);
}

.across {
  top: 0;
  left: 50%;
  transform: translateX(-50%);
}

.right {
  right: 0;
  top: 50%;
  transform: translateY(-50%);
}

@keyframes fade-in-out {
  0%,
  100% {
    animation-timing-function: var(--ease-in-1);
    opacity: 0;
  }
  20%,
  80% {
    opacity: 1;
  }
}
</style>
