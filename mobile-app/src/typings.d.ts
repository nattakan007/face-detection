/// <reference types="node" />

declare module 'face-api.js' {
  export * from 'face-api.js';
}

// Fix WebGL type conflicts
declare var WebGL2RenderingContext: any;