// @ts-check
import { EPSILON, createFloatInput, NamedElement, Option } from './util.ts'
import { Demand } from './production.ts'
import { PopulationLevel, ResidenceBuilding } from './population.ts';

/** @typedef {import('./types.ts').AssetsMap} AssetsMap */
/** @typedef {import('./types.ts').ConfigObject} ConfigObject */
/** @typedef {import('./types.ts').Island} Island */
/** @typedef {import('./types.ts').ListObject} ListObject */
/** @typedef {import('./types.ts').AppWindow} AppWindow */

/** @typedef {{ articleEffects: Array<{ ArticleValue: number }>, guid: string }} NewspaperEntryConfig */
/** @typedef {{ guid: string|number, residents: number, consumptionModifier: number, suppliedBy: Array<string|number> }} ResidenceEffectEntryData */
/** @typedef {{ effects: Array<ConfigObject>, residences: Array<string|number>, panoramaLevel?: number }} ResidenceEffectConfig */
/** @typedef {{ populationLevel: string|number, amount: number }} UnlockCondition */

var ko = require("knockout");

const appWindow = /** @type {AppWindow} */ (/** @type {unknown} */ (window));
const view = /** @type {any} */ (appWindow.view);

export class Need extends Demand {
    /**
     * @param {ConfigObject} config
     * @param {AssetsMap} assetsMap
     */
    constructor(config, assetsMap) {
        super(config, assetsMap);
        this.isNeed = true;
    }

}

export class ResidenceNeed {
    /**
     * @param {ResidenceBuilding} residence
     * @param {PopulationNeed} need
     */
    constructor(residence, need) {
        this.residence = residence;
        this.need = /** @type {PopulationNeed & {guid: number|string, tpmin: number, checked: () => boolean, addResidenceNeed: (need: ResidenceNeed) => void, isInactive: () => boolean, banned: () => boolean}} */ (/** @type {unknown} */ (need));
        const typedResidence = /** @type {ResidenceBuilding & {consumingLimit: () => number}} */ (/** @type {unknown} */ (this.residence));

        this.substitution = ko.observable(0);
        this.fulfillment = ko.observable(this.need.checked() ? 1 : 0);

        this.amount = ko.pureComputed(() => {
            var newspaper = (100 + view.newspaperConsumption.amount()) / 100;
            var total = typedResidence.consumingLimit() * this.need.tpmin * newspaper;
            return total * (Math.max(0, this.fulfillment() - this.substitution()));
        });

        this.need.addResidenceNeed(this);

        this.residentsPerHouse = ko.pureComputed(() => {
            var sum = this.residence.residentsPerNeed.get(this.need.guid) || 0;
            for (var c of this.residence.getConsumptionEntries(this.need)) {
                var coverage = c.residenceEffectCoverage.coverage();
                sum += coverage * Number(c.residenceEffectEntry.residents || 0);
            }
            return sum;
        });

        this.residents = ko.pureComputed(() => {
            var sum = this.residence.existingBuildings() * (this.residence.residentsPerNeed.get(this.need.guid) || 0);
            for (var c of this.residence.getConsumptionEntries(this.need)) {
                var coverage = c.residenceEffectCoverage.coverage();
                sum += Math.round(coverage * this.residence.existingBuildings()) * Number(c.residenceEffectEntry.residents || 0);
            }
            return Math.floor(sum * this.fulfillment());
        })
    }

    /**
     * @param {Map<number, ResidenceNeed>} residenceNeedsMap
     */
    initDependencies(residenceNeedsMap){
        this.residenceNeedsMap = residenceNeedsMap;
        this.substitutionSubscription = ko.computed(() => {
            /** @type {Array<ResidenceEffectEntryCoverage>} */
            var arr = this.residence.getConsumptionEntries(this.need);
            if(arr == null)
                return; // no effect for this product
            if (!this.residenceNeedsMap)
                return;

            var suppliedByFulfillment = 0;
            var modifier = 0;
            for (var c of arr){
                var coverage = c.residenceEffectCoverage.coverage();
                modifier += Number(c.residenceEffectEntry.consumptionModifier || 0) * coverage;
                for (var p of /** @type {Array<{ guid: string|number }>} */ (c.residenceEffectEntry.suppliedBy)){
                    var n = this.residenceNeedsMap.get(Number(p.guid));

                    if(n != null)
                        suppliedByFulfillment = Math.max(suppliedByFulfillment, coverage * n.fulfillment())
                }
            }

            this.substitution(Math.min(1, suppliedByFulfillment - modifier / 100));

            if (this.need.isInactive()) {
                this.fulfillment(0);
                return;
            }

            if (!this.need.banned()) {
                this.fulfillment(1);
                return;
            }

            this.fulfillment(suppliedByFulfillment);
        });

    }
}

