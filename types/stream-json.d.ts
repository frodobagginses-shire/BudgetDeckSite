// Minimal ambient types for stream-json (no official @types package).
declare module "stream-json" {
  import { Transform } from "node:stream";
  export function parser(options?: unknown): Transform;
}
declare module "stream-json/streamers/StreamArray" {
  import { Transform } from "node:stream";
  export function streamArray(options?: unknown): Transform;
}
