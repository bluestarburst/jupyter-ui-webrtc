// import { SessionContext } from '@jupyterlab/apputils';
// // import { WebRTCKernelConnection } from "./webrtc-kernel";
// // import { WidgetManager } from "../widgets/widget-manager";
// export class WebRTC {
//   private static instance: WebRTC;

//   private constructor() {}

//   peerConnection: RTCPeerConnection | undefined;
//   dataChannel: RTCDataChannel | undefined;
//   ipySessionContext: SessionContext | undefined;

//   static getInstance(): WebRTC {
//     if (!WebRTC.instance) {
//       WebRTC.instance = new WebRTC();
//     }
//     return WebRTC.instance;
//   }

//   actionListeners: { [key: string]: Set<(data: any) => void> } = {};

//   static addActionListener(action: string, callback: (data: any) => void) {
//     const instance = WebRTC.getInstance();
//     const set = instance.actionListeners[action] || new Set();
//     set.add(callback);
//     instance.actionListeners[action] = set;
//   }

//   static removeActionListener(action: string, callback: (data: any) => void) {
//     const instance = WebRTC.getInstance();
//     const set = instance.actionListeners[action];
//     if (set) {
//       set.delete(callback);
//     }
//   }

//   messageHandler(event: MessageEvent) {
//     const instance = WebRTC.getInstance();
//     const data = JSON.parse(event.data);
//     const set = instance.actionListeners[data.action];
//     if (set) {
//       set.forEach(callback => callback(data.data));
//     }
//   }

//   static async setDataChannel(dataChannel: RTCDataChannel) {
//     const instance = WebRTC.getInstance();
//     instance.dataChannel = dataChannel;
//     instance.dataChannel.onmessage = instance.messageHandler;
//   }

//   static setPeerConnection(peerConnection: RTCPeerConnection) {
//     const instance = WebRTC.getInstance();
//     instance.peerConnection = peerConnection;
//   }

//   static sendMessage(action: string, data: any) {
//     const instance = WebRTC.getInstance();
//     instance.dataChannel?.send(JSON.stringify({ action, ...data }));
//   }
// }
