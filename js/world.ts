// @ts-check
import { ALL_ISLANDS, setDefaultFixedFactories, NamedElement, Option } from './util.ts'
import { texts } from './i18n.ts'
import type { AssetsMap, ConfigObject, ParamsObject, AppWindow } from './types.ts'

// NOTE: In TypeScript, use 'import type { ... } from ...' or direct type imports instead of @typedef JSDoc comments.
// /** @typedef {import('./types.ts').AssetsMap} AssetsMap */
// ...existing code...
/** @typedef {{name: string, session: Session}} IslandNameCandidate */

import { CommuterWorkforce, Workforce, ResidenceBuilding, PopulationLevel } from './population.ts'
import { ResidenceEffect, RecipeList } from './consumption.ts'
import { NoFactoryProduct, Product, MetaProduct, Item, ProductCategory } from './production.ts'
import { PublicConsumerBuilding, Module, Factory, Consumer, Buff, PowerPlant } from './factories.ts'
import { ContractManager } from './trade.ts'
import {ResidenceEffectView} from './views.ts'

var ko = require("knockout");

const appWindow = /** @type {AppWindow} */ (/** @type {unknown} */ (window));
const view = /** @type {any} */ (appWindow.view);
const globals = /** @type {any} */ (globalThis);

class LocalStorageProxy {
    /**
     * @param {string} key
     */
    constructor(key) {
        this.storageKey = key;
        var text = localStorage.getItem(key);
        this.json = text ? JSON.parse(text) : {};
        this.map = new Map();

        this.savingScheduled = false;

        this.length = 0;
        for (var attr in this.json) {
            this.length = this.length + 1;
            this.map.set(attr, this.json[attr]);
        }
    }

    /**
     * @param {string} itemKey
     * @param {string|number|boolean} value
     */
    setItem(itemKey, value) {
        this.map.set(itemKey, value);

        if (this.json[itemKey] == null)
            this.length = this.length + 1;

        this.json[itemKey] = value;
        this.save();
    }

    /**
     * @param {string} itemKey
     */
    getItem(itemKey) {
        return this.map.get(itemKey);
    }

    /**
     * @param {string} itemKey
     */
    removeItem(itemKey) {
        this.map.delete(itemKey);

        if (this.json[itemKey] != null)
            this.length = this.length - 1;

        delete this.json[itemKey];
        this.save();
    }

    /**
     * @param {number} index
     */
    key(index) {
        var i = 0;
        for (let attr in this.json)
            if (i++ == index)
                return attr;

        return null;
    }

    /**
     * @param {string} key
     */
    updateKey(key) {
        localStorage.removeItem(this.storageKey);
        this.storageKey = key;
        this.save();
    }

    clear() {
        this.json = {}
        this.map = new Map();
        this.save();
        this.length = 0;
    }

    save() {
        if (this.savingScheduled)
            return;

        this.savingScheduled = true;
        setTimeout(() => {
            this.savingScheduled = false;
            localStorage.setItem(this.storageKey, JSON.stringify(this.json, null, 4));            
        }, 0);
    }
}

export class Region extends NamedElement { }
export class Session extends NamedElement {
    /**
     * @param {ConfigObject} config
     * @param {AssetsMap} assetsMap
     */
    constructor(config, assetsMap) {
        super(config);

        this.region = assetsMap.get(/** @type {number} */ (config.region));
        this.islands = ko.observableArray(/** @type {Array<Island>} */ ([]));
        this.lockDLCIfSet(ko.pureComputed(() => this.islands().length))

        this.workforce = [];

        const workforceConfigs = Array.isArray(config.workforce) ? config.workforce : [];
        for (let workforce of workforceConfigs) {
            let w = new CommuterWorkforce(workforce, this);
            this.workforce.push(w);
        }
    }

    /**
     * @param {Island} isl
     */
    addIsland(isl) {
        this.islands.push(isl);
    }

    /**
     * @param {Island} isl
     */
    deleteIsland(isl) {
        this.islands.remove(isl);
    }
}

