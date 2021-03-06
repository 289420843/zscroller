import _extends from 'babel-runtime/helpers/extends';
import Scroller from './Scroller';

var MIN_INDICATOR_SIZE = 8;
var win = typeof window !== 'undefined' ? window : undefined;

if (!win) {
  win = typeof global !== 'undefined' ? global : {};
}

function setTransform(nodeStyle, value) {
  nodeStyle.transform = value;
  nodeStyle.webkitTransform = value;
  nodeStyle.MozTransform = value;
}

function setTransformOrigin(nodeStyle, value) {
  nodeStyle.transformOrigin = value;
  nodeStyle.webkitTransformOrigin = value;
  nodeStyle.MozTransformOrigin = value;
}

var supportsPassive = false;
try {
  var opts = Object.defineProperty({}, 'passive', {
    get: function get() {
      supportsPassive = true;
    }
  });
  win.addEventListener('test', null, opts);
} catch (e) {
  // empty
}

var isWebView = typeof navigator !== 'undefined' && /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(navigator.userAgent);

function iOSWebViewFix(e, touchendFn) {
  // https://github.com/ant-design/ant-design-mobile/issues/573#issuecomment-339560829
  // iOS UIWebView issue, It seems no problem in WKWebView
  if (isWebView && e.changedTouches[0].clientY < 0) {
    touchendFn(new Event('touchend') || e);
  }
}

var willPreventDefault = supportsPassive ? { passive: false } : false;
var willNotPreventDefault = supportsPassive ? { passive: true } : false;

function addEventListener(target, type, fn, options) {
  target.addEventListener(type, fn, options);
  return function () {
    target.removeEventListener(type, fn, options);
  };
}

function DOMScroller(content) {
  var _this = this;

  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  var scrollbars = void 0;
  var indicators = void 0;
  var indicatorsSize = void 0;
  var scrollbarsSize = void 0;
  var indicatorsPos = void 0;
  var scrollbarsOpacity = void 0;
  var contentSize = void 0;
  var clientSize = void 0;

  this.content = content;
  var container = this.container = content.parentNode;
  this.options = _extends({}, options, {
    scrollingComplete: function scrollingComplete() {
      _this.clearScrollbarTimer();
      _this.timer = setTimeout(function () {
        if (_this._destroyed) {
          return;
        }
        if (options.scrollingComplete) {
          options.scrollingComplete();
        }
        if (scrollbars) {
          ['x', 'y'].forEach(function (k) {
            if (scrollbars[k]) {
              _this.setScrollbarOpacity(k, 0);
            }
          });
        }
      }, 0);
    }
  });

  if (this.options.scrollbars) {
    scrollbars = this.scrollbars = {};
    indicators = this.indicators = {};
    indicatorsSize = this.indicatorsSize = {};
    scrollbarsSize = this.scrollbarsSize = {};
    indicatorsPos = this.indicatorsPos = {};
    scrollbarsOpacity = this.scrollbarsOpacity = {};
    contentSize = this.contentSize = {};
    clientSize = this.clientSize = {};

    ['x', 'y'].forEach(function (k) {
      var optionName = k === 'x' ? 'scrollingX' : 'scrollingY';
      if (_this.options[optionName] !== false) {
        scrollbars[k] = document.createElement('div');
        scrollbars[k].className = 'zscroller-scrollbar-' + k;
        indicators[k] = document.createElement('div');
        indicators[k].className = 'zscroller-indicator-' + k;
        scrollbars[k].appendChild(indicators[k]);
        indicatorsSize[k] = -1;
        scrollbarsOpacity[k] = 0;
        indicatorsPos[k] = 0;
        container.appendChild(scrollbars[k]);
      }
    });
  }

  var init = true;
  var contentStyle = content.style;

  // create Scroller instance
  this.scroller = new Scroller(function (left, top, zoom) {
    if (!init && options.onScroll) {
      options.onScroll(left, top, zoom);
    }
    setTransform(contentStyle, 'translate3d(' + -left + 'px,' + -top + 'px,0) scale(' + zoom + ')');
    if (scrollbars) {
      ['x', 'y'].forEach(function (k) {
        if (scrollbars[k]) {
          var pos = k === 'x' ? left : top;
          if (clientSize[k] >= contentSize[k]) {
            _this.setScrollbarOpacity(k, 0);
          } else {
            if (!init) {
              _this.setScrollbarOpacity(k, 1);
            }
            var normalIndicatorSize = clientSize[k] / contentSize[k] * scrollbarsSize[k];
            var size = normalIndicatorSize;
            var indicatorPos = void 0;
            if (pos < 0) {
              size = Math.max(normalIndicatorSize + pos, MIN_INDICATOR_SIZE);
              indicatorPos = 0;
            } else if (pos > contentSize[k] - clientSize[k]) {
              size = Math.max(normalIndicatorSize + contentSize[k] - clientSize[k] - pos, MIN_INDICATOR_SIZE);
              indicatorPos = scrollbarsSize[k] - size;
            } else {
              indicatorPos = pos / contentSize[k] * scrollbarsSize[k];
            }
            _this.setIndicatorSize(k, size);
            _this.setIndicatorPos(k, indicatorPos);
          }
        }
      });
    }
    init = false;
  }, this.options);

  // bind events
  this.bindEvents();

  // the content element needs a correct transform origin for zooming
  setTransformOrigin(content.style, 'left top');

  // reflow for the first time
  this.reflow();
}

