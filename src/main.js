
import './style.css';
import * as THREE from 'three';
import { OrbitControls } from
  'three/addons/controls/OrbitControls.js';

function setInitialCameraView(sceneName) {
  const location = activeFarm?.locations.find(
    loc => loc.scene === sceneName
  );

  if (!location || !location.cameraView) return;

  const yaw = THREE.MathUtils.degToRad(
    location.cameraView.yaw || 0
  );

  const pitch = THREE.MathUtils.degToRad(
    location.cameraView.pitch || 0
  );

  const direction = new THREE.Vector3(
    Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    -Math.cos(yaw) * Math.cos(pitch)
  );

  controls.target.copy(direction);
  controls.update();
}

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1100
);
camera.position.set(0, 0, 0.1);

const renderer = new THREE.WebGLRenderer({
  antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const geometry = new THREE.SphereGeometry(500, 60, 40);
geometry.scale(-1, 1, 1);

const loader = new THREE.TextureLoader();

// Store loaded panorama textures
const textureCache = new Map();
const texturePromises = new Map();

function getPanoramaTexture(path) {
  // Already loaded
  if (textureCache.has(path)) {
    return Promise.resolve(textureCache.get(path));
  }

  // Currently loading
  if (texturePromises.has(path)) {
    return texturePromises.get(path);
  }

  // Load for the first time
  const promise = new Promise((resolve, reject) => {
    loader.load(
      path,
      (texture) => {
        textureCache.set(path, texture);
        texturePromises.delete(path);
        resolve(texture);
      },
      undefined,
      (error) => {
        texturePromises.delete(path);
        reject(error);
      }
    );
  });

  texturePromises.set(path, promise);
  return promise;
}

function preloadFarmImages(farm, currentSceneName) {
  if (!farm || !farm.locations) return;

  farm.locations.forEach((location) => {
    // Skip the panorama currently being displayed
    if (location.scene === currentSceneName) return;

    const imagePath = scenes[location.scene];

    if (imagePath) {
      getPanoramaTexture(imagePath).catch((error) => {
        console.error('Preload failed:', imagePath, error);
      });
    }
  });
}

let activeFarm = null;

const arrowGroup = new THREE.Group();
scene.add(arrowGroup);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();


//images
const scenes = {
  //Iberica Farm
  ibericaFarm1: `${import.meta.env.BASE_URL}iberica/OUTSIDE GATE.jpg`,
  ibericaFarm2: `${import.meta.env.BASE_URL}iberica/START.jpg`,
  ibericaFarm3: `${import.meta.env.BASE_URL}iberica/2.jpg`,
  ibericaFarm4: `${import.meta.env.BASE_URL}iberica/3.jpg`,
  ibericaFarm5: `${import.meta.env.BASE_URL}iberica/4.jpg`,
  ibericaFarm6: `${import.meta.env.BASE_URL}iberica/BEFORE END PART FARM.jpg`,
  ibericaFarm7: `${import.meta.env.BASE_URL}iberica/END OF FARM.jpg`,
  ibericaFarmCanopyEggplant: `${import.meta.env.BASE_URL}iberica/RIGHT CANOPY EGGPLANT.jpg`,
  //Iberica Farm
  //Fatima Farm
  fatimaFarm1: `${import.meta.env.BASE_URL}fatima/GATE 1.jpg`,
  fatimaFarm2: `${import.meta.env.BASE_URL}fatima/GATE 2.jpg`,
  fatimaFarm3: `${import.meta.env.BASE_URL}fatima/AFTER GATE 4.jpg`,
  fatimaFarm4: `${import.meta.env.BASE_URL}fatima/AFTER GATE 5.jpg`,
  fatimaFarm5: `${import.meta.env.BASE_URL}fatima/AFTER GATE FINAL.jpg`,
  fatimaFarm6: `${import.meta.env.BASE_URL}fatima/BEGINNING SLOPE.jpg`,
  fatimaFarm7: `${import.meta.env.BASE_URL}fatima/SLOPE 1.jpg`,
  fatimaFarm8: `${import.meta.env.BASE_URL}fatima/SLOPE 2.jpg`,
  fatimaFarm9: `${import.meta.env.BASE_URL}fatima/AFTER NG SLOPE.jpg`,
  //Fatima Farm
  //Fundado Cow Farm
  cowFarmEntrance: `${import.meta.env.BASE_URL}fundado/1.jpg`,
  cowFarm2: `${import.meta.env.BASE_URL}fundado/2.jpg`,
  cowFarm3: `${import.meta.env.BASE_URL}fundado/3.jpg`,
  cowFarm4: `${import.meta.env.BASE_URL}fundado/4.jpg`,
  cowFarm5: `${import.meta.env.BASE_URL}fundado/5.jpg`,
  cowFarm6: `${import.meta.env.BASE_URL}fundado/6.jpg`,
  cowFarm7: `${import.meta.env.BASE_URL}fundado/6(1).jpg`,
  cowFarm8: `${import.meta.env.BASE_URL}fundado/7.jpg`,
  cowFarm9: `${import.meta.env.BASE_URL}fundado/8.jpg`,
  cowFarm10: `${import.meta.env.BASE_URL}fundado/9.jpg`,
  cowFarm11: `${import.meta.env.BASE_URL}fundado/10.jpg`,
  cowFarm12: `${import.meta.env.BASE_URL}fundado/11.jpg`,
  cowFarm13: `${import.meta.env.BASE_URL}fundado/12.jpg`,
  cowFarm14: `${import.meta.env.BASE_URL}fundado/13.jpg`,
  cowFarm15: `${import.meta.env.BASE_URL}fundado/14.jpg`,
  cowFarm16: `${import.meta.env.BASE_URL}fundado/15.jpg`,
  cowFarmMid: `${import.meta.env.BASE_URL}fundado/mid.jpg`,
  cowFarmLast: `${import.meta.env.BASE_URL}fundado/last.jpg`,
  //Fundado Cow Farm

  farm1: `${import.meta.env.BASE_URL}placeholder.jpg`,
  livingroom: `${import.meta.env.BASE_URL}livingroom.jpg`,
  bathroom: `${import.meta.env.BASE_URL}bathroom.jpg`,
  farm2: `${import.meta.env.BASE_URL}placeholder2.jpg`,
  farm3: `${import.meta.env.BASE_URL}placeholder3.jpg`,
  farm4: `${import.meta.env.BASE_URL}placeholder4.jpg`
};

let currentScene = 'farm1';

let sceneLoadRequest = 0;

async function loadScene(sceneName) {
  const imagePath = scenes[sceneName];

  if (!imagePath) {
    console.error('Scene not found:', sceneName);
    return;
  }

  const requestId = ++sceneLoadRequest;

  // Clear old navigation arrows and hotspots immediately.
  arrowGroup.clear();
  hotspotGroup.clear();

  // Close the information panel when changing locations.
  hotspotInfo.style.display = 'none';

  try {
    const texture = await getPanoramaTexture(imagePath);

    // Ignore an older request if another scene was selected.
    if (requestId !== sceneLoadRequest) return;

    const material = new THREE.MeshBasicMaterial({
      map: texture
    });

    const oldSphere = scene.getObjectByName('panorama');

    if (oldSphere) {
      scene.remove(oldSphere);
      oldSphere.material.dispose();
    }

    const sphere = new THREE.Mesh(geometry, material);
    sphere.name = 'panorama';
    scene.add(sphere);

    currentScene = sceneName;

    setInitialCameraView(sceneName);

    createGroundArrows(sceneName);
    createHotspots(sceneName);

  } catch (error) {
    console.error('Error loading texture:', imagePath, error);
  }
}



function createGroundArrows(sceneName) {
  arrowGroup.clear();

  if (!activeFarm) return;

  const location = activeFarm.locations.find(
    loc => loc.scene === sceneName
  );

  if (!location || !location.arrows) return;

  location.arrows.forEach((config) => {

    // Create a simple circular navigation marker
    const geometry = new THREE.CircleGeometry(0.35, 32);

    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      depthTest: false,
      depthWrite: false
    });

    const arrow = new THREE.Mesh(geometry, material);

    const yaw = THREE.MathUtils.degToRad(config.yaw || 0);
    const pitch = THREE.MathUtils.degToRad(config.pitch || 0);

    const position = new THREE.Vector3(
      Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      -Math.cos(yaw) * Math.cos(pitch)
    ).multiplyScalar(config.distance || 12);

    arrow.position.copy(position);

    const normal = position.clone().normalize();

    arrow.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      normal
    );

    arrow.rotateZ(config.rotation || 0);

    arrow.userData.target = config.target;
    arrow.renderOrder = 10;

    arrowGroup.add(arrow);
  });
}