export class Island {
    /**
     * @param {ParamsObject} params
     * @param {Storage} localStorage
     * @param {boolean} isNew
     * @param {Session} [session]
     */
    constructor(params, localStorage, isNew, session = undefined) {
        if (localStorage instanceof Storage) {
            this.name = ko.observable(localStorage.storageKey);
            this.name.subscribe(name => this.storage.updateKey(name));
            this.isAllIslands = function () { return false; };
        } else {
            this.name = ko.computed(() => appWindow.view.texts.allIslands.name());
            this.isAllIslands = function () { return true; };
        }
        this.storage = localStorage;

        this.session = session || this.storage.getItem("session");
        this.session = this.session instanceof Session ? this.session : view.assetsMap.get(this.session);
        this.region = this.session ? this.session.region : null;

        this.storage.setItem("session", this.session ? this.session.guid : null);

        var assetsMap = new Map();
        for (var key of view.assetsMap.keys())
            assetsMap.set(key, view.assetsMap.get(key));

        this.sessionExtendedName = ko.pureComputed(() => {
            if (!this.session)
                return this.name();

            return `${this.session.name()} - ${this.name()}`;
        });

        // procedures to persist inputs
        var persistBool, persistInt, persistFloat, persistString;

        if (localStorage) {
            persistBool = (
                /** @type {any} */ obj,
                /** @type {string} */ attributeName,
                /** @type {string|undefined} */ storageName = undefined
            ) => {

                var attr = obj[attributeName];
                if (attr) {
                    let id = storageName ? storageName : (obj.guid + "." + attributeName);
                    const stored = localStorage.getItem(id);
                    if (stored != null)
                        attr(parseInt(stored));

                    attr.subscribe((/** @type {any} */ val) => localStorage.setItem(id, String(val ? 1 : 0)));
                }
            }

            persistInt = (
                /** @type {any} */ obj,
                /** @type {string} */ attributeName,
                /** @type {string|undefined} */ storageName = undefined
            ) => {

                var attr = obj[attributeName];
                if (attr) {
                    let id = storageName ? storageName : (obj.guid + "." + attributeName);
                    const stored = localStorage.getItem(id);
                    if (stored != null)
                        attr(parseInt(stored));

                    attr.subscribe((/** @type {any} */ val) => {
                        val = parseInt(val);

                        if (val == null || !isFinite(val) || isNaN(val))
                            return;

                        localStorage.setItem(id, String(val));
                    });
                }
            }

            persistFloat = (
                /** @type {any} */ obj,
                /** @type {string} */ attributeName,
                /** @type {string|undefined} */ storageName = undefined
            ) => {

                var attr = obj[attributeName];
                if (attr) {
                    let id = storageName ? storageName : (obj.guid + "." + attributeName);
                    const stored = localStorage.getItem(id);
                    if (stored != null)
                        attr(parseFloat(stored));

                    attr.subscribe((/** @type {any} */ val) => {
                        val = parseFloat(val);

                        if (val == null || !isFinite(val) || isNaN(val))
                            return;

                        localStorage.setItem(id, String(val));
                    });
                }
            }

            persistString = (
                /** @type {any} */ obj,
                /** @type {string} */ attributeName,
                /** @type {string|undefined} */ storageName = undefined
            ) => {

                var attr = obj[attributeName];
                if (attr) {
                    let id = storageName ? storageName : (obj.guid + "." + attributeName);
                    if (localStorage.getItem(id) != null)
                        attr(localStorage.getItem(id));

                    attr.subscribe((/** @type {any} */ val) => localStorage.setItem(id, val));
                }
            }

        } else {
            persistBool = persistFloat = persistInt = persistString = () => { };
        }

        // objects

        this.populationLevels = [];
        this.residenceBuildings = [];
        this.powerPlants = [];
        this.publicServices = [];
        this.publicRecipeBuildings = [];
        this.consumers = [];
        this.factories = [];
        this.categories = [];
        this.multiFactoryProducts = [];
        this.items = [];
        this.replaceInputItems = [];
        this.extraGoodItems = [];
        this.recipeLists = [];
        this.workforce = [];

        this.commuterPier = new Option({
            name: "Commuter Pier",
            locaText: texts.commuterPier
        });
        this.commuterPier.visible(this.region && (this.region.guid === 5000000 || this.region.guid === 5000001));
        persistBool(this.commuterPier, "checked", "settings.commuterPier.checked");

        /** @param {unknown} value */
        const asArray = value => Array.isArray(value) ? value : [];
        /** @param {unknown} value */
        const withGuid = value => /** @type {{guid: number|string}} */ (/** @type {unknown} */ (value));

        for (let workforce of asArray(params.workforce)) {
            let w = new Workforce(workforce, assetsMap);
            assetsMap.set(withGuid(w).guid, w);
            this.workforce.push(w);
        }

        for (let consumer of asArray(params.powerPlants)) {

            let f = new PowerPlant(consumer, assetsMap, this);
            assetsMap.set(withGuid(f).guid, f);
            this.consumers.push(f);
            this.powerPlants.push(f);

            persistInt(f, "percentBoost");
            // values for existingBuildings are read from localstorage later, after products are referenced
        }

        for (let consumer of asArray(params.publicServices)) {

            let f = new PublicConsumerBuilding(consumer, assetsMap, this);
            assetsMap.set(withGuid(f).guid, f);
            this.consumers.push(f);
            this.publicServices.push(f);

            // values for existingBuildings are read from localstorage later, after products are referenced
        }

        for (let consumer of asArray(params.publicRecipeBuildings)) {

            let f = new PublicConsumerBuilding(consumer, assetsMap, this);
            assetsMap.set(withGuid(f).guid, f);
            this.consumers.push(f);
            this.publicRecipeBuildings.push(f);

            // values for existingBuildings are read from localstorage later, after products are referenced
        }

        for (let list of asArray(params.recipeLists)) {
            if (!list.region || !this.region || list.region === this.region.guid)
                this.recipeLists.push(new RecipeList(list, assetsMap, this));
        }

        for (let consumer of asArray(params.modules)) {
            let f = new Module(consumer, assetsMap, this);
            assetsMap.set(withGuid(f).guid, f);
            this.consumers.push(f);
        }

        for (let buff of asArray(params.palaceBuffs)) {
            let f = new Buff(buff, assetsMap);
            assetsMap.set(withGuid(f).guid, f);
        }

        for (let buff of asArray(params.setBuffs)) {
            let f = new Buff(buff, assetsMap);
            assetsMap.set(withGuid(f).guid, f);
        }

        for (let factory of asArray(params.factories)) {
            let f = new Factory(factory, assetsMap, this);
            const factoryGuid = withGuid(f).guid;
            assetsMap.set(factoryGuid, f);
            this.consumers.push(f);
            this.factories.push(f);

            if (f.clipped)
                persistBool(f, "clipped", `${factoryGuid}.clipped.checked`)

            // set moduleChecked before boost, otherwise boost would be increased
            persistBool(f, "moduleChecked", `${factoryGuid}.module.checked`);
            persistBool(f, "fertilizerModuleChecked", `${factoryGuid}.fertilizerModule.checked`);
            persistBool(f, "palaceBuffChecked", `${factoryGuid}.palaceBuff.checked`);
            persistBool(f, "setBuffChecked", `${factoryGuid}.setBuff.checked`);
            persistInt(f, "percentBoost");
            persistBool(f.extraGoodProductionList, "checked", `${factoryGuid}.extraGoodProductionList.checked`);
        }

        let products = [];
        let noFactoryProducts = [];
        for (let product of asArray(params.products)) {
            if (product.residentsInputFactor) {
                let p = new NoFactoryProduct(product, assetsMap);
                noFactoryProducts.push(p);
                assetsMap.set(withGuid(p).guid, p);
            } else if (product.producers && product.producers.length) {
                let p = new Product(product, assetsMap);
                const productGuid = withGuid(p).guid;

                products.push(p);
                assetsMap.set(productGuid, p);

                if (p.factories.length > 1)
                    this.multiFactoryProducts.push(p);

                if (localStorage) {
                    let id = productGuid + ".fixedFactory";
                    const storedFactory = localStorage.getItem(id);
                    if (storedFactory != null)
                        p.fixedFactory(assetsMap.get(parseInt(storedFactory)));
                    p.fixedFactory.subscribe(
                        f => f ? localStorage.setItem(id, String(withGuid(f).guid)) : localStorage.removeItem(id));

                }
            } else {
                let p = new MetaProduct(product, assetsMap);

                assetsMap.set(withGuid(p).guid, p);
            }
        }

        if (isNew)
            setDefaultFixedFactories(assetsMap);

        for (let item of asArray(params.items)) {
            let i = new Item(item, assetsMap, this.region);
            const itemGuid = withGuid(i).guid;
            if (!i.factories.length)
                continue;  // Affects no factories in this region

            assetsMap.set(itemGuid, i);
            this.items.push(i);

            if (i.replacements)
                this.replaceInputItems.push(i);

            if ((/** @type {{additionalOutputs?: unknown}} */ (/** @type {unknown} */ (i))).additionalOutputs)
                this.extraGoodItems.push(i);

            if (localStorage) {
                let oldId = itemGuid + ".checked";
                var oldChecked = false;
                const storedOldChecked = localStorage.getItem(oldId);
                if (storedOldChecked != null)
                    oldChecked = !!parseInt(storedOldChecked);

                for (var equip of i.equipments) {
                    let id = `${withGuid(equip.factory).guid}[${itemGuid}].checked`;

                    if (oldChecked)
                        equip.checked(true);

                    const storedEquipChecked = localStorage.getItem(id);
                    if (storedEquipChecked != null)
                        equip.checked(parseInt(storedEquipChecked));

                    equip.checked.subscribe((/** @type {any} */ val) => localStorage.setItem(id, String(val ? 1 : 0)));
                }

                localStorage.removeItem(oldId);
            }
        }

        this.extraGoodItems.sort((a, b) => a.name().localeCompare(b.name()));
        view.settings.language.subscribe(() => {
            this.extraGoodItems.sort((a, b) => a.name().localeCompare(b.name()));
        });

        // must be set after items so that extraDemand is correctly handled
        this.consumers.forEach(f => {
            f.createWorkforceDemand(assetsMap);
            f.referenceProducts(assetsMap);
        });

        for (var building of asArray(params.residenceBuildings)) {
            var b = new ResidenceBuilding(building, assetsMap, this);
            assetsMap.set(withGuid(b).guid, b);
            this.residenceBuildings.push(b);
        }

        for (let level of asArray(params.populationLevels)) {

            let l = new PopulationLevel(level, assetsMap, this);
            assetsMap.set(withGuid(l).guid, l);
            this.populationLevels.push(l);
        }

        for (var b of this.residenceBuildings) {
            const buildingWithUpgrade = /** @type {{upgradedBuilding?: number|string}} */ (/** @type {unknown} */ (b));
            if (buildingWithUpgrade.upgradedBuilding)
                buildingWithUpgrade.upgradedBuilding = assetsMap.get(parseInt(String(buildingWithUpgrade.upgradedBuilding)));
        }

        for (let l of this.populationLevels)
            l.initBans(assetsMap);  // must be executed before loading the values for residence buildings - otherwise banned needs are activated which activate dlcs

        for (let effect of asArray(params.residenceEffects)) {
            let e = new ResidenceEffect(effect, assetsMap);
            const effectGuid = withGuid(e).guid;

            assetsMap.set(effectGuid, e);
            if (localStorage)
                localStorage.removeItem(`${effectGuid}.checked`);
        }

        for (let b of this.residenceBuildings) {
            {
                let id = `${withGuid(b).guid}.effectCoverage`;
                const storedCoverage = localStorage.getItem(id);
                if (storedCoverage != null)
                    b.applyEffects(JSON.parse(storedCoverage));

                b.effectCoverage.subscribe(() => {
                    localStorage.setItem(id, JSON.stringify(b.serializeEffects()));
                });
            }
            persistInt(b, "existingBuildings");
            persistFloat(b, "limitPerHouse");
            persistInt(b, "limit");
            persistBool(b, "fixLimitPerHouse");
        }

        for (let l of this.populationLevels) {
            const levelGuid = withGuid(l).guid;
            persistInt(l, "existingBuildings");
            persistFloat(l, "limitPerHouse");
            persistFloat(l, "amountPerHouse");
            persistInt(l, "limit");
            persistInt(l, "amount");
            persistBool(l, "fixLimitPerHouse");
            persistBool(l, "fixAmountPerHouse");
            persistString(l, "notes");

            for (let n of l.needs) {
                persistBool(n, "checked", `${levelGuid}[${withGuid(n).guid}].checked`);
                persistFloat(n, "percentBoost", `${levelGuid}[${withGuid(n).guid}].percentBoost`);
                persistString(n, "notes", `${levelGuid}[${withGuid(n).guid}].notes`);
            }

            for (let n of l.buildingNeeds) {
                persistBool(n, "checked", `${levelGuid}[${withGuid(n).guid}].checked`);
            }

        }

        for (var category of asArray(params.productFilter)) {
            let c = new ProductCategory(category, assetsMap);
            assetsMap.set(withGuid(c).guid, c);
            this.categories.push(c);
        }

        for (let p of this.categories[1].products) {
            if (p)
                for (let b of p.factories) {
                    if (b) {
                        b.editable(true);
                    }
                }
        }

        for (let b of this.publicRecipeBuildings) {
            const recipeBuilding = /** @type {{goodConsumptionUpgrade?: number|string}} */ (/** @type {unknown} */ (b));
            if (recipeBuilding.goodConsumptionUpgrade)
                recipeBuilding.goodConsumptionUpgrade = assetsMap.get(recipeBuilding.goodConsumptionUpgrade);

            (/** @type {{recipeName?: unknown}} */ (/** @type {unknown} */ (b))).recipeName = ko.computed(() => {
                return b.name().split(':').slice(-1)[0].trim();
            });
        }

        for (let f of this.consumers) {
            persistInt(f, "existingBuildings");
            persistString(f, "notes");
            if (f.workforceDemand)
                persistInt(f.workforceDemand, "percentBoost", `${withGuid(f).guid}.workforce.percentBoost`);
        }

        this.workforce = this.workforce.filter(w => w.demands().length);

        this.assetsMap = assetsMap;
        this.products = products;
        this.noFactoryProducts = noFactoryProducts;

        this.top2Population = ko.computed(() => {
            /**
             * @param {PopulationLevel} a
             * @param {PopulationLevel} b
             */
            var comp = (a, b) => b.residents() - a.residents();

            return [...this.populationLevels].sort(comp).slice(0, 2).filter(l => l.residents());
        });

        this.top5Factories = ko.computed(() => {
            var useBuildings = view.settings.missingBuildingsHighlight.checked();
            var comp = useBuildings
                ? ((/** @type {Factory} */ a, /** @type {Factory} */ b) => b.existingBuildings() - a.existingBuildings())
                : ((/** @type {Factory} */ a, /** @type {Factory} */ b) => b.buildings() - a.buildings());

            return [...this.factories].sort(comp).slice(0, 5).filter(f => useBuildings ? f.existingBuildings() : f.buildings());
        });

        if (params.tradeContracts && (!this.region || this.region.guid == 5000000))
            this.contractManager = new ContractManager(this);

        if (this.session)
            this.session.addIsland(this);

        this.workforceSectionVisible = ko.pureComputed(() => {
            for (var w of this.commuterPier.checked() ? this.session.workforce : this.workforce)
                if (w.visible())
                    return true;

            return false;
        });

        this.publicBuildingsSectionVisible = ko.pureComputed(() => {
            for (let b of this.powerPlants)
                if (b.visible())
                    return true;

            for (let b of this.publicServices)
                if (b.visible())
                    return true;

            for (let b of this.noFactoryProducts)
                if (b.visible())
                    return true;

            for (let b of this.publicRecipeBuildings)
                if (b.visible())
                    return true;

            for (let b of this.recipeLists)
                if (b.visible())
                    return true;

            return false;
        });
    }

