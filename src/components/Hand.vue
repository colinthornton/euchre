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

const isVoid = computed(() => {
  const { cards, led, trump } = props;
  if (led === null) return false;
  return !cards.some((card) => card.sameSuit(led, trump));
});

function unplayable(card: Card): boolean {
  if (!props.active) return true;
  if (props.led === null) return false;
  if (isVoid.value) return false;
  return !card.sameSuit(props.led, props.trump);
}
</script>

<template>
  <TransitionGroup tag="section" name="card" id="hand" class="hand">
    <CardComponent
      v-for="(card, i) in sorted"
      :key="`${card.rank}-${card.suit}`"
      :card="card"
      :style="`--index: ${i};`"
      :class="{ unplayable: unplayable(card) }"
      :disabled="!active || unplayable(card)"
      @click="$emit('selectCard', card)"
    />
  </TransitionGroup>
</template>

<style scoped>
.hand {
  display: flex;
  margin-inline-start: calc(0.2 * var(--card-width));
  min-width: var(--card-width);
  position: relative;
}

.card {
  z-index: var(--index);
  margin-inline-start: calc(-0.2 * var(--card-width));
  transition: transform 400ms ease;
}

.unplayable {
  position: relative;
  transform: translateY(calc(0.2 * var(--card-height)));
}

.card::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
  transition: background ease 400ms;
  background: rgb(0, 0, 0, 0);
}

.unplayable::after {
  background: rgb(0, 0, 0, 0.4);
}

.card-enter-active {
  transition-delay: 200ms;
}

.card-leave-active {
  position: absolute;
  left: calc(var(--index) * calc(0.6 * var(--card-width)));
}

.card-enter-from,
.card-leave-to {
  transform: translateY(100%);
}
</style>
