import GUI from "lil-gui";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import vertexShaders from "../shaders/vertex.glsl";
import fragmentShaders from "../shaders/fragment.glsl";

/**
 * Base
 */
// Debug
const gui = new GUI({
  width: 400,
});
const params = {
  clearColor: "#1a1a1a",
  lightColor: "#ffffff",
  fireColor: "#ff9633",
  portalColorStart: "#9b26e8",
  portalColorEnd: "#1204e8",
};

// Canvas
const canvas = document.querySelector("canvas.webgl");

// Scene
const scene = new THREE.Scene();

/**
 * Loaders
 */
// Texture loader
const textureLoader = new THREE.TextureLoader();
const bakedTexture = textureLoader.load("./portal-baked.jpg");
bakedTexture.flipY = false;
bakedTexture.colorSpace = THREE.SRGBColorSpace;

// Draco loader
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("draco/");

// Material
const bakedMaterial = new THREE.MeshBasicMaterial({
  map: bakedTexture,
});
const poleLightMaterial = new THREE.MeshBasicMaterial({
  color: params.lightColor,
});
const fireLightMaterial = new THREE.MeshBasicMaterial({
  color: params.fireColor,
});
const portalLightMaterial = new THREE.ShaderMaterial({
  vertexShader: vertexShaders,
  fragmentShader: fragmentShaders,
  uniforms: {
    uTime: new THREE.Uniform(0),

    uColorStart: new THREE.Uniform(new THREE.Color(params.portalColorStart)),
    uColorEnd: new THREE.Uniform(new THREE.Color(params.portalColorEnd)),
  },
});

// GLTF loader
const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

gltfLoader.load("./portal-baked.glb", (gltf) => {
  const bakedMesh = gltf.scene.children.find((item) => item.name === "baked");
  const poleLightA = gltf.scene.children.find(
    (item) => item.name === "poleLightA"
  );
  const poleLightB = gltf.scene.children.find(
    (item) => item.name === "poleLightB"
  );
  const torchLightA = gltf.scene.children.find(
    (item) => item.name === "torchLightA"
  );
  const torchLightB = gltf.scene.children.find(
    (item) => item.name === "torchLightB"
  );
  const fireLight = gltf.scene.children.find(
    (item) => item.name === "fireLight"
  );
  const portalLight = gltf.scene.children.find(
    (item) => item.name === "portalLight"
  );
  bakedMesh.material = bakedMaterial;
  poleLightA.material = poleLightMaterial;
  poleLightB.material = poleLightMaterial;
  torchLightA.material = poleLightMaterial;
  torchLightB.material = poleLightMaterial;
  fireLight.material = fireLightMaterial;
  portalLight.material = portalLightMaterial;

  scene.add(gltf.scene);
});

/**
 * Object
 */
const firefliesGeometry = new THREE.BufferGeometry();
const firefliesCount = 30;
const positionArray = new Float32Array(firefliesCount * 3);
const scaleArray = new Float32Array(firefliesCount);

for (let i = 0; i < firefliesCount; i++) {
  positionArray[i * 3 + 0] = (Math.random() - 0.5) * 6;
  positionArray[i * 3 + 1] = Math.random() * 4;
  positionArray[i * 3 + 2] = (Math.random() - 0.5) * 6;

  scaleArray[i] = Math.random();
}

firefliesGeometry.setAttribute(
  "position",
  new THREE.BufferAttribute(positionArray, 3)
);
firefliesGeometry.setAttribute(
  "aScale",
  new THREE.BufferAttribute(scaleArray, 1)
);

const firefliesMaterial = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  uniforms: {
    uPixelRatio: new THREE.Uniform(Math.min(window.devicePixelRatio, 2)),
    uSize: new THREE.Uniform(300),

    uTime: new THREE.Uniform(0),
  },
  vertexShader: `
attribute float aScale;

  uniform float uPixelRatio;
  uniform float uSize;
  uniform float uTime;
 void main()
{
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    modelPosition.y += sin(uTime + modelPosition.x * 100.0) * aScale * 0.2; 
    
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectionPosition = projectionMatrix * viewPosition;

    gl_Position = projectionPosition;
    gl_PointSize = uSize * aScale * uPixelRatio;
    gl_PointSize *= (1.0 / - viewPosition.z);
}
    `,
  fragmentShader: `
    void main()
{
    float distance = distance(gl_PointCoord,vec2(0.5));
    float strength = 0.05 / distance - 0.1;
    gl_FragColor = vec4(1.0,0.0, 1.0, strength);
}
    `,
});

// Points
const fireflies = new THREE.Points(firefliesGeometry, firefliesMaterial);
scene.add(fireflies);

/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

window.addEventListener("resize", () => {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  firefliesMaterial.uniforms.uPixelRatio.value = Math.min(
    window.devicePixelRatio,
    2
  );
});

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(
  45,
  sizes.width / sizes.height,
  0.1,
  100
);
camera.position.x = -10;
camera.position.y = 5;
camera.position.z = 10;
camera.lookAt(0, 0, 0);
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
});
renderer.setClearColor(params.clearColor);
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

/**
 * Animate
 */
const clock = new THREE.Clock();

// Audio
const listener = new THREE.AudioListener();
camera.add(listener);

// create a global audio source
const sound = new THREE.Audio(listener);

// load a sound and set it as the Audio object's buffer
const audioLoader = new THREE.AudioLoader();
audioLoader.load("./minecraft.ogg", function (buffer) {
  sound.setBuffer(buffer);
  sound.setLoop(true);
  sound.setVolume(0.5);
  // Remove automatic play
});

// Add click event listener to start audio
window.addEventListener(
  "click",
  () => {
    if (!sound.isPlaying) {
      sound.play();
    }
  },
  { once: true }
); // 'once: true' means the listener will be removed after first click

// Debug
gui
  .addColor(params, "clearColor")
  .name("Pole Light Color")
  .onChange((e) => renderer.setClearColor(e));
gui
  .addColor(params, "lightColor")
  .name("Pole Light Color")
  .onChange((e) => poleLightMaterial.color.set(e));
gui
  .addColor(params, "fireColor")
  .name("Fire Light Color")
  .onChange((e) => fireLightMaterial.color.set(e));
gui
  .addColor(params, "portalColorStart")
  .name("Portal Light Color A")
  .onChange(
    (e) => (portalLightMaterial.uniforms.uColorStart.value = new THREE.Color(e))
  );
gui
  .addColor(params, "portalColorEnd")
  .name("Portal Light Color B")
  .onChange(
    (e) => (portalLightMaterial.uniforms.uColorEnd.value = new THREE.Color(e))
  );
gui
  .add(firefliesMaterial.uniforms.uSize, "value")
  .min(0)
  .max(500)
  .step(1)
  .name("firefliesSize");

const tick = () => {
  const elapsedTime = clock.getElapsedTime();

  portalLightMaterial.uniforms.uTime.value = elapsedTime;
  firefliesMaterial.uniforms.uTime.value = elapsedTime;

  // Update controls
  controls.update();

  // Render
  renderer.render(scene, camera);

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};

tick();
