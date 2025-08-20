const YT_CFG = {
  CHANNEL_ID: 'UCaZpamtleaf-YXHg_hG5SVA', 
  API_KEY: 'AIzaSyCFl4kHbiXdl2FZXqcZNUlE92cgNwbc8Ko',        
  COUNT: 3,
  MIN_SECONDS: 180             
};

document.addEventListener('DOMContentLoaded', initYTRecientes);

function initYTRecientes() {
  const cont = document.getElementById('yt-recientes');
  if (!cont) return;

  cont.innerHTML = skeleton(YT_CFG.COUNT);

  obtenerUploadsPlaylist(YT_CFG.CHANNEL_ID, YT_CFG.API_KEY)
    .then(playlistId => fetchPlaylistItems(playlistId, YT_CFG.API_KEY, YT_CFG.COUNT * 6))
    .then(items => enriquecerConDuracion(items, YT_CFG.API_KEY))
    .then(items => {
      // Filtrar shorts por duración
      let filtrados = items.filter(v => (v.durationSec ?? 99999) >= YT_CFG.MIN_SECONDS);

      // Si quedaron muy pocos, rellena con el resto
      if (filtrados.length < YT_CFG.COUNT) {
        const idsFiltrados = new Set(filtrados.map(v => v.id));
        filtrados = filtrados.concat(items.filter(v => !idsFiltrados.has(v.id)));
      }

      // Orden por fecha (desc) y toma los primeros COUNT
      filtrados.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
      const top = filtrados.slice(0, YT_CFG.COUNT);

      cont.innerHTML = top.map(cardHTML).join('');
      if (window.AOS && typeof AOS.refresh === 'function') AOS.refresh();
    })
    .catch(err => {
      console.error('YouTube recientes:', err);
      cont.innerHTML = `
        <div class="col-12">
          <div class="alert alert-warning">
            No pudimos cargar las prédicas recientes.
            <a target="_blank" rel="noopener" href="https://www.youtube.com/channel/${YT_CFG.CHANNEL_ID}/videos">Ver canal</a>
          </div>
        </div>`;
    });
}

// --- Helpers de datos ---
function obtenerUploadsPlaylist(channelId, key) {
  const url = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${key}`;
  return fetch(url).then(r => r.json()).then(j => {
    const uploads = j.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploads) throw new Error('No se encontró el playlist de subidas');
    return uploads;
  });
}

function fetchPlaylistItems(playlistId, key, max = 12) {
  const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=${Math.min(max, 50)}&key=${key}`;
  return fetch(url).then(r => r.json()).then(j => {
    return (j.items || []).map(it => {
      const s = it.snippet || {};
      return {
        id: s.resourceId?.videoId,
        title: s.title || '',
        publishedAt: s.publishedAt || '',
        thumbs: s.thumbnails || {}
      };
    }).filter(v => !!v.id);
  });
}

function enriquecerConDuracion(videos, key) {
  if (!videos.length) return Promise.resolve([]);
  const ids = videos.map(v => v.id).join(',');
  const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${ids}&key=${key}`;
  return fetch(url).then(r => r.json()).then(j => {
    const map = new Map();
    (j.items || []).forEach(it => {
      const id = it.id;
      const dur = it.contentDetails?.duration || 'PT0S';
      const sec = isoDurationToSeconds(dur);
      const sn  = it.snippet || {};
      map.set(id, { duration: dur, durationSec: sec, publishedAt: sn.publishedAt, thumbs: sn.thumbnails });
    });
    return videos.map(v => {
      const extra = map.get(v.id) || {};
      // elige la mejor miniatura disponible
      const thumbs = extra.thumbs || v.thumbs || {};
      const thumbUrl = (thumbs.maxres || thumbs.standard || thumbs.high || thumbs.medium || thumbs.default || {}).url
        || `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`;
      return {
        ...v,
        publishedAt: extra.publishedAt || v.publishedAt,
        duration: extra.duration,
        durationSec: extra.durationSec,
        thumbUrl
      };
    });
  });
}

function isoDurationToSeconds(iso) {
  // Convierte "PT1H2M3S" → segundos
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso || '');
  if (!m) return 0;
  const h = parseInt(m[1] || '0', 10);
  const mn = parseInt(m[2] || '0', 10);
  const s = parseInt(m[3] || '0', 10);
  return h * 3600 + mn * 60 + s;
}

// --- Render ---
// Convierte segundos a H:MM:SS / M:SS
function formatDuration(sec){
  sec = Math.max(0, parseInt(sec||0,10));
  const h = Math.floor(sec/3600);
  const m = Math.floor((sec%3600)/60);
  const s = sec%60;
  const pad = n => String(n).padStart(2,'0');
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}


function cardHTML(v, i){
  const esc = s => String(s||'').replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
  const url = `https://www.youtube.com/watch?v=${v.id}`;
  const date = v.publishedAt ? new Date(v.publishedAt).toLocaleDateString('es-GT',{day:'2-digit',month:'short',year:'numeric'}) : '';
  const dur  = v.durationSec ? formatDuration(v.durationSec) : '';

  return `
  <div class="col-lg-4 col-md-6 col-12 mb-4" data-aos="fade-up" data-aos-delay="${400 + (i||0)*100}">
    <article class="yt-card">
      <a class="yt-thumb" href="${url}" target="_blank" rel="noopener" aria-label="Ver en YouTube: ${esc(v.title)}">
        <img src="${v.thumbUrl}" alt="${esc(v.title)}" loading="lazy">
        ${dur ? `<span class="yt-badge">${dur}</span>` : ``}
        <span class="yt-overlay">
          <!-- icono play minimal con texto -->
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
          <span>Ver en YouTube</span>
        </span>
      </a>
      <h3 class="yt-title"><a href="${url}" target="_blank" rel="noopener">${esc(v.title)}</a></h3>
      <div class="yt-meta">
        ${date ? `<span class="yt-date">${date}</span>` : ``}
        <span class="yt-pill">YouTube</span>
      </div>
    </article>
  </div>`;
}
function skeleton(n) {
  let out = '';
  for (let i = 0; i < n; i++) {
    out += `
    <div class="col-lg-4 col-md-6 col-12 mb-4" data-aos="fade-up" data-aos-delay="${400 + i*100}">
      <div class="class-thumb embed-card">
        <div class="embed-responsive embed-responsive-16by9 bg-light d-flex align-items-center justify-content-center" style="min-height:180px">
          <span>Cargando…</span>
        </div>
        <div class="class-info">
          <h3 class="mb-1">Cargando…</h3>
          <div class="mt-3">
            <a class="btn custom-btn btn-youtube btn-zoom disabled" href="#" tabindex="-1" aria-disabled="true">Ver en YouTube</a>
          </div>
        </div>
      </div>
    </div>`;
  }
  return out;
}
