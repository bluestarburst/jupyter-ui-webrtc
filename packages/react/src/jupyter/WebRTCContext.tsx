import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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

interface WebRTCProviderProps {
  children: ReactNode;
}

export const WebRTCProvider: React.FC<WebRTCProviderProps> = ({ children }) => {
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