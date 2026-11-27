
import './style.css';
import * as THREE from 'three';
import { VRButton } from
  'three/addons/webxr/VRButton.js';
import { OrbitControls } from
  'three/addons/controls/OrbitControls.js';

function setInitialCameraView(sceneName) {
  const location = activeFarm?.locations.find(
    loc => loc.scene === sceneName
  );

  if (!location || !location.cameraView) return;

  const horizontal = THREE.MathUtils.degToRad(
    location.cameraView.horizontal || 0
  );

  const vertical = THREE.MathUtils.degToRad(
    location.cameraView.vertical || 0
  );

  const direction = new THREE.Vector3(
    Math.sin(horizontal) * Math.cos(vertical),
    Math.sin(vertical),
    -Math.cos(horizontal) * Math.cos(vertical)
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

const gazeReticle = new THREE.Group();

const dot = new THREE.Group();
dot.add(
  new THREE.Mesh(
    new THREE.CircleGeometry(0.006, 24, 0, Math.PI),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      depthTest: false,
      depthWrite: false
    })
  ),
  new THREE.Mesh(
    new THREE.CircleGeometry(0.006, 24, Math.PI, Math.PI),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      depthTest: false,
      depthWrite: false
    })
  )
);

const ring = new THREE.Group();
const ringTop = new THREE.Mesh(
  new THREE.RingGeometry(0.015, 0.020, 32, 1, 0, Math.PI),
  new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.9,
    depthTest: false,
    depthWrite: false
  })
);
const ringBottom = new THREE.Mesh(
  new THREE.RingGeometry(0.015, 0.020, 32, 1, Math.PI, Math.PI),
  new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.9,
    depthTest: false,
    depthWrite: false
  })
);

ring.add(ringTop, ringBottom);
ring.renderOrder = 1000;
dot.renderOrder = 1000;

gazeReticle.add(dot);
gazeReticle.add(ring);
gazeReticle.renderOrder = 1000;

// Tooltip canvas
const tooltipCanvas = document.createElement('canvas');
tooltipCanvas.width = 512;
tooltipCanvas.height = 96;

const tooltipContext = tooltipCanvas.getContext('2d');

const tooltipTexture = new THREE.CanvasTexture(tooltipCanvas);

const tooltipSprite = new THREE.Sprite(
  new THREE.SpriteMaterial({
    map: tooltipTexture,
    transparent: true,
    depthTest: false,
    depthWrite: false
  })
);

// Position the tooltip below the reticle
tooltipSprite.scale.set(0.42, 0.079, 1);
tooltipSprite.position.set(0, -0.10, 0.01);
tooltipSprite.renderOrder = 1001;

gazeReticle.add(tooltipSprite);
tooltipSprite.visible = false;

// Update tooltip text
let lastTooltipMessage = '';

function setGazeTooltip(message) {
  if (message === lastTooltipMessage) return;

  lastTooltipMessage = message;

  tooltipContext.clearRect(
    0, 0,
    tooltipCanvas.width,
    tooltipCanvas.height
  );

  tooltipContext.fillStyle = 'rgba(246, 250, 242, 0.96)';
  tooltipContext.beginPath();
  tooltipContext.roundRect(4, 4, 504, 88, 20);
  tooltipContext.fill();

  tooltipContext.strokeStyle = 'rgba(31, 65, 41, 0.7)';
  tooltipContext.lineWidth = 3;
  tooltipContext.stroke();

  tooltipContext.fillStyle = '#111a12';
  tooltipContext.font = 'bold 28px Arial';
  tooltipContext.textAlign = 'center';
  tooltipContext.textBaseline = 'middle';

  tooltipContext.fillText(
    message,
    256,
    48
  );

  tooltipTexture.needsUpdate = true;
}

gazeReticle.position.set(0, 0, -1);

camera.add(gazeReticle);
scene.add(camera);

gazeReticle.visible = false;

// Gaze information HUD
const gazeCanvas = document.createElement('canvas');
gazeCanvas.width = 512;
gazeCanvas.height = 128;

const gazeContext = gazeCanvas.getContext('2d');
const gazeTexture = new THREE.CanvasTexture(gazeCanvas);

const gazeHud = new THREE.Sprite(
  new THREE.SpriteMaterial({
    map: gazeTexture,
    transparent: true,
    depthTest: false
  })
);

gazeHud.scale.set(0.65, 0.16, 1);
gazeHud.position.set(0, -0.12, -1);
gazeHud.visible = false;

camera.add(gazeHud);

const gazeRaycaster = new THREE.Raycaster();
const gazeOrigin = new THREE.Vector3();
const gazeDirection = new THREE.Vector3();

const GAZE_DURATION = 2000;
const HOTSPOT_GAZE_DURATION = 2000;

let gazeHotspot = null;
let gazeHotspotStartTime = 0;
let gazeHotspotOpening = false;
let gazeTarget = null;
let gazeStartTime = 0;
let gazeDwellConsumed = false;
let gazeNavigating = false;
const gazeDirectionAtPanelClose = new THREE.Vector3();
let gazeMustMoveAfterPanelClose = false;
const gazeMenuInitialDirection = new THREE.Vector3();
let gazeMenuDirectionInitialized = false;
let gazeMenuSelectionArmed = false;

function updateGazeHUD(sceneName, countdown) {
  gazeContext.clearRect(0, 0, 512, 128);

  gazeContext.fillStyle = 'rgba(0, 0, 0, 0.7)';
  gazeContext.beginPath();
  gazeContext.roundRect(20, 10, 472, 108, 20);
  gazeContext.fill();

  gazeContext.fillStyle = 'white';
  gazeContext.font = 'bold 30px Arial';
  gazeContext.textAlign = 'center';
  gazeContext.fillText(sceneName, 256, 53);

  gazeContext.font = '26px Arial';
  gazeContext.fillText(
    countdown ? `Navigating in ${countdown}...` : '',
    256,
    90
  );

  gazeTexture.needsUpdate = true;
}

function resetGazeDwell() {
  gazeTarget = null;
  gazeStartTime = 0;
  gazeDwellConsumed = false;
  tooltipSprite.visible = false;
  ring.scale.setScalar(1);
  ringTop.material.color.set(0xffffff);
}

function updateGazeDwell(
  target,
  label,
  activate,
  duration = HOTSPOT_GAZE_DURATION
) {
  if (gazeTarget !== target) {
    gazeTarget = target;
    gazeStartTime = performance.now();
    gazeDwellConsumed = false;
  }

  if (gazeDwellConsumed) {
    tooltipSprite.visible = false;
    return;
  }

  const elapsed = performance.now() - gazeStartTime;
  const progress = Math.min(elapsed / duration, 1);
  const remaining = Math.max(
    0,
    Math.ceil((duration - elapsed) / 1000)
  );

  ring.scale.setScalar(1 + progress * 0.5);
  ringTop.material.color.set(0x00ff88);
  tooltipSprite.visible = true;
  setGazeTooltip(`${label} in ${remaining}...`);

  if (progress >= 1) {
    gazeDwellConsumed = true;
    tooltipSprite.visible = false;
    ring.scale.setScalar(1);
    ringTop.material.color.set(0xffffff);
    activate();
  }
}


