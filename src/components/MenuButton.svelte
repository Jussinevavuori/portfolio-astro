<script lang="ts">
  import { isMenuOpen } from "../stores/menuStore";
</script>

<button
  class="flex flex-col gap-1.5 p-5 -m-5"
  on:click={() => isMenuOpen.set(!$isMenuOpen)}
>
  <div class="flex flex-row gap-1.5">
    <span class="rounded-full h-1.5 w-1.5 bg-black/90" />
    <span class="rounded-full h-1.5 w-1.5 bg-black/90" />
  </div>
  <div class="flex flex-row gap-1.5">
    <span class="rounded-full h-1.5 w-1.5 bg-black/90" />
    <span class="rounded-full h-1.5 w-1.5 bg-black/90" />
  </div>
</button>
