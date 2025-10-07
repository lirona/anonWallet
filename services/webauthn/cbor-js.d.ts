declare module 'cbor-js' {
  export function decode(buffer: ArrayBuffer): any;
  export function encode(value: any): ArrayBuffer;
}
