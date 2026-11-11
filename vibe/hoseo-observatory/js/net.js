// Trystero로 같은 링크의 사람들과 위치·이름·인사를 주고받는다(사이트 전체가 한 방, D3)
import { joinRoom, selfId } from '../vendor/trystero.mjs';

const APP_ID = 'hoseo-observatory-umyeonsan';
const ROOM_ID = 'main';

// 방에 들어간다. 연결에 실패해도 오류를 띄우지 않고 혼자 보기를 그대로 둔다.
export function connectRoom({ onPose, onGreet, onLeave, onJoin }) {
  try {
    const room = joinRoom({ appId: APP_ID }, ROOM_ID);
    const pose = room.makeAction('pose');
    const greet = room.makeAction('greet');
    pose.onMessage = (data, { peerId }) => onPose(peerId, data);
    greet.onMessage = (_data, { peerId }) => onGreet(peerId);
    room.onPeerJoin = (peerId) => onJoin(peerId);
    room.onPeerLeave = (peerId) => onLeave(peerId);
    window.addEventListener('pagehide', () => room.leave());
    return {
      selfId,
      sendPose(data, target) {
        pose.send(data, target ? { target } : undefined).catch(() => {});
      },
      sendGreet() {
        greet.send({}).catch(() => {});
      },
    };
  } catch (err) {
    console.warn('함께 있기 연결 실패, 혼자 보기로 계속합니다.', err);
    return { selfId, sendPose() {}, sendGreet() {} };
  }
}
