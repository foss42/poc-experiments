import { bootstrapAndDiscovery } from "./bootstrap-and-discovery"
import { initializeContract } from "./initialize-contract"
import { selectMetricContract } from "./select-metric-contract"
import { fetchSalesData } from "./fetch-sales-data"
import { visualizationContract } from "./visualization-contract"
import { pdfContract } from "./pdf-contract"
import { appsHostFlow } from "./apps-host-flow"
import type { ScenarioDefinition } from "../shared/scenario"

export const scenarios: ScenarioDefinition[] = [
  initializeContract,
  bootstrapAndDiscovery,
  selectMetricContract,
  fetchSalesData,
  visualizationContract,
  pdfContract,
  appsHostFlow,
]
