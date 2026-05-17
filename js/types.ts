// @ts-check

/** @typedef {Record<string, unknown>} ConfigObject */
/** @typedef {Record<string, unknown>} ParamsObject */
/** @typedef {Record<string, unknown>} JsonObject */
/** @typedef {Record<string, unknown>} ListObject */
/** @typedef {Map<number, unknown>} AssetsMap */

// NOTE: In TypeScript, use 'import type { ... } from ...' or direct type imports instead of @typedef JSDoc comments.
// /** @typedef {import('./world.ts').Island} Island */
// /** @typedef {import('./world.ts').Region} Region */
// /** @typedef {import('./world.ts').Session} Session */
// /** @typedef {import('./factories.ts').Consumer} Consumer */
// /** @typedef {import('./factories.ts').Factory} Factory */
// /** @typedef {import('./production.ts').Demand} Demand */
// /** @typedef {import('./consumption.ts').Need} Need */
// /** @typedef {import('./consumption.ts').PopulationNeed} PopulationNeed */
// /** @typedef {import('./consumption.ts').ResidenceEffect} ResidenceEffect */
// /** @typedef {import('./consumption.ts').ResidenceEffectCoverage} ResidenceEffectCoverage */
// /** @typedef {import('./consumption.ts').NewspaperNeedConsumptionEntry} NewspaperNeedConsumptionEntry */
// /** @typedef {import('./population.ts').PopulationLevel} PopulationLevel */
// /** @typedef {import('./population.ts').ResidenceBuilding} ResidenceBuilding */
// /** @typedef {import('./population.ts').Workforce} Workforce */

// /** @typedef {import('./util.ts').NamedElement} NamedElement */
// /** @typedef {import('./util.ts').Option} Option */
// /** @typedef {import('./util.ts').DLC} DLC */


/**
 * @typedef {Object} WithPropertiesBindingContext
 * @property {(accessor: WithPropertiesValueAccessor) => unknown} extend - Extends the current KO binding context.
 */
/** @typedef {() => Record<string, unknown>} WithPropertiesValueAccessor */
/**
 * @typedef {Object} ComponentInfo
 * @property {Element} element - Host element receiving the component template.
 * @property {Array<Node>} templateNodes - Template nodes supplied to the component.
 */
/**
 * @typedef {Object} AssetIconModel
 * @property {string=} icon - Optional icon URL.
 * @property {string|(() => string)} name - Display name or name observable/computed.
 */
/**
 * @typedef {Object} ExistingBuildingsAsset
 * @property {KnockoutObservable<number>} existingBuildings - Editable building count.
 * @property {number|string} guid - Unique identifier used for input element IDs.
 * @property {(() => boolean)=} canEdit - Optional editability guard.
 */
/**
 * @typedef {Object} TemplateAsset
 * @property {string|(() => string)} name - Visible asset name.
 * @property {number|string} guid - Asset identifier.
 * @property {unknown} [recipeName] - Optional recipe label.
 * @property {unknown} [getRegionExtendedName] - Optional helper for region-aware naming.
 * @property {unknown} [editable] - Optional editability flag/observable.
 * @property {unknown} [region] - Optional region reference.
 * @property {unknown} [hotkey] - Optional hotkey descriptor.
 */
/** @typedef {Object<string, Array<unknown>>} TemplateParentInstance */
/**
 * @typedef {Object} ProductionTreeNode
 * @property {Array<ProductionTreeNode>=} children - Child nodes in the production tree.
 */
/**
 * @callback InputTransformCallback
 * @param {number} valueToWrite - The normalized numeric value before assignment.
 * @param {number} currentValue - The currently stored numeric value.
 * @param {string|number} rawValue - Raw value from user input/binding.
 * @returns {number|null|undefined}
 */

/**
 * @typedef {Object} AppSettings
 * @property {KnockoutObservable<string>} language
 * @property {Array<Option>} options
 * @property {Array<Option>} serverOptions
 * @property {KnockoutObservable<string>} serverAddress
 */

/**
 * @typedef {Object} AppView
 * @property {AppSettings} settings
 * @property {Record<string, NamedElement>} texts
 * @property {Array<DLC>} dlcs
 * @property {Map<string, DLC>} dlcsMap
 * @property {{ get: (id: string, collapsed: boolean) => unknown }} [collapsibleStates]
 * @property {{ amount: () => number }} [newspaperConsumption]
 */

/**
 * @typedef {Window & {
 *   ACCURACY: number,
 *   formatNumber: (num: number|string, forceSign?: boolean) => string,
 *   formatPercentage: (num: number|string, forceSign?: boolean) => string,
 *   factoryReset: () => void,
 *   exportConfig: () => void,
 *   view: AppView,
 *   params: Record<string, unknown>,
 *   reader?: unknown
 * }} AppWindow
 */

export {};
