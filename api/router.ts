import { createRouter, publicQuery } from "./middleware";

import { algorithmRouter } from "./routers/algorithm";
import { imageGenRouter } from "./routers/imageGen";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  algorithm: algorithmRouter,
  imageGen: imageGenRouter,
});

export type AppRouter = typeof appRouter;
