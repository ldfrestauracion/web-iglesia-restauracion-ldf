// api_videos_recientes.js (versión compat móvil)
(function () {
  'use strict';

  var YT_CFG = {
  CHANNEL_ID: 'UCaZpamtleaf-YXHg_hG5SVA', 
  API_KEY: 'AIzaSyCFl4kHbiXdl2FZXqcZNUlE92cgNwbc8Ko',  
    COUNT: 3,
    MIN_SECONDS: 180
  };

  // Helpers de compat
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function safeGet(o, path) {
    for (var i = 0; i < path.length; i++) {
      if (!o || typeof o !== 'object') return undefined;
      o = o[path[i]];
    }
    return o;
  }
  function formatDateNice(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    try {
      return d.toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
      return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear();
    }
  }

  document.addEventListener('DOMContentLoaded', initYTRecientes);
  document.addEventListener('DOMContentLoaded', initYTCanciones);

  function initYTRecientes() {
    var cont = document.getElementById('yt-recientes');
    if (!cont) return;

    cont.innerHTML = skeleton(YT_CFG.COUNT);

    obtenerUploadsPlaylist(YT_CFG.CHANNEL_ID, YT_CFG.API_KEY)
      .then(function (playlistId) {
        return fetchPlaylistItems(playlistId, YT_CFG.API_KEY, YT_CFG.COUNT * 6);
      })
      .then(function (items) { return enriquecerConDuracion(items, YT_CFG.API_KEY); })
      .then(function (items) {
        // Filtrar shorts por duración (compat sin ??)
        var filtrados = items.filter(function (v) {
          return (v.durationSec == null ? 99999 : v.durationSec) >= YT_CFG.MIN_SECONDS;
        });

        if (filtrados.length < YT_CFG.COUNT) {
          var ids = {};
          for (var i = 0; i < filtrados.length; i++) ids[filtrados[i].id] = true;
          for (var j = 0; j < items.length; j++) {
            var it = items[j];
            if (!ids[it.id]) filtrados.push(it);
          }
        }

        filtrados.sort(function (a, b) {
          return new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0);
        });
        var top = filtrados.slice(0, YT_CFG.COUNT);

        // SIN data-aos para evitar opacidad 0 en móvil
        cont.innerHTML = top.map(cardHTML_noAOS).join('');
        if (window.AOS && typeof AOS.refresh === 'function') AOS.refresh();
      })
      .catch(function (err) {
        console.error('YouTube recientes:', err);
        cont.innerHTML = '' +
          '<div class="col-12">' +
          '  <div class="alert alert-warning">' +
          '    No pudimos cargar las prédicas recientes. ' +
          '    <a target="_blank" rel="noopener" href="https://www.youtube.com/channel/' + YT_CFG.CHANNEL_ID + '/videos">Ver canal</a>' +
          '  </div>' +
          '</div>';
      });
  }

  function obtenerUploadsPlaylist(channelId, key) {
    var url = 'https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=' + channelId + '&key=' + key;
    return fetch(url).then(function (r) { return r.json(); }).then(function (j) {
      var uploads = safeGet(j, ['items', 0, 'contentDetails', 'relatedPlaylists', 'uploads']);
      if (!uploads) throw new Error('No se encontró el playlist de subidas');
      return uploads;
    });
  }

  function fetchPlaylistItems(playlistId, key, max) {
    if (typeof max === 'undefined') max = 12;
    var url = 'https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=' + playlistId +
      '&maxResults=' + Math.min(max, 50) + '&key=' + key;
    return fetch(url).then(function (r) { return r.json(); }).then(function (j) {
      var arr = j.items || [];
      var out = [];
      for (var i = 0; i < arr.length; i++) {
        var s = arr[i].snippet || {};
        var rid = safeGet(s, ['resourceId', 'videoId']);
        if (!rid) continue;
        out.push({
          id: rid,
          title: s.title || '',
          publishedAt: s.publishedAt || '',
          thumbs: s.thumbnails || {}
        });
      }
      return out;
    });
  }

  function enriquecerConDuracion(videos, key) {
    if (!videos || !videos.length) return Promise.resolve([]);
    var ids = [];
    for (var i = 0; i < videos.length; i++) ids.push(videos[i].id);
    var url = 'https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=' + ids.join(',') + '&key=' + key;
    return fetch(url).then(function (r) { return r.json(); }).then(function (j) {
      var map = {};
      var arr = j.items || [];
      for (var k = 0; k < arr.length; k++) {
        var it = arr[k];
        var dur = safeGet(it, ['contentDetails', 'duration']) || 'PT0S';
        var sec = isoDurationToSeconds(dur);
        var sn = it.snippet || {};
        map[it.id] = {
          duration: dur,
          durationSec: sec,
          publishedAt: sn.publishedAt,
          thumbs: sn.thumbnails
        };
      }
      var out = [];
      for (var m = 0; m < videos.length; m++) {
        var v = videos[m];
        var extra = map[v.id] || {};
        var thumbs = extra.thumbs || v.thumbs || {};
        var t =
          (thumbs.maxres && thumbs.maxres.url) ||
          (thumbs.standard && thumbs.standard.url) ||
          (thumbs.high && thumbs.high.url) ||
          (thumbs.medium && thumbs.medium.url) ||
          (thumbs['default'] && thumbs['default'].url) ||
          ('https://i.ytimg.com/vi/' + v.id + '/hqdefault.jpg');
        out.push({
          id: v.id,
          title: v.title,
          publishedAt: extra.publishedAt || v.publishedAt,
          duration: extra.duration,
          durationSec: extra.durationSec,
          thumbUrl: t
        });
      }
      return out;
    });
  }

  function isoDurationToSeconds(iso) {
    iso = iso || '';
    var m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
    if (!m) return 0;
    var h = parseInt(m[1] || '0', 10);
    var mn = parseInt(m[2] || '0', 10);
    var s = parseInt(m[3] || '0', 10);
    return h * 3600 + mn * 60 + s;
  }

  function formatDuration(sec) {
    sec = Math.max(0, parseInt(sec || 0, 10));
    var h = Math.floor(sec / 3600);
    var m = Math.floor((sec % 3600) / 60);
    var s = sec % 60;
    return h ? (h + ':' + pad2(m) + ':' + pad2(s)) : (m + ':' + pad2(s));
  }

  // Render SIN AOS (para evitar opacidad 0 en móvil)
  function cardHTML_noAOS(v) {
    var url = 'https://www.youtube.com/watch?v=' + v.id;
    var date = formatDateNice(v.publishedAt);
    var dur = v.durationSec ? formatDuration(v.durationSec) : '';
    var esc = function (s) {
      s = String(s || '');
      return s.replace(/[&<>"]/g, function (m) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[m]; });
    };
    return '' +
      '<div class="col-lg-4 col-md-6 col-12 mb-4">' +
      '  <article class="yt-card">' +
      '    <a class="yt-thumb" href="' + url + '" target="_blank" rel="noopener" aria-label="Ver en YouTube: ' + esc(v.title) + '">' +
      '      <img src="' + v.thumbUrl + '" alt="' + esc(v.title) + '" loading="lazy">' +
      (dur ? '      <span class="yt-badge">' + dur + '</span>' : '') +
      '      <span class="yt-overlay"><svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg><span>Ver en YouTube</span></span>' +
      '    </a>' +
      '    <h3 class="yt-title"><a href="' + url + '" target="_blank" rel="noopener">' + esc(v.title) + '</a></h3>' +
      '    <div class="yt-meta">' +
      (date ? '      <span class="yt-date">' + date + '</span>' : '') +
      '      <span class="yt-pill">YouTube</span>' +
      '    </div>' +
      '  </article>' +
      '</div>';
  }

  // ========================= PLAYLIST "CANCIONES" =========================

  var MUSIC_PLAYLIST_ID = 'PLLOkduBhQHmRJjaxg_u_1bkCTO-8XHg5R';
  var MUSIC_PLAYLIST_NAME = 'Canciones';
  var COUNT_SONGS = 3;

  function initYTCanciones() {
    var cont = document.getElementById('yt-canciones');
    if (!cont) return;

    cont.innerHTML = skeleton(COUNT_SONGS);

    var pid = (MUSIC_PLAYLIST_ID || '').replace(/^\s+|\s+$/g, '');
    if (!pid) {
      cont.innerHTML = '<div class="col-12"><div class="alert alert-warning">Falta el ID de la playlist.</div></div>';
      return;
    }

    var url = 'https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=' + encodeURIComponent(pid) +
      '&maxResults=50&key=' + YT_CFG.API_KEY;

    fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var items = (j.items || []).map(function (it) {
          var s = it.snippet || {};
          var cd = it.contentDetails || {};
          var thumbs = s.thumbnails || {};
          var thumbUrl =
            (thumbs.maxres && thumbs.maxres.url) ||
            (thumbs.standard && thumbs.standard.url) ||
            (thumbs.high && thumbs.high.url) ||
            (thumbs.medium && thumbs.medium.url) ||
            (thumbs['default'] && thumbs['default'].url) ||
            ('https://i.ytimg.com/vi/' + cd.videoId + '/hqdefault.jpg');

          return {
            id: cd.videoId || (s.resourceId && s.resourceId.videoId),
            title: s.title || '',
            publishedAt: cd.videoPublishedAt || s.publishedAt || '',
            thumbUrl: thumbUrl
          };
        }).filter(function (v) { return !!v.id; });

        var top3 = items.sort(function (a, b) {
          return new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0);
        }).slice(0, COUNT_SONGS);

        if (!top3.length) {
          cont.innerHTML = '<div class="col-12"><div class="alert alert-warning">La playlist no tiene videos públicos.</div></div>';
          return;
        }

        cont.innerHTML = top3.map(cardHTML_noAOS).join('');
        if (window.AOS && typeof AOS.refresh === 'function') AOS.refresh();
      })
      .catch(function (err) {
        console.error('Playlist canciones:', err);
        cont.innerHTML =
          '<div class="col-12"><div class="alert alert-warning">No pudimos cargar la playlist. ' +
          '<a target="_blank" rel="noopener" href="https://www.youtube.com/playlist?list=' + encodeURIComponent(pid) + '">Abrir en YouTube</a>' +
          '</div></div>';
      });
  }

  function skeleton(n) {
    var out = '';
    for (var i = 0; i < n; i++) {
      out += '' +
        '<div class="col-lg-4 col-md-6 col-12 mb-4">' +
        '  <div class="class-thumb embed-card">' +
        '    <div class="embed-responsive embed-responsive-16by9 bg-light d-flex align-items-center justify-content-center" style="min-height:180px">' +
        '      <span>Cargando…</span>' +
        '    </div>' +
        '    <div class="class-info">' +
        '      <h3 class="mb-1">Cargando…</h3>' +
        '      <div class="mt-3"><a class="btn custom-btn btn-youtube btn-zoom disabled" href="#" tabindex="-1" aria-disabled="true">Ver en YouTube</a></div>' +
        '    </div>' +
        '  </div>' +
        '</div>';
    }
    return out;
  }
})();
