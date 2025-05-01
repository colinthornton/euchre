<script setup lang="ts">
import { computed } from "vue";
import { displayRank, displaySuit } from "../game/cards";
import type { Card } from "../game/cards";

const props = withDefaults(
  defineProps<{
    card: Card;
    disabled?: boolean;
    hidden?: boolean;
  }>(),
  { disabled: false, hidden: false }
);

const emit = defineEmits<{
  select: [];
}>();

const selectable = computed(() => !(props.disabled || props.hidden));

const tag = computed(() => (selectable.value ? "button" : "div"));

function handleSelect() {
  if (!selectable.value) return;
  emit("select");
}
</script>

<template>
  <component :is="tag" :class="['card', card.suit]" @pointerdown="handleSelect">
    <div class="corner">
      <span class="rank">{{ displayRank(card.rank) }}</span>
      <span class="suit">{{ displaySuit(card.suit) }}</span>
    </div>
    <div class="face">{{ displaySuit(card.suit) }}</div>
    <div class="corner flipped">
      <span class="rank">{{ displayRank(card.rank) }}</span>
      <span class="suit">{{ displaySuit(card.suit) }}</span>
    </div>
  </component>
</template>

<style scoped>
.card {
  background: var(--gray-0);
  border: var(--border-size-1) solid var(--gray-4);
  border-radius: var(--radius-3);
  width: var(--card-width);
  height: var(--card-height);
  box-shadow: var(--shadow-6);
  display: flex;
  justify-content: space-between;
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
