/*
 * Copyright (c) 2021-2023 Datalayer, Inc.
 *
 * MIT License
 */

import { ClassicWidgetManager } from '../../jupyter/ipywidgets/classic';
import { requireLoader as loader } from '../../jupyter/ipywidgets/libembed-amd';
import { Kernel as JupyterKernel } from '@jupyterlab/services';

/**
 * Global registry to ensure only one widget manager per kernel connection.
 * This prevents multiple widget managers from interfering with each other.
 */
class WidgetManagerRegistry {
  private _managers = new Map<string, ClassicWidgetManager>();
  private _registrations = new Map<string, Set<string>>(); // kernelId -> Set<adapterIds>

  /**
   * Get or create a widget manager for a kernel connection.
   */
  getOrCreateManager(kernelConnection: JupyterKernel.IKernelConnection | null, adapterId: string): ClassicWidgetManager | null {
    if (!kernelConnection) {
      return null;
    }

    const kernelId = kernelConnection.id;
    
    // Get existing manager or create new one
    let manager = this._managers.get(kernelId);
    if (!manager) {
      console.log(`WidgetManagerRegistry: Creating new widget manager for kernel ${kernelId}`);
      manager = new ClassicWidgetManager({ loader });
      this._managers.set(kernelId, manager);
      
      // Register with kernel immediately
      this._registerWithKernel(manager, kernelConnection).catch(error => {
        console.error(`WidgetManagerRegistry: Failed to register manager for kernel ${kernelId}:`, error);
      });
    }

    // Track which adapters are using this manager
    if (!this._registrations.has(kernelId)) {
      this._registrations.set(kernelId, new Set());
    }
    this._registrations.get(kernelId)!.add(adapterId);

    console.log(`WidgetManagerRegistry: Providing manager for kernel ${kernelId} to adapter ${adapterId}`);
    return manager;
  }

  /**
   * Release a manager when an adapter is disposed.
   */
  releaseManager(kernelId: string, adapterId: string): void {
    const adapters = this._registrations.get(kernelId);
    if (adapters) {
      adapters.delete(adapterId);
      
      // If no more adapters are using this manager, we could clean it up
      // But for now, we'll keep it around for stability
      if (adapters.size === 0) {
        console.log(`WidgetManagerRegistry: No more adapters using manager for kernel ${kernelId}`);
      }
    }
  }

  /**
   * Get the current manager for a kernel (if any).
   */
  getManager(kernelId: string): ClassicWidgetManager | undefined {
    return this._managers.get(kernelId);
  }

     /**
    * Safely register a manager with a kernel.
    */
   private async _registerWithKernel(manager: ClassicWidgetManager, kernelConnection: JupyterKernel.IKernelConnection): Promise<void> {
     try {
       console.log(`WidgetManagerRegistry: Registering manager with kernel ${kernelConnection.id}`);
       await manager.registerWithKernel(kernelConnection);
       console.log(`WidgetManagerRegistry: Successfully registered manager with kernel ${kernelConnection.id}`);
       
       // Log registry debug info
       const debugInfo = this.getDebugInfo();
       console.log(`WidgetManagerRegistry: Current state - Managers: [${debugInfo.managers.join(', ')}]`);
     } catch (error) {
       console.error(`WidgetManagerRegistry: Failed to register manager with kernel ${kernelConnection.id}:`, error);
       throw error;
     }
   }

  /**
   * Get debug information about the registry state.
   */
  getDebugInfo(): { managers: string[], registrations: Record<string, string[]> } {
    const registrations: Record<string, string[]> = {};
    for (const [kernelId, adapters] of this._registrations.entries()) {
      registrations[kernelId] = Array.from(adapters);
    }
    
    return {
      managers: Array.from(this._managers.keys()),
      registrations
    };
  }
}

// Export singleton instance
export const widgetManagerRegistry = new WidgetManagerRegistry(); 