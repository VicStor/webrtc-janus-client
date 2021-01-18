/* eslint-disable @typescript-eslint/no-empty-interface */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import ReconnectingWebSocket from 'reconnecting-websocket';
import { Component, Fragment } from 'react';
import { Subscription, from, Subject } from 'rxjs';
import { concatMap } from 'rxjs/operators';

import { JanusClient } from './janus-gateway-client';
import Video from './Video';

interface CustomStyles {
  video?: any;
  container?: any;
  videoContainer?: any;
  localVideo?: any;
  localVideoContainer?: any;
}

interface JanusVideoRoomProps {
  server: string;
  room: string;
  user_id: string;
  onRooms: (rooms: any[]) => void;
  onError: (error: any) => void;
  onConnected?: (publisher: any) => void;
  onDisconnected?: (error?: any) => void;
  onPublisherDisconnected?: (publisher: any) => void;
  onParticipantJoined?: (participant: any) => void;
  onParticipantLeft?: (participant: any) => void;
  renderContainer?: (children: any) => any;
  renderStream?: (subscriber: any) => any;
  renderLocalStream?: (publisher: any) => any;
  getCustomStyles?: (nParticipants: number) => CustomStyles;
  logger?: any;
  rtcConfiguration?: any;
  cameraId?: string;
  mediaConstraints?: any;
}

interface JanusVideoRoomState {
  styles: CustomStyles;
  nParticipants: number;
}

export class JanusVideoRoom extends Component<JanusVideoRoomProps, JanusVideoRoomState> {
  janus: any;
  client: any;
  logger: any;
  connected: boolean;
  defaultStyles: any;
  loggerEnabled: boolean;
  tasks: Subject<any>;
  subscription: Subscription;

  constructor(props) {
    super(props);

    this.loggerEnabled = true;

    let customStyles = {};

    if (this.props.getCustomStyles) {
      customStyles = this.props.getCustomStyles(0);
    }

    this.defaultStyles = {
      container: {
        height: `100%`,
        width: `100%`,
        position: `relative`,
      },
      video: {
        width: `100%`,
      },
      videoContainer: {
        width: `100%`,
        height: `100%`,
      },
      localVideo: {
        width: `200px`,
        height: `auto`,
      },
      localVideoContainer: {
        position: `absolute`,
        top: `50px`,
        right: `50px`,
      },
    };

    this.state = {
      styles: {
        ...this.defaultStyles,
        ...customStyles,
      },
      nParticipants: 0,
    };

    this.tasks = new Subject();

    this.logger = {
      enable: () => {
        this.loggerEnabled = true;
      },
      disable: () => {
        this.loggerEnabled = false;
      },
      success: (...args) => {
        if (this.loggerEnabled) {
          if (this.props.logger && this.props.logger.success) {
            this.props.logger.success(...args);
          } else {
            console.log(...args);
          }
        }
      },
      info: (...args) => {
        if (this.loggerEnabled) {
          if (this.props.logger && this.props.logger.info) {
            this.props.logger.info(...args);
          } else {
            console.log(...args);
          }
        }
      },
      error: (error: any) => {
        if (this.loggerEnabled) {
          if (this.props.logger && this.props.logger.error) {
            this.props.logger.error(error);
          } else {
            console.error(error);
          }
        }
      },
      json: (...args) => {
        if (this.loggerEnabled) {
          if (this.props.logger && this.props.logger.json) {
            this.props.logger.json(...args);
          } else {
            console.log(...args);
          }
        }
      },
      tag: (tag: string, type: `success` | `info` | `error`) => (...args) => {
        if (this.loggerEnabled) {
          console.log(tag, type, ...args);
        }
      },
    };
  }

  cleanup = () => {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = undefined;
    }

