import { EntityCategory, EmployeeType } from '../enums';

/**
 * Get default employee types based on entity category
 */
export class EmployeeTypeUtil {
  /**
   * Get suggested employee types for an entity category
   */
  static getEmployeeTypesForCategory(category: EntityCategory): EmployeeType[] {
    switch (category) {
      case EntityCategory.RESTAURANT:
      case EntityCategory.CAFE:
      case EntityCategory.BAR:
      case EntityCategory.FAST_FOOD:
        return [
          EmployeeType.WAITER,
          EmployeeType.CHEF,
          EmployeeType.CASHIER,
          EmployeeType.HOST,
          EmployeeType.BUSSER,
          EmployeeType.BARISTA,
          EmployeeType.BARTENDER,
        ];

      case EntityCategory.GAS_STATION:
        return [EmployeeType.PUMPIST, EmployeeType.CASHIER];

      case EntityCategory.SUPERMARKET:
        return [EmployeeType.CASHIER, EmployeeType.STOCK_CLERK];

      default:
        return [EmployeeType.CASHIER, EmployeeType.OTHER];
    }
  }

  /**
   * Get default employee type for an entity category
   */
  static getDefaultEmployeeType(category: EntityCategory): EmployeeType {
    switch (category) {
      case EntityCategory.RESTAURANT:
      case EntityCategory.CAFE:
      case EntityCategory.BAR:
      case EntityCategory.FAST_FOOD:
        return EmployeeType.WAITER;

      case EntityCategory.GAS_STATION:
        return EmployeeType.PUMPIST;

      case EntityCategory.SUPERMARKET:
        return EmployeeType.CASHIER;

      default:
        return EmployeeType.OTHER;
    }
  }

  /**
   * Validate if employee type is appropriate for entity category
   */
  static isValidEmployeeTypeForCategory(
    employeeType: EmployeeType,
    category: EntityCategory,
  ): boolean {
    const validTypes = this.getEmployeeTypesForCategory(category);
    return validTypes.includes(employeeType);
  }
}