    reset() {
        if (this.commuterPier)
            this.commuterPier.checked(false);

        {
            var deletedRoutes = view.tradeManager.routes().filter((/** @type {any} */ r) => r.to === this || r.from === this);
            deletedRoutes.forEach((/** @type {any} */ r) => view.tradeManager.remove(r));
        }

        {
            var deletedRoutes = view.tradeManager.npcRoutes().filter((/** @type {any} */ r) => r.to === this);
            deletedRoutes.forEach((/** @type {any} */ r) => view.tradeManager.remove(r));
        }

        this.assetsMap.forEach(a => {
            if (a instanceof Option)
                a.checked(false);
            if (a instanceof Product)
                a.fixedFactory(null);
            if (a instanceof Consumer) {
                a.existingBuildings(0);
                if (a.workforceDemand && a.workforceDemand.percentBoost)
                    a.workforceDemand.percentBoost(100);
                const boostedConsumer = /** @type {Consumer & {percentBoost?: KnockoutObservable<number>}} */ (/** @type {unknown} */ (a));
                if (boostedConsumer.percentBoost)
                    boostedConsumer.percentBoost(100);
            }
            if (a instanceof Factory) {
                const dynamicFactory = /** @type {Factory & Record<string, unknown>} */ (/** @type {unknown} */ (a));
                if (a.clipped)
                    a.clipped(false);
                for (var m of ["module", "fertilizerModule"]) {
                    var checked = dynamicFactory[m + "Checked"];
                    if (checked)
                        /** @type {(value: boolean) => void} */ (checked)(false);
                }
                if (a.palaceBuffChecked)
                    a.palaceBuffChecked(false);
                if (a.setBuffChecked)
                    a.setBuffChecked(false);
                a.percentBoost(100);
                a.extraGoodProductionList.checked(true);
            }
            if (a instanceof ResidenceBuilding) {
                a.existingBuildings(0);
                a.applyEffects({});
            }
            if (a instanceof PopulationLevel) {
                 for (var n of (a.needs || []))
                    if (n.notes)
                        n.notes("");
            }
            if (a instanceof Item) {
                a.checked(false);
                for (var i of a.equipments)
                    i.checked(false);
            }
            if (a.notes)
                a.notes("");
        });

        setDefaultFixedFactories(this.assetsMap);

        this.populationLevels.forEach(l => l.needs.forEach(n => {
            if (n.checked)
                if (n.isBonusNeed || n.excludePopulationFromMoneyAndConsumptionCalculation)
                    n.checked(false);
                else
                    n.checked(true);
        }));

        this.populationLevels.forEach(l => l.buildingNeeds.forEach(n => {
            if (n.checked)
                if (n.isBonusNeed || n.excludePopulationFromMoneyAndConsumptionCalculation)
                    n.checked(false);
                else
                    n.checked(true);
        }));
    }

