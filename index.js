/*
 * Copyright 2016 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

(function() {
  var Marzipano = window.Marzipano;
  var bowser = window.bowser;
  var screenfull = window.screenfull;
  var data = window.APP_DATA;

  // Grab elements from DOM.
  var panoElement = document.querySelector('#pano');
  var sceneNameElement = document.querySelector('#titleBar .sceneName');
  var sceneListElement = document.querySelector('#sceneList');
  var sceneElements = document.querySelectorAll('#sceneList .scene');
  var sceneListToggleElement = document.querySelector('#sceneListToggle');
  var autorotateToggleElement = document.querySelector('#autorotateToggle');
  var fullscreenToggleElement = document.querySelector('#fullscreenToggle');
  var idleProgressElements = document.querySelectorAll('.idle-progress');
  var vrToggleElement = document.querySelector('#vrToggle');
  var vrOverlayElement = document.querySelector('#vrOverlay');
  var vrExitElement = document.querySelector('#vrExit');
  var vrNoticeElement = document.querySelector('#vrNotice');
  var vrCaptionElements = document.querySelectorAll('#vrOverlay .vr-caption');

  // Advance to the next scene after this long without user interaction.
  var IDLE_AUTOPLAY_DELAY = 8000;

  // Scene currently on screen; used to pick the next one on idle autoplay.
  var currentScene = null;

  // Whether the Cardboard split-screen mode is on.
  var vrActive = false;

  // Detect desktop or mobile mode.
  if (window.matchMedia) {
    var setMode = function() {
      if (mql.matches) {
        document.body.classList.remove('desktop');
        document.body.classList.add('mobile');
      } else {
        document.body.classList.remove('mobile');
        document.body.classList.add('desktop');
      }
    };
    var mql = matchMedia("(max-width: 500px), (max-height: 500px)");
    setMode();
    mql.addListener(setMode);
  } else {
    document.body.classList.add('desktop');
  }

  // Detect whether we are on a touch device.
  document.body.classList.add('no-touch');
  window.addEventListener('touchstart', function() {
    document.body.classList.remove('no-touch');
    document.body.classList.add('touch');
  });

  // Use tooltip fallback mode on IE < 11.
  if (bowser.msie && parseFloat(bowser.version) < 11) {
    document.body.classList.add('tooltip-fallback');
  }

  // Viewer options.
  var viewerOpts = {
    controls: {
      mouseViewMode: data.settings.mouseViewMode
    }
  };

  // Initialize viewer.
  var viewer = new Marzipano.Viewer(panoElement, viewerOpts);

  // Create scenes.
  var scenes = data.scenes.map(function(data) {
    var urlPrefix = "tiles";
    var source = Marzipano.ImageUrlSource.fromString(
      urlPrefix + "/" + data.id + "/{z}/{f}/{y}/{x}.jpg",
      { cubeMapPreviewUrl: urlPrefix + "/" + data.id + "/preview.jpg" });
    var geometry = new Marzipano.CubeGeometry(data.levels);

    var limiter = Marzipano.RectilinearView.limit.traditional(data.faceSize, 100*Math.PI/180, 120*Math.PI/180);
    var view = new Marzipano.RectilinearView(data.initialViewParameters, limiter);

    var scene = viewer.createScene({
      source: source,
      geometry: geometry,
      view: view,
      pinFirstLevel: true
    });

    // Create link hotspots.
    data.linkHotspots.forEach(function(hotspot) {
      var element = createLinkHotspotElement(hotspot);
      scene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
    });

    // Create info hotspots.
    data.infoHotspots.forEach(function(hotspot) {
      var element = createInfoHotspotElement(hotspot);
      scene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
    });

    return {
      data: data,
      scene: scene,
      view: view,
      // Kept to build the second (right eye) layer in VR mode.
      source: source,
      geometry: geometry,
      rightEyeLayer: null
    };
  });

  // Set up autorotate, if enabled.
  var autorotate = Marzipano.autorotate({
    yawSpeed: 0.03,
    targetPitch: 0,
    targetFov: Math.PI/2
  });
  if (data.settings.autorotateEnabled) {
    autorotateToggleElement.classList.add('enabled');
  }

  // Set handler for autorotate toggle.
  autorotateToggleElement.addEventListener('click', toggleAutorotate);

  // Set up fullscreen mode, if supported.
  if (screenfull.enabled && data.settings.fullscreenButton) {
    document.body.classList.add('fullscreen-enabled');
    fullscreenToggleElement.addEventListener('click', function() {
      screenfull.toggle();
    });
    screenfull.on('change', function() {
      if (screenfull.isFullscreen) {
        fullscreenToggleElement.classList.add('enabled');
      } else {
        fullscreenToggleElement.classList.remove('enabled');
      }
    });
  } else {
    document.body.classList.add('fullscreen-disabled');
  }

  // Set handler for scene list toggle.
  sceneListToggleElement.addEventListener('click', toggleSceneList);

  // Start with the scene list open on desktop.
  if (!document.body.classList.contains('mobile')) {
    showSceneList();
  }

  // Set handler for scene switch.
  scenes.forEach(function(scene) {
    var el = document.querySelector('#sceneList .scene[data-id="' + scene.data.id + '"]');
    el.addEventListener('click', function() {
      switchScene(scene);
      // On mobile, hide scene list after selecting a scene.
      if (document.body.classList.contains('mobile')) {
        hideSceneList();
      }
    });
  });

  // DOM elements for view controls.
  var viewUpElement = document.querySelector('#viewUp');
  var viewDownElement = document.querySelector('#viewDown');
  var viewLeftElement = document.querySelector('#viewLeft');
  var viewRightElement = document.querySelector('#viewRight');
  var viewInElement = document.querySelector('#viewIn');
  var viewOutElement = document.querySelector('#viewOut');

  // Dynamic parameters for controls.
  var velocity = 0.7;
  var friction = 3;

  // Associate view controls with elements.
  var controls = viewer.controls();
  controls.registerMethod('upElement',    new Marzipano.ElementPressControlMethod(viewUpElement,     'y', -velocity, friction), true);
  controls.registerMethod('downElement',  new Marzipano.ElementPressControlMethod(viewDownElement,   'y',  velocity, friction), true);
  controls.registerMethod('leftElement',  new Marzipano.ElementPressControlMethod(viewLeftElement,   'x', -velocity, friction), true);
  controls.registerMethod('rightElement', new Marzipano.ElementPressControlMethod(viewRightElement,  'x',  velocity, friction), true);
  controls.registerMethod('inElement',    new Marzipano.ElementPressControlMethod(viewInElement,  'zoom', -velocity, friction), true);
  controls.registerMethod('outElement',   new Marzipano.ElementPressControlMethod(viewOutElement, 'zoom',  velocity, friction), true);

  function sanitize(s) {
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;');
  }

  function switchScene(scene) {
    currentScene = scene;
    stopAutorotate();
    scene.view.setParameters(scene.data.initialViewParameters);
    scene.scene.switchTo();
    startAutorotate();
    updateSceneName(scene);
    updateSceneList(scene);
    if (vrActive) {
      // Put the front of the new image wherever the user is looking now.
      vrNeedsCalibration = true;
      vrOrientationDirty = true;
    }
  }

  function updateSceneName(scene) {
    sceneNameElement.innerHTML = sanitize(scene.data.name);
    for (var i = 0; i < vrCaptionElements.length; i++) {
      var caption = vrCaptionElements[i];
      caption.textContent = scene.data.name;
      if (vrActive) {
        caption.classList.remove('flash');
        void caption.offsetWidth; // Force reflow so the animation restarts.
        caption.classList.add('flash');
      }
    }
  }

  function updateSceneList(scene) {
    for (var i = 0; i < sceneElements.length; i++) {
      var el = sceneElements[i];
      if (el.getAttribute('data-id') === scene.data.id) {
        el.classList.add('current');
      } else {
        el.classList.remove('current');
      }
    }
  }

  function showSceneList() {
    sceneListElement.classList.add('enabled');
    sceneListToggleElement.classList.add('enabled');
  }

  function hideSceneList() {
    sceneListElement.classList.remove('enabled');
    sceneListToggleElement.classList.remove('enabled');
  }

  function toggleSceneList() {
    sceneListElement.classList.toggle('enabled');
    sceneListToggleElement.classList.toggle('enabled');
  }

  function startAutorotate() {
    // In VR the view follows the user's head; never rotate it on its own.
    if (vrActive || !autorotateToggleElement.classList.contains('enabled')) {
      return;
    }
    viewer.startMovement(autorotate);
    viewer.setIdleMovement(3000, autorotate);
  }

  function stopAutorotate() {
    viewer.stopMovement();
    viewer.setIdleMovement(Infinity);
  }

  function toggleAutorotate() {
    // The play/pause button governs all automatic motion: both the in-scene
    // rotation and the idle scene autoplay.
    if (autorotateToggleElement.classList.contains('enabled')) {
      autorotateToggleElement.classList.remove('enabled');
      stopAutorotate();
      idleAutoplay.stop();
    } else {
      autorotateToggleElement.classList.add('enabled');
      startAutorotate();
      idleAutoplay.start();
    }
  }

  // Autoplay runs while the play/pause button is on, and always in VR mode.
  function shouldAutoplay() {
    return scenes.length > 1 &&
      (vrActive || autorotateToggleElement.classList.contains('enabled'));
  }

  function switchToNextScene() {
    var index = scenes.indexOf(currentScene);
    switchScene(scenes[(index + 1) % scenes.length]);
  }

  // Idle autoplay. Calls onIdle once `delay` ms pass with no interaction on
  // `container`, then re-arms itself (recursive setTimeout). Every interaction
  // clears the pending timeout and restarts the countdown from zero.
  function createIdleAutoplay(container, delay, onIdle) {
    var interactionEvents = [
      'click', 'mouseenter', 'mouseleave', 'touchstart', 'touchend', 'scroll',
      // Marzipano drives drag and zoom through pointer and wheel events, which
      // produce no click or scroll while the user is still interacting.
      'pointerdown', 'pointermove', 'wheel', 'keydown'
    ];
    // Capture phase: mouseenter/mouseleave/scroll do not bubble, and hotspots
    // stop propagation of touch and wheel events, so a bubbling listener on
    // the container would miss them. Old browsers read the object as `true`.
    var listenerOptions = { capture: true, passive: true };
    var timer = null;
    var progressFrame = null;
    var running = false;
    var i;

    // Countdown bars: one under the title bar and one per eye in VR mode.
    for (i = 0; i < idleProgressElements.length; i++) {
      var progressBar = idleProgressElements[i].querySelector('.bar');
      progressBar.style.webkitAnimationDuration = delay + 'ms';
      progressBar.style.animationDuration = delay + 'ms';
    }

    function schedule() {
      clearTimeout(timer);
      timer = null;
      if (running && !document.hidden) {
        timer = setTimeout(fire, delay);
      }
      restartProgress();
    }

    function fire() {
      timer = null;
      onIdle();
      schedule();
    }

    // Restart the countdown bar from empty. Coalesced to one restart per frame
    // so a stream of pointermove events does not force a reflow per event.
    function restartProgress() {
      for (var i = 0; i < idleProgressElements.length; i++) {
        idleProgressElements[i].classList.remove('running');
      }
      if (timer === null || progressFrame !== null || !idleProgressElements.length) {
        return;
      }
      progressFrame = requestAnimationFrame(function() {
        progressFrame = null;
        if (timer === null) {
          return;
        }
        void document.body.offsetWidth; // Force reflow so the animation restarts.
        for (var i = 0; i < idleProgressElements.length; i++) {
          idleProgressElements[i].classList.add('running');
        }
      });
    }

    function start() {
      running = true;
      schedule();
    }

    function stop() {
      running = false;
      schedule();
    }

    function destroy() {
      stop();
      if (progressFrame !== null) {
        cancelAnimationFrame(progressFrame);
        progressFrame = null;
      }
      for (i = 0; i < interactionEvents.length; i++) {
        container.removeEventListener(interactionEvents[i], schedule, listenerOptions);
      }
      document.removeEventListener('visibilitychange', schedule);
    }

    for (i = 0; i < interactionEvents.length; i++) {
      container.addEventListener(interactionEvents[i], schedule, listenerOptions);
    }
    // Do not advance while the tab is in the background; restart the full
    // countdown when it becomes visible again.
    document.addEventListener('visibilitychange', schedule);

    return {
      start: start,
      stop: stop,
      reset: schedule,
      destroy: destroy
    };
  }

  function createLinkHotspotElement(hotspot) {

    // Create wrapper element to hold icon and tooltip.
    var wrapper = document.createElement('div');
    wrapper.classList.add('hotspot');
    wrapper.classList.add('link-hotspot');

    // Create image element.
    var icon = document.createElement('img');
    icon.src = 'img/link.png';
    icon.classList.add('link-hotspot-icon');

    // Set rotation transform.
    var transformProperties = [ '-ms-transform', '-webkit-transform', 'transform' ];
    for (var i = 0; i < transformProperties.length; i++) {
      var property = transformProperties[i];
      icon.style[property] = 'rotate(' + hotspot.rotation + 'rad)';
    }

    // Add click event handler.
    wrapper.addEventListener('click', function() {
      switchScene(findSceneById(hotspot.target));
    });

    // Prevent touch and scroll events from reaching the parent element.
    // This prevents the view control logic from interfering with the hotspot.
    stopTouchAndScrollEventPropagation(wrapper);

    // Create tooltip element.
    var tooltip = document.createElement('div');
    tooltip.classList.add('hotspot-tooltip');
    tooltip.classList.add('link-hotspot-tooltip');
    tooltip.innerHTML = findSceneDataById(hotspot.target).name;

    wrapper.appendChild(icon);
    wrapper.appendChild(tooltip);

    return wrapper;
  }

  function createInfoHotspotElement(hotspot) {

    // Create wrapper element to hold icon and tooltip.
    var wrapper = document.createElement('div');
    wrapper.classList.add('hotspot');
    wrapper.classList.add('info-hotspot');

    // Create hotspot/tooltip header.
    var header = document.createElement('div');
    header.classList.add('info-hotspot-header');

    // Create image element.
    var iconWrapper = document.createElement('div');
    iconWrapper.classList.add('info-hotspot-icon-wrapper');
    var icon = document.createElement('img');
    icon.src = 'img/info.png';
    icon.classList.add('info-hotspot-icon');
    iconWrapper.appendChild(icon);

    // Create title element.
    var titleWrapper = document.createElement('div');
    titleWrapper.classList.add('info-hotspot-title-wrapper');
    var title = document.createElement('div');
    title.classList.add('info-hotspot-title');
    title.innerHTML = hotspot.title;
    titleWrapper.appendChild(title);

    // Create close element.
    var closeWrapper = document.createElement('div');
    closeWrapper.classList.add('info-hotspot-close-wrapper');
    var closeIcon = document.createElement('img');
    closeIcon.src = 'img/close.png';
    closeIcon.classList.add('info-hotspot-close-icon');
    closeWrapper.appendChild(closeIcon);

    // Construct header element.
    header.appendChild(iconWrapper);
    header.appendChild(titleWrapper);
    header.appendChild(closeWrapper);

    // Create text element.
    var text = document.createElement('div');
    text.classList.add('info-hotspot-text');
    text.innerHTML = hotspot.text;

    // Place header and text into wrapper element.
    wrapper.appendChild(header);
    wrapper.appendChild(text);

    // Create a modal for the hotspot content to appear on mobile mode.
    var modal = document.createElement('div');
    modal.innerHTML = wrapper.innerHTML;
    modal.classList.add('info-hotspot-modal');
    document.body.appendChild(modal);

    var toggle = function() {
      wrapper.classList.toggle('visible');
      modal.classList.toggle('visible');
    };

    // Show content when hotspot is clicked.
    wrapper.querySelector('.info-hotspot-header').addEventListener('click', toggle);

    // Hide content when close icon is clicked.
    modal.querySelector('.info-hotspot-close-wrapper').addEventListener('click', toggle);

    // Prevent touch and scroll events from reaching the parent element.
    // This prevents the view control logic from interfering with the hotspot.
    stopTouchAndScrollEventPropagation(wrapper);

    return wrapper;
  }

  // Prevent touch and scroll events from reaching the parent element.
  function stopTouchAndScrollEventPropagation(element, eventList) {
    var eventList = [ 'touchstart', 'touchmove', 'touchend', 'touchcancel',
                      'wheel', 'mousewheel' ];
    for (var i = 0; i < eventList.length; i++) {
      element.addEventListener(eventList[i], function(event) {
        event.stopPropagation();
      });
    }
  }

  function findSceneById(id) {
    for (var i = 0; i < scenes.length; i++) {
      if (scenes[i].data.id === id) {
        return scenes[i];
      }
    }
    return null;
  }

  function findSceneDataById(id) {
    for (var i = 0; i < data.scenes.length; i++) {
      if (data.scenes[i].id === id) {
        return data.scenes[i];
      }
    }
    return null;
  }

  // Display the initial scene.
  switchScene(scenes[0]);

  // The whole tour UI (pano, scene list, controls) lives directly in <body>,
  // so it is the component container for interaction tracking.
  var idleAutoplay = createIdleAutoplay(document.body, IDLE_AUTOPLAY_DELAY, switchToNextScene);
  if (shouldAutoplay()) {
    idleAutoplay.start();
  }

  // Cardboard VR mode: split screen (one half per lens) with the view driven
  // by the phone's motion sensors. Head movement emits no DOM interaction
  // events, so idle autoplay keeps advancing every IDLE_AUTOPLAY_DELAY while
  // the user looks around. A tap (or the Cardboard trigger) jumps ahead.

  // Vertical field of view per eye, close to a Cardboard lens.
  var VR_FOV = Math.PI / 2;
  var VR_GYRO_TIMEOUT = 2500;
  var VR_NOTICE_DURATION = 7000;
  var LEFT_EYE_RECT = { relativeWidth: 0.5, relativeX: 0 };
  var RIGHT_EYE_RECT = { relativeWidth: 0.5, relativeX: 0.5 };
  // Marzipano's roll has the same sign as the head roll computed below
  // (positive = head tilted clockwise, right ear down).
  var ROLL_SIGN = 1;
  var DEG = Math.PI / 180;

  var vrOrientation = null;
  var vrOrientationDirty = false;
  var vrNeedsCalibration = false;
  var vrYawOffset = 0;
  var vrFrame = null;
  var vrGyroTimer = null;
  var vrNoticeTimer = null;
  var vrWakeLock = null;
  var vrOwnsFullscreen = false;
  // Rotation (degrees) applied to the VR view when the page itself stays in
  // portrait, e.g. with the phone's rotation lock on. 0 when the browser
  // already lays the page out in landscape.
  var vrForcedAngle = 0;
  var vrLayoutWidth = 0;
  var vrLayoutHeight = 0;

  function rotX(t) {
    var c = Math.cos(t), s = Math.sin(t);
    return [1, 0, 0,  0, c, -s,  0, s, c];
  }

  function rotY(t) {
    var c = Math.cos(t), s = Math.sin(t);
    return [c, 0, s,  0, 1, 0,  -s, 0, c];
  }

  function rotZ(t) {
    var c = Math.cos(t), s = Math.sin(t);
    return [c, -s, 0,  s, c, 0,  0, 0, 1];
  }

  function multiply(a, b) {
    var r = [];
    for (var i = 0; i < 3; i++) {
      for (var j = 0; j < 3; j++) {
        r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
      }
    }
    return r;
  }

  // Converts a deviceorientation reading (degrees) into Marzipano view angles
  // for a camera looking out of the back of the screen. Earth frame: x east,
  // y north, z up; device rotation R = Rz(alpha)·Rx(beta)·Ry(gamma) (W3C),
  // then undo the screen rotation so landscape maps to the screen's axes.
  // Returns null when looking straight up or down (heading undefined).
  function orientationToView(alpha, beta, gamma, screenAngle) {
    var m = multiply(multiply(multiply(rotZ(alpha * DEG), rotX(beta * DEG)), rotY(gamma * DEG)), rotZ(-screenAngle * DEG));
    // Matrix columns are the screen's right, up and normal axes in earth space.
    var right = [m[0], m[3], m[6]];
    var forward = [-m[2], -m[5], -m[8]];
    var horizontal = Math.sqrt(forward[0] * forward[0] + forward[1] * forward[1]);
    if (horizontal < 1e-6) {
      return null;
    }
    // Right axis of an unrolled camera with the same heading.
    var levelRight = [forward[1] / horizontal, -forward[0] / horizontal, 0];
    var cross = [
      levelRight[1] * right[2] - levelRight[2] * right[1],
      levelRight[2] * right[0] - levelRight[0] * right[2],
      levelRight[0] * right[1] - levelRight[1] * right[0]
    ];
    var sinRoll = cross[0] * forward[0] + cross[1] * forward[1] + cross[2] * forward[2];
    var cosRoll = levelRight[0] * right[0] + levelRight[1] * right[1];
    return {
      // Compass heading: clockwise from north, like Marzipano's yaw.
      yaw: Math.atan2(forward[0], forward[1]),
      // Marzipano's positive pitch looks down.
      pitch: -Math.asin(Math.max(-1, Math.min(1, forward[2]))),
      roll: ROLL_SIGN * Math.atan2(sinRoll, cosRoll)
    };
  }

  function screenOrientationAngle() {
    if (window.screen && screen.orientation && typeof screen.orientation.angle === 'number') {
      return screen.orientation.angle;
    }
    if (typeof window.orientation === 'number') {
      return window.orientation;
    }
    return 0;
  }

  // Screen rotation the head-tracking math must assume: the forced rotation
  // when the VR view is drawn sideways, otherwise the browser's own.
  function vrScreenAngle() {
    return vrForcedAngle || screenOrientationAngle();
  }

  // Which way the phone is turned, from gravity: 90 when its top points left
  // (right edge up), -90 when its top points right. null while the phone is
  // closer to flat or upright, so the layout does not flicker.
  function landscapeSideFromSensor(reading) {
    var rightEdgeUp = -Math.cos(reading.beta * DEG) * Math.sin(reading.gamma * DEG);
    if (rightEdgeUp > 0.5) {
      return 90;
    }
    if (rightEdgeUp < -0.5) {
      return -90;
    }
    return null;
  }

  // The Cardboard split must run along the long side of the phone (one half
  // per eye). If the page stays in portrait while the phone is held sideways,
  // draw the view and overlay rotated a quarter turn so they fill the screen
  // in landscape anyway.
  function updateVrLayout() {
    var angle = 0;
    if (vrActive && window.innerHeight > window.innerWidth) {
      var side = vrOrientation ? landscapeSideFromSensor(vrOrientation) : null;
      angle = side !== null ? side : (vrForcedAngle || 90);
    }
    if (angle === vrForcedAngle && window.innerWidth === vrLayoutWidth &&
        window.innerHeight === vrLayoutHeight) {
      return;
    }
    vrForcedAngle = angle;
    vrLayoutWidth = window.innerWidth;
    vrLayoutHeight = window.innerHeight;

    [panoElement, vrOverlayElement].forEach(function(el) {
      var style = el.style;
      if (angle) {
        style.top = '50%';
        style.left = '50%';
        style.right = 'auto';
        style.bottom = 'auto';
        style.width = window.innerHeight + 'px';
        style.height = window.innerWidth + 'px';
        style.webkitTransform = 'translate(-50%, -50%) rotate(' + angle + 'deg)';
        style.transform = 'translate(-50%, -50%) rotate(' + angle + 'deg)';
      } else {
        style.top = style.left = style.right = style.bottom = '';
        style.width = style.height = '';
        style.webkitTransform = style.transform = '';
      }
    });
    // Marzipano only measures its container on window resize.
    viewer.updateSize();
    vrOrientationDirty = true;
  }

  function handleDeviceOrientation(event) {
    if (event.alpha == null && event.beta == null && event.gamma == null) {
      return;
    }
    if (!vrOrientation) {
      // First reading: the sensor works, so drop any pending sensor warning.
      clearTimeout(vrGyroTimer);
      vrGyroTimer = null;
      hideVrNotice();
    }
    vrOrientation = { alpha: event.alpha || 0, beta: event.beta || 0, gamma: event.gamma || 0 };
    vrOrientationDirty = true;
    updateVrLayout();
  }

  // Applies the latest sensor reading once per frame.
  function renderVrFrame() {
    vrFrame = requestAnimationFrame(renderVrFrame);
    if (!vrOrientationDirty || !vrOrientation) {
      return;
    }
    vrOrientationDirty = false;
    var head = orientationToView(vrOrientation.alpha, vrOrientation.beta,
                                 vrOrientation.gamma, vrScreenAngle());
    if (!head) {
      return;
    }
    if (vrNeedsCalibration) {
      vrYawOffset = currentScene.data.initialViewParameters.yaw - head.yaw;
      vrNeedsCalibration = false;
    }
    currentScene.view.setParameters({
      yaw: head.yaw + vrYawOffset,
      pitch: head.pitch,
      roll: head.roll,
      fov: VR_FOV
    });
  }

  // Render every scene twice, side by side. All layers of a scene share its
  // view, and the stage sizes the view to each layer's rect, so both halves
  // get the correct aspect ratio and move together.
  function setStereo(enabled) {
    scenes.forEach(function(s) {
      var mainLayer = s.scene.listLayers()[0];
      if (enabled) {
        mainLayer.mergeEffects({ rect: LEFT_EYE_RECT });
        s.rightEyeLayer = s.scene.createLayer({
          source: s.source,
          geometry: s.geometry,
          pinFirstLevel: true
        });
        s.rightEyeLayer.mergeEffects({ rect: RIGHT_EYE_RECT });
      } else {
        mainLayer.mergeEffects({ rect: null });
        if (s.rightEyeLayer) {
          s.scene.destroyLayer(s.rightEyeLayer);
          s.rightEyeLayer = null;
        }
      }
    });
  }

  // iOS 13+ only grants sensor access from a user gesture, after a prompt.
  function requestMotionPermission() {
    if (window.DeviceOrientationEvent &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      return DeviceOrientationEvent.requestPermission().then(function(state) {
        return state === 'granted';
      }, function() {
        return false;
      });
    }
    return Promise.resolve(true);
  }

  // Called directly instead of screenfull.request(), which leaves the
  // browser's rejection (e.g. no user gesture) unhandled.
  function requestFullscreen() {
    var el = document.documentElement;
    var request = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!request) {
      return false;
    }
    var result = request.call(el);
    if (result && typeof result.then === 'function') {
      result.then(null, function() {
        vrOwnsFullscreen = false;
      });
    }
    return true;
  }

  function lockLandscape() {
    if (window.screen && screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('landscape').catch(function() {});
    }
  }

  function unlockOrientation() {
    if (window.screen && screen.orientation && screen.orientation.unlock) {
      try {
        screen.orientation.unlock();
      } catch (e) {}
    }
  }

  // Keep the screen from dimming while the phone sits in the viewer.
  function acquireWakeLock() {
    if (!navigator.wakeLock || vrWakeLock) {
      return;
    }
    navigator.wakeLock.request('screen').then(function(lock) {
      vrWakeLock = lock;
      lock.addEventListener('release', function() {
        vrWakeLock = null;
      });
    }, function() {});
  }

  function releaseWakeLock() {
    if (vrWakeLock) {
      vrWakeLock.release().catch(function() {});
      vrWakeLock = null;
    }
  }

  function showVrNotice(text) {
    vrNoticeElement.textContent = text;
    vrNoticeElement.classList.add('visible');
    clearTimeout(vrNoticeTimer);
    vrNoticeTimer = setTimeout(hideVrNotice, VR_NOTICE_DURATION);
  }

  function hideVrNotice() {
    clearTimeout(vrNoticeTimer);
    vrNoticeTimer = null;
    vrNoticeElement.classList.remove('visible');
  }

  function enterVr() {
    if (vrActive) {
      return;
    }
    // Permission and fullscreen must both be requested synchronously inside
    // the tap handler; browsers refuse them outside a user gesture.
    var permission = requestMotionPermission();
    if (screenfull.enabled && !screenfull.isFullscreen) {
      vrOwnsFullscreen = requestFullscreen();
    }

    vrActive = true;
    document.body.classList.add('vr-active');
    vrOverlayElement.setAttribute('aria-hidden', 'false');
    stopAutorotate();
    controls.disable();
    setStereo(true);
    updateSceneName(currentScene);

    vrOrientation = null;
    vrNeedsCalibration = true;
    updateVrLayout();
    window.addEventListener('resize', updateVrLayout);
    window.addEventListener('deviceorientation', handleDeviceOrientation);
    vrFrame = requestAnimationFrame(renderVrFrame);
    acquireWakeLock();
    idleAutoplay.start();

    permission.then(function(granted) {
      if (!vrActive || vrOrientation) {
        return;
      }
      if (!granted) {
        showVrNotice('Sin permiso para el sensor de movimiento. Salí de VR, volvé a tocar "Ver en VR" y elegí "Permitir".');
      } else if (!window.isSecureContext) {
        showVrNotice('El giroscopio solo funciona si la página se abre con https://');
      } else {
        // No reading at all means the device has no usable motion sensor.
        vrGyroTimer = setTimeout(function() {
          vrGyroTimer = null;
          showVrNotice('No se detecta el giroscopio de este dispositivo. Abrí la página desde un celular.');
        }, VR_GYRO_TIMEOUT);
      }
    });
  }

  function exitVr() {
    if (!vrActive) {
      return;
    }
    vrActive = false;
    window.removeEventListener('resize', updateVrLayout);
    window.removeEventListener('deviceorientation', handleDeviceOrientation);
    cancelAnimationFrame(vrFrame);
    vrFrame = null;
    clearTimeout(vrGyroTimer);
    vrGyroTimer = null;
    hideVrNotice();
    releaseWakeLock();

    setStereo(false);
    updateVrLayout();
    document.body.classList.remove('vr-active');
    vrOverlayElement.setAttribute('aria-hidden', 'true');
    controls.enable();
    currentScene.view.setParameters({ roll: 0, fov: currentScene.data.initialViewParameters.fov });
    startAutorotate();
    if (!shouldAutoplay()) {
      idleAutoplay.stop();
    }

    unlockOrientation();
    if (vrOwnsFullscreen && screenfull.enabled && screenfull.isFullscreen) {
      screenfull.exit();
    }
    vrOwnsFullscreen = false;
  }

  function handleVrFullscreenChange() {
    if (!vrActive) {
      return;
    }
    if (screenfull.isFullscreen) {
      // Orientation lock is only allowed once the page is fullscreen.
      lockLandscape();
    } else if (vrOwnsFullscreen) {
      // The user left fullscreen (e.g. Android back gesture): leave VR too.
      vrOwnsFullscreen = false;
      exitVr();
    }
  }

  function handleVrVisibilityChange() {
    // The wake lock is dropped whenever the page is hidden.
    if (vrActive && !document.hidden) {
      acquireWakeLock();
    }
  }

  function handleVrOverlayClick(event) {
    if (event.target !== vrExitElement) {
      switchToNextScene();
    }
  }

  function destroyVr() {
    exitVr();
    vrToggleElement.removeEventListener('click', enterVr);
    vrExitElement.removeEventListener('click', exitVr);
    vrOverlayElement.removeEventListener('click', handleVrOverlayClick);
    document.removeEventListener('visibilitychange', handleVrVisibilityChange);
    if (screenfull.enabled) {
      screenfull.off('change', handleVrFullscreenChange);
    }
  }

  vrToggleElement.addEventListener('click', enterVr);
  vrExitElement.addEventListener('click', exitVr);
  vrOverlayElement.addEventListener('click', handleVrOverlayClick);
  document.addEventListener('visibilitychange', handleVrVisibilityChange);
  if (screenfull.enabled) {
    screenfull.on('change', handleVrFullscreenChange);
  }

  // Teardown. A page entering the back/forward cache only pauses so it can
  // resume on return; a real unload destroys timers and listeners.
  function handlePageHide(event) {
    if (event.persisted) {
      idleAutoplay.stop();
      return;
    }
    destroyVr();
    idleAutoplay.destroy();
    window.removeEventListener('pagehide', handlePageHide);
    window.removeEventListener('pageshow', handlePageShow);
  }

  function handlePageShow(event) {
    if (event.persisted && shouldAutoplay()) {
      idleAutoplay.start();
    }
  }

  window.addEventListener('pagehide', handlePageHide);
  window.addEventListener('pageshow', handlePageShow);

  // Exposed so a host page that embeds and removes the tour can tear it down.
  window.tourIdleAutoplay = idleAutoplay;
  window.tourVr = { enter: enterVr, exit: exitVr, destroy: destroyVr };

})();
