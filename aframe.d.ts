// File: aframe.d.ts (in your project root)

declare namespace JSX {
  interface IntrinsicElements {
    'a-scene': any;
    'a-entity': any;
    'a-camera': any;
    'a-sphere': any;
    'a-cylinder': any;
    'a-box': any;
    'a-cone': any;
    'a-plane': any;
    'a-sky': any;
    'a-light': any;
    'a-assets': any;
    'a-text': any;
  }
}


// import * as THREE from 'three'; 

declare global {
  interface Window {
    THREE?: any; // Makes THREE available on the window object for TypeScript
    AFRAME?: any;         // Optional: if you need to access AFRAME global
  }
}