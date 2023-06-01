<script lang="ts">
  import { onMount } from "svelte";

  let isVisible = false;
  let hoverText: undefined | string = undefined;
  let cleanupFn: undefined | (() => void) = undefined;

  onMount(() => {
    // Get all <a /> elements with data-hover-text
    const hoverTextElements = [
      ...document.querySelectorAll("a[data-hover-text]"),
    ] as HTMLAnchorElement[];

    const mouseInCallbacks = hoverTextElements.map((el) => {
      const callback = () => {
        hoverText = el.dataset.hoverText;
        isVisible = true;
      };
      el.addEventListener("mouseover", callback);
      return callback;
    });

    const mouseOutCallbacks = hoverTextElements.map((el) => {
      const callback = () => {
        isVisible = false;
      };
      el.addEventListener("mouseout", callback);
      return callback;
    });

    cleanupFn = () => {
      hoverTextElements.forEach((el, i) =>
        el.removeEventListener("mouseover", mouseInCallbacks[i])
      );
      hoverTextElements.forEach((el, i) =>
        el.removeEventListener("mouseout", mouseOutCallbacks[i])
      );
    };
  });
</script>

<div
  data-active={isVisible ? hoverText : undefined}
  class="whitespace-nowrap bg-white border rounded-full px-2 py-1 absolute left-1/2 -translate-x-1/2 -bottom-10 opacity-0 data-[active]:opacity-100 transition-all"
>
  <span>
    {hoverText?.split(";")[0] ?? ""}
  </span>
  <span class="mx-2"> · </span>
  <span class="font-normal">
    {hoverText?.split(";")[1] ?? ""}
  </span>
</div>
