import React, { createContext, useContext, useEffect, useState } from 'react';
import { WebRTC } from '../custom/webrtc';

export enum WebRTCStatus {
  CONNECTED = "Connected",
  DISCONNECTED = "Disconnected",
  CONNECTING = "Connecting",
  DISCONNECTING = "Disconnecting",
}

interface WebRTCContextType {
  connect: (peerConnection: RTCPeerConnection, dataChannel: RTCDataChannel) => void;
  sendMessage: (action: string, data: unknown) => void;
  addActionListener: (action: string, callback: (data: unknown) => void) => void;
  removeActionListener: (action: string, callback: (data: unknown) => void) => void;
  wsStatus: WebRTCStatus;
  setWsStatus: (status: WebRTCStatus) => void;
}

const WebRTCContext = createContext<WebRTCContextType | undefined>(undefined);

export type WebRTCProviderProps = React.PropsWithChildren<{
  /**
   * The WebRTC connection.
   */
  connection?: RTCPeerConnection;
  wsUrl?: string;
}>;

export const WebRTCProvider: React.FC<WebRTCProviderProps> = ({ children, connection, wsUrl }) => {
  const [webrtcInstance] = useState(WebRTC.getInstance());
  const [wsStatus, setWsStatus] = useState<WebRTCStatus>(WebRTCStatus.DISCONNECTED);

  const connect = (peerConnection: RTCPeerConnection, dataChannel: RTCDataChannel): void => {
    WebRTC.setPeerConnection(peerConnection);
    WebRTC.setDataChannel(dataChannel);
    setWsStatus(WebRTCStatus.CONNECTING);
  };

  const sendMessage = (action: string, data: unknown): void => {
    WebRTC.sendMessage(action, data);
  };

  const addActionListener = (action: string, callback: (data: unknown) => void): void => {
    WebRTC.addActionListener(action, callback);
  };

  const removeActionListener = (action: string, callback: (data: unknown) => void): void => {
    WebRTC.removeActionListener(action, callback);
  };

  useEffect(() => {
    return () => {
      // Cleanup logic if needed
    };
  }, [webrtcInstance]);

  const value: WebRTCContextType = {
    connect,
    sendMessage,
    addActionListener,
    removeActionListener,
    wsStatus,
    setWsStatus,
  };
  
  return (
    <WebRTCContext.Provider value={value}>
      {children}
    </WebRTCContext.Provider>
  );
};

export const useWebRTC = (): WebRTCContextType => {
  const context = useContext(WebRTCContext);
  if (!context) {
    throw new Error('useWebRTC must be used within a WebRTCProvider');
  }
  return context;
}; 

export const DefaultWebRTCConnection = () => {
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