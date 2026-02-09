import {
  IsString,
  IsOptional,
  IsEmail,
  IsBoolean,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateEmployeeDto {
  @ApiProperty({ example: "COMPANY-UUID" })
  @IsString()
  company_id: string;

  @ApiProperty({ example: "EMP001" })
  @IsString()
  employee_code: string;

  @ApiProperty({ example: "สมชาย ใจดี" })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: "พนักงานเสิร์ฟ" })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional({ example: "พนักงานบริการ" })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ example: "employee@example.com" })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: "0812345678" })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class UpdateEmployeeDto {
  @ApiPropertyOptional({ example: "สมชาย ใจดี" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: "หัวหน้าพนักงานเสิร์ฟ" })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional({ example: "พนักงานบริการ" })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ example: "employee@example.com" })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: "0812345678" })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class RegisterFaceDto {
  @ApiProperty({
    description: "Face descriptor array (128 dimensions)",
    example: [0.123, -0.456, 0.789],
    type: [Number],
  })
  @IsArray()
  @ArrayMinSize(128)
  @ArrayMaxSize(128)
  faceDescriptor: number[];
}
