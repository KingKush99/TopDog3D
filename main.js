// Basic Three.js scene setup (placeholders)
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// GLTF Loader
const gltfLoader = new THREE.GLTFLoader();

// PERF: For deployment on mobile/web, further optimizations might be needed:
// - Model Simplification: Reducing polygon count of complex obstacles.
// - Texture Optimization: Compressing textures, using appropriate sizes.
// - Low-Power Mode: Potentially reducing effect quality or draw distance.

// Obstacle model files
const obstacleModelFiles = [
    'CoveredTunnel.glb', 'jump1.glb', 'jump2.glb', 'jump3.glb', 
    'largehoop.glb', 'ringette_ring.glb', 'slalom.glb', 'smallhoop.glb', 
    'swingboard.glb', 'table.glb', 'teeter.glb', 'TunnelBendLarge.glb', 
    'TunnelBendSmall.glb', 'tunnelline.glb'
];

// Loaded obstacle assets cache
const loadedObstacleAssets = new Map();

// Obstacle Configurations
// Assuming THREE is globally available (e.g., via <script src="three.js"></script>)
// If THREE.Euler or THREE.Vector3 are not found, the mock THREE object below might need adjustment
// or this script needs to be run in an environment where THREE is fully loaded.
const obstacleConfigurations = {
    'CoveredTunnel.glb': { 
        scale: new THREE.Vector3(1.2, 1.2, 1.5), 
        rotation: new THREE.Euler(0, Math.PI / 2, 0), 
        positionY: 0.6  // TEST: Adjust scale/Y-pos for proper ground fit & passage.
    },
    'TunnelBendLarge.glb': { 
        scale: new THREE.Vector3(1.2, 1.2, 1.2), 
        rotation: new THREE.Euler(0, Math.PI / 2, 0),
        positionY: 0.6  // TEST: Ensure player can comfortably pass through.
    },
    'TunnelBendSmall.glb': { 
        scale: new THREE.Vector3(1.0, 1.0, 1.0), 
        rotation: new THREE.Euler(0, Math.PI / 2, 0),
        positionY: 0.5  // TEST: Check passage clearance, especially with smaller scale.
    },
    'tunnelline.glb': { // This is likely a straight tunnel segment
        scale: new THREE.Vector3(1, 1, 2), 
        rotation: new THREE.Euler(0, Math.PI / 2, 0), 
        positionY: 0.5  // TEST: Verify length and Y-pos are suitable for sequences.
    },
    'jump1.glb': { 
        scale: new THREE.Vector3(0.6, 0.6, 0.6), 
        rotation: new THREE.Euler(0, Math.PI / 2, 0), 
        positionY: 0.1  // TEST: Is jump height/length fair? Player speed dependent.
    },
    'jump2.glb': { 
        scale: new THREE.Vector3(0.6, 0.6, 0.6), 
        rotation: new THREE.Euler(0, Math.PI / 2, 0), 
        positionY: 0.1  // TEST: Similar to jump1, ensure variety in challenge.
    },
    'jump3.glb': { 
        scale: new THREE.Vector3(0.6, 0.6, 0.6), 
        rotation: new THREE.Euler(0, Math.PI / 2, 0), 
        positionY: 0.1  // TEST: Check if this jump feels distinct from others.
    },
    'largehoop.glb': { 
        scale: new THREE.Vector3(1, 1, 1), 
        rotation: new THREE.Euler(0, 0, 0), 
        positionY: 1.0  // TEST: Player passage intuitive? Collision box accurate for hoop?
    },
    'smallhoop.glb': { 
        scale: new THREE.Vector3(0.7, 0.7, 0.7), 
        rotation: new THREE.Euler(0, 0, 0), 
        positionY: 0.7  // TEST: Is it challenging yet fair compared to largehoop?
    },
    'ringette_ring.glb': { // This is a flat ring, so rotation is key
        scale: new THREE.Vector3(0.8, 0.2, 0.8), 
        rotation: new THREE.Euler(Math.PI / 2, 0, 0), // Rotated to be flat on ground
        positionY: 0.1  // TEST: Is it clearly visible? Does player interact as expected (jump over)?
    },
    'slalom.glb': { 
        scale: new THREE.Vector3(0.2, 1.5, 0.2), // Tall and thin
        rotation: new THREE.Euler(0, Math.PI / 2, 0), 
        positionY: 0.75 // TEST: Spacing and hit detection for slalom. Are they too close/far in sequences?
    },
    'swingboard.glb': { 
        scale: new THREE.Vector3(1, 0.2, 0.5), 
        rotation: new THREE.Euler(0, Math.PI / 2, 0), 
        positionY: 0.5  // TEST: Does this behave like a ramp or flat obstacle? Y-pos and scale critical.
    },
    'table.glb': { 
        scale: new THREE.Vector3(1, 0.8, 0.6), 
        rotation: new THREE.Euler(0, Math.PI / 2, 0), 
        positionY: 0.4  // TEST: Clear to player if it's a jump-over or ride-on obstacle?
    },
    'teeter.glb': { 
        scale: new THREE.Vector3(1.5, 0.2, 0.4), 
        rotation: new THREE.Euler(0, Math.PI / 2, 0.17), // Approx 10 degrees tilt
        positionY: 0.3   // TEST: Teeter behavior/tilt appropriate? Does it react to player? (If dynamic)
    },
    'default': { // Fallback, ensure this is reasonably sized for any unconfigured model
        scale: new THREE.Vector3(0.5, 0.5, 0.5), 
        rotation: new THREE.Euler(0, Math.PI / 2, 0), 
        positionY: 0.5 
    }
};

