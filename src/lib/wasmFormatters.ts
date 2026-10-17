/**
 * Formatters compiled to WebAssembly, from the wasm-fmt project: clang-format
 * (C, C++, Java, C#), gofmt, Ruff (Python), Mago (PHP), StyLua (Lua) and
 * shfmt (shell). Each is loaded only when its language is used.
 *
 * The .wasm files are bundled into their script as base64 instead of being
 * fetched, because the page's Content Security Policy blocks every request
 * (connect-src 'none'). Compiling them needs script-src 'wasm-unsafe-eval'.
 */

function bytes(dataUrl: string): Uint8Array {
  const binary = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/**
 * Load a formatter once: its JS glue and its wasm. Compiling is async (so the
 * page never freezes), then the glue's initSync takes the compiled module; its
 * async init would expect a fetch Response.
 */
function once<T>(load: () => Promise<[{ initSync: (module: WebAssembly.Module) => unknown } & T, { default: string }]>) {
  let ready: Promise<T> | null = null;
  return () =>
    (ready ??= load().then(async ([mod, wasm]) => {
      mod.initSync(await WebAssembly.compile(bytes(wasm.default) as BufferSource));
      return mod;
    }));
}

export const clangFormat = once(() => Promise.all([import('@wasm-fmt/clang-format/web'), import('@wasm-fmt/clang-format/wasm?inline')]));
export const gofmt = once(() => Promise.all([import('@wasm-fmt/gofmt/web'), import('@wasm-fmt/gofmt/wasm?inline')]));
export const ruff = once(() => Promise.all([import('@wasm-fmt/ruff_fmt/web'), import('@wasm-fmt/ruff_fmt/wasm?inline')]));
export const mago = once(() => Promise.all([import('@wasm-fmt/mago_fmt/web'), import('@wasm-fmt/mago_fmt/wasm?inline')]));
export const luaFmt = once(() => Promise.all([import('@wasm-fmt/lua_fmt/web'), import('@wasm-fmt/lua_fmt/wasm?inline')]));
export const shfmt = once(() => Promise.all([import('@wasm-fmt/shfmt/web'), import('@wasm-fmt/shfmt/wasm?inline')]));
