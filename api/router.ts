import { createRouter, publicQuery } from "./middleware";

import { imageGenRouter } from "./routers/imageGen";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  imageGen: imageGenRouter,
});

export type AppRouter = typeof appRouter;