    prepareResidenceEffectView() {
        view.selectedResidenceEffectView(new ResidenceEffectView(this.residenceBuildings));
    }
}

export class IslandManager {
    /**
     * @param {ParamsObject} params
     * @param {boolean} isFirstRun
     */
    constructor(params, isFirstRun = false) {
        let islandKey = "islandName";
        let islandsKey = "islandNames";

        // used for creation and renaming
        this.islandNameInput = ko.observable();
        this.availableSessions = ko.pureComputed(() => view.sessions.filter((/** @type {Session} */ s) => s.available()))
        this.sessionInput = ko.observable(view.sessions[0]);
        this.params = params;
        this.islandCandidates = ko.observableArray();
        this.unusedNames = new Set();
        this.serverNamesMap = new Map();
        this.renameIsland = ko.observable();

        this.showIslandOnCreation = new Option({
            name: "Show Island on Creation",
            locaText: texts.showIslandOnCreation
        });
        this.showIslandOnCreation.checked(true);

        var islandNames = [];
        if (localStorage && localStorage.getItem(islandsKey))
            islandNames = JSON.parse(localStorage.getItem(islandsKey) || "[]")

        var islandName = localStorage.getItem(islandKey);
        view.islands = ko.observableArray();
        view.island = ko.observable();

        view.island.subscribe((/** @type {Island} */ isl) => window.document.title = isl.name());

        for (var name of islandNames) {
            var island = new Island(params, new LocalStorageProxy(name), false);
            view.islands.push(island);
            this.serverNamesMap.set(island.name(), island);

            if (name == islandName)
                view.island(island);
        }

        this.sortIslands();

        var allIslands = new Island(params, localStorage, isFirstRun);
        this.allIslands = allIslands;
        view.islands.unshift(allIslands);
        this.serverNamesMap.set(allIslands.name(), allIslands);
        if (!view.island())
            view.island(allIslands);

        if (localStorage) {
            view.islands.subscribe((/** @type {Array<any>} */ islands) => {
                let islandNames = JSON.stringify(islands.filter((/** @type {Island} */ i) => !i.isAllIslands()).map((/** @type {Island} */ i) => i.name()));
                localStorage.setItem(islandsKey, islandNames);
            });

            this.currentIslandSubscription = ko.computed(() => {
                var name = view.island().name();
                localStorage.setItem(islandKey, name);
            });
        }

        this.islandExists = ko.computed(() => {
            var name = this.islandNameInput();
            if (!name || name == ALL_ISLANDS || name == view.texts.allIslands.name())
                return true;

            return this.serverNamesMap.has(name) && this.serverNamesMap.get(name).name() == name;
        });
    }

