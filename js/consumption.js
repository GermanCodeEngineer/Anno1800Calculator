// @ts-check
import { EPSILON, createFloatInput, NamedElement, Option } from './util.js'
import { Demand } from './production.js'
import { PopulationLevel, ResidenceBuilding } from './population.js';

/** @typedef {import('./types.js').AssetsMap} AssetsMap */
/** @typedef {import('./types.js').ConfigObject} ConfigObject */
/** @typedef {import('./types.js').Island} Island */
/** @typedef {import('./types.js').ListObject} ListObject */
/** @typedef {import('./types.js').AppWindow} AppWindow */

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

        const self = /** @type {this & { guid: string|number, level: PopulationLevel, product: any, checked: KnockoutObservable<boolean> }} */ (this);

        self.level = /** @type {any} */ (level);

        self.checked(true);

        self.product = /** @type {any} */ (assetsMap.get(Number(self.guid)));
        if (!self.product)
            throw `No Product ${self.guid}`;

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
        const self = /** @type {this & { level: PopulationLevel, isNoFactoryNeed: boolean, amount: KnockoutObservable<number>, residentsInputFactor: number, factor?: number, residentsInput?: KnockoutComputed<number>, product: { addNeed: (need: unknown) => void } }} */ (this);
        self.level = /** @type {any} */ (level);
        self.isNoFactoryNeed = true;

        self.amount = ko.observable(0);
        if (self.factor == null)
            self.factor = 1;
       

        self.residentsInput = ko.pureComputed(() => {
            return self.amount() * self.residentsInputFactor;
        });

        PopulationNeed.prototype.initAggregation.bind(this)(assetsMap);

        self.product.addNeed(this);
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
        const self = /** @type {this & { level: PopulationLevel & { guid: string|number, residence: any, residents: () => number, allResidences: Array<any> }, residentsUnlockCondition: number, unlockCondition?: { populationLevel: string|number, amount: number } }} */ (this);
        self.level = /** @type {any} */ (level);

        self.residentsUnlockCondition = 0;
        if (self.unlockCondition && self.unlockCondition.populationLevel == Number(self.level.guid))
            self.residentsUnlockCondition = self.unlockCondition.amount;

        this.initHidden(assetsMap);
        this.initAggregation(assetsMap);
    }

    /**
     * @param {AssetsMap} assetsMap
     */
    initHidden(assetsMap){
        const self = /** @type {this & { available: () => boolean, banned: KnockoutObservable<boolean>, isInactive: KnockoutObservable<boolean>, requiredBuildings?: Array<string|number>, residences?: Array<any>, level: PopulationLevel, residenceNeeds: KnockoutObservableArray<ResidenceNeed>, addResidenceNeed: (need: ResidenceNeed) => void, totalResidents?: KnockoutComputed<number>, hidden?: KnockoutComputed<boolean> }} */ (this);
        self.banned = ko.observable(false);
        self.isInactive = ko.observable(false);

        if (self.requiredBuildings) {
            self.residences = self.requiredBuildings.map((r) => assetsMap.get(Number(r)));

            self.hidden = ko.computed(() => {
                if (!self.available())
                    return true;

                for (var r of self.residences || [])
                    if (r.existingBuildings() > 0 || self.level.residence == r)
                        return false;

                return true;
            });
        } else {
            self.hidden = ko.computed(() => !self.available());
            self.residences = self.level.allResidences;
        }

        self.residenceNeeds = ko.observableArray(/** @type {Array<ResidenceNeed>} */ ([]));

        self.addResidenceNeed = function (need) {
            self.residenceNeeds.push(need);
        }

        self.totalResidents = ko.pureComputed(() => {
            var sum = 0;
            for (var n of self.residenceNeeds()) {
                sum += n.residents();
            }

            return sum;
        });
    }

    /**
     * @param {AssetsMap} assetsMap
     */
    initAggregation(assetsMap) {
        const self = /** @type {this & { level: PopulationLevel, checked: KnockoutObservable<boolean>, amount: KnockoutObservable<number>, notes: KnockoutObservable<string>, region: any, residenceNeeds: KnockoutObservableArray<ResidenceNeed>, residenceNeedsSubscription?: KnockoutComputed<number> }} */ (this);
        self.region = self.level.region;        

        self.checked = ko.observable(true);

        self.notes = ko.observable("");   

        self.residenceNeedsSubscription = ko.computed(() => {
            var sum = 0;
            for (var n of self.residenceNeeds())
                sum += n.amount();

            self.amount(sum);
            return sum;
        });

    }

    /**
     * @param {PopulationLevel} level
     * @param {AssetsMap} assetsMap
     */
    initBans(level, assetsMap) {
        const self = /** @type {this & { checked: KnockoutObservable<boolean>, banned: KnockoutObservable<boolean>, isInactive: KnockoutObservable<boolean>, locked?: KnockoutComputed<boolean>, unlockCondition?: { populationLevel: string|number, amount: number }, bannedSubscription?: KnockoutComputed<boolean> }} */ (this);
        if (self.unlockCondition) {
            var config = self.unlockCondition;
            self.locked = ko.computed(() => {
                if (!config || !view.settings.needUnlockConditions.checked())
                    return false;

                if (level.skyscraperLevels && level.hasSkyscrapers())
                    return false;

                const levelWithGuid = /** @type {any} */ (level);
                if (config.populationLevel != Number(levelWithGuid.guid)) {
                    var l = /** @type {any} */ (assetsMap.get(Number(config.populationLevel)));
                    return l.residents() < config.amount;
                }

                if (level.residents() >= config.amount)
                    return false;

                var residence = /** @type {any} */ (level.residence).upgradedBuilding;
                while (residence) {
                    var l = residence.populationLevel;
                    var amount = l.residents();
                    if (amount > 0)
                        return false;

                    residence = residence.upgradedBuilding;
                }

                return true;
            }).extend({ deferred: true }); // deferred necessary for updating population level residents

            self.isInactive(self.locked());
            self.locked.subscribe((locked) => self.isInactive(locked));
        }

        self.bannedSubscription = /** @type {KnockoutComputed<boolean>} */ (/** @type {unknown} */ (ko.computed(() => {
            var checked = self.checked();
            return self.banned(!!(!checked || self.locked && self.locked()));
        })));

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