function updateGazeNavigation() {
  if (!renderer.xr.isPresenting) {
    gazeReticle.visible = false;
    dot.visible = true;
    ring.visible = true;
    tooltipSprite.visible = false;

    gazeTarget = null;
    gazeStartTime = 0;
    gazeDwellConsumed = false;
    gazeMustMoveAfterPanelClose = false;
    gazeMenuDirectionInitialized = false;
    gazeMenuSelectionArmed = false;

    return;
  }

  gazeReticle.visible = true;
  dot.visible = true;
  ring.visible = true;

  if (gazeNavigating) {
    tooltipSprite.visible = false;
    return;
  }

  const xrCamera = renderer.xr.getCamera(camera);

  xrCamera.updateMatrixWorld(true);
  if (vrMenuNeedsPlacement) {
    placeVRFarmMenu(xrCamera);
  }
  if (vrBackToFarmsNeedsPlacement) {
    placeVRBackToFarmsButton(xrCamera);
  }

  gazeRaycaster.camera = xrCamera;
  xrCamera.getWorldPosition(gazeOrigin);
  xrCamera.getWorldDirection(gazeDirection);
  gazeRaycaster.set(gazeOrigin, gazeDirection);

  if (gazeMustMoveAfterPanelClose) {
    const movedEnough = gazeDirection.angleTo(
      gazeDirectionAtPanelClose
    ) >= THREE.MathUtils.degToRad(8);

    if (!movedEnough) {
      resetGazeDwell();
      tooltipSprite.visible = true;
      setGazeTooltip('Look away to continue');
      return;
    }

    gazeMustMoveAfterPanelClose = false;
  }

  if (vrHotspotPanel.visible) {
    vrHotspotPanel.updateMatrixWorld(true);
    const panelHit = gazeRaycaster
      .intersectObjects(vrHotspotPanel.children, true)
      .find(hit =>
        hit.object.visible && hit.object.userData.vrAction
      );

    if (!panelHit) {
      resetGazeDwell();
      return;
    }

    const action = panelHit.object.userData.vrAction;
    const labels = {
      close: 'Close information',
      previous: vrPanelView === 'showcase'
        ? 'Previous product'
        : 'Previous image',
      next: vrPanelView === 'showcase'
        ? 'Next product'
        : 'Next image',
      'previous-showcase-image': 'Previous product image',
      'next-showcase-image': 'Next product image',
      showcase: vrPanelView === 'showcase'
        ? 'Return to hotspot info'
        : 'Open agricultural showcase'
    };

    updateGazeDwell(
      panelHit.object,
      labels[action] || 'Use button',
      () => activateVRPanelAction(action)
    );
    return;
  }

  if (vrMenuGroup.visible) {
    if (vrMenuOpen) {
      if (!gazeMenuDirectionInitialized) {
        gazeMenuInitialDirection.copy(gazeDirection);
        gazeMenuDirectionInitialized = true;
      }

      const movedFromMenuOpen = gazeDirection.angleTo(
        gazeMenuInitialDirection
      ) >= THREE.MathUtils.degToRad(12);

      if (!gazeMenuSelectionArmed && movedFromMenuOpen) {
        gazeMenuSelectionArmed = true;
      }

      if (!gazeMenuSelectionArmed) {
        resetGazeDwell();
        tooltipSprite.visible = true;
        setGazeTooltip('Look around to choose a farm');
        return;
      }
    }

    vrMenuGroup.updateMatrixWorld(true);
    const menuHit = gazeRaycaster
      .intersectObjects(vrMenuGroup.children, true)
      .find(hit => hit.object.userData.action);

    if (menuHit) {
      const { action, farmIndex } = menuHit.object.userData;
      const farm = farmOptions[farmIndex];
      const label = action === 'select-farm'
        ? `Select ${farm?.name || 'farm'}`
        : 'Open farm menu';

      updateGazeDwell(
        menuHit.object,
        label,
        () => handleVRMenuSelection(menuHit.object),
        HOTSPOT_GAZE_DURATION
      );
      return;
    }

    if (vrMenuOpen) {
      resetGazeDwell();
      return;
    }
  }

  if (vrBackToFarmsGroup.visible) {
    vrBackToFarmsGroup.updateMatrixWorld(true);
    const backHit = gazeRaycaster
      .intersectObjects(vrBackToFarmsGroup.children, true)
      .find(hit => hit.object.userData.action);

    if (backHit) {
      updateGazeDwell(
        backHit.object,
        'Going back to farm selection',
        () => handleVRMenuSelection(backHit.object)
      );
      return;
    }
  }

  // 1. Check hotspots first.
  hotspotGroup.updateMatrixWorld(true);
  const hotspotHits = gazeRaycaster.intersectObjects(
    hotspotGroup.children,
    true
  );

  const hotspotHit = hotspotHits.find(
    hit => hit.object.userData.information
  );

  if (hotspotHit) {
    const target = hotspotHit.object;
    const information = target.userData.information;

    if (gazeTarget !== target) {
      gazeTarget = target;
      gazeStartTime = performance.now();
    }

    const elapsed = performance.now() - gazeStartTime;

    const progress = Math.min(
      elapsed / HOTSPOT_GAZE_DURATION,
      1
    );

    const remaining = Math.max(
      0,
      Math.ceil(
        (HOTSPOT_GAZE_DURATION - elapsed) / 1000
      )
    );

    ring.scale.setScalar(1 + progress * 0.5);
    ringTop.material.color.set(0x00ff88);

    tooltipSprite.visible = true;

    setGazeTooltip(
      `Opening ${information.title} in ${remaining}...`
    );

    if (progress >= 1) {
      openVRHotspot(target);

      gazeTarget = null;
      gazeStartTime = 0;

      tooltipSprite.visible = false;

      ring.scale.setScalar(1);
      ringTop.material.color.set(0xffffff);
    }

    return;
  }

  // 2. Check navigation arrows.
  const arrowHits = gazeRaycaster.intersectObjects(
    arrowGroup.children,
    true
  );

  const arrowHit = arrowHits.find(
    hit => hit.object.userData.target
  );

  if (!arrowHit) {
    resetGazeDwell();
    return;
  }

  const arrow = arrowHit.object;
  const target = arrow.userData.target;

  if (gazeTarget !== target) {
    gazeTarget = target;
    gazeStartTime = performance.now();
  }

  const elapsed = performance.now() - gazeStartTime;

  const progress = Math.min(
    elapsed / GAZE_DURATION,
    1
  );

  const remaining = Math.max(
    0,
    Math.ceil((GAZE_DURATION - elapsed) / 1000)
  );

  const destination = activeFarm?.locations.find(
    location => location.scene === target
  );

  const destinationName = destination
    ? destination.name
    : target;

  ring.scale.setScalar(1 + progress * 0.4);
  ringTop.material.color.set(0xffffff);

  tooltipSprite.visible = true;

  setGazeTooltip(
    `Going to ${destinationName} in ${remaining}...`
  );

  if (progress >= 1) {
    gazeNavigating = true;

    tooltipSprite.visible = false;

    loadScene(target).finally(() => {
      gazeNavigating = false;
      gazeTarget = null;
      gazeStartTime = 0;

      ring.scale.setScalar(1);
      ringTop.material.color.set(0xffffff);
    });
  }
}




const renderer = new THREE.WebGLRenderer({
  antialias: true
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType('local');

renderer.xr.addEventListener('sessionstart', () => {
  console.log('VR mode started');

  gazeReticle.visible = true;
  tooltipSprite.visible = false;

  gazeTarget = null;
  gazeStartTime = 0;
});

renderer.xr.addEventListener('sessionend', () => {
  console.log('VR mode ended');

  gazeReticle.visible = false;
  tooltipSprite.visible = false;

  gazeTarget = null;
  gazeStartTime = 0;

  ring.scale.setScalar(1);
});

document.body.appendChild(renderer.domElement);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(
  VRButton.createButton(renderer)
);

const geometry = new THREE.SphereGeometry(500, 48, 32);
geometry.scale(-1, 1, 1);

const loader = new THREE.TextureLoader();

const textureCache = new Map();
const texturePromises = new Map();

const MAX_CACHED_PANORAMAS = 3;

let currentPanoramaPath = null;

function trimTextureCache() {
  while (textureCache.size > MAX_CACHED_PANORAMAS) {

    const oldestPath = [...textureCache.keys()].find(
      path => path !== currentPanoramaPath
    );

    if (!oldestPath) break;

    const oldTexture = textureCache.get(oldestPath);

    oldTexture.dispose();
    textureCache.delete(oldestPath);
  }
}

async function getPanoramaTexture(path) {

  if (textureCache.has(path)) {
    const texture = textureCache.get(path);

    textureCache.delete(path);
    textureCache.set(path, texture);

    return texture;
  }

  if (texturePromises.has(path)) {
    return texturePromises.get(path);
  }

  const promise = new Promise((resolve, reject) => {
    loader.load(
      path,
      texture => {
        textureCache.set(path, texture);
        resolve(texture);
      },
      undefined,
      reject
    );
  });

  texturePromises.set(path, promise);

  try {
    return await promise;
  } finally {
    texturePromises.delete(path);
    trimTextureCache();
  }
}


let activeFarm = null;

const arrowGroup = new THREE.Group();
scene.add(arrowGroup);

const vrMenuGroup = new THREE.Group();

vrMenuGroup.position.set(0, 0, -2.5);
vrMenuGroup.visible = false;

camera.add(vrMenuGroup);

const vrBackToFarmsGroup = new THREE.Group();
vrBackToFarmsGroup.visible = false;
scene.add(vrBackToFarmsGroup);

let vrMenuOpen = false;
let vrMenuNeedsPlacement = false;
let vrBackToFarmsNeedsPlacement = false;


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
  closeVRHotspot();

  arrowGroup.clear();
  hotspotGroup.clear();

  hotspotInfo.style.display = 'none';

  try {
    const texture = await getPanoramaTexture(imagePath);

    // Ignore outdated loading requests.
    if (requestId !== sceneLoadRequest) {
      return;
    }

    const oldSphere = scene.getObjectByName('panorama');

    if (oldSphere) {
      scene.remove(oldSphere);
      oldSphere.material.dispose();
    }

    const material = new THREE.MeshBasicMaterial({
      map: texture
    });

    const sphere = new THREE.Mesh(geometry, material);
    sphere.name = 'panorama';

    scene.add(sphere);

    currentPanoramaPath = imagePath;

    currentScene = sceneName;

    setInitialCameraView(sceneName);

    createGroundArrows(sceneName);
    createHotspots(sceneName);

    if (
      renderer.xr.isPresenting &&
      vrBackToFarmsGroup.children.length > 0
    ) {
      vrBackToFarmsNeedsPlacement = true;
    }

    trimTextureCache();

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

    const horizontal = THREE.MathUtils.degToRad(config.horizontal || 0);
    const distance = config.distance || 12;
    arrow.scale.setScalar(distance / 12);

    const position = new THREE.Vector3(
      Math.sin(horizontal),
      0,
      -Math.cos(horizontal)
    ).multiplyScalar(distance);

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
const hotspotAreaTab = document.getElementById('hotspot-area-tab');
const hotspotShowcaseTab = document.getElementById('hotspot-showcase-tab');
const hotspotAreaView = document.getElementById('hotspot-area-view');
const hotspotShowcaseView = document.getElementById('hotspot-showcase-view');
const showcaseImage = document.getElementById('showcase-image');
const showcaseImagePlaceholder = document.getElementById(
  'showcase-image-placeholder'
);
const previousShowcaseImage = document.getElementById(
  'previous-showcase-image'
);
const nextShowcaseImage = document.getElementById(
  'next-showcase-image'
);
const showcaseImageCounter = document.getElementById(
  'showcase-image-counter'
);
const showcaseProductSelector = document.getElementById(
  'showcase-product-selector'
);
const showcaseProductControls = document.getElementById(
  'showcase-product-controls'
);
const showcaseProductCounter = document.getElementById(
  'showcase-product-counter'
);
const showcaseProductTitle = document.getElementById(
  'showcase-product-title'
);
const showcaseProductDescription = document.getElementById(
  'showcase-product-description'
);
const showcaseProductProduction = document.getElementById(
  'showcase-product-production'
);
const previousShowcaseProduct = document.getElementById(
  'previous-showcase-product'
);
const nextShowcaseProduct = document.getElementById(
  'next-showcase-product'
);

let currentImages = [];
let currentImageIndex = 0;
let currentShowcaseProducts = [];
let currentShowcaseProductIndex = 0;
let currentShowcaseImageIndex = 0;
let showcaseImageRequest = 0;

function getShowcaseProductImages(product) {
  if (Array.isArray(product?.images)) {
    return product.images.filter(Boolean);
  }

  return product?.image ? [product.image] : [];
}

function renderDesktopShowcaseProductSelector() {
  showcaseProductSelector.replaceChildren();
  showcaseProductSelector.hidden = currentShowcaseProducts.length <= 1;

  currentShowcaseProducts.forEach((product, index) => {
    const option = document.createElement('button');
    option.type = 'button';
    option.className = 'showcase-product-option';
    option.setAttribute(
      'aria-label',
      `Show ${product.title || `featured product ${index + 1}`}`
    );

    const imagePath = product.thumbnail || getShowcaseProductImages(product)[0];
    if (imagePath) {
      const image = document.createElement('img');
      image.src = imagePath;
      image.alt = '';
      option.append(image);
    }

    const label = document.createElement('span');
    label.textContent = product.title || `Product ${index + 1}`;
    option.append(label);
    option.addEventListener('click', () => {
      currentShowcaseProductIndex = index;
      currentShowcaseImageIndex = 0;
      showDesktopShowcaseProduct();
    });

    showcaseProductSelector.append(option);
  });
}

function setDesktopHotspotView(view) {
  const isShowcase = view === 'showcase';

  hotspotAreaView.hidden = isShowcase;
  hotspotShowcaseView.hidden = !isShowcase;
  hotspotAreaTab.classList.toggle('is-active', !isShowcase);
  hotspotShowcaseTab.classList.toggle('is-active', isShowcase);
  hotspotAreaTab.setAttribute('aria-selected', String(!isShowcase));
  hotspotShowcaseTab.setAttribute('aria-selected', String(isShowcase));

  if (isShowcase) {
    showDesktopShowcaseProduct();
  }
}

function showDesktopShowcaseProduct() {
  const product = currentShowcaseProducts[currentShowcaseProductIndex];
  const images = getShowcaseProductImages(product);
  const requestId = ++showcaseImageRequest;

  showcaseProductControls.hidden =
    currentShowcaseProducts.length <= 1;
  Array.from(showcaseProductSelector.children).forEach((option, index) => {
    option.classList.toggle(
      'is-selected',
      index === currentShowcaseProductIndex
    );
    option.setAttribute(
      'aria-pressed',
      String(index === currentShowcaseProductIndex)
    );
  });
  previousShowcaseImage.hidden = images.length <= 1;
  nextShowcaseImage.hidden = images.length <= 1;
  showcaseImageCounter.hidden = images.length <= 1;
  showcaseImage.hidden = true;
  showcaseImage.removeAttribute('src');
  showcaseImagePlaceholder.hidden = false;

  if (!product) {
    showcaseProductTitle.textContent = 'Featured farm products';
    showcaseProductDescription.textContent =
      'The platform will provide information about products produced by the featured farm, including basic descriptions and how they are produced.';
    showcaseProductProduction.textContent =
      'Add product details and production information to this hotspot showcase.';
    showcaseImagePlaceholder.textContent = 'Product image will appear here.';
    showcaseProductCounter.textContent = '';
    showcaseImageCounter.textContent = '';
    return;
  }

  showcaseProductTitle.textContent = product.title || 'Featured product';
  showcaseProductDescription.textContent =
    product.description || 'Product description will appear here.';
  showcaseProductProduction.textContent =
    product.production || 'Production information will appear here.';
  showcaseProductCounter.textContent =
    `${currentShowcaseProductIndex + 1} / ${currentShowcaseProducts.length}`;

  if (images.length === 0) {
    showcaseImagePlaceholder.textContent = 'Product image will appear here.';
    showcaseImageCounter.textContent = '';
    return;
  }

  const imagePath = images[currentShowcaseImageIndex] || images[0];
  showcaseImageCounter.textContent =
    `${currentShowcaseImageIndex + 1} / ${images.length}`;
  showcaseImagePlaceholder.textContent = 'Loading product image...';
  showcaseImage.alt = `${product.title || 'Featured product'} image`;
  showcaseImage.onload = () => {
    if (requestId !== showcaseImageRequest) return;

    showcaseImage.hidden = false;
    showcaseImagePlaceholder.hidden = true;
  };
  showcaseImage.onerror = () => {
    if (requestId !== showcaseImageRequest) return;

    console.error(
      'Could not load desktop showcase image:',
      imagePath
    );
    showcaseImagePlaceholder.textContent =
      'Product image could not be loaded.';
  };
  showcaseImage.src = imagePath;
}

function changeDesktopShowcaseImage(direction) {
  const images = getShowcaseProductImages(
    currentShowcaseProducts[currentShowcaseProductIndex]
  );
  if (images.length <= 1) return;

  currentShowcaseImageIndex =
    (currentShowcaseImageIndex + direction + images.length) %
    images.length;

  showDesktopShowcaseProduct();
}

function changeDesktopShowcaseProduct(direction) {
  if (currentShowcaseProducts.length <= 1) return;

  currentShowcaseProductIndex =
    (currentShowcaseProductIndex + direction +
      currentShowcaseProducts.length) %
    currentShowcaseProducts.length;
  currentShowcaseImageIndex = 0;

  showDesktopShowcaseProduct();
}

hotspotAreaTab.addEventListener('click', () => {
  setDesktopHotspotView('area');
});

hotspotShowcaseTab.addEventListener('click', () => {
  setDesktopHotspotView('showcase');
});

previousShowcaseProduct.addEventListener('click', () => {
  changeDesktopShowcaseProduct(-1);
});

nextShowcaseProduct.addEventListener('click', () => {
  changeDesktopShowcaseProduct(1);
});

previousShowcaseImage.addEventListener('click', () => {
  changeDesktopShowcaseImage(-1);
});

nextShowcaseImage.addEventListener('click', () => {
  changeDesktopShowcaseImage(1);
});

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

    const horizontal = THREE.MathUtils.degToRad(information.horizontal || 0);
    const vertical = THREE.MathUtils.degToRad(information.vertical || 0);
    const distance = information.distance || 12;

    hotspot.position.set(
      Math.sin(horizontal) * Math.cos(vertical) * distance,
      Math.sin(vertical) * distance,
      -Math.cos(horizontal) * Math.cos(vertical) * distance
    );
    hotspot.userData.information = information;

    hotspotGroup.add(hotspot);
  });
}