DOMScroller.prototype = {
  constructor: DOMScroller,
  setDisabled: function setDisabled(disabled) {
    this.disabled = disabled;
  },
  clearScrollbarTimer: function clearScrollbarTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  },
  setScrollbarOpacity: function setScrollbarOpacity(axis, opacity) {
    if (this.scrollbarsOpacity[axis] !== opacity) {
      this.scrollbars[axis].style.opacity = opacity;
      this.scrollbarsOpacity[axis] = opacity;
    }
  },
  setIndicatorPos: function setIndicatorPos(axis, value) {
    var indicatorsPos = this.indicatorsPos,
        indicators = this.indicators;

    if (indicatorsPos[axis] !== value) {
      if (axis === 'x') {
        setTransform(indicators[axis].style, 'translate3d(' + value + 'px,0,0)');
      } else {
        setTransform(indicators[axis].style, 'translate3d(0, ' + value + 'px,0)');
      }
      indicatorsPos[axis] = value;
    }
  },
  setIndicatorSize: function setIndicatorSize(axis, value) {
    var indicatorsSize = this.indicatorsSize,
        indicators = this.indicators;

    if (indicatorsSize[axis] !== value) {
      indicators[axis].style[axis === 'x' ? 'width' : 'height'] = value + 'px';
      indicatorsSize[axis] = value;
    }
  },
  reflow: function reflow() {
    var container = this.container,
        content = this.content,
        scrollbarsSize = this.scrollbarsSize,
        contentSize = this.contentSize,
        scrollbars = this.scrollbars,
        clientSize = this.clientSize,
        scroller = this.scroller;

    if (scrollbars) {
      contentSize.x = content.offsetWidth;
      contentSize.y = content.offsetHeight;
      clientSize.x = container.clientWidth;
      clientSize.y = container.clientHeight;
      if (scrollbars.x) {
        scrollbarsSize.x = scrollbars.x.offsetWidth;
      }
      if (scrollbars.y) {
        scrollbarsSize.y = scrollbars.y.offsetHeight;
      }
    }
    // set the right scroller dimensions
    scroller.setDimensions(container.clientWidth, container.clientHeight, content.offsetWidth, content.offsetHeight);

    // refresh the position for zooming purposes
    var rect = container.getBoundingClientRect();
    scroller.setPosition(rect.x + container.clientLeft, rect.y + container.clientTop);
  },
  destroy: function destroy() {
    this._destroyed = true;
    this.unbindEvent();
  },
  unbindEvent: function unbindEvent(type) {
    var eventHandlers = this.eventHandlers;

    if (type) {
      if (eventHandlers[type]) {
        eventHandlers[type]();
        delete eventHandlers[type];
      }
    } else {
      Object.keys(eventHandlers).forEach(function (t) {
        eventHandlers[t]();
        delete eventHandlers[t];
      });
    }
  },
  bindEvent: function bindEvent(target, type, fn, options) {
    var eventHandlers = this.eventHandlers;

    if (eventHandlers[type]) {
      eventHandlers[type]();
    }
    eventHandlers[type] = addEventListener(target, type, fn, options);
  },
  bindEvents: function bindEvents() {
    var _this2 = this;

    // reflow handling
    this.eventHandlers = {};

    this.bindEvent(win, 'resize', function () {
      _this2.reflow();
    }, false);

    var lockMouse = false;
    var releaseLockTimer = void 0;

    var container = this.container,
        scroller = this.scroller;


    this.bindEvent(container, 'touchstart', function (e) {
      lockMouse = true;
      if (releaseLockTimer) {
        clearTimeout(releaseLockTimer);
        releaseLockTimer = null;
      }
      // Don't react if initial down happens on a form element
      if (e.touches[0] && e.touches[0].target && e.touches[0].target.tagName.match(/input|textarea|select/i) || _this2.disabled) {
        return;
      }
      _this2.clearScrollbarTimer();
      // reflow since the container may have changed
      _this2.reflow();
      scroller.doTouchStart(e.touches, e.timeStamp);
    }, willNotPreventDefault);

    var _options = this.options,
        preventDefaultOnTouchMove = _options.preventDefaultOnTouchMove,
        zooming = _options.zooming;

    var onTouchEnd = function onTouchEnd(e) {
      scroller.doTouchEnd(e.timeStamp);
      releaseLockTimer = setTimeout(function () {
        lockMouse = false;
      }, 300);
    };

    if (preventDefaultOnTouchMove !== false) {
      this.bindEvent(container, 'touchmove', function (e) {
        e.preventDefault();
        scroller.doTouchMove(e.touches, e.timeStamp, e.scale);
        iOSWebViewFix(e, onTouchEnd);
      }, willPreventDefault);
    } else {
      this.bindEvent(container, 'touchmove', function (e) {
        scroller.doTouchMove(e.touches, e.timeStamp, e.scale);
        iOSWebViewFix(e, onTouchEnd);
      }, willNotPreventDefault);
    }

    this.bindEvent(container, 'touchend', onTouchEnd, willNotPreventDefault);
    this.bindEvent(container, 'touchcancel', onTouchEnd, willNotPreventDefault);

    var onMouseUp = function onMouseUp(e) {
      scroller.doTouchEnd(e.timeStamp);
      _this2.unbindEvent('mousemove');
      _this2.unbindEvent('mouseup');
    };

    var onMouseMove = function onMouseMove(e) {
      scroller.doTouchMove([{
        pageX: e.pageX,
        pageY: e.pageY
      }], e.timeStamp);
    };

    this.bindEvent(container, 'mousedown', function (e) {
      if (lockMouse || e.target.tagName.match(/input|textarea|select/i) || _this2.disabled) {
        return;
      }
      _this2.clearScrollbarTimer();
      scroller.doTouchStart([{
        pageX: e.pageX,
        pageY: e.pageY
      }], e.timeStamp);
      // reflow since the container may have changed
      _this2.reflow();
      e.preventDefault();
      _this2.bindEvent(document, 'mousemove', onMouseMove, willNotPreventDefault);
      _this2.bindEvent(document, 'mouseup', onMouseUp, willNotPreventDefault);
    }, willPreventDefault);

    if (zooming) {
      this.bindEvent(container, 'mousewheel', function (e) {
        scroller.doMouseZoom(e.wheelDelta, e.timeStamp, e.pageX, e.pageY);
        e.preventDefault();
      }, willPreventDefault);
    }
  }
};

export default DOMScroller;