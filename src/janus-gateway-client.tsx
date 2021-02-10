/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
// import '@babel/polyfill';
import { v1 as uuidv1 } from 'uuid';
import { JanusPublisher } from './JanusPublisher';
import { JanusSubscriber } from './JanusSubscriber';
interface Participant {
  id: string;
  audio_codec: string;
  video_codec: string;
  talking: boolean;
}

interface JanusOptions {
  server: string;
  onSubscriber: (subscriber: JanusSubscriber) => void;
  onPublisher: (publisher: JanusPublisher) => void;
  onError: (error: any) => void;
  WebSocket: any;
  subscriberRtcConfiguration: any;
  publisherRtcConfiguration: any;
  transactionTimeout: number;
  keepAliveInterval: number;
  user_id: string;
  socketOptions?;
  logger: {
    enable: () => void;
    disable: () => void;
    success: (...args: any[]) => void;
    info: (...args: any[]) => void;
    error: (error: any) => void;
    json: (...args: any[]) => void;
    tag: (
      tag: string,
      type: `success` | `info` | `error`,
    ) => (...args: any[]) => void;
  };
}

export interface JanusPublisherOptions {
  transaction: (request: any) => Promise<any>;
  onError: (error: any) => void;
  rtcConfiguration: any;
  mediaConstraints: MediaStreamConstraints;
  room_id: string;
  user_id: string;
  logger: Logger;
}

export interface JanusSubscriberOptions {
  transaction: (request: any) => Promise<any>;
  rtcConfiguration: any;
  room_id: string;
  feed: string;
  logger: Logger;
}

export interface Logger {
  enable: () => void;
  disable: () => void;
  success: (...args: any[]) => void;
  info: (...args: any[]) => void;
  error: (error: any) => void;
  json: (...args: any[]) => void;
  tag: (
    tag: string,
    type: `success` | `info` | `error`,
  ) => (...args: any[]) => void;
}

export const getTransceiver = (
  pc: RTCPeerConnection,
  kind: 'audio' | 'video',
): RTCRtpTransceiver => {
  let transceiver = null;

  const transceivers = pc.getTransceivers();

  if (transceivers && transceivers.length > 0) {
    for (const t of transceivers) {
      if (
        (t.sender && t.sender.track && t.sender.track.kind === kind) ||
        (t.receiver && t.receiver.track && t.receiver.track.kind === kind)
      ) {
        transceiver = t;
        break;
      }
    }
  }

  return transceiver as RTCRtpTransceiver;
};

class JanusClient {
  janus: any;
  server: string;
  room_id: string;
  ws: any;
  terminating: boolean;
  connected: boolean;
  initializing: boolean;
  publisher: JanusPublisher;
  subscribers: { [id: string]: JanusSubscriber };
  calls: { [id: string]: (message: any) => void };
  keepAlive: any;
  keepAliveInterval: number;
  transactionTimeout: number;
  socketOptions: any;
  onSubscriber: (subscriber: JanusSubscriber) => void;
  onPublisher: (publisher: JanusPublisher) => void;
  notifyConnected: (error?: any) => void;
  onError: (error: any) => void;
  subscriberRtcConfiguration: any;
  publisherRtcConfiguration: any;
  WebSocket: any;
  logger: any;
  user_id: string;

  constructor(options: JanusOptions) {
    const {
      onSubscriber,
      onPublisher,
      onError,
      WebSocket,
      logger,
      server,
      subscriberRtcConfiguration,
      publisherRtcConfiguration,
      transactionTimeout,
      keepAliveInterval,
      user_id,
      socketOptions,
    } = options;

    console.log('janus socket options', socketOptions);

    this.user_id = user_id;

    this.WebSocket = WebSocket;

    this.logger = logger;

    this.server = `${server}/?id=${user_id}`; //server;

    this.ws = null;

    this.initializing = false;

    this.connected = false;

    this.terminating = false;

    this.subscribers = {};

    this.calls = {};

    this.subscriberRtcConfiguration = subscriberRtcConfiguration;

    this.publisherRtcConfiguration = publisherRtcConfiguration;

    this.onError = onError;

    this.onPublisher = onPublisher;

    this.onSubscriber = onSubscriber;

    // this.janus = Janus.init({
    //   debug: true,
    //   dependencies: Janus.useDefaultDependencies(),
    //   callback: () => {
    //     console.log('Janus GW initiated');
    //   },
    // });

    //TODO ws.refresh()

    this.socketOptions = {
      WebSocket,
      connectionTimeout: 5000,
      maxRetries: 50,
      ...(socketOptions || {}),
    };

    this.transactionTimeout = transactionTimeout;

    this.keepAliveInterval = keepAliveInterval;

    this.logger.enable();
  }

