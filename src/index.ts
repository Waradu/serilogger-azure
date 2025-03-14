import { BlobServiceClient } from "@azure/storage-blob";
import { LogEventLevel, type LogEvent, type Sink } from "serilogger";

export interface AzureSinkOptions {
  connectionString: string;
  storageContainerName: string;
  storageFileName: string;
  period?: number;
  batchPostingLimit?: number;
  flushImmediately?: boolean;
  restrictedToMinimumLevel?: LogEventLevel;
  disabled?: boolean;
}

const defaultOptions: Partial<AzureSinkOptions> = {
  period: 10,
  batchPostingLimit: 100,
  flushImmediately: false,
  restrictedToMinimumLevel: LogEventLevel.debug,
  disabled: false,
};

export interface AzureSinkOptionsInternal extends AzureSinkOptions {
  period: number;
  batchPostingLimit: number;
  flushImmediately: boolean;
  restrictedToMinimumLevel: LogEventLevel;
}

export class AzureSink implements Sink {
  protected options: AzureSinkOptionsInternal;
  private eventBuffer: LogEvent[] = [];
  private flushTimer?: NodeJS.Timer;

  constructor(options: AzureSinkOptions) {
    this.options = {
      ...defaultOptions,
      ...(options || {}),
    } as AzureSinkOptionsInternal;

    if (!this.options.flushImmediately) {
      this.startTimer();
    }
  }

  private generateNewBlobName(): string {
    console.log("now");
    const baseName = this.options.storageFileName.replace(/\.txt$/, "");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    return `${baseName}-${timestamp}.txt`;
  }

  private startTimer() {
    clearInterval(this.flushTimer);
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.options.period * 1000);
  }

  toString() {
    return "AzureSink";
  }

  public emit(events: LogEvent[]) {
    try {
      if (this.options.disabled) return;

      events = events.filter(
        (e) => e.level <= this.options.restrictedToMinimumLevel
      );

      this.eventBuffer.push(...events);

      if (this.options.flushImmediately) {
        this.flush();
        return;
      }

      if (this.eventBuffer.length >= this.options.batchPostingLimit) {
        this.startTimer();
        this.flush();
      }
    } catch (e) {
      console.error(`There was an issue while processing event. ${e}`);
    }
  }

  private mapLogLevel(logLevel: number | LogEventLevel) {
    if (logLevel === 1) {
      return "Fatal";
    } else if (logLevel === 3) {
      return "Error";
    } else if (logLevel === 7) {
      return "Warning";
    } else if (logLevel === 31) {
      return "Debug";
    } else if (logLevel === 63) {
      return "Verbose";
    }

    return "Information";
  }

  public async flush() {
    if (this.options.disabled) return;

    if (this.eventBuffer.length === 0) return;

    const eventsToFlush = this.eventBuffer;
    this.eventBuffer = [];

    const lines = eventsToFlush.map((e) => {
      return `[${e.timestamp} ${this.mapLogLevel(
        e.level
      )}]: ${e.messageTemplate.render(e.properties)}`;
    });

    await this.writeToAzure(lines.join("\n") + "\n");
  }

  protected async writeToAzure(content: string) {
    try {
      const blobServiceClient = BlobServiceClient.fromConnectionString(
        this.options.connectionString
      );
      const containerClient = blobServiceClient.getContainerClient(
        this.options.storageContainerName
      );
      const appendBlobClient = containerClient.getAppendBlobClient(
        this.options.storageFileName
      );

      const exists = await appendBlobClient.exists();

      if (!exists) {
        await appendBlobClient.create();
      }

      await appendBlobClient.appendBlock(content, Buffer.byteLength(content));
    } catch (reason) {
      console.log(`Failed to upload to azure storage account. ${reason}`);
    }
  }
}
