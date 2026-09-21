export type {
  DayBar,
  FinanceLine,
  ReportPeriod,
  TopProduct,
  Report,
  TrendTone,
} from './reportsTypes';
export { PERIODS, periodLabel } from './reportsTypes';
export {
  MAX_RANGE_DAYS,
  eachDay,
  monthTitle,
  normalizeRange,
  rangeLabel,
  resolveRange,
  type DateRange,
} from './reportsPeriod';
export { toBarras } from './reportsAdapter';
export { reportFileName, reportHtml, reportSheets } from './reportsExport';
export { shareReportPdf, shareReportXlsx, type ShareResult } from './reportsShare';
export { reportsKeys, useReports } from './useCases/useReports';
