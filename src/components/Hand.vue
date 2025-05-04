<script setup lang="ts">
import { computed } from "vue";
import { Suit, type Card } from "../game/cards";
import CardComponent from "./Card.vue";
import { animate } from "animejs";

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

function playCard(el: Element, done: () => void) {
  if (!(el instanceof HTMLElement)) return;
  animate(el, {
    y: { to: "100%" },
    duration: 5000,
  }).then(done);
}
</script>

<template>
  <TransitionGroup tag="section" name="card" id="hand" class="hand">
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
  opacity: 0;
  min-width: var(--card-width);
  position: relative;
}

.card-enter-active,
.card-leave-active,
.card-move {
  transition: transform 400ms ease;
}

.card-leave-active {
  position: absolute;
  left: calc(var(--index) * calc(0.6 * var(--card-width)));
}

.card-enter-from,
.card-leave-to {
  transform: translateY(100%);
}

.card {
  z-index: var(--index);
  transform-origin: 50% 100%;
  margin-inline-start: calc(-0.2 * var(--card-width));
}
</style>
