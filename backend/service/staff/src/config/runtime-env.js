import { readEnv } from "./env.js";

/** @type {ReturnType<typeof readEnv> | null} */
let runtimeEnv = null;

/**
 * @param {ReturnType<typeof readEnv>} env
 */
export function setRuntimeEnv(env) {
  runtimeEnv = env;
}

export function getRuntimeEnv() {
  return runtimeEnv ?? readEnv();
}

export function resetRuntimeEnvForTests() {
  runtimeEnv = null;
}
