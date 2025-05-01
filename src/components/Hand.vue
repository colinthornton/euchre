<script setup lang="ts">
import type { Card } from "../game/cards";
import CardComponent from "./Card.vue";

defineProps<{ cards: Card[] }>();

defineEmits<{
  selectCard: [card: Card];
}>();
</script>

<template>
  <section class="hand">
    <CardComponent
      v-for="(card, i) in cards"
      :card="card"
      :style="`--index: ${i};`"
      class="card"
      @click="$emit('selectCard', card)"
    />
  </section>
</template>

<style scoped>
.hand {
  display: flex;
  margin-inline-start: var(--size-8);
}

.hand .card {
  z-index: var(--index);
  transform-origin: 50% 100%;
  margin-inline-start: calc(-1 * var(--size-8));
}
</style>
