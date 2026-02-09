import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from "@nestjs/swagger";
import { EmployeesService } from "./employees.service";
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  RegisterFaceDto,
} from "./dto/employee.dto";

@ApiTags("employees")
@Controller("employees")
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  @ApiOperation({ summary: "Get all employees" })
  @ApiQuery({ name: "company_id", required: true })
  @ApiQuery({ name: "search", required: false })
  @ApiResponse({ status: 200, description: "List of employees" })
  async findAll(
    @Query("company_id") companyId: string,
    @Query("search") search?: string
  ) {
    if (search) {
      return this.employeesService.search(companyId, search);
    }
    return this.employeesService.findAll(companyId);
  }

  @Get("no-face")
  @ApiOperation({ summary: "Get employees without face data" })
  @ApiQuery({ name: "company_id", required: true })
  @ApiResponse({
    status: 200,
    description: "List of employees without registered face",
  })
  async findWithoutFace(@Query("company_id") companyId: string) {
    return this.employeesService.findWithoutFace(companyId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get employee by ID" })
  @ApiResponse({ status: 200, description: "Employee found" })
  @ApiResponse({ status: 404, description: "Employee not found" })
  async findOne(@Param("id") id: string) {
    return this.employeesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: "Create new employee" })
  @ApiResponse({ status: 201, description: "Employee created" })
  async create(@Body() createDto: CreateEmployeeDto) {
    return this.employeesService.create(createDto);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update employee" })
  @ApiResponse({ status: 200, description: "Employee updated" })
  @ApiResponse({ status: 404, description: "Employee not found" })
  async update(@Param("id") id: string, @Body() updateDto: UpdateEmployeeDto) {
    return this.employeesService.update(id, updateDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete employee (soft delete)" })
  @ApiResponse({ status: 200, description: "Employee deleted" })
  async delete(@Param("id") id: string) {
    await this.employeesService.delete(id);
    return { message: "Employee deleted successfully" };
  }

  @Put(":id/face")
  @ApiOperation({ summary: "Register face descriptor for employee" })
  @ApiResponse({ status: 200, description: "Face registered" })
  @ApiResponse({ status: 404, description: "Employee not found" })
  async registerFace(
    @Param("id") id: string,
    @Body() faceDto: RegisterFaceDto
  ) {
    return this.employeesService.registerFace(id, faceDto);
  }
}
