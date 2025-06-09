/*
 * Copyright (c) 2021-2023 Datalayer, Inc.
 *
 * MIT License
 */

import { useEffect, useState, useMemo } from 'react';
import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import {
  ServiceManager,
  Kernel as JupyterKernel,
  Session,
} from '@jupyterlab/services';
import {
  getJupyterServerUrl,
  createLiteServiceManager,
  ensureJupyterAuth,
  createServerSettings,
  JupyterPropsType,
  DEFAULT_KERNEL_NAME,
} from '../jupyter';
import { ServiceManagerLess } from '../jupyter/services';
import { Kernel } from '../jupyter/kernel/Kernel';
import { IJupyterConfig, loadJupyterConfig } from '../jupyter/JupyterConfig';
import type { IDatalayerConfig } from './IDatalayerConfig';
import { cellsStore, CellsState } from '../components/cell/CellState';
import { consoleStore, ConsoleState } from '../components/console/ConsoleState';
import {
  notebookStore,
  NotebookState,
} from '../components/notebook/NotebookState';
import { outputsStore, OutputState } from '../components/output/OutputState';
import {
  terminalStore,
  TerminalState,
} from '../components/terminal/TerminalState';
import { useWebRTC, WebRTCStatus } from '../jupyter/WebRTCContext';


export type OnSessionConnection = (
  kernelConnection: Session.ISessionConnection | undefined
) => void;

export type KernelTransfer = {
  transfer: (to: JupyterKernel.IKernelConnection) => void;
};

export type JupyterReactState = {
  cellsStore: CellsState;
  consoleStore: ConsoleState;
  datalayerConfig?: IDatalayerConfig;
  jupyterConfig?: IJupyterConfig;
  kernel?: Kernel;
  kernelIsLoading: boolean;
  notebookStore: NotebookState;
  outputStore: OutputState;
  serviceManager?: ServiceManager.IManager;
  terminalStore: TerminalState;
  version: string;
  setDatalayerConfig: (configuration?: IDatalayerConfig) => void;
  setJupyterConfig: (configuration?: IJupyterConfig) => void;
  setKernel: (kernel?: Kernel) => void;
  setKernelIsLoading: (isLoading: boolean) => void;
  setServiceManager: (serviceManager?: ServiceManager.IManager) => void;
  setVersion: (version: string) => void;
};

let initialDatalayerConfig: IDatalayerConfig | undefined = undefined;

try {
  const pageConfig = document.getElementById('datalayer-config-data');
  if (pageConfig?.innerText) {
    initialDatalayerConfig = JSON.parse(pageConfig?.innerText);
  }
} catch (error) {
  console.debug('Issue with page configuration.', error);
}

export const jupyterReactStore = createStore<JupyterReactState>((set, get) => ({
  collaborative: false,
  datalayerConfig: initialDatalayerConfig,
  version: '',
  jupyterConfig: undefined,
  kernelIsLoading: true,
  kernel: undefined,
  serviceManager: undefined,
  serverSettings: undefined,
  cellsStore: cellsStore.getState(),
  consoleStore: consoleStore.getState(),
  notebookStore: notebookStore.getState(),
  outputStore: outputsStore.getState(),
  terminalStore: terminalStore.getState(),
  setDatalayerConfig: (datalayerConfig?: IDatalayerConfig) => {
    set(state => ({ datalayerConfig }));
  },
  setJupyterConfig: (jupyterConfig?: IJupyterConfig) => {
    set(state => ({ jupyterConfig }));
  },
  setKernel: (kernel?: Kernel) => {
    set(state => ({ kernel }));
  },
  setKernelIsLoading: (kernelIsLoading: boolean) => {
    set(state => ({ kernelIsLoading }));
  },
  setServiceManager: (serviceManager?: ServiceManager.IManager) => {
    set(state => ({ serviceManager }));
  },
  setVersion: version => {
    if (version && !get().version) {
      set(state => ({ version }));
    }
  },
}));

// TODO Reuse code portions from JupyterContext.
export function useJupyterReactStore(): JupyterReactState;

export function useJupyterReactStore<T>(
  selector: (state: JupyterReactState) => T
): T;
export function useJupyterReactStore<T>(
  selector?: (state: JupyterReactState) => T
) {
  return useStore(jupyterReactStore, selector!);
}

