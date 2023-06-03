<script lang="ts">
  import { onDestroy } from "svelte";
  import { isMenuOpen } from "../stores/menuStore";

  const clickListener = (e: MouseEvent) => {
    if ($isMenuOpen) isMenuOpen.set(false);
  };
  const keyupListener = (e: KeyboardEvent) => {
    if (e.key === "Escape") isMenuOpen.set(false);
  };
  window.addEventListener("keyup", keyupListener);
  window.addEventListener("click", clickListener, { capture: true });
  onDestroy(() => {
    window.removeEventListener("keyup", keyupListener);
    window.removeEventListener("click", clickListener, { capture: true });
  });
</script>

{#if $isMenuOpen}
  <div
    class="animate-menu-in fixed -inset-8 p-8 backdrop-blur-sm bg-white/75 z-50"
  >
    <slot />
  </div>
{/if}

<style>
  .animate-menu-in {
    transform-origin: top right;
    animation: animate-menu-in 200ms forwards
      cubic-bezier(0.26, 1.57, 0.41, 0.83);
  }

  @keyframes animate-menu-in {
    from {
      scale: 60%;
      opacity: 0%;
    }
    to {
      scale: 100%;
      opacity: 100%;
    }
  }
</style>