const arrowTooltip = document.getElementById('arrow-tooltip');

let selectedArrow = null;

function getArrowAtPosition(x, y) {
  const rect = renderer.domElement.getBoundingClientRect();

  mouse.x = ((x - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((y - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const intersections = raycaster.intersectObjects(
    arrowGroup.children,
    true
  );

  return intersections.length > 0
    ? intersections[0].object
    : null;
}

function showArrowTooltip(arrow, x, y) {
  const target = arrow.userData.target;

  const destination = activeFarm?.locations.find(
    loc => loc.scene === target
  );

  arrowTooltip.textContent = destination
    ? destination.name
    : target;

  arrowTooltip.style.left = `${x}px`;
  arrowTooltip.style.top = `${y}px`;
  arrowTooltip.style.display = 'block';
}

renderer.domElement.addEventListener('pointermove', (event) => {
  if (event.pointerType !== 'mouse') return;

  const arrow = getArrowAtPosition(
    event.clientX,
    event.clientY
  );

  if (arrow) {
    showArrowTooltip(arrow, event.clientX, event.clientY);
  } else {
    arrowTooltip.style.display = 'none';
  }
});

renderer.domElement.addEventListener('pointerdown', (event) => {
  const arrow = getArrowAtPosition(
    event.clientX,
    event.clientY
  );

  if (arrow) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);

renderer.domElement.addEventListener('pointerup', (event) => {
  const arrow = getArrowAtPosition(
    event.clientX,
    event.clientY
  );

  if (!arrow) {
    selectedArrow = null;
    arrowTooltip.style.display = 'none';
    return;
  }

  event.stopImmediatePropagation();

  const target = arrow.userData.target;

  if (event.pointerType !== 'mouse') {
    if (selectedArrow !== arrow) {
      selectedArrow = arrow;

      showArrowTooltip(
        arrow,
        event.clientX,
        event.clientY
      );

      return;
    }
  }

  selectedArrow = null;
  arrowTooltip.style.display = 'none';

  if (target) {
    loadScene(target);
  }
});


const navMenu = document.createElement('div');
navMenu.className = 'nav-menu';
document.body.appendChild(navMenu);
navMenu.style.display = 'none';

const hotspotGroup = new THREE.Group();
scene.add(hotspotGroup);

const hotspotRaycaster = new THREE.Raycaster();
const hotspotMouse = new THREE.Vector2();

const hotspotInfo = document.getElementById('hotspot-info');
const hotspotTitle = document.getElementById('hotspot-title');
const hotspotDescription = document.getElementById('hotspot-description');
const closeHotspotButton = document.getElementById('close-hotspot');
const hotspotImage = document.getElementById('hotspot-image');
const previousImage = document.getElementById('previous-image');
const nextImage = document.getElementById('next-image');
const imageCounter = document.getElementById('image-counter');

let currentImages = [];
let currentImageIndex = 0;

function showHotspotImage() {
  if (currentImages.length === 0) return;

  hotspotImage.src = currentImages[currentImageIndex];

  imageCounter.textContent =
    `${currentImageIndex + 1} / ${currentImages.length}`;
}

previousImage.addEventListener('click', () => {
  if (currentImages.length === 0) return;

  currentImageIndex =
    (currentImageIndex - 1 + currentImages.length) % currentImages.length;

  showHotspotImage();
});

nextImage.addEventListener('click', () => {
  if (currentImages.length === 0) return;

  currentImageIndex =
    (currentImageIndex + 1) % currentImages.length;

  showHotspotImage();
});


function makeCircularTexture(imagePath) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;

  const context = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);

  // Draw a visible fallback while the thumbnail loads.
  context.fillStyle = '#ff3333';
  context.beginPath();
  context.arc(128, 128, 120, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = '#ffffff';
  context.font = 'bold 100px Arial';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('C', 128, 128);

  texture.needsUpdate = true;

  const image = new Image();

  image.onload = () => {
    const size = Math.min(image.width, image.height);
    const x = (image.width - size) / 2;
    const y = (image.height - size) / 2;

    context.clearRect(0, 0, 256, 256);

    context.save();
    context.beginPath();
    context.arc(128, 128, 128, 0, Math.PI * 2);
    context.clip();

    context.drawImage(
      image,
      x, y, size, size,
      0, 0, 256, 256
    );

    context.restore();
    texture.needsUpdate = true;
  };

  image.onerror = () => {
    console.error(
      'Could not load Canopy hotspot thumbnail:',
      imagePath
    );
  };

  image.src = imagePath;

  return texture;
}

// Function to create hotspots for the current scene
function createHotspots(sceneName) {
  hotspotGroup.clear();

  const hotspots = farmHotspots[sceneName] || [];

  hotspots.forEach((information) => {
    let hotspot;

    if (information.thumbnail) {
      const texture = makeCircularTexture(information.thumbnail);

      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true
      });

      hotspot = new THREE.Sprite(material);

      hotspot.scale.set(
        Math.max(information.size || 1, 1.5),
        Math.max(information.size || 1, 1.5),
        1
      );

      hotspot.renderOrder = 20;
      hotspot.material.depthTest = false;
      hotspot.material.depthWrite = false;

    } else {
      const geometry = new THREE.CircleGeometry(
        information.size || 0.5,
        32
      );

      const material = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        side: THREE.DoubleSide
      });

      hotspot = new THREE.Mesh(geometry, material);
      hotspot.lookAt(camera.position);
    }

    const yaw = THREE.MathUtils.degToRad(information.yaw || 0);
    const pitch = THREE.MathUtils.degToRad(information.pitch || 0);
    const distance = information.distance || 12;

    hotspot.position.set(
      Math.sin(yaw) * Math.cos(pitch) * distance,
      Math.sin(pitch) * distance,
      -Math.cos(yaw) * Math.cos(pitch) * distance
    );
    hotspot.userData.information = information;

    hotspotGroup.add(hotspot);
  });
}