// Obstacles array
const obstacles = [];

// Player (simple cube for now)
const playerGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
const playerMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const playerCube = new THREE.Mesh(playerGeometry, playerMaterial);
playerCube.position.set(0, 0.25, 0); // Initial player position
scene.add(playerCube);

// Game state
let isGameOver = false;

// --- Difficulty Progression Settings ---
// Adjust these values to change how game difficulty scales over time.
// distanceCovered: Main factor for increasing difficulty. Updated based on playerSpeed and deltaTime.
// baseSpawnInterval: Initial time (in seconds) between obstacle spawns.
// spawnIntervalReductionFactor: How much (in seconds) to reduce spawnInterval per difficultyStepDistance.
// difficultyStepDistance: Distance player needs to cover to trigger a reduction in spawnInterval.
// minSpawnInterval: The fastest spawn rate allowed.
let distanceCovered = 0; 
const clock = new THREE.Clock(); 
let lastSpawnTime = 0;
const baseSpawnInterval = 2.0; // Initial seconds between spawns
const spawnIntervalReductionFactor = 0.1; // Reduce spawn interval by this amount (seconds)
const difficultyStepDistance = 150; // Distance units to trigger reduction
const minSpawnInterval = 0.75; // Minimum seconds between spawns
const maxObstaclesInScene = 15; // Maximum number of obstacles present at once

// Lane positions
const lanePositions = [-2.5, 0, 2.5]; // Example lane X coordinates

// Themed Obstacle Spawning
const obstacleThemes = {
    'jumps': ['jump1.glb', 'jump2.glb', 'jump3.glb', 'table.glb', 'teeter.glb'],
    'tunnels': ['CoveredTunnel.glb', 'TunnelBendLarge.glb', 'TunnelBendSmall.glb', 'tunnelline.glb'],
    'hoops': ['smallhoop.glb', 'largehoop.glb', 'ringette_ring.glb'],
    'technical': ['slalom.glb', 'swingboard.glb'] 
    // All models from obstacleModelFiles are categorized.
};
const themeKeys = Object.keys(obstacleThemes);
let currentThemeIndex = 0; // Start with the first theme by index
let currentThemeName = themeKeys[currentThemeIndex];
let obstaclesSpawnedInCurrentTheme = 0;
const maxObstaclesPerTheme = 5; // Spawn 5 obstacles before potentially switching themes

