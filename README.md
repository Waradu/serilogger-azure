[Serilogger Docs](https://github.com/davisb10/serilogger)

Example:

```ts
import { ConsoleSink, LogEventLevel, LoggerConfiguration } from "serilogger";
import { AzureSink } from "serilogger-azure";

const logger = new LoggerConfiguration()
  .minLevel(LogEventLevel.debug)
  .writeTo(new ConsoleSink())
  .writeTo(
    new AzureSink({
      connectionString: process.env.CONNECTION_STRING!,
      storageContainerName: "logs",
      storageFileName: "development/log.txt",
    })
  )
  .create();

logger.info("Hello, {name}!", "World");
```

Options with examples:

```ts
new AzureSink({
  /* Connection String for the Storage Account */
  connectionString: "DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...;EndpointSuffix=core.windows.net";
  /* Container Name */
  storageContainerName: "logs";
  /* File Path + Filename */
  storageFileName: "development/log.txt";
  /* Period in seconds to sync with Container */
  period?: 10;
  /* Maximum in memory storage size until synced */
  batchPostingLimit?: 100;
  /* Sync at every log event */
  flushImmediately?: false;
  /* Filters which log events are synced */
  restrictedToMinimumLevel?: LogEventLevel.debug;
  /* Disable sync */
  disabled?: false;
});
```
