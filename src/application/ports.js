/**
 * application/ports — contratos (puertos) de la capa de aplicación.
 *
 * Estos `typedef` documentan las interfaces que la capa de aplicación espera.
 * Los casos de uso dependen de ESTAS formas, no de Supabase ni de Groq
 * (Principio de Inversión de Dependencias). Los adaptadores concretos viven en
 * `infrastructure/` y se inyectan en la raíz de composición `app/services.js`.
 *
 * Gracias a esto, migrar a React Native (fase 2) solo requiere escribir nuevos
 * adaptadores: la capa de dominio y de aplicación no cambia.
 *
 * @typedef {Object} AuthGateway
 * @property {() => Promise<object|null>} getSession
 * @property {(cb: (session: object|null) => void) => () => void} onAuthChange
 * @property {(c: {email,password,fullName}) => Promise<object|null>} signUp
 * @property {(c: {email,password}) => Promise<object>} signIn
 * @property {() => Promise<void>} signOut
 *
 * @typedef {Object} ProfileRepository
 * @property {(userId: string) => Promise<object|null>} get
 * @property {(userId: string, patch: object) => Promise<object>} update
 *
 * @typedef {Object} DayRepository
 * @property {(userId, dateKey) => Promise<object|null>} getByDate
 * @property {(userId, dateKey) => Promise<object>} ensure
 * @property {(dayId, patch) => Promise<object>} update
 * @property {(userId, limit?) => Promise<object[]>} recent
 *
 * @typedef {Object} BlockRepository
 * @property {(dayId) => Promise<object[]>} listByDay
 * @property {(block) => Promise<object>} create
 * @property {(blockId, patch) => Promise<object>} update
 * @property {(blockId) => Promise<void>} remove
 * @property {(items) => Promise<void>} savePositions
 * @property {(rows) => Promise<object[]>} createBreaks
 * @property {(blockId) => Promise<object[]>} listBreaksByBlock
 * @property {(blockIds) => Promise<object[]>} listBreaksByBlocks
 * @property {(breakId, status) => Promise<void>} resolveBreak
 *
 * @typedef {Object} AiGateway
 * @property {(input) => Promise<{plan, source}>} generateSegmentPlan
 * @property {(metrics) => Promise<{note, source}>} generateDaySummary
 */

export {};
