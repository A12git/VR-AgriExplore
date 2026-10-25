
import './style.css';
import * as THREE from 'three';
import { OrbitControls } from
  'three/addons/controls/OrbitControls.js';

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


const scenes = {
  bedroom: `${import.meta.env.BASE_URL}placeholder.jpg`,
  livingroom: `${import.meta.env.BASE_URL}livingroom.jpg`,
  bathroom: `${import.meta.env.BASE_URL}bathroom.jpg`
};

let currentScene = 'bedroom';

function loadScene(sceneName) {
  const imagePath = scenes[sceneName];
  loader.load(imagePath, (texture) => {
    const material = new THREE.MeshBasicMaterial({ map: texture });

    const oldSphere = scene.getObjectByName('panorama');

    if (oldSphere) {
      scene.remove(oldSphere);
      oldSphere.material.map?.dispose();
      oldSphere.material.dispose();
    }

    const sphere = new THREE.Mesh(geometry, material);
    sphere.name = 'panorama';
    scene.add(sphere);
    currentScene = sceneName;
    updateNavigation();
  }, undefined, (error) => {
    console.error('Error loading texture:', imagePath, error);
  });
}
loadScene('bedroom');

const navMenu = document.createElement('div');
navMenu.className = 'nav-menu';

const locations =[
  { name: 'Bedroom', scene: 'bedroom' },
  { name: 'Living Room', scene: 'livingroom' },
  { name: 'Bathroom', scene: 'bathroom' }
];

function updateNavigation() {
  document.querySelectorAll('.nav-button').forEach(button => {
    button.classList.toggle('active', button.dataset.scene === currentScene);
  });
}
locations.forEach((location) => {
  const button = document.createElement('button');
  button.textContent = location.name;
  button.className = 'nav-button';
  button.dataset.scene = location.scene;
  button.addEventListener('click', () => {
    if (location.scene !== currentScene) {
      loadScene(location.scene);
    }
  });
  navMenu.appendChild(button);
});
document.body.appendChild(navMenu);
updateNavigation();

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

const farmOptions = [
  {name: 'Farm 1',
    type: 'The products of the farm.',
    location: 'Address of the farm.',
    description: 'Description of the farm.',
  },
  {name: 'Farm 2',
    type: 'The products of the farm.',
    location: 'Address of the farm.',
    description: 'Description of the farm.',
  },
  {name: 'Farm 3',
    type: 'The products of the farm.',
    location: 'Address of the farm.',
    description: 'Description of the farm.',
  }
];
const farmImage = `${import.meta.env.BASE_URL}placeholder.jpg`;

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
            style="background-image: url('${farmImage}');"
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
      console.log('Selected farm:', farmOptions[index].name);

      farmMenu.classList.add('is-hidden');
      openFarmMenuButton.style.display = 'block';
    });
  });

  openFarmMenuButton.addEventListener('click', () => {
  farmMenu.classList.remove('is-hidden');
  openFarmMenuButton.style.display = 'none';
});