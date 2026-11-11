// 우면산 정상의 3D 공간: 반투명 땅, 산, 천문대 본관, 지붕 없는 관측소, 망원경
import * as THREE from '../vendor/three.module.min.js';
import { createTextSprite } from './labels.js';

export const OBSERVATORY = { radius: 6, wallHeight: 1.2, doorDeg: 40 };
export const TELESCOPE_POSITION = new THREE.Vector3(0, 0, -2.5);

function createGround(scene) {
  // 땅을 반투명하게 해서 지평선 아래 천체가 비쳐 보이게 한다(D11).
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(480, 96),
    new THREE.MeshBasicMaterial({ color: '#0d1712', transparent: true, opacity: 0.72, depthWrite: false }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.renderOrder = 2;
  scene.add(ground);

  const plaza = new THREE.Mesh(
    new THREE.CircleGeometry(30, 64),
    new THREE.MeshStandardMaterial({ color: '#2a2f2c', roughness: 1, transparent: true, opacity: 0.75, depthWrite: false }),
  );
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.y = 0.01;
  plaza.renderOrder = 3;
  scene.add(plaza);

  // 인트로에서 위에서 내려다볼 때만 보이는 산
  const mountain = new THREE.Mesh(
    new THREE.ConeGeometry(420, 260, 48, 1, true),
    new THREE.MeshStandardMaterial({ color: '#34503b', roughness: 1, flatShading: true }),
  );
  mountain.position.y = -130.5;
  mountain.visible = false;
  scene.add(mountain);
  return { ground, mountain };
}

function createObservatory(scene) {
  const { radius, wallHeight, doorDeg } = OBSERVATORY;
  const half = (doorDeg / 2) * (Math.PI / 180);
  const wallMat = new THREE.MeshStandardMaterial({ color: '#8d8a84', roughness: 0.9, side: THREE.DoubleSide });
  // 남쪽(+z)으로 문이 난 둥근 낮은 벽. 지붕이 없어 안에서 하늘이 보인다.
  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, wallHeight, 64, 1, true, half, Math.PI * 2 - half * 2),
    wallMat,
  );
  wall.position.y = wallHeight / 2;
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 48),
    new THREE.MeshStandardMaterial({ color: '#4a4744', roughness: 1, transparent: true, opacity: 0.7, depthWrite: false }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.02;
  floor.renderOrder = 4;
  scene.add(wall, floor);

  // 망원경: 받침 기둥과 북쪽 하늘을 향한 경통
  const telescope = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: '#c9ccd2', roughness: 0.4, metalness: 0.5 });
  const pier = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 1.2, 16), metal);
  pier.position.y = 0.6;
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.6, 20), new THREE.MeshStandardMaterial({ color: '#e8e6e0', roughness: 0.5 }));
  tube.position.y = 1.35;
  tube.rotation.x = -Math.PI / 4;
  telescope.add(pier, tube);
  telescope.position.copy(TELESCOPE_POSITION);
  scene.add(telescope);

  // 천문대 본관: 돔을 얹은 원통 건물
  const hall = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 4, 32), new THREE.MeshStandardMaterial({ color: '#b9b4aa', roughness: 0.9 }));
  body.position.y = 2;
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(4.1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: '#dfe2e6', roughness: 0.5, metalness: 0.3 }),
  );
  dome.position.y = 4;
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.1), new THREE.MeshBasicMaterial({ color: '#ffcf8a' }));
  lamp.position.set(0, 2.6, 4.02);
  hall.add(body, dome, lamp);
  hall.position.set(-15, 0, -9);
  hall.rotation.y = Math.PI / 5;
  scene.add(hall);

  const light = new THREE.PointLight('#ffcf8a', 6, 30, 1.5);
  light.position.set(-12, 3, -5);
  scene.add(light);

  const sign = createTextSprite('우면산 호서 천문대', { height: 1.1, weight: 500 });
  sign.material.color.set('#ffe3b8');
  sign.position.set(-15, 9.5, -9);
  scene.add(sign);
  return { telescope, sign };
}

// 천문대 공간 전체를 만든다.
export function createWorld() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#03050d');
  scene.add(new THREE.HemisphereLight('#4a5f94', '#121a12', 1.8));
  const moonLight = new THREE.DirectionalLight('#9fb2d9', 0.6);
  moonLight.position.set(30, 60, 20);
  scene.add(moonLight);
  const ground = createGround(scene);
  const observatory = createObservatory(scene);
  return { scene, ...ground, ...observatory };
}