    /**
     * @param {string} name
     * @param {Session} session
     */
    create(name, session) {
        if (name == null) {
            if (this.islandExists())
                return;

            name = this.islandNameInput();
        }

        if (this.serverNamesMap.has(name) && this.serverNamesMap.get(name).name() == name)
            return;

        var island = new Island(this.params, new LocalStorageProxy(name), true, session);
        view.islands.push(island);
        this.sortIslands();

        if (this.showIslandOnCreation.checked())
            view.island(island);

        this.serverNamesMap.set(name, island);
        var removedCandidates = this.islandCandidates.remove((/** @type {IslandNameCandidate} */ i) => !isNaN(this.compareNames(i.name, name)));
        for (var c of removedCandidates) {
            this.unusedNames.delete(c.name);
            this.serverNamesMap.set(c.name, island);
        }

        if (name == this.islandNameInput())
            this.islandNameInput(null);
    }

    /**
     * @param {Island} island
     */
    delete(island) {
        if (island == null)
            island = view.island();

        if (island.name() == ALL_ISLANDS || island.isAllIslands())
            return;

        if (view.island() == island)
            view.island(view.islands()[0]);

        if (view.tradeManager) {
            view.tradeManager.islandDeleted(island);
        }

        for (var a of island.assetsMap.values())
            if (a instanceof NamedElement)
                a.delete();

        view.islands.remove(island);
        island.session.deleteIsland(island);
        if (localStorage)
            localStorage.removeItem(island.name());

        for (var entry of this.serverNamesMap.entries()) {
            if (entry[1] == island)
                this.serverNamesMap.set(entry[0], null);
        }

        this.serverNamesMap.delete(island.name());
        this.unusedNames.add(island.name());
        this.islandCandidates.push({ name: island.name(), session: island.session });
        this.sortUnusedNames();
    }

