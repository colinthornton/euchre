<script lang="ts" setup>
import { computed } from "vue";
import { useEuchreClient } from "../composables/useEuchreClient";
import { displaySuit, suits } from "../game/cards";
import type { ClientEvent } from "../game/euchre";

defineEmits<{
  event: [value: ClientEvent];
}>();

const { state } = useEuchreClient();

const showAuction = computed(() => {
  return state.value.phase === "auction" && state.value.active === 0;
});

const showOpen = computed(() => {
  return state.value.phase === "open" && state.value.active === 0;
});

const openSuits = computed(() => {
  const { revealed } = state.value;
  if (!revealed) return [];
  return suits().filter((suit) => suit !== revealed.suit);
});
</script>

<template>
  <div class="bid">
    <template v-if="showAuction">
      <button @click="$emit('event', { type: 'PASS' })">Pass</button>
      <button @click="$emit('event', { type: 'ORDER_UP' })">Order Up</button>
    </template>
    <template v-if="showOpen">
      <button
        v-for="suit of openSuits"
        @click="$emit('event', { type: 'CALL_SUIT', suit })"
      >
        {{ displaySuit(suit) }}
      </button>
    </template>
  </div>
</template>

<style scoped>
.bid {
  display: flex;
  justify-content: center;
  gap: var(--size-1);
}
</style>
