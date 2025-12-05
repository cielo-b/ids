import { EventType } from '../enums/event-type.enum';

export interface BaseEventPayload {
  eventType: EventType;
  timestamp: Date;
  userId?: string;
  entityId: string;
  branchId?: string;
}

export interface OrderEventPayload extends BaseEventPayload {
  orderId: string;
  orderCode: string;
  status?: string;
  customerName?: string;
}

export interface ReceiptEventPayload extends BaseEventPayload {
  receiptId: string;
  orderId: string;
  orderCode: string;
  amountPaid?: number;
  status?: string;
}

export interface TableEventPayload extends BaseEventPayload {
  tableId: string;
  tableName: string;
  status?: string;
}

export interface MenuItemEventPayload extends BaseEventPayload {
  menuItemId: string;
  menuItemName: string;
  categoryId?: string;
}

export interface PromotionEventPayload extends BaseEventPayload {
  promotionId: string;
  promotionName: string;
}

export interface EmployeeEventPayload extends BaseEventPayload {
  employeeId: string;
  employeeName: string;
  employeeType?: string;
}

export interface BranchEventPayload extends BaseEventPayload {
  branchId: string;
  branchName: string;
}

export type EventPayload =
  | OrderEventPayload
  | ReceiptEventPayload
  | TableEventPayload
  | MenuItemEventPayload
  | PromotionEventPayload
  | EmployeeEventPayload
  | BranchEventPayload;