  public initialize = (): Promise<void> => {
    if (this.terminating) {
      throw new Error('termination in progress...');
    }

    if (this.connected) {
      throw new Error('already initialized...');
    }

    if (this.initializing) {
      throw new Error('initialization in progress...');
    }

    this.logger.success(`initialize... ${this.server}`);

    this.initializing = true;

    this.ws = new this.WebSocket(this.server, [], this.socketOptions);

    this.ws.addEventListener('message', this.onMessage);

    this.ws.addEventListener('error', this.onError);

    return new Promise((resolve) => {
      this.notifyConnected = () => resolve();
    });
  };

  public terminate = async () => {
    if (!this.initializing && !this.connected) {
      throw new Error('already terminated...');
    }

    if (this.terminating) {
      throw new Error('termination in progress...');
    }

    this.terminating = true;

    await this.cleanup();

    this.logger.info(`terminate: remove event listeners...`);

    this.ws.removeEventListener('message', this.onMessage);

    this.ws.removeEventListener('close', this.onClose);

    this.ws.removeEventListener('error', this.onError);

    if (this.notifyConnected) {
      this.notifyConnected({
        cancel: true,
      });
      delete this.notifyConnected;
    }

    this.logger.info(`terminate: close connection...`);

    this.ws.close();

    this.onClose();

    this.ws = undefined;

    this.terminating = false;
  };

  public replaceVideoTrack = async (deviceId) => {
    try {
      const tracks = this.publisher.stream.getVideoTracks();

      const audioTracks = this.publisher.stream.getAudioTracks();

      for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
        await track.stop();
      }

      for (let j = 0; j < audioTracks.length; j++) {
        const track = audioTracks[j];
        await track.stop();
      }
    } catch (error) {
      this.onError(error);
    }

    const vt = getTransceiver(this.publisher.pc, 'video');

