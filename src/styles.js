export const appStyles = {
  mainWrapper: {
    position: 'fixed',
    top: 0,
    left: 0,
    height: '100vh',
    width: '100vw',
    display: 'flex',
    flexFlow: 'column nowrap',
  },
  menuWrapper: {
    width: '100%',
    height: '60px',
    display: 'flex',
    flexFlow: 'row nowrap',
    flex: 'none',
    backgroundColor: '#ddd',
  },
  screensWrapper: {
    flex: 'auto',
    overflowX: 'hidden',
    overflowY: 'auto',
  },
  roomWrapper: {
    width: '400px',
    display: 'flex',
    flexDirection: 'column',
    overflowX: 'hidden',
    overflowY: 'auto',
  },
  roomButton: {
    margin: '10px',
    background: 'white',
    padding: '20px',
    boxShadow: '0px 0px 3px 3px rgba(0,0,0,0.1)',
    cursor: 'pointer',
  },
};
export const styles = {
  0: {
    container: {
      height: '100%',
      width: '100%',
      position: 'relative',
    },
    localVideo: {
      width: '200px',
      height: 'auto',
    },
    localVideoContainer: {
      position: 'absolute',
      top: '50px',
      right: '50px',
    },
  },
  1: {
    container: {
      height: '100%',
      width: '100%',
      position: 'relative',
    },
    video: {
      width: '100%',
    },
    videoContainer: {
      width: '100%',
      height: '100%',
    },
    localVideo: {
      width: '200px',
      height: 'auto',
    },
    localVideoContainer: {
      position: 'absolute',
      top: '50px',
      right: '50px',
    },
  },
  2: {
    container: {
      height: '100%',
      width: '100%',
      display: 'flex',
      position: 'relative',
    },
    video: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
    },
    videoContainer: {
      width: '100%',
      height: '100%',
    },
    localVideo: {
      width: '200px',
      height: 'auto',
    },
    localVideoContainer: {
      position: 'absolute',
      right: 'calc(50% - 100px)',
    },
  },
  3: {
    container: {
      display: 'grid',
      gridTemplateColumns: '50% 50%',
    },
    video: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
    },
    localVideo: {
      height: '100%',
    },
    localVideoContainer: {},
  },
  4: {
    container: {
      display: 'grid',
      gridTemplateColumns: '50% 50%',
      gridTemplateRows: '50% 50%',
      height: '100%',
    },
    video: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
    },
    localVideo: {
      height: '100%',
    },
    localVideoContainer: {
      position: 'absolute',
      top: 'calc(50% - 80px)',
      left: 'calc(50% + 70px)',
      borderRadius: '200px',
      overflow: 'hidden',
      width: '160px',
      height: '160px',
    },
  },
  5: {
    container: {
      display: 'grid',
      gridTemplateColumns: '33.3% 33.3% 33.3%',
      gridTemplateRows: '50% 50%',
      height: '100%',
    },
    video: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
    },
    localVideo: {
      height: '100%',
    },
    localVideoContainer: {},
  },
};
