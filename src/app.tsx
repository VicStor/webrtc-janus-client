/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import { Component } from 'react';
import Select from 'react-select';

import './assets/styles.css';
import { JanusVideoRoom } from './react-videoroom-janus';
import { logger } from './utils';
import { styles, appStyles } from './styles';

interface AppProps {
  server: string;
  user_id: string;
}

interface AppState {
  selectedRoom: any;
  cameras: any[];
  mics: any[];
  rooms: any[];
  selectedCamera: {
    deviceId: string;
    label: string;
  };
  selectedMicrophone: {
    deviceId: string;
    label: string;
  };
  cameraId: string;
}

export default class App extends Component<AppProps, AppState> {
  rtcConfiguration: any;

  constructor(props) {
    super(props);
    this.state = {
      selectedRoom: null,
      cameras: [],
      mics: [],
      rooms: [],
      cameraId: null,
      selectedCamera: null,
      selectedMicrophone: null,
    };

    this.rtcConfiguration = {
      iceServers: [
        {
          urls: 'stun:stun.voip.eutelia.it:3478',
        },
      ],
      sdpSemantics: 'unified-plan',
    };
  }

  componentDidMount() {
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) =>
        devices.reduce(
          (inputs, device) => {
            if (device.kind === 'videoinput') return { ...inputs, cams: [...inputs.cams, device] };
            if (device.kind === 'audioinput') return { ...inputs, mics: [...inputs.mics, device] };
            return inputs;
          },
          { cams: [], mics: [] },
        ),
      )
      .then(({ cams, mics }) => {
        const { deviceId: camDevId, label: camLabel } = cams[0];
        const { deviceId: micDevId, label: micLabel } = mics[0];
        this.setState({
          cameras: cams.map(({ deviceId, label }) => ({
            label,
            value: deviceId,
          })),
          mics: mics.map(({ deviceId, label }) => ({
            label,
            value: deviceId,
          })),
          selectedCamera: { deviceId: camDevId, label: camLabel },
          selectedMicrophone: { deviceId: micDevId, label: micLabel },
        });
      });
  }

  getCustomStyles = (nParticipants) => {
    const key = String(nParticipants);
    const s = styles[key];
    return s || {};
  };

  onPublisherDisconnected = (publisher: any) => {
    logger.info('onPublisherDisconnected', publisher);
  };

  onConnected = (publisher: any) => {
    logger.info('onConnected', publisher);
  };

  onDisconnected = (error) => {
    logger.info('onDisconnected', error);
  };

  onRooms = (rooms: any) => {
    logger.info('onRooms', rooms);
    this.setState({
      rooms,
    });
  };

  onError = (error: any) => {
    logger.info('onError', error);
  };

  onParticipantJoined = (participant: any) => {
    logger.info('onParticipantJoined', participant);
  };

  onParticipantLeft = (participant: any) => {
    logger.info('onParticipantLeft', participant);
  };

  renderRooms() {
    if (this.state.rooms.length === 0) return <div>Fetching rooms...</div>;
    return this.state.rooms.map((room) => (
      <div
        className="room"
        id={`room-${room.room_id}`}
        key={`room-${room.room_id}`}
        style={appStyles.roomButton}
        onClick={() => {
          console.log('--------------------------------------- Join the room');
          this.setState({
            selectedRoom: room.room_id,
          });
        }}
      >
        {`codec: ${room.videocodec} bitrate: ${room.bitrate}`}
        {/* ({room.instance_id}) */}
      </div>
    ));
  }

  render() {
    if (this.state.cameras.length === 0) return null;
    return (
      <div style={appStyles.mainWrapper as React.CSSProperties}>
        <div style={appStyles.menuWrapper}>
          <div
            style={{
              padding: `10px`,
            }}
          >
            <Select
              isDisabled={true}
              options={this.state.cameras}
              inputValue={this.state.selectedCamera.label}
              onChange={(selectedCamera) => {
                this.setState({
                  selectedCamera,
                });
              }}
            />
          </div>
          <div
            style={{
              padding: `10px`,
            }}
          >
            <Select
              isDisabled={true}
              options={this.state.mics}
              inputValue={this.state.selectedMicrophone.label}
              onChange={(selectedMicrophone) => {
                this.setState({
                  selectedMicrophone,
                });
              }}
            />
          </div>
        </div>
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexFlow: 'row nowrap',
            flex: 'auto',
          }}
        >
          <div style={appStyles.screensWrapper as React.CSSProperties}>
            <JanusVideoRoom
              logger={logger}
              server={this.props.server}
              room={this.state.selectedRoom}
              onPublisherDisconnected={this.onPublisherDisconnected}
              rtcConfiguration={this.rtcConfiguration}
              cameraId={this.state.selectedCamera.deviceId}
              user_id={this.props.user_id}
              onConnected={this.onConnected}
              onDisconnected={this.onDisconnected}
              onRooms={this.onRooms}
              onError={this.onError}
              onParticipantJoined={this.onParticipantJoined}
              onParticipantLeft={this.onParticipantLeft}
              mediaConstraints={{
                video: true,
                audio: true,
              }}
              getCustomStyles={this.getCustomStyles}
            />
          </div>
          <div style={appStyles.roomWrapper as React.CSSProperties}>
            <div
              style={{
                marginBottom: `30px`,
              }}
            >
              {this.renderRooms()}
            </div>
          </div>
        </div>
      </div>
    );
  }
}
