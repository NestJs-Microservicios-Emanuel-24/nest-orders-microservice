import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { envs } from './common/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.NATS,
      options: {
        servers: envs.nats_servers,
      },
    },
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const logger = new Logger('\x1b[34m*****MAIN ORDERS MS ******\x1b[0m');
  await app.listen();
  logger.log(`Orders microservice running on port:  ${envs.port}`);
}
bootstrap();
