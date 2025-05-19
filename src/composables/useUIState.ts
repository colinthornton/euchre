import { ref, watch } from "vue";
import type { Ref } from "vue";
import type { useServerEuchre } from "./useServerEuchre";
import { Queue } from "../utilities/Queue";

type Context = ReturnType<typeof useServerEuchre>["context"]["value"];

export function useUIState(serverContext: Ref<Context>) {
  const updateQueue = new Queue<Context>();
  const context = ref(serverContext.value);
  const event = ref(serverContext.value.events[0]);

  watch(serverContext, (update) => updateQueue.enqueue(update));

  function next() {
    if (updateQueue.size > 0) {
      context.value = updateQueue.dequeue();
    }
  }

  return {
    context,
    event,
    next,
  };
}
