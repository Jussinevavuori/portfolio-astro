const overrides: Record<string, string> = {
  "next.js": "devicon:nextjs",
  stripe: "logos:stripe",
  "node.js": "devicon:nodejs",
  contentful: "logos:contentful",
  "dev.to": "simple-icons:devdotto",
  firebase: "logos:firebase",
  firestore: "vscode-icons:file-type-firestore",
  jitsi: "arcticons:jitsimeet",
  graphql: "logos:graphql",
  scrum: "simple-icons:scrumalliance",
  "google sheets": "devicon:google",
  "google apps script": "devicon:google",
  "socket.io": "logos:socket-io",
  "next auth": "simple-icons:auth0",
  sendgrid: "logos:sendgrid-icon",
  twilio: "logos:twilio-icon",
  vue: "logos:vue",
  nuxt: "logos:nuxt-icon",
  aws: "logos:aws",
  tailwind: "devicon:tailwindcss",
  drizzle: "simple-icons:drizzle",
  planetscale: "logos:planetscale",
  resend: "simple-icons:resend",
  clerk: "simple-icons:clerk",
  "shadcn/ui": "simple-icons:shadcnui",
  "google maps api": "logos:google-maps",
};

// https://icon-sets.iconify.design/
export function getTechnologyIconName(technology: string) {
  // Check manual overrides
  const override = overrides[technology.toLowerCase()];
  if (override) return override;

  // Adobe case
  if (technology.toLowerCase().startsWith("adobe ")) {
    return `logos:${technology.toLowerCase().replace(/\s/g, "-")}`;
  }

  return `devicon:${technology
    .toLowerCase()
    .replace(/\./g, "dot")
    .replace(/\s+/g, "")}`;
}
