/*
 * Copyright (c) 2021-2023 Datalayer, Inc.
 *
 * MIT License
 */

import { ServiceManager } from '@jupyterlab/services';
import { createLiteServer } from '../lite';

export const createServiceManagerLite = (): Promise<ServiceManager.IManager> => {
  return createLiteServer().then(async liteServer => {
    return liteServer.serviceManager as unknown as ServiceManager.IManager;
  });
};