// Placeholder for spawnObstacle function
function spawnObstacle() {
    // Theme switching logic
    if (obstaclesSpawnedInCurrentTheme >= maxObstaclesPerTheme) {
        currentThemeIndex = (currentThemeIndex + 1) % themeKeys.length; // Cycle to next theme
        currentThemeName = themeKeys[currentThemeIndex];
        obstaclesSpawnedInCurrentTheme = 0;
        // console.log("Switched to theme:", currentThemeName); 
    }

    const themeModels = obstacleThemes[currentThemeName];
    if (!themeModels || themeModels.length === 0) {
        console.error(`Theme ${currentThemeName} has no models or is undefined.`);
        // Fallback to a default model or skip spawning
        return; 
    }
    const randomModelFilename = themeModels[Math.floor(Math.random() * themeModels.length)];
    const modelPath = `./assets/models/obstacles/${randomModelFilename}`; // Assuming models are in this path

    if (loadedObstacleAssets.has(randomModelFilename)) {
        const originalAsset = loadedObstacleAssets.get(randomModelFilename);
        const loadedModel = originalAsset.clone();
        
        const config = obstacleConfigurations[randomModelFilename] || obstacleConfigurations['default'];

        loadedModel.scale.copy(config.scale);
        loadedModel.rotation.copy(config.rotation);
        
        // Lane assignment for X position
        const randomLaneIndex = Math.floor(Math.random() * lanePositions.length);
        const laneX = lanePositions[randomLaneIndex];
        const randomZ = -Math.random() * 50 - 20; // Spawn further ahead and ensure they are off-screen initially.
        loadedModel.position.set(laneX, config.positionY, randomZ);

        // Store model type for collision detection
        loadedModel.userData = { type: randomModelFilename };
        
        obstaclesSpawnedInCurrentTheme++;
        scene.add(loadedModel);
        obstacles.push(loadedModel);
        // console.log(`Loaded ${randomModelFilename} from cache (Theme: ${currentThemeName}).`);

    } else {
        // PERF: For frequently spawned, identical obstacles (e.g., many slalom poles),
        // consider using THREE.InstancedMesh if performance with many individual clones becomes an issue.
        // This would require a different setup for managing instances.
        gltfLoader.load(
            modelPath,
            (gltf) => {
                // Store the original loaded scene (gltf.scene)
                loadedObstacleAssets.set(randomModelFilename, gltf.scene);

                // Clone it for the current instance
                const loadedModel = gltf.scene.clone();

                // Configure the cloned model
                const config = obstacleConfigurations[randomModelFilename] || obstacleConfigurations['default'];

                loadedModel.scale.copy(config.scale);
                loadedModel.rotation.copy(config.rotation);

                // Lane assignment for X position
                const randomLaneIndex = Math.floor(Math.random() * lanePositions.length);
                const laneX = lanePositions[randomLaneIndex];
                const randomZ = -Math.random() * 50 - 20; // Spawn further ahead
                loadedModel.position.set(laneX, config.positionY, randomZ);

                // Store model type for collision detection
                loadedModel.userData = { type: randomModelFilename };
                
                obstaclesSpawnedInCurrentTheme++;
                scene.add(loadedModel);
                obstacles.push(loadedModel);
                // console.log(`Loaded ${randomModelFilename} from network (Theme: ${currentThemeName}) and cached.`);
            },
            undefined, // onProgress callback (optional)
            (error) => {
                console.error(`An error happened while loading ${randomModelFilename}:`, error);
            }
        );
    }
}

