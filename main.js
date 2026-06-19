import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// tạo ko gian rỗng chứa vật thể
const scene = new THREE.Scene();
// tạo camera với góc nhìn 60 độ, tỉ lệ khung hình dựa trên kích thước cửa sổ, gần nhất 0.1 và xa nhất 1000
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 50, 150); //<- lùi camera ra xa 150, nâng 50 để bao quát

const renderer = new THREE.WebGLRenderer({ antialias: true }); // khử răng cưa
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio); // <- giúp nét hơn 
//shadow
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // <- giúp viền bóng râm nhòe và mềm mại hơn
renderer.toneMapping = THREE.ACESFilmicToneMapping; //cân bằng sáng giúp màu sắc ko bị cháy lóa khi Mặt trời quá mạnh
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

// controls để xoay, phóng to, thu nhỏ camera bằng chuột
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

//ánh sáng môi trường: để 0.1 để phân ban đêm của hành tinh k bị đen xì
const ambientLight = new THREE.AmbientLight(0xffffff, 0.1); 
scene.add(ambientLight);

//g lập ánh sáng hắt từ dải ngân hà 
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.2); 
scene.add(hemiLight);

//Mặt trời, để tại tâm (0,0,0)
const sunLight = new THREE.PointLight(0xffffff, 3000, 2000);
sunLight.castShadow = true; //bóng râm
sunLight.shadow.mapSize.width = 4096; //độ nét của bóng râm
sunLight.shadow.mapSize.height = 4096;
sunLight.shadow.bias = -0.0001;
sunLight.shadow.radius = 2.5; //tạo hiệu ứng vùng nửa tối
scene.add(sunLight);

const textureLoader = new THREE.TextureLoader();

//tạo bầu trời sao + bọc quanh theo dạng cầu
const bgTexture = textureLoader.load('./textures/stars_milky_way.jpg');
bgTexture.colorSpace = THREE.SRGBColorSpace;
bgTexture.mapping = THREE.EquirectangularReflectionMapping;
scene.background = bgTexture;

const planets = [];
const interactables = [];
const orbitLines = [];
let timeScale = 0.2;
let followedPlanet = null;
const lastPlanetPosition = new THREE.Vector3();

//tạo thanh trượt chỉnh tốc độ di chuyển
const speedSlider = document.getElementById('speedSlider');
if (speedSlider) {
    speedSlider.addEventListener('input', (event) => {
        timeScale = parseFloat(event.target.value);
    });
}

//bật tắt đổ bóng (bình thường nếu tắt thì cảnh vật sẽ tối nên code sẽ tự động đẩy ambient và hemi lên 1.0 và 0.8 thì sẽ dễ nhìn hơn)
const shaderToggle = document.getElementById('shaderToggle');
if (shaderToggle) {
    shaderToggle.addEventListener('change', (event) => {
        const isOn = event.target.checked;
        if (isOn) {
            ambientLight.intensity = 0.1;
            hemiLight.intensity = 0.2;
            sunLight.castShadow = true;
        } else {
            ambientLight.intensity = 1.0;
            hemiLight.intensity = 0.8;
            sunLight.castShadow = false;
        }
        scene.traverse((child) => {
            if (child.isMesh && child.material) {
                child.material.needsUpdate = true;
            }
        });
    });
}

//bật tắt đường quỹ đạo
const orbitToggle = document.getElementById('orbitToggle');
if (orbitToggle) {
    orbitToggle.addEventListener('change', (event) => {
        const isVisible = event.target.checked;
        orbitLines.forEach(line => line.visible = isVisible);
    });
}

const sidePanel = document.getElementById('side-panel');
const panelTitle = document.getElementById('panel-title');
const panelDesc = document.getElementById('panel-desc');
const closePanelBtn = document.getElementById('close-panel');

if (closePanelBtn) {
    closePanelBtn.addEventListener('click', () => {
        followedPlanet = null;
        if (sidePanel) sidePanel.style.display = 'none';
    });
}

