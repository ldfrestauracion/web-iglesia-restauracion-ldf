document.addEventListener('DOMContentLoaded', initYTFallback);

function initYTFallback(){
  // ⚙️ Configura tu canal aquí (formato: "UC...")
  const CHANNEL_ID = 'UCaZpamtleaf-YXHg_hG5SVA';
  const COUNT = 3; // cuántos videos mostrar
  const cont = document.getElementById('yt-recientes');
  if (!cont) return;

  // Construye las 3 cards/slots
  cont.innerHTML = buildCards(COUNT);

  // Playlist de subidas: 'UC...' → 'UU...'
  const UPLOADS = 'UU' + CHANNEL_ID.slice(2);

  // Carga la IFrame API y crea los players
  ensureYTAPI().then(() => {
    for (let i = 0; i < COUNT; i++) {
      const slotId  = 'yt-slot-'  + i;
      const titleId = 'yt-title-' + i;
      const btnId   = 'yt-btn-'   + i;

      new YT.Player(slotId, {
        // Usa nocookie para evitar bloqueos de extensiones
        host: 'https://www.youtube-nocookie.com',
        playerVars: {
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          origin: location.origin
        },
        events: {
          onReady: (e) => {
            // Carga el playlist y salta al índice i
            try {
              e.target.loadPlaylist({ listType: 'playlist', list: UPLOADS, index: i, startSeconds: 0 });
            } catch (_) {
              e.target.cuePlaylist({ listType: 'playlist', list: UPLOADS, index: i });
            }
          },
          onStateChange: (e) => {
            // Evita autoplay si el navegador lo dispara
            if (e.data === YT.PlayerState.PLAYING) e.target.pauseVideo();

            // Cuando el video está listo/ponchado, leemos título e id
            if (e.data === YT.PlayerState.CUED || e.data === YT.PlayerState.PAUSED) {
              try {
                const data   = e.target.getVideoData();   // { video_id, title, ... }
                const titleEl = document.getElementById(titleId);
                const btnEl   = document.getElementById(btnId);
                if (data && data.title && titleEl) titleEl.textContent = data.title;
                if (data && data.video_id && btnEl) btnEl.href = 'https://www.youtube.com/watch?v=' + data.video_id;
              } catch (_) {}
            }
          }
        }
      });
    }

    // Refresca AOS si lo usas
    if (window.AOS && typeof window.AOS.refresh === 'function') AOS.refresh();
  });
}

// Construye el markup de las cards (Bootstrap 4)
function buildCards(count){
  let out = '';
  for (let i = 0; i < count; i++) {
    out += (
`<div class="col-lg-4 col-md-6 col-12 mb-4" data-aos="fade-up" data-aos-delay="${400 + i*100}">
  <div class="class-thumb embed-card">
    <div class="embed-responsive embed-responsive-16by9">
      <div id="yt-slot-${i}"></div>
    </div>
    <div class="class-info">
      <h3 id="yt-title-${i}" class="mb-1">Cargando…</h3>
      <div class="mt-3">
        <a id="yt-btn-${i}" class="btn custom-btn btn-youtube btn-zoom" href="#" target="_blank" rel="noopener">
          Ver en YouTube
        </a>
      </div>
    </div>
  </div>
</div>`);
  }
  return out;
}

// Carga la IFrame API una sola vez
function ensureYTAPI(){
  return new Promise((resolve) => {
    if (window.YT && YT.Player) return resolve();
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    window.onYouTubeIframeAPIReady = () => resolve();
    document.head.appendChild(tag);
  });
}
