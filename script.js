// disable THREE.js cache for fresh texture loading
THREE.Cache.enabled = false;

// global variables
let starField;
let scene, camera, renderer, clock;
let sun, planets = [];
let paused = false;
let mouseDown = false;
let cameraAngle = { x: 0, y: 0 };

// Planet data definition
const planetData = [
    { name: 'Mercury', size: 0.8, distance: 12, color: 0x8c7853, baseSpeed: 4.1 },
    { name: 'Venus', size: 1.2, distance: 16, color: 0xffc649, baseSpeed: 1.6 },
    { name: 'Earth', size: 1.3, distance: 20, color: 0x6b93d6, baseSpeed: 1.0 },
    { name: 'Mars', size: 1.0, distance: 24, color: 0xcd5c5c, baseSpeed: 0.5 },
    { name: 'Jupiter', size: 3.0, distance: 32, color: 0xd8ca9d, baseSpeed: 0.08 },
    { name: 'Saturn', size: 2.5, distance: 40, color: 0xfad5a5, baseSpeed: 0.03 },
    { name: 'Uranus', size: 1.8, distance: 48, color: 0x4fd0e4, baseSpeed: 0.01 },
    { name: 'Neptune', size: 1.7, distance: 56, color: 0x4b70dd, baseSpeed: 0.006 },
];

//intialized planet speed based on baseSpeed
let planetSpeeds = planetData.map(p => p.baseSpeed);

// initialize scene, camera, renderer, objects. lighting
function init() {
    console.log('Initializeing Solar system...');

    //create scene
    scene = new THREE.Scene();

    // setup perspective camera
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        2000
    );

    camera.position.set(0, 0, 50);

    // setup renderer
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 1);

    const container = document.getElementById('container');
    container.appendChild(renderer.domElement);

    clock = new THREE.Clock();

    createSun();
    createPlanets();
    setupLighting();
    setupControls();
    setupEventListener();
    addStarfield();
    addPlanetLabels();
    addOrbitLines();

    animate();

    console.log("Solar system initialized successfully!");
}

// create sun with texture nd glow
function createSun() {
    const textureLoader = new THREE.TextureLoader();
    const sunTexture = textureLoader.load('textures/sun.jpg');
    const geometry = new THREE.SphereGeometry(5, 32, 32);

    const material = new THREE.MeshBasicMaterial({
        map: sunTexture,
        color: 0xffff00,
        transparent: true,
        opacity: 0.9
    });

    sun = new THREE.Mesh(geometry, material);

    // added inner and outer glow effects
    const glowGeometry = new THREE.SphereGeometry(5.3, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffdd00,
        transparent: true,
        opacity: 0.15,
        side: THREE.BackSide
    });

    const glow = new THREE.Mesh(glowGeometry, glowMaterial);

    const outerGlowGeometry = new THREE.SphereGeometry(5.5, 32, 32);
    const outerGlowMaterial = new THREE.MeshBasicMaterial({
        color: 0xff8800,
        transparent: true,
        opacity: 0.1,
        side: THREE.BackSide
    });

    const outerGlow = new THREE.Mesh(outerGlowGeometry, outerGlowMaterial);

    sun.add(glow);
    sun.add(outerGlow)
    scene.add(sun);

}

// created planets using data, texture and added to scene
function createPlanets() {

    const textureLoader = new THREE.TextureLoader();

    planetData.forEach((data, i) => {
        const colorMap = textureLoader.load(`textures/${data.name.toLowerCase()}.jpg`);
        const bumpMap = textureLoader.load(`textures/${data.name.toLowerCase()}.jpg`);
        const geometry = new THREE.SphereGeometry(data.size, 32, 32);
        const material = new THREE.MeshPhongMaterial({
            map: colorMap,
            bumpMap: bumpMap,
            bumpScale: 0.05,
            specular: new THREE.Color(0x333333),
            shininess: 25
        });
        const planet = new THREE.Mesh(geometry, material);

        planet.position.x = data.distance;
        planet.userData = {
            name: data.name,
            distance: data.distance,
            index: i
        };

        // added ring to saturn 
        if(data.name === 'Saturn'){
            createSaturnRings(planet);
        }

        scene.add(planet);
        planets.push(planet);
    });
}

