/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Logger,
  JanusPublisherOptions,
  getTransceiver,
} from './janus-gateway-client';

export class JanusPublisher extends EventTarget {
  id: string;
  room_id: string;
  handle_id: number;
  ptype: 'publisher';
  transaction: (request: any) => Promise<any>;
  pc: RTCPeerConnection;
  stream: MediaStream;
  candidates: any[];
  publishing: boolean;
  attached: boolean;
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
  iceConnectionState: any;
  iceGatheringState: any;
  signalingState: any;
  rtcConfiguration: any;
  mediaConstraints: any;
  logger: Logger;
  onError: any;
  terminated: boolean;

  constructor(options: JanusPublisherOptions) {
    super();

    const {
      transaction,
      room_id,
      user_id,
      rtcConfiguration,
      mediaConstraints,
      logger,
      onError,
    } = options;

    this.ptype = 'publisher';

    this.rtcConfiguration = rtcConfiguration;

    this.mediaConstraints = mediaConstraints;

    this.id = user_id;

    this.transaction = transaction;

    this.room_id = room_id;

    this.onError = onError;

    this.publishing = false;

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

    this.handle_id = null;

    this.createPeerConnection(this.rtcConfiguration);
  }

  private suspendStream = async () => {
    const tracks = this.stream.getTracks();
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      await track.stop();
    }
    this.stream = undefined;
  };

  public initialize = async () => {
    await this.attach();

    let jsep = null;

    try {
      jsep = await this.createOffer(this.mediaConstraints);
    } catch (error) {
      if (this.stream && this.terminated) {
        await this.suspendStream();
        throw new Error('client terminated');
      } else {
        throw error;
      }
    }

    const response = await this.joinandconfigure(jsep);

    return response.load.data.publishers;
  };

  public terminate = async () => {
    this.terminated = true;

    const event = new Event('terminated');

    if (this.pc) {
      this.pc.close();
    }

    if (this.stream) {
      const tracks = this.stream.getTracks();
      for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
        await track.stop();
      }
    }

    this.dispatchEvent(event);

    if (this.publishing) {
      try {
        await this.unpublish();
      } catch (error) {
        this.onError(error);
      }
    }

    if (this.attached) {
      try {
        await this.hangup();
      } catch (error) {
        this.onError(error);
      }

      try {
        await this.detach();
      } catch (error) {
        this.onError(error);
      }
    }
  };

  public renegotiate = async ({ audio, video, mediaConstraints }) => {
    let jsep = null;

    try {
      jsep = await this.createOffer(mediaConstraints || this.mediaConstraints);
    } catch (error) {
      if (this.stream && this.terminated) {
        await this.suspendStream();
        throw new Error('client terminated');
      } else {
        throw error;
      }
    }

    this.logger.json(jsep);

    const configured = await this.configure({
      jsep,
      audio,
      video,
    });

    this.logger.json(configured);

    return configured;
  };

  private createPeerConnection = (configuration?: RTCConfiguration) => {
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

    this.pc.oniceconnectionstatechange = (_e) => {
      this.iceConnectionState = this.pc.iceConnectionState;

      if (this.pc.iceConnectionState === 'disconnected') {
        const event = new Event('disconnected');
        this.dispatchEvent(event);
      }

      this.logger.info(
        `[${this.ptype}] oniceconnectionstatechange ${this.pc.iceConnectionState}`,
      );
    };

    this.pc.onnegotiationneeded = () => {
      this.logger.info(
        `[${this.ptype}] onnegotiationneeded ${this.pc.signalingState}`,
      );
    };

    this.pc.onicegatheringstatechange = (_e) => {
      this.iceGatheringState = this.pc.iceGatheringState;

      this.logger.info(
        `[${this.ptype}] onicegatheringstatechange ${this.pc.iceGatheringState}`,
      );
    };

    this.pc.onsignalingstatechange = (_e) => {
      this.signalingState = this.pc.signalingState;

      this.logger.info(
        `[${this.ptype}] onicegatheringstatechange ${this.pc.signalingState}`,
      );

      if (this.pc.signalingState === 'closed' && !this.terminated) {
        this.renegotiate({
          audio: true,
          video: true,
          mediaConstraints: this.mediaConstraints,
        })
          .then((reconfigured) => this.logger.json(reconfigured))
          .catch((error) => this.logger.error(error));
      }
    };

    this.pc.onicecandidateerror = (error) => {
      this.logger.error(error);
    };

    this.pc.onstatsended = (stats) => {
      this.logger.json(stats);
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

  public createOffer = async (mediaConstraints: MediaStreamConstraints) => {
    const media = mediaConstraints || {
      audio: true,
      video: true,
    };

    //why - send encoding crashes puppeteer ???
    const videoOptions: RTCRtpTransceiverInit = {
      direction: 'sendonly',
    };

    const audioOptions: RTCRtpTransceiverInit = {
      direction: 'sendonly',
    };

    const stream: MediaStream = await navigator.mediaDevices.getUserMedia(
      media,
    );

    this.stream = stream;

    const tracks = stream.getTracks();

    const videoTrack = tracks.find((t) => t.kind === 'video');

    const audioTrack = tracks.find((t) => t.kind === 'audio');

    let vt = getTransceiver(this.pc, 'video');

    let at = getTransceiver(this.pc, 'audio');

    if (vt && at) {
      vt.direction = 'sendonly';
      at.direction = 'sendonly';
    } else {
      //TODO DOMException: Failed to execute 'addTransceiver' on 'RTCPeerConnection': The RTCPeerConnection's signalingState is 'closed'
      if (this.pc.signalingState === 'closed' && !this.terminated) {
        this.createPeerConnection(this.rtcConfiguration);
      }
      vt = this.pc.addTransceiver('video', videoOptions);
      at = this.pc.addTransceiver('audio', audioOptions);
    }

    await vt.sender.replaceTrack(videoTrack);

    await at.sender.replaceTrack(audioTrack);

    const offer = await this.pc.createOffer({});

    this.pc.setLocalDescription(offer);

    return offer;
  };

  public attach = async () => {
    const request = {
      type: 'attach',
      load: {
        room_id: this.room_id,
      },
    };

    const result = await this.transaction(request);

    //TODO result undefined due to connection already terminated
    this.handle_id = result.load;

    this.attached = true;

    return result;
  };

  public join = () => {
    const request = {
      type: 'join',
      load: {
        id: this.id,
        room_id: this.room_id,
        handle_id: this.handle_id,
        ptype: this.ptype,
      },
    };

    return this.transaction(request);
  };

  public leave = async () => {
    const request = {
      type: 'leave',
      load: {
        room_id: this.room_id,
      },
    };

    this.publishing = false;

    const result = await this.transaction(request);

    return result;
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

    if (configureResponse.load.jsep) {
      await this.pc.setRemoteDescription(configureResponse.load.jsep);
    }

    if (this.candidates) {
      this.candidates.forEach((candidate) => {
        if (!candidate || candidate.completed) {
          this.pc.addIceCandidate(null);
        } else {
          this.pc.addIceCandidate(candidate);
        }
      });
      this.candidates = [];
    }

    this.publishing = true;

    return configureResponse;
  };

  public publish = async ({ jsep }) => {
    const request = {
      type: 'publish',
      load: {
        room_id: this.room_id,
        jsep,
      },
    };

    const response = await this.transaction(request);

    await this.pc.setRemoteDescription(response.load.jsep);

    if (this.candidates) {
      this.candidates.forEach((candidate) => {
        if (!candidate || candidate.completed) {
          this.pc.addIceCandidate(null);
        } else {
          this.pc.addIceCandidate(candidate);
        }
      });
      this.candidates = [];
    }

    this.publishing = true;
  };

  public joinandconfigure = async (jsep) => {
    const request = {
      type: 'joinandconfigure',
      load: {
        id: this.id,
        room_id: this.room_id,
        handle_id: this.handle_id,
        ptype: this.ptype,
        jsep,
      },
    };

    const configureResponse = await this.transaction(request);

    await this.pc.setRemoteDescription(configureResponse.load.jsep);

    if (this.candidates) {
      this.candidates.forEach((candidate) => {
        if (!candidate || candidate.completed) {
          this.pc.addIceCandidate(null);
        } else {
          this.pc.addIceCandidate(candidate);
        }
      });
      this.candidates = [];
    }

    this.publishing = true;

    return configureResponse;
  };

  public unpublish = async () => {
    const request = {
      type: 'unpublish',
      load: {
        room_id: this.room_id,
        handle_id: this.handle_id,
      },
    };

    const result = await this.transaction(request);

    this.publishing = false;

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

    this.publishing = false;

    this.attached = false;

    return result;
  };

  public hangup = async () => {
    const request = {
      type: 'hangup',
      load: {
        room_id: this.room_id,
        handle_id: this.handle_id,
      },
    };

    this.publishing = false;

    const result = await this.transaction(request);

    return result;
  };
}
