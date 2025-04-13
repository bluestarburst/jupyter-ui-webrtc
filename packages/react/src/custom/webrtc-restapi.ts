// re-implement the rest api but use webrtc to send the http request

import {
  IKernelOptions,
  IModel,
} from '@jupyterlab/services/lib/kernel/restapi';
import { ServerConnection } from '@jupyterlab/services';
import { WebRTC } from './webrtc';

/**
 * Class that implements the kernel REST API using WebRTC.
 * Implemented as a singleton to ensure only one instance exists.
 */
export class WebRTCKernelAPI {
  /**
   * The url for the kernel service.
   */
  static readonly KERNEL_SERVICE_URL = 'api/kernels';

  /**
   * The singleton instance
   */
  private static instance: WebRTCKernelAPI;

  /**
   * Get the singleton instance
   */
  public static getInstance(): WebRTCKernelAPI {
    if (!WebRTCKernelAPI.instance) {
      WebRTCKernelAPI.instance = new WebRTCKernelAPI();
    }
    return WebRTCKernelAPI.instance;
  }

  /**
   * Private constructor to prevent direct construction calls with the `new` operator.
   */
  private constructor() {
    this.attachHTTPRequestListener();
  }

  static messageQueue: any[] = [];

  async getResponse() {
    // wait for message queue to be non-empty
    while (Object.keys(WebRTCKernelAPI.messageQueue).length === 0) {
      // wait for 100ms
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    // get the first message
    const message = WebRTCKernelAPI.messageQueue[0];
    WebRTCKernelAPI.messageQueue.shift();
    return message;
  }

  attachHTTPRequestListener() {
    WebRTC.addActionListener('sudo_http_response', (data: any) => {
      console.log(data);
      WebRTCKernelAPI.messageQueue.push(data);
    });
  }

  async sudoHTTPRequest(url: string, method: string, body: any) {
    console.log('SUDO SENDING MSG', url, method, body);
    // send the request
    WebRTC.sendMessage('sudo_http_request', { url, method, body });

    console.log('SUDO AWAITING MSG', url);

    const response = await this.getResponse();

    console.log('SUDO RECVED MSG', url, method, response);

    // response has already been parsed by .json(), please turn the data back into a response object

    const responseObject = new Response(response.data, {
      status: response.status,
      headers: response.headers,
    });

    // wait for the response
    return responseObject;
  }

  static sudoHTTPRequest(url: string, method: string, body: any) {
    const instance = WebRTCKernelAPI.getInstance();

    return instance.sudoHTTPRequest(url, method, body);
  }

  /**
   * Fetch the running kernels.
   *
   * @param settings - The optional server settings.
   *
   * @returns A promise that resolves with the list of running kernels.
   *
   * #### Notes
   * Uses the [Jupyter Server API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#!/kernels) and validates the response model.
   *
   * The promise is fulfilled on a valid response and rejected otherwise.
   */
  static async listRunning(
    settings?: ServerConnection.ISettings
  ): Promise<IModel[]> {
    /*
         const url = coreutils_1.URLExt.join(settings.baseUrl, exports.KERNEL_SERVICE_URL);
         const response = await serverconnection_1.ServerConnection.makeRequest(url, {}, settings);
         if (response.status !== 200) {
             const err = await serverconnection_1.ServerConnection.ResponseError.create(response);
             throw err;
         }
         const data = await response.json();
         (0, validate_1.validateModels)(data);
         return data;
        */

    const instance = WebRTCKernelAPI.getInstance();

    const response = await instance.sudoHTTPRequest(
      WebRTCKernelAPI.KERNEL_SERVICE_URL,
      'GET',
      {}
    );
    return response.json();
  }

  /**
   * Start a new kernel.
   *
   * @param options - The options used to create the kernel.
   *
   * @param settings - The optional server settings.
   *
   * @returns A promise that resolves with the kernel model.
   *
   * #### Notes
   * Uses the [Jupyter Server API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#!/kernels) and validates the response model.
   *
   * The promise is fulfilled on a valid response and rejected otherwise.
   */
  static async startNew(
    options?: IKernelOptions,
    settings?: ServerConnection.ISettings
  ): Promise<IModel> {
    /*
        const url = coreutils_1.URLExt.join(settings.baseUrl, exports.KERNEL_SERVICE_URL);
    const init = {
        method: 'POST',
        body: JSON.stringify(options)
    };
    const response = await serverconnection_1.ServerConnection.makeRequest(url, init, settings);
    if (response.status !== 201) {
        const err = await serverconnection_1.ServerConnection.ResponseError.create(response);
        throw err;
    }
    const data = await response.json();
    (0, validate_1.validateModel)(data);
    return data;
        */

    const instance = WebRTCKernelAPI.getInstance();

    const response = await instance.sudoHTTPRequest(
      WebRTCKernelAPI.KERNEL_SERVICE_URL,
      'POST',
      options
    );
    return response.json();
  }

  /**
   * Restart a kernel.
   *
   * @param id - The id of the kernel.
   *
   * @param settings - The optional server settings.
   *
   * @returns A promise that resolves when the kernel is restarted.
   *
   * #### Notes
   * Uses the [Jupyter Server API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#!/kernels) and validates the response model.
   *
   * The promise is fulfilled on a valid response and rejected otherwise.
   */
  static async restartKernel(
    id: string,
    settings?: ServerConnection.ISettings
  ): Promise<void> {
    /*
        const url = coreutils_1.URLExt.join(settings.baseUrl, exports.KERNEL_SERVICE_URL, encodeURIComponent(id), 'restart');
    const init = { method: 'POST' };
    const response = await serverconnection_1.ServerConnection.makeRequest(url, init, settings);
    if (response.status !== 200) {
        const err = await serverconnection_1.ServerConnection.ResponseError.create(response);
        throw err;
    }
    const data = await response.json();
    (0, validate_1.validateModel)(data);
        */

    const instance = WebRTCKernelAPI.getInstance();

    const response = await instance.sudoHTTPRequest(
      WebRTCKernelAPI.KERNEL_SERVICE_URL,
      'POST',
      { id }
    );
    return response.json();
  }

  /**
   * Interrupt a kernel.
   *
   * @param id - The id of the kernel.
   *
   * @param settings - The optional server settings.
   *
   * @returns A promise that resolves when the kernel is interrupted.
   *
   * #### Notes
   * Uses the [Jupyter Server API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#!/kernels) and validates the response model.
   *
   * The promise is fulfilled on a valid response and rejected otherwise.
   */
  static async interruptKernel(
    id: string,
    settings?: ServerConnection.ISettings
  ): Promise<void> {
    /* const url = coreutils_1.URLExt.join(settings.baseUrl, exports.KERNEL_SERVICE_URL, encodeURIComponent(id), 'interrupt');
     const init = { method: 'POST' };
     const response = await serverconnection_1.ServerConnection.makeRequest(url, init, settings);
     if (response.status !== 204) {
         const err = await serverconnection_1.ServerConnection.ResponseError.create(response);
         throw err;
     } */

    const instance = WebRTCKernelAPI.getInstance();

    const response = await instance.sudoHTTPRequest(
      WebRTCKernelAPI.KERNEL_SERVICE_URL,
      'POST',
      { id }
    );
    return response.json();
  }

  /**
   * Shutdown a kernel.
   *
   * @param id - The id of the kernel.
   *
   * @param settings - The optional server settings.
   *
   * @returns A promise that resolves when the kernel is shut down.
   *
   * #### Notes
   * Uses the [Jupyter Server API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#!/kernels) and validates the response model.
   *
   * The promise is fulfilled on a valid response and rejected otherwise.
   */
  static async shutdownKernel(
    id: string,
    settings?: ServerConnection.ISettings
  ): Promise<void> {
    /*
        const url = coreutils_1.URLExt.join(settings.baseUrl, exports.KERNEL_SERVICE_URL, encodeURIComponent(id));
    const init = { method: 'DELETE' };
    const response = await serverconnection_1.ServerConnection.makeRequest(url, init, settings);
    if (response.status === 404) {
        const msg = `The kernel "${id}" does not exist on the server`;
        console.warn(msg);
    }
    else if (response.status !== 204) {
        const err = await serverconnection_1.ServerConnection.ResponseError.create(response);
        throw err;
    }

        */

    const instance = WebRTCKernelAPI.getInstance();

    const response = await instance.sudoHTTPRequest(
      WebRTCKernelAPI.KERNEL_SERVICE_URL,
      'DELETE',
      { id }
    );
    return response.json();
  }

  /**
   * Get kernel model.
   *
   * @param id - The id of the kernel.
   *
   * @param settings - The optional server settings.
   *
   * @returns A promise that resolves with the kernel model.
   *
   * #### Notes
   * Uses the [Jupyter Server API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#!/kernels) and validates the response model.
   *
   * The promise is fulfilled on a valid response and rejected otherwise.
   */
  static async getKernelModel(
    id: string,
    settings?: ServerConnection.ISettings
  ): Promise<IModel | undefined> {
    /*
const url = coreutils_1.URLExt.join(settings.baseUrl, exports.KERNEL_SERVICE_URL, encodeURIComponent(id));
    const response = await serverconnection_1.ServerConnection.makeRequest(url, {}, settings);
    if (response.status === 404) {
        return undefined;
    }
    else if (response.status !== 200) {
        const err = await serverconnection_1.ServerConnection.ResponseError.create(response);
        throw err;
    }
    const data = await response.json();
    (0, validate_1.validateModel)(data);
    return data;
        */

    const instance = WebRTCKernelAPI.getInstance();

    const response = await instance.sudoHTTPRequest(
      WebRTCKernelAPI.KERNEL_SERVICE_URL,
      'GET',
      { id }
    );
    return response.json();
  }
}
