<script setup lang="ts">
import { computed } from "vue";
import { Suit, type Card } from "../game/cards";
import CardComponent from "./Card.vue";

const props = defineProps<{
  cards: Card[];
  trump: Suit | null;
  active: boolean;
  led: Card | null;
}>();

defineEmits<{
  selectCard: [card: Card];
}>();

const sorted = computed(() => {
  const suits: Map<Suit, Card[]> = new Map();
  for (const card of props.cards) {
    const suit =
      props.trump && card.isTrump(props.trump) ? props.trump : card.suit;
    const cards = suits.get(suit) ?? [];
    cards.push(card);
    cards.sort((a, b) => a.compare(b, props.trump));
    suits.set(suit, cards);
  }

  const cards: Card[] = [];
  if (props.trump) {
    cards.unshift(...(suits.get(props.trump) ?? []));
    suits.delete(props.trump);
  }
  for (const suit of suits.values()) {
    cards.unshift(...suit);
  }
  return cards;
});
</script>

<template>
  <TransitionGroup tag="section" name="hand" id="hand" class="hand">
    <CardComponent
      v-for="(card, i) in sorted"
      :key="`${card.rank}-${card.suit}`"
      :card="card"
      :style="`--index: ${i};`"
      class="card"
      :disabled="!active"
      @click="$emit('selectCard', card)"
    />
  </TransitionGroup>
</template>

<style scoped>
.hand {
  display: flex;
  margin-inline-start: calc(0.2 * var(--card-width));
  transform: translateY(var(--card-height));
  position: relative;
}

.hand-move,
.hand-enter-active,
.hand-leave-active {
  transition: all 0.5s ease-out;
}
.hand-enter-from,
.hand-leave-to {
  animation: leave-hand 0.5s ease-out;
}
.hand-leave-active {
  position: absolute;
}

@keyframes leave-hand {
  from {
    transform: translateX(calc(var(--index) * calc(0.8 * var(--card-width))));
  }
  to {
    transform: translateX(calc(var(--index) * calc(0.8 * var(--card-width))))
      translateY(var(--card-height));
  }
}

.card {
  z-index: var(--index);
  transform-origin: 50% 100%;
  margin-inline-start: calc(-0.2 * var(--card-width));
}
</style>
