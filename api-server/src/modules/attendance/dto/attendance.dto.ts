import {
  IsString,
  IsOptional,
  IsNumber,
  IsObject,
  Min,
  Max,
  IsEnum,
  IsDateString,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

class LocationDto {
  @ApiProperty({ example: 13.7563 })
  @IsNumber()
  lat: number;

  @ApiProperty({ example: 100.5018 })
  @IsNumber()
  lng: number;

  @ApiPropertyOptional({ example: "Bangkok, Thailand" })
  @IsOptional()
  @IsString()
  address?: string;
}

export class CheckInDto {
  @ApiProperty({ example: "COMPANY-UUID" })
  @IsString()
  company_id: string;

  @ApiPropertyOptional({ example: "EMPLOYEE-UUID" })
  @IsOptional()
  @IsString()
  employee_id?: string;

  @ApiPropertyOptional({ type: LocationDto })
  @IsOptional()
  @IsObject()
  location?: LocationDto;

  @ApiPropertyOptional({ example: 0.95, minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;

  @ApiPropertyOptional({
    example: "face-scan",
    enum: ["face-scan", "manual", "admin"],
  })
  @IsOptional()
  @IsEnum(["face-scan", "manual", "admin"])
  type?: string;

  @ApiPropertyOptional({ example: "สมชาย ใจดี (Manual Check-in)" })
  @IsOptional()
  @IsString()
  manual_name?: string;
}

export class CheckOutDto {
  @ApiPropertyOptional({ type: LocationDto })
  @IsOptional()
  @IsObject()
  location?: LocationDto;

  @ApiPropertyOptional({ example: 0.92, minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;
}

export class GetAttendanceQueryDto {
  @ApiProperty({ example: "COMPANY-UUID" })
  @IsString()
  company_id: string;

  @ApiPropertyOptional({ example: "EMPLOYEE-UUID" })
  @IsOptional()
  @IsString()
  employee_id?: string;

  @ApiPropertyOptional({ example: "2026-01-01" })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({ example: "2026-01-31" })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({ example: "face-scan" })
  @IsOptional()
  @IsString()
  type?: string;
}
