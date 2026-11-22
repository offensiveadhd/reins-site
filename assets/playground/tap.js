// A tap on a link. Two in-memory link pairs are joined end to end, and every message is
// passed on unchanged and reported on the way. It uses the public Link contract only
// (send, close, onmessage, onclose, open), so it works on any link, and it is all a
// process in the middle of a connection could do: read. On a sealed session it could not
// alter, reorder or replay a message without the next one failing to verify.

/**
 * @param peerSide    the end that faces the agent SDK or the driver
 * @param brokerSide  the end that faces the broker
 * @param report      (direction: 'up' | 'down', data: string | Uint8Array) => void; 'up' is towards the broker
 */
export function relay(peerSide, brokerSide, report) {
  const pass = (to, direction) => (data) => {
    try {
      report(direction, data);
    } catch (err) {
      console.error(err); // the inspector must never break the session it is watching
    }
    if (to.open) to.send(data);
  };
  peerSide.onmessage = pass(brokerSide, 'up');
  brokerSide.onmessage = pass(peerSide, 'down');
  peerSide.onclose = () => brokerSide.close();
  brokerSide.onclose = () => peerSide.close();
}