function openHotspotInformation(information) {
  if (!information) return;

  hotspotTitle.textContent = information.title;
  hotspotDescription.textContent = information.description;
  currentShowcaseProducts = Array.isArray(information.showcase)
    ? information.showcase
    : [];
  currentShowcaseProductIndex = 0;
  currentShowcaseImageIndex = 0;
  renderDesktopShowcaseProductSelector();
  setDesktopHotspotView('area');

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

renderer.domElement.addEventListener('pointerup', (event) => {
  const rect = renderer.domElement.getBoundingClientRect();

  hotspotMouse.x =
    ((event.clientX - rect.left) / rect.width) * 2 - 1;

  hotspotMouse.y =
    -((event.clientY - rect.top) / rect.height) * 2 + 1;

  hotspotRaycaster.setFromCamera(hotspotMouse, camera);

  const hits = hotspotRaycaster.intersectObjects(
    hotspotGroup.children,
    true
  );

  if (hits.length > 0) {
    const information = hits[0].object.userData.information;
    openHotspotInformation(information);
  }
});

closeHotspotButton.addEventListener('click', () => {
  hotspotInfo.style.display = 'none';
  showcaseImageRequest++;
  setDesktopHotspotView('area');

  gazeHotspotOpening = false;
  gazeHotspot = null;
  gazeHotspotStartTime = 0;

  gazeHud.visible = false;
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
  if (!renderer.xr.isPresenting) {
    controls.update();
  }

  updateGazeNavigation();
  updateVRControllerHaptics();
  updateVRProductionScroll();

  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

// FarmDataArrows
const farmOptions = [
  {
  name: 'Iberica Farm',
  thumbnail: `${import.meta.env.BASE_URL}iberica/OUTSIDE GATE.jpg`,
  scene: 'ibericaFarm1',
  type: 'A farm that is owned by the municipality of Labo which helps grow and test seedlings.',
  location: 'Iberica, Labo Camrines Norte.',
  description: 'This farm provides the Farmers of Labo with healthy seedlings.',

  locations: [
    {
      name: 'Gate',
      scene: 'ibericaFarm1',
      cameraView:{horizontal:-90,vertical:0},
      arrows: [
        {
          horizontal: -90,
          vertical:0,
          rotation: 0.2,
          distance: 12,
          target: 'ibericaFarm2'
        }
      ]
    },

    {
      name: 'Inside the Farm',
      scene: 'ibericaFarm2',
      cameraView:{horizontal:-90,vertical:0},
      arrows: [
        {
          horizontal: -90,
          vertical:0,
          rotation: 0,
          distance: 12,
          target: 'ibericaFarm3'
        },
        {
          horizontal:90,
          vertical:-20,
          rotation:-0.5,
          distance: 15,
          target: 'ibericaFarm1'
        },
        {
          horizontal:-30,
          vertical:0,
          rotation:1.5,
          distance: 11,
          target: 'ibericaFarmCanopyEggplant'
        }
      ]
    },

    {
      name: 'Right Canopy Eggplant',
      scene: 'ibericaFarmCanopyEggplant',
      cameraView:{horizontal:-90,vertical:0},
      arrows: [
        {
          horizontal: 80,
          vertical:-20,
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
          horizontal:-110,
          vertical:-15,
          rotation: 0,
          distance: 15,
          target: 'ibericaFarm4'
        },{
          horizontal:70,
          vertical:-15,
          rotation: -0.2,
          distance: 12,
          target: 'ibericaFarm2'
        },
        {
          horizontal:-50,
          vertical:-10,
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
          horizontal:70,
          vertical:-5,
          rotation: -1.5,
          distance: 18,
          target: 'ibericaFarm5'
        },
        {
          horizontal:100,
          vertical:-10,
          rotation: 0,
          distance: 15,
          target: 'ibericaFarm3'
        },
        {
          horizontal:-90,
          vertical:-15,
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
          horizontal:85,
          vertical:-15,
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
          horizontal:-85,
          vertical:-20,
          rotation: 0.5,
          distance: 17,
          target: 'ibericaFarm7'
        },
        {
          horizontal:130,
          vertical:-20,
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
          horizontal:120,
          vertical:-15,
          rotation: 0,
          distance: 15,
          target: 'ibericaFarm6'
        }
      ]
    }
  ]
},


  {name: 'Fatima Farm Resort',
    thumbnail: `${import.meta.env.BASE_URL}fatima/GATE 1.jpg`,
    scene: 'fatimaFarm1',
    type: 'This a Farm and a Resort.',
    location: 'Santa Cruz, Labo Camarines Norte.',
    description: 'A family run farm resort that has various amenities.',

  locations:[
    {name: 'Entrance Gate',
    scene: 'fatimaFarm1',
    cameraView:{horizontal:-90,vertical:0},
    arrows: [
      {
        horizontal:-90,
        vertical:-15,
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
        horizontal:-90,
        vertical:-5,
        rotation: 0,
        distance: 12,
        target: 'fatimaFarm3'
      },
      {
        horizontal:130,
        vertical:-5,
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
        horizontal:-100,
        vertical:-5,
        rotation: 0,
        distance: 12,
        target: 'fatimaFarm4'
      },
      {
        horizontal:80,
        vertical:0,
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
        horizontal:-123,
        vertical:-5,
        rotation: 0,
        distance: 12,
        target: 'fatimaFarm5'
      },
      {
        horizontal:65,
        vertical:-2,
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
        horizontal:-97,
        vertical:-5,
        rotation: 0,
        distance: 12,
        target: 'fatimaFarm6'
      },
      {
        horizontal:94,
        vertical:-2,
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
        horizontal:-97,
        vertical:-10,
        rotation: 0,
        distance: 12,
        target: 'fatimaFarm7'
      },
      {
        horizontal:83,
        vertical:-2,
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
        horizontal:-96,
        vertical:-5,
        rotation: 0,
        distance: 12,
        target: 'fatimaFarm8'
      },
      {
        horizontal:65,
        vertical:-2,
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
        horizontal:-95,
        vertical:-5,
        rotation: 0,
        distance: 12,
        target: 'fatimaFarm9'
      },
      {
        horizontal:85,
        vertical:-2,
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
    type: 'Private Cattle and Dairy Farm.',
    location: 'Labo, Camarines Norte.',
    description: 'This Farm provides Meat and dairy to Labo.',
    locations:[
      {name: 'Fundado Cow Farm Entrance',
        scene: 'cowFarmEntrance',
        cameraView: { horizontal: -90, vertical: 0 },
        arrows: [{
          horizontal: -90,
          vertical: -15,
          rotation: -0.9,
          distance: 12,
          target: 'cowFarm2'
        }]},
      {name: 'Fundado Cow Farm Path 1',
        scene: 'cowFarm2',
        cameraView: { horizontal: -120, vertical: 0 },
        arrows: [{
          horizontal: 95,
          vertical: -15,
          rotation: 0.1,
          distance: 12,
          target: 'cowFarmEntrance'
      },
      {
        horizontal: -120,
        vertical:-15,
        rotation: -0.8,
        distance: 12,
        target: 'cowFarm4'
      }
          
      ]},
      {name: 'Fundado Cow Farm Path 2',
        scene: 'cowFarm4',
        cameraView: { horizontal: -80, vertical: 0 },
        arrows: [{
          horizontal: -80,
          vertical: -15,
          rotation: 0.6,
          distance: 12,
          target: 'cowFarm5'
        },{
          horizontal: 87,
          vertical:-40,
          rotation: -0.2,
          distance: 12,
          target: 'cowFarm2'
        },
      ]},
      {name: 'Fundado Cow Farm Path 3',
        scene: 'cowFarm5',
        cameraView: { horizontal: -80, vertical: 0 },
        arrows: [{
          horizontal: -80,
          vertical:-10,
          rotation: 0.9,
          distance: 16,
          target: 'cowFarm6'
        },{
          horizontal: 87,
          vertical:-15,
          rotation: -0.5,
          distance: 12,
          target: 'cowFarm4'
        },]},
      {name: 'Fundado Cow Farm Path 4',
        scene: 'cowFarm6',
        cameraView: { horizontal: -70, vertical: 0 },
        arrows: [{
          horizontal: -70,
          vertical:-15,
          rotation: 0.5,
          distance: 15,
          target: 'cowFarm7'
        },{
          horizontal: 100,
          vertical:-15,
          rotation: -0.5,
          distance: 12,
          target: 'cowFarm5'
        },]},
      {name: 'Fundado Cow Farm path 5',
        scene: 'cowFarm7',
        cameraView: { horizontal: -90, vertical: 0 },
        arrows: [{
          horizontal:-90,
          vertical:-15,
          rotation: 0.40,
          distance: 15,
          target: 'cowFarm8'
        },{
          horizontal: 75,
          vertical:-15,
          rotation: -0.5,
          distance: 12,
          target: 'cowFarm6'
        },]},

        {name: 'Fundado Cow Farm Barrels',
        scene: 'cowFarm8',
        cameraView: { horizontal: -90, vertical: 0 },
        arrows: [{
          horizontal:-92,
          vertical:-15,
          rotation: 0.25,
          distance: 12,
          target: 'cowFarm9'
        },{
          horizontal: 0,
          vertical:-15,
          rotation: 2,
          distance: 12,
          target: 'cowFarm7'
        },]},

        {name: 'Fundado Cow Farm Barrels 2',
        scene: 'cowFarm9',
        cameraView: { horizontal: -90, vertical: 0 },
        arrows: [{
          horizontal: -96,
          vertical:-16,
          rotation: 0,
          distance: 12,
          target: 'cowFarm10'
        },{
          horizontal: 87,
          vertical:-15,
          rotation: -0.2,
          distance: 12,
          target: 'cowFarm8'
        },]},
        {name: 'Fundado Cow Farm Barrels 3',
        scene: 'cowFarm10',
        cameraView: { horizontal: -90, vertical: 0 },
        arrows: [{
          horizontal: -75,
          vertical:-16,
          rotation: 0.5,
          distance: 12,
          target: 'cowFarm11'
        },{
          horizontal: 105,
          vertical:-20,
          rotation: -0.2,
          distance: 12,
          target: 'cowFarm9'
        },]},
        {name: 'Fundado Cow Farm Barrels 4',
        scene: 'cowFarm11',
        cameraView: { horizontal: -90, vertical: 0 },
        arrows: [{
          horizontal: -96,
          vertical:-16,
          rotation: 0,
          distance: 12,
          target: 'cowFarm12'
        },{
          horizontal: 82,
          vertical:-15,
          rotation: -0.2,
          distance: 12,
          target: 'cowFarm10'
        },]},
        {name: 'Fundado Cow Farm Cows',
        scene: 'cowFarm12',
        cameraView: { horizontal: -90, vertical: 0 },
        arrows: [{
          horizontal: -93,
          vertical:-16,
          rotation: 0.1,
          distance: 12,
          target: 'cowFarm13'
        },{
          horizontal: 87,
          vertical:-15,
          rotation: -0.2,
          distance: 12,
          target: 'cowFarm11'
        },]},

        {name: 'Fundado Cow Farm Cows 2',
        scene: 'cowFarm13',
        cameraView: { horizontal: -90, vertical: 0 },
        arrows: [{
          horizontal: -90,
          vertical:-16,
          rotation: 0.150,
          distance: 12,
          target: 'cowFarmMid'
        },{
          horizontal: 90,
          vertical:-15,
          rotation: -0.1,
          distance: 12,
          target: 'cowFarm12'
        },]},

        {name: 'Fundado Cow Farm Cows 3',
        scene: 'cowFarmMid',
        cameraView: { horizontal: -90, vertical: 0 },
        arrows: [{
          horizontal: -90,
          vertical:-16,
          rotation: 0.25,
          distance: 12,
          target: 'cowFarm15'
        },{
          horizontal: 93,
          vertical:-16,
          rotation: -0.2,
          distance: 12,
          target: 'cowFarm13'
        },]},

        {name: 'Fundado Cow Farm Cows 4',
        scene: 'cowFarm15',
        cameraView: { horizontal: -90, vertical: 0 },
        arrows: [{
          horizontal: -18,
          vertical: -16,
          rotation: 1.5,
          distance: 12,
          target: 'cowFarm16'
        },{
          horizontal: 165,
          vertical:-16,
          rotation: -0.1,
          distance: 12,
          target: 'cowFarmMid'
        },]},

        {name: 'Fundado Cow Farm Cows 5',
        scene: 'cowFarm14',
        cameraView: { horizontal: -90, vertical: 0 },
        arrows: [{
          horizontal: -90,
          vertical:-16,
          rotation: 0.25,
          distance: 12,
          target: 'cowFarm15'
        },{
          horizontal: 87,
          vertical:-16,
          rotation: -0.199,
          distance: 12,
          target: 'cowFarm15'
        },]},

        {name: 'Fundado Cow Farm Exit',
        scene: 'cowFarm16',
        cameraView: { horizontal: -90, vertical: 0 },
        arrows: [{
          horizontal: -97,
          vertical:-16,
          rotation: 0.2,
          distance: 12,
          target: 'cowFarmLast'
        },{
          horizontal: 80,
          vertical:-16,
          rotation: -0.5,
          distance: 12,
          target: 'cowFarm14'
        },]},
        
        {name: 'Fundado Cow Farm Outside Pens',
        scene: 'cowFarmLast',
        cameraView: { horizontal: -90, vertical: 0 },
        arrows: [{
          horizontal: 87,
          vertical:-16,
          rotation: -0.25,
          distance: 12,
          target: 'cowFarm16'
        }]},
    ]
  },

];


// =====================================
// VR FARM MENU
// =====================================

function createVRButtonTexture(text, background = '#286a38') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;

  const ctx = canvas.getContext('2d');

  ctx.fillStyle = background;
  ctx.beginPath();
  ctx.roundRect(8, 8, 496, 144, 24);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 42px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 80);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  return texture;
}

function createVRMenuBackdropTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 768;

  const ctx = canvas.getContext('2d');
  const background = ctx.createLinearGradient(0, 0, 0, 768);
  background.addColorStop(0, 'rgba(20, 54, 37, 0.97)');
  background.addColorStop(1, 'rgba(8, 25, 18, 0.97)');

  ctx.fillStyle = background;
  ctx.beginPath();
  ctx.roundRect(10, 10, 1004, 748, 42);
  ctx.fill();

  ctx.strokeStyle = 'rgba(190, 220, 166, 0.58)';
  ctx.lineWidth = 4;
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createVRMenuHeaderTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 180;

  const ctx = canvas.getContext('2d');
  const background = ctx.createLinearGradient(0, 0, 1024, 0);
  background.addColorStop(0, '#2f7444');
  background.addColorStop(1, '#1b5134');

  ctx.fillStyle = background;
  ctx.beginPath();
  ctx.roundRect(10, 10, 1004, 160, 28);
  ctx.fill();

  ctx.fillStyle = '#d7edbd';
  ctx.font = 'bold 22px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('VR AGRIEXPLORE  /  CAMARINES NORTE', 42, 55);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 42px Arial';
  ctx.fillText('Choose a farm to explore', 42, 116);

  ctx.fillStyle = '#e2f1d8';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'right';
  ctx.fillText(`${farmOptions.length} FARM TOURS`, 975, 116);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createVRMenuHintTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 100;

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#d6e8c8';
  ctx.font = 'bold 26px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    'MOVE GAZE TO CHOOSE  •  HOLD 2 SECONDS OR PRESS TRIGGER',
    512,
    50
  );

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createVRFarmCard(farm, index) {
  const group = new THREE.Group();

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 720;

  const ctx = canvas.getContext('2d');

  function drawCard(image = null) {
    ctx.clearRect(0, 0, 512, 720);
    ctx.fillStyle = '#f6f8f2';
    ctx.beginPath();
    ctx.roundRect(5, 5, 502, 710, 28);
    ctx.fill();

    ctx.strokeStyle = '#dbe6d6';
    ctx.lineWidth = 4;
    ctx.stroke();

    if (image) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(16, 16, 480, 260, 22);
      ctx.clip();
      ctx.drawImage(image, 16, 16, 480, 260);

      const shade = ctx.createLinearGradient(0, 150, 0, 276);
      shade.addColorStop(0, 'rgba(9, 25, 17, 0)');
      shade.addColorStop(1, 'rgba(9, 25, 17, 0.72)');
      ctx.fillStyle = shade;
      ctx.fillRect(16, 150, 480, 126);
      ctx.restore();
    } else {
      const fallback = ctx.createLinearGradient(0, 16, 0, 276);
      fallback.addColorStop(0, '#b8d2ac');
      fallback.addColorStop(1, '#527d56');
      ctx.fillStyle = fallback;
      ctx.beginPath();
      ctx.roundRect(16, 16, 480, 260, 22);
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(8, 27, 18, 0.78)';
    ctx.beginPath();
    ctx.roundRect(32, 34, 142, 42, 21);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 19px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`FARM ${String(index + 1).padStart(2, '0')}`, 103, 55);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#1e3525';
    ctx.font = 'bold 34px Arial';
    ctx.fillText(farm.name, 32, 330, 448);

    ctx.fillStyle = '#43804b';
    ctx.font = 'bold 17px Arial';
    ctx.fillText('LOCATION', 32, 370);

    ctx.fillStyle = '#526458';
    ctx.font = '22px Arial';
    ctx.fillText(farm.location || 'Camarines Norte', 32, 401, 448);

    const description = farm.description || farm.type || '';
    const words = description.split(/\s+/);
    const lines = [];
    let line = '';

    words.forEach(word => {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width > 448 && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    });

    if (line) lines.push(line);

    ctx.fillStyle = '#657467';
    ctx.font = '21px Arial';
    lines.slice(0, 2).forEach((text, lineIndex) => {
      ctx.fillText(text, 32, 445 + lineIndex * 31, 448);
    });

    ctx.fillStyle = '#337747';
    ctx.beginPath();
    ctx.roundRect(28, 574, 456, 92, 20);
    ctx.fill();

    ctx.fillStyle = '#2c693d';
    ctx.beginPath();
    ctx.arc(438, 620, 23, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EXPLORE FARM', 240, 620);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(430, 620);
    ctx.lineTo(446, 620);
    ctx.lineTo(439, 612);
    ctx.moveTo(446, 620);
    ctx.lineTo(439, 628);
    ctx.stroke();
  }

  drawCard();

  const cardTexture = new THREE.CanvasTexture(canvas);
  cardTexture.colorSpace = THREE.SRGBColorSpace;

  // Load farm thumbnail
  const image = new Image();

  image.onload = () => {
    drawCard(image);
    cardTexture.needsUpdate = true;
  };

  image.onerror = () => {
    console.error('Could not load VR farm thumbnail:', farm.thumbnail);
  };

  image.src = farm.thumbnail;

  const card = new THREE.Mesh(
    new THREE.PlaneGeometry(0.80, 1.125),
    new THREE.MeshBasicMaterial({
      map: cardTexture,
      side: THREE.DoubleSide,
      transparent: true,
      depthTest: false
    })
  );

  card.renderOrder = 10;
  card.userData.action = 'select-farm';
  card.userData.farmIndex = index;

  group.add(card);

  return group;
}

function placeVRFarmMenu(viewerCamera) {
  const viewerPosition = new THREE.Vector3();
  const viewerQuaternion = new THREE.Quaternion();
  const forward = new THREE.Vector3(0, 0, -1);

  viewerCamera.getWorldPosition(viewerPosition);
  viewerCamera.getWorldQuaternion(viewerQuaternion);
  forward.applyQuaternion(viewerQuaternion);

  scene.add(vrMenuGroup);
  vrMenuGroup.position
    .copy(viewerPosition)
    .addScaledVector(forward, 2.5);
  vrMenuGroup.quaternion.copy(viewerQuaternion);
  vrMenuGroup.visible = true;
  vrMenuNeedsPlacement = false;
}

function placeVRBackToFarmsButton(viewerCamera) {
  const viewerPosition = new THREE.Vector3();
  const viewerQuaternion = new THREE.Quaternion();
  const offset = new THREE.Vector3(-0.70, 0.72, -2.5);

  viewerCamera.getWorldPosition(viewerPosition);
  viewerCamera.getWorldQuaternion(viewerQuaternion);
  offset.applyQuaternion(viewerQuaternion);

  vrBackToFarmsGroup.position.copy(viewerPosition).add(offset);
  vrBackToFarmsGroup.quaternion.copy(viewerQuaternion);
  vrBackToFarmsGroup.visible = true;
  vrBackToFarmsNeedsPlacement = false;
}

function openVRFarmMenu() {
  vrMenuGroup.clear();

  vrMenuOpen = true;
  vrMenuNeedsPlacement = renderer.xr.isPresenting;
  vrBackToFarmsGroup.visible = false;
  vrBackToFarmsNeedsPlacement = false;
  gazeMenuDirectionInitialized = false;
  gazeMenuSelectionArmed = false;

  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 2.42),
    new THREE.MeshBasicMaterial({
      map: createVRMenuBackdropTexture(),
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
  backdrop.position.set(0, 0.02, -0.08);
  backdrop.renderOrder = 1;
  vrMenuGroup.add(backdrop);

  const header = new THREE.Mesh(
    new THREE.PlaneGeometry(2.9, 0.51),
    new THREE.MeshBasicMaterial({
      map: createVRMenuHeaderTexture(),
      transparent: true,
      depthTest: false,
      side: THREE.DoubleSide
    })
  );

  header.position.set(0, 0.84, 0.02);
  header.renderOrder = 5;
  vrMenuGroup.add(header);

  farmOptions.forEach((farm, index) => {
    const card = createVRFarmCard(farm, index);

    card.position.set(
      (index - (farmOptions.length - 1) / 2) * 0.94,
      -0.04,
      0.03
    );

    vrMenuGroup.add(card);
  });

  const hint = new THREE.Mesh(
    new THREE.PlaneGeometry(2.35, 0.20),
    new THREE.MeshBasicMaterial({
      map: createVRMenuHintTexture(),
      transparent: true,
      depthTest: false,
      side: THREE.DoubleSide
    })
  );

  hint.position.set(0, -0.87, 0.02);
  hint.renderOrder = 5;
  vrMenuGroup.add(hint);

  if (vrMenuNeedsPlacement) {
    scene.add(vrMenuGroup);
    vrMenuGroup.visible = false;
  } else {
    camera.add(vrMenuGroup);
    vrMenuGroup.position.set(0, 0, -2.5);
    vrMenuGroup.quaternion.identity();
    vrMenuGroup.visible = true;
  }
}

function closeVRFarmMenu() {
  vrMenuOpen = false;
  vrMenuNeedsPlacement = false;
  vrMenuGroup.visible = false;
  gazeMenuDirectionInitialized = false;
  gazeMenuSelectionArmed = false;
}

function createVRSelectFarmButton() {
  vrMenuGroup.clear();
  camera.add(vrMenuGroup);
  vrMenuGroup.position.set(0, 0, -2.5);
  vrMenuGroup.quaternion.identity();

  const selectFarmButton = new THREE.Mesh(
    new THREE.PlaneGeometry(0.72, 0.22),
    new THREE.MeshBasicMaterial({
      map: createVRButtonTexture('SELECT FARM'),
      transparent: true,
      side: THREE.DoubleSide
    })
  );
  selectFarmButton.position.set(0.70, -0.72, 0);
  vrMenuGroup.add(selectFarmButton);

  const selectFarmHitbox = new THREE.Mesh(
    new THREE.PlaneGeometry(0.92, 0.36),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.001,
      depthTest: false,
      side: THREE.DoubleSide
    })
  );
  selectFarmHitbox.position.set(0.70, -0.72, 0.04);
  selectFarmHitbox.userData.action = 'open-farm-menu';
  vrMenuGroup.add(selectFarmHitbox);

  vrMenuGroup.visible = true;

  vrMenuOpen = false;

  vrBackToFarmsGroup.clear();

  const backButton = new THREE.Mesh(
    new THREE.PlaneGeometry(0.72, 0.22),
    new THREE.MeshBasicMaterial({
      map: createVRButtonTexture('BACK TO FARMS'),
      transparent: true,
      side: THREE.DoubleSide
    })
  );
  backButton.position.set(0, 0, 0);
  vrBackToFarmsGroup.add(backButton);

  const backHitbox = new THREE.Mesh(
    new THREE.PlaneGeometry(0.92, 0.36),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.001,
      depthTest: false,
      side: THREE.DoubleSide
    })
  );
  backHitbox.position.set(0, 0, 0.04);
  backHitbox.userData.action = 'open-farm-menu';
  vrBackToFarmsGroup.add(backHitbox);

  vrBackToFarmsNeedsPlacement = renderer.xr.isPresenting;
  vrBackToFarmsGroup.visible = renderer.xr.isPresenting;
}

// Select a farm from the VR menu
function selectVRFarm(index) {
  const selectedFarm = farmOptions[index];

  if (!selectedFarm) return;

  console.log('VR selected farm:', selectedFarm.name);

  activeFarm = selectedFarm;

  closeVRFarmMenu();
  createVRSelectFarmButton();

  farmMenu.classList.add('is-hidden');
  openFarmMenuButton.style.display = 'block';
  resetButton.style.display = 'block';

  loadScene(selectedFarm.scene);
}

// Handle VR menu button selection
function handleVRMenuSelection(object) {
  const action = object.userData.action;

  if (action === 'select-farm') {
    selectVRFarm(object.userData.farmIndex);
    return true;
  }

  if (action === 'open-farm-menu') {
    openVRFarmMenu();
    return true;
  }

  return false;
}


//FarmHotspotData
const farmHotspots = {
  ibericaFarm2:[
  { 
    title: 'Canopy',
    description: 'In the right canopy they planted some eggplant and at the middle of the two structure there are Papaya Trees.',
    horizontal:-45,
    vertical:-10,
    distance:12,
    size: 0.5,
    thumbnail: `${import.meta.env.BASE_URL}iberica/NEAR CANOPY.jpg`,
    images: [`${import.meta.env.BASE_URL}iberica/NEAR CANOPY.jpg`],
    showcase: [
      {
        title: 'Eggplant',
        images: [`${import.meta.env.BASE_URL}product/iberica/Eggplant.jpg`],
        description: 'This is one of the crops that the farm helps test and share with other farmers.',
        production: 'Eggplants grow well in a location that gets full sun—at least 6 to 8 hours of direct sunlight per day. They grow best in well-draining soil that is rich in organic matter.'
      },
      {
        title: 'Papaya',
        thumbnail: `${import.meta.env.BASE_URL}product/iberica/Papaya.webp`,
        images: [`${import.meta.env.BASE_URL}product/iberica/Papaya.webp`],
        description: 'Papaya trees grow between the canopy structures at the farm.',
        production: 'Papaya grows best in a warm, sunny location with well-draining soil. Keep the soil evenly moist and protect young plants from strong winds.'
      }
    ]
  }]
};


// ======================================
// VR HOTSPOT INFORMATION PANEL
// ======================================

const vrHotspotPanel = new THREE.Group();
vrHotspotPanel.visible = false;
scene.add(vrHotspotPanel);

// Panel canvas
const vrPanelCanvas = document.createElement('canvas');
vrPanelCanvas.width = 1024;
vrPanelCanvas.height = 700;

const vrPanelContext = vrPanelCanvas.getContext('2d');

const vrPanelTexture = new THREE.CanvasTexture(vrPanelCanvas);

const vrPanelMaterial = new THREE.MeshBasicMaterial({
  map: vrPanelTexture,
  side: THREE.DoubleSide,
  depthTest: false,
  transparent: false
});

const vrPanelMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(2.8, 1.9),
  vrPanelMaterial
);

