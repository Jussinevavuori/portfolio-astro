export function getTechnologyIconName(technology: string) {
  switch (technology.toLowerCase()) {
    case "next.js":
      return "cib:next-js";
    case "stripe":
      return "logos:stripe";
    case "node.js":
      return "devicon:nodejs";
    case "contentful":
      return "logos:contentful";
    case "dev.to":
      return "simple-icons:devdotto";
    case "firebase":
      return "logos:firebase";
    case "firestore":
      return "vscode-icons:file-type-firestore";
    case "jitsi":
      return "arcticons:jitsimeet";
    case "graphql":
      return "logos:graphql";
    case "scrum":
      return "simple-icons:scrumalliance";
    case "google sheets":
      return "devicon:google";
    case "google apps script":
      return "devicon:google";
    case "socket.io":
      return "logos:socket-io";
    case "next auth":
      return "simple-icons:auth0";
    case "sendgrid":
      return "logos:sendgrid-icon";
    case "twilio":
      return "logos:twilio-icon";
    case "vue":
      return "logos:vue";
    case "nuxt":
      return "logos:nuxt-icon";
    case "aws":
      return "logos:aws";

    default:
      // Adobe case
      if (technology.toLowerCase().startsWith("adobe ")) {
        return `logos:${technology.toLowerCase().replace(/\s/g, "-")}`;
      }

      return `devicon:${technology
        .toLowerCase()
        .replace(/\./g, "dot")
        .replace(/\s+/g, "")}`;
  }
}
