import { Controller, Inject, NotImplementedException } from '@nestjs/common';
import { ClientProxy, EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderActions } from 'src/common';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { ChangeOrderStatusDto } from './dto';
import { PaidOrderDto } from './dto/paid-order.dto';
 

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService,
  ) {}

  @MessagePattern(OrderActions.CREATE)
  async create(@Payload() createOrderDto: CreateOrderDto) {

    const order = await this.ordersService.create(createOrderDto);
    const paymentSession = await this.ordersService.createPaymentSession(order)

    return {
      order,
      paymentSession,
    }
  }

  @MessagePattern(OrderActions.GET_ALL)
  findAllOrder(@Payload() orderPaginationDto: OrderPaginationDto) {
    return this.ordersService.findAll(orderPaginationDto);
  }

  @MessagePattern(OrderActions.GET_ONE_BY_ID)
  findOneOrder(@Payload('id') id: string) {
    return this.ordersService.findOne(id);
  }
  @MessagePattern(OrderActions.CHANGE_STATUS)
  changeOrderStatus(@Payload() changeOrderStatusDto: ChangeOrderStatusDto) {
    return this.ordersService.changeStatus(changeOrderStatusDto);
  }

  @EventPattern(OrderActions.PAYMENT_SUCCEEDED)
  paidOrder(@Payload() paidOrderDto: PaidOrderDto ) {
    return this.ordersService.paidOrder( paidOrderDto );
  }
  
}
