import { heavyBaseConfig } from "./jest.heavy.base.js";

/** @type {import('jest').Config} */
export default {
  ...heavyBaseConfig,
  roots: ["<rootDir>/tests/stress"],
};
