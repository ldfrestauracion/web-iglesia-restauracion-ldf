
  $(function () {

    // MENU
    $('.navbar-collapse a').on('click',function(){
      $(".navbar-collapse").collapse('hide');
    });

    // AOS ANIMATION
    AOS.init({
      disable: 'mobile',
      duration: 800,
      anchorPlacement: 'center-bottom'
    });


    // SMOOTHSCROLL NAVBAR
    $(function() {
      $('.navbar a, .hero-text a').on('click', function(event) {
        var $anchor = $(this);
        $('html, body').stop().animate({
            scrollTop: $($anchor.attr('href')).offset().top - 49
        }, 1000);
        event.preventDefault();
      });
    });

    // Lazy load map only when needed.
    const mapFrame = document.getElementById('location-map');
    const mapPlaceholder = document.getElementById('map-placeholder');
    const mapButton = document.getElementById('load-map-btn');

    function loadMap() {
      if (!mapFrame || mapFrame.src) return;
      mapFrame.src = mapFrame.dataset.src;
      mapFrame.addEventListener('load', function onLoad() {
        mapFrame.classList.add('is-loaded');
        if (mapPlaceholder) {
          mapPlaceholder.classList.add('is-hidden');
        }
        mapFrame.removeEventListener('load', onLoad);
      });
    }

    if (mapButton) {
      mapButton.addEventListener('click', loadMap);
    }

    if (mapFrame && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            loadMap();
            observer.disconnect();
          }
        });
      }, { rootMargin: '180px 0px' });

      observer.observe(mapFrame);
    } else {
      loadMap();
    }
  });


    
