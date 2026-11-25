import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // App mayormente dinámica (auth + DB por request): desactivamos el cacheado
  // de componentes para no tener que envolver cada página en <Suspense>.
  cacheComponents: false,
  partialPrefetching: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
