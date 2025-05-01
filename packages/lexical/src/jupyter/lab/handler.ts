/*
 * Copyright (c) 2021-2023 Datalayer, Inc.
 *
 * MIT License
 */

import { WebRTCServerConnection } from '@datalayer/jupyter-react';
import { URLExt } from '@jupyterlab/coreutils';
import { ServerConnection } from '@jupyterlab/services';

/**
 * Call the API extension
 *
 * @param endPoint API REST end point for the extension
 * @param init Initial values for the request
 * @returns The response body interpreted as JSON
 */
export async function requestAPI<T>(
  endPoint = '',
  init: RequestInit = {}
): Promise<T> {
  // Make request to Jupyter API
  const settings = WebRTCServerConnection.makeSettings();
  const requestUrl = URLExt.join(
    settings.baseUrl,
    'jupyter_lexical', // API Namespace
    endPoint
  );
  let response: Response;
  try {
    response = await WebRTCServerConnection.makeRequest(requestUrl, init, settings);
  } catch (error: any) {
    throw new ServerConnection.NetworkError(error);
  }
  let data: any = await response.text();
  if (data.length > 0) {
    try {
      data = JSON.parse(data);
    } catch (error) {
      console.log('Not a JSON response body.', response);
    }
  }
  if (!response.ok) {
    throw new ServerConnection.ResponseError(response, data.message || data);
  }
  return data;
}