    /**
     * @param {Island} island
     * @param {string} name
     */
    rename(island, name) {
        if (this.islandExists())
            return;

        if (this.serverNamesMap.has(name) && this.serverNamesMap.get(name).name() == name)
            return;

        for (var entry of this.serverNamesMap.entries()) {
            if (entry[1] == island)
                this.serverNamesMap.set(entry[0], null);
        }

        this.serverNamesMap.delete(island.name());
        this.unusedNames.add(island.name());
        this.islandCandidates.push({ name: island.name(), session: island.session });

        island.name(name);
        this.sortIslands();

        this.serverNamesMap.set(name, island);
        var removedCandidates = this.islandCandidates.remove((/** @type {IslandNameCandidate} */ i) => !isNaN(this.compareNames(i.name, name)));
        for (var c of removedCandidates) {
            this.unusedNames.delete(c.name);
            this.serverNamesMap.set(c.name, island);
        }

        this.islandNameInput(null);
        this.sortUnusedNames();
    }

    /**
     * @param {Island} island
     */
    startRename(island) {
        if (island.isAllIslands())
            return;

        this.renameIsland(island);
        this.islandNameInput(island.name());
        globals.$('#island-rename-dialog').modal("show");
    }

    /**
     * @param {IslandNameCandidate} candidate
     */
    deleteCandidate(candidate) {
        this.unusedNames.delete(candidate.name);
        this.islandCandidates.remove(candidate);
    }