//hàm tạo hành tinh
function createPlanet(radius, textureUrl, distance, orbitSpeed, rotationSpeed, name, info) {
    
    // pivot: điểm neo vô hình ở tâm Mặt Trời để hành tinh quay quanh nó, giúp việc xoay quỹ đạo dễ dàng hơn
    const pivot = new THREE.Object3D();
    scene.add(pivot);

    //nhóm bọc hành tinh, đẩy nó ra xa một trời 1 khoảng = distance
    const system = new THREE.Group();
    system.position.x = distance;
    pivot.add(system);

    //tạo khối cầu 64x64 + đè texture
    const geometry = new THREE.SphereGeometry(radius, 64, 64);
    const texture = textureLoader.load(textureUrl);
    
    const material = new THREE.MeshStandardMaterial({ 
        map: texture,
        bumpMap: texture,
        bumpScale: 0.02,
        roughness: 0.7, 
        metalness: 0.05 
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true; //đổ bóng râm
    mesh.receiveShadow = true; //hứng bóng râm
    mesh.userData = { name: name, info: info }; //tên, info hành tinh
    interactables.push(mesh);
    system.add(mesh);

    //vẽ đường quỹ đạo (tính 64 điểm tọa độ đường tròn = sin cos r nối lại)
    if (distance > 0) {
        const pathGeometry = new THREE.BufferGeometry();
        const points = [];
        for (let i = 0; i <= 64; i++) {
            const angle = (i / 64) * Math.PI * 2;
            points.push(new THREE.Vector3(Math.cos(angle) * distance, 0, Math.sin(angle) * distance));
        }
        pathGeometry.setFromPoints(points);
        const pathMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15 });
        const orbitLine = new THREE.Line(pathGeometry, pathMaterial);
        scene.add(orbitLine);
        orbitLines.push(orbitLine);
    }

    planets.push({ pivot, system, mesh, orbitSpeed, rotationSpeed });
    return { system, mesh };
}

//Mặt trời
const sunGeometry = new THREE.SphereGeometry(15, 64, 64);
const sunTexture = textureLoader.load('./textures/sun.jpg');
const sunMaterial = new THREE.MeshBasicMaterial({ map: sunTexture });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
sun.userData = { name: "Sun", info: "The central star of the Solar System, containing 99.8% of its mass. It provides the energy necessary to sustain life on Earth." };
interactables.push(sun);
scene.add(sun);

//tạo lớp aura bọc ngoài mặt trời
const sunGlowGeo = new THREE.SphereGeometry(16.5, 32, 32);
const sunGlowMat = new THREE.MeshBasicMaterial({
    color: 0xffaa00,
    transparent: true,
    opacity: 0.2,
    blending: THREE.AdditiveBlending
});
const sunGlow = new THREE.Mesh(sunGlowGeo, sunGlowMat);
sun.add(sunGlow);

//thanh chỉnh độ sáng của mặt trời
const brightnessSlider = document.getElementById('brightnessSlider');
if (brightnessSlider) {
    brightnessSlider.addEventListener('input', (event) => {
        const val = parseFloat(event.target.value);
        sunLight.intensity = 3000 * val;
        sunGlowMat.opacity = 0.2 * val;
    });
}

//tạo sao thủy
createPlanet(1.6, './textures/mercury.jpg', 22, 0.04, 0.01, "Mercury", "The smallest and closest planet to the Sun. Its surface is heavily cratered, and it lacks an atmosphere to retain heat.");

//tạo sao kim có 2 lớp: bề mặt và khí quyển
const venusData = createPlanet(3.0, './textures/venus_surface.jpg', 32, 0.015, -0.005, "Venus", "The hottest planet in the Solar System due to a runaway greenhouse effect from its thick CO2 atmosphere. It rotates in the opposite direction to most planets.");

