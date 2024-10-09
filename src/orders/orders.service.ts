import {
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaClient } from '@prisma/client';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { ChangeOrderStatusDto } from './dto';
import { NATS_SERVICE } from 'src/common/config/services';
import { ProductActions } from './enum/products-actions.enum';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('Orders Service');
  constructor(@Inject(NATS_SERVICE) private readonly client: ClientProxy) {
    super();
  }
  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database Order is conected');
  }

  async create(createOrderDto: CreateOrderDto) {
    try {
      const productsIds = createOrderDto.items.map((item) => item.productId);
      const products: any[] = await firstValueFrom(
        this.client.send({ cmd: ProductActions.VALIDATE_PRODUCT }, productsIds),
      );
      const totalAmount = createOrderDto.items.reduce((acc, orderItem) => {
        const priceProduct = products.find(
          (product) => product.id === orderItem.productId,
        ).price;
        return acc + priceProduct * orderItem.quantity;
      }, 0);

      const totalItems = createOrderDto.items.reduce((acc, orderItem) => {
        return acc + orderItem.quantity;
      }, 0);
      //transaccion de base de datos
      const order = await this.order.create({
        data: {
          totalAmount: totalAmount,
          totalItems: totalItems,
          OrderItem: {
            createMany: {
              data: createOrderDto.items.map((orderItem) => ({
                price: products.find(
                  (product) => product.id === orderItem.productId,
                ).price,
                productId: orderItem.productId,
                quantity: orderItem.quantity,
              })),
            },
          },
        },
        include: {
          OrderItem: {
            select: {
              price: true,
              quantity: true,
              productId: true,
            },
          },
        },
      });

      return {
        ...order,
        OrderItem: order.OrderItem.map((orderItem) => ({
          ...orderItem,
          name: products.find((product) => product.id === orderItem.productId)
            .name,
        })),
      };
    } catch (error) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: 'Something went wrong, check logs ',
      });
    }
  }

  async findAll(orderPaginationDto: OrderPaginationDto) {
    const { status, page, limit } = orderPaginationDto;
    try {
      const totalItems = await this.order.count({
        where: { status },
      });

      const data = await this.order.findMany({
        skip: (page - 1) * limit,
        take: limit,
        where: { status },
      });
      return this.buildPaginationResponse(data, totalItems, page, limit);
    } catch (error) {
      // Captura errores de Prisma
      throw new RpcException({
        status: 500,
        message: error.message || 'Error retrieving orders',
      });
    }
  }

  async findOne(id: string) {
    const orderById = await this.order.findUnique({
      where: { id },
      include: {
        OrderItem: {
          select: {
            price: true,
            quantity: true,
            productId: true,
          },
        },
      },
    });
    this.mensajeNoExistencia(orderById, id);

    const productsIds = orderById.OrderItem.map(
      (orderItem) => orderItem.productId,
    );
    const products: any[] = await firstValueFrom(
      this.client.send({ cmd: ProductActions.VALIDATE_PRODUCT }, productsIds),
    );
    return {
      ...orderById,
      OrderItem: orderById.OrderItem.map((orderItem) => ({
        ...orderItem,
        name: products.find((product) => product.id === orderItem.productId)
          .name,
      })),
    };
  }

  async changeStatus(changeOrderStatus: ChangeOrderStatusDto) {
    const { id, status } = changeOrderStatus;
    const order = await this.findOne(id);
    if (order.status === status) {
      return order;
    }
    return await this.order.update({
      where: { id },
      data: {
        status: status,
      },
    });
  }

  private mensajeNoExistencia(item: any, id: string) {
    if (!item) {
      throw new RpcException({
        message: `El id: ${id} no corresponde a ninguna registro en la Base de Datos`,
        status: HttpStatus.NOT_FOUND,
      });
    }
  }

  private buildPaginationResponse(
    data: any[],
    total: number,
    page: number,
    limit: number,
  ) {
    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }
}