    /**
     * @param {string} name
     */
    getByName(name) {
        return name == ALL_ISLANDS ? this.allIslands : this.serverNamesMap.get(name);
    }

    /**
     * @param {string} name
     * @param {Session} session
     */
    registerName(name, session) {
        if (name == ALL_ISLANDS || this.serverNamesMap.has(name))
            return;

        if (this.unusedNames.has(name))
            return;

        var island = null;
        var bestMatch = 0;

        for (var isl of view.islands()) {
            var match = this.compareNames(isl.name(), name);
            if (!isNaN(match) && match > bestMatch) {
                island = isl;
                bestMatch = match;
            }
        }

        if (island) {
            this.serverNamesMap.set(name, island);
            var removedCandidates = this.islandCandidates.remove((/** @type {IslandNameCandidate} */ i) => i.name === name);
            for (var c of removedCandidates)
                this.unusedNames.delete(c.name);
            return;
        }

        this.islandCandidates.push({ name: name, session: session });
        this.unusedNames.add(name);
        this.sortUnusedNames();
    }

    /**
     * @param {string} name1
     * @param {string} name2
     */
    compareNames(name1, name2) {
        var totalLength = Math.max(name1.length, name2.length);
        var minLcsLength = totalLength - Math.round(-0.677 + 1.51 * Math.log(totalLength));
        var lcsLength = this.lcsLength(name1, name2);

        if (lcsLength >= minLcsLength)
            return lcsLength / totalLength;
        else
            return NaN;
    }

