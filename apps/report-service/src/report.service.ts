import { Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";
import { CacheService } from "@app/common";
import { DateRangeDto } from "./dto/date-range.dto";

@Injectable()
export class ReportService {
  private readonly CACHE_TTL = 300; // 5 minutes

  private readonly services = {
    orders: this.config.get<string>(
      "ORDER_SERVICE_URL",
      "http://order-service:3008"
    ),
    payments: this.config.get<string>(
      "PAYMENT_SERVICE_URL",
      "http://payment-service:3009"
    ),
    receipts: this.config.get<string>(
      "RECEIPT_SERVICE_URL",
      "http://receipt-service:3010"
    ),
    menu: this.config.get<string>(
      "MENU_SERVICE_URL",
      "http://menu-service:3007"
    ),
    employees: this.config.get<string>(
      "EMPLOYEE_SERVICE_URL",
      "http://employee-service:3006"
    ),
  };

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly cache: CacheService
  ) {}

  async getSalesSummary(params: DateRangeDto) {
    const key = `report:sales:${JSON.stringify(params)}`;
    const cached = await this.cache.get<any>(key);
    if (cached) return cached;

    const { startDate, endDate, entityId, branchId } = params;

    const receiptsUrl =
      `${this.services.receipts}/api/v1/receipts?startDate=${startDate}&endDate=${endDate}` +
      (entityId ? `&entityId=${entityId}` : "") +
      (branchId ? `&branchId=${branchId}` : "");
    const paymentsUrl =
      `${this.services.payments}/api/v1/payments/stats?startDate=${startDate}&endDate=${endDate}` +
      (entityId ? `&entityId=${entityId}` : "");

    const [receiptsResp, paymentsResp] = await Promise.all([
      firstValueFrom(this.http.get(receiptsUrl)),
      firstValueFrom(this.http.get(paymentsUrl)).catch(() => ({
        data: { success: true, data: {} },
      })),
    ]);

    const receipts = receiptsResp.data?.data || [];

    const totalRevenue = receipts.reduce(
      (sum: number, r: any) => sum + Number(r.total || 0),
      0
    );
    const totalTax = receipts.reduce(
      (sum: number, r: any) => sum + Number(r.tax || 0),
      0
    );
    const totalDiscount = receipts.reduce(
      (sum: number, r: any) => sum + Number(r.discount || 0),
      0
    );
    const totalTips = receipts.reduce(
      (sum: number, r: any) => sum + Number(r.tipAmount || 0),
      0
    );

    const summary = {
      totalReceipts: receipts.length,
      totalRevenue,
      totalTax,
      totalDiscount,
      totalTips,
      payments: paymentsResp.data?.data || {},
      range: { startDate, endDate },
    };

    await this.cache.set(key, { success: true, data: summary }, this.CACHE_TTL);
    return { success: true, data: summary };
  }

  async getTopItems(params: DateRangeDto) {
    const key = `report:top-items:${JSON.stringify(params)}`;
    const cached = await this.cache.get<any>(key);
    if (cached) return cached;

    const { startDate, endDate, entityId } = params;

    const receiptsUrl =
      `${this.services.receipts}/api/v1/receipts?startDate=${startDate}&endDate=${endDate}` +
      (entityId ? `&entityId=${entityId}` : "");

    const { data } = await firstValueFrom(this.http.get(receiptsUrl));
    const receipts = data?.data || [];

    const itemMap: Record<
      string,
      { name: string; quantity: number; revenue: number }
    > = {};
    for (const r of receipts) {
      for (const it of r.items || []) {
        const keyIt = it.name;
        if (!itemMap[keyIt])
          itemMap[keyIt] = { name: it.name, quantity: 0, revenue: 0 };
        itemMap[keyIt].quantity += Number(it.quantity || 0);
        itemMap[keyIt].revenue += Number(it.total || 0);
      }
    }

    const items = Object.values(itemMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 20);

    const result = { success: true, data: items };
    await this.cache.set(key, result, this.CACHE_TTL);
    return result;
  }

  async getEmployeePerformance(params: DateRangeDto) {
    const key = `report:employee-performance:${JSON.stringify(params)}`;
    const cached = await this.cache.get<any>(key);
    if (cached) return cached;

    // Pull top performers from employee-service stats
    const statsUrl =
      `${this.services.employees}/api/v1/employees/stats` +
      (params.entityId ? `?entityId=${params.entityId}` : "");

    const { data } = await firstValueFrom(this.http.get(statsUrl));
    const result = { success: true, data: data?.data || data };
    await this.cache.set(key, result, this.CACHE_TTL);
    return result;
  }
}
