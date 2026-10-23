import { escalationService } from "./escalation.service";

export class EscalationScheduler {
  private timer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private service: any;
  private readonly defaultIntervalMs: number = 60 * 1000; // 60 seconds

  constructor(service: any = escalationService) {
    this.service = service;
  }

  /**
   * Internal tick execution, guarded against overlapping runs.
   */
  public async tick(): Promise<void> {
    if (this.isRunning) return; // Prevent concurrent overlapping executions
    this.isRunning = true;
    try {
      const result = await this.service.checkAndEscalateTasks();
      if (result && (result.escalatedToLevel1Count > 0 || result.escalatedToLevel2Count > 0)) {
        console.log(
          `[EscalationScheduler] Completed cycle: ${result.scannedCount} scanned, ${result.escalatedToLevel1Count} escalated to L1, ${result.escalatedToLevel2Count} escalated to L2.`
        );
      }
    } catch (err: any) {
      console.error(
        `[EscalationScheduler] Error during scheduled escalation run:`,
        err?.message || err
      );
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Starts the background SLA breach and escalation monitor.
   * Runs checkAndEscalateTasks at the specified interval.
   */
  start(intervalMs: number = this.defaultIntervalMs): void {
    if (this.timer) {
      return; // Already running
    }

    console.log(
      `[EscalationScheduler] Background breach monitor started (interval: ${intervalMs / 1000}s)`
    );

    this.timer = setInterval(() => {
      this.tick().catch(() => {});
    }, intervalMs);

    // Unref allows the Node.js event loop to exit gracefully during tests or shutdown
    if (this.timer && typeof this.timer.unref === "function") {
      this.timer.unref();
    }
  }

  /**
   * Stops the background monitor timer.
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log(`[EscalationScheduler] Background breach monitor stopped.`);
    }
  }

  /**
   * Triggers an immediate execution cycle.
   */
  async runImmediate(): Promise<any> {
    return this.service.checkAndEscalateTasks();
  }

  /**
   * Returns whether the background scheduler is currently active.
   */
  isActive(): boolean {
    return this.timer !== null;
  }
}

export const escalationScheduler = new EscalationScheduler();
