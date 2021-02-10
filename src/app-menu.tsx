/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/prop-types */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import * as React from 'react';
import { useEffect, useState } from 'react';
import Select from 'react-select';

import { appStyles } from './styles';

const AppMenu = ({
  cameras,
  selectedCamera,
  mics,
  selectedMicrophone,
  setCamera,
  setMic,
}) => {
  const [deviceId, setDeviceId] = useState(null);
  useEffect(() => {
    (window as any).VIZIO.getDeviceId(setDeviceId);
  }, []);
  return (
    <div style={appStyles.menuWrapper}>
      <div
        style={{
          padding: '10px',
        }}
      >
        <Select
          isDisabled={true}
          options={cameras}
          inputValue={selectedCamera.label}
          onChange={setCamera}
        />
      </div>
      <div
        style={{
          padding: '10px',
        }}
      >
        <Select
          isDisabled={true}
          options={mics}
          inputValue={selectedMicrophone.label}
          onChange={setMic}
        />
      </div>
      <div
        style={{
          padding: '10px',
          display: 'flex',
          flexFlow: 'row nowrap',
          color: '#ec1b1b',
          alignItems: 'center',
        }}
      >
        {`VIZIO device ID: ${deviceId}`}
      </div>
    </div>
  );
};

export default AppMenu;