// Simple animation loop (placeholder)
function animate() {
    const deltaTime = clock.getDelta(); // Time since last frame
    requestAnimationFrame(animate);

    if (!isGameOver) {
        // Update distance covered (example: based on time or player movement)
        // For simplicity, let's assume a constant speed for distance calculation.
        // This should ideally be tied to player's actual forward movement speed.
        const playerSpeed = 5; // units per second (example value)
        distanceCovered += playerSpeed * deltaTime;

        // Move player forward (example, if not controlled by input)
        // playerCube.position.z -= playerSpeed * deltaTime; 
        // camera.position.z -= playerSpeed * deltaTime; // If camera follows player

        // PERF: Complex collision detection (especially per-polygon or many raycasts) can be a bottleneck.
        // Profile using browser developer tools if frame rate drops significantly with many obstacles.
        // Collision Detection Logic
        for (let i = 0; i < obstacles.length; i++) {
            const obstacle = obstacles[i];
            const obstacleType = obstacle.userData ? obstacle.userData.type : null;

            // Ensure THREE.Box3 is available, otherwise skip collision (or rely on mock)
            if (typeof THREE.Box3 === 'undefined') {
                console.warn("THREE.Box3 not defined, skipping collision check.");
                continue; 
            }

            const playerBoundingBox = new THREE.Box3().setFromObject(playerCube);
            const obstacleBoundingBox = new THREE.Box3().setFromObject(obstacle);
            let collisionDetected = false;

            if (obstacleType && obstacleType.toLowerCase().includes('tunnel')) {
                // For Tunnels: Pass through for now
                if (playerBoundingBox.intersectsBox(obstacleBoundingBox)) {
                    // TODO: Implement proper 'inside tunnel' collision detection.
                    // Currently, player passes through all tunnels to avoid unfair early collisions.
                    // A real check might involve:
                    // 1. Verifying player intersects the main bounding box.
                    // 2. Checking if player is *also* within a defined "passage" inner bounding box.
                    // 3. Or, using raycasting from player to check distance to inner tunnel walls.
                    collisionDetected = false; // Current placeholder: pass through
                }
            } else if (obstacleType && obstacleType.toLowerCase().includes('hoop')) {
                // For Hoops: Standard AABB
                if (playerBoundingBox.intersectsBox(obstacleBoundingBox)) {
                    // TODO: Refine hoop collision for better accuracy.
                    // Current AABB may be too sensitive at edges. Consider:
                    // 1. Defining a slightly smaller "inner" bounding box for the actual passage.
                    // 2. Checking if the player's center point is within the hoop's passage area.
                    collisionDetected = true;
                }
            } else {
                // Default for all other obstacles
                if (playerBoundingBox.intersectsBox(obstacleBoundingBox)) {
                    collisionDetected = true;
                }
            }

            if (collisionDetected) {
                isGameOver = true;
                console.log(`Game Over! Collided with ${obstacleType || 'unknown obstacle'}`);
                if (playerCube.material && playerCube.material.color) {
                    playerCube.material.color.setHex(0x0000ff); // Change player color to blue
                }
                break; 
            }
        }

        // Basic obstacle removal (if they go too far behind player)
        // This is a simple cleanup, not part of the core collision task
        for (let i = obstacles.length - 1; i >= 0; i--) {
            if (obstacles[i].position.z > camera.position.z + 10) { // Check if obstacle is far behind
                scene.remove(obstacles[i]);
                obstacles.splice(i, 1);
                // console.log("Removed obstacle");
            }
        }
        // Spawn new obstacles periodically using Difficulty Progression Option A
        const currentTime = clock.getElapsedTime(); // Total time elapsed
        let currentSpawnInterval = baseSpawnInterval - (Math.floor(distanceCovered / difficultyStepDistance) * spawnIntervalReductionFactor);
        if (currentSpawnInterval < minSpawnInterval) { 
            currentSpawnInterval = minSpawnInterval;
        }

        if (currentTime - lastSpawnTime > currentSpawnInterval && obstacles.length < maxObstaclesInScene) { 
            spawnObstacle();
            lastSpawnTime = currentTime;
            // console.log(`Spawn interval: ${currentSpawnInterval.toFixed(2)}s, Distance: ${distanceCovered.toFixed(0)}, Obstacles: ${obstacles.length}`);
        }

    } // end if(!isGameOver)

    renderer.render(scene, camera);
}

// Initial setup calls (examples)
camera.position.z = 10; // Move camera back a bit to see obstacles spawning further away
// spawnObstacle(); // Initial obstacles will be spawned by the timer in animate()
// spawnObstacle(); 
// spawnObstacle(); 
animate(); // Start the animation loop which includes spawning

// Basic lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(0, 1, 0);
scene.add(directionalLight);

