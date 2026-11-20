/* ================= loop & boot ================= */
let lastT = performance.now();
function frame(now) {
  let dt = (now - lastT) / 1000; lastT = now;
  if (!(dt >= 0)) dt = 0; if (dt > 0.05) dt = 0.05;
  try {
    if (!dbg.freeze) update(dt);
    render();
    if (G.state === 'play' || G.state === 'paused') drawMini();
  } catch (err) { console.error(err); }
  requestAnimationFrame(frame);
}