vrPanelMesh.renderOrder = 50;
vrHotspotPanel.add(vrPanelMesh);
vrHotspotPanel.scale.setScalar(1.1);

let vrPanelInformation = null;
let vrPanelImages = [];
let vrPanelImageIndex = 0;
let vrPanelImage = null;
let vrPanelView = 'information';
let vrShowcaseProducts = [];
let vrShowcaseProductIndex = 0;
let vrShowcaseImageIndex = 0;
let vrShowcaseImage = null;
let vrShowcaseImageError = false;
let vrProductionScrollOffset = 0;
let vrProductionScrollDirection = 1;
let vrProductionScrollMaxOffset = 0;
let vrProductionScrollLastUpdate = 0;
let vrProductionScrollPauseUntil = 0;
let vrMenuVisibleBeforeHotspot = false;
let vrBackToFarmsVisibleBeforeHotspot = false;

let vrPanelImageRequest = 0;
let vrShowcaseImageRequest = 0;
const vrPanelButtons = {};

// Create invisible controller-selectable buttons
function createVRPanelButton(action, x, y, width, height) {
  const button = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.001,
      depthTest: false,
      side: THREE.DoubleSide
    })
  );

  button.position.set(x, y, 0.04);
  button.userData.vrAction = action;

  vrHotspotPanel.add(button);
  return button;
}