    return this.client
      .terminate()
      .then(() => {
        this.connected = false;

        if (this.props.onDisconnected) {
          this.props.onDisconnected();
        }
      })
      .catch((error) => {
        this.props.onError(error);
      });
  };

  componentDidMount() {
    const { server, user_id } = this.props;
    window.addEventListener('beforeunload', this.cleanup);
    const rtcConfiguration = this.props.rtcConfiguration || {
      iceServers: [
        {
          urls: 'stun:stun.voip.eutelia.it:3478',
        },
      ],
      sdpSemantics: 'unified-plan',
    };

    this.subscription = this.tasks
      .pipe(
        concatMap(({ type, load }) => {
          if (type === 'room') {
            return from(this.onChangeRoom(load));
          } else if (type === 'camera') {
            return from(this.onChangeCamera());
          }
        }),
      )
      .subscribe((d) => {
        this.logger.info('Subscribe ', d);
      });

    this.client = new JanusClient({
      onPublisher: this.onPublisher,
      onSubscriber: this.onSubscriber,
      onError: (error) => this.props.onError(error),
      user_id,
      server, //: `${server}/?id=${user_id}`,
      logger: this.logger,
      WebSocket: ReconnectingWebSocket,
      subscriberRtcConfiguration: rtcConfiguration,
      publisherRtcConfiguration: rtcConfiguration,
      transactionTimeout: 15000,
      keepAliveInterval: 10000,
    });

    this.client
      .initialize()
      .then(() => this.client.getRooms())
      .then(({ load }) => {
        this.props.onRooms(load);
        this.connected = true;
        this.onParticipantsAmountChange();
      })
      .catch((error) => {
        this.props.onError(error);
      });
  }

  componentDidUpdate(prevProps: JanusVideoRoomProps) {
    if (prevProps.room !== this.props.room) {
      this.tasks.next({
        type: 'room',
        load: prevProps.room,
      });
    }

    if (prevProps.cameraId !== this.props.cameraId) {
      this.tasks.next({
        type: 'camera',
      });
    }
  }

  onChangeCamera = async () => {
    if (
      !this.props.cameraId ||
      !this.client ||
      !this.client.publisher ||
      !this.client.publisher.pc ||
      !this.client.publisher.stream
    ) {
      return;
    }

    try {
      await this.client.replaceVideoTrack(this.props.cameraId);
    } catch (error) {
      this.props.onError(error);
    }

    this.forceUpdate();
  };

  onChangeRoom = async (prevRoom: string) => {
    const { mediaConstraints, onError, room: newRoom } = this.props;
    const leave = prevRoom && !newRoom;
    const join = !prevRoom && newRoom;
    const change = prevRoom && newRoom && prevRoom !== newRoom;

    if (leave || change) {
      try {
        await this.client.leave();
      } catch (error) {
        onError(error);
      }
    }

    if (change || join) {
      try {
        await this.client.join(newRoom, mediaConstraints);
      } catch (error) {
        onError(error);
      }
    }

    this.forceUpdate();
  };

  componentDidCatch(error, info) {
    this.props.onError(error);
    this.logger.info(info);
  }

  componentWillUnmount() {
    this.cleanup();
    window.removeEventListener('beforeunload', this.cleanup);
  }

  onPublisherTerminated = (publisher) => () => {
    if (this.props.onPublisherDisconnected) {
      this.props.onPublisherDisconnected(publisher);
    }
  };

  onPublisherDisconnected = (publisher) => () => {
    if (this.props.onPublisherDisconnected) {
      this.props.onPublisherDisconnected(publisher);
    }
  };

  onPublisher = async (publisher) => {
    publisher.addEventListener('terminated', this.onPublisherTerminated(publisher));
    publisher.addEventListener('disconnected', this.onPublisherDisconnected(publisher));
    if (this.props.onConnected) {
      this.props.onConnected(publisher);
    }

    this.forceUpdate();
  };

  onSubscriber = async (subscriber) => {
    try {
      await subscriber.initialize();
      subscriber.addEventListener('terminated', this.onSubscriberTerminated(subscriber));
      subscriber.addEventListener('leaving', this.onSubscriberLeaving(subscriber));
      subscriber.addEventListener('disconnected', this.onSubscriberDisconnected(subscriber));

      this.onParticipantsAmountChange(subscriber, this.props.onParticipantJoined);
    } catch (error) {
      this.props.onError(error);
    }
  };
  onSubscriberTerminated = (subscriber) => () => {
    this.onParticipantsAmountChange(subscriber, this.props.onParticipantLeft);
  };

  onSubscriberLeaving = (subscriber) => () => {
    this.onParticipantsAmountChange(subscriber, this.props.onParticipantLeft);
  };

  onSubscriberDisconnected = (subscriber) => () => {
    this.onParticipantsAmountChange(subscriber, this.props.onParticipantLeft);
  };

  renderVideo = (subscriber) => {
    if (this.props.renderStream) {
      return this.props.renderStream(subscriber);
    }

    return (
      <div key={`subscriber-${subscriber.id}`} style={this.state.styles.videoContainer}>
        <Video id={subscriber.id} muted={false} style={this.state.styles.video} stream={subscriber.stream} />
      </div>
    );
  };

  renderLocalVideo = () => {
    const publisher = this.client.publisher;

    if (!publisher) {
      return null;
    }

    if (this.props.renderLocalStream) {
      return this.props.renderLocalStream(publisher);
    }

    return (
      <div style={this.state.styles.localVideoContainer}>
        <Video id={publisher.id} muted={true} style={this.state.styles.localVideo} stream={publisher.stream} />
      </div>
    );
  };

  getSubscribers = () => {
    if (!this.client || !this.client.subscribers) return [];
    return Object.values(this.client.subscribers).filter((subscriber: any) => subscriber.ptype === 'subscriber');
  };

  renderContainer = () => {
    if (!this.client.subscribers) return null;

    const content = (
      <Fragment>
        {this.renderLocalVideo()}
        {this.getSubscribers().map(this.renderVideo)}
      </Fragment>
    );

    if (this.props.renderContainer) {
      return this.props.renderContainer(content);
    }

    return <div style={this.state.styles.container}>{content}</div>;
  };

  onParticipantsAmountChange = (subscriber?, cb?) => {
    const { getCustomStyles } = this.props;
    const subscribers = this.getSubscribers();

    if (cb) cb(subscriber);
    if (getCustomStyles) {
      const styles = getCustomStyles(subscribers.length);
      if (styles) {
        this.setState({
          styles: {
            ...this.defaultStyles,
            ...styles,
          },
          nParticipants: subscribers.length,
        });
      }
    }
  };

  render() {
    return this.client ? this.renderContainer() : null;
  }
}
