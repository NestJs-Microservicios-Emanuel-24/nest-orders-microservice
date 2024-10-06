import { Controller, NotImplementedException } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderActions } from 'src/common';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @MessagePattern(OrderActions.CREATE)
  createOrder(@Payload() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
  }

  @MessagePattern(OrderActions.GET_ALL)
  findAllOrder() {
    return this.ordersService.findAll();
  }

  @MessagePattern(OrderActions.GET_ONE_BY_ID)
  findOneOrder(@Payload('id') id: number) {
    return this.ordersService.findOne(id);
  }
  @MessagePattern('changeOrderStatus')
  changeOrderStatus() {
    throw new NotImplementedException();
  }
}