vrPanelButtons.close = createVRPanelButton(
  'close', 1.22, 0.77, 0.40, 0.35
);
vrPanelButtons.previous = createVRPanelButton(
  'previous', -0.85, -0.80, 0.65, 0.25
);
vrPanelButtons.showcase = createVRPanelButton(
  'showcase', 0, -0.84, 0.75, 0.14
);
vrPanelButtons.previousShowcaseImage = createVRPanelButton(
  'previous-showcase-image', -1.16, 0.27, 0.30, 0.30
);
vrPanelButtons.nextShowcaseImage = createVRPanelButton(
  'next-showcase-image', 1.16, 0.27, 0.30, 0.30
);
vrPanelButtons.next = createVRPanelButton(
  'next', 0.85, -0.80, 0.65, 0.25
);

function getVRShowcaseTextLines(ctx, text, maxWidth) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  let line = '';
  const lines = [];

  words.forEach(word => {
    const candidate = line ? `${line} ${word}` : word;

    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  });

  if (line) lines.push(line);

  return lines;
}

function drawVRShowcaseText(
  ctx,
  text,
  x,
  y,
  maxWidth,
  lineHeight,
  maxLines
) {
  getVRShowcaseTextLines(ctx, text, maxWidth)
    .slice(0, maxLines)
    .forEach((line, index) => {
      ctx.fillText(line, x, y + index * lineHeight, maxWidth);
    });
}

