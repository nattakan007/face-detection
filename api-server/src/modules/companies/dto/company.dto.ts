import { IsString, IsOptional } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateCompanyDto {
  @ApiProperty({ example: "บริษัททดสอบ จำกัด" })
  @IsString()
  name: string;

  @ApiProperty({ example: "TEST001" })
  @IsString()
  code: string;
}

export class UpdateCompanyDto {
  @ApiProperty({ example: "บริษัททดสอบ จำกัด", required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: "TEST001", required: false })
  @IsOptional()
  @IsString()
  code?: string;
}
