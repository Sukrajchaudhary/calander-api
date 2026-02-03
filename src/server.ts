import { initializeApp } from './app';
import config from './config/config';


const startServer = async (): Promise<void> => {
  try {
    const app = await initializeApp();

    const server = app.listen(config.app.port, () => {
      console.log(`
╔════════════════════════════════════════╗
║   ${config.app.name.padEnd(37)}║
║   Environment: ${config.app.env.padEnd(25)}║
║   Port: ${String(config.app.port).padEnd(28)}║
║   Version: ${config.app.version.padEnd(27)}║
╚════════════════════════════════════════╝
      `.trim());
    });

    // Graceful Shutdown
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n⚠ ${signal} signal received`);
      server.close(async () => {
        console.log('✓ Server closed');
        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        console.error('✗ Forced shutdown');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    process.on('unhandledRejection', (reason: Error) => {
      console.error('✗ Unhandled Rejection:', reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });

    process.on('uncaughtException', (error: Error) => {
      console.error('✗ Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });
  } catch (error) {
    console.error('✗ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