renderer.domElement.addEventListener('pointerup', (event) => {
  const rect = renderer.domElement.getBoundingClientRect();

  hotspotMouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  hotspotMouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  hotspotRaycaster.setFromCamera(hotspotMouse, camera);

  const hits = hotspotRaycaster.intersectObjects(hotspotGroup.children);

  if (hits.length > 0) {
    const information = hits[0].object.userData.information;

    hotspotTitle.textContent = information.title;
    hotspotDescription.textContent = information.description;

    currentImages = information.images || [];
    currentImageIndex = 0;

    if (currentImages.length > 0) {
      showHotspotImage();
      hotspotImage.style.display = 'block';
    } else {
      hotspotImage.style.display = 'none';
    }

    hotspotInfo.style.display = 'block';
  }
});

closeHotspotButton.addEventListener('click', () => {
  hotspotInfo.style.display = 'none';
});

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.rotateSpeed = -0.3;
controls.enableZoom = false;

const minFov = 30;
const maxFov = 100;
const zoomSpeed = 3;

window.addEventListener('wheel', (event) => {
  camera.fov += event.deltaY * 0.01 * zoomSpeed;
  camera.fov = THREE.MathUtils.clamp(
    camera.fov,
    minFov,
    maxFov
  );
  camera.updateProjectionMatrix();
});

const startPosition = camera.position.clone();
const startTarget = controls.target.clone();

const resetButton = document.createElement('button');
resetButton.id = 'reset-button';
resetButton.style.display = 'none';
resetButton.textContent = 'Reset Camera';
resetButton.className = 'reset-button';
document.body.appendChild(resetButton);

resetButton.addEventListener('click', () => {
  camera.position.copy(startPosition);
  controls.target.copy(startTarget);
  camera.fov = 75;
  camera.updateProjectionMatrix();
  controls.update();
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

animate();

// FarmDataArrows
const farmOptions = [
  {
  name: 'Iberica Farm',
  thumbnail: `${import.meta.env.BASE_URL}iberica/OUTSIDE GATE.jpg`,
  scene: 'ibericaFarm1',
  type: 'The products of the farm.',
  location: 'Address of the farm.',
  description: 'Description of the farm.',

  locations: [
    {
      name: 'Gate',
      scene: 'ibericaFarm1',
      cameraView:{yaw:-90,pitch:0},
      arrows: [
        {
          yaw: -90,
          pitch:-20,
          rotation: 0.2,
          distance: 12,
          target: 'ibericaFarm2'
        }
      ]
    },

    {
      name: 'Inside the Farm',
      scene: 'ibericaFarm2',
      cameraView:{yaw:-90,pitch:0},
      arrows: [
        {
          yaw: -90,
          pitch:-20,
          rotation: 0,
          distance: 12,
          target: 'ibericaFarm3'
        },
        {
          yaw:90,
          pitch:-20,
          rotation:-0.5,
          distance: 15,
          target: 'ibericaFarm1'
        },
        {
          yaw:-30,
          pitch:-10,
          rotation:1.5,
          distance: 11,
          target: 'ibericaFarmCanopyEggplant'
        }
      ]
    },

    {
      name: 'Right Canopy Eggplant',
      scene: 'ibericaFarmCanopyEggplant',
      cameraView:{yaw:-90,pitch:0},
      arrows: [
        {
          yaw: 80,
          pitch:-20,
          rotation: -0.5,
          distance: 12,
          target: 'ibericaFarm3'
        }
      ]
    },

    {
      name: 'Path 1',
      scene: 'ibericaFarm3',

      arrows: [
        {
          yaw:-110,
          pitch:-15,
          rotation: 0,
          distance: 15,
          target: 'ibericaFarm4'
        },{
          yaw:70,
          pitch:-15,
          rotation: -0.2,
          distance: 12,
          target: 'ibericaFarm2'
        },
        {
          yaw:-50,
          pitch:-10,
          rotation: 1.5,
          distance: 18,
          target: 'ibericaFarm5'
        }
      ]
    },
    {
      name: 'Path 2',
      scene: 'ibericaFarm4',

      arrows: [
        {
          yaw:70,
          pitch:-5,
          rotation: -1.5,
          distance: 18,
          target: 'ibericaFarm5'
        },
        {
          yaw:100,
          pitch:-10,
          rotation: 0,
          distance: 15,
          target: 'ibericaFarm3'
        },
        {
          yaw:-90,
          pitch:-15,
          rotation: -1.2,
          distance: 15,
          target: 'ibericaFarm6'
        }
      ]
    },
    {
      name: 'Papaya Seedlings',
      scene: 'ibericaFarm5',

      arrows: [
        {
          yaw:85,
          pitch:-15,
          rotation: -0.5,
          distance: 12,
          target: 'ibericaFarm3'
        }
      ]
    },
    {
      name: 'Path 4',
      scene: 'ibericaFarm6',

      arrows: [
        {
          yaw:-85,
          pitch:-20,
          rotation: 0.5,
          distance: 17,
          target: 'ibericaFarm7'
        },
        {
          yaw:130,
          pitch:-20,
          rotation: 0.5,
          distance: 17,
          target: 'ibericaFarm4'
        }
      ]
    },
    {
      name: 'End of farm',
      scene: 'ibericaFarm7',

      arrows: [
        {
          yaw:120,
          pitch:-15,
          rotation: 0,
          distance: 15,
          target: 'ibericaFarm6'
        }
      ]
    }
  ]
},


  {name: 'Fatima Farm Gate',
    thumbnail: `${import.meta.env.BASE_URL}fatima/GATE 1.jpg`,
    scene: 'fatimaFarm1',
    type: 'This a Farm and a Resort.',
    location: 'Address of the farm.',
    description: 'This farm has Dragon fruits, Chickens and other amenities just like a regular resort it has a swimming pool.',

  locations:[
    {name: 'Entrance Gate',
    scene: 'fatimaFarm1',
    cameraView:{yaw:-90,pitch:0},
    arrows: [
      {
        yaw:-90,
        pitch:-15,
        rotation: 0,
        distance: 12,
        target: 'fatimaFarm2'
      }
    ]
  },
  {name: 'Entrance',
    scene: 'fatimaFarm2',
    arrows: [
      {
        yaw:-90,
        pitch:-5,
        rotation: 0,
        distance: 12,
        target: 'fatimaFarm3'
      },
      {
        yaw:130,
        pitch:-5,
        rotation: 0,
        distance: 12,
        target: 'fatimaFarm1'
      }
    ]
  },
  {name: 'Path 1',
    scene: 'fatimaFarm3',
    arrows: [
      {
        yaw:-100,
        pitch:-5,
        rotation: 0,
        distance: 12,
        target: 'fatimaFarm4'
      },
      {
        yaw:80,
        pitch:0,
        rotation: 0,
        distance: 12,
        target: 'fatimaFarm2'
      }
    ]
  },
  {name: 'Path 2',
    scene: 'fatimaFarm4',
    arrows: [
      {
        yaw:-123,
        pitch:-5,
        rotation: 0,
        distance: 12,
        target: 'fatimaFarm5'
      },
      {
        yaw:65,
        pitch:-2,
        rotation: 0,
        distance: 12,
        target: 'fatimaFarm3'
      }
    ]
  },
  {name: 'Path 3',
    scene: 'fatimaFarm5',
    arrows: [
      {
        yaw:-97,
        pitch:-5,
        rotation: 0,
        distance: 12,
        target: 'fatimaFarm6'
      },
      {
        yaw:94,
        pitch:-2,
        rotation: 0,
        distance: 12,
        target: 'fatimaFarm4'
      }
    ]
  },
  {name: 'Path 4',
    scene: 'fatimaFarm6',
    arrows: [
      {
        yaw:-97,
        pitch:-10,
        rotation: 0,
        distance: 12,
        target: 'fatimaFarm7'
      },
      {
        yaw:83,
        pitch:-2,
        rotation: 0,
        distance: 12,
        target: 'fatimaFarm5'
      }
    ]
  },
  {name: 'Path 5',
    scene: 'fatimaFarm7',
    arrows: [
      {
        yaw:-96,
        pitch:-5,
        rotation: 0,
        distance: 12,
        target: 'fatimaFarm8'
      },
      {
        yaw:65,
        pitch:-2,
        rotation: 0,
        distance: 12,
        target: 'fatimaFarm6'
      }
    ]
  },
  {name: 'Path 6',
    scene: 'fatimaFarm8',
    arrows: [
      {
        yaw:-95,
        pitch:-5,
        rotation: 0,
        distance: 12,
        target: 'fatimaFarm9'
      },
      {
        yaw:85,
        pitch:-2,
        rotation: 0,
        distance: 12,
        target: 'fatimaFarm7'
      }
    ]
  },
    ]
  },

//FarmFundado
  {name: 'Fundado Cow Farm',
    thumbnail: `${import.meta.env.BASE_URL}fundado/1.jpg`,
    scene: 'cowFarmEntrance',
    type: 'The products of the farm.',
    location: 'Address of the farm.',
    description: 'Description of the farm.',
    locations:[
      {name: 'Fundado Cow Farm Entrance',
        scene: 'cowFarmEntrance',
        cameraView: { yaw: -90, pitch: 0 },
        arrows: [{
          yaw: -90,
          pitch: -15,
          rotation: -0.9,
          distance: 12,
          target: 'cowFarm2'
        }]},
      {name: 'Fundado Cow Farm Path 1',
        scene: 'cowFarm2',
        cameraView: { yaw: -120, pitch: 0 },
        arrows: [{
          yaw: 95,
          pitch: -15,
          rotation: 0.1,
          distance: 12,
          target: 'cowFarmEntrance'
      },
      {
        yaw: -120,
        pitch:-15,
        rotation: -0.8,
        distance: 12,
        target: 'cowFarm4'
      }
          
      ]},
      {name: 'Fundado Cow Farm Path 2',
        scene: 'cowFarm4',
        cameraView: { yaw: -80, pitch: 0 },
        arrows: [{
          yaw: -80,
          pitch: -15,
          rotation: 0.6,
          distance: 12,
          target: 'cowFarm5'
        },{
          yaw: 87,
          pitch:-40,
          rotation: -0.2,
          distance: 12,
          target: 'cowFarm2'
        },
      ]},
      {name: 'Fundado Cow Farm Path 3',
        scene: 'cowFarm5',
        cameraView: { yaw: -80, pitch: 0 },
        arrows: [{
          yaw: -80,
          pitch:-10,
          rotation: 0.9,
          distance: 16,
          target: 'cowFarm6'
        },{
          yaw: 87,
          pitch:-15,
          rotation: -0.5,
          distance: 12,
          target: 'cowFarm4'
        },]},
      {name: 'Fundado Cow Farm Path 4',
        scene: 'cowFarm6',
        cameraView: { yaw: -70, pitch: 0 },
        arrows: [{
          yaw: -70,
          pitch:-15,
          rotation: 0.5,
          distance: 15,
          target: 'cowFarm7'
        },{
          yaw: 100,
          pitch:-15,
          rotation: -0.5,
          distance: 12,
          target: 'cowFarm5'
        },]},
      {name: 'Fundado Cow Farm path 5',
        scene: 'cowFarm7',
        cameraView: { yaw: -90, pitch: 0 },
        arrows: [{
          yaw:-90,
          pitch:-15,
          rotation: 0.40,
          distance: 15,
          target: 'cowFarm8'
        },{
          yaw: 75,
          pitch:-15,
          rotation: -0.5,
          distance: 12,
          target: 'cowFarm6'
        },]},

        {name: 'Fundado Cow Farm Barrels',
        scene: 'cowFarm8',
        cameraView: { yaw: -90, pitch: 0 },
        arrows: [{
          yaw:-92,
          pitch:-15,
          rotation: 0.25,
          distance: 12,
          target: 'cowFarm9'
        },{
          yaw: 0,
          pitch:-15,
          rotation: 2,
          distance: 12,
          target: 'cowFarm7'
        },]},

        {name: 'Fundado Cow Farm Barrels 2',
        scene: 'cowFarm9',
        cameraView: { yaw: -90, pitch: 0 },
        arrows: [{
          yaw: -96,
          pitch:-16,
          rotation: 0,
          distance: 12,
          target: 'cowFarm10'
        },{
          yaw: 87,
          pitch:-15,
          rotation: -0.2,
          distance: 12,
          target: 'cowFarm8'
        },]},
        {name: 'Fundado Cow Farm Barrels 3',
        scene: 'cowFarm10',
        cameraView: { yaw: -90, pitch: 0 },
        arrows: [{
          yaw: -75,
          pitch:-16,
          rotation: 0.5,
          distance: 12,
          target: 'cowFarm11'
        },{
          yaw: 105,
          pitch:-20,
          rotation: -0.2,
          distance: 12,
          target: 'cowFarm9'
        },]},
        {name: 'Fundado Cow Farm Barrels 4',
        scene: 'cowFarm11',
        cameraView: { yaw: -90, pitch: 0 },
        arrows: [{
          yaw: -96,
          pitch:-16,
          rotation: 0,
          distance: 12,
          target: 'cowFarm12'
        },{
          yaw: 82,
          pitch:-15,
          rotation: -0.2,
          distance: 12,
          target: 'cowFarm10'
        },]},
        {name: 'Fundado Cow Farm Cows',
        scene: 'cowFarm12',
        cameraView: { yaw: -90, pitch: 0 },
        arrows: [{
          yaw: -93,
          pitch:-16,
          rotation: 0.1,
          distance: 12,
          target: 'cowFarm13'
        },{
          yaw: 87,
          pitch:-15,
          rotation: -0.2,
          distance: 12,
          target: 'cowFarm11'
        },]},

        {name: 'Fundado Cow Farm Cows 2',
        scene: 'cowFarm13',
        cameraView: { yaw: -90, pitch: 0 },
        arrows: [{
          yaw: -90,
          pitch:-16,
          rotation: 0.150,
          distance: 12,
          target: 'cowFarmMid'
        },{
          yaw: 90,
          pitch:-15,
          rotation: -0.1,
          distance: 12,
          target: 'cowFarm12'
        },]},

        {name: 'Fundado Cow Farm Cows 3',
        scene: 'cowFarmMid',
        cameraView: { yaw: -90, pitch: 0 },
        arrows: [{
          yaw: -90,
          pitch:-16,
          rotation: 0.25,
          distance: 12,
          target: 'cowFarm15'
        },{
          yaw: 93,
          pitch:-16,
          rotation: -0.2,
          distance: 12,
          target: 'cowFarm13'
        },]},

        {name: 'Fundado Cow Farm Cows 4',
        scene: 'cowFarm15',
        cameraView: { yaw: -90, pitch: 0 },
        arrows: [{
          yaw: -18,
          pitch: -16,
          rotation: 1.5,
          distance: 12,
          target: 'cowFarm16'
        },{
          yaw: 165,
          pitch:-16,
          rotation: -0.1,
          distance: 12,
          target: 'cowFarmMid'
        },]},

        {name: 'Fundado Cow Farm Cows 5',
        scene: 'cowFarm14',
        cameraView: { yaw: -90, pitch: 0 },
        arrows: [{
          yaw: -90,
          pitch:-16,
          rotation: 0.25,
          distance: 12,
          target: 'cowFarm15'
        },{
          yaw: 87,
          pitch:-16,
          rotation: -0.199,
          distance: 12,
          target: 'cowFarm15'
        },]},

        {name: 'Fundado Cow Farm Exit',
        scene: 'cowFarm16',
        cameraView: { yaw: -90, pitch: 0 },
        arrows: [{
          yaw: -97,
          pitch:-16,
          rotation: 0.2,
          distance: 12,
          target: 'cowFarmLast'
        },{
          yaw: 80,
          pitch:-16,
          rotation: -0.5,
          distance: 12,
          target: 'cowFarm14'
        },]},
        
        {name: 'Fundado Cow Farm Outside Pens',
        scene: 'cowFarmLast',
        cameraView: { yaw: -90, pitch: 0 },
        arrows: [{
          yaw: 87,
          pitch:-16,
          rotation: -0.25,
          distance: 12,
          target: 'cowFarm16'
        }]},
    ]
  },


  {name: 'Farm 4',
    thumbnail: `${import.meta.env.BASE_URL}placeholder4.jpg`,
    scene: 'farm4',
    type: 'The products of the farm.',
    location: 'Address of the farm.',
    description: 'Description of the farm.',
    locations:[
      {name: 'Farm 4 - Location 1', scene: 'farm4'},
      //{name: 'Farm 4 - Location 2', scene: ''},
      //{name: 'Farm 4 - Location 3', scene: ''}
    ]
  }
];

//FarmHotspotData
const farmHotspots = {
  ibericaFarm2:[
  { 
    title: 'Canopy',
    description: 'In the right canopy they planted some eggplant and at the middle of the two structure there are Papaya Trees.',
    yaw:-45,
    pitch:-10,
    distance:12,
    size: 0.5,
    thumbnail: `${import.meta.env.BASE_URL}iberica/NEAR CANOPY.jpg`,
    images: [`${import.meta.env.BASE_URL}iberica/NEAR CANOPY.jpg`]
  }],
  farm2:[
    {
      title: 'Farm 2 Hotspot',
      description: 'This is a hotspot for Farm 2.',
      position: new THREE.Vector3(0, 0, -10),
      size: 0.5,
    }
  ]
};

//loadScene('farm1');

const farmMenu = document.createElement('section');
farmMenu.id = 'farm-selection-screen';

farmMenu.innerHTML = `
  <div class="farm-selection-container">
    <header class="farm-selection-inner">
      <p class="farm-menu-label">VR AgriExplore</p>
      <h1>Explore Camarines Norte Farms</h1>
      <p>Discover the unique characteristics and offerings of each farm in Camarines Norte.</p>
    </header>

    <h2 class="farm-menu-label">Select a Farm</h2>
    <div class="farm-grid">
      ${farmOptions.map((farm, index) => `
        <article class="farm-card">
          <div
            class="farm-card-image"
            style="background-image: url('${farm.thumbnail}');"
          ></div>

          <div class="farm-card-content">
            <h3>${farm.name}</h3>
            <p class="farm-card-type">${farm.type}</p>
            <p><strong>Location:</strong> ${farm.location}</p>
            <p class="farm-card-description">${farm.description}</p>
            <button
              type="button"
              class="farm-card-button" data-farm-index="${index}">
              Explore Farm 
            </button>
          </div>
        </article>
      `).join('')}
    </div>
    <p class="farm-menu-footer">Select A farm to begin your virtual tour.</p>
  </div>
`;
document.body.appendChild(farmMenu);

const openFarmMenuButton = document.createElement('button');
openFarmMenuButton.id = 'open-farm-menu';
openFarmMenuButton.textContent = 'Select Farm';
openFarmMenuButton.style.display = 'none';

document.body.appendChild(openFarmMenuButton);

farmMenu.querySelectorAll('.farm-card-button')
  .forEach((button) => {
    button.addEventListener('click', () => {
      const index = Number(button.dataset.farmIndex);
      const selectedFarm = farmOptions[index];
      console.log('Selected farm:', farmOptions[index].name);

      activeFarm = selectedFarm;

      loadScene(selectedFarm.scene);

      preloadFarmImages(selectedFarm, selectedFarm.scene);

      farmMenu.classList.add('is-hidden');
      openFarmMenuButton.style.display = 'block';

      resetButton.style.display = 'block';
    });
  });

  openFarmMenuButton.addEventListener('click', () => {
  farmMenu.classList.remove('is-hidden');
  openFarmMenuButton.style.display = 'none';
  
  resetButton.style.display = 'none';
});

farmMenu.style.backgroundImage =
  `url("${import.meta.env.BASE_URL}backgroundImg.jpg")`;



const TESTING_MODE = false;
const TEST_SCENE = 'fatimaFarm8';

if (TESTING_MODE) {
  farmMenu.style.display = 'none';

  openFarmMenuButton.style.display = 'none';

  resetButton.style.display = 'block';

  activeFarm = farmOptions.find(farm =>
    farm.locations.some(location => location.scene === TEST_SCENE)
  );

  loadScene(TEST_SCENE);
}