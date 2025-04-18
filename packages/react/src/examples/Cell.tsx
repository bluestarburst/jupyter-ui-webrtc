/*
 * Copyright (c) 2021-2023 Datalayer, Inc.
 *
 * MIT License
 */

import { createRoot } from 'react-dom/client';
import { Box, Button, Label } from '@primer/react';
import { CodeCell } from '@jupyterlab/cells';
import { JupyterReactTheme } from '../theme';
import { JupyterContextProvider, useJupyter } from '../jupyter/JupyterContext';
import { Cell } from '../components/cell/Cell';
import { KernelIndicator } from '../components/kernel/Kernelndicator';
import { useKernelsStore } from '../jupyter/kernel/KernelState';
import { useCellsStore } from '../components/cell/CellState';
import { useWebRTC, WebRTCProvider } from '../jupyter/WebRTCContext';
import { useEffect } from 'react';

const CELL_ID = 'cell-example-1';

const DEFAULT_SOURCE = `from IPython.display import display

for i in range(10):
    display('I am a long string which is repeatedly added to the dom in separated divs: %d' % i)`;

const WebRTCCellExample = () => {
  return (
    <WebRTCProvider>
      <DefaultWebRTCConnection />
      <JupyterContextProvider>
        <CellExample />
      </JupyterContextProvider>
    </WebRTCProvider>
  );
};

const DefaultWebRTCConnection = () => {
  const webRTCContext = useWebRTC();

  useEffect(() => {
    const connectToServer = async () => {
      try {
        // Create a new WebRTC connection with STUN server
        const peerConnection = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
        });

        // Create data channel
        const dataChannel = peerConnection.createDataChannel("dataChannel");
        dataChannel.onopen = () => {
          console.log("Data channel opened");
          webRTCContext.connect(peerConnection, dataChannel);
        };
        dataChannel.onclose = () => {
          console.log("Data channel closed");
        };
        dataChannel.onerror = (error) => {
          console.error("Data channel error:", error);
        };

        // Set up event handlers
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            console.log("New ICE candidate:", event.candidate);
          }
        };

        peerConnection.onconnectionstatechange = () => {
          console.log("Connection state changed:", peerConnection.connectionState);
        };

        // Create and set local description
        await peerConnection.createOffer().then((offer) => {
          return peerConnection.setLocalDescription(offer);
        }).then(() => {
          return new Promise((resolve) => {
            if (peerConnection.iceGatheringState === 'complete') {
              resolve(undefined);
            } else {
              const checkState = () => {
                if (peerConnection.iceGatheringState === 'complete') {
                  peerConnection.removeEventListener('icegatheringstatechange', checkState);
                  resolve(undefined);
                }
              };
              peerConnection.addEventListener('icegatheringstatechange', checkState);
            }
          })
        }).then(async () => {
          const offer = peerConnection.localDescription!;
          // send offer to server
          const response = await fetch('http://localhost:8765/offer', {
            method: 'POST',
            body: JSON.stringify({ offer: offer.sdp }),
          });
          const answer = await response.json();
          const answerJSON = new RTCSessionDescription({
            type: "answer",
            sdp: answer.sdp
          });
          peerConnection.setRemoteDescription(answerJSON);

        }).catch((error) => {
          console.error("Failed to create offer", error);
        });


        return () => {
          peerConnection.close();
        };
      } catch (error) {
        console.error("Failed to establish WebRTC connection:", error);
      }
    };

    connectToServer();
  }, []);

  return (
    <div>
      <div>WebRTC Status: {webRTCContext.wsStatus}</div>
    </div>
  );
};

const CellExample = () => {
  const { defaultKernel } = useJupyter();
  const cellsStore = useCellsStore();
  const kernelsStore = useKernelsStore();
  const webRTCContext = useWebRTC();
  console.log(
    'Jupyter Cell Outputs',
    (
      cellsStore.getAdapter(CELL_ID)?.cell as CodeCell
    )?.outputArea.model.toJSON()
  );

  useEffect(() => {
    console.log("WebRTC Status", webRTCContext.wsStatus);
  }, [webRTCContext.wsStatus]);

  return (

    <JupyterReactTheme>
      <Box as="h1">A Jupyter Cell (WebRTC)</Box>
      <Box>Source: {cellsStore.getSource(CELL_ID)}</Box>
      <Box>Outputs Count: {cellsStore.getOutputsCount(CELL_ID)}</Box>
      <Box>
        Kernel State:{' '}
        <Label>
          {defaultKernel && kernelsStore.getExecutionState(defaultKernel.id)}
        </Label>
      </Box>
      <Box>
        Kernel Phase:{' '}
        <Label>
          {defaultKernel && kernelsStore.getExecutionPhase(defaultKernel.id)}
        </Label>
      </Box>
      <Box display="flex">
        <Box>Kernel Indicator:</Box>
        <Box ml={3}>
          <KernelIndicator kernel={defaultKernel && defaultKernel.connection} />
        </Box>
      </Box>
      <Box>
        <Button onClick={() => cellsStore.execute(CELL_ID)}>Run cell</Button>
      </Box>
      <Cell source={DEFAULT_SOURCE} id={CELL_ID} />
    </JupyterReactTheme>
  );
};

const div = document.createElement('div');
document.body.appendChild(div);
const root = createRoot(div);

root.render(<WebRTCCellExample />);
