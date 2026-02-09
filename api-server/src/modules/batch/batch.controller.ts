import { Controller, Post, Get, Put, Body, Query, Param } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from "@nestjs/swagger";
import { BatchService } from "./batch.service";
import { BatchEmployeeImportDto, MarkSyncedDto } from "./dto/batch.dto";

@ApiTags("batch")
@Controller("batch")
export class BatchController {
  constructor(private readonly batchService: BatchService) {}

  @Post("employees/import")
  @ApiOperation({ summary: "Batch import employees from HR system" })
  @ApiResponse({ status: 201, description: "Import completed" })
  async importEmployees(@Body() batchDto: BatchEmployeeImportDto) {
    return this.batchService.importEmployees(batchDto);
  }

  @Post("attendance/export")
  @ApiOperation({ summary: "Export attendance to HR system" })
  @ApiQuery({ name: "company_id", required: true })
  @ApiResponse({ status: 201, description: "Export completed" })
  async exportAttendance(@Query("company_id") companyId: string) {
    return this.batchService.exportAttendance(companyId);
  }

  @Get("sync-logs")
  @ApiOperation({ summary: "Get sync history logs" })
  @ApiQuery({ name: "company_id", required: true })
  @ApiQuery({ name: "limit", required: false })
  @ApiResponse({ status: 200, description: "Sync logs retrieved" })
  async getSyncLogs(
    @Query("company_id") companyId: string,
    @Query("limit") limit?: number
  ) {
    return this.batchService.getSyncLogs(companyId, limit);
  }
}