    sortIslands() {
        view.islands.sort((/** @type {Island} */ a, /** @type {Island} */ b) => {
            if (a.isAllIslands() || a.name() == ALL_ISLANDS)
                return -Infinity;
            else if (b.isAllIslands() || b.name() == ALL_ISLANDS)
                return Infinity;

            var sIdxA = view.sessions.indexOf(a.session);
            var sIdxB = view.sessions.indexOf(b.session);

            if (sIdxA == sIdxB) {
                return a.name().localeCompare(b.name());
            } else {
                return sIdxA - sIdxB;
            }
        });
    }

    sortUnusedNames() {
        this.islandCandidates.sort((a, b) => {
            var sIdxA = view.sessions.indexOf(a.session);
            var sIdxB = view.sessions.indexOf(b.session);

            if (sIdxA == sIdxB) {
                return a.name.localeCompare(b.name);
            } else {
                return sIdxA - sIdxB;
            }
        });
    }

    // Function to find length of Longest Common Subsequence of substring
    // X[0..m-1] and Y[0..n-1]
    // From https://www.techiedelight.com/longest-common-subsequence/
    /**
    * @param {string} X
    * @param {string} Y
     */
    lcsLength(X, Y) {
        var m = X.length, n = Y.length;

        // lookup table stores solution to already computed sub-problems
        // i.e. lookup[i][j] stores the length of LCS of substring
        // X[0..i-1] and Y[0..j-1]
        var lookup = [];
        for (var i = 0; i <= m; i++)
            lookup.push(new Array(n + 1).fill(0));

        // fill the lookup table in bottom-up manner
        for (var i = 1; i <= m; i++) {
            for (var j = 1; j <= n; j++) {
                // if current character of X and Y matches
                if (X[i - 1] == Y[j - 1])
                    lookup[i][j] = lookup[i - 1][j - 1] + 1;

                // else if current character of X and Y don't match
                else
                    lookup[i][j] = Math.max(lookup[i - 1][j], lookup[i][j - 1]);
            }
        }

        // LCS will be last entry in the lookup table
        return lookup[m][n];
    }
}


