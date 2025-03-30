declare module 'prettier' {
  export interface Options {
    parser?: string;
    plugins?: any[];
    [key: string]: any;
  }

  export interface Plugin {
    parsers?: Record<string, any>;
    printers?: Record<string, any>;
    options?: Record<string, any>;
    languages?: any[];
  }
} 