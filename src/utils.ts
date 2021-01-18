/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Consola, BrowserReporter } from 'consola';
import * as moment from 'moment';

const enabled = true;
const log: any = new Consola({
  level: 3,
  reporters: [new BrowserReporter()],
});
const getDatePrefix = () => {
  const date = moment().format('H:mm:ss:SSS');
  return date;
};

export const logger = {
  success: (...args) => {
    if (enabled) {
      log.success(getDatePrefix(), ...args);
    }
  },
  info: (...args) => {
    if (enabled) {
      log.info(getDatePrefix(), ...args);
    }
  },
  error: (error: any) => {
    if (enabled) {
      log.error(error);
    }
  },
  json: (...args) => {
    if (enabled) {
      log.info(`JSON`, getDatePrefix(), ...args);
    }
  },
};
