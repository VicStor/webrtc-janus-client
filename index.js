import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { v1 as uuidv1 } from 'uuid';

import App from './src/App';

const params = new URLSearchParams(window.location.href);
let user_id = params.get(`user_id`);
if (!user_id) {
  user_id = uuidv1();
}

const serverPort = process.env.NODE_ENV === 'development' ? ':8080' : '';
const wsProtocol = process.env.NODE_ENV === 'development' ? 'ws' : 'wss';

const server = `${wsProtocol}://${window.location.hostname}${serverPort}`;

console.log('WS server: ', server);
const app = document.getElementById('application');

ReactDOM.render(<App server={server} user_id={user_id} />, app);
