/**
 * app/services — RAÍZ DE COMPOSICIÓN.
 *
 * Único lugar donde la capa de aplicación se "cablea" con los adaptadores
 * concretos de infraestructura. Si mañana se cambia Supabase por otra cosa, o
 * se migra a React Native, solo cambia este archivo y los adaptadores.
 */
import { authGateway } from '../infrastructure/supabase/authGateway.js';
import { profileRepository } from '../infrastructure/supabase/profileRepository.js';
import { dayRepository } from '../infrastructure/supabase/dayRepository.js';
import { blockRepository } from '../infrastructure/supabase/blockRepository.js';
import { groqGateway } from '../infrastructure/ai/groqGateway.js';
import { createPlanningService } from '../application/planningService.js';
import { createExecutionService } from '../application/executionService.js';
import { createSummaryService } from '../application/summaryService.js';

const deps = {
  dayRepo: dayRepository,
  blockRepo: blockRepository,
  aiGateway: groqGateway,
};

export const services = {
  auth: authGateway,
  profile: profileRepository,
  dayRepo: dayRepository,
  blockRepo: blockRepository,
  planning: createPlanningService(deps),
  execution: createExecutionService(deps),
  summary: createSummaryService(deps),
};
