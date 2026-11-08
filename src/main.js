
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

let activeFarm = null;

const arrowGroup = new THREE.Group();
scene.add(arrowGroup);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const arrowTooltip = document.getElementById('arrow-tooltip');

renderer.domElement.addEventListener('mousemove', (event) => {
  const rect = renderer.domElement.getBoundingClientRect();

  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const intersections = raycaster.intersectObjects(
    arrowGroup.children,
    true
  );

  if (intersections.length > 0) {
    const target = intersections[0].object.userData.target;

    const destination = activeFarm?.locations.find(
      loc => loc.scene === target
    );

    arrowTooltip.textContent = destination
      ? destination.name
      : target;

    arrowTooltip.style.display = 'block';
    arrowTooltip.style.left = `${event.clientX}px`;
    arrowTooltip.style.top = `${event.clientY}px`;
  } else {
    arrowTooltip.style.display = 'none';
  }
});

const scenes = {
  farm1: `${import.meta.env.BASE_URL}placeholder.jpg`,
  livingroom: `${import.meta.env.BASE_URL}livingroom.jpg`,
  bathroom: `${import.meta.env.BASE_URL}bathroom.jpg`,
  farm2: `${import.meta.env.BASE_URL}placeholder2.jpg`,
  farm3: `${import.meta.env.BASE_URL}placeholder3.jpg`,
  farm4: `${import.meta.env.BASE_URL}placeholder4.jpg`
};

let currentScene = 'farm1';

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
    createGroundArrows(sceneName);
  }, undefined, (error) => {
    console.error('Error loading texture:', imagePath, error);
  });
}
loadScene('farm1');

function createGroundArrows(sceneName) {
  arrowGroup.clear();

if (!activeFarm) return;

const location = activeFarm.locations.find(
  loc => loc.scene === sceneName
);

if (!location || !location.arrows) return;

location.arrows.forEach((config) => {

  const shape = new THREE.Shape();

  shape.moveTo(0, 1.4);
  shape.lineTo(0.55, 0.2);
  shape.lineTo(0.2, 0.2);
  shape.lineTo(0.2, -1);
  shape.lineTo(-0.2, -1);
  shape.lineTo(-0.2, 0.2);
  shape.lineTo(-0.55, 0.2);
  shape.closePath();

  const geometry = new THREE.ShapeGeometry(shape);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
    depthTest: false
  });

  const arrow = new THREE.Mesh(geometry, material);

  const position = new THREE.Vector3(
    config.x,
    config.y,
    config.z
  ).normalize().multiplyScalar(config.distance || 12);

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

function handleArrowClick(event) {
  const rect = renderer.domElement.getBoundingClientRect();

  const x = event.clientX ?? event.changedTouches?.[0].clientX;
  const y = event.clientY ?? event.changedTouches?.[0].clientY;

  if (x === undefined || y === undefined) return;

  mouse.x = ((x - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((y - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const intersections = raycaster.intersectObjects(
    arrowGroup.children,
    true
  );

  if (intersections.length > 0) {
    const target = intersections[0].object.userData.target;

    if (target) {
      loadScene(target);
    }
  }
}

renderer.domElement.addEventListener('click', handleArrowClick);

renderer.domElement.addEventListener('touchend', handleArrowClick);

const navMenu = document.createElement('div');
navMenu.className = 'nav-menu';
document.body.appendChild(navMenu);
navMenu.style.display = 'none';


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

const farmOptions = [
  {
  name: 'Farm 1',
  thumbnail: `${import.meta.env.BASE_URL}placeholder.jpg`,
  scene: 'farm1',
  type: 'The products of the farm.',
  location: 'Address of the farm.',
  description: 'Description of the farm.',

  locations: [
    {
      name: 'Farm 1 - Entrance',
      scene: 'farm1',

      arrows: [
        {
          x: -2,
          y: -0.5,
          z: -5,
          rotation: 90,
          distance: 12,
          target: 'bathroom'
        }
      ]
    },

    {
      name: 'Farm 1 - Bathroom',
      scene: 'bathroom',

      arrows: [
        {
          x: 1,
          y: -0.3,
          z: -1,
          rotation: 0,
          distance: 12,
          target: 'livingroom'
        },
        {
          x: -0.3,
          y: -0.3,
          z: -1,
          rotation: Math.PI,
          distance: 12,
          target: 'farm1'
        }
      ]
    },

    {
      name: 'Farm 1 - Location 3',
      scene: 'livingroom',

      arrows: [
        {
          x: 0,
          y: -0.3,
          z: -1,
          rotation: 0,
          distance: 12,
          target: 'bathroom'
        }
      ]
    }
  ]
},
  {name: 'Farm 2',
    thumbnail: `${import.meta.env.BASE_URL}placeholder2.jpg`,
    scene: 'farm2',
    type: 'The products of the farm.',
    location: 'Address of the farm.',
    description: 'Description of the farm.',
    locations:[
      {name: 'Farm 3 - Location 1', scene: 'farm2'},
      //{name: 'Farm 3 - Location 2', scene: ''},
      //{name: 'Farm 3 - Location 3', scene: ''}
    ]
  },
  {name: 'Farm 3',
    thumbnail: `${import.meta.env.BASE_URL}placeholder3.jpg`,
    scene: 'farm3',
    type: 'The products of the farm.',
    location: 'Address of the farm.',
    description: 'Description of the farm.',
    locations:[
      {name: 'Farm 3 - Location 1', scene: 'farm3'},
      //{name: 'Farm 3 - Location 2', scene: ''},
      //{name: 'Farm 3 - Location 3', scene: ''}
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