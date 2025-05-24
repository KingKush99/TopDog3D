import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Basic Three.js setup: Scene, Camera, Renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas') });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// GLTF Loader
const gltfLoader = new GLTFLoader();

// Ground Plane
const groundGeometry = new THREE.PlaneGeometry(30, 200); // Width, Length
const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x008000 }); // Green
const groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
groundPlane.rotation.x = -Math.PI / 2; // Rotate to be flat
groundPlane.position.y = 0;
scene.add(groundPlane);

// Player Cube
const playerGeometry = new THREE.BoxGeometry(1, 1, 1); // Size
const playerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Red
const playerCube = new THREE.Mesh(playerGeometry, playerMaterial);
playerCube.position.y = 0.5; // Place it on top of the ground
scene.add(playerCube); // Re-add player cube for testing

// Lane definitions
const lanePositions = [-2, 0, 2]; // X-coordinates for left, middle, right lanes
let currentLaneIndex = 1; // Start in the middle lane
playerCube.position.x = lanePositions[currentLaneIndex];

// Camera position
camera.position.z = 5;
camera.position.y = 3;
camera.lookAt(playerCube.position);

// Obstacle settings
const obstacles = [];
const obstacleModelFiles = ['smallhoop.glb', 'largehoop.glb', 'ringette_ring.glb', 'table.glb', 'jump1.glb'];
const obstacleModelPath = 'models/obstacles/';
// const obstacleMaterial = new THREE.MeshBasicMaterial({ color: 0x808080 }); // No longer needed for GLTF
// const obstacleBaseGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8); // No longer needed for GLTF
const spawnZPosition = -20;
const removalZPosition = camera.position.z + 5;
const obstacleSpeed = 0.1; // Speed at which obstacles move towards the player
let lastSpawnTime = 0;
const spawnInterval = 2000; // milliseconds (2 seconds)

// Game State
let isGameOver = false;
let distanceCovered = 0;
const distanceFactor = 0.05; // Rate of distance increase per frame
const distanceDisplayElement = document.getElementById('distanceDisplay');

// Handle Keyboard Input for Lane Switching
document.addEventListener('keydown', (event) => {
    if (isGameOver) return;

    if (event.key === 'ArrowLeft') {
        if (currentLaneIndex > 0) {
            currentLaneIndex--;
        }
    } else if (event.key === 'ArrowRight') {
        if (currentLaneIndex < lanePositions.length - 1) {
            currentLaneIndex++;
        }
    }
});

function spawnObstacle() {
    const randomLaneIndex = Math.floor(Math.random() * lanePositions.length);
    const randomModelFilename = obstacleModelFiles[Math.floor(Math.random() * obstacleModelFiles.length)];
    const fullModelPath = obstacleModelPath + randomModelFilename;

    gltfLoader.load(
        fullModelPath,
        (gltf) => {
            const loadedModel = gltf.scene;
            loadedModel.position.x = lanePositions[randomLaneIndex];
            loadedModel.position.y = 0.5; // Adjust as needed based on model pivot
            loadedModel.position.z = spawnZPosition;

            // Generic initial scale and rotation
            loadedModel.scale.set(0.5, 0.5, 0.5);
            loadedModel.rotation.y = Math.PI / 2; // Example: Rotate to face player or sideways

            scene.add(loadedModel);
            obstacles.push(loadedModel); // Add the Group (gltf.scene) to obstacles array
        },
        undefined, // onProgress callback (optional)
        (error) => {
            console.error(`Error loading GLTF model from ${fullModelPath}:`, error);
            // Fallback to cube or log error - currently just logging.
        }
    );
}

function animate(currentTime) {
    requestAnimationFrame(animate);

    if (!isGameOver) {
        // Update player position (snap to lane)
        if (playerCube) { // Check if playerCube is available (it will be once model is loaded)
             playerCube.position.x = lanePositions[currentLaneIndex];
        }


        // Spawn obstacles periodically
        if (currentTime - lastSpawnTime > spawnInterval) {
            spawnObstacle();
            lastSpawnTime = currentTime;
        }

        // Move obstacles and check for collisions
        if (playerCube) { // Only check collisions if player model is loaded
            const playerBoundingBox = new THREE.Box3().setFromObject(playerCube);
            for (let i = obstacles.length - 1; i >= 0; i--) {
                const obstacle = obstacles[i];
                obstacle.position.z += obstacleSpeed;

                // Collision detection
                const obstacleBoundingBox = new THREE.Box3().setFromObject(obstacle);
                if (playerBoundingBox.intersectsBox(obstacleBoundingBox)) {
                    isGameOver = true;
                    console.log("Game Over!");
                    if (playerCube.material) playerCube.material.color.setHex(0x0000ff); // Change player color
                    break; 
                }

                // Remove off-screen obstacles
            if (obstacle.position.z > removalZPosition) {
                scene.remove(obstacle);
                // It's good practice to dispose of geometries and materials if they are unique
                // obstacle.geometry.dispose(); 
                // obstacle.material.dispose(); 
                obstacles.splice(i, 1);
            }
        }

        // Update distance
        distanceCovered += distanceFactor;
        distanceDisplayElement.textContent = \`Distance: \${distanceCovered.toFixed(0)}\`;
    }

    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start the animation loop
animate(0);
