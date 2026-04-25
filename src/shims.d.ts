declare module "@amoutonbrady/lz-string" {
  export function decompressFromURL(input: string): string | null;
  export function compressToURL(input: string): string;
}
