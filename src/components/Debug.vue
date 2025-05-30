<script lang="ts" setup>
import { computed } from "vue";
import { useEuchreClient } from "../composables/useEuchreClient";

const { state, event, next } = useEuchreClient();

const keys = [
  "phase",
  "dealer",
  "active",
  "trump",
  "exchanged",
  "taken",
  "score",
];

const output = computed(() => {
  const lines = [];
  Object.entries(state.value)
    .filter(([key]) => keys.includes(key))
    .forEach(([key, value]) => {
      lines.push([key, JSON.stringify(value)].join(": "));
    });
  lines.push(["event", event.value?.type].join(": "));
  return lines.join("\n");
});
</script>

<template>
  <details class="debug">
    <summary>Debug</summary>
    <code>
      <pre>{{ output }}</pre>
    </code>
    <button @click="next">Next event</button>
  </details>
</template>

<style scoped>
.debug {
  position: fixed;
  width: var(--size-content-2);
  max-height: 100dvh;
  overflow: auto;
  top: 0;
  left: 0;
  opacity: 0.1;
}

.debug:hover {
  opacity: 1;
}
</style>