const venusAtmoGeo = new THREE.SphereGeometry(3.05, 64, 64);
const venusAtmoTex = textureLoader.load('./textures/venus_atmosphere.jpg');
const venusAtmoMat = new THREE.MeshStandardMaterial({
    map: venusAtmoTex,
    transparent: true,
    opacity: 0.6,
    depthWrite: false
});
const venusAtmoMesh = new THREE.Mesh(venusAtmoGeo, venusAtmoMat);
venusAtmoMesh.castShadow = false;
venusAtmoMesh.receiveShadow = false;
venusData.mesh.add(venusAtmoMesh);

//tạo trái đất + lớp mây để dễ đổ bóng khi mặt trăng quay quanh
const earthData = createPlanet(3.2, './textures/earth.jpg', 45, 0.01, 0.02, "Earth", "The only known planet to harbor life. About 71% of its surface is covered by oceans, and it has an atmosphere rich in nitrogen and oxygen.");

const cloudGeo = new THREE.SphereGeometry(3.25, 64, 64);
const cloudTex = textureLoader.load('./textures/earth_clouds.jpg');
const cloudMat = new THREE.MeshStandardMaterial({
    map: cloudTex,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});
const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
cloudMesh.castShadow = false;
cloudMesh.receiveShadow = false;
earthData.mesh.add(cloudMesh);

//các sao khác dễ dàng tạo ra = áp texture là xg:>
createPlanet(2.4, './textures/mars.jpg', 58, 0.008, 0.018, "Mars", "The Red Planet, named for the iron oxide on its surface. It is home to Olympus Mons, the tallest volcano in the Solar System.");
createPlanet(7.0, './textures/jupiter.jpg', 80, 0.002, 0.04, "Jupiter", "The largest gas giant in the Solar System. It features a super-strong magnetic field and the Great Red Spot, a persistent giant storm.");
const saturnData = createPlanet(5.6, './textures/saturn.jpg', 105, 0.0009, 0.038, "Saturn", "A gas giant famous for its spectacular and extensive ring system, composed mainly of countless ice and rock particles.");
createPlanet(4.0, './textures/uranus.jpg', 130, 0.0004, 0.03, "Uranus", "An ice giant with a severe 98-degree axial tilt, causing it to orbit almost entirely on its side.");
createPlanet(3.8, './textures/neptune.jpg', 155, 0.0001, 0.032, "Neptune", "The farthest known planet from the Sun. It has a deep blue color due to methane and experiences the most extreme winds in the Solar System.");
createPlanet(0.8, './textures/pluto.jpg', 175, 0.00005, 0.008, "Pluto", "A dwarf planet in the Kuiper belt, composed primarily of ice and rock. It has a highly elliptical and inclined orbit.");

//vì khi áp texture sao thổ nó trông hơi xấu nên hàm này sinh ra để tự tạo vòng tròn torus làm vành đai, sau đó nhân bản 3 cái với kích thước và độ mờ khác nhau để tạo hiệu ứng nhiều lớp như thật hơn, sau đó xoay nghiêng để nhìn đẹp hơn
const saturnRing = new THREE.Group();

//tạo 3 vòng torus với kích thước và độ mờ khác nhau để tạo hiệu ứng nhiều lớp cho vành đai của sao thổ
const geoC = new THREE.TorusGeometry(8.5, 0.8, 16, 100);
const matC = new THREE.MeshStandardMaterial({ color: 0x665544, transparent: true, opacity: 0.4 });
const meshC = new THREE.Mesh(geoC, matC);
meshC.scale.set(1, 1, 0.05);
meshC.castShadow = true;
meshC.receiveShadow = true;
saturnRing.add(meshC);

const geoB = new THREE.TorusGeometry(11.0, 1.4, 16, 100);
const matB = new THREE.MeshStandardMaterial({ color: 0xccaabb, transparent: true, opacity: 0.8 });
const meshB = new THREE.Mesh(geoB, matB);
meshB.scale.set(1, 1, 0.05);
meshB.castShadow = true;
meshB.receiveShadow = true;
saturnRing.add(meshB);

