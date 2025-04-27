<script setup lang="ts">
defineProps<{
  isDealer: boolean;
  tricksTaken: number;
}>();
</script>

<template>
  <div class="player-info">
    <div v-if="isDealer" class="dealer-button">Dealer</div>
  </div>
</template>

<style scoped>
.player-info {
  display: grid;
  align-items: end;
  transform: rotate(var(--rotation));
}

.dealer-button {
  border-radius: var(--radius-round);
  background: var(--stone-0);
  font-family: var(--font-handwritten);
  width: fit-content;
  padding: 0 var(--size-2);
}
</style>
