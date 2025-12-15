import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// --- CONFIG ---
const PARTICLE_COUNT = 10000;
const PARTICLE_SIZE = 0.5;

// --- STATE (The Bridge) ---
// These variables will be updated by your hand tracking logic
const AppState = {
    template: 'fireworks', // 'hearts', 'saturn', 'fireworks'
    expansionFactor: 0.0,   // Controls the spread (0.0 to 1.0)
    targetColor: new THREE.Color(0xffffff),
    handPosition: new THREE.Vector3(0, 0, 0) // Position in world space
};

let scene, camera, renderer, controls;
let instancedMesh;
const dummy = new THREE.Object3D();
const particleProps = []; // Stores individual particle properties (position, velocity, age)

function init() {
    // 1. Scene Setup
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 50;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // 2. Initialize Particles
    createParticles();

    // 3. Start Loop
    window.addEventListener('resize', onWindowResize);
    animate();
}

function createParticles() {
    // Shared Geometry and Material for Instanced Mesh
    const geometry = new THREE.SphereGeometry(PARTICLE_SIZE, 8, 8);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
    
    instancedMesh = new THREE.InstancedMesh(geometry, material, PARTICLE_COUNT);
    scene.add(instancedMesh);

    // Initialize individual particle properties
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        // Initial random position
        const position = new THREE.Vector3(
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10
        );
        
        particleProps.push({
            initialPosition: position.clone(),
            position: position,
            velocity: new THREE.Vector3(0, 0, 0),
            age: Math.random() * 10,
            maxAge: 10 + Math.random() * 10,
            color: new THREE.Color(Math.random(), Math.random(), Math.random()) // Initial random color
        });
        
        // Set initial instance matrix
        dummy.position.copy(position);
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(i, dummy.matrix);
        // Set initial instance color (requires an InstancedBufferAttribute, simplifying for initial template)
        // For real color change, you'd use instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(...)
    }

    instancedMesh.instanceMatrix.needsUpdate = true;
}

function updateParticles(deltaTime) {
    const time = Date.now() * 0.001; // For sine wave animations

    // Convert hand expansion factor to a world-space radius
    const maxRadius = 15;
    const currentRadius = AppState.expansionFactor * maxRadius;

    // Update particles based on current AppState
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = particleProps[i];
        p.age += deltaTime;

        // 1. Particle Template Logic
        switch(AppState.template) {
            case 'fireworks':
                // Particles expand from the hand position
                if (p.age > p.maxAge) {
                    // Reset/Respawn particle near the hand position
                    p.position.copy(AppState.handPosition);
                    p.velocity.set(
                        (Math.random() - 0.5) * currentRadius * 0.5,
                        (Math.random() - 0.5) * currentRadius * 0.5,
                        (Math.random() - 0.5) * currentRadius * 0.5
                    );
                    p.age = 0;
                }
                
                // Simple physics: Apply velocity and damp it
                p.position.addScaledVector(p.velocity, deltaTime);
                p.velocity.multiplyScalar(0.99); 
                
                // Color change based on age (fading)
                const fade = 1.0 - (p.age / p.maxAge);
                instancedMesh.setColorAt(i, AppState.targetColor.clone().multiplyScalar(fade));

                break;
                
            case 'saturn':
                // Particles orbit around the hand position in a plane
                const angle = time * 0.5 + i * 0.01;
                p.position.x = AppState.handPosition.x + Math.cos(angle) * currentRadius;
                p.position.y = AppState.handPosition.y + (Math.sin(time * 2) * 2); // Wobbly effect
                p.position.z = AppState.handPosition.z + Math.sin(angle) * currentRadius;
                
                // Color change based on expansion
                instancedMesh.setColorAt(i, new THREE.Color().lerpColors(new THREE.Color(0x0000ff), AppState.targetColor, AppState.expansionFactor));

                break;
            
            // ... Add 'hearts', 'flowers', etc. templates here ...
        }

        // 2. Apply updates to the Instanced Mesh
        dummy.position.copy(p.position);
        
        // Optional: Scale particle size based on a factor (e.g., p.scale = 0.5 + fade * 0.5)
        dummy.scale.setScalar(PARTICLE_SIZE); 
        
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(i, dummy.matrix);
    }

    instancedMesh.instanceMatrix.needsUpdate = true;
    // instancedMesh.instanceColor.needsUpdate = true; // Uncomment if using InstancedBufferAttribute for color
}

// --- Main Loop ---
let lastTime = 0;
function animate(currentTime) {
    requestAnimationFrame(animate);

    const deltaTime = (currentTime - lastTime) / 1000; // Convert ms to seconds
    lastTime = currentTime;

    // Placeholder: Simulate hand input for testing
    // In the real app, this is where your tracking library updates AppState
    AppState.expansionFactor = (Math.sin(currentTime * 0.001) + 1) / 2; // Pulsing expansion
    AppState.handPosition.x = Math.cos(currentTime * 0.0005) * 5;
    AppState.targetColor.setHSL(Math.sin(currentTime * 0.0002), 0.8, 0.5); // Cycling color

    updateParticles(deltaTime);

    controls.update();
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Start the application
init();

// ---

// 🚀 NEXT STEPS (Hand Tracking)
// 1. Add <script src="https://cdn.jsdelivr.net/npm/@mediapipe/hands"></script> to index.html
// 2. Implement a function to initialize video/webcam access (navigator.mediaDevices.getUserMedia)
// 3. Create a Hands object (new Hands({ ... })) and attach the video stream.
// 4. In the Hands 'onResults' callback, analyze the 21 hand landmarks:
//    - **Expansion:** Calculate the distance between the tip of the thumb (index 4) and the tip of the index finger (index 8). Normalize this distance (0 to 1) and assign it to `AppState.expansionFactor`.
//    - **Position:** Map the wrist or palm position (landmark 0) from screen space (0-1) to Three.js world space (-10 to +10) and assign it to `AppState.handPosition`.
//    - **Template Switch:** Implement a gesture, e.g., a fist to switch `AppState.template` (e.g., `if (thumb_to_palm_distance < 0.1) { AppState.template = 'saturn'; }`).
