import { createRouter, publicQuery } from "./middleware";
import { algorithmRouter } from "./routers/algorithm";
import { imageGenRouter } from "./routers/imageGen";
import { authRouter } from "./routers/auth";
import { billingRouter } from "./routers/billing";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  algorithm: algorithmRouter,
  imageGen: imageGenRouter,
  auth: authRouter,
  billing: billingRouter,
});

export type AppRouter = typeof appRouter;
