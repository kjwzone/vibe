// 천문대를 걷는 과학자 모양 캐릭터(흰 가운, 안경, 클립보드): 몸, 머리, 이름표, 인사(고개 숙이기) 동작
import * as THREE from '../vendor/three.module.min.js';
import { createTextSprite } from './labels.js';

export const CHARACTER_COLORS = ['#e8a87c', '#9ec9e2', '#c3b1e1', '#a8d5a2', '#f2d38a', '#e6a0b4'];
const BOW_SECONDS = 1;
const BOW_ANGLE = 0.75;

// 캐릭터 하나를 만든다. 앞쪽은 -z이고, root.rotation.y로 방향을 돌린다.
export function createCharacter({ color = CHARACTER_COLORS[0], name = '' } = {}) {
  const root = new THREE.Group();
  // 사람마다 다른 색은 셔츠와 클립보드 테두리에 남겨 서로 구분되게 한다.
  const accent = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
  const coat = new THREE.MeshStandardMaterial({ color: '#f1f2ef', roughness: 0.85, side: THREE.DoubleSide });
  const skin = new THREE.MeshStandardMaterial({ color: '#e9dccb', roughness: 0.7 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: '#3a3d44', roughness: 0.9 });
  const frame = new THREE.MeshBasicMaterial({ color: '#22262e' });
  // 앞(-z)이 트인 원통을 만든다. CylinderGeometry의 각도 0은 +z 쪽이다.
  const openFront = (rTop, rBottom, h, gap) => new THREE.CylinderGeometry(rTop, rBottom, h, 24, 1, true, Math.PI + gap / 2, Math.PI * 2 - gap);

  const pants = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.85, 16), pantsMat);
  pants.position.y = 0.43;
  // 무릎까지 내려오는 가운 자락
  const skirt = new THREE.Mesh(openFront(0.215, 0.27, 0.5, 0.5), coat);
  skirt.position.y = 0.65;

  // 허리를 축으로 숙이도록 윗몸을 따로 묶는다.
  const upper = new THREE.Group();
  upper.position.y = 0.85;
  const shirt = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.58, 16), accent);
  shirt.position.y = 0.3;
  const torso = new THREE.Mesh(openFront(0.235, 0.205, 0.62, 0.55), coat);
  torso.position.y = 0.3;

  const arms = [-1, 1].map((side) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.27, 0.56, 0);
    arm.rotation.z = side * 0.12;
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.5, 12), coat);
    sleeve.position.y = -0.25;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), skin);
    hand.position.y = -0.53;
    arm.add(sleeve, hand);
    return arm;
  });
  // 오른손에 든 클립보드: 사람별 색 테두리 위에 흰 종이
  const clipboard = new THREE.Group();
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.23, 0.015), accent);
  const paper = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.19, 0.005), new THREE.MeshStandardMaterial({ color: '#fbfbf7' }));
  paper.position.z = -0.01;
  const clip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.025, 0.02), frame);
  clip.position.set(0, 0.11, -0.01);
  clipboard.add(board, paper, clip);
  clipboard.position.set(0.04, -0.5, -0.1);
  clipboard.rotation.set(-0.5, 0, 0.1);
  arms[1].add(clipboard);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 12), skin);
  head.position.y = 0.78;
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.178, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
    new THREE.MeshStandardMaterial({ color: '#4a3f38', roughness: 0.9 }),
  );
  hair.position.y = 0.8;
  hair.rotation.x = 0.35;
  // 동그란 안경: 바라보는 방향(-z) 표시도 겸한다.
  const glasses = new THREE.Group();
  [-0.06, 0.06].forEach((x) => {
    const lens = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.008, 8, 20), frame);
    lens.position.x = x;
    glasses.add(lens);
  });
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.008, 0.008), frame);
  glasses.add(bridge);
  glasses.position.set(0, 0.79, -0.165);

  upper.add(shirt, torso, ...arms, head, hair, glasses);
  root.add(pants, skirt, upper);

  let label = null;
  let bowTime = -1;

  function setName(text) {
    if (label) {
      root.remove(label);
      label.material.map.dispose();
      label.material.dispose();
    }
    label = createTextSprite(text, { height: 0.24, backdrop: true });
    label.material.color.set('#f2f5fb');
    // 반투명한 땅(그리기 순서 2~4)보다 나중에 그려, 땅에 겹쳐도 흐려지지 않게 한다.
    label.renderOrder = 10;
    label.position.y = 2.15;
    root.add(label);
  }

  function setColor(c) {
    accent.color.set(c);
  }

  function bow() {
    bowTime = 0;
  }

  // 인사 중이면 1초 동안 윗몸을 앞으로 숙였다가 편다.
  function update(dt) {
    if (bowTime < 0) return;
    bowTime += dt;
    const k = Math.min(bowTime / BOW_SECONDS, 1);
    upper.rotation.x = -BOW_ANGLE * Math.sin(Math.PI * k);
    if (k >= 1) {
      bowTime = -1;
      upper.rotation.x = 0;
    }
  }

  if (name) setName(name);
  return { root, setName, setColor, bow, update };
}
