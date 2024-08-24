/*
 Copyright 2016 Google Inc. All Rights Reserved.
 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

// Names of the two caches used in this version of the service worker.
// Change to v2, etc. when you update any of the local resources, which will
// in turn trigger the install event again.
const PRECACHE = 'precache-v3.1.1';
const RUNTIME = 'runtime';

// A list of local resources we always want to be cached.
const PRECACHE_URLS = [
  'index.html',
  './',
  // jsPsych files --------------------------------------------------
  'https://unpkg.com/jspsych@7.0.0/css/jspsych.css',
  'https://unpkg.com/jspsych@7.0.0',
  'https://unpkg.com/@jspsych/plugin-call-function@1.1.2',
  'https://unpkg.com/@jspsych/plugin-instructions@1.1.4',
  'https://fonts.gstatic.com/s/opensans/v40/memvYaGs126MiZpBA-UvWbX2vVnXBbObj2OVTS-mu0SC55I.woff2', // DELETE ???
  // local JS files -------------------------------------------------
  '../_static/js/audio.js',
  '../_static/js/csvToObj.js',
  '../_static/js/ex-m20-v3.js',
  '../_static/js/ex.js',
  '../_static/js/helpers.js',
  '../_static/js/madlib.js',
  '../_static/js/production.js',
  '../_static/js/responsive-production.js',
  '../_static/js/selection.js',
  // local CSS files ------------------------------------------------
  '../_static/css/ex-m20.css',
  '../_static/css/ex-remote-m2.css',
  '../_static/css/ex-remote.css',
  '../_static/css/ex-v2.css',
  '../_static/css/ex-v3.css',
  '../_static/css/ex.css',
  '../_static/css/style.css',
  // fonts ----------------------------------------------------------
  '../_static/fonts/Functions.eot',
  '../_static/fonts/Functions.svg',
  '../_static/fonts/Functions.ttf',
  '../_static/fonts/Functions.woff',
  '../_static/fonts/Functions.woff2',
  '../_static/fonts/Iconic-Postnom.eot',
  '../_static/fonts/Iconic-Postnom.svg',
  '../_static/fonts/Iconic-Postnom.ttf',
  '../_static/fonts/Iconic-Postnom.woff',
  '../_static/fonts/Iconic-Postnom.woff2',
  // lists ----------------------------------------------------------
  '../_static/lists/m20-v3.js',
  // images ---------------------------------------------------------
  '../_static/images/completion-page.png',
  '../_static/images/download-pink.png',
  '../_static/images/favicon.ico',
  '../_static/images/iOS-share.svg',
  '../_static/images/lock-silent.png',
  '../_static/images/reading-list-1.png',
  '../_static/images/reading-list-2.png',
  '../_static/images/reading-list-3.png',
  '../_static/images/reading-list-4.png',
  '../_static/images/reading-list-5.png',
  '../_static/images/ready.png',
  '../_static/images/sidebar.svg',
  '../_static/images/toolbar.png',
  '../_static/images/young_woman_yellow_shirt.jpg',
  // visual stimuli -------------------------------------------------
  '../_static/stimuli/m20/ball.png',
  '../_static/stimuli/m20/feather.png',
  '../_static/stimuli/m20/mug.png',
  '../_static/stimuli/m20/black-ball.png',
  '../_static/stimuli/m20/black-feather.png',
  '../_static/stimuli/m20/black-mug.png',
  '../_static/stimuli/m20/red-ball.png',
  '../_static/stimuli/m20/red-feather.png',
  '../_static/stimuli/m20/red-mug.png',
  '../_static/stimuli/m20/two-ball.png',
  '../_static/stimuli/m20/two-feather.png',
  '../_static/stimuli/m20/two-mug.png',
  '../_static/stimuli/m20/three-ball.png',
  '../_static/stimuli/m20/three-feather.png',
  '../_static/stimuli/m20/three-mug.png',
  '../_static/stimuli/m20/this-ball.png',
  '../_static/stimuli/m20/this-feather.png',
  '../_static/stimuli/m20/this-mug.png',
  '../_static/stimuli/m20/that-ball.png',
  '../_static/stimuli/m20/that-feather.png',
  '../_static/stimuli/m20/that-mug.png',
  '../_static/stimuli/m20/two-black-ball.png',
  '../_static/stimuli/m20/two-black-feather.png',
  '../_static/stimuli/m20/two-black-mug.png',
  '../_static/stimuli/m20/two-red-ball.png',
  '../_static/stimuli/m20/two-red-feather.png',
  '../_static/stimuli/m20/two-red-mug.png',
  '../_static/stimuli/m20/three-black-ball.png',
  '../_static/stimuli/m20/three-black-feather.png',
  '../_static/stimuli/m20/three-black-mug.png',
  '../_static/stimuli/m20/three-red-ball.png',
  '../_static/stimuli/m20/three-red-feather.png',
  '../_static/stimuli/m20/three-red-mug.png',
  '../_static/stimuli/m20/this-black-ball.png',
  '../_static/stimuli/m20/this-black-feather.png',
  '../_static/stimuli/m20/this-black-mug.png',
  '../_static/stimuli/m20/that-black-ball.png',
  '../_static/stimuli/m20/that-black-feather.png',
  '../_static/stimuli/m20/that-black-mug.png',
  '../_static/stimuli/m20/this-red-ball.png',
  '../_static/stimuli/m20/this-red-feather.png',
  '../_static/stimuli/m20/this-red-mug.png',
  '../_static/stimuli/m20/that-red-ball.png',
  '../_static/stimuli/m20/that-red-feather.png',
  '../_static/stimuli/m20/that-red-mug.png',
  '../_static/stimuli/m20/this-two-ball.png',
  '../_static/stimuli/m20/this-two-feather.png',
  '../_static/stimuli/m20/this-two-mug.png',
  '../_static/stimuli/m20/that-two-ball.png',
  '../_static/stimuli/m20/that-two-feather.png',
  '../_static/stimuli/m20/that-two-mug.png',
  '../_static/stimuli/m20/this-three-ball.png',
  '../_static/stimuli/m20/this-three-feather.png',
  '../_static/stimuli/m20/this-three-mug.png',
  '../_static/stimuli/m20/that-three-ball.png',
  '../_static/stimuli/m20/that-three-feather.png',
  '../_static/stimuli/m20/that-three-mug.png',
  '../_static/stimuli/m20/this-two-black-ball.png',
  '../_static/stimuli/m20/this-two-black-feather.png',
  '../_static/stimuli/m20/this-two-black-mug.png',
  '../_static/stimuli/m20/that-two-black-ball.png',
  '../_static/stimuli/m20/that-two-black-feather.png',
  '../_static/stimuli/m20/that-two-black-mug.png',
  '../_static/stimuli/m20/this-two-red-ball.png',
  '../_static/stimuli/m20/this-two-red-feather.png',
  '../_static/stimuli/m20/this-two-red-mug.png',
  '../_static/stimuli/m20/that-two-red-ball.png',
  '../_static/stimuli/m20/that-two-red-feather.png',
  '../_static/stimuli/m20/that-two-red-mug.png',
  '../_static/stimuli/m20/this-three-black-ball.png',
  '../_static/stimuli/m20/this-three-black-feather.png',
  '../_static/stimuli/m20/this-three-black-mug.png',
  '../_static/stimuli/m20/that-three-black-ball.png',
  '../_static/stimuli/m20/that-three-black-feather.png',
  '../_static/stimuli/m20/that-three-black-mug.png',
  '../_static/stimuli/m20/this-three-red-ball.png',
  '../_static/stimuli/m20/this-three-red-feather.png',
  '../_static/stimuli/m20/this-three-red-mug.png',
  '../_static/stimuli/m20/that-three-red-ball.png',
  '../_static/stimuli/m20/that-three-red-feather.png',
  '../_static/stimuli/m20/that-three-red-mug.png',
  // audio files ----------------------------------------------------
  '../_static/audio/m20-audio.js',
];

// The install handler takes care of precaching the resources we always need.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(PRECACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(self.skipWaiting())
  );
});

// The activate handler takes care of cleaning up old caches.
self.addEventListener('activate', event => {
  const currentCaches = [PRECACHE, RUNTIME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return cacheNames.filter(cacheName => !currentCaches.includes(cacheName));
    }).then(cachesToDelete => {
      return Promise.all(cachesToDelete.map(cacheToDelete => {
        return caches.delete(cacheToDelete);
      }));
    }).then(() => self.clients.claim())
  );
});

// The fetch handler serves responses for same-origin resources from a cache.
// If no response is found, it populates the runtime cache with the response
// from the network before returning it to the page.
self.addEventListener('fetch', event => {
  // Skip cross-origin requests, like those for Google Analytics.
  if (event.request.url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return caches.open(RUNTIME).then(cache => {
          return fetch(event.request).then(response => {
            // Put a copy of the response in the runtime cache.
            return cache.put(event.request, response.clone()).then(() => {
              return response;
            });
          });
        });
      })
    );
  }
});
