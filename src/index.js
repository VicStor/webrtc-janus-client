import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { v1 as uuidv1 } from 'uuid';

import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import App from './app';

const params = new URLSearchParams(window.location.href);
let user_id = params.get(`user_id`);
if (!user_id) {
  user_id = uuidv1();
}

const serverPort = process.env.NODE_ENV === 'development' ? ':8080' : '';
const wsProtocol = process.env.NODE_ENV === 'development' ? 'ws' : 'wss';

const server = `${wsProtocol}://${window.location.hostname}${serverPort}`;

console.log('WS server: ', server);

ReactDOM.render(
  <App server={server} user_id={user_id} />,
  document.getElementById('root'),
);

serviceWorkerRegistration.registerSW();
