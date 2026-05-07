import { createRouter, publicQuery } from "./middleware";
import { algorithmRouter } from "./routers/algorithm";
import { imageGenRouter } from "./routers/imageGen";
import { authRouter } from "./routers/auth";
import { billingRouter } from "./routers/billing";
import { historyRouter } from "./routers/history";
import { exportRouter } from "./routers/export";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  algorithm: algorithmRouter,
  imageGen: imageGenRouter,
  auth: authRouter,
  billing: billingRouter,
  history: historyRouter,
  export: exportRouter,
});

export type AppRouter = typeof appRouter;
