/*
 * Copyright (c) 2021-2023 Datalayer, Inc.
 *
 * MIT License
 */

import { URLExt } from '@jupyterlab/coreutils';
import { ServerConnection } from '@jupyterlab/services';
import JupyterAuthError from './JupyterAuthError';
import { WebRTCServerConnection } from '../custom/services/webrtc-serverconnection';

/**
 * Call the Jupyter server API.
 *
 * @param endPoint API REST end point for the extension
 * @param init Initial values for the request
 * @returns The response body interpreted as JSON
 */
export async function requestAPI<T>(
  serverSettings: WebRTCServerConnection.ISettings,
  namespace = 'api',
  endPoint = '',
  init: RequestInit = {}
): Promise<T> {
  // Make request to the Jupyter API.
  const requestUrl = URLExt.join(serverSettings.baseUrl, namespace, endPoint);
  let response: Response;
  try {
    response = await WebRTCServerConnection.makeRequest(
      requestUrl,
      init,
      serverSettings
    );
    if (response.status === 403) {
      throw new JupyterAuthError();
    }
  } catch (error) {
    throw new ServerConnection.NetworkError(error);
  }
  let data: any = await response.text();
  if (data.length > 0) {
    try {
      data = JSON.parse(data);
    } catch (error) {
      console.warn('Not a JSON response body.', response);
    }
  }
  if (!response.ok) {
    throw new WebRTCServerConnection.ResponseError(
      response,
      data.message || data
    );
  }
  return data;
}