// created and attached saturn's ring 
function createSaturnRings(planet){

    const textureLoader = new THREE.TextureLoader();
    const ringTexture = textureLoader.load('textures/saturnRing.png');

    const ringGeometry = new THREE.RingGeometry(4, 7, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({
        map: ringTexture,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
    });

    //fixed uv mapping 
    const pos = ringGeometry.attributes.position;
    const uv = ringGeometry.attributes.uv;
    const v3 = new THREE.Vector3();

    for(let i = 0; i < pos.count; i++){
        v3.fromBufferAttribute(pos, i);
        uv.setXY(
            i,
            (v3.x / 7 + 1) / 2,
            (v3.y / 7 + 1) / 2,
        );
    }

    const rings = new THREE.Mesh(ringGeometry, ringMaterial);
    rings.rotation.x = Math.PI / 2;
    planet.add(rings);
}

// added starfield and background sphere
function addStarfield() {
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('textures/starsmilkyway.jpg?' + Date.now(), function(texture){
        const backgroundGeometry = new THREE.SphereGeometry(900, 32, 32);
        const backgroundMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.BackSide
        });
        const backgroundSphere = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
        scene.add(backgroundSphere);
    });

    // random points for star partiles
    const starsGeometry = new THREE.BufferGeometry();
    const starsVertices = [];
    const sizes = new Float32Array(10000);

    for(let i = 0; i < 10000; i++){
        const x = (Math.random() - 0.5) * 2000;
        const y = (Math.random() - 0.5) * 2000;
        const z = (Math.random() - 0.5) * 2000;
        starsVertices.push(x, y, z);
        sizes[i] = Math.random() * 0.2 + 0.1;
    }

    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    starsGeometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));


    const starsMaterial = new THREE.PointsMaterial({
        color: 0xFFFFFF,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.8,
        vertexColor: false
    });

    starField = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(starField);
}

// added labels for each planets on hover
function addPlanetLabels(){
    planets.forEach(planet => {
        const div = document.createElement('div');
        div.className = 'planet-label';
        div.textContent = planet.userData.name;
        document.body.appendChild(div);
    });

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    window.addEventListener('mousemove', (event) => {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(planets);

        document.querySelectorAll('.planet-label').forEach(label => {
            label.style.opacity = '0';
        });

        if(intersects.length > 0){
            const planet = intersects[0].object;
            const label = document.getElementsByClassName('planet-label')[planet.userData.index];
            label.style.opacity = '1';
        }
    });
}

// update label position to follow 3d planets
function updateLabels() {
    planets.forEach((planet, i) => {
        const vector = planet.position.clone();
        vector.project(camera);

        const label = document.getElementsByClassName('planet-label')[i];
        label.style.left = (vector.x + 1) * window.innerWidth / 2 + 'px';
        label.style.top = (-vector.y + 1) * window.innerHeight / 2 + 'px';
    });
}

// added orbit paths as ellipse lines for each planets
function addOrbitLines(){
    planetData.forEach(data => {
        const curve = new THREE.EllipseCurve(
            0, 0,
            data.distance, data.distance,
            0, 2 * Math.PI
        );

        const points = curve.getPoints(50);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: 0x444444 });
        const ellipse = new THREE.Line(geometry, material);
        ellipse.rotation.x = Math.PI / 2;
        scene.add(ellipse);
    });
}

// added ambient and point light for sun
function setupLighting() {
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    scene.add(ambientLight);

    const sunLight = new THREE.PointLight(0xffffff, 1, 100);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);
}

