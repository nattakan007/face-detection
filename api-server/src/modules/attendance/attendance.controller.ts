import { Controller, Get, Post, Put, Body, Param, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { AttendanceService } from "./attendance.service";
import {
  CheckInDto,
  CheckOutDto,
  GetAttendanceQueryDto,
} from "./dto/attendance.dto";

@ApiTags("attendance")
@Controller("attendance")
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post("check-in")
  @ApiOperation({ summary: "Check-in attendance" })
  @ApiResponse({ status: 201, description: "Check-in successful" })
  async checkIn(@Body() checkInDto: CheckInDto) {
    return this.attendanceService.checkIn(checkInDto);
  }

  @Put(":id/check-out")
  @ApiOperation({ summary: "Check-out attendance" })
  @ApiResponse({ status: 200, description: "Check-out successful" })
  @ApiResponse({ status: 404, description: "Attendance record not found" })
  async checkOut(@Param("id") id: string, @Body() checkOutDto: CheckOutDto) {
    return this.attendanceService.checkOut(id, checkOutDto);
  }

  @Get()
  @ApiOperation({ summary: "Get attendance records" })
  @ApiResponse({ status: 200, description: "List of attendance records" })
  async findAll(@Query() query: GetAttendanceQueryDto) {
    return this.attendanceService.findAll(query);
  }

  @Get("today")
  @ApiOperation({ summary: "Get today's attendance" })
  @ApiResponse({ status: 200, description: "Today's attendance records" })
  async getToday(@Query("company_id") companyId: string) {
    return this.attendanceService.getToday(companyId);
  }

  @Get("employee/:employee_id")
  @ApiOperation({ summary: "Get employee attendance history" })
  @ApiResponse({ status: 200, description: "Employee attendance history" })
  async getEmployeeHistory(
    @Param("employee_id") employeeId: string,
    @Query("company_id") companyId: string
  ) {
    return this.attendanceService.getEmployeeHistory(companyId, employeeId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get attendance record by ID" })
  @ApiResponse({ status: 200, description: "Attendance record found" })
  @ApiResponse({ status: 404, description: "Attendance record not found" })
  async findOne(@Param("id") id: string) {
    return this.attendanceService.findOne(id);
  }
}
