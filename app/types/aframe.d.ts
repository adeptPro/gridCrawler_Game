  // File: aframe.d.ts (in your project root)

  // You must have @types/three installed in your frontend project:
  // npm install --save-dev @types/three
  // or
  // yarn add --dev @types/three
  import * as THREE from 'three'; 

  declare global {
    interface Window {
      THREE?: typeof THREE; // Makes THREE available on the window object for TypeScript
      AFRAME?: any;         // Optional: if you need to access AFRAME global
    }
  }

// File: aframe.d.ts (in your project root)

// This declaration tells TypeScript that custom elements like <a-scene> exist
// and can accept any properties. This is a common way to handle web components
// or custom elements in JSX when detailed prop typing isn't immediately necessary
// or is complex to set up.

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
    // Add any other A-Frame elements you might use if they also cause errors
  }
}