// Draw the panel
function drawVRHotspotPanel() {
  const ctx = vrPanelContext;

  ctx.clearRect(0, 0, 1024, 700);

  // Background
  ctx.fillStyle = '#17251e';
  ctx.fillRect(0, 0, 1024, 700);

  if (!vrPanelInformation) return;

  const showingShowcase = vrPanelView === 'showcase';
  const showcaseProduct = vrShowcaseProducts[vrShowcaseProductIndex];
  const showcaseProductImages = getShowcaseProductImages(
    showcaseProduct
  );
  const hasShowcaseNavigation = vrShowcaseProducts.length > 1;
  vrPanelButtons.previous.visible =
    !showingShowcase || hasShowcaseNavigation;
  vrPanelButtons.next.visible =
    !showingShowcase || hasShowcaseNavigation;
  vrPanelButtons.previousShowcaseImage.visible =
    showingShowcase && showcaseProductImages.length > 1;
  vrPanelButtons.nextShowcaseImage.visible =
    showingShowcase && showcaseProductImages.length > 1;

  // Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px Arial';
  ctx.fillText(
    showingShowcase
      ? 'AGRICULTURAL SHOWCASE'
      : vrPanelInformation.title || 'Hotspot',
    55,
    85,
    850
  );

  // Close button
  ctx.fillStyle = '#ff5555';
  ctx.fillRect(925, 35, 65, 65);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 42px Arial';
  ctx.fillText('X', 943, 82);

  if (showingShowcase) {
    ctx.fillStyle = '#263b30';
    ctx.fillRect(55, 125, 914, 250);

    if (vrShowcaseImage) {
      const scale = Math.min(
        880 / vrShowcaseImage.width,
        225 / vrShowcaseImage.height
      );
      const width = vrShowcaseImage.width * scale;
      const height = vrShowcaseImage.height * scale;

      ctx.drawImage(
        vrShowcaseImage,
        512 - width / 2,
        250 - height / 2,
        width,
        height
      );
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(
        showcaseProductImages.length > 0
          ? vrShowcaseImageError
            ? 'Product image could not be loaded'
            : 'Loading product image...'
          : 'Product image will appear here',
        512,
        255
      );
      ctx.textAlign = 'left';
    }

    if (showcaseProductImages.length > 1) {
      [[90, 'left'], [934, 'right']].forEach(([x, direction]) => {
        ctx.fillStyle = 'rgba(23, 37, 30, 0.85)';
        ctx.beginPath();
        ctx.arc(x, 250, 38, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 6;
        ctx.beginPath();
        if (direction === 'left') {
          ctx.moveTo(x + 8, 232);
          ctx.lineTo(x - 8, 250);
          ctx.lineTo(x + 8, 268);
        } else {
          ctx.moveTo(x - 8, 232);
          ctx.lineTo(x + 8, 250);
          ctx.lineTo(x - 8, 268);
        }
        ctx.stroke();
      });

      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(462, 345, 100, 28);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(
        `${vrShowcaseImageIndex + 1} / ${showcaseProductImages.length}`,
        512,
        366
      );
      ctx.textAlign = 'left';
    }

    if (showcaseProduct) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 27px Arial';
      ctx.fillText(
        showcaseProduct.title || 'Featured product',
        55,
        415,
        hasShowcaseNavigation ? 760 : 900
      );

      if (hasShowcaseNavigation) {
        ctx.fillStyle = '#263b30';
        ctx.beginPath();
        ctx.roundRect(850, 387, 119, 38, 12);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
          `${vrShowcaseProductIndex + 1} / ${vrShowcaseProducts.length}`,
          909,
          412
        );
        ctx.textAlign = 'left';
      }

      ctx.fillStyle = '#a9d5a7';
      ctx.font = 'bold 20px Arial';
      ctx.fillText('DESCRIPTION', 55, 452);

      ctx.fillStyle = '#eeeeee';
      ctx.font = '21px Arial';
      drawVRShowcaseText(
        ctx,
        showcaseProduct.description || 'Product description will appear here.',
        55,
        480,
        900,
        25,
        2
      );

      ctx.fillStyle = '#22382c';
      ctx.beginPath();
      ctx.roundRect(55, 527, 914, 88, 14);
      ctx.fill();
      ctx.strokeStyle = '#a9d5a7';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#a9d5a7';
      ctx.font = 'bold 20px Arial';
      ctx.fillText('HOW IT IS PRODUCED', 75, 554);

      ctx.fillStyle = '#eeeeee';
      ctx.font = '21px Arial';
      const productionLines = getVRShowcaseTextLines(
        ctx,
        showcaseProduct.production ||
          'Production information will appear here.',
        870
      );
      const productionLineHeight = 22;
      const productionTextHeight = 44;
      vrProductionScrollMaxOffset = Math.max(
        0,
        productionLines.length * productionLineHeight -
          productionTextHeight
      );

      ctx.save();
      ctx.beginPath();
      ctx.rect(65, 565, 894, productionTextHeight);
      ctx.clip();

      productionLines.forEach((line, index) => {
        ctx.fillText(
          line,
          75,
          583 + index * productionLineHeight -
            vrProductionScrollOffset,
          870
        );
      });

      ctx.restore();
    } else {
      vrProductionScrollMaxOffset = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 26px Arial';
      ctx.fillText('Featured farm products', 55, 415);

      ctx.fillStyle = '#eeeeee';
      ctx.font = '22px Arial';
      drawVRShowcaseText(
        ctx,
        'The platform will provide information about products produced by the featured farm, including basic descriptions and how they are produced.',
        55,
        460,
        900,
        29,
        3
      );

      ctx.fillStyle = '#a9d5a7';
      ctx.font = '20px Arial';
      ctx.fillText(
        'Add product details and an image to this hotspot showcase.',
        55,
        565,
        900
      );
    }

    ctx.fillStyle = '#39865a';
    ctx.fillRect(375, 635, 274, 50);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 23px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('HOTSPOT INFO', 512, 670);
    ctx.textAlign = 'left';

    if (hasShowcaseNavigation) {
      ctx.fillStyle = '#39865a';
      ctx.fillRect(55, 635, 260, 50);
      ctx.fillRect(709, 635, 260, 50);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 25px Arial';
      ctx.fillText('PREVIOUS', 105, 670);
      ctx.fillText('NEXT', 800, 670);
    }

    vrPanelTexture.needsUpdate = true;
    return;
  }

  // Description
  ctx.fillStyle = '#eeeeee';
  ctx.font = '28px Arial';

  const description =
    vrPanelInformation.description || '';

  const words = description.split(' ');
  const lines = [];
  let line = '';

  words.forEach(word => {
    const testLine = line + word + ' ';

    if (ctx.measureText(testLine).width > 900) {
      lines.push(line);
      line = word + ' ';
    } else {
      line = testLine;
    }
  });

  if (line) lines.push(line);

  lines.slice(0, 4).forEach((text, index) => {
    ctx.fillText(text, 55, 155 + index * 40);
  });

  ctx.fillStyle = '#a9d5a7';
  ctx.font = '20px Arial';
  ctx.fillText(
    'Look at a button and hold your gaze to activate',
    55,
    310,
    900
  );

  // Image area
  ctx.fillStyle = '#263b30';
  ctx.fillRect(55, 335, 914, 275);

  if (vrPanelImage) {
    const image = vrPanelImage;

    const scale = Math.min(
      880 / image.width,
      245 / image.height
    );

    const width = image.width * scale;
    const height = image.height * scale;

    ctx.drawImage(
      image,
      512 - width / 2,
      472 - height / 2,
      width,
      height
    );
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.font = '28px Arial';
    ctx.fillText(
      vrPanelImages.length
        ? 'Loading image...'
        : 'No images available',
      370,
      480
    );
  }

  // Image navigation buttons
  ctx.fillStyle = '#39865a';
  ctx.fillRect(55, 635, 260, 50);
  ctx.fillRect(375, 635, 274, 50);
  ctx.fillRect(709, 635, 260, 50);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 25px Arial';

  ctx.fillText('PREVIOUS', 105, 670);
  ctx.textAlign = 'center';
  ctx.fillText('SHOWCASE', 512, 670);
  ctx.textAlign = 'left';
  ctx.fillText('NEXT', 800, 670);

  // Image counter
  if (vrPanelImages.length > 0) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(452, 575, 120, 38);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 20px Arial';
    ctx.fillText(
      `${vrPanelImageIndex + 1} / ${vrPanelImages.length}`,
      512,
      601
    );
    ctx.textAlign = 'left';
  }

  vrPanelTexture.needsUpdate = true;
}

