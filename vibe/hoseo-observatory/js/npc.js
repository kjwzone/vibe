// NPC 3명을 화면에 두고 움직인다: 시각으로 정해진 일정대로 걷고 하늘을 보며, 먼저 인사하거나 답례한다
import { createCharacter } from './character.js';
import {
  NPC_ROLES, computeNpcCount, computeNpcPose, shouldGreetFirst, shouldReturnBow, GREET_FIRST_DIST,
} from './npc-rules.js';

const FADE_SECONDS = 1;
const RETURN_BOW_DELAY_MIN = 0.5;
const RETURN_BOW_DELAY_MAX = 1.5;

// 캐릭터의 모든 재질을 반투명하게 해 흐려지며 나타나고 사라지게 한다.
function setCharacterOpacity(root, opacity) {
  root.traverse((o) => {
    const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    mats.forEach((m) => {
      m.transparent = opacity < 1 || m.userData.wasTransparent;
      m.opacity = opacity;
    });
  });
}

// NPC 묶음을 만든다. sendBow(index)는 다른 사람에게 NPC 인사를 알린다.
export function createNpcs({ scene, sendBow }) {
  const cache = new Map();
  const npcs = NPC_ROLES.map((role) => {
    const character = createCharacter({ color: role.color, name: role.name });
    character.root.traverse((o) => {
      if (o.material) o.material.userData.wasTransparent = o.material.transparent;
    });
    character.root.visible = false;
    scene.add(character.root);
    // greetDecided: 지금 가까이 다가온 동안 먼저 인사할지 이미 정했는지(멀어지면 다시 정할 수 있다)
    return { character, opacity: 0, shownOpacity: -1, greetDecided: false, greetedOnce: false };
  });

  function bow(index, broadcast) {
    const npc = npcs[index];
    if (!npc || npc.opacity <= 0) return;
    npc.character.bow();
    if (broadcast) sendBow(index);
  }

  // people: 실제 사람 수(나 포함), me: 내 캐릭터 위치(없으면 인사 판단을 하지 않는다)
  function update(dt, people, me) {
    const count = computeNpcCount(people);
    const seconds = Date.now() / 1000;
    npcs.forEach((npc, i) => {
      const wanted = i < count ? 1 : 0;
      const step = dt / FADE_SECONDS;
      npc.opacity = wanted > npc.opacity ? Math.min(1, npc.opacity + step) : Math.max(0, npc.opacity - step);
      const root = npc.character.root;
      root.visible = npc.opacity > 0;
      if (!root.visible) return;
      if (npc.shownOpacity !== npc.opacity) {
        setCharacterOpacity(root, npc.opacity);
        npc.shownOpacity = npc.opacity;
      }
      const pose = computeNpcPose(i, seconds, cache);
      root.position.set(pose.x, 0, pose.z);
      root.rotation.y = pose.yaw;
      npc.character.update(dt);
      if (!me || npc.opacity < 1) return;
      // 내가 4m 안으로 다가오면 한 번만 정해, 절반 확률로 먼저 인사한다(같은 NPC는 한 번만).
      const d = Math.hypot(me.x - pose.x, me.z - pose.z);
      if (d > GREET_FIRST_DIST + 1) npc.greetDecided = false;
      if (!npc.greetDecided && d <= GREET_FIRST_DIST) {
        npc.greetDecided = true;
        if (shouldGreetFirst(d, npc.greetedOnce, Math.random())) {
          npc.greetedOnce = true;
          bow(i, true);
        }
      }
    });
    // 오래된 일정은 지운다(지금 주기와 다음 주기만 남긴다).
    if (cache.size > 12) cache.clear();
  }

  // 내가 인사하면 10m 안의 NPC가 잠시 뒤 70% 확률로 답례한다.
  function answerGreeting(me) {
    npcs.forEach((npc, i) => {
      if (npc.opacity < 1) return;
      const p = npc.character.root.position;
      if (!shouldReturnBow(Math.hypot(me.x - p.x, me.z - p.z), Math.random())) return;
      const delay = RETURN_BOW_DELAY_MIN + Math.random() * (RETURN_BOW_DELAY_MAX - RETURN_BOW_DELAY_MIN);
      setTimeout(() => bow(i, true), delay * 1000);
    });
  }

  return {
    update,
    answerGreeting,
    // 다른 사람이 알린 NPC 인사를 내 화면에서도 보인다.
    showBow: (index) => bow(index, false),
  };
}
