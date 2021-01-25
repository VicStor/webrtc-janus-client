const initVizio = () => {
  console.log('Initiate VIZIO lib');
  if (process.env.NODE_ENV !== 'production') {
    window.VIZIO = {
      dispatch: function (eventName) {
        document.dispatchEvent(new Event(eventName));
      },
      getDeviceId: function (cb) {
        console.log('VIZIO provide deviceId');
        cb('DEVICE_ID');
      },
    };
    window.VIZIO.dispatch('VIZIO_LIBRARY_DID_LOAD');

    return;
  }

  const vizioScript = document.createElement('script');
  document.body.appendChild(vizioScript);
  vizioScript.onload = () => {
    document.dispatchEvent(new Event('VIZIO_LIBRARY_DID_LOAD-----'));
  };
  vizioScript.onerror = () => {
    document.dispatchEvent(new Event('VIZIO_LIBRARY_LOAD_ERROR-----'));
  };
  vizioScript.src = 'http://localhost:12345/scfs/cl/js/vizio-companion-lib.js';
  console.log('vizioScript', vizioScript);
};

initVizio();
