import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Notification } from "./entities/notification.entity";
import { CreateNotificationDto } from "./dto/create-notification.dto";
import { NotificationType } from "@app/common";

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>
  ) {}

  async send(createNotificationDto: CreateNotificationDto) {
    const notification = this.notificationRepository.create({
      ...createNotificationDto,
      status: "PENDING",
    });

    // TODO: Implement actual notification sending logic
    // - Email via SMTP
    // - SMS via API
    // - Push notifications

    notification.status = "SENT";
    notification.sentAt = new Date();

    return this.notificationRepository.save(notification);
  }

  async findAll(options: { page: number; limit: number; userId?: string }) {
    const { page, limit, userId } = options;
    const skip = (page - 1) * limit;

    const query =
      this.notificationRepository.createQueryBuilder("notification");

    if (userId) {
      query.where("notification.userId = :userId", { userId });
    }

    const [data, total] = await query
      .skip(skip)
      .take(limit)
      .orderBy("notification.createdAt", "DESC")
      .getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    return this.notificationRepository.findOne({ where: { id } });
  }
}
