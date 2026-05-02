/* global Fluid */

HTMLElement.prototype.wrap = function(wrapper) {
  this.parentNode.insertBefore(wrapper, this);
  this.parentNode.removeChild(this);
  wrapper.appendChild(this);
};

Fluid.events = {

  registerNavbarEvent: function() {
    var navbar = jQuery('#navbar');
    if (navbar.length === 0) {
      return;
    }
    var submenu = jQuery('#navbar .dropdown-menu');
    if (navbar.offset().top > 0) {
      navbar.removeClass('navbar-dark');
      submenu.removeClass('navbar-dark');
    }
    Fluid.utils.listenScroll(function() {
      navbar[navbar.offset().top > 50 ? 'addClass' : 'removeClass']('top-nav-collapse');
      submenu[navbar.offset().top > 50 ? 'addClass' : 'removeClass']('dropdown-collapse');
      if (navbar.offset().top > 0) {
        navbar.removeClass('navbar-dark');
        submenu.removeClass('navbar-dark');
      } else {
        navbar.addClass('navbar-dark');
        submenu.removeClass('navbar-dark');
      }
    });
    jQuery('#navbar-toggler-btn').on('click', function() {
      jQuery('.animated-icon').toggleClass('open');
      jQuery('#navbar').toggleClass('navbar-col-show');
    });
  },

  registerParallaxEvent: function() {
    var ph = jQuery('#banner[parallax="true"]');
    ph.css({ transform: 'none' });
    jQuery('.side-col').css({ 'padding-top': '' });
  },

  registerScrollDownArrowEvent: function() {
    var scrollbar = jQuery('.scroll-down-bar');
    if (scrollbar.length === 0) {
      return;
    }
    scrollbar.on('click', function() {
      Fluid.utils.scrollToElement('#board', -jQuery('#navbar').height());
    });
  },

  registerScrollTopArrowEvent: function() {
    var topArrow = jQuery('#scroll-top-button');
    if (topArrow.length === 0) {
      return;
    }
    var board = jQuery('#board');
    if (board.length === 0) {
      return;
    }
    var posDisplay = false;
    var scrollDisplay = false;
    // Position
    var setTopArrowPos = function() {
      var boardRight = board[0].getClientRects()[0].right;
      var bodyWidth = document.body.offsetWidth;
      var right = bodyWidth - boardRight;
      posDisplay = right >= 50;
      topArrow.css({
        'bottom': posDisplay && scrollDisplay ? '20px' : '-60px',
        'right' : right - 64 + 'px'
      });
    };
    setTopArrowPos();
    jQuery(window).resize(setTopArrowPos);
    // Display
    var headerHeight = board.offset().top;
    Fluid.utils.listenScroll(function() {
      var scrollHeight = document.body.scrollTop + document.documentElement.scrollTop;
      scrollDisplay = scrollHeight >= headerHeight;
      topArrow.css({
        'bottom': posDisplay && scrollDisplay ? '20px' : '-60px'
      });
    });
    // Click
    topArrow.on('click', function() {
      jQuery('body,html').scrollTop(0);
    });
  },

  registerPostBackEvent: function() {
    var post = document.querySelector('.post-content');
    if (!post || document.querySelector('.post-back-link')) {
      return;
    }

    var back = document.createElement('a');
    back.className = 'post-back-link';
    back.href = '/';
    back.setAttribute('aria-label', '返回');
    back.innerHTML = '<i class="iconfont icon-arrowleft" aria-hidden="true"></i><span>返回</span>';
    back.addEventListener('click', function(event) {
      if (!document.referrer) {
        return;
      }

      try {
        var referrer = new URL(document.referrer);
        if (referrer.origin === window.location.origin && referrer.href !== window.location.href) {
          event.preventDefault();
          window.history.back();
        }
      } catch (error) {
        // Fall back to the home link if the referrer cannot be parsed.
      }
    });

    post.insertBefore(back, post.firstChild);
  },

  registerImageLoadedEvent: function() {
    if (!('NProgress' in window)) { return; }

    var bg = document.getElementById('banner');
    if (bg) {
      var src = bg.style.backgroundImage;
      var url = src.match(/\((.*?)\)/)[1].replace(/(['"])/g, '');
      var img = new Image();
      img.onload = function() {
        window.NProgress && window.NProgress.status !== null && window.NProgress.inc(0.2);
      };
      img.src = url;
      if (img.complete) { img.onload(); }
    }

    var notLazyImages = jQuery('main img:not([lazyload])');
    var total = notLazyImages.length;
    for (const img of notLazyImages) {
      const old = img.onload;
      img.onload = function() {
        old && old();
        window.NProgress && window.NProgress.status !== null && window.NProgress.inc(0.5 / total);
      };
      if (img.complete) { img.onload(); }
    }
  },

  registerRefreshCallback: function(callback) {
    if (!Array.isArray(Fluid.events._refreshCallbacks)) {
      Fluid.events._refreshCallbacks = [];
    }
    Fluid.events._refreshCallbacks.push(callback);
  },

  refresh: function() {
    if (Array.isArray(Fluid.events._refreshCallbacks)) {
      for (var callback of Fluid.events._refreshCallbacks) {
        if (callback instanceof Function) {
          callback();
        }
      }
    }
  },

  billboard: function() {
    if (!('console' in window)) {
      return;
    }
    // eslint-disable-next-line no-console
    console.log(`
-------------------------------------------------
|                                               |
|      ________  __            _        __      |
|     |_   __  |[  |          (_)      |  ]     |
|       | |_ \\_| | | __   _   __   .--.| |      |
|       |  _|    | |[  | | | [  |/ /'\`\\' |      |
|      _| |_     | | | \\_/ |, | || \\__/  |      |
|     |_____|   [___]'.__.'_/[___]'.__.;__]     |
|                                               |
|            Powered by Hexo x Fluid            |
| https://github.com/fluid-dev/hexo-theme-fluid |
|                                               |
-------------------------------------------------
    `);
  }
};
