import { IsArray, IsString, IsOptional, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class EmployeeImportDto {
  @ApiProperty({ example: "EMP001" })
  @IsString()
  employee_code: string;

  @ApiProperty({ example: "สมชาย ใจดี" })
  @IsString()
  name: string;

  @ApiProperty({ example: "พนักงานเสิร์ฟ" })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiProperty({ example: "พนักงานบริการ" })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({ example: "HR-123" })
  @IsOptional()
  @IsString()
  hr_sync_id?: string;
}

export class BatchEmployeeImportDto {
  @ApiProperty({ example: "COMPANY-UUID" })
  @IsString()
  company_id: string;

  @ApiProperty({ type: [EmployeeImportDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmployeeImportDto)
  employees: EmployeeImportDto[];
}

export class MarkSyncedDto {
  @ApiProperty({ type: [String], example: ["uuid1", "uuid2"] })
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}
