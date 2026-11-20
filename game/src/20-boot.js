// Android back button (used by the APK wrapper): pause, resume, leave the results screen, or let the app close from the menu
window.tankBack = () => {
  if (subOpen()) { closeSub(); return 'handled'; }
  if (G.state === 'play') { pauseGame(); return 'handled'; }
  if (G.state === 'paused') { resumeGame(); return 'handled'; }
  if (G.state === 'over') { if (G.sandbox) openSandbox(); else toMenu(); return 'handled'; }
  return 'exit';
};

const hot = window.claude && window.claude.hot;
if (hot && typeof hot.snapshot === 'function') {
  try {
    hot.snapshot(() => ({ run: (G.state === 'play' || G.state === 'paused') && !G.sandbox && G.player && G.player.alive
      ? { wave: G.wave, score: G.score, hp: Math.round(G.player.hp), kills: G.kills, shots: G.shots, hits: G.hits, ups: Object.assign({}, G.up), tank: G.tank,
        nuke: nukeSave(), beaten: [...G.beaten] } : null }));
  } catch (e) { /* ignore */ }
}
function boot(data) {
  G.resume = data && data.run && data.run.wave ? data.run : null;
  applySettings(true);
  resize();
  bindUI();
  renderGuideLists();
  syncSettingsUI();
  toMenu();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (G.state === 'menu') placeMenuTank(); }).catch(() => {});
  requestAnimationFrame(t => { lastT = t; frame(t); });
}
// Phones report the new size late after a rotation, so measure again a little later as well
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => { resize(); setTimeout(resize, 150); setTimeout(resize, 500); });
if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
if (window.screen && screen.orientation && screen.orientation.addEventListener) screen.orientation.addEventListener('change', () => { setTimeout(resize, 60); setTimeout(resize, 400); });
if (hot && typeof hot.ready === 'function') hot.ready(boot); else boot((hot && hot.data) || {});
})();
