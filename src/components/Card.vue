<script setup lang="ts">
import { computed } from "vue";
import { displayRank, displaySuit, Suit, Rank } from "../game/cards";
import type { Card } from "../game/cards";

const props = withDefaults(
  defineProps<{
    card?: Card;
    disabled?: boolean;
    hidden?: boolean;
  }>(),
  { disabled: false, hidden: false }
);

const emit = defineEmits<{
  select: [];
}>();

const selectable = computed(() => !(props.hidden || props.disabled));

const tag = computed(() => (selectable.value ? "button" : "div"));

const suit = computed(() => {
  if (!props.card) return Suit.Spades;
  return props.card.suit;
});

const rank = computed(() => {
  if (!props.card) return Rank.Ace;
  return props.card.rank;
});

function handleSelect() {
  if (!selectable.value) return;
  emit("select");
}
</script>

<template>
  <component
    :is="tag"
    :class="['card', suit, { hidden }]"
    @pointerdown="handleSelect"
    :disabled="disabled"
  >
    <div class="front" v-if="!hidden">
      <div class="corner">
        <span class="rank">{{ displayRank(rank) }}</span>
        <span class="suit">{{ displaySuit(suit) }}</span>
      </div>
      <div class="face">{{ displaySuit(suit) }}</div>
      <div class="corner flipped">
        <span class="rank">{{ displayRank(rank) }}</span>
        <span class="suit">{{ displaySuit(suit) }}</span>
      </div>
    </div>
    <div class="back"></div>
  </component>
</template>

<style scoped>
.card {
  border-radius: var(--radius-3);
  width: var(--card-width);
  height: var(--card-height);
  position: relative;
  background: transparent;
  transform-style: preserve-3d;
  user-select: none;
}

.front,
.back {
  box-shadow: var(--shadow-6);
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: var(--radius-3);
  backface-visibility: hidden;
  transform-style: preserve-3d;
}

.front {
  display: flex;
  justify-content: space-between;
  background: var(--gray-0);
}

.back {
  border: var(--border-size-3) solid var(--gray-4);
  box-shadow: none;
  background: radial-gradient(var(--blue-11) 0, var(--blue-12) 70%),
    var(--noise-3);
  transform: rotateY(180deg);
}

.hidden .front {
  box-shadow: none;
  transform: rotateY(-180deg);
}

.hidden .back {
  transform: rotateY(0);
}

.card.hearts,
.card.diamonds {
  color: var(--red-7);
}

.corner {
  align-self: start;
  display: flex;
  flex-direction: column;
  justify-content: center;
  line-height: var(--font-lineheight-0);
}

.corner.flipped {
  transform: rotate(180deg);
  align-self: end;
}

.rank {
  font-size: var(--font-size-4);
}

.face {
  align-self: center;
  font-size: var(--font-size-8);
}

.card:disabled {
  cursor: default;
}
</style>