export class PublicBuildingNeed extends Option {
    /**
     * @param {ConfigObject} config
     * @param {PopulationLevel} level
     * @param {AssetsMap} assetsMap
     */
    constructor(config, level, assetsMap) {
        super(config);

        this.level = level;
        this.checked(true);
        this.product = assetsMap.get(Number(this.guid));
        if (!this.product)
            throw `No Product ${this.guid}`;
        PopulationNeed.prototype.initHidden.bind(this)(assetsMap);
        this.initBans = PopulationNeed.prototype.initBans;
    }
}

export class NoFactoryNeed extends PublicBuildingNeed {
    /**
     * @param {ConfigObject} config
     * @param {PopulationLevel} level
     * @param {AssetsMap} assetsMap
     */
    constructor(config, level, assetsMap) {
        super(config, level, assetsMap);
        this.level = level;
        this.isNoFactoryNeed = true;
        this.amount = ko.observable(0);
        if (this.factor == null)
            this.factor = 1;
        this.residentsInput = ko.pureComputed(() => {
            return this.amount() * this.residentsInputFactor;
        });
        PopulationNeed.prototype.initAggregation.bind(this)(assetsMap);
        this.product.addNeed(this);
    }
}

export class PopulationNeed extends Need {
    /**
     * @param {ConfigObject} config
     * @param {PopulationLevel} level
     * @param {AssetsMap} assetsMap
     */
    constructor(config, level, assetsMap) {
        super(config, assetsMap);
        this.level = level;
        this.residentsUnlockCondition = 0;
        if (this.unlockCondition && this.unlockCondition.populationLevel == Number(this.level.guid))
            this.residentsUnlockCondition = this.unlockCondition.amount;
        this.initHidden(assetsMap);
        this.initAggregation(assetsMap);
    }

    /**
     * @param {AssetsMap} assetsMap
     */
    initHidden(assetsMap){
        this.banned = ko.observable(false);
        this.isInactive = ko.observable(false);
        if (this.requiredBuildings) {
            this.residences = this.requiredBuildings.map((r) => assetsMap.get(Number(r)));
            this.hidden = ko.computed(() => {
                if (!this.available())
                    return true;
                for (let r of this.residences || [])
                    if (r.existingBuildings() > 0 || this.level.residence == r)
                        return false;
                return true;
            });
        } else {
            this.hidden = ko.computed(() => !this.available());
            this.residences = this.level.allResidences;
        }
        this.residenceNeeds = ko.observableArray([]);
        this.addResidenceNeed = function (need) {
            this.residenceNeeds.push(need);
        };
        this.totalResidents = ko.pureComputed(() => {
            let sum = 0;
            for (let n of this.residenceNeeds()) {
                sum += n.residents();
            }
            return sum;
        });
    }

    /**
     * @param {AssetsMap} assetsMap
     */
    initAggregation(assetsMap) {
        this.region = this.level.region;
        this.checked = ko.observable(true);
        this.notes = ko.observable("");
        this.residenceNeedsSubscription = ko.computed(() => {
            let sum = 0;
            for (let n of this.residenceNeeds())
                sum += n.amount();
            this.amount(sum);
            return sum;
        });

    }

