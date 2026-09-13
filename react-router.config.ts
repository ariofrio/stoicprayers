import type { Config } from "@react-router/dev/config";
import prayers from "./app/content/prayers.json";

export default {
  ssr: false,
  prerender: ["/", "/about", ...prayers.map(({ id }) => `/prayers/${id}`)],
} satisfies Config;