const geoA = new THREE.TorusGeometry(13.5, 0.8, 16, 100);
const matA = new THREE.MeshStandardMaterial({ color: 0x998877, transparent: true, opacity: 0.6 });
const meshA = new THREE.Mesh(geoA, matA);
meshA.scale.set(1, 1, 0.05);
meshA.castShadow = true;
meshA.receiveShadow = true;
saturnRing.add(meshA);

saturnRing.rotation.x = Math.PI / 2 - 0.2; //nghiêng một góc 
saturnData.system.add(saturnRing); //cắn vành vào sao thổ

//tạo mặt trăng quay quanh trái đất
const moonPivot = new THREE.Object3D();
earthData.system.add(moonPivot);

//tạo khối cầu 64x64 + đè texture mặt trăng, đẩy ra xa 5.5 để nó quay quanh trái đất
const moonGeo = new THREE.SphereGeometry(0.8, 64, 64);
const moonTex = textureLoader.load('./textures/moon.jpg');
const moonMat = new THREE.MeshStandardMaterial({ 
    map: moonTex, 
    bumpMap: moonTex,
    bumpScale: 0.03,
    roughness: 0.9, 
    metalness: 0.0 
});
const moonMesh = new THREE.Mesh(moonGeo, moonMat);
moonMesh.position.x = 5.5; //đẩy xa 5.5 so với trái đất
moonMesh.castShadow = true;
moonMesh.receiveShadow = true;
moonMesh.userData = { name: "Moon", info: "Earth's only natural satellite. It stabilizes the planet's axial tilt and is responsible for creating ocean tides." };
interactables.push(moonMesh);
moonPivot.add(moonMesh); // cắn mặt trăng vào trục quay

//quỹ đạo mặt trăng quanh trái đất
const moonPathGeo = new THREE.BufferGeometry();
const moonPoints = [];
for (let i = 0; i <= 64; i++) {
    const angle = (i / 64) * Math.PI * 2;
    moonPoints.push(new THREE.Vector3(Math.cos(angle) * 5.5, 0, Math.sin(angle) * 5.5));
}
moonPathGeo.setFromPoints(moonPoints);
const moonPathMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15 });
const moonOrbitLine = new THREE.Line(moonPathGeo, moonPathMat);
earthData.system.add(moonOrbitLine);
orbitLines.push(moonOrbitLine);

//reset to default settings
const resetBtn = document.getElementById('reset-btn');
if (resetBtn) {
    resetBtn.addEventListener('click', () => {
        timeScale = 0.2;
        if (speedSlider) speedSlider.value = 0.2;
        
        if (brightnessSlider) brightnessSlider.value = 1;
        sunLight.intensity = 3000;
        sunGlowMat.opacity = 0.2;

        if (shaderToggle) shaderToggle.checked = true;
        ambientLight.intensity = 0.1;
        hemiLight.intensity = 0.2;
        sunLight.castShadow = true;

        if (orbitToggle) orbitToggle.checked = true;
        orbitLines.forEach(line => line.visible = true);

        scene.traverse((child) => {
            if (child.isMesh && child.material) {
                child.material.needsUpdate = true;
            }
        });

        followedPlanet = null;
        if (sidePanel) sidePanel.style.display = 'none';

        camera.position.set(0, 50, 150);
        controls.target.set(0, 0, 0);
        controls.update();
    });
}

//raycaster để phát hiện khi người dùng di chuột qua hành tinh nào đó, sẽ hiển thị tooltip với tên hành tinh, và khi click sẽ theo dõi hành tinh đó, đồng thời hiển thị thông tin chi tiết trong side panel
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const tooltip = document.getElementById('tooltip');