// created speed slider for each planet and toggle btn
function setupControls() {
    const controlsContainer = document.getElementById('planetControls');
    const controlDiv = document.getElementById('controlls')

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'toggle-btn';
    toggleBtn.textContent = 'Controls ▼';
    toggleBtn.addEventListener('click', () => {
        controlDiv.classList.toggle('collapsed');
        toggleBtn.textContent = controlDiv.classList.contains('collapsed') ? 'Controlls ▼' : 'Controls ▲';
    });

    controlDiv.insertBefore(toggleBtn, controlsContainer);

    planetData.forEach((data, i) => {
        const controlDiv = document.createElement('div');
        controlDiv.className = 'planet-control';

        const label = document.createElement('div')
        label.className = 'planet-name';
        label.textContent = data.name;

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.className = 'speed-slider';
        slider.min = '0';
        slider.max = '3';
        slider.step = '0.1';
        slider.value = '1';

        slider.addEventListener('input', (e) => {
            planetSpeeds[i] = parseFloat(e.target.value) * data.baseSpeed;
        });

        controlDiv.appendChild(label);
        controlDiv.appendChild(slider);
        controlsContainer.appendChild(controlDiv);
    });
}

// setup mouse drag, zoom and pause and resume 
function setupEventListener() {
    const canvas = renderer.domElement;
    const pauseBtn = document.getElementById('pauseBtn');

    pauseBtn.addEventListener('click', () => {
        paused = !paused;
        if (paused) {
            clock.stop();
        } else {
            clock.start();
        }
        pauseBtn.textContent = paused ? 'Resume' : 'Pause';
    });

    canvas.addEventListener('mousedown', (e) => {
        mouseDown = true;
    });

    window.addEventListener('mouseup', () => {
        mouseDown = false;
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!mouseDown) return;

        const deltaX = e.movementX || 0;
        const deltaY = e.movementY || 0;

        cameraAngle.x -= deltaX * 0.01;
        cameraAngle.y -= deltaY * 0.01;

        cameraAngle.y = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cameraAngle.y))

        updateCamera();
    });

    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();

        const distance = camera.position.length();
        const newDistance = distance + e.deltaY * 0.1;

        if (newDistance > 10 && newDistance < 200) {
            camera.position.normalize().multiplyScalar(newDistance);
        }
    });

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// update camera position and look direction based on angles 
function updateCamera() {
    const distance = camera.position.length();

    camera.position.x = Math.cos(cameraAngle.x) * Math.cos(cameraAngle.y) * distance;
    camera.position.y = Math.sin(cameraAngle.y) * distance;
    camera.position.z = Math.sin(cameraAngle.x) * Math.cos(cameraAngle.y) * distance;

    camera.lookAt(0, 0, 0);
}

// main animation loop (rotate sun, planets, stars, update orbits)
function animate() {
    requestAnimationFrame(animate);

    if (!paused) {
        const time = clock.getElapsedTime();

        sun.rotation.y += 0.002;

        planets.forEach((planet, i) => {
            const distance = planet.userData.distance;
            const speed = planetSpeeds[i];
            planet.position.x = Math.cos(time * speed) * distance;
            planet.position.z = Math.sin(time * speed) * distance;

            planet.rotation.y += 0.01 * planetSpeeds[i];

            if(planet.userData.name === 'Saturn'){
                planet.rotation.x = 0.5;
            }
        });

        scene.children.forEach(child => {
            if(child instanceof THREE.Mesh && child.geometry instanceof THREE.SphereGeometry){
                if(child.geometry.parameters.radius === 900){
                    child.rotation.y += 0.0001;
                }
            }
        });

        if(starField && starField.geometry.attributes.size){
            const time = Date.now() * 0.001;
            const sizes = starField.geometry.attributes.size.array;

            for(let i = 0; i < sizes.length; i++){
                const phase = time + i * 100;
                const scale = Math.sin(phase) * 0.3 + 0.7;
                sizes[i] = scale * (Math.random() * 0.2 + 0.1);
            }
            starField.geometry.attributes.size.needsUpdate = true;
        }
    }

    updateLabels();
    renderer.render(scene, camera);
}

// start simulation
init();