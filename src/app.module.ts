import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OrdersModule } from './orders/orders.module';
import { NatsModule } from './transports/nats.module';

@Module({
  imports: [OrdersModule, NatsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
