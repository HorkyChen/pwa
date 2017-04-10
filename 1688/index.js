window.addEventListener('load', function() {
        navigator.serviceWorker.register('serviceworker.js', {
        scope: './'
        }).then(function(registration) {
        console.log('registration successfully!', registration);
      }).catch(function(error) {
        console.log('registration failed!', registration);
      });
    });