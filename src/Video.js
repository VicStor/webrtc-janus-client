/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import React, { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

const Video = ({ id, stream, ...props }) => {
  const videoRef = useRef();
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return <video {...props} id={`video-${id}`} autoPlay ref={videoRef} />;
};
Video.propTypes = {
  id: PropTypes.string,
  muted: PropTypes.bool,
  style: PropTypes.any,
  stream: PropTypes.any,
};
export default Video;