// di chuyển chuột (hover)
window.addEventListener('pointermove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    if (tooltip) {
        tooltip.style.left = event.clientX + 'px';
        tooltip.style.top = event.clientY + 'px';
    }

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(interactables, false);

    if (intersects.length > 0) {
        if (tooltip) {
            tooltip.style.display = 'block';
            tooltip.innerHTML = intersects[0].object.userData?.name || "";
        }
        document.body.style.cursor = 'pointer';
    } else {
        if (tooltip) tooltip.style.display = 'none';
        document.body.style.cursor = 'default';
    }
});

window.addEventListener('click', () => {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(interactables, false);

    if (intersects.length > 0) {
        followedPlanet = intersects[0].object;
        followedPlanet.getWorldPosition(lastPlanetPosition);

        if (panelTitle) panelTitle.innerText = followedPlanet.userData?.name || "";
        if (panelDesc) panelDesc.innerText = followedPlanet.userData?.info || "";
        if (sidePanel) sidePanel.style.display = 'flex';
    }
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

//di chuyển = phím WASD hoặc mũi tên
const keyState = {
    KeyW: false, KeyA: false, KeyS: false, KeyD: false,
    ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false
};

window.addEventListener('keydown', (event) => {
    if (keyState.hasOwnProperty(event.code)) {
        keyState[event.code] = true;
        followedPlanet = null;
        if (sidePanel) sidePanel.style.display = 'none';
    }
});

window.addEventListener('keyup', (event) => {
    if (keyState.hasOwnProperty(event.code)) {
        keyState[event.code] = false;
    }
});

//vòng lặp render
function animate() {
    requestAnimationFrame(animate);

    //chuyển động của các hành tinh
    planets.forEach(p => {
        if (p.pivot) p.pivot.rotation.y += p.orbitSpeed * timeScale; //để xoay quanh mặt trời
        if (p.mesh) p.mesh.rotation.y += p.rotationSpeed * timeScale;  //tự quay quanh trục
    });

    //chuyển động của mặt trăng
    if (moonPivot) moonPivot.rotation.y += 0.05 * timeScale; //quỹ đạo quay của mặt trăng
    if (moonMesh) moonMesh.rotation.y += 0.02 * timeScale; //tự quay quanh trục 
    
    //chuyển động của lớp mây / khí quyển
    //để lớp này quay với tốc độ khác so với mặt đất nhằm tạo cảm giác mây lơ lửng
    if (earthData?.mesh?.children?.length > 0) {
        earthData.mesh.children[0].rotation.y += 0.005 * timeScale; 
    }

    if (venusData?.mesh?.children?.length > 0) {
        venusData.mesh.children[0].rotation.y += 0.004 * timeScale; 
    }

    //mặt trời tự quay
    if (sun) sun.rotation.y += 0.002 * timeScale;

    //th đang theo dõi hành tinh
    if (followedPlanet) {
        const currentPos = new THREE.Vector3();
        followedPlanet.getWorldPosition(currentPos);
        const delta = new THREE.Vector3().subVectors(currentPos, lastPlanetPosition);

        camera.position.add(delta);
        controls.target.copy(currentPos);
        lastPlanetPosition.copy(currentPos);
    } else {
        //th bay tự do
        const moveSpeed = 0.8;
        const delta = new THREE.Vector3();

        if (keyState.KeyW || keyState.ArrowUp) delta.z -= moveSpeed;
        if (keyState.KeyS || keyState.ArrowDown) delta.z += moveSpeed;
        if (keyState.KeyA || keyState.ArrowLeft) delta.x -= moveSpeed;
        if (keyState.KeyD || keyState.ArrowRight) delta.x += moveSpeed;

        if (delta.lengthSq() > 0) {
            delta.applyQuaternion(camera.quaternion);
            camera.position.add(delta);
            controls.target.add(delta);
        }
    }

    controls.update();
    renderer.render(scene, camera);
}

animate();