    /**
     * @param {PopulationLevel} level
     * @param {AssetsMap} assetsMap
     */
    initBans(level, assetsMap) {
        if (this.unlockCondition) {
            let config = this.unlockCondition;
            this.locked = ko.computed(() => {
                if (!config || !view.settings.needUnlockConditions.checked())
                    return false;
                if (level.skyscraperLevels && level.hasSkyscrapers())
                    return false;
                if (config.populationLevel != Number(level.guid)) {
                    let l = assetsMap.get(Number(config.populationLevel));
                    return l.residents() < config.amount;
                }
                if (level.residents() >= config.amount)
                    return false;
                let residence = level.residence.upgradedBuilding;
                while (residence) {
                    let l = residence.populationLevel;
                    let amount = l.residents();
                    if (amount > 0)
                        return false;
                    residence = residence.upgradedBuilding;
                }
                return true;
            }).extend({ deferred: true });
            this.isInactive(this.locked());
            this.locked.subscribe((locked) => this.isInactive(locked));
        }
        this.bannedSubscription = ko.computed(() => {
            let checked = this.checked();
            return this.banned(!!(!checked || this.locked && this.locked()));
        });

    }

    /**
     * @param {number} population
     */
    updateAmount(population) { }
}

export class NewspaperNeedConsumption {
    constructor() {
        this.selectedEffects = ko.observableArray();
        this.allEffects = /** @type {Array<ResidenceEffect | NewspaperNeedConsumptionEntry>} */ ([]);
        this.amount = ko.observable(100);
        this.selectedBuff = ko.observable(0);
        this.selectableBuffs = ko.observableArray();

        this.updateBuff();

        this.selectedEffects.subscribe(() => this.updateBuff());

        this.selectedEffects.subscribe(() => {
            if (this.selectedEffects().length > 3)
                this.selectedEffects.splice(0, 1)[0].checked(false);
        });

        this.amount = ko.computed(() => {
            var sum = 0;
            for (var effect of this.selectedEffects()) {
                sum += Math.ceil(effect.amount * (1 + parseInt(String(this.selectedBuff())) / 100));
            }

            return sum;
        });
    }

    /**
     * @param {ResidenceEffect|NewspaperNeedConsumptionEntry} effect
     */
    add(effect) {
        this.allEffects.push(effect);
        /** @type {NewspaperNeedConsumptionEntry} */ (effect).checked.subscribe((checked) => {
            var idx = this.selectedEffects.indexOf(effect);
            if (checked && idx != -1 || !checked && idx == -1)
                return;

            if (checked)
                this.selectedEffects.push(effect);
            else
                this.selectedEffects.remove(effect);
        });
    }

    updateBuff() {
        var influenceCosts = 0;
        for (var effect of this.selectedEffects()) {
            influenceCosts += effect.influenceCosts;
        }

        var threeSelected = this.selectedEffects().length >= 3;
        var selectedBuff = this.selectedBuff();

        this.selectableBuffs.removeAll();
        if (influenceCosts < 50)
            this.selectableBuffs.push(0);
        if (influenceCosts < 150 && (!threeSelected || !this.selectableBuffs().length))
            this.selectableBuffs.push(7);
        if (influenceCosts < 300 && (!threeSelected || !this.selectableBuffs().length))
            this.selectableBuffs.push(15);
        if (!threeSelected || !this.selectableBuffs().length)
            this.selectableBuffs.push(25);

        if (this.selectableBuffs.indexOf(selectedBuff) == -1)
            this.selectedBuff(this.selectableBuffs()[0]);
        else
            this.selectedBuff(selectedBuff);
    }

    apply() {

    }
}

export class NewspaperNeedConsumptionEntry extends Option {
    /**
     * @param {ConfigObject} config
     */
    constructor(config) {
        super(config);

        this.lockDLCIfSet(/** @type {KnockoutObservable<any>} */ (this.checked));

        this.amount = /** @type {NewspaperEntryConfig} */ (config).articleEffects[0].ArticleValue;

        this.visible = ko.pureComputed(() => this.available())
    }
}

class ResidenceEffectEntry {
    /**
     * @param {ConfigObject} config
     * @param {AssetsMap} assetsMap
     */
    constructor(config, assetsMap) {
        const entry = /** @type {ResidenceEffectEntryData} */ (config);
        this.guid = parseInt(String(entry.guid));
        this.product = assetsMap.get(this.guid);
        this.consumptionModifier = entry.consumptionModifier;
        this.residents = entry.residents;
        this.suppliedBy = entry.suppliedBy.map((/** @type {string|number} */ e) => assetsMap.get(Number(e)));
    }
}

