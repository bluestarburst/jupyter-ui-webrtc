declare module 'prettier/standalone' {
  import type { Options, Plugin } from '@types/prettier';
  export function format(source: string, options: Options & { plugins: Plugin[] }): Promise<string>;
}

declare module 'prettier/parser-postcss' {
  import type { Plugin } from '@types/prettier';
  const plugin: Plugin;
  export default plugin;
}

declare module 'prettier/parser-html' {
  import type { Plugin } from '@types/prettier';
  const plugin: Plugin;
  export default plugin;
}

declare module 'prettier/parser-babel' {
  import type { Plugin } from '@types/prettier';
  const plugin: Plugin;
  export default plugin;
}

declare module 'prettier/plugins/estree' {
  import type { Plugin } from '@types/prettier';
  const plugin: Plugin;
  export default plugin;
}

declare module 'prettier/parser-markdown' {
  import type { Plugin } from '@types/prettier';
  const plugin: Plugin;
  export default plugin;
}

declare module 'prettier/parser-typescript' {
  import type { Plugin } from '@types/prettier';
  const plugin: Plugin;
  export default plugin;
} 