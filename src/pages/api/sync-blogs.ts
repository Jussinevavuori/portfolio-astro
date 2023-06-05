import { exportAllBlogsToContentMarkdown } from "src/utils/dev-to-blogs";

export async function get() {
  await exportAllBlogsToContentMarkdown();
  return { body: JSON.stringify({ result: "Ok" }) };
}