export class ResidenceEffect extends NamedElement {
    /**
     * @param {ConfigObject} config
     * @param {AssetsMap} assetsMap
     */
    constructor(config, assetsMap) {
        super(config);
        const effectConfig = /** @type {ResidenceEffectConfig} */ (config);
        this.entries = effectConfig.effects.map((/** @type {ConfigObject} */ e) => new ResidenceEffectEntry(e, assetsMap));
        this.effectsPerNeed = new Map();

        for (var effect of this.entries) {
            this.effectsPerNeed.set(effect.guid, effect);
        }

        this.residences = [];
        for (var residence of effectConfig.residences) {
            let r = /** @type {any} */ (assetsMap.get(Number(residence)));
            this.residences.push(r);
            r.addEffect(this);
        }
    }

    /**
     * Expected usage: array.sort((a,b) => a.compare(b))
     * @param {ResidenceEffect} other
     */
    compare(other) {
        const self = /** @type {ResidenceEffect & { panoramaLevel?: number, residences: Array<{ populationLevel: { guid: string|number } }> }} */ (this);
        const otherEffect = /** @type {ResidenceEffect & { panoramaLevel?: number, residences: Array<{ populationLevel: { guid: string|number } }> }} */ (other);
        if (self.panoramaLevel != null && otherEffect.panoramaLevel != null)
            return 10 * (Number(otherEffect.residences[0].populationLevel.guid) - Number(self.residences[0].populationLevel.guid)) + otherEffect.panoramaLevel - self.panoramaLevel;

        if (self.panoramaLevel != null)
            return -1000;

        if (otherEffect.panoramaLevel != null)
            return 1000;

        const selfName = typeof self.name === "function" ? self.name() : self.name;
        const otherName = typeof otherEffect.name === "function" ? otherEffect.name() : otherEffect.name;
        return String(selfName).localeCompare(String(otherName));
    }
}

export class ResidenceEffectCoverage {
    /**
     * @param {ResidenceBuilding} residence
     * @param {ResidenceEffect} residenceEffect
        * @param {number} coverage
     */
    constructor(residence, residenceEffect, coverage = 1) {
        this.residence = residence;
        this.residenceEffect = residenceEffect;
        this.coverage = ko.observable(coverage);
    }
}

export class ResidenceEffectEntryCoverage{
    /**
     * @param {ResidenceEffectCoverage} residenceEffectCoverage
    * @param {ResidenceEffectEntry} residenceEffectEntry
     */
        constructor(residenceEffectCoverage, residenceEffectEntry) {
        this.residenceEffectCoverage = residenceEffectCoverage;
        this.residenceEffectEntry = residenceEffectEntry;
    }

    getResidents() {
        return this.residenceEffectCoverage.coverage() * this.residenceEffectEntry.residents;
    }
}

export class RecipeList extends NamedElement {
    /**
     * @param {ListObject} list
     * @param {AssetsMap} assetsMap
     * @param {Island} island
     */
    constructor(list, assetsMap, island) {
        super(list);

        this.island = island;

        if (list.region)
            this.region = /** @type {any} */ (assetsMap.get(Number(list.region)));

        this.recipeBuildings = /** @type {Array<string|number>} */ (list.recipeBuildings).map((/** @type {string|number} */ r) => {
            var a = /** @type {any} */ (assetsMap.get(Number(r)));
            a.recipeList = this;
            return a;
        });

        this.unusedRecipes = ko.computed(() => {
            var result = [];
            for (var recipe of this.recipeBuildings) {
                if (!recipe.existingBuildings())
                    result.push(recipe);
            }

            return result;
        });
        this.selectedRecipe = ko.observable(this.recipeBuildings[0]);

        this.canCreate = ko.pureComputed(() => {
            return this.unusedRecipes().length && this.selectedRecipe();
        });

        this.visible = ko.pureComputed(() => {
            if (!this.available())
                return false;

            return this.unusedRecipes().length != 0;
        });
    }

    create() {
        if (!this.canCreate())
            return;

        this.selectedRecipe().existingBuildings(1);
    }
}

