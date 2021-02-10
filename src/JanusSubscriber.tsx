/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-empty-function */
import {
  Logger,
  JanusSubscriberOptions,
  getTransceiver,
} from './janus-gateway-client';

export class JanusSubscriber extends EventTarget {
  id: string;
  room_id: string;
  handle_id: number;
  feed: string;
  ptype: 'subscriber';
  transaction: any;
  pc: RTCPeerConnection;
  stream: MediaStream;
  candidates: any[];
  configuration: any;
  volume: {
    value: any;
    timer: any;
  };
  bitrate: {
    value: any;
    bsnow: any;
    bsbefore: any;
    tsnow: any;
    tsbefore: any;
    timer: any;
  };
  joined: boolean;
  attached: boolean;
  iceConnectionState: any;
  iceGatheringState: any;
  signalingState: any;
  rtcConfiguration: any;
  logger: Logger;
  terminated: boolean;

  constructor(options: JanusSubscriberOptions) {
    super();

    const { transaction, room_id, feed, rtcConfiguration, logger } = options;

    this.id = feed;

    this.feed = feed;

    this.transaction = transaction;

    this.room_id = room_id;

    this.ptype = 'subscriber';

    this.attached = false;

    this.rtcConfiguration = rtcConfiguration;

    this.volume = {
      value: null,
      timer: null,
    };

    this.bitrate = {
      value: null,
      bsnow: null,
      bsbefore: null,
      tsnow: null,
      tsbefore: null,
      timer: null,
    };

    this.logger = logger;

    this.createPeerConnection(rtcConfiguration);
  }

  public initialize = async (options?: RTCOfferOptions): Promise<void> => {
    await this.attach();

    const { load } = await this.join();

    const { jsep } = load;

    const answer = await this.createAnswer(jsep, options);

    const started = await this.start(answer);

    return started;
  };

  public terminate = async () => {
    const event = new Event('terminated');

    this.terminated = true;

    this.dispatchEvent(event);

    if (this.pc) {
      this.pc.close();
    }

    if (this.attached) {
      await this.hangup();
      await this.detach();
    }
  };

  public createPeerConnection = (configuration?: RTCConfiguration) => {
    this.pc = new RTCPeerConnection(configuration);

    this.pc.onicecandidate = (event) => {
      if (!event.candidate) {
        this.sendTrickleCandidate({
          completed: true,
        });
      } else {
        const candidate = {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
        };

        this.sendTrickleCandidate(candidate);
      }
    };

    this.pc.ontrack = (event) => {
      if (!event.streams) {
        return;
      }

      const stream = event.streams[0];

      this.stream = stream;

      stream.onaddtrack = (_t) => {};

      stream.onremovetrack = (_t) => {};

      event.track.onended = (_e) => {
        this.logger.info('[subscriber] track onended');
      };

      event.track.onmute = (_e) => {};

      event.track.onunmute = (_e) => {};
    };

    this.pc.onnegotiationneeded = () => {
      this.iceConnectionState = this.pc.iceConnectionState;
    };

    this.pc.oniceconnectionstatechange = (_event) => {
      this.iceConnectionState = this.pc.iceConnectionState;

      if (this.pc.iceConnectionState === 'disconnected') {
        const event = new Event('disconnected');
        this.dispatchEvent(event);
      }

      this.logger.info(
        `oniceconnectionstatechange ${this.pc.iceConnectionState}`,
      );
    };

    this.pc.onicecandidateerror = (error) => {
      this.logger.error(error);
    };

    this.pc.onicegatheringstatechange = (_e) => {
      this.iceGatheringState = this.pc.iceGatheringState;

      this.logger.info(this.pc.iceGatheringState);
    };

    this.pc.onsignalingstatechange = (_e) => {
      this.signalingState = this.pc.signalingState;

      this.logger.info(`onsignalingstatechange ${this.pc.signalingState}`);
    };

    this.pc.onstatsended = (stats) => {
      this.logger.info(stats);
    };
  };

  private sendTrickleCandidate = (candidate) => {
    const request = {
      type: 'candidate',
      load: {
        room_id: this.room_id,
        handle_id: this.handle_id,
        candidate,
      },
    };

    return this.transaction(request);
  };

  public receiveTrickleCandidate = (candidate): void => {
    this.candidates.push(candidate);
  };

  public createAnswer = async (jsep, options?: RTCOfferOptions) => {
    await this.pc.setRemoteDescription(jsep);

    if (this.candidates) {
      this.candidates.forEach((candidate) => {
        if (candidate.completed || !candidate) {
          this.pc.addIceCandidate(null);
        } else {
          this.pc.addIceCandidate(candidate);
        }
      });
      this.candidates = [];
    }

    let vt = getTransceiver(this.pc, 'video');
    let at = getTransceiver(this.pc, 'audio');

    if (vt && at) {
      at.direction = 'recvonly';
      vt.direction = 'recvonly';
    } else {
      //TODO DOMException: Failed to execute 'addTransceiver' on 'RTCPeerConnection': The RTCPeerConnection's signalingState is 'closed'
      if (this.pc.signalingState === 'closed' && !this.terminated) {
        this.createPeerConnection(this.rtcConfiguration);
      }
      vt = this.pc.addTransceiver('video', { direction: 'recvonly' });
      at = this.pc.addTransceiver('audio', { direction: 'recvonly' });
    }

    const answer = await this.pc.createAnswer(options);

    this.pc.setLocalDescription(answer);

    return answer;
  };

  public attach = async () => {
    const request = {
      type: 'attach',
      load: {
        room_id: this.room_id,
      },
    };

    const result = await this.transaction(request);

    this.handle_id = result.load;

    this.attached = true;

    return result;
  };

  public join = () => {
    const request = {
      type: 'join',
      load: {
        room_id: this.room_id,
        handle_id: this.handle_id,
        ptype: 'subscriber',
        feed: this.feed,
      },
    };

    return this.transaction(request).then((response) => {
      this.joined = true;

      return response;
    });
  };

  public configure = async (data) => {
    const request: any = {
      type: 'configure',
      load: {
        room_id: this.room_id,
        handle_id: this.handle_id,
        ptype: this.ptype,
      },
    };

    if (data.jsep) {
      request.load.jsep = data.jsep;
    }

    if (data.audio !== undefined) {
      request.load.audio = data.audio;
    }

    if (data.video !== undefined) {
      request.load.video = data.video;
    }

    const configureResponse = await this.transaction(request);

    return configureResponse;
  };

  public start = (jsep) => {
    const request = {
      type: 'start',
      load: {
        room_id: this.room_id,
        handle_id: this.handle_id,
        answer: jsep,
      },
    };

    return this.transaction(request);
  };

  public hangup = async () => {
    const request = {
      type: 'hangup',
      load: {
        room_id: this.room_id,
        handle_id: this.handle_id,
      },
    };

    const result = await this.transaction(request);

    return result;
  };

  public detach = async () => {
    const request = {
      type: 'detach',
      load: {
        room_id: this.room_id,
        handle_id: this.handle_id,
      },
    };

    const result = await this.transaction(request);

    this.attached = false;

    this.handle_id = undefined;

    return result;
  };

  public leave = async () => {
    const request = {
      type: 'leave',
      load: {
        room_id: this.room_id,
      },
    };

    this.attached = false;

    const result = await this.transaction(request);

    return result;
  };
}