function updateVRProductionScroll() {
  if (
    !vrHotspotPanel.visible ||
    vrPanelView !== 'showcase' ||
    vrProductionScrollMaxOffset <= 0
  ) {
    vrProductionScrollLastUpdate = 0;
    return;
  }

  const now = performance.now();
  if (!vrProductionScrollLastUpdate) {
    vrProductionScrollLastUpdate = now;
    return;
  }

  const elapsed = Math.min(now - vrProductionScrollLastUpdate, 50);
  vrProductionScrollLastUpdate = now;

  if (now < vrProductionScrollPauseUntil) return;

  vrProductionScrollOffset +=
    vrProductionScrollDirection * elapsed * 0.02;

  if (vrProductionScrollOffset >= vrProductionScrollMaxOffset) {
    vrProductionScrollOffset = vrProductionScrollMaxOffset;
    vrProductionScrollDirection = -1;
    vrProductionScrollPauseUntil = now + 800;
  } else if (vrProductionScrollOffset <= 0) {
    vrProductionScrollOffset = 0;
    vrProductionScrollDirection = 1;
    vrProductionScrollPauseUntil = now + 800;
  }

  drawVRHotspotPanel();
}

// Load the selected image

function loadVRPanelImage() {
  const requestId = ++vrPanelImageRequest;

  vrPanelImage = null;

  if (vrPanelImages.length === 0) {
    drawVRHotspotPanel();
    return;
  }

  const image = new Image();

  const imagePath = vrPanelImages[vrPanelImageIndex];

  image.onload = () => {
    if (
      requestId !== vrPanelImageRequest ||
      !vrHotspotPanel.visible
    ) {
      return;
    }

    vrPanelImage = image;

    drawVRHotspotPanel();
  };

  image.onerror = () => {
    if (requestId !== vrPanelImageRequest) return;

    console.error(
      'Could not load VR hotspot image:',
      imagePath
    );

    drawVRHotspotPanel();
  };

  image.src = imagePath;
}

function loadVRShowcaseImage() {
  const requestId = ++vrShowcaseImageRequest;
  const product = vrShowcaseProducts[vrShowcaseProductIndex];
  const images = getShowcaseProductImages(product);
  const imagePath = images[vrShowcaseImageIndex] || images[0];
  vrShowcaseImage = null;
  vrShowcaseImageError = false;
  vrProductionScrollOffset = 0;
  vrProductionScrollDirection = 1;
  vrProductionScrollLastUpdate = 0;
  vrProductionScrollPauseUntil = 0;

  if (!imagePath) {
    drawVRHotspotPanel();
    return;
  }

  drawVRHotspotPanel();

  const image = new Image();

  image.onload = () => {
    if (
      requestId !== vrShowcaseImageRequest ||
      !vrHotspotPanel.visible ||
      vrPanelView !== 'showcase'
    ) {
      return;
    }

    vrShowcaseImage = image;
    drawVRHotspotPanel();
  };

  image.onerror = () => {
    if (requestId !== vrShowcaseImageRequest) return;

    console.error(
      'Could not load agricultural showcase image:',
      imagePath
    );

    vrShowcaseImageError = true;
    drawVRHotspotPanel();
  };

  image.src = imagePath;
}


function openVRHotspot(hotspot) {
  const information = hotspot.userData.information;

  if (!information) return;

  const xrCamera = renderer.xr.getCamera(camera);
  const viewerPosition = new THREE.Vector3();
  const viewerQuaternion = new THREE.Quaternion();
  const forward = new THREE.Vector3(0, 0, -1);

  xrCamera.updateMatrixWorld(true);
  xrCamera.getWorldPosition(viewerPosition);
  xrCamera.getWorldQuaternion(viewerQuaternion);
  forward.applyQuaternion(viewerQuaternion);

  vrHotspotPanel.position
    .copy(viewerPosition)
    .addScaledVector(forward, 2.5);
  vrHotspotPanel.quaternion.copy(viewerQuaternion);

  vrPanelInformation = information;

  vrPanelImages = information.images || (
    information.thumbnail
      ? [information.thumbnail]
      : []
  );
  vrShowcaseProducts = Array.isArray(information.showcase)
    ? information.showcase
    : [];

  vrPanelImageIndex = 0;
  vrPanelImage = null;
  vrPanelView = 'information';
  vrShowcaseProductIndex = 0;
  vrShowcaseImageIndex = 0;
  vrShowcaseImage = null;
  vrShowcaseImageError = false;
  vrProductionScrollOffset = 0;
  vrProductionScrollDirection = 1;
  vrProductionScrollMaxOffset = 0;
  vrProductionScrollLastUpdate = 0;
  vrProductionScrollPauseUntil = 0;

  vrMenuVisibleBeforeHotspot = vrMenuGroup.visible;
  vrBackToFarmsVisibleBeforeHotspot = vrBackToFarmsGroup.visible;
  vrMenuGroup.visible = false;
  vrBackToFarmsGroup.visible = false;
  vrBackToFarmsNeedsPlacement = false;
  vrHotspotPanel.visible = true;
  arrowGroup.visible = false;
  hotspotGroup.visible = false;

  gazeTarget = null;
  gazeStartTime = 0;

  tooltipSprite.visible = false;

  ring.scale.setScalar(1);
  ringTop.material.color.set(0xffffff);

  drawVRHotspotPanel();
  loadVRPanelImage();
}



// Close the VR information panel
function closeVRHotspot() {
  const panelWasOpen = vrHotspotPanel.visible;
  if (panelWasOpen && renderer.xr.isPresenting) {
    gazeDirectionAtPanelClose.copy(gazeDirection);
    gazeMustMoveAfterPanelClose = true;
  }

  vrHotspotPanel.visible = false;
  if (panelWasOpen) {
    vrMenuGroup.visible = vrMenuVisibleBeforeHotspot;
    vrBackToFarmsGroup.visible =
      vrBackToFarmsVisibleBeforeHotspot;
  }
  vrMenuVisibleBeforeHotspot = false;
  vrBackToFarmsVisibleBeforeHotspot = false;
  arrowGroup.visible = true;
  hotspotGroup.visible = true;

  vrPanelInformation = null;
  vrPanelImages = [];
  vrPanelImage = null;
  vrPanelImageIndex = 0;
  vrPanelView = 'information';
  vrShowcaseProducts = [];
  vrShowcaseProductIndex = 0;
  vrShowcaseImageIndex = 0;
  vrShowcaseImage = null;
  vrShowcaseImageError = false;

  vrPanelImageRequest++;
  vrShowcaseImageRequest++;

  gazeTarget = null;
  gazeStartTime = 0;

  tooltipSprite.visible = false;

  ring.scale.setScalar(1);
  ringTop.material.color.set(0xffffff);
}

// Change images
function changeVRHotspotImage(direction) {
  if (vrPanelImages.length <= 1) return;

  vrPanelImageIndex =
    (vrPanelImageIndex + direction + vrPanelImages.length) %
    vrPanelImages.length;

  loadVRPanelImage();
}

function changeVRShowcaseProduct(direction) {
  if (vrShowcaseProducts.length <= 1) return;

  vrShowcaseProductIndex =
    (vrShowcaseProductIndex + direction + vrShowcaseProducts.length) %
    vrShowcaseProducts.length;
  vrShowcaseImageIndex = 0;

  loadVRShowcaseImage();
}

function changeVRShowcaseImage(direction) {
  const images = getShowcaseProductImages(
    vrShowcaseProducts[vrShowcaseProductIndex]
  );
  if (images.length <= 1) return;

  vrShowcaseImageIndex =
    (vrShowcaseImageIndex + direction + images.length) % images.length;

  loadVRShowcaseImage();
}

