<script lang="ts" setup>
import { computed } from "vue";
import { useEuchreClient } from "../composables/useEuchreClient";

const { state, context, next } = useEuchreClient();

const keys = ["dealer", "active", "trump", "exchanged", "taken", "score"];

const output = computed(() => {
  const lines = [];
  lines.push(["state", state.value].join(": "));
  Object.entries(context.value)
    .filter(([key]) => keys.includes(key))
    .forEach(([key, value]) => {
      lines.push([key, JSON.stringify(value)].join(": "));
    });
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
