<script lang="ts">
  import { getTechnologyIconName } from "src/utils/getTechnologyIconName";
  import { onDestroy, onMount } from "svelte";

  const technologies = [
    "TypeScript",
    "React",
    "Next.js",
    "tRPC",
    "Google Cloud",
    "AWS",
    "Vercel",
    "Heroku",
    "Node.js",
    "TailwindCSS",
    "JavaScript",
    "Docker",
    "PostgreSQL",
    "MySQL",
    "Prisma",
    "Astro",
    "Svelte",
    "HTML5",
    "CSS3",
    "Scrum",
    // ---
    "Vue",
    "Nuxt",
    "Redux",
    "Express",
    "GraphQL",
    "Gatsby",
    "Next Auth",
    "Material UI",
    "WordPress",
    "Google Apps Script",
    "Jitsi",
    "Socket.io",
    "Firestore",
    "Contentful",
    "Firebase",
    "Stripe",
    "Twilio",
    "Jitsi",
    "Figma",
    "Git",
    "MongoDB",
    "Redis",
    "SASS",
    "Scala",
    "Sendgrid",
    "PHP",
    "Python",
    "Adobe XD",
    "Adobe Illustrator",
    "Adobe Photoshop",
  ].map((item, i) => {
    const size = 30 + Math.random() * 30;
    const x = Math.random();
    const y = Math.random();

    return {
      x,
      y,
      size,
      item,
      i,
    };
  });

  let listener: null | ((e: MouseEvent) => void) = null;
  onMount(() => {
    listener = (e: MouseEvent) => {
      for (const tech of technologies) {
        // Get element
        const el = document.querySelector(
          `div[data-tech-i="${tech.i}"]`
        ) as HTMLDivElement | null;
        const translateEl = document.querySelector(
          `div[data-tech-translator-i="${tech.i}"]`
        ) as HTMLDivElement | null;
        if (!el || !translateEl) return;

        const mass = tech.size * 0.01;

        // Element rectangle and center coordinates
        const rect = el.getBoundingClientRect();
        const elCenterX = rect.left + rect.width / 2;
        const elCenterY = rect.top + rect.height / 2;

        // Vector from mouse to element (Epsilon bias)
        const dMouseX = elCenterX - e.clientX + Number.EPSILON;
        const dMouseY = elCenterY - e.clientY + Number.EPSILON;
        const dMouse2 = dMouseX * dMouseX + dMouseY * dMouseY;
        const dMouse = Math.sqrt(dMouse2);

        // Force from mouse
        const fMouseFactor = 10;
        const fMouseX = (fMouseFactor * dMouseX) / (dMouse * mass);
        const fMouseY = (fMouseFactor * dMouseY) / (dMouse * mass);

        // Force towards origin
        const fOriginFactor = 100;
        const dOriginX = fMouseX;
        const dOriginY = fMouseY;
        const dOrigin2 = dOriginX * dOriginX + dOriginY + dOriginY;
        const fOriginY = (fOriginFactor * dOriginX) / (dOrigin2 * mass);
        const fOriginX = (fOriginFactor * dOriginY) / (dOrigin2 * mass);

        // Total movement is combination of force vectors
        const mX = fMouseX;
        const mY = fMouseY;
        // const mX = fMouseX - fOriginX;
        // const mY = fMouseY - fOriginY;

        translateEl.style.transform = `translate(${mX}px, ${mY}px)`;
      }
    };
    window.addEventListener("mousemove", listener);
  });
  onDestroy(() => {
    if (listener) {
      window.removeEventListener("mousemove", listener);
    }
  });
</script>

<div class="flex flex-col gap-16">
  <p class="text-black/70 text-center pt-8 text-sm" />
  <div class="border w-full aspect-video relative">
    {#each technologies as { item, size, x, y, i }}
      <div
        data-tech-i={i}
        class="flex items-center gap-2 absolute border border-red-500 -translate-x-1/2 -translate-y-1/2"
        style:font-size={`${size}px`}
        style:left={`${x * 100}%`}
        style:top={`${y * 100}%`}
        style:z-index={technologies.length - 1}
      >
        <div data-tech-translator-i={i}>
          <iconify-icon icon={getTechnologyIconName(item)} />
        </div>
      </div>
    {/each}
  </div>
</div>