function activateVRPanelAction(action) {
  if (action === 'close') {
    closeVRHotspot();
  } else if (action === 'previous-showcase-image') {
    changeVRShowcaseImage(-1);
  } else if (action === 'next-showcase-image') {
    changeVRShowcaseImage(1);
  } else if (action === 'previous') {
    if (vrPanelView === 'showcase') {
      changeVRShowcaseProduct(-1);
    } else {
      changeVRHotspotImage(-1);
    }
  } else if (action === 'next') {
    if (vrPanelView === 'showcase') {
      changeVRShowcaseProduct(1);
    } else {
      changeVRHotspotImage(1);
    }
  } else if (action === 'showcase') {
    if (vrPanelView === 'showcase') {
      vrPanelView = 'information';
      vrShowcaseImageRequest++;
      vrShowcaseImage = null;
      loadVRPanelImage();
    } else {
      vrPanelView = 'showcase';
      vrShowcaseProductIndex = 0;
      vrShowcaseImageIndex = 0;
      loadVRShowcaseImage();
    }
  }
}

// ======================================
// VR CONTROLLER SYSTEM
// ======================================

const vrControllerRaycaster = new THREE.Raycaster();
vrControllerRaycaster.near = 0.01;
vrControllerRaycaster.far = 50;

const vrControllers = [];
const vrControllerOrigin = new THREE.Vector3();
const vrControllerDirection = new THREE.Vector3();

function getVRControllerHoverTarget(controller) {
  if (!renderer.xr.isPresenting || gazeNavigating) return null;

  controller.updateMatrixWorld(true);
  controller.getWorldPosition(vrControllerOrigin);
  vrControllerDirection
    .set(0, 0, -1)
    .transformDirection(controller.matrixWorld);

  const xrCamera = renderer.xr.getCamera(camera);
  xrCamera.updateMatrixWorld(true);
  vrControllerRaycaster.camera = xrCamera;
  vrControllerRaycaster.set(vrControllerOrigin, vrControllerDirection);

  if (vrHotspotPanel.visible) {
    vrHotspotPanel.updateMatrixWorld(true);
    const hit = vrControllerRaycaster
      .intersectObjects(vrHotspotPanel.children, true)
      .find(result =>
        result.object.visible && result.object.userData.vrAction
      );

    return hit ? hit.object : null;
  }

  if (vrMenuGroup.visible) {
    vrMenuGroup.updateMatrixWorld(true);
    const hit = vrControllerRaycaster
      .intersectObjects(vrMenuGroup.children, true)
      .find(result => result.object.userData.action);

    if (hit) return hit.object;
    if (vrMenuOpen) return null;
  }

  if (vrBackToFarmsGroup.visible) {
    vrBackToFarmsGroup.updateMatrixWorld(true);
    const hit = vrControllerRaycaster
      .intersectObjects(vrBackToFarmsGroup.children, true)
      .find(result => result.object.userData.action);

    if (hit) return hit.object;
  }

  hotspotGroup.updateMatrixWorld(true);
  const hotspotHit = vrControllerRaycaster
    .intersectObjects(hotspotGroup.children, true)
    .find(result => result.object.userData.information);

  if (hotspotHit) return hotspotHit.object;

  arrowGroup.updateMatrixWorld(true);
  const arrowHit = vrControllerRaycaster
    .intersectObjects(arrowGroup.children, true)
    .find(result => result.object.userData.target);

  return arrowHit ? arrowHit.object : null;
}

function pulseVRController(controller) {
  const gamepad = controller.userData.inputSource?.gamepad;
  if (!gamepad) return;

  const actuator = gamepad.hapticActuators?.[0];

  try {
    if (actuator && typeof actuator.pulse === 'function') {
      actuator.pulse(0.3, 40)?.catch(error => {
        console.warn('VR controller haptic feedback failed:', error);
      });
      return;
    }

    const vibrationActuator = gamepad.vibrationActuator;
    if (vibrationActuator?.playEffect) {
      vibrationActuator.playEffect('dual-rumble', {
        duration: 40,
        strongMagnitude: 0.3,
        weakMagnitude: 0.3
      }).catch(error => {
        console.warn('VR controller haptic feedback failed:', error);
      });
    }
  } catch (error) {
    console.warn('VR controller haptic feedback failed:', error);
  }
}

function updateVRControllerHaptics() {
  vrControllers.forEach(controller => {
    const target = getVRControllerHoverTarget(controller);

    if (target && target !== controller.userData.hapticHoverTarget) {
      pulseVRController(controller);
    }

    controller.userData.hapticHoverTarget = target;
  });
}

function setupVRController(index) {
  const controller = renderer.xr.getController(index);
  controller.addEventListener('connected', event => {
    controller.userData.inputSource = event.data;
  });
  controller.addEventListener('disconnected', () => {
    controller.userData.inputSource = null;
    controller.userData.hapticHoverTarget = null;
  });

  // Visible controller ray
  const lineGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -20)
  ]);

  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.9,
    depthTest: false
  });

  const line = new THREE.Line(lineGeometry, lineMaterial);
  line.renderOrder = 100;
  line.frustumCulled = false;

  controller.add(line);
  controller.visible = false;

  scene.add(controller);

  controller.addEventListener('select', () => {
    console.log(`Controller ${index} trigger detected`);

    if (!renderer.xr.isPresenting || gazeNavigating) {
      return;
    }

    controller.updateMatrixWorld(true);

    // Get the controller's position and pointing direction.
    const origin = new THREE.Vector3();
    const direction = new THREE.Vector3();

    controller.getWorldPosition(origin);

    direction
      .set(0, 0, -1)
      .transformDirection(controller.matrixWorld);

    vrControllerRaycaster.camera = renderer.xr.getCamera(camera);
    vrControllerRaycaster.set(origin, direction);

    // PRIORITY 1: VR HOTSPOT INFORMATION PANEL
    if (vrHotspotPanel.visible) {
      vrHotspotPanel.updateMatrixWorld(true);

      const panelHits =
        vrControllerRaycaster.intersectObjects(
          vrHotspotPanel.children,
          true
        );

      const buttonHit = panelHits.find(
        hit => hit.object.visible && hit.object.userData.vrAction
      );

      if (buttonHit) {
        const action = buttonHit.object.userData.vrAction;

        console.log('VR panel action:', action);
        activateVRPanelAction(action);
      }

      return;
    }

    // PRIORITY 2: VR FARM MENU
    if (vrMenuGroup.visible) {
      vrMenuGroup.updateMatrixWorld(true);

      const menuHits =
        vrControllerRaycaster.intersectObjects(
          vrMenuGroup.children,
          true
        );

      const menuHit = menuHits.find(
        hit => hit.object.userData.action
      );

      if (menuHit) {
        console.log(
          'VR menu action:',
          menuHit.object.userData.action
        );

        handleVRMenuSelection(menuHit.object);
        return;
      }

      // Block other selections only while the actual
      // farm selection menu is open.
      if (vrMenuOpen) {
        return;
      }

      // If the small SELECT FARM button is visible
      // but not being pointed at, continue checking.
    }

    if (vrBackToFarmsGroup.visible) {
      vrBackToFarmsGroup.updateMatrixWorld(true);

      const backHits = vrControllerRaycaster.intersectObjects(
        vrBackToFarmsGroup.children,
        true
      );

      const backHit = backHits.find(
        hit => hit.object.userData.action
      );

      if (backHit) {
        handleVRMenuSelection(backHit.object);
        return;
      }
    }

    // PRIORITY 3: HOTSPOTS
    hotspotGroup.updateMatrixWorld(true);

    const hotspotHits =
      vrControllerRaycaster.intersectObjects(
        hotspotGroup.children,
        true
      );

    const hotspotHit = hotspotHits.find(
      hit => hit.object.userData.information
    );

    if (hotspotHit) {
      console.log(
        'VR hotspot selected:',
        hotspotHit.object.userData.information.title
      );

      openVRHotspot(hotspotHit.object);
      return;
    }

    // PRIORITY 4: NAVIGATION ARROWS
    arrowGroup.updateMatrixWorld(true);

    const arrowHits =
      vrControllerRaycaster.intersectObjects(
        arrowGroup.children,
        true
      );

    const arrowHit = arrowHits.find(
      hit => hit.object.userData.target
    );

    if (arrowHit) {
      const target = arrowHit.object.userData.target;

      console.log('VR navigation target:', target);

      gazeNavigating = true;
      gazeTarget = null;
      gazeStartTime = 0;

      loadScene(target).finally(() => {
        gazeNavigating = false;
        gazeTarget = null;
        gazeStartTime = 0;
      });

      return;
    }

    console.log('Controller ray did not hit an interactive object.');
  });

  vrControllers.push(controller);
}

// Set up both controllers.
setupVRController(0);
setupVRController(1);

// Show controllers when entering VR.
renderer.xr.addEventListener('sessionstart', () => {
  console.log('Showing VR controllers');

  vrControllers.forEach(controller => {
    controller.visible = true;
  });
});

// Hide controllers and close the hotspot panel when leaving VR.
renderer.xr.addEventListener('sessionend', () => {
  console.log('Hiding VR controllers');

  vrControllers.forEach(controller => {
    controller.visible = false;
  });

  closeVRHotspot();
});


loadScene('fatimaFarm1');
loadScene('cowFarmEntrance');
loadScene('ibericaFarm1');

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

// =====================================
// VR MENU SESSION HANDLING
// =====================================

renderer.xr.addEventListener('sessionstart', () => {

  // Hide the regular HTML menu inside VR.
  farmMenu.classList.add('is-hidden');
  openFarmMenuButton.style.display = 'none';

  if (activeFarm) {
    // The user already selected a farm.
    createVRSelectFarmButton();
  } else {
    // No farm selected yet.
    openVRFarmMenu();
  }

});

renderer.xr.addEventListener('sessionend', () => {

  // Hide the 3D menu when leaving VR.
  vrMenuGroup.visible = false;
  vrBackToFarmsGroup.visible = false;
  vrBackToFarmsNeedsPlacement = false;
  vrMenuOpen = false;

  // Restore the normal browser menu if no farm was selected.
  if (!activeFarm) {
    farmMenu.classList.remove('is-hidden');
    openFarmMenuButton.style.display = 'none';
  } else {
    farmMenu.classList.add('is-hidden');
    openFarmMenuButton.style.display = 'block';
  }

});