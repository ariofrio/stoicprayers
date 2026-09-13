import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("routes/index.tsx"),
  route("prayers/:id", "routes/prayer.tsx"),
  route("about", "routes/about.tsx"),
] satisfies RouteConfig;
