import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { CompaniesService } from "./companies.service";
import { CreateCompanyDto, UpdateCompanyDto } from "./dto/company.dto";

@ApiTags("companies")
@Controller("api/companies")
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  @ApiOperation({ summary: "Get all companies" })
  @ApiResponse({ status: 200, description: "Companies retrieved" })
  async findAll() {
    return this.companiesService.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get company by ID" })
  @ApiResponse({ status: 200, description: "Company retrieved" })
  async findOne(@Param("id") id: string) {
    return this.companiesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: "Create new company" })
  @ApiResponse({ status: 201, description: "Company created" })
  async create(@Body() createDto: CreateCompanyDto) {
    return this.companiesService.create(createDto);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update company" })
  @ApiResponse({ status: 200, description: "Company updated" })
  async update(@Param("id") id: string, @Body() updateDto: UpdateCompanyDto) {
    return this.companiesService.update(id, updateDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete company" })
  @ApiResponse({ status: 200, description: "Company deleted" })
  async delete(@Param("id") id: string) {
    await this.companiesService.delete(id);
    return { message: "Company deleted successfully" };
  }
}
