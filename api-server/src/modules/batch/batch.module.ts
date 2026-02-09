import { Module } from "@nestjs/common";
import { BatchController } from "./batch.controller";
import { BatchService } from "./batch.service";
import { EmployeesModule } from "../employees/employees.module";
import { AttendanceModule } from "../attendance/attendance.module";

@Module({
  imports: [EmployeesModule, AttendanceModule],
  controllers: [BatchController],
  providers: [BatchService],
})
export class BatchModule {}