// Ensure THREE is defined (or imported/required if using modules)
// This script assumes THREE is globally available via a <script> tag.
// If using ES6 modules, you would use: import * as THREE from 'three';
// and import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
if (typeof THREE === 'undefined') {
    console.error('THREE.js is not loaded. Please include it in your HTML.');
    // As a fallback for the sandbox environment, we might need to define a mock THREE
    // if it's not actually running in a browser with Three.js loaded.
    // For the purpose of this task, we assume THREE and GLTFLoader are available.
}
// Ensure GLTFLoader is available (or mock it for non-browser environments)
if (typeof THREE !== 'undefined' && typeof THREE.GLTFLoader === 'undefined') {
    // Mock GLTFLoader if not present (e.g., in a pure Node.js environment without JSDOM)
    THREE.GLTFLoader = function() {
        return {
            load: function(url, onLoad, onProgress, onError) {
                console.warn(`GLTFLoader.load called for ${url} - Mocking GLTF load. Call onLoad with a mock scene.`);
                // Simulate a load completion with a mock object
                // In a real scenario, this would be an async operation.
                setTimeout(() => {
                    if (onLoad) {
                        onLoad({ scene: new THREE.Group() }); // Return a new Group as a mock scene
                    }
                }, 100);
            }
        };
    };
    gltfLoader = new THREE.GLTFLoader(); // Re-assign with mock if it was undefined
    console.warn('THREE.GLTFLoader was undefined. A mock has been provided.');
} else if (typeof THREE === 'undefined') {
    // If THREE itself is undefined, GLTFLoader will also be.
    // Define mock THREE and GLTFLoader for the script to not crash.
    global.THREE = {
        Scene: function() { return { add: () => {} }; },
        PerspectiveCamera: function() {},
        WebGLRenderer: function() { return { setSize: () => {}, render: () => {}, domElement: {} }; },
        AmbientLight: function() {},
        DirectionalLight: function() {},
        GLTFLoader: function() {
            return {
                load: function(url, onLoad, onProgress, onError) {
                    console.warn(`GLTFLoader.load called for ${url} - Mocking GLTF load (THREE was also undefined). Call onLoad with a mock scene.`);
                    setTimeout(() => {
                        if (onLoad) {
                            const mockScene = { 
                                userData: {}, 
                                clone: function() { 
                                    // console.log("Mock scene cloned for " + url + " (Theme: " + currentThemeName + ")");
                                    return {
                                        isObject3D: true,
                                        userData: {}, 
                                        clone: function() { return this; }, 
                                        scale: { x:1, y:1, z:1, copy: function(s) { this.x=s.x; this.y=s.y; this.z=s.z;} },
                                        rotation: { x:0, y:0, z:0, _order:'XYZ', copy: function(r) {this.x=r.x; this.y=r.y; this.z=r.z; this._order=r._order;} },
                                        position: { x:0, y:0, z:0, set: function(x,y,z) {this.x=x; this.y=y; this.z=z;}, copy: function(p) {this.x=p.x; this.y=p.y; this.z=p.z;} }
                                    };
                                },
                                scale: { x:1, y:1, z:1, copy: function(s) { this.x=s.x; this.y=s.y; this.z=s.z;} },
                                rotation: { x:0, y:0, z:0, _order:'XYZ', copy: function(r) {this.x=r.x; this.y=r.y; this.z=r.z; this._order=r._order;} },
                                position: { x:0, y:0, z:0, set: function(x,y,z) {this.x=x; this.y=y; this.z=z;}, copy: function(p) {this.x=p.x; this.y=p.y; this.z=p.z;} }
                            };
                            onLoad({ scene: mockScene.clone() });
                        }
                    }, 100);
                }
            };
        },
        Clock: function() { 
            let mockStartTime = Date.now(); // Renamed to avoid conflict with outer scope if any
            let mockElapsedTime = 0;
            this.getDelta = function() { 
                const newTime = Date.now();
                const diff = (newTime - mockStartTime) / 1000;
                mockStartTime = newTime;
                mockElapsedTime += diff;
                return diff > 0.05 ? 0.05 : diff; 
            };
            this.getElapsedTime = function() { return mockElapsedTime; };
        },
        Box3: function() { // Mock for THREE.Box3
            this.min = { x: 0, y: 0, z: 0 };
            this.max = { x: 0, y: 0, z: 0 };
            this.setFromObject = function(object) {
                // Super simplified AABB calculation for mock
                // Assumes object has a 'geometry' and it has a 'boundingBox'
                // or it's a Group and we should iterate children (not done for this mock)
                if (object.geometry && object.geometry.boundingBox) {
                    // Simplified: copy min/max directly if they exist (e.g. from another Box3)
                    if (object.min && object.max) {
                        this.min.x = object.min.x; this.min.y = object.min.y; this.min.z = object.min.z;
                        this.max.x = object.max.x; this.max.y = object.max.y; this.max.z = object.max.z;
                    } else { // Fallback for actual Mesh objects
                        this.min.x = object.position.x - 0.25; this.max.x = object.position.x + 0.25;
                        this.min.y = object.position.y - 0.25; this.max.y = object.position.y + 0.25;
                        this.min.z = object.position.z - 0.25; this.max.z = object.position.z + 0.25;
                    }
                } else { // Default small box if no geometry/boundingBox and no position (should not happen for valid Object3D)
                    this.min.x = -0.1; this.min.y = -0.1; this.min.z = -0.1;
                    this.max.x = 0.1; this.max.y = 0.1; this.max.z = 0.1;
                }
                return this;
            };
            this.intersectsBox = function(box) {
                return (this.max.x >= box.min.x && this.min.x <= box.max.x) &&
                       (this.max.y >= box.min.y && this.min.y <= box.max.y) &&
                       (this.max.z >= box.min.z && this.min.z <= box.max.z);
            };
            this.clone = function() {
                const newBox = new THREE.Box3();
                newBox.min.x = this.min.x; newBox.min.y = this.min.y; newBox.min.z = this.min.z;
                newBox.max.x = this.max.x; newBox.max.y = this.max.y; newBox.max.z = this.max.z;
                return newBox;
            }
        },
        BoxGeometry: function(w,h,d) { // Mock for THREE.BoxGeometry
             return { 
                boundingBox: { 
                    min: {x:-w/2,y:-h/2,z:-d/2, copy: function(v){this.x=v.x;this.y=v.y;this.z=v.z;}, set: function(x,y,z){this.x=x;this.y=y;this.z=z;}}, 
                    max: {x:w/2,y:h/2,z:d/2, copy: function(v){this.x=v.x;this.y=v.y;this.z=v.z;}, set: function(x,y,z){this.x=x;this.y=y;this.z=z;}}
                } 
            };
        },
        MeshStandardMaterial: function(params) { 
            return { color: { setHex: (hex) => { /* console.log(`Mock material color changed to ${hex}`); */ } } };
        },
        Mesh: function(geo, mat) { // Mock for THREE.Mesh
            return { 
                geometry: geo, material: mat, 
                position: {x:0,y:0,z:0, set:function(x,y,z){this.x=x;this.y=y;this.z=z;}},
                userData: {} // Ensure userData exists on mock playerMesh
            };
        },
        Vector3: function(x=0, y=0, z=0) { 
            this.x = x; this.y = y; this.z = z;
            this.copy = function(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; };
            this.set = function(x,y,z) { this.x=x; this.y=y; this.z=z; return this;};
        },
        Euler: function(x=0, y=0, z=0, order='XYZ') { 
            this.x = x; this.y = y; this.z = z; this._order = order;
            this.copy = function(e) { this.x = e.x; this.y = e.y; this.z = e.z; this._order = e._order; return this; };
            this.set = function(x,y,z,order) { this.x=x; this.y=y; this.z=z; this._order = order || this._order; return this;};
        },
        Group: function() { 
            return {
                isObject3D: true, userData: {}, // Ensure userData exists on mock Group
                clone: function() { console.log("Mock THREE.Group cloned"); return this; },
                scale: { x:1, y:1, z:1, copy: function(s) { this.x=s.x; this.y=s.y; this.z=s.z;} },
                rotation: { x:0, y:0, z:0, _order:'XYZ', copy: function(r) {this.x=r.x; this.y=r.y; this.z=r.z; this._order=r._order;} },
                position: { x:0, y:0, z:0, set: function(x,y,z) {this.x=x; this.y=y; this.z=z;}, copy: function(p) {this.x=p.x; this.y=p.y; this.z=p.z;} }
            };
        },
        Object3D: function() { 
             return {
                isObject3D: true, userData: {}, // Ensure userData exists on mock Object3D
                clone: function() { console.log("Mock THREE.Object3D cloned"); return this; },
                scale: { x:1, y:1, z:1, copy: function(s) { this.x=s.x; this.y=s.y; this.z=s.z;} },
                rotation: { x:0, y:0, z:0, _order:'XYZ', copy: function(r) {this.x=r.x; this.y=r.y; this.z=r.z; this._order=r._order;} },
                position: { x:0, y:0, z:0, set: function(x,y,z) {this.x=x; this.y=y; this.z=z;}, copy: function(p) {this.x=p.x; this.y=p.y; this.z=p.z;} }
            };
        }
    };
    // Re-initialize dependent variables if THREE was undefined to use mocks (ensure playerCube uses mocks too)
    scene = new THREE.Scene(); 
    camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000); 
    renderer = new THREE.WebGLRenderer(); 
    gltfLoader = new THREE.GLTFLoader(); 
    ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    scene.add(ambientLight);
    scene.add(directionalLight);
    // Player and material if THREE was undefined
    playerGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5); // Uses mock BoxGeometry
    playerMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 }); // Uses mock MeshStandardMaterial
    playerCube = new THREE.Mesh(playerGeometry, playerMaterial); // Uses mock Mesh
    playerCube.position.set(0, 0.25, 0);
    scene.add(playerCube);
    // Clock for animations and spawning
    clock = new THREE.Clock(); // Uses mock Clock

    console.warn('THREE object was undefined. Full mocks for THREE, GLTFLoader, Clock, Box3, Geometries, Materials, Mesh, Vector3, Euler, Group, Object3D have been provided.');
} else if (typeof THREE !== 'undefined') {
    // If THREE is defined, ensure necessary components are available
    if (typeof THREE.Clock === 'undefined') {
        console.warn('THREE.Clock was undefined. Adding basic mock for time-based actions.');
        THREE.Clock = function() { 
            let mockStartTime = Date.now(); let mockElapsedTime = 0;
            this.getDelta = function() { const n = Date.now(); const d = (n - mockStartTime) / 1000; mockStartTime = n; mockElapsedTime += d; return d > 0.05 ? 0.05 : d; };
            this.getElapsedTime = function() { return mockElapsedTime; };
        };
    }
    if (typeof THREE.Box3 === 'undefined') {
        console.warn('THREE.Box3 was undefined. Adding basic mock for collision detection.');
        THREE.Box3 = function() { 
            this.min = { x:0,y:0,z:0,copy:function(v){this.x=v.x;this.y=v.y;this.z=v.z;},set:function(x,y,z){this.x=x;this.y=y;this.z=z;}}; 
            this.max = { x:0,y:0,z:0,copy:function(v){this.x=v.x;this.y=v.y;this.z=v.z;},set:function(x,y,z){this.x=x;this.y=y;this.z=z;}};
            this.setFromObject = function(object) { /* Simplified */ this.min = object.position; this.max = object.position; return this; };
            this.intersectsBox = function(box) { /* Simplified */ return false; };
            this.clone = function() { const newBox = new THREE.Box3(); newBox.min = {...this.min}; newBox.max = {...this.max}; return newBox; };
        };
    }
    if (typeof THREE.BoxGeometry === 'undefined') {
        console.warn('THREE.BoxGeometry was undefined. Player cube might not render correctly.');
        THREE.BoxGeometry = function(w,h,d) { return { boundingBox: {min:{x:-w/2,y:-h/2,z:-d/2}, max:{x:w/2,y:h/2,z:d/2}} }; };
    }
     if (typeof THREE.MeshStandardMaterial === 'undefined') {
        console.warn('THREE.MeshStandardMaterial was undefined. Player cube might not render correctly.');
        THREE.MeshStandardMaterial = function(params) { return { color: { setHex: () => {} } }; };
    }
     if (typeof THREE.Mesh === 'undefined') {
        console.warn('THREE.Mesh was undefined. Player cube might not render correctly.');
        THREE.Mesh = function(geo, mat) { return { geometry: geo, material: mat, position: {x:0,y:0,z:0, set:function(){}}, userData: {} }; };
    }
    // Ensure Vector3 and Euler mocks from previous steps are still in place if needed
    if (typeof THREE.Vector3 === 'undefined') {
        console.warn('THREE.Vector3 was undefined. Adding basic mock.');
        THREE.Vector3 = function(x=0, y=0, z=0) { this.x = x; this.y = y; this.z = z; this.copy = function(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }; this.set = function(x,y,z) { this.x=x; this.y=y; this.z=z; return this;}; };
    }
    if (typeof THREE.Euler === 'undefined') {
        console.warn('THREE.Euler was undefined. Adding basic mock.');
        THREE.Euler = function(x=0, y=0, z=0, order='XYZ') { this.x = x; this.y = y; this.z = z; this._order = order; this.copy = function(e) { this.x = e.x; this.y = e.y; this.z = e.z; this._order = e._order; return this; }; this.set = function(x,y,z,order) { this.x=x; this.y=y; this.z=z; this._order = order || this._order; return this;}; };
    }
}
