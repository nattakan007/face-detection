import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { DatabaseModule } from "./database/database.module";
import { CompaniesModule } from "./modules/companies/companies.module";
import { EmployeesModule } from "./modules/employees/employees.module";
import { AttendanceModule } from "./modules/attendance/attendance.module";
import { SettingsModule } from "./modules/settings/settings.module";
import { BatchModule } from "./modules/batch/batch.module";

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),

    // Schedule (for cron jobs)
    ScheduleModule.forRoot(),

    // Database
    DatabaseModule,

    // Feature modules
    CompaniesModule,
    EmployeesModule,
    AttendanceModule,
    SettingsModule,
    BatchModule,
  ],
})
export class AppModule {}