    const mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: {
        deviceId: {
          exact: deviceId,
        },
      },
    });

    this.publisher.stream = mediaStream;

    const t = mediaStream.getVideoTracks()[0];

    await vt.sender.replaceTrack(t);
  };

  private onClose = () => {
    this.logger.info(`connection closed...`);

    this.connected = false;

    this.initializing = false;

    clearInterval(this.keepAlive);

    this.keepAlive = undefined;
  };

  public join = async (
    room_id: string,
    mediaConstraints?: MediaStreamConstraints,
  ): Promise<void> => {
    this.room_id = room_id;

    if (this.publisher) {
      try {
        await this.publisher.terminate();
        this.publisher.transaction = (...args) => Promise.resolve();
        delete this.publisher;
      } catch (error) {}
    }

    this.publisher = new JanusPublisher({
      room_id: this.room_id,
      user_id: this.user_id,
      transaction: this.transaction,
      logger: this.logger,
      onError: this.onError,
      mediaConstraints,
      rtcConfiguration: this.publisherRtcConfiguration,
    });

    const publishers = await this.publisher.initialize();

    this.onPublisher(this.publisher);

    if (!publishers || !Array.isArray(publishers)) {
      const error = new Error(`could not retrieve participants info`);
      throw error;
    }

    this.onPublishers(publishers);
  };

  public leave = async () => {
    if (this.terminating) {
      throw new Error('termination in progress...');
    }

    await this.cleanup();
  };

  private cleanup = async () => {
    if (this.publisher) {
      this.logger.info(`terminate publisher ${this.publisher.handle_id}...`);
      try {
        await this.publisher.terminate();
        this.publisher.transaction = (...args) => Promise.resolve();
        delete this.publisher;
      } catch (error) {
        this.onError(error);
      }
    }

    for (const id in this.subscribers) {
      const subscriber = this.subscribers[id];
      const event = new Event('leaving');
      subscriber.dispatchEvent(event);
      this.logger.info(`terminate subscriber ${subscriber.handle_id}...`);
      try {
        await subscriber.terminate();
        subscriber.transaction = (...args) => Promise.resolve();
        delete this.subscribers[subscriber.feed];
      } catch (error) {
        this.onError(error);
      }
    }

    this.subscribers = {};
  };

  private onOpen = () => {
    this.logger.success(`connection established...`);

    this.initializing = false;

    this.connected = true;

    this.ws.removeEventListener('close', this.onClose);

    this.ws.addEventListener('close', this.onClose);

    if (this.notifyConnected) {
      this.notifyConnected();
      delete this.notifyConnected;
    }

    if (this.keepAlive) {
      clearInterval(this.keepAlive);
    }

    this.keepAlive = setInterval(() => {
      this.transaction({ type: 'keepalive' }).catch((error) => {
        this.onError(error);
      });
    }, this.keepAliveInterval);
  };

  private onMessage = (response: MessageEvent) => {
    if (response.data === 'connected') {
      this.onOpen();
      return;
    }

    let message = null;

    try {
      message = JSON.parse(response.data);
    } catch (error) {
      this.onError(error);
    }

    if (message) {
      const id = message.transaction;

      const isEvent = !id;

      if (isEvent) {
        this.onEvent(message);
      } else {
        const resolve = this.calls[id];
        if (resolve) {
          resolve(message);
        }
      }
    }
  };

  private onEvent = async (json) => {
    if (json.type === 'trickle') {
      this.onTrickle(json);
    } else if (json.type === 'publishers') {
      const publishers: Participant[] = json.data;

      if (!publishers || !Array.isArray(publishers)) {
        this.logger.json(json);
        const error = new Error(`onEvent - publishers incorrect format...`);
        this.onError(error);
        return;
      }

      this.onPublishers(publishers);
    } else if (json.type === 'media') {
      this.onMedia(json);
    } else if (json.type === 'leaving') {
      this.onLeaving(json);
    } else if (json.type === 'internal') {
      this.onInternal(json);
    }
  };

  private onTrickle = (json) => {
    const { sender, data } = json;

    if (!this.publisher) {
      const error = new Error(
        `onTrickle - publisher undefined for ${sender}...`,
      );
      this.onError(error);
      return;
    }

    if (!sender) {
      const error = new Error(`onTrickle - sender is undefined...`);
      this.onError(error);
      return;
    }

    if (this.publisher.handle_id == sender) {
      this.logger.success(
        `received trickle candidate for publisher ${sender}...`,
      );
      this.publisher.receiveTrickleCandidate(data);
    } else {
      for (const id in this.subscribers) {
        const subscriber = this.subscribers[id];

        if (subscriber.handle_id == sender) {
          this.logger.success(
            `received trickle candidate for subscriber ${sender}...`,
          );
          subscriber.receiveTrickleCandidate(data);
        }
      }
    }
  };

  private onPublishers = async (publishers: Participant[]): Promise<void> => {
    for (let i = 0; i < publishers.length; i++) {
      const publisher = publishers[i];

      const feed = publisher.id;

      if (this.subscribers[feed]) {
        this.logger.error(
          `onPublishers - subscriber ${feed} already attached for room ${this.room_id}`,
        );
        continue;
      }

      const subscriber = new JanusSubscriber({
        transaction: this.transaction,
        room_id: this.room_id,
        feed,
        logger: this.logger,
        rtcConfiguration: this.subscriberRtcConfiguration,
      });

      this.subscribers[feed] = subscriber;

      this.onSubscriber(subscriber);
    }
  };

  private onMedia = (json) => {
    const { sender, data } = json;

    if (!this.publisher) {
      const error = new Error(`onMedia - publisher undefined for ${sender}...`);
      this.onError(error);
      return;
    }

    if (!sender) {
      const error = new Error(`onMedia - sender is undefined...`);
      this.onError(error);
      return;
    }

    const event = new Event('media', data);

    if (this.publisher.handle_id == sender) {
      this.publisher.dispatchEvent(event);
    } else {
      for (const id in this.subscribers) {
        const subscriber = this.subscribers[id];
        if (subscriber.handle_id == sender) {
          subscriber.dispatchEvent(event);
        }
      }
    }
  };

  private onLeaving = async (json) => {
    if (!json.data) {
      this.logger.json(json);
      const error = new Error(`onLeaving - data is undefined...`);
      this.onError(error);
      return;
    }

    const { leaving } = json.data;

    if (!this.publisher) {
      const error = new Error(`onLeaving - publisher is undefined...`);
      this.onError(error);
      return;
    }

    if (!leaving) {
      const error = new Error(`onLeaving - leaving is undefined...`);
      this.onError(error);
      return;
    }

    const event = new Event('leaving');

    for (const id in this.subscribers) {
      const subscriber = this.subscribers[id];
      if (subscriber.feed == leaving) {
        delete this.subscribers[subscriber.feed];
        subscriber.transaction = (...args) => Promise.resolve();
        try {
          await subscriber.terminate();
        } catch (error) {
          this.onError(error);
        }
        subscriber.dispatchEvent(event);
      }
    }
  };

  private onInternal = (json) => {
    this.logger.json(json);

    if (this.publisher && this.publisher.handle_id == json.sender) {
    } else {
      for (const id in this.subscribers) {
        const subscriber = this.subscribers[id];
        if (subscriber && subscriber.handle_id == json.sender) {
        }
      }
    }
  };

  public mute = async () => {
    if (!this.publisher) {
      throw new Error('mute - publisher is undefined...');
    }

    return await this.publisher.configure({
      audio: false,
    });
  };

  public unmute = async () => {
    if (!this.publisher) {
      throw new Error('unmute - publisher is undefined...');
    }

    return await this.publisher.configure({
      audio: true,
    });
  };

  public pause = async () => {
    if (!this.publisher) {
      throw new Error('pause - publisher is undefined...');
    }

    return await this.publisher.configure({
      video: false,
    });
  };

  public resume = async () => {
    if (!this.publisher) {
      throw new Error('resume - publisher is undefined...');
    }

    return await this.publisher.configure({
      video: true,
    });
  };

  private transaction = async (request) => {
    this.logger.info(`transaction - ${JSON.stringify(request)}`);

    if (!this.connected) {
      const error = new Error(
        `client should be initialized before you can make transaction`,
      );
      throw error;
    }

    const id = uuidv1();

    request.transaction = id;

    let r = null;
    let p = null;

    try {
      r = JSON.stringify(request);
    } catch (error) {
      return Promise.reject(error);
    }

    p = new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        this.logger.info(`timeout called for ${id}`);
        delete this.calls[id];
        const error = new Error(`${request.type} - timeout`);
        navigator.serviceWorker.controller.postMessage({
          type: 'WS-TIMEOUT-KEEPALIVE',
        });
        reject(error);
      }, this.transactionTimeout);

      const f = (message) => {
        this.logger.info(
          `resolving transaction ${id} - ${message.transaction}`,
        );
        if (message.transaction === id) {
          clearTimeout(t);
          delete this.calls[id];
          if (message.type === 'error') {
            this.logger.error(request);
            const error = new Error(message.load);
            navigator.serviceWorker.controller.postMessage({
              type: 'WS-RESPONCE-ERROR',
              data: message.load,
            });
            reject(error);
          } else {
            resolve(message);
          }
        }
      };

      this.calls[id] = f;
    });

    this.logger.info(`WS send ${r}`);
    this.ws.send(r);

    return p;
  };

  public getRooms = () => this.transaction({ type: 'rooms' });

  public createRoom = (
    description: string,
    bitrate: number,
    bitrate_cap: boolean,
    videocodec: string,
    vp9_profile: string,
    permanent: boolean,
  ) => {
    return this.transaction({
      type: 'create_room',
      load: {
        description,
        bitrate,
        bitrate_cap,
        videocodec,
        vp9_profile,
        permanent,
      },
    });
  };

  public destroyRoom = (roomId) =>
    this.transaction({
      type: 'destroy_room',
      load: {
        roomId,
      },
    });
}

export { JanusClient, JanusPublisher, JanusSubscriber };