export function useJupyterReactStoreFromProps(
  props: JupyterPropsType
): JupyterReactState;
export function useJupyterReactStoreFromProps(
  props: JupyterPropsType
): JupyterReactState {
  const {
    defaultKernelName = DEFAULT_KERNEL_NAME,
    initCode = '',
    jupyterServerToken = props.serviceManager?.serverSettings.token ?? '',
    jupyterServerUrl = props.serviceManager?.serverSettings.baseUrl ?? '',
    lite = false,
    serverless,
    serviceManager: propsServiceManager,
    startDefaultKernel = false,
    terminals = false,
    useRunningKernelId = props.useRunningKernelId,
    useRunningKernelIndex = props.useRunningKernelIndex || -1,
  } = props;

  // Get WebRTC context if available (might not be available in all contexts)
  let webRTCContext: ReturnType<typeof useWebRTC> | null = null;
  let isWebRTCAvailable = false;
  try {
    webRTCContext = useWebRTC();
    isWebRTCAvailable = true;
  } catch {
    // Not in WebRTC context, proceed normally
    webRTCContext = null;
    isWebRTCAvailable = false;
  }



  const jupyterConfig = useMemo<IJupyterConfig>(() => {
    const config = loadJupyterConfig({
      lite,
      jupyterServerUrl,
      jupyterServerToken,
      terminals,
    });
    jupyterReactStore.getState().setJupyterConfig(config);
    return config;
  }, []);

  const [serviceManager, setServiceManager] = useState<
    ServiceManager.IManager | undefined
  >(propsServiceManager);
  const [_, setKernel] = useState<Kernel>();
  const [__, setIsLoading] = useState<boolean>(
    startDefaultKernel || useRunningKernelIndex > -1
  );
  
  // Track whether we should wait for WebRTC before initializing services
  const shouldWaitForWebRTC = isWebRTCAvailable && !serverless && !lite;
  const isWebRTCReady = !shouldWaitForWebRTC || (webRTCContext?.wsStatus === WebRTCStatus.CONNECTED);

  useEffect(() => {
    if (propsServiceManager) {
      console.log('Setting Service Manager from props', propsServiceManager);
      setServiceManager(propsServiceManager);
      jupyterReactStore.getState().setServiceManager(propsServiceManager);
    }
  }, [propsServiceManager]);

  // Reset service manager when WebRTC disconnects (if we're in a WebRTC context)
  useEffect(() => {
    if (shouldWaitForWebRTC && webRTCContext?.wsStatus === WebRTCStatus.DISCONNECTED && serviceManager) {
      console.log('WebRTC disconnected, resetting service manager for reconnection...');
      setServiceManager(undefined);
      jupyterReactStore.getState().setServiceManager(undefined);
      // Also reset kernel state
      setKernel(undefined);
      jupyterReactStore.getState().setKernel(undefined);
      setIsLoading(startDefaultKernel || useRunningKernelIndex > -1);
      jupyterReactStore.getState().setKernelIsLoading(startDefaultKernel || useRunningKernelIndex > -1);
    }
  }, [webRTCContext?.wsStatus, shouldWaitForWebRTC]);

  // Setup a Service Manager if needed - but wait for WebRTC if required.
  useEffect(() => {
    console.log('Service Manager Setup Effect:', {
      serverless,
      lite,
      hasServiceManager: !!serviceManager,
      startDefaultKernel,
      shouldWaitForWebRTC,
      isWebRTCReady,
      webRTCStatus: webRTCContext?.wsStatus || 'not available',
      jupyterServerUrl: jupyterConfig.jupyterServerUrl,
      jupyterServerToken: jupyterConfig.jupyterServerToken ? 'present' : 'missing'
    });

    // If we should wait for WebRTC and it's not ready yet, don't proceed
    if (shouldWaitForWebRTC && !isWebRTCReady) {
      console.log('Waiting for WebRTC connection before creating service manager...');
      return;
    }

    if (serverless) {
      console.log('Creating ServiceManagerLess (serverless mode)');
      const serviceManager = new ServiceManagerLess();
      setServiceManager(serviceManager);
      jupyterReactStore.getState().setServiceManager(serviceManager);
      return;
    }
    if (!serviceManager) {
      if (lite) {
        console.log('Creating Lite Service Manager');
        createLiteServiceManager(lite).then(serviceManager => {
          console.log('Lite Service Manager created:', serviceManager);
          setServiceManager(serviceManager);
          jupyterReactStore.getState().setServiceManager(serviceManager);
        });
        return;
      }
      console.log('Creating regular Service Manager with server settings');
      const serverSettings = createServerSettings(
        jupyterConfig.jupyterServerUrl,
        jupyterConfig.jupyterServerToken
      );
      ensureJupyterAuth(serverSettings).then(isAuth => {
        console.log('Authentication check result:', isAuth);
        if (!isAuth) {
          const loginUrl =
            getJupyterServerUrl() + '/login?next=' + window.location;
          console.warn(
            'You need to authenticate on the Jupyter Server URL',
            loginUrl
          );
          //          window.location.replace(loginUrl);
        }
        if (useRunningKernelId && useRunningKernelIndex > -1) {
          throw new Error(
            'You can not ask for useRunningKernelId and useRunningKernelIndex at the same time.'
          );
        }
        if (
          startDefaultKernel &&
          (useRunningKernelId || useRunningKernelIndex > -1)
        ) {
          throw new Error(
            'You can not ask for startDefaultKernel and (useRunningKernelId or useRunningKernelIndex) at the same time.'
          );
        }

        console.log('Creating ServiceManager with serverSettings:', serverSettings);
        const serviceManager = new ServiceManager({ serverSettings });
        console.log('ServiceManager created:', serviceManager);
        setServiceManager(serviceManager);
        jupyterReactStore.getState().setServiceManager(serviceManager);
      }).catch(error => {
        console.error('Error during service manager setup:', error);
      });
    } else {
      console.log('Service Manager already exists, skipping creation');
    }
  }, [lite, serverless, jupyterServerUrl, webRTCContext?.wsStatus]);

  // Setup a Kernel if needed - also wait for WebRTC if required.
  useEffect(() => {
    console.log(
      'Checking kernels for the new Service Manager:',
      serviceManager,
      'WebRTC ready:',
      isWebRTCReady
    );

    // Only proceed if WebRTC is ready (or not required)
    if (!isWebRTCReady) {
      console.log('Waiting for WebRTC before starting kernels...');
      return;
    }

    serviceManager?.kernels.ready.then(async () => {
      const kernelManager = serviceManager.kernels;
      console.log('Jupyter Kernel Manager is ready', kernelManager);
      if (useRunningKernelIndex > -1) {
        await serviceManager.sessions.refreshRunning();
        const runnings = Array.from(kernelManager.running());
        const model = runnings[useRunningKernelIndex];
        const existingKernel = new Kernel({
          kernelManager,
          kernelName: model.name,
          kernelSpecName: model.name,
          kernelModel: model,
          kernelspecsManager: serviceManager.kernelspecs,
          sessionManager: serviceManager.sessions,
        });

        // Setup WebRTC relay if available
        existingKernel.ready.then(() => {
          if (isWebRTCAvailable && webRTCContext?.wsStatus === WebRTCStatus.CONNECTED) {
            console.log('Setting up WebRTC relay for existing kernel...');
            (existingKernel.connection as any).setupWebRTCRelay?.();
          }
        });

        if (initCode) {
          try {
            await existingKernel.execute(initCode)?.done;
          } catch (error) {
            console.error('Failed to execute the initial code', error);
          }
        }
        setKernel(existingKernel);
        jupyterReactStore.getState().setKernel(existingKernel);
        setIsLoading(false);
        jupyterReactStore.getState().setKernelIsLoading(false);
      } else if (startDefaultKernel) {
        console.log('Starting a Jupyter Kernel:', defaultKernelName);
        const defaultKernel = new Kernel({
          kernelManager,
          kernelName: defaultKernelName,
          kernelSpecName: defaultKernelName,
          kernelspecsManager: serviceManager.kernelspecs,
          sessionManager: serviceManager.sessions,
        });
        defaultKernel.ready.then(async () => {
          // Setup WebRTC relay if available
          if (isWebRTCAvailable && webRTCContext?.wsStatus === WebRTCStatus.CONNECTED) {
            console.log('Setting up WebRTC relay for default kernel...');
            (defaultKernel.connection as any).setupWebRTCRelay?.();
          }

          if (initCode) {
            try {
              await defaultKernel.execute(initCode)?.done;
            } catch (error) {
              console.error('Failed to execute the initial code', error);
            }
          }
          console.log('Jupyter Kernel is ready', defaultKernel);
          setKernel(defaultKernel);
          jupyterReactStore.getState().setKernel(defaultKernel);
          setIsLoading(false);
          jupyterReactStore.getState().setKernelIsLoading(false);
        });
      }
    });
  }, [serviceManager, webRTCContext?.wsStatus]);

  return useStore(jupyterReactStore);
}

export default useJupyterReactStore;